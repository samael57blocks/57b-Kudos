import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useRegisterCompany } from '../useRegisterCompany'

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

vi.mock('wagmi', () => ({
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

const MOCK_HASH = '0xTxHash' as `0x${string}`
const COMPANY_NAME = 'Acme Corp'
const ADMIN_WALLET =
  '0x1111111111111111111111111111111111111111' as `0x${string}`

// --- Setup ---

function setupMocks(options?: {
  wcData?: `0x${string}`
  wcError?: Error | null
  wtfrIsLoading?: boolean
  wtfrIsSuccess?: boolean
  wtfrError?: Error | null
}) {
  const {
    wcData,
    wcError = null,
    wtfrIsLoading = false,
    wtfrIsSuccess = false,
    wtfrError = null,
  } = options ?? {}

  mockUseWriteContract.mockReturnValue({
    writeContractAsync: mockWriteContractAsync,
    data: wcData,
    isPending: false,
    error: wcError,
  })
  mockUseWaitForTransactionReceipt.mockReturnValue({
    isLoading: wtfrIsLoading,
    isSuccess: wtfrIsSuccess,
    error: wtfrError,
  })
  mockWriteContractAsync.mockResolvedValue(MOCK_HASH)
}

describe('useRegisterCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  describe('initial state', () => {
    it('starts in idle step with no error', () => {
      const { result } = renderHook(() => useRegisterCompany())

      expect(result.current.step).toBe('idle')
      expect(result.current.isConfirming).toBe(false)
      expect(result.current.txHash).toBeUndefined()
      expect(result.current.error).toBeNull()
    })
  })

  describe('register flow — success', () => {
    it('transitions idle → success on happy path', async () => {
      // Override: first call (initial) gets isSuccess=false,
      // then after txHash update, receipt mock returns isSuccess=true
      mockUseWaitForTransactionReceipt
        .mockReturnValueOnce({
          isLoading: false,
          isSuccess: false,
          error: null,
        })
        .mockReturnValueOnce({
          isLoading: false,
          isSuccess: true,
          error: null,
        })

      const { result } = renderHook(() => useRegisterCompany())

      expect(result.current.step).toBe('idle')

      let hash: `0x${string}` | undefined
      act(() => {
        result.current.registerCompany(COMPANY_NAME, ADMIN_WALLET).then((h) => {
          hash = h
        })
      })

      // The transition happens too fast to catch 'confirming' —
      // mock resolved synchronously. We confirm it left idle.
      await waitFor(() => {
        expect(result.current.step).not.toBe('idle')
      })

      await waitFor(() => {
        expect(result.current.step).toBe('success')
      })

      expect(hash).toBe(MOCK_HASH)
      expect(result.current.error).toBeNull()
      expect(result.current.txHash).toBe(MOCK_HASH)
    })

    it('calls writeContractAsync with correct args', async () => {
      const { result } = renderHook(() => useRegisterCompany())

      act(() => {
        result.current.registerCompany(COMPANY_NAME, ADMIN_WALLET)
      })

      await waitFor(() => {
        expect(result.current.step).not.toBe('idle')
      })

      expect(mockWriteContractAsync).toHaveBeenCalledWith({
        address: '0xRegistry',
        abi: expect.any(Array),
        functionName: 'registerCompany',
        args: [COMPANY_NAME, ADMIN_WALLET],
        gas: 500_000n,
      })
    })
  })

  describe('error handling', () => {
    it('transitions to error when writeContractAsync fails (wallet reject)', async () => {
      mockWriteContractAsync.mockRejectedValue(
        new Error('User rejected transaction'),
      )

      const { result } = renderHook(() => useRegisterCompany())

      act(() => {
        result.current.registerCompany(COMPANY_NAME, ADMIN_WALLET).catch(() => {
          /* expected */
        })
      })

      await waitFor(() => {
        expect(result.current.step).toBe('error')
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toContain(
        'User rejected transaction',
      )
    })

    it('transitions to error when receipt confirmation fails', async () => {
      // First call — write succeeds
      mockUseWriteContract.mockReturnValue({
        writeContractAsync: mockWriteContractAsync,
        data: MOCK_HASH,
        isPending: false,
        error: null,
      })
      // Second call — receipt fails
      mockUseWaitForTransactionReceipt.mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: new Error('Transaction reverted'),
      })

      const { result } = renderHook(() => useRegisterCompany())

      act(() => {
        result.current.registerCompany(COMPANY_NAME, ADMIN_WALLET).catch(() => {
          /* expected */
        })
      })

      await waitFor(() => {
        expect(result.current.step).toBe('error')
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toContain('Transaction reverted')
    })
  })

  describe('double-submit guard', () => {
    it('throws when registerCompany is called while already confirming', async () => {
      // Keep writeContractAsync pending so we stay in confirming
      mockWriteContractAsync.mockImplementation(
        () => new Promise(() => {}),
      )

      const { result } = renderHook(() => useRegisterCompany())

      // First call — keep pending
      act(() => {
        result.current.registerCompany(COMPANY_NAME, ADMIN_WALLET)
      })

      await waitFor(() => {
        expect(result.current.step).toBe('confirming')
      })

      // Second call — should reject immediately via ref guard
      await act(async () => {
        await expect(
          result.current.registerCompany(COMPANY_NAME, ADMIN_WALLET),
        ).rejects.toThrow('already in progress')
      })
    })
  })

  describe('reset', () => {
    it('resets to idle state', async () => {
      // Simulate a completed flow
      mockUseWaitForTransactionReceipt
        .mockReturnValueOnce({
          isLoading: false,
          isSuccess: false,
          error: null,
        })
        .mockReturnValueOnce({
          isLoading: false,
          isSuccess: true,
          error: null,
        })

      const { result } = renderHook(() => useRegisterCompany())

      act(() => {
        result.current.registerCompany(COMPANY_NAME, ADMIN_WALLET)
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
  })
})
