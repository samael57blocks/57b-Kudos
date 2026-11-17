import { useAccount, useReadContract } from 'wagmi'
import { useCompanyId } from './useCompanyId'
import { COMPANY_REGISTRY_ABI, getContractAddresses } from '../config/contracts'

export interface UseMintCompanyIdResult {
  companyId: bigint | null
  isLoading: boolean
  error: Error | null
}

/**
 * Resolve the company ID for the mint page: company admins via event scan,
 * minter employees via `getEmployeeCompany`.
 */
export function useMintCompanyId(): UseMintCompanyIdResult {
  const { address } = useAccount()
  const contracts = getContractAddresses()

  const {
    companyId: adminCompanyId,
    isLoading: isAdminLoading,
    error: adminError,
  } = useCompanyId(address)

  const shouldFetchEmployee =
    !!address &&
    !!contracts?.companyRegistry &&
    !isAdminLoading &&
    adminCompanyId === null &&
    !adminError

  const {
    data: employeeCompanyRaw,
    isFetching: isEmployeeCompanyLoading,
    error: employeeCompanyError,
  } = useReadContract({
    address: contracts?.companyRegistry,
    abi: COMPANY_REGISTRY_ABI,
    functionName: 'getEmployeeCompany',
    args: address ? [address] : undefined,
    query: { enabled: shouldFetchEmployee, staleTime: 30_000 },
  })

  const { data: isEmployee, isFetching: isIsEmployeeLoading } = useReadContract({
    address: contracts?.companyRegistry,
    abi: COMPANY_REGISTRY_ABI,
    functionName: 'isEmployee',
    args: address ? [address] : undefined,
    query: { enabled: shouldFetchEmployee, staleTime: 30_000 },
  })

  const isEmployeeLoading =
    shouldFetchEmployee && (isEmployeeCompanyLoading || isIsEmployeeLoading)

  const isLoading = isAdminLoading || isEmployeeLoading

  let companyId = adminCompanyId
  if (companyId === null && !isLoading && isEmployee && employeeCompanyRaw !== undefined) {
    // Company ID 0 is valid — disambiguate "not registered" (also 0n) via isEmployee.
    companyId = employeeCompanyRaw
  }

  let error: Error | null = adminError
  if (!error && employeeCompanyError) {
    error =
      employeeCompanyError instanceof Error
        ? employeeCompanyError
        : new Error('Failed to resolve employee company')
  }
  if (!error && address && !contracts) {
    error = new Error('No contracts configured for this network')
  }
  if (!error && !isLoading && address && companyId === null) {
    error = new Error(
      'Unable to find a company for this wallet. You must be a company admin or a registered employee with minter access.',
    )
  }

  return { companyId, isLoading, error }
}
