import { usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import { BONUS_REWARD_ABI, getContractAddresses } from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseBonusRewardResult {
  balance: bigint
  claimReward: () => Promise<void>
  isClaiming: boolean
  error: Error | null
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Read BonusReward balance and claim rewards.
 *
 * Uses `publicClient.readContract` for balanceOf (refetches on trigger change)
 * and `useWriteContract` for claimReward.
 * If bonusReward address is not configured, returns zero balance.
 */
export function useBonusReward(
  address: `0x${string}` | undefined,
  refetchTrigger = 0,
): UseBonusRewardResult {
  const publicClient = usePublicClient()
  const contracts = getContractAddresses()

  const [balance, setBalance] = useState(0n)
  const [isBalanceLoading, setIsBalanceLoading] = useState(false)

  // Fetch balance via publicClient (refetches when refetchTrigger changes)
  useEffect(() => {
    if (!address || !publicClient || !contracts?.bonusReward) {
      setBalance(0n)
      return
    }

    let cancelled = false

    const fetchBalance = async () => {
      setIsBalanceLoading(true)
      try {
        const data = (await publicClient.readContract({
          address: contracts.bonusReward,
          abi: BONUS_REWARD_ABI,
          functionName: 'balanceOf',
          args: [address],
        })) as bigint
        if (!cancelled) setBalance(data)
      } catch {
        if (!cancelled) setBalance(0n)
      } finally {
        if (!cancelled) setIsBalanceLoading(false)
      }
    }

    fetchBalance()
    return () => { cancelled = true }
  }, [address, publicClient, contracts?.bonusReward, refetchTrigger])

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
      // Balance will refetch via refetchTrigger from parent
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to claim rewards')
      setError(e)
      throw e
    }
  }, [contracts?.bonusReward, writeContractAsync])

  const hookError = writeError || error

  return {
    balance,
    claimReward,
    isClaiming: isConfirming,
    error: hookError instanceof Error ? hookError : null,
  }
}
