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
const OTHER_ADDRESS = '0x2222222222222222222222222222222222222222' as `0x${string}`

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
    it('returns hasToken false when ownerOf reverts immediately (no tokens exist)', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('Token does not exist'))
      const { result } = renderHook(() => useRecognitionToken(MOCK_ADDRESS))
      await act(async () => {})
      expect(result.current.hasToken).toBe(false)
      expect(result.current.tokenId).toBeNull()
      expect(result.current.tokenURI).toBeNull()
    })

    it('returns hasToken false when tokens exist but belong to others', async () => {
      mockPublicClient.readContract
        .mockResolvedValueOnce(OTHER_ADDRESS)  // ownerOf(0) → different owner
        .mockRejectedValueOnce(new Error('Token does not exist'))  // ownerOf(1) → reverts

      const { result } = renderHook(() => useRecognitionToken(MOCK_ADDRESS))
      await act(async () => {})
      expect(result.current.hasToken).toBe(false)
    })
  })

  describe('has token', () => {
    it('returns hasToken true with tokenId and tokenURI', async () => {
      mockPublicClient.readContract
        .mockResolvedValueOnce(OTHER_ADDRESS)  // ownerOf(0) → different owner
        .mockResolvedValueOnce(MOCK_ADDRESS)   // ownerOf(1) → our address
        .mockResolvedValueOnce('ipfs://token-uri') // tokenURI(1)

      const { result } = renderHook(() => useRecognitionToken(MOCK_ADDRESS))
      await act(async () => {})
      expect(result.current.hasToken).toBe(true)
      expect(result.current.tokenId).toBe(1n)
      expect(result.current.tokenURI).toBe('ipfs://token-uri')
    })

    it('finds token at index 0 when first owner matches', async () => {
      mockPublicClient.readContract
        .mockResolvedValueOnce(MOCK_ADDRESS)   // ownerOf(0) → our address
        .mockResolvedValueOnce('ipfs://first-token') // tokenURI(0)

      const { result } = renderHook(() => useRecognitionToken(MOCK_ADDRESS))
      await act(async () => {})
      expect(result.current.hasToken).toBe(true)
      expect(result.current.tokenId).toBe(0n)
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
