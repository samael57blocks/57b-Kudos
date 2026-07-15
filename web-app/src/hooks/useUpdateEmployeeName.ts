import { useCallback, useEffect, useRef, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { toast } from 'sonner'
import { COMPANY_REGISTRY_ABI, getContractAddresses } from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

export type UpdateEmployeeNameStep =
  | 'idle'
  | 'confirming'
  | 'success'
  | 'error'

export interface UseUpdateEmployeeNameResult {
  updateEmployeeName: (employeeAddress: `0x${string}`, name: string) => Promise<`0x${string}`>
  step: UpdateEmployeeNameStep
  isConfirming: boolean
  txHash: `0x${string}` | undefined
  error: Error | null
  reset: () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Update an employee's display name on-chain via
 * `CompanyRegistry.updateEmployeeName(employee, name)`.
 *
 * State machine: `idle → confirming → success | error`
 *
 * Double-submit is prevented via a ref guard.
 */
export function useUpdateEmployeeName(): UseUpdateEmployeeNameResult {
  const { writeContractAsync, data: txHashData, error: writeError } =
    useWriteContract()
  const {
    isLoading: isConfirming,
    isSuccess: txSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHashData,
  })

  const [step, setStep] = useState<UpdateEmployeeNameStep>('idle')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const isUpdatingRef = useRef(false)

  // ── Effects: sync wagmi state to our step machine ──────────────────────────

  useEffect(() => {
    if (txSuccess && step === 'confirming') {
      setStep('success')
    }
  }, [txSuccess, step])

  useEffect(() => {
    if (txHashData && txHashData !== txHash) {
      setTxHash(txHashData)
    }
  }, [txHashData, txHash])

  useEffect(() => {
    if (writeError && step === 'confirming') {
      setError(writeError)
      setStep('error')
    }
  }, [writeError, step])

  useEffect(() => {
    if (confirmError && step === 'confirming') {
      setError(confirmError)
      setStep('error')
    }
  }, [confirmError, step])

  // ── Toasts ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (step === 'confirming') {
      toast.loading('Updating name...')
    } else if (step === 'success') {
      toast.success('Name updated!')
    } else if (step === 'error') {
      toast.error(error?.message ?? 'Update failed')
    }
  }, [step, error])

  // ── Update function ──────────────────────────────────────────────────────

  const updateEmployeeName = useCallback(
    async (employeeAddress: `0x${string}`, name: string): Promise<`0x${string}`> => {
      if (isUpdatingRef.current) {
        throw new Error('Update already in progress')
      }
      isUpdatingRef.current = true

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
          functionName: 'updateEmployeeName',
          args: [employeeAddress, name],
          gas: 200_000n,
        })

        setTxHash(hash)
        return hash
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Update failed')
        setError(error)
        setStep('error')
        throw error
      } finally {
        isUpdatingRef.current = false
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
    updateEmployeeName,
    step,
    isConfirming,
    txHash,
    error,
    reset,
  }
}
