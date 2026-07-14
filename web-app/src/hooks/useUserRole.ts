import { useReadContract, useAccount } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import {
  NFT57B_ABI,
  COMPANY_REGISTRY_ABI,
  getContractAddresses,
} from '../config/contracts'

export type UserRole = 'admin' | 'minter' | 'company_admin' | 'employee' | 'visitor'

export interface UserRoleResult {
  role: UserRole
  /** If the user is an employee, which company they belong to */
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

/**
 * Detect the role of the connected wallet by reading from the contracts.
 *
 * - `admin`: has DEFAULT_ADMIN_ROLE on NFT57B (super admin / deployer)
 * - `minter`: has MINTER_ROLE on CompanyRegistry (employee who can mint Kudos)
 * - `company_admin`: promoted from `visitor` when `options.companyAdmin` is true
 * - `employee`: registered in CompanyRegistry
 * - `visitor`: connected but no role
 *
 * Priority: admin > minter > company_admin > employee > visitor
 *
 * @param options Optional override to promote visitor → company_admin
 */
export function useUserRole(options?: UseUserRoleOptions): UserRoleResult {
  const { address } = useAccount()
  const [role, setRole] = useState<UserRole>('visitor')
  const [employeeCompanyId, setEmployeeCompanyId] = useState<number | undefined>()
  const [error, setError] = useState<string | null>(null)

  const contracts = getContractAddresses()

  // MINTER_ROLE bytes32 constant (keccak256("MINTER_ROLE"))
  const MINTER_ROLE_BYTES = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6' as `0x${string}`

  // 1. Check DEFAULT_ADMIN_ROLE
  const { data: defaultAdminRole } = useReadContract({
    address: contracts?.nft57b,
    abi: NFT57B_ABI,
    functionName: 'DEFAULT_ADMIN_ROLE',
    query: { enabled: !!contracts?.nft57b, staleTime: 30_000 },
  })

  const { data: isAdmin, isFetching: isAdminLoading, refetch: refetchAdmin } = useReadContract({
    address: contracts?.nft57b,
    abi: NFT57B_ABI,
    functionName: 'hasRole',
    args: defaultAdminRole
      ? [defaultAdminRole, address ?? '0x0']
      : undefined,
    query: { enabled: !!defaultAdminRole && !!address && !!contracts?.nft57b, staleTime: 30_000 },
  })

  // 2. Check if employee
  const { data: empCompanyRaw, isFetching: isEmpLoading, refetch: refetchEmployee } = useReadContract({
    address: contracts?.companyRegistry,
    abi: COMPANY_REGISTRY_ABI,
    functionName: 'getEmployeeCompany',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contracts?.companyRegistry, staleTime: 30_000 },
  })

  // Separate boolean check — getEmployeeCompany returns 0n for both
  // "not registered" AND "registered to company 0", so we need an
  // unambiguous is-this-address-an-employee query.
  const { data: isEmp, isFetching: isEmpLoading2, refetch: refetchIsEmployee } = useReadContract({
    address: contracts?.companyRegistry,
    abi: COMPANY_REGISTRY_ABI,
    functionName: 'isEmployee',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contracts?.companyRegistry, staleTime: 30_000 },
  })

  // 3. Check MINTER_ROLE on CompanyRegistry
  const { data: isMinter, isFetching: isMinterLoading, refetch: refetchMinter } = useReadContract({
    address: contracts?.companyRegistry,
    abi: COMPANY_REGISTRY_ABI,
    functionName: 'hasRole',
    args: address ? [MINTER_ROLE_BYTES, address] : undefined,
    query: { enabled: !!address && !!contracts?.companyRegistry, staleTime: 30_000 },
  })

  useEffect(() => {
    if (!address || !contracts) {
      setRole('visitor')
      setEmployeeCompanyId(undefined)
      setError('No contracts configured for this network')
      return
    }

    if (isAdminLoading || isEmpLoading || isEmpLoading2 || isMinterLoading) return

    // Priority: admin > minter > employee > visitor
    if (isAdmin) {
      setRole('admin')
      return
    }

    if (isMinter) {
      setRole('minter')
      // Minter is also an employee — get company ID if available
      const companyId = empCompanyRaw !== undefined ? Number(empCompanyRaw) : 0
      setEmployeeCompanyId(companyId)
      return
    }

    if (isEmp) {
      const companyId = empCompanyRaw !== undefined ? Number(empCompanyRaw) : 0
      setRole('employee')
      setEmployeeCompanyId(companyId)
      return
    }

    // Connected but not admin, not minter, not employee → visitor
    setRole('visitor')
    setEmployeeCompanyId(undefined)
    setError(null)
  }, [address, contracts, isAdmin, isAdminLoading, empCompanyRaw, isEmpLoading, isEmp, isEmpLoading2, isMinter, isMinterLoading])

  const refetchRole = useCallback(() => {
    refetchAdmin?.()
    refetchEmployee?.()
    refetchIsEmployee?.()
    refetchMinter?.()
  }, [refetchAdmin, refetchEmployee, refetchIsEmployee, refetchMinter])

  // Apply companyAdmin override — promotes visitor → company_admin
  const effectiveRole =
    options?.companyAdmin && role === 'visitor' ? 'company_admin' : role

  return {
    role: effectiveRole,
    employeeCompanyId,
    isLoading: isAdminLoading || isEmpLoading || isEmpLoading2 || isMinterLoading,
    error,
    refetchRole,
  }
}
