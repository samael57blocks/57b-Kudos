import { usePublicClient } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import { parseAbiItem } from 'viem'
import { getContractAddresses } from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmployeeData {
  employee: `0x${string}`
  /** Placeholder: will be populated from block timestamp in a follow-up */
  date: string
}

export interface UseCompanyEmployeesResult {
  employees: EmployeeData[]
  isLoading: boolean
  error: Error | null
  /** Re-fetch the employee list from events */
  refresh: () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all employees registered to a company by scanning
 * `EmployeeRegistered` events from the CompanyRegistry.
 *
 * Returns EmployeeData items with empty date placeholder (block
 * timestamp resolution deferred to follow-up work).
 */
export function useCompanyEmployees(
  companyId: bigint | null,
): UseCompanyEmployeesResult {
  const publicClient = usePublicClient()
  const [employees, setEmployees] = useState<EmployeeData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!companyId || !publicClient) {
      setEmployees([])
      setIsLoading(false)
      setError(null)
      return
    }

    const contracts = getContractAddresses()
    if (!contracts) {
      setEmployees([])
      setIsLoading(false)
      setError(new Error('No contracts configured for this network'))
      return
    }

    let cancelled = false

    const fetchEmployees = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const logs = await publicClient.getLogs({
          address: contracts.companyRegistry,
          event: parseAbiItem(
            'event EmployeeRegistered(uint256 indexed companyId, address indexed employee)',
          ),
          args: { companyId },
          fromBlock: 0n,
        })

        if (cancelled) return

        const empData: EmployeeData[] = logs.map((log) => ({
          employee: log.args.employee!,
          date: '',
        }))

        if (!cancelled) setEmployees(empData)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to fetch company employees'),
        )
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchEmployees()

    return () => {
      cancelled = true
    }
  }, [companyId, publicClient, refreshKey])

  return { employees, isLoading, error, refresh }
}
