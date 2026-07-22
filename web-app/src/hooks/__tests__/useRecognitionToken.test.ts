import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRecognitionToken } from '../useRecognitionToken'

// --- Hoisted mocks ---

const mockUseReadContract = vi.hoisted(() => vi.fn())
const mockGetContractAddresses = vi.hoisted(() =>
  vi.fn(() => ({
    nft57b: '0xNFT' as `0x${string}`,
    companyRegistry: '0xRegistry' as `0x${string}`,
    recognitionToken: '0xRecog' as `0x${string}`,
  })),
)

vi.mock('wagmi', () => ({
  useReadContract: mockUseReadContract,
}))

vi.mock('../../config/contracts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../config/contracts')>()
  return {
    ...mod,
    getContractAddresses: mockGetContractAddresses,
  }
})

// --- Fixtures ---

const MOCK_ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`

function setupReadContractMock(responses: unknown[]) {
  let callIndex = 0
  mockUseReadContract.mockImplementation((config: { query?: { enabled?: boolean } }) => {
    if (config?.query?.enabled === false) {
      return { data: undefined, isFetching: false }
    }
    const resp = responses[Math.min(callIndex, responses.length - 1)]
    callIndex++
    return resp
  })
}

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
    it('returns hasToken false when balanceOf returns 0', () => {
      setupReadContractMock([
        { data: 0n, isFetching: false },  // balanceOf
      ])
      const { result } = renderHook(() => useRecognitionToken(MOCK_ADDRESS))
      expect(result.current.hasToken).toBe(false)
      expect(result.current.tokenId).toBeNull()
      expect(result.current.tokenURI).toBeNull()
    })
  })

  describe('has token', () => {
    it('returns hasToken true with tokenId and tokenURI', () => {
      setupReadContractMock([
        { data: 1n, isFetching: false },       // balanceOf
        { data: 42n, isFetching: false },       // tokenOfOwnerByIndex
        { data: 'ipfs://token-uri', isFetching: false }, // tokenURI
      ])
      const { result } = renderHook(() => useRecognitionToken(MOCK_ADDRESS))
      expect(result.current.hasToken).toBe(true)
      expect(result.current.tokenId).toBe(42n)
      expect(result.current.tokenURI).toBe('ipfs://token-uri')
    })
  })

  describe('no recognitionToken address', () => {
    it('returns hasToken false when contract not configured', () => {
      mockGetContractAddresses.mockReturnValue({
        nft57b: '0xNFT' as `0x${string}`,
        companyRegistry: '0xRegistry' as `0x${string}`,
        recognitionToken: undefined as unknown as `0x${string}`,
      })
      setupReadContractMock([
        { data: undefined, isFetching: false },
      ])
      const { result } = renderHook(() => useRecognitionToken(MOCK_ADDRESS))
      expect(result.current.hasToken).toBe(false)
    })
  })
})
