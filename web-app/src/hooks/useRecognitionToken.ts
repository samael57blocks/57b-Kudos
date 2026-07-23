import { usePublicClient } from 'wagmi'
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
 *
 * Refetches when `refetchTrigger` changes (e.g. after a claim).
 */
export function useRecognitionToken(
  address: `0x${string}` | undefined,
  refetchTrigger = 0,
): UseRecognitionTokenResult {
  const publicClient = usePublicClient()
  const contracts = getContractAddresses()

  const [hasToken, setHasToken] = useState(false)
  const [tokenId, setTokenId] = useState<bigint | null>(null)
  const [tokenURI, setTokenURI] = useState<string | null>(null)
  const [category, setCategory] = useState<BadgeCategory | null>(null)
  const [employeeName, setEmployeeName] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!address || !publicClient || !contracts?.recognitionToken) {
      setHasToken(false)
      setTokenId(null)
      setTokenURI(null)
      setCategory(null)
      setEmployeeName(null)
      setDescription(null)
      return
    }

    let cancelled = false

    const fetchToken = async () => {
      setIsLoading(true)

      try {
        // Step 1: balanceOf
        const balance = (await publicClient.readContract({
          address: contracts.recognitionToken,
          abi: RECOGNITION_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [address],
        })) as bigint

        if (cancelled) return

        if (balance === 0n) {
          setHasToken(false)
          setTokenId(null)
          setTokenURI(null)
          setCategory(null)
          setEmployeeName(null)
          setDescription(null)
          return
        }

        setHasToken(true)

        // Step 2: tokenOfOwnerByIndex(0)
        const id = (await publicClient.readContract({
          address: contracts.recognitionToken,
          abi: RECOGNITION_TOKEN_ABI,
          functionName: 'tokenOfOwnerByIndex',
          args: [address, 0n],
        })) as bigint

        if (cancelled) return
        setTokenId(id)

        // Step 3: tokenURI
        const uri = (await publicClient.readContract({
          address: contracts.recognitionToken,
          abi: RECOGNITION_TOKEN_ABI,
          functionName: 'tokenURI',
          args: [id],
        })) as string

        if (cancelled) return
        setTokenURI(uri)

        // Step 4: Resolve metadata
        try {
          const meta = await resolveMetadata(uri)
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
        }
      } catch {
        if (!cancelled) {
          setHasToken(false)
          setTokenId(null)
          setTokenURI(null)
          setCategory(null)
          setEmployeeName(null)
          setDescription(null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchToken()

    return () => { cancelled = true }
  }, [address, publicClient, contracts?.recognitionToken, refetchTrigger])

  return {
    hasToken,
    tokenId,
    tokenURI,
    category,
    employeeName,
    description,
    isLoading,
  }
}
