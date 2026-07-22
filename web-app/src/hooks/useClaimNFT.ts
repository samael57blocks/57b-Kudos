import { useCallback, useEffect, useRef, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { NFT57B_ABI, getContractAddresses } from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClaimStep = 'idle' | 'confirming' | 'success' | 'error'

export interface UseClaimNFTResult {
  claim: () => Promise<void>
  step: ClaimStep
  txHash: `0x${string}` | undefined
  error: Error | null
  reset: () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Claim an NFT: burn it and receive BonusReward + RecognitionToken.
 *
 * State machine: `idle → confirming → success | error`
 *
 * On success, invalidates queries for nft57b, bonus-reward, and
 * recognition-token so the UI reflects the new state.
 */
export function useClaimNFT(tokenId: bigint): UseClaimNFTResult {
  const { writeContractAsync, data: txHashData, error: writeError } =
    useWriteContract()
  const {
    isSuccess: txSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHashData,
  })

  const queryClient = useQueryClient()
  const [step, setStep] = useState<ClaimStep>('idle')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const isClaimingRef = useRef(false)
  const toastId = useRef<string | number>(undefined)

  // ── Effects: sync wagmi state to step machine ─────────────────────────────

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

  // ── Toasts ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (step === 'confirming') {
      toast.dismiss(toastId.current)
      toastId.current = toast.loading('Claiming NFT...')
    } else if (step === 'success') {
      toast.dismiss(toastId.current)
      toast.success('NFT claimed! BonusReward + RecognitionToken minted')
      // Invalidate queries so the UI refreshes
      queryClient.invalidateQueries({ queryKey: ['nft57b'] })
      queryClient.invalidateQueries({ queryKey: ['bonus-reward'] })
      queryClient.invalidateQueries({ queryKey: ['recognition-token'] })
    } else if (step === 'error') {
      toast.dismiss(toastId.current)
      toast.error(error?.message ?? 'Claim failed')
    }
  }, [step, error, queryClient])

  // Cleanup on unmount
  useEffect(() => {
    return () => { toast.dismiss(toastId.current) }
  }, [])

  // ── Claim function ────────────────────────────────────────────────────────

  const claim = useCallback(async (): Promise<void> => {
    console.log('[useClaimNFT] claim() called, tokenId:', tokenId)
    
    if (isClaimingRef.current) {
      console.warn('[useClaimNFT] Already claiming, throwing')
      throw new Error('Claim already in progress')
    }
    isClaimingRef.current = true

    try {
      setError(null)
      setStep('confirming')

      const contracts = getContractAddresses()
      console.log('[useClaimNFT] contracts:', contracts)
      if (!contracts) {
        throw new Error('No contracts configured for this network')
      }

      console.log('[useClaimNFT] calling writeContractAsync...')
      const hash = await writeContractAsync({
        address: contracts.nft57b,
        abi: NFT57B_ABI,
        functionName: 'claim',
        args: [tokenId],
      })

      console.log('[useClaimNFT] tx hash:', hash)
      setTxHash(hash)
    } catch (err) {
      console.error('[useClaimNFT] Error:', err)
      const error =
        err instanceof Error ? err : new Error('Claim failed')
      setError(error)
      setStep('error')
      throw error
    } finally {
      isClaimingRef.current = false
    }
  }, [tokenId, writeContractAsync])

  // ── Reset ───────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setStep('idle')
    setTxHash(undefined)
    setError(null)
  }, [])

  return { claim, step, txHash, error, reset }
}
