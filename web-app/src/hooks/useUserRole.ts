import { useReadContract, useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import {
  NFT57B_ABI,
  COMPANY_REGISTRY_ABI,
  getContractAddresses,
} from '../config/contracts'

export type UserRole = 'admin' | 'company_admin' | 'employee' | 'visitor'

export interface UserRoleResult {
  role: UserRole
  /** If the user is an employee, which company they belong to */
  employeeCompanyId: number | undefined
  /** Whether role detection is still loading */
  isLoading: boolean
  /** Error message, if any */
  error: string | null
}

export interface UseUserRoleOptions {
  /** When true, promotes `visitor` → `company_admin` (used by T-009 dashboard) */
  companyAdmin?: boolean
}

/**
 * Detect the role of the connected wallet by reading from the contracts.
 *
 * - `admin`: has DEFAULT_ADMIN_ROLE on NFT57B (super admin / deployer)
 * - `company_admin`: promoted from `visitor` when `options.companyAdmin` is true
 * - `employee`: registered in CompanyRegistry
 * - `visitor`: connected but no role
 *
 * @param options Optional override to promote visitor → company_admin
 */
export function useUserRole(options?: UseUserRoleOptions): UserRoleResult {
  const { address } = useAccount()
  const [role, setRole] = useState<UserRole>('visitor')
  const [employeeCompanyId, setEmployeeCompanyId] = useState<number | undefined>()
  const [error, setError] = useState<string | null>(null)

  const contracts = getContractAddresses()

  // 1. Check DEFAULT_ADMIN_ROLE
  const { data: defaultAdminRole } = useReadContract({
    address: contracts?.nft57b,
    abi: NFT57B_ABI,
    functionName: 'DEFAULT_ADMIN_ROLE',
    query: { enabled: !!contracts?.nft57b, staleTime: 30_000 },
  })

  const { data: isAdmin, isFetching: isAdminLoading } = useReadContract({
    address: contracts?.nft57b,
    abi: NFT57B_ABI,
    functionName: 'hasRole',
    args: defaultAdminRole
      ? [defaultAdminRole, address ?? '0x0']
      : undefined,
    query: { enabled: !!defaultAdminRole && !!address && !!contracts?.nft57b, staleTime: 30_000 },
  })

  // 2. Check if employee
  const { data: empCompanyRaw, isFetching: isEmpLoading } = useReadContract({
    address: contracts?.companyRegistry,
    abi: COMPANY_REGISTRY_ABI,
    functionName: 'getEmployeeCompany',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contracts?.companyRegistry, staleTime: 30_000 },
  })

  useEffect(() => {
    if (!address || !contracts) {
      setRole('visitor')
      setEmployeeCompanyId(undefined)
      setError('No contracts configured for this network')
      return
    }

    if (isAdminLoading || isEmpLoading) return

    if (isAdmin) {
      setRole('admin')
      return
    }

    const empId = empCompanyRaw !== undefined ? Number(empCompanyRaw) : 0
    if (empId > 0) {
      setRole('employee')
      setEmployeeCompanyId(empId)
      return
    }

    // Connected but not admin and not employee → company admin candidate
    // (can't check on-chain without iterating; handled by T-009)
    setRole('visitor')
    setEmployeeCompanyId(undefined)
    setError(null)
  }, [address, contracts, isAdmin, isAdminLoading, empCompanyRaw, isEmpLoading])

  // Apply companyAdmin override — promotes visitor → company_admin
  const effectiveRole =
    options?.companyAdmin && role === 'visitor' ? 'company_admin' : role

  return {
    role: effectiveRole,
    employeeCompanyId,
    isLoading: isAdminLoading || isEmpLoading,
    error,
  }
}
