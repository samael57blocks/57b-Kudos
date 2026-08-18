import { usePublicClient } from 'wagmi'
import { useEffect, useState } from 'react'
import { parseAbiItem } from 'viem'
import { getContractAddresses } from '../config/contracts'
import { resolveCompanyByEmployee } from '../config/contract-aliases'
import type { CompanyAddress } from '../config/contract-aliases'

export interface UseCompanyIdResult {
  /** The company ID if the address belongs to a company (as owner or employee) */
  companyId: bigint | null
  /** The Company contract address (factory pattern) */
  companyAddress: CompanyAddress | null
  /** Whether the query is in progress */
  isLoading: boolean
  /** Error if the RPC call failed */
  error: Error | null
}

/** New event signature for factory-pattern CompanyRegistry */
const COMPANY_REGISTERED_EVENT = parseAbiItem(
  'event CompanyRegistered(uint256 indexed companyId, address indexed companyAddress, address indexed owner, string name)',
)

/**
 * Resolve the company ID and address for a given wallet address.
 *
 * Strategy (in order):
 * 1. Scan `CompanyRegistered` events where `owner === address` (fast, no extra RPC)
 * 2. Fall back to `resolveCompanyByEmployee(address)` from contract-aliases,
 *    then resolve companyId from the company's registration event.
 *
 * Uses `usePublicClient` from wagmi for type-safe RPC access.
 * `fromBlock: 0n` works for hardhat (chain 31337) and sepolia;
 * for mainnet consider a narrower range.
 */
export function useCompanyId(address: `0x${string}` | undefined): UseCompanyIdResult {
  const publicClient = usePublicClient()
  const [companyId, setCompanyId] = useState<bigint | null>(null)
  const [companyAddress, setCompanyAddress] = useState<CompanyAddress | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!address || !publicClient) {
      setCompanyId(null)
      setCompanyAddress(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const contracts = getContractAddresses()
    if (!contracts) {
      setCompanyId(null)
      setCompanyAddress(null)
      setIsLoading(false)
      setError(new Error('No contracts configured for this network'))
      return
    }

    let cancelled = false

    const fetchCompanyId = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Strategy 1: Check if the address is a company owner
        const logs = await publicClient.getLogs({
          address: contracts.companyRegistry,
          event: COMPANY_REGISTERED_EVENT,
          args: { owner: address },
          fromBlock: 0n,
        })

        if (cancelled) return

        if (logs.length > 0) {
          if (logs.length > 1) {
            console.warn(
              `[useCompanyId] Multiple companies found for owner ${address}, using first`,
            )
          }
          setCompanyId(logs[0].args.companyId ?? null)
          setCompanyAddress((logs[0].args.companyAddress as CompanyAddress) ?? null)
          return
        }

        // Strategy 2: Check if the address is an employee (covers minters too)
        const resolved = await resolveCompanyByEmployee(publicClient, address)

        if (cancelled) return

        if (resolved) {
          setCompanyAddress(resolved.address)

          // Resolve companyId from the company's registration event
          const companyLogs = await publicClient.getLogs({
            address: contracts.companyRegistry,
            event: COMPANY_REGISTERED_EVENT,
            args: { companyAddress: resolved.address },
            fromBlock: 0n,
          })

          if (cancelled) return

          setCompanyId(companyLogs[0]?.args.companyId ?? 0n)
        } else {
          setCompanyId(null)
          setCompanyAddress(null)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error('Failed to resolve company ID'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchCompanyId()

    return () => {
      cancelled = true
    }
  }, [address, publicClient])

  return { companyId, companyAddress, isLoading, error }
}
