import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRecognitionToken } from '../useRecognitionToken'

// --- Hoisted mocks ---

const mockPublicClient = vi.hoisted(() => ({
  readContract: vi.fn(),
}))
const mockGetContractAddresses = vi.hoisted(() =>
  vi.fn(() => ({
    nft57b: '0xNFT' as `0x${string}`,
    companyRegistry: '0xRegistry' as `0x${string}`,
    recognitionToken: '0xRecog' as `0x${string}`,
  })),
)

vi.mock('wagmi', () => ({
  usePublicClient: () => mockPublicClient,
}))

vi.mock('../../config/contracts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../config/contracts')>()
  return {
    ...mod,
    getContractAddresses: mockGetContractAddresses,
  }
})

vi.mock('../../utils/ipfs', () => ({
  resolveMetadata: vi.fn(),
}))

// --- Fixtures ---

const MOCK_ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`

describe('useRecognitionToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetContractAddresses.mockReturnValue({
      nft57b: '0xNFT' as `0x${string}`,
      companyRegistry: '0xRegistry' as `0x${string}`,
      recognitionToken: '0xRecog' as `0x${string}`,
    })
  })

  describe('no token', () => {
    it('returns hasToken false when balanceOf returns 0', async () => {
      mockPublicClient.readContract.mockResolvedValue(0n)
      const { result } = renderHook(() => useRecognitionToken(MOCK_ADDRESS))
      await act(async () => {})
      expect(result.current.hasToken).toBe(false)
      expect(result.current.tokenId).toBeNull()
      expect(result.current.tokenURI).toBeNull()
    })
  })

  describe('has token', () => {
    it('returns hasToken true with tokenId and tokenURI', async () => {
      mockPublicClient.readContract
        .mockResolvedValueOnce(1n)       // balanceOf
        .mockResolvedValueOnce(42n)      // tokenOfOwnerByIndex
        .mockResolvedValueOnce('ipfs://token-uri') // tokenURI

      const { result } = renderHook(() => useRecognitionToken(MOCK_ADDRESS))
      await act(async () => {})
      expect(result.current.hasToken).toBe(true)
      expect(result.current.tokenId).toBe(42n)
      expect(result.current.tokenURI).toBe('ipfs://token-uri')
    })
  })

  describe('no recognitionToken address', () => {
    it('returns hasToken false when contract not configured', async () => {
      mockGetContractAddresses.mockReturnValue({
        nft57b: '0xNFT' as `0x${string}`,
        companyRegistry: '0xRegistry' as `0x${string}`,
        recognitionToken: undefined as unknown as `0x${string}`,
      })
      const { result } = renderHook(() => useRecognitionToken(MOCK_ADDRESS))
      await act(async () => {})
      expect(result.current.hasToken).toBe(false)
    })
  })
})
