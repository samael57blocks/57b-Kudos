import { useReadContract } from 'wagmi'
import { useEffect, useState } from 'react'
import { RECOGNITION_TOKEN_ABI, getContractAddresses } from '../config/contracts'
import { resolveMetadata } from '../utils/ipfs'
import type { BadgeCategory } from '../lib/recognition-data'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseRecognitionTokenResult {
  hasToken: boolean
  tokenId: bigint | null
  tokenURI: string | null
  category: BadgeCategory | null
  employeeName: string | null
  description: string | null
  isLoading: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_CATEGORIES: BadgeCategory[] = [
  'Innovation', 'Leadership', 'Teamwork', 'Excellence',
  'Mentorship', 'Impact', 'Creativity', 'Reliability',
]

function extractCategory(attributes: Record<string, unknown>[]): BadgeCategory | null {
  const attr = attributes.find(
    (a) => (a as { trait_type: string }).trait_type === 'Category',
  )
  if (!attr) return null
  const value = (attr as { value: string }).value
  return VALID_CATEGORIES.includes(value as BadgeCategory)
    ? (value as BadgeCategory)
    : null
}

function extractEmployeeName(attributes: Record<string, unknown>[]): string | null {
  const attr = attributes.find(
    (a) => (a as { trait_type: string }).trait_type === 'Employee',
  )
  if (!attr) return null
  const value = (attr as { value: string }).value
  return value || null
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Discover whether the connected wallet owns a RecognitionToken.
 *
 * Sequential reads: balanceOf → tokenOfOwnerByIndex(0) → tokenURI
 * Then resolves metadata to extract category, employeeName, description.
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

  // Step 4: Resolve metadata from tokenURI
  const [category, setCategory] = useState<BadgeCategory | null>(null)
  const [employeeName, setEmployeeName] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [metaLoading, setMetaLoading] = useState(false)

  useEffect(() => {
    if (!tokenUriData) {
      setCategory(null)
      setEmployeeName(null)
      setDescription(null)
      return
    }

    let cancelled = false

    const fetchMetadata = async () => {
      setMetaLoading(true)
      try {
        const meta = await resolveMetadata(tokenUriData)
        if (cancelled) return

        const attributes = (meta?.attributes as Record<string, unknown>[]) ?? []
        setCategory(extractCategory(attributes))
        setEmployeeName(extractEmployeeName(attributes))
        setDescription((meta?.description as string) ?? null)
      } catch {
        if (!cancelled) {
          setCategory(null)
          setEmployeeName(null)
          setDescription(null)
        }
      } finally {
        if (!cancelled) setMetaLoading(false)
      }
    }

    fetchMetadata()

    return () => { cancelled = true }
  }, [tokenUriData])

  return {
    hasToken,
    tokenId: tokenId ?? null,
    tokenURI: tokenUriData ?? null,
    category,
    employeeName,
    description,
    isLoading: balanceLoading || tokenIdLoading || uriLoading || metaLoading,
  }
}
