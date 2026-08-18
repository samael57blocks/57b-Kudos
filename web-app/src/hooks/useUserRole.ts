import { useReadContract, useAccount, usePublicClient } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import { parseAbiItem } from 'viem'
import { NFT57B_ABI, getContractAddresses } from '../config/contracts'
import {
  resolveCompanyByEmployee,
  hasMinterRoleOn,
} from '../config/contract-aliases'
import type { CompanyAddress } from '../config/contract-aliases'

export type UserRole = 'admin' | 'minter' | 'company_admin' | 'employee' | 'visitor'

export interface UserRoleResult {
  role: UserRole
  /** If the user is an employee, which company they belong to (numeric ID) */
  employeeCompanyId: number | undefined
  /** Whether role detection is still loading */
  isLoading: boolean
  /** Error message, if any */
  error: string | null
  /** Re-fetch role data from contracts (used after role-changing transactions) */
  refetchRole: () => void
}

export interface UseUserRoleOptions {
  /** When true, promotes `visitor` → `company_admin` (used by T-009 dashboard) */
  companyAdmin?: boolean
}

/** Event signature for resolving companyId from company address */
const COMPANY_REGISTERED_EVENT = parseAbiItem(
  'event CompanyRegistered(uint256 indexed companyId, address indexed companyAddress, address indexed owner, string name)',
)

/**
 * Detect the role of the connected wallet by reading from the contracts.
 *
 * - `admin`: has DEFAULT_ADMIN_ROLE on NFT57B (super admin / deployer)
 * - `minter`: has MINTER_ROLE on their Company contract (employee who can mint Kudos)
 * - `company_admin`: promoted from `visitor` when `options.companyAdmin` is true
 * - `employee`: registered in a Company contract
 * - `visitor`: connected but no role
 *
 * Priority: admin > minter > company_admin > employee > visitor
 *
 * @param options Optional override to promote visitor → company_admin
 */
export function useUserRole(options?: UseUserRoleOptions): UserRoleResult {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [role, setRole] = useState<UserRole>('visitor')
  const [employeeCompanyId, setEmployeeCompanyId] = useState<number | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [empMinterLoading, setEmpMinterLoading] = useState(false)
  const [refetchKey, setRefetchKey] = useState(0)

  const contracts = getContractAddresses()

  // ── 1. Admin check via wagmi hook (unchanged) ──────────────────────────────

  const { data: defaultAdminRole } = useReadContract({
    address: contracts?.nft57b,
    abi: NFT57B_ABI,
    functionName: 'DEFAULT_ADMIN_ROLE',
    query: { enabled: !!contracts?.nft57b, staleTime: 30_000 },
  })

  const {
    data: isAdmin,
    isFetching: isAdminLoading,
    refetch: refetchAdmin,
  } = useReadContract({
    address: contracts?.nft57b,
    abi: NFT57B_ABI,
    functionName: 'hasRole',
    args: defaultAdminRole
      ? [defaultAdminRole, address ?? '0x0']
      : undefined,
    query: {
      enabled: !!defaultAdminRole && !!address && !!contracts?.nft57b,
      staleTime: 30_000,
    },
  })

  // ── 2 & 3. Employee + Minter detection via factory aliases ──────────────────

  useEffect(() => {
    if (!address || !publicClient || !contracts) {
      setRole('visitor')
      setEmployeeCompanyId(undefined)
      setError(!contracts ? 'No contracts configured for this network' : null)
      setEmpMinterLoading(false)
      return
    }

    // Wait for admin check to complete before resolving employee/minter
    if (isAdminLoading) return

    let cancelled = false

    const resolve = async () => {
      setEmpMinterLoading(true)
      setError(null)

      try {
        // Already admin — no need to check employee/minter
        if (isAdmin) {
          if (!cancelled) {
            setRole('admin')
            setEmployeeCompanyId(undefined)
          }
          return
        }

        // Resolve company by employee address using factory alias
        const resolved = await resolveCompanyByEmployee(publicClient, address)

        if (cancelled) return

        if (!resolved) {
          setRole('visitor')
          setEmployeeCompanyId(undefined)
          return
        }

        // Employee found — resolve companyId from registration event
        let resolvedCompanyId = 0
        try {
          const logs = await publicClient.getLogs({
            address: contracts.companyRegistry,
            event: COMPANY_REGISTERED_EVENT,
            args: { companyAddress: resolved.address },
            fromBlock: 0n,
          })
          if (logs[0]?.args.companyId !== undefined) {
            resolvedCompanyId = Number(logs[0].args.companyId)
          }
        } catch {
          // companyId resolution failed — continue with 0
        }

        if (cancelled) return

        // Check minter role on the resolved company contract
        const isMinter = await hasMinterRoleOn(
          publicClient,
          resolved.address as CompanyAddress,
          address,
        )

        if (cancelled) return

        if (isMinter) {
          setRole('minter')
        } else {
          setRole('employee')
        }
        setEmployeeCompanyId(resolvedCompanyId)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to resolve role',
          )
        }
      } finally {
        if (!cancelled) setEmpMinterLoading(false)
      }
    }

    resolve()

    return () => {
      cancelled = true
    }
  }, [address, publicClient, contracts, isAdmin, isAdminLoading, refetchKey])

  const refetchRole = useCallback(() => {
    refetchAdmin?.()
    setRefetchKey((k) => k + 1)
  }, [refetchAdmin])

  // Apply companyAdmin override — promotes visitor → company_admin
  const effectiveRole =
    options?.companyAdmin && role === 'visitor' ? 'company_admin' : role

  return {
    role: effectiveRole,
    employeeCompanyId,
    isLoading: isAdminLoading || empMinterLoading,
    error,
    refetchRole,
  }
}
