import { usePublicClient } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import { parseAbiItem } from 'viem'
import { getContractAddresses } from '../config/contracts'
import { resolveCompanyById } from '../config/contract-aliases'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmployeeData {
  employee: `0x${string}`
  name: string
  registrationDate: string
}

export interface UseCompanyEmployeesResult {
  employees: EmployeeData[]
  isLoading: boolean
  error: Error | null
  /** Re-fetch the employee list from events */
  refresh: () => void
}

/** Event signature on Company contract (no companyId — implicit from contract address) */
const EMPLOYEE_REGISTERED_EVENT = parseAbiItem(
  'event EmployeeRegistered(address indexed employee, string name)',
)

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all employees registered to a company by:
 * 1. Resolving companyId → Company address via factory alias
 * 2. Scanning `EmployeeRegistered` events from the Company contract
 *
 * Returns EmployeeData items with resolved registration dates from block timestamps.
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
    if (companyId === null || companyId === undefined || !publicClient) {
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
        // 1. Resolve companyId to Company contract address
        const resolved = await resolveCompanyById(publicClient, companyId)

        if (cancelled) return

        if (!resolved) {
          setEmployees([])
          return
        }

        // 2. Scan EmployeeRegistered events from the Company contract
        const logs = await publicClient.getLogs({
          address: resolved.address,
          event: EMPLOYEE_REGISTERED_EVENT,
          fromBlock: 0n,
        })

        if (cancelled) return

        const empData: EmployeeData[] = logs.map((log) => ({
          employee: log.args.employee!,
          name: (log.args.name as string) ?? '',
          registrationDate: '',
        }))

        // 3. Resolve block timestamps for registration dates
        const timestampPromises = empData.map((_emp, i) =>
          publicClient
            .getBlock({ blockNumber: logs[i].blockNumber! })
            .then((block) => {
              if (cancelled) return
              empData[i].registrationDate = new Date(
                Number(block.timestamp) * 1000,
              ).toLocaleDateString()
            })
            .catch(() => {
              if (cancelled) return
              empData[i].registrationDate = '—'
            }),
        )

        await Promise.allSettled(timestampPromises)

        if (!cancelled) setEmployees([...empData])
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
