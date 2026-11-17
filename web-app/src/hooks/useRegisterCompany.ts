import { useCallback, useEffect, useRef, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { getEventSelector } from 'viem'
import { toast } from 'sonner'
import { COMPANY_REGISTRY_ABI, getContractAddresses } from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

export type RegisterCompanyStep =
  | 'idle'
  | 'confirming'
  | 'success'
  | 'error'

export interface UseRegisterCompanyResult {
  registerCompany: (
    name: string,
    adminWallet: `0x${string}`,
  ) => Promise<`0x${string}`>
  step: RegisterCompanyStep
  isConfirming: boolean
  txHash: `0x${string}` | undefined
  /** The newly created company ID, set after success */
  companyId: bigint | undefined
  error: Error | null
  reset: () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Register a new company on-chain via `CompanyRegistry.registerCompany`.
 *
 * State machine: `idle → confirming → success | error`
 *
 * No IPFS step — registration is on-chain only.
 * Double-submit is prevented via a ref guard.
 */
export function useRegisterCompany(): UseRegisterCompanyResult {
  const { writeContractAsync, data: txHashData, error: writeError } =
    useWriteContract()
  const {
    isLoading: isConfirming,
    isSuccess: txSuccess,
    error: confirmError,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: txHashData,
  })

  const [step, setStep] = useState<RegisterCompanyStep>('idle')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)
  const [companyId, setCompanyId] = useState<bigint | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const isRegisteringRef = useRef(false)
  const toastId = useRef<string | number>(undefined)

  // ── Effects: sync wagmi state to our step machine ──────────────────────────

  // When tx receipt comes through → parse CompanyRegistered event for companyId
  useEffect(() => {
    if (!receipt || !txSuccess) return

    const eventSignature = getEventSelector(
      'CompanyRegistered(uint256,string,address)',
    )

    for (const log of receipt.logs) {
      if (log.topics[0] === eventSignature && log.topics[1]) {
        const id = BigInt(log.topics[1])
        setCompanyId(id)
        break
      }
    }
  }, [receipt, txSuccess])

  // When tx receipt comes through → success
  useEffect(() => {
    if (txSuccess && step === 'confirming') {
      setStep('success')
    }
  }, [txSuccess, step])

  // When wagmi writeContract provides a hash, store it
  useEffect(() => {
    if (txHashData && txHashData !== txHash) {
      setTxHash(txHashData)
    }
  }, [txHashData, txHash])

  // Write errors (e.g. user reject)
  useEffect(() => {
    if (writeError && step === 'confirming') {
      setError(writeError)
      setStep('error')
    }
  }, [writeError, step])

  // Confirmation errors
  useEffect(() => {
    if (confirmError && step === 'confirming') {
      setError(confirmError)
      setStep('error')
    }
  }, [confirmError, step])

  // ── Toasts ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (step === 'confirming') {
      toastId.current = toast.loading('Registering company...')
    } else if (step === 'success') {
      toast.dismiss(toastId.current)
      toast.success('Company registered!')
    } else if (step === 'error') {
      toast.dismiss(toastId.current)
      toast.error(error?.message ?? 'Registration failed')
    }
  }, [step, error])

  // Cleanup on unmount
  useEffect(() => {
    return () => { toast.dismiss(toastId.current) }
  }, [])

  // ── Register function ──────────────────────────────────────────────────────

  const registerCompany = useCallback(
    async (name: string, adminWallet: `0x${string}`): Promise<`0x${string}`> => {
      if (isRegisteringRef.current) {
        throw new Error('Registration already in progress')
      }
      isRegisteringRef.current = true

      try {
        setError(null)
        setStep('confirming')

        const contracts = getContractAddresses()
        if (!contracts) {
          throw new Error('No contracts configured for this network')
        }

        const hash = await writeContractAsync({
          address: contracts.companyRegistry,
          abi: COMPANY_REGISTRY_ABI,
          functionName: 'registerCompany',
          args: [name, adminWallet],
          gas: 500_000n,
        })
        console.log('hash',hash)
        setTxHash(hash)
        return hash
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Registration failed')
        setError(error)
        setStep('error')
        throw error
      } finally {
        isRegisteringRef.current = false
      }
    },
    [writeContractAsync],
  )

  // ── Reset ───────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setStep('idle')
    setTxHash(undefined)
    setCompanyId(undefined)
    setError(null)
  }, [])

  return {
    registerCompany,
    step,
    isConfirming,
    txHash,
    companyId,
    error,
    reset,
  }
}
