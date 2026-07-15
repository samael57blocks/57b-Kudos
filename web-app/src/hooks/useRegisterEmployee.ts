import { useCallback, useEffect, useRef, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { toast } from 'sonner'
import { COMPANY_REGISTRY_ABI, getContractAddresses } from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

export type RegisterEmployeeStep =
  | 'idle'
  | 'confirming'
  | 'success'
  | 'error'

export interface UseRegisterEmployeeResult {
  registerEmployee: (employeeAddress: `0x${string}`, companyId: bigint) => Promise<`0x${string}`>
  step: RegisterEmployeeStep
  isConfirming: boolean
  txHash: `0x${string}` | undefined
  error: Error | null
  reset: () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Register an employee to a company on-chain via
 * `CompanyRegistry.registerEmployee(employee, companyId)`.
 *
 * State machine: `idle → confirming → success | error`
 *
 * Double-submit is prevented via a ref guard.
 */
export function useRegisterEmployee(): UseRegisterEmployeeResult {
  const { writeContractAsync, data: txHashData, error: writeError } =
    useWriteContract()
  const {
    isLoading: isConfirming,
    isSuccess: txSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHashData,
  })

  const [step, setStep] = useState<RegisterEmployeeStep>('idle')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const isRegisteringRef = useRef(false)

  // ── Effects: sync wagmi state to our step machine ──────────────────────────

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
      toast.loading('Adding employee...')
    } else if (step === 'success') {
      toast.success('Employee added!')
    } else if (step === 'error') {
      toast.error(error?.message ?? 'Add failed')
    }
  }, [step, error])

  // ── Register function ──────────────────────────────────────────────────────

  const registerEmployee = useCallback(
    async (employeeAddress: `0x${string}`, companyId: bigint): Promise<`0x${string}`> => {
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
          functionName: 'registerEmployee',
          args: [employeeAddress, companyId],
          gas: 300_000n,
        })

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
    setError(null)
  }, [])

  return {
    registerEmployee,
    step,
    isConfirming,
    txHash,
    error,
    reset,
  }
}
