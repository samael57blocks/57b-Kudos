import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useClaimNFT } from '../useClaimNFT'

// --- Hoisted mocks ---

const mockWriteContractAsync = vi.hoisted(() => vi.fn())
const mockUseWriteContract = vi.hoisted(() => vi.fn())
const mockUseWaitForTransactionReceipt = vi.hoisted(() => vi.fn())
const mockGetContractAddresses = vi.hoisted(() =>
  vi.fn(() => ({
    nft57b: '0xNFT' as `0x${string}`,
    companyRegistry: '0xRegistry' as `0x${string}`,
  })),
)
const mockInvalidateQueries = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useWriteContract: mockUseWriteContract,
  useWaitForTransactionReceipt: mockUseWaitForTransactionReceipt,
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}))

vi.mock('../../config/contracts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../config/contracts')>()
  return {
    ...mod,
    getContractAddresses: mockGetContractAddresses,
  }
})

// --- Fixtures ---

const MOCK_HASH = '0xClaimHash' as `0x${string}`
const MOCK_TOKEN_ID = 42n

function setupMocks(options?: {
  wcData?: `0x${string}`
  wcError?: Error
  wtfrIsLoading?: boolean
  wtfrIsSuccess?: boolean
  wtfrError?: Error
}) {
  const {
    wcData,
    wcError,
    wtfrIsLoading = false,
    wtfrIsSuccess = true,
    wtfrError,
  } = options ?? {}

  mockUseWriteContract.mockReturnValue({
    writeContractAsync: mockWriteContractAsync,
    data: wcData,
    isPending: false,
    error: wcError ?? null,
  })
  mockUseWaitForTransactionReceipt.mockReturnValue({
    isLoading: wtfrIsLoading,
    isSuccess: wtfrIsSuccess,
    error: wtfrError ?? null,
  })
  mockWriteContractAsync.mockResolvedValue(MOCK_HASH)
}

// --- Tests ---

describe('useClaimNFT', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  describe('initial state', () => {
    it('starts in idle step with no error', () => {
      const { result } = renderHook(() => useClaimNFT(MOCK_TOKEN_ID))
      expect(result.current.step).toBe('idle')
      expect(result.current.txHash).toBeUndefined()
      expect(result.current.error).toBeNull()
    })
  })

  describe('claim flow — success', () => {
    it('transitions idle → confirming → success on happy path', async () => {
      const { result } = renderHook(() => useClaimNFT(MOCK_TOKEN_ID))

      expect(result.current.step).toBe('idle')

      await act(async () => {
        await result.current.claim()
      })

      await waitFor(() => {
        expect(result.current.step).toBe('success')
      })

      expect(result.current.txHash).toBe(MOCK_HASH)
      expect(result.current.error).toBeNull()
    })

    it('calls writeContractAsync with correct ABI, function, and args', async () => {
      const { result } = renderHook(() => useClaimNFT(MOCK_TOKEN_ID))

      await act(async () => {
        await result.current.claim()
      })

      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'claim',
          args: [MOCK_TOKEN_ID],
        }),
      )
    })

    it('invalidates queries on success', async () => {
      const { result } = renderHook(() => useClaimNFT(MOCK_TOKEN_ID))

      await act(async () => {
        await result.current.claim()
      })

      await waitFor(() => {
        expect(result.current.step).toBe('success')
      })

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['nft57b'],
      })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['bonus-reward'],
      })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['recognition-token'],
      })
    })
  })

  describe('error handling', () => {
    it('transitions to error when writeContractAsync rejects', async () => {
      mockWriteContractAsync.mockRejectedValue(
        new Error('User rejected transaction'),
      )

      const { result } = renderHook(() => useClaimNFT(MOCK_TOKEN_ID))

      await act(async () => {
        await result.current.claim().catch(() => {})
      })

      await waitFor(() => {
        expect(result.current.step).toBe('error')
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toContain('User rejected transaction')
    })

    it('transitions to error when transaction receipt fails', async () => {
      setupMocks({
        wtfrIsSuccess: false,
        wtfrError: new Error('Transaction reverted'),
      })

      const { result } = renderHook(() => useClaimNFT(MOCK_TOKEN_ID))

      await act(async () => {
        await result.current.claim()
      })

      await waitFor(() => {
        expect(result.current.step).toBe('error')
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toContain('Transaction reverted')
    })
  })

  describe('double-submit guard', () => {
    it('prevents concurrent claim calls', async () => {
      setupMocks({ wtfrIsSuccess: false })

      const { result } = renderHook(() => useClaimNFT(MOCK_TOKEN_ID))

      // First claim — slow
      mockWriteContractAsync.mockImplementation(
        () => new Promise<`0x${string}`>(() => {}),
      )

      act(() => {
        result.current.claim().catch(() => {})
      })

      await waitFor(() => {
        expect(result.current.step).toBe('confirming')
      })

      // Second claim while first is in flight
      await expect(result.current.claim()).rejects.toThrow('Claim already in progress')

      expect(mockWriteContractAsync).toHaveBeenCalledTimes(1)
    })
  })

  describe('reset', () => {
    it('resets to idle state after success', async () => {
      const { result } = renderHook(() => useClaimNFT(MOCK_TOKEN_ID))

      await act(async () => {
        await result.current.claim()
      })

      await waitFor(() => {
        expect(result.current.step).toBe('success')
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.step).toBe('idle')
      expect(result.current.error).toBeNull()
      expect(result.current.txHash).toBeUndefined()
    })

    it('resets to idle state after error', async () => {
      mockWriteContractAsync.mockRejectedValue(new Error('Failed'))

      const { result } = renderHook(() => useClaimNFT(MOCK_TOKEN_ID))

      await act(async () => {
        await result.current.claim().catch(() => {})
      })

      await waitFor(() => {
        expect(result.current.step).toBe('error')
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.step).toBe('idle')
      expect(result.current.error).toBeNull()
    })
  })
})
