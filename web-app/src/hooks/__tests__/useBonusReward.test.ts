import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBonusReward } from '../useBonusReward'

// --- Hoisted mocks ---

const mockWriteContractAsync = vi.hoisted(() => vi.fn())
const mockUseWriteContract = vi.hoisted(() => vi.fn())
const mockUseWaitForTransactionReceipt = vi.hoisted(() => vi.fn())
const mockPublicClient = vi.hoisted(() => ({
  readContract: vi.fn(),
}))
const mockGetContractAddresses = vi.hoisted(() =>
  vi.fn(() => ({
    nft57b: '0xNFT' as `0x${string}`,
    companyRegistry: '0xRegistry' as `0x${string}`,
    bonusReward: '0xBonus' as `0x${string}`,
  })),
)

vi.mock('wagmi', () => ({
  usePublicClient: () => mockPublicClient,
  useWriteContract: mockUseWriteContract,
  useWaitForTransactionReceipt: mockUseWaitForTransactionReceipt,
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

function setupMocks(options?: {
  balance?: bigint
  writeHash?: `0x${string}`
  writeError?: Error
}) {
  const {
    balance = 100n * 10n ** 18n,
    writeHash,
    writeError,
  } = options ?? {}

  mockGetContractAddresses.mockReturnValue({
    nft57b: '0xNFT' as `0x${string}`,
    companyRegistry: '0xRegistry' as `0x${string}`,
    bonusReward: '0xBonus' as `0x${string}`,
  })
  mockPublicClient.readContract.mockResolvedValue(balance)
  mockUseWriteContract.mockReturnValue({
    writeContractAsync: mockWriteContractAsync,
    data: writeHash,
    isPending: false,
    error: writeError ?? null,
  })
  mockUseWaitForTransactionReceipt.mockReturnValue({
    isLoading: false,
    isSuccess: true,
    error: null,
  })
  mockWriteContractAsync.mockResolvedValue('0xHash' as `0x${string}`)
}

// --- Tests ---

describe('useBonusReward', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  describe('balance read', () => {
    it('returns balance from contract', async () => {
      const { result } = renderHook(() => useBonusReward(MOCK_ADDRESS))
      // Wait for useEffect fetch to complete
      await act(async () => {})
      expect(result.current.balance).toBe(100n * 10n ** 18n)
    })

    it('returns 0 when no bonusReward address configured', async () => {
      mockGetContractAddresses.mockReturnValue({
        nft57b: '0xNFT' as `0x${string}`,
        companyRegistry: '0xRegistry' as `0x${string}`,
        bonusReward: undefined as unknown as `0x${string}`,
      })
      const { result } = renderHook(() => useBonusReward(MOCK_ADDRESS))
      await act(async () => {})
      expect(result.current.balance).toBe(0n)
    })
  })

  describe('claimReward flow', () => {
    it('calls writeContractAsync with claimReward function', async () => {
      const { result } = renderHook(() => useBonusReward(MOCK_ADDRESS))
      await act(async () => {})

      await act(async () => {
        await result.current.claimReward()
      })

      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'claimReward',
        }),
      )
    })
  })
})
