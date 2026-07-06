import { usePublicClient } from 'wagmi'
import { useEffect, useState } from 'react'
import { parseAbiItem } from 'viem'
import { getContractAddresses } from '../config/contracts'

export interface UseCompanyIdResult {
  /** The company ID if the address is an admin, null otherwise */
  companyId: bigint | null
  /** Whether the query is in progress */
  isLoading: boolean
  /** Error if the RPC call failed */
  error: Error | null
}

/**
 * Resolve the company ID for a given wallet address by scanning
 * `CompanyRegistered` events filtered by `admin === address`.
 *
 * Uses `usePublicClient` from wagmi v3 for type-safe RPC access.
 * `fromBlock: 0n` works for hardhat (chain 31337) and sepolia;
 * for mainnet consider a narrower range.
 */
export function useCompanyId(address: `0x${string}` | undefined): UseCompanyIdResult {
  const publicClient = usePublicClient()
  const [companyId, setCompanyId] = useState<bigint | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!address || !publicClient) {
      setCompanyId(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const contracts = getContractAddresses()
    if (!contracts) {
      setCompanyId(null)
      setIsLoading(false)
      setError(new Error('No contracts configured for this network'))
      return
    }

    let cancelled = false

    const fetchCompanyId = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const logs = await publicClient.getLogs({
          address: contracts.companyRegistry,
          event: parseAbiItem(
            'event CompanyRegistered(uint256 indexed companyId, string name, address indexed admin)',
          ),
          args: { admin: address },
          fromBlock: 0n,
        })

        if (cancelled) return

        if (logs.length > 0) {
          if (logs.length > 1) {
            console.warn(
              `[useCompanyId] Multiple companies found for admin ${address}, using first`,
            )
          }
          const cid = logs[0].args.companyId
          setCompanyId(cid ?? null)
        } else {
          setCompanyId(null)
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

  return { companyId, isLoading, error }
}
