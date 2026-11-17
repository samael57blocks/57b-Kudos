import { usePublicClient } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import { parseAbiItem } from 'viem'
import { COMPANY_REGISTRY_ABI, getContractAddresses } from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompanyData {
  id: bigint
  name: string
  admin: `0x${string}`
  createdAt: bigint
}

export interface UseCompaniesResult {
  companies: CompanyData[]
  isLoading: boolean
  error: Error | null
  /** Re-fetch the company list from events */
  refresh: () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all registered companies by scanning `CompanyRegistered` events
 * from the CompanyRegistry and enriching each with `getCompany()`.
 */
export function useCompanies(): UseCompaniesResult {
  const publicClient = usePublicClient()
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!publicClient) {
      setCompanies([])
      setIsLoading(false)
      setError(null)
      return
    }

    const contracts = getContractAddresses()
    if (!contracts) {
      setCompanies([])
      setIsLoading(false)
      setError(new Error('No contracts configured for this network'))
      return
    }

    let cancelled = false

    const fetchCompanies = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // 1. Scan CompanyRegistered events
        const logs = await publicClient.getLogs({
          address: contracts.companyRegistry,
          event: parseAbiItem(
            'event CompanyRegistered(uint256 indexed companyId, string name, address indexed admin)',
          ),
          fromBlock: 0n,
        })

        if (cancelled) return

        // 2. Deduplicate by companyId
        const companyIds = [
          ...new Set(logs.map((log) => log.args.companyId as bigint)),
        ]

        // 3. Enrich with getCompany for each unique ID
        const rawData = await Promise.all(
          companyIds.map((id) =>
            publicClient.readContract({
              address: contracts.companyRegistry,
              abi: COMPANY_REGISTRY_ABI,
              functionName: 'getCompany',
              args: [id],
            }),
          ),
        )

        if (cancelled) return

        const enriched: CompanyData[] = rawData.map((data) => ({
          id: data.id,
          name: data.name,
          admin: data.admin as `0x${string}`,
          createdAt: data.createdAt,
        }))

        setCompanies(enriched)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error ? err : new Error('Failed to fetch companies'),
        )
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchCompanies()

    return () => {
      cancelled = true
    }
  }, [publicClient, refreshKey])

  return { companies, isLoading, error, refresh }
}
