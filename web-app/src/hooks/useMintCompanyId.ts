import { useAccount } from 'wagmi'
import { useCompanyId } from './useCompanyId'
import { getContractAddresses } from '../config/contracts'

export interface UseMintCompanyIdResult {
  companyId: bigint | null
  isLoading: boolean
  error: Error | null
}

/**
 * Resolve the company ID for the mint page.
 *
 * Delegates to `useCompanyId` which handles both admin (event scan)
 * and employee (factory alias) resolution. Adds a user-friendly
 * error when no company can be found.
 */
export function useMintCompanyId(): UseMintCompanyIdResult {
  const { address } = useAccount()
  const contracts = getContractAddresses()

  const {
    companyId,
    isLoading,
    error: useCompanyIdError,
  } = useCompanyId(address)

  let error: Error | null = useCompanyIdError
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
