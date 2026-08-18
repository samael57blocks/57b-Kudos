import { usePublicClient } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import { parseAbiItem } from 'viem'
import { getContractAddresses } from '../config/contracts'
import type { CompanyAddress } from '../config/contract-aliases'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompanyData {
  id: bigint
  address: CompanyAddress
  name: string
  owner: `0x${string}`
  createdAt: bigint
}

export interface UseCompaniesResult {
  companies: CompanyData[]
  isLoading: boolean
  error: Error | null
  /** Re-fetch the company list from events */
  refresh: () => void
}

/** Event signature for factory-pattern CompanyRegistry */
const COMPANY_REGISTERED_EVENT = parseAbiItem(
  'event CompanyRegistered(uint256 indexed companyId, address indexed companyAddress, address indexed owner, string name)',
)

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all registered companies by scanning `CompanyRegistered` events
 * from the CompanyRegistry.
 *
 * In the factory pattern, each event provides companyId, companyAddress,
 * owner, and name directly — no separate read call needed.
 * Block timestamps are resolved for createdAt.
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
        // 1. Scan CompanyRegistered events (factory pattern)
        const logs = await publicClient.getLogs({
          address: contracts.companyRegistry,
          event: COMPANY_REGISTERED_EVENT,
          fromBlock: 0n,
        })

        if (cancelled) return

        // 2. Deduplicate by companyId
        const seen = new Set<string>()
        const uniqueLogs = logs.filter((log) => {
          const id = log.args.companyId?.toString() ?? ''
          if (seen.has(id)) return false
          seen.add(id)
          return true
        })

        // 3. Build CompanyData from event args (no getCompany call needed)
        const enriched: CompanyData[] = uniqueLogs.map((log) => ({
          id: log.args.companyId!,
          address: log.args.companyAddress as CompanyAddress,
          name: (log.args.name as string) ?? '',
          owner: log.args.owner as `0x${string}`,
          createdAt: 0n, // resolved below
        }))

        // 4. Resolve block timestamps for createdAt
        const timestampPromises = enriched.map((company, i) =>
          publicClient
            .getBlock({ blockNumber: uniqueLogs[i].blockNumber! })
            .then((block) => {
              if (cancelled) return
              company.createdAt = block.timestamp
            })
            .catch(() => {
              if (cancelled) return
              company.createdAt = 0n
            }),
        )

        await Promise.allSettled(timestampPromises)

        if (!cancelled) setCompanies(enriched)
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
