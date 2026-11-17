import { useQuery } from '@tanstack/react-query'
import { resolveMetadata } from '../utils/ipfs'

/**
 * Resolve an IPFS metadata URI using React Query.
 * Cached for 5 minutes since IPFS metadata is immutable.
 * Disabled when uri is undefined.
 */
export function useTokenMetadata(uri: string | undefined) {
  return useQuery({
    queryKey: ['token-metadata', uri],
    queryFn: () => resolveMetadata(uri!),
    enabled: !!uri,
    staleTime: 5 * 60 * 1000,
  })
}
