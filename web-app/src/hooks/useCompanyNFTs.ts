import { usePublicClient } from 'wagmi'
import { useEffect, useState } from 'react'
import { parseAbiItem } from 'viem'
import { NFT57B_ABI, getContractAddresses } from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NFTData {
  tokenId: bigint
  tokenURI: string
  employee: `0x${string}`
  /** Placeholder: will be populated from metadata resolution in a follow-up */
  value: string
  /** Placeholder: will be populated from metadata resolution in a follow-up */
  date: string
}

export interface UseCompanyNFTsResult {
  nfts: NFTData[]
  isLoading: boolean
  error: Error | null
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all NFTs minted for a company by scanning `Recognized` events
 * from the CompanyRegistry, then resolving each token's `tokenURI()`.
 *
 * Returns NFTData items with empty value/date placeholders (metadata
 * resolution deferred to follow-up work).
 */
export function useCompanyNFTs(
  companyId: bigint | null,
): UseCompanyNFTsResult {
  const publicClient = usePublicClient()
  const [nfts, setNfts] = useState<NFTData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!companyId || !publicClient) {
      setNfts([])
      setIsLoading(false)
      setError(null)
      return
    }

    const contracts = getContractAddresses()
    if (!contracts) {
      setNfts([])
      setIsLoading(false)
      setError(new Error('No contracts configured for this network'))
      return
    }

    let cancelled = false

    const fetchNFTs = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const logs = await publicClient.getLogs({
          address: contracts.companyRegistry,
          event: parseAbiItem(
            'event Recognized(uint256 indexed tokenId, uint256 indexed companyId, address indexed employee)',
          ),
          args: { companyId },
          fromBlock: 0n,
        })

        if (cancelled) return

        // Fetch tokenURI for each event
        const nftData: NFTData[] = await Promise.all(
          logs.map(async (log) => {
            const tokenId = log.args.tokenId!
            const employee = log.args.employee!

            let tokenURI = ''
            try {
              tokenURI = (await publicClient.readContract({
                address: contracts.nft57b,
                abi: NFT57B_ABI,
                functionName: 'tokenURI',
                args: [tokenId],
              })) as string
            } catch {
              // If tokenURI fetch fails, leave empty
            }

            return {
              tokenId,
              tokenURI,
              employee,
              value: '',
              date: '',
            }
          }),
        )

        if (cancelled) return
        setNfts(nftData)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error ? err : new Error('Failed to fetch company NFTs'),
        )
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchNFTs()

    return () => {
      cancelled = true
    }
  }, [companyId, publicClient])

  return { nfts, isLoading, error }
}
