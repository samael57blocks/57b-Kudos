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

/** Max token IDs to scan when searching for the employee's recognition badge. */
const MAX_TOKEN_SCAN = 20

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Discover whether the connected wallet owns a RecognitionToken.
 *
 * Scans token IDs 0..N using ownerOf() (ERC721 base — no Enumerable needed).
 * Once a token owned by the address is found, fetches tokenURI and resolves
 * metadata to extract category, employeeName, description.
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
        // Scan token IDs to find one owned by this address.
        // RecognitionToken doesn't implement ERC721Enumerable,
        // so we can't use tokenOfOwnerByIndex — use ownerOf() instead.
        let foundId: bigint | null = null
        for (let i = 0; i < MAX_TOKEN_SCAN; i++) {
          const id = BigInt(i)
          try {
            const owner = (await publicClient.readContract({
              address: contracts.recognitionToken,
              abi: RECOGNITION_TOKEN_ABI,
              functionName: 'ownerOf',
              args: [id],
            })) as string

            if (owner.toLowerCase() === address.toLowerCase()) {
              foundId = id
              break
            }
          } catch {
            // ownerOf reverts for non-existent tokens — no more tokens to scan
            break
          }

          if (cancelled) return
        }

        if (cancelled) return

        if (foundId === null) {
          setHasToken(false)
          setTokenId(null)
          setTokenURI(null)
          setCategory(null)
          setEmployeeName(null)
          setDescription(null)
          return
        }

        setHasToken(true)
        setTokenId(foundId)

        // Fetch tokenURI
        const uri = (await publicClient.readContract({
          address: contracts.recognitionToken,
          abi: RECOGNITION_TOKEN_ABI,
          functionName: 'tokenURI',
          args: [foundId],
        })) as string

        if (cancelled) return
        setTokenURI(uri)

        // Resolve metadata
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
