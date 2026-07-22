import { useReadContract } from 'wagmi'
import { RECOGNITION_TOKEN_ABI, getContractAddresses } from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseRecognitionTokenResult {
  hasToken: boolean
  tokenId: bigint | null
  tokenURI: string | null
  isLoading: boolean
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Discover whether the connected wallet owns a RecognitionToken.
 *
 * Sequential reads: balanceOf → tokenOfOwnerByIndex(0) → tokenURI
 * Each step gates on the previous via `enabled`.
 */
export function useRecognitionToken(
  address: `0x${string}` | undefined,
): UseRecognitionTokenResult {
  const contracts = getContractAddresses()

  // Step 1: balanceOf
  const { data: balance, isFetching: balanceLoading } = useReadContract({
    address: contracts?.recognitionToken,
    abi: RECOGNITION_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!contracts?.recognitionToken && !!address,
      staleTime: 30_000,
    },
  })

  const hasToken = (balance ?? 0n) > 0n

  // Step 2: tokenOfOwnerByIndex (only if hasToken)
  const { data: tokenId, isFetching: tokenIdLoading } = useReadContract({
    address: contracts?.recognitionToken,
    abi: RECOGNITION_TOKEN_ABI,
    functionName: 'tokenOfOwnerByIndex',
    args: address && hasToken ? [address, 0n] : undefined,
    query: {
      enabled: hasToken,
      staleTime: 30_000,
    },
  })

  // Step 3: tokenURI (only if tokenId resolved)
  const { data: tokenUriData, isFetching: uriLoading } = useReadContract({
    address: contracts?.recognitionToken,
    abi: RECOGNITION_TOKEN_ABI,
    functionName: 'tokenURI',
    args: tokenId !== undefined ? [tokenId!] : undefined,
    query: {
      enabled: tokenId !== undefined && tokenId !== null,
      staleTime: 30_000,
    },
  })

  return {
    hasToken,
    tokenId: tokenId ?? null,
    tokenURI: tokenUriData ?? null,
    isLoading: balanceLoading || tokenIdLoading || uriLoading,
  }
}
