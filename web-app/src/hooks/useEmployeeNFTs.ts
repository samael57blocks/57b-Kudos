import { usePublicClient } from 'wagmi'
import { useEffect, useState } from 'react'
import { parseAbiItem } from 'viem'
import {
  NFT57B_ABI,
  COMPANY_REGISTRY_ABI,
  getContractAddresses,
} from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmployeeNFTData {
  tokenId: bigint
  tokenURI: string
  companyName: string | null
}

export interface UseEmployeeNFTsResult {
  nfts: EmployeeNFTData[]
  isLoading: boolean
  error: Error | null
}

const MAX_TOKENS = 50

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all NFTs owned by a wallet address.
 *
 * 1. Calls balanceOf(address) to get the count
 * 2. Iterates tokenOfOwnerByIndex to get each tokenId
 * 3. Resolves tokenURI per tokenId
 * 4. Scans Recognized events to determine the company per tokenId
 * 5. Deduplicates getCompany calls to resolve company names
 */
export function useEmployeeNFTs(
  address: `0x${string}` | undefined,
): UseEmployeeNFTsResult {
  const publicClient = usePublicClient()
  const [nfts, setNfts] = useState<EmployeeNFTData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!address || !publicClient) {
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
        // 1. Get balance
        const balance = (await publicClient.readContract({
          address: contracts.nft57b,
          abi: NFT57B_ABI,
          functionName: 'balanceOf',
          args: [address],
        })) as bigint

        if (cancelled) return

        const tokenCount = Number(balance)
        if (tokenCount === 0) {
          setNfts([])
          return
        }

        // 2. Resolve token IDs (pagination guard)
        const limit = Math.min(tokenCount, MAX_TOKENS)
        const tokenIds: bigint[] = []
        for (let i = 0; i < limit; i++) {
          const tokenId = (await publicClient.readContract({
            address: contracts.nft57b,
            abi: NFT57B_ABI,
            functionName: 'tokenOfOwnerByIndex',
            args: [address, BigInt(i)],
          })) as bigint
          tokenIds.push(tokenId)
        }

        if (cancelled) return

        // 3. Resolve tokenURIs and company IDs in parallel
        const tokenData = await Promise.all(
          tokenIds.map(async (tokenId): Promise<{ tokenId: bigint; tokenURI: string; companyId: bigint | null }> => {
            let uri = ''
            try {
              uri = (await publicClient.readContract({
                address: contracts.nft57b,
                abi: NFT57B_ABI,
                functionName: 'tokenURI',
                args: [tokenId],
              })) as string
            } catch {
              // tokenURI fetch failed — leave empty
            }

            let companyId: bigint | null = null
            try {
              // Try Recognized event first (company admin flow)
              const recognizedLogs = await publicClient.getLogs({
                address: contracts.companyRegistry,
                event: parseAbiItem(
                  'event Recognized(uint256 indexed tokenId, uint256 indexed companyId, address indexed employee)',
                ),
                args: { tokenId },
                fromBlock: 0n,
              })
              if (recognizedLogs.length > 0) {
                companyId = recognizedLogs[0].args.companyId ?? null
              }
            } catch {
              // Recognized event scan failed — try KudosMinted
            }

            if (companyId === null) {
              try {
                // Fall back to KudosMinted event (minter flow)
                const kudosLogs = await publicClient.getLogs({
                  address: contracts.companyRegistry,
                  event: parseAbiItem(
                    'event KudosMinted(uint256 indexed tokenId, uint256 indexed companyId, address indexed employee, address minter)',
                  ),
                  args: { tokenId },
                  fromBlock: 0n,
                })
                if (kudosLogs.length > 0) {
                  companyId = kudosLogs[0].args.companyId ?? null
                }
              } catch {
                // KudosMinted event scan failed — leave null
              }
            }

            return { tokenId, tokenURI: uri, companyId }
          }),
        )

        if (cancelled) return

        // 4. Deduplicate companyId → name mapping
        const uniqueCompanyIds = new Set<bigint>()
        for (const td of tokenData) {
          if (td.companyId !== null) {
            uniqueCompanyIds.add(td.companyId)
          }
        }

        const companyNames = new Map<bigint, string | null>()
        await Promise.all(
          Array.from(uniqueCompanyIds).map(async (cid) => {
            try {
              const company = (await publicClient.readContract({
                address: contracts.companyRegistry,
                abi: COMPANY_REGISTRY_ABI,
                functionName: 'getCompany',
                args: [cid],
              })) as { name: string }
              companyNames.set(cid, company.name)
            } catch {
              companyNames.set(cid, null)
            }
          }),
        )

        if (cancelled) return

        // 5. Assemble final result
        const result: EmployeeNFTData[] = tokenData.map((td) => ({
          tokenId: td.tokenId,
          tokenURI: td.tokenURI,
          companyName: td.companyId !== null ? (companyNames.get(td.companyId) ?? null) : null,
        }))

        setNfts(result)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error ? err : new Error('Failed to fetch employee NFTs'),
        )
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchNFTs()

    return () => {
      cancelled = true
    }
  }, [address, publicClient])

  return { nfts, isLoading, error }
}
