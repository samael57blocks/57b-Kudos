import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCompanyNFTs } from '../useCompanyNFTs'

// --- Hoisted mocks ---

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

// Only mock getContractAddresses; let other exports (NFT57B_ABI) pass through
vi.mock('../../config/contracts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../config/contracts')>()
  return {
    ...mod,
    getContractAddresses: mockGetContractAddresses,
  }
})

// --- Fixtures ---

const MOCK_EVENTS = [
  {
    args: {
      tokenId: 1n,
      companyId: 42n,
      employee: '0x1111111111111111111111111111111111111111' as `0x${string}`,
    },
  },
  {
    args: {
      tokenId: 2n,
      companyId: 42n,
      employee: '0x2222222222222222222222222222222222222222' as `0x${string}`,
    },
  },
]

describe('useCompanyNFTs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePublicClient.mockReturnValue({
      getLogs: mockGetLogs,
      readContract: async () => 'ipfs://QmTest',
    })
  })

  it('returns NFTs from Recognized events filtered by companyId', async () => {
    mockGetLogs.mockImplementation(async () => MOCK_EVENTS)

    const { result } = renderHook(() => useCompanyNFTs(42n))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.nfts).toHaveLength(2)
    expect(result.current.nfts[0]).toMatchObject({
      tokenId: 1n,
      tokenURI: 'ipfs://QmTest',
      employee: '0x1111111111111111111111111111111111111111',
    })
    expect(result.current.nfts[1].tokenId).toBe(2n)
  })

  it('fetches NFTs when companyId is 0n (first company)', async () => {
    mockGetLogs.mockImplementation(async () => MOCK_EVENTS)

    const { result } = renderHook(() => useCompanyNFTs(0n))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.nfts).toHaveLength(2)
  })

  it('returns empty array when companyId is null', async () => {
    const { result } = renderHook(() => useCompanyNFTs(null))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.nfts).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('sets loading during fetch, then resolves to empty when no events', async () => {
    mockGetLogs.mockImplementation(async () => [])

    const { result } = renderHook(() => useCompanyNFTs(42n))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.nfts).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('catches errors from getLogs and returns error state', async () => {
    mockGetLogs.mockImplementation(async () => {
      throw new Error('RPC error')
    })

    const { result } = renderHook(() => useCompanyNFTs(42n))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.nfts).toEqual([])
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toContain('RPC error')
  })

  it('handles readContract failure per-token by leaving tokenURI empty', async () => {
    mockGetLogs.mockImplementation(async () => MOCK_EVENTS)
    // Override readContract to throw
    mockUsePublicClient.mockReturnValue({
      getLogs: mockGetLogs,
      readContract: async () => {
        throw new Error('TokenURI failed')
      },
    })

    const { result } = renderHook(() => useCompanyNFTs(42n))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // readContract failure is caught per-token, so no global error
    expect(result.current.error).toBeNull()
    expect(result.current.nfts).toHaveLength(2)
    expect(result.current.nfts[0].tokenURI).toBe('')
    expect(result.current.nfts[1].tokenURI).toBe('')
  })
})
