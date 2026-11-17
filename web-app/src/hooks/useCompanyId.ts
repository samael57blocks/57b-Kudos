import { usePublicClient } from 'wagmi'
import { useEffect, useState } from 'react'
import { parseAbiItem } from 'viem'
import {
  COMPANY_REGISTRY_ABI,
  getContractAddresses,
} from '../config/contracts'

export interface UseCompanyIdResult {
  /** The company ID if the address belongs to a company (as admin or employee) */
  companyId: bigint | null
  /** Whether the query is in progress */
  isLoading: boolean
  /** Error if the RPC call failed */
  error: Error | null
}

/**
 * Resolve the company ID for a given wallet address.
 *
 * Strategy (in order):
 * 1. Scan `CompanyRegistered` events where `admin === address` (fast, no extra RPC)
 * 2. Fall back to `getEmployeeCompany(address)` read call (covers employees & minters)
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
        // Strategy 1: Check if the address is a company admin
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
          return
        }

        // Strategy 2: Check if the address is an employee (covers minters too)
        // getEmployeeCompany returns 0 for both "not registered" AND "company 0",
        // so we need isEmployee to disambiguate.
        const [empCompanyId, isEmp] = await Promise.all([
          publicClient.readContract({
            address: contracts.companyRegistry,
            abi: COMPANY_REGISTRY_ABI,
            functionName: 'getEmployeeCompany',
            args: [address],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: contracts.companyRegistry,
            abi: COMPANY_REGISTRY_ABI,
            functionName: 'isEmployee',
            args: [address],
          }) as Promise<boolean>,
        ])

        if (cancelled) return

        if (isEmp) {
          // Employee is registered — use the companyId from getEmployeeCompany
          // (works for company 0 too since isEmployee confirms registration)
          setCompanyId(empCompanyId)
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
