import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useEmployeeNFTs } from '../useEmployeeNFTs'

// --- Hoisted mocks ---

const mockReadContract = vi.hoisted(() => vi.fn())
const mockGetLogs = vi.hoisted(() => vi.fn())
const mockUsePublicClient = vi.hoisted(() => vi.fn())
const mockGetContractAddresses = vi.hoisted(() =>
  vi.fn(() => ({
    nft57b: '0xNFT' as `0x${string}`,
    companyRegistry: '0xRegistry' as `0x${string}`,
  })),
)

vi.mock('wagmi', () => ({
  usePublicClient: mockUsePublicClient,
}))

vi.mock('../../config/contracts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../config/contracts')>()
  return {
    ...mod,
    getContractAddresses: mockGetContractAddresses,
  }
})

// --- Fixtures ---

const MOCK_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`

describe('useEmployeeNFTs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadContract.mockReset()
    mockGetLogs.mockReset()
    mockUsePublicClient.mockReturnValue({
      readContract: mockReadContract,
      getLogs: mockGetLogs,
    })
  })

  it('returns NFTs owned by the address (happy path with 2 tokens)', async () => {
    // Sequential calls: balanceOf, tokenOfOwnerByIndex(0), tokenOfOwnerByIndex(1),
    // tokenURI(1n), tokenURI(2n), getCompany(42n) (deduped)
    // And getLogs for Recognized events per tokenId
    const callSequence = vi
      .fn()
      .mockResolvedValueOnce(2n) // balanceOf
      .mockResolvedValueOnce(1n) // tokenOfOwnerByIndex(0) → tokenId 1
      .mockResolvedValueOnce(2n) // tokenOfOwnerByIndex(1) → tokenId 2
      .mockResolvedValueOnce('ipfs://QmFirst') // tokenURI(1n)
      .mockResolvedValueOnce('ipfs://QmSecond') // tokenURI(2n)
      .mockResolvedValueOnce({ name: 'Test Corp', admin: '0xAdmin', active: true }) // getCompany(42n)

    mockReadContract.mockImplementation(callSequence)

    // getLogs: Recognized events for each tokenId
    // tokenId 1 → companyId 42
    // tokenId 2 → companyId 42 (same company)
    mockGetLogs.mockImplementation(async ({ args }: { args: { tokenId: bigint } }) => {
      if (args?.tokenId === 1n) {
        return [
          {
            args: {
              tokenId: 1n,
              companyId: 42n,
              employee: MOCK_ADDRESS,
            },
          },
        ]
      }
      if (args?.tokenId === 2n) {
        return [
          {
            args: {
              tokenId: 2n,
              companyId: 42n,
              employee: MOCK_ADDRESS,
            },
          },
        ]
      }
      return []
    })

    const { result } = renderHook(() => useEmployeeNFTs(MOCK_ADDRESS))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.nfts).toHaveLength(2)
    expect(result.current.nfts[0]).toEqual({
      tokenId: 1n,
      tokenURI: 'ipfs://QmFirst',
      companyName: 'Test Corp',
    })
    expect(result.current.nfts[1]).toEqual({
      tokenId: 2n,
      tokenURI: 'ipfs://QmSecond',
      companyName: 'Test Corp',
    })
  })

  it('returns empty array when balance is 0', async () => {
    mockReadContract.mockImplementation(
      async ({ functionName }: { functionName: string }) => {
        if (functionName === 'balanceOf') return 0n
        return undefined
      },
    )

    const { result } = renderHook(() => useEmployeeNFTs(MOCK_ADDRESS))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.nfts).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns error when balanceOf fails', async () => {
    mockReadContract.mockRejectedValue(new Error('RPC error'))

    const { result } = renderHook(() => useEmployeeNFTs(MOCK_ADDRESS))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.nfts).toEqual([])
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toContain('RPC error')
  })

  it('handles tokenURI failure gracefully', async () => {
    const callSequence = vi
      .fn()
      .mockResolvedValueOnce(1n) // balanceOf
      .mockResolvedValueOnce(42n) // tokenOfOwnerByIndex(0) → tokenId 42
      .mockRejectedValueOnce(new Error('URI fetch failed')) // tokenURI(42n) fails
      .mockResolvedValueOnce({ name: 'Other Corp', admin: '0xAdmin', active: true }) // getCompany

    mockReadContract.mockImplementation(callSequence)

    mockGetLogs.mockResolvedValue([
      {
        args: {
          tokenId: 42n,
          companyId: 99n,
          employee: MOCK_ADDRESS,
        },
      },
    ])

    const { result } = renderHook(() => useEmployeeNFTs(MOCK_ADDRESS))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // TokenURI failure should not cause global error
    expect(result.current.error).toBeNull()
    expect(result.current.nfts).toHaveLength(1)
    expect(result.current.nfts[0]).toEqual({
      tokenId: 42n,
      tokenURI: '',
      companyName: 'Other Corp',
    })
  })

  it('returns empty when address is undefined', () => {
    const { result } = renderHook(() => useEmployeeNFTs(undefined))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.nfts).toEqual([])
    expect(result.current.error).toBeNull()
  })
})
