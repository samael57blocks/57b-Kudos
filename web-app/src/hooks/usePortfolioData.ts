import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { resolveMetadata } from '../utils/ipfs'
import { useEmployeeNFTs, type EmployeeNFTData } from './useEmployeeNFTs'
import type { BadgeCategory } from '../lib/recognition-data'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NFTWithMetadata extends EmployeeNFTData {
  category: BadgeCategory | null
  employeeName: string | null
  description: string | null
}

export interface CategoryGroup {
  category: BadgeCategory
  count: number
}

export interface PortfolioData {
  nfts: NFTWithMetadata[]
  categories: CategoryGroup[]
  employeeName: string | null
  totalRecognitions: number
  isLoading: boolean
  error: Error | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractCategory(attributes: Record<string, unknown>[]): BadgeCategory | null {
  const categoryAttr = attributes.find(
    (a) => (a as { trait_type: string }).trait_type === 'Category',
  )
  if (!categoryAttr) return null
  const value = (categoryAttr as { value: string }).value
  // Validate it's a known BadgeCategory
  const validCategories: BadgeCategory[] = [
    'Innovation', 'Leadership', 'Teamwork', 'Excellence',
    'Mentorship', 'Impact', 'Creativity', 'Reliability',
  ]
  return validCategories.includes(value as BadgeCategory)
    ? (value as BadgeCategory)
    : null
}

function extractEmployeeName(attributes: Record<string, unknown>[]): string | null {
  const empAttr = attributes.find(
    (a) => (a as { trait_type: string }).trait_type === 'Employee',
  )
  if (!empAttr) return null
  const value = (empAttr as { value: string }).value
  return value || null
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetch portfolio data: resolves metadata for all NFTs and extracts
 * categories, employee name, and recognition counts.
 */
export function usePortfolioData(
  address: `0x${string}` | undefined,
): PortfolioData {
  const { nfts, isLoading: nftsLoading, error: nftsError } = useEmployeeNFTs(address)

  // Resolve metadata for each NFT in parallel
  const metadataResults = useQueries({
    queries: nfts.map((nft) => ({
      queryKey: ['token-metadata', nft.tokenURI],
      queryFn: () => resolveMetadata(nft.tokenURI),
      enabled: !!nft.tokenURI && !nftsLoading,
      staleTime: 5 * 60 * 1000, // 5 min cache (IPFS is immutable)
    })),
  })

  const isLoading = nftsLoading || metadataResults.some((r) => r.isLoading)
  const error = nftsError || metadataResults.find((r) => r.error)?.error as Error | null

  // Build enriched NFT list with metadata
  const enrichedNfts = useMemo<NFTWithMetadata[]>(() => {
    return nfts.map((nft, i) => {
      const meta = metadataResults[i]?.data as Record<string, unknown> | undefined
      const attributes = (meta?.attributes as Record<string, unknown>[]) ?? []
      const description = (meta?.description as string) ?? null

      return {
        ...nft,
        category: extractCategory(attributes),
        employeeName: extractEmployeeName(attributes),
        description,
      }
    })
  }, [nfts, metadataResults])

  // Group by category
  const categories = useMemo<CategoryGroup[]>(() => {
    const map = new Map<BadgeCategory, number>()
    for (const nft of enrichedNfts) {
      if (nft.category) {
        map.set(nft.category, (map.get(nft.category) ?? 0) + 1)
      }
    }
    return Array.from(map.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count) // Most frequent first
  }, [enrichedNfts])

  // Extract employee name from first NFT that has it
  const employeeName = useMemo(() => {
    for (const nft of enrichedNfts) {
      if (nft.employeeName) return nft.employeeName
    }
    return null
  }, [enrichedNfts])

  return {
    nfts: enrichedNfts,
    categories,
    employeeName,
    totalRecognitions: enrichedNfts.length,
    isLoading,
    error,
  }
}
