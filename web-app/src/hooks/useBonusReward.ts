import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useCallback, useState } from 'react'
import { BONUS_REWARD_ABI, getContractAddresses } from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseBonusRewardResult {
  balance: bigint
  claimReward: () => Promise<void>
  isClaiming: boolean
  error: Error | null
  refetch: () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Read BonusReward balance and claim rewards.
 *
 * Uses `useReadContract` for balanceOf and `useWriteContract` for claimReward.
 * If bonusReward address is not configured, returns zero balance.
 */
export function useBonusReward(
  address: `0x${string}` | undefined,
): UseBonusRewardResult {
  const contracts = getContractAddresses()

  const {
    data: balanceData,
    refetch,
  } = useReadContract({
    address: contracts?.bonusReward,
    abi: BONUS_REWARD_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!contracts?.bonusReward && !!address,
      staleTime: 30_000,
    },
  })

  const { writeContractAsync, data: txHash, error: writeError } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash })

  const [error, setError] = useState<Error | null>(null)

  const claimReward = useCallback(async () => {
    if (!contracts?.bonusReward) {
      setError(new Error('BonusReward not configured'))
      return
    }
    setError(null)
    try {
      await writeContractAsync({
        address: contracts.bonusReward,
        abi: BONUS_REWARD_ABI,
        functionName: 'claimReward',
      })
      // Refetch balance after claim
      refetch()
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to claim rewards')
      setError(e)
      throw e
    }
  }, [contracts?.bonusReward, writeContractAsync, refetch])

  const hookError = writeError || error

  return {
    balance: balanceData ?? 0n,
    claimReward,
    isClaiming: isConfirming,
    error: hookError instanceof Error ? hookError : null,
    refetch,
  }
}
