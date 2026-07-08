import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useCallback, useState } from 'react'
import { RECOGNITION_TOKEN_ABI, getContractAddresses } from '../config/contracts'

// ── Constants ──────────────────────────────────────────────────────────────────

export const MINTER_ROLE =
  '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6' as `0x${string}`

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseMinterRoleResult {
  isMinter: boolean
  isLoading: boolean
  grantMinter: () => Promise<void>
  revokeMinter: () => Promise<void>
  error: Error | null
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Check whether an employee holds MINTER_ROLE on the RecognitionToken contract,
 * and provide grant/revoke write functions.
 *
 * Returns the role state, loading flag, and callable functions.
 * Uses wagmi `useReadContract` for `hasRole` and `useWriteContract` +
 * `useWaitForTransactionReceipt` for `grantRole` / `revokeRole`.
 */
export function useMinterRole(
  employeeAddress: `0x${string}` | undefined,
): UseMinterRoleResult {
  const contracts = getContractAddresses()

  // ── Read: hasRole ─────────────────────────────────────────────────────────

  const {
    data: isMinter,
    isFetching: isRoleLoading,
    refetch: refetchRole,
  } = useReadContract({
    address: contracts?.recognitionToken,
    abi: RECOGNITION_TOKEN_ABI,
    functionName: 'hasRole',
    args: employeeAddress ? [MINTER_ROLE, employeeAddress] : undefined,
    query: {
      enabled: !!contracts?.recognitionToken && !!employeeAddress,
      staleTime: 30_000,
    },
  })

  // ── Write: grantRole / revokeRole ─────────────────────────────────────────

  const { writeContractAsync, data: txHash, error: writeError } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash })

  const [error, setError] = useState<Error | null>(null)

  const grantMinter = useCallback(async () => {
    if (!contracts?.recognitionToken || !employeeAddress) return
    setError(null)
    try {
      await writeContractAsync({
        address: contracts.recognitionToken,
        abi: RECOGNITION_TOKEN_ABI,
        functionName: 'grantRole',
        args: [MINTER_ROLE, employeeAddress],
      })
      // Refetch hasRole after confirmation
      await refetchRole()
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to grant Minter role')
      setError(e)
      throw e
    }
  }, [contracts?.recognitionToken, employeeAddress, writeContractAsync, refetchRole])

  const revokeMinter = useCallback(async () => {
    if (!contracts?.recognitionToken || !employeeAddress) return
    setError(null)
    try {
      await writeContractAsync({
        address: contracts.recognitionToken,
        abi: RECOGNITION_TOKEN_ABI,
        functionName: 'revokeRole',
        args: [MINTER_ROLE, employeeAddress],
      })
      // Refetch hasRole after confirmation
      await refetchRole()
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to revoke Minter role')
      setError(e)
      throw e
    }
  }, [contracts?.recognitionToken, employeeAddress, writeContractAsync, refetchRole])

  // ── Aggregate error ───────────────────────────────────────────────────────

  const hookError = writeError || error

  return {
    isMinter: isMinter ?? false,
    isLoading: isRoleLoading || isConfirming,
    grantMinter,
    revokeMinter,
    error: hookError instanceof Error ? hookError : null,
  }
}
