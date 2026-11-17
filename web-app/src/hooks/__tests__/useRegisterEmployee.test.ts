import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useRegisterEmployee } from '../useRegisterEmployee'

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
const COMPANY_ID = 42n
const EMPLOYEE_ADDRESS = '0xEmployee' as `0x${string}`
const EMPLOYEE_NAME = 'Alice'

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

describe('useRegisterEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  describe('initial state', () => {
    it('starts in idle step with no error', () => {
      const { result } = renderHook(() => useRegisterEmployee())

      expect(result.current.step).toBe('idle')
      expect(result.current.isConfirming).toBe(false)
      expect(result.current.txHash).toBeUndefined()
      expect(result.current.error).toBeNull()
    })
  })

  describe('register flow — success', () => {
    it('transitions idle → success on happy path', async () => {
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

      const { result } = renderHook(() => useRegisterEmployee())

      expect(result.current.step).toBe('idle')

      let hash: `0x${string}` | undefined
      act(() => {
        result.current
          .registerEmployee(EMPLOYEE_ADDRESS, COMPANY_ID, EMPLOYEE_NAME)
          .then((h) => {
            hash = h
          })
      })

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
      const { result } = renderHook(() => useRegisterEmployee())

      act(() => {
        result.current.registerEmployee(
          EMPLOYEE_ADDRESS,
          COMPANY_ID,
          EMPLOYEE_NAME,
        )
      })

      await waitFor(() => {
        expect(result.current.step).not.toBe('idle')
      })

      expect(mockWriteContractAsync).toHaveBeenCalledWith({
        address: '0xRegistry',
        abi: expect.any(Array),
        functionName: 'registerEmployee',
        args: [EMPLOYEE_ADDRESS, COMPANY_ID, EMPLOYEE_NAME],
        gas: 350_000n,
      })
    })
  })

  describe('error handling', () => {
    it('transitions to error when writeContractAsync fails (wallet reject)', async () => {
      mockWriteContractAsync.mockRejectedValue(
        new Error('User rejected transaction'),
      )

      const { result } = renderHook(() => useRegisterEmployee())

      act(() => {
        result.current
          .registerEmployee(EMPLOYEE_ADDRESS, COMPANY_ID, EMPLOYEE_NAME)
          .catch(() => {
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
      mockUseWriteContract.mockReturnValue({
        writeContractAsync: mockWriteContractAsync,
        data: MOCK_HASH,
        isPending: false,
        error: null,
      })
      mockUseWaitForTransactionReceipt.mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: new Error('Transaction reverted'),
      })

      const { result } = renderHook(() => useRegisterEmployee())

      act(() => {
        result.current
          .registerEmployee(EMPLOYEE_ADDRESS, COMPANY_ID, EMPLOYEE_NAME)
          .catch(() => {
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
    it('throws when registerEmployee is called while already confirming', async () => {
      mockWriteContractAsync.mockImplementation(
        () => new Promise(() => {}),
      )

      const { result } = renderHook(() => useRegisterEmployee())

      act(() => {
        result.current.registerEmployee(
          EMPLOYEE_ADDRESS,
          COMPANY_ID,
          EMPLOYEE_NAME,
        )
      })

      await waitFor(() => {
        expect(result.current.step).toBe('confirming')
      })

      await act(async () => {
        await expect(
          result.current.registerEmployee(
            EMPLOYEE_ADDRESS,
            COMPANY_ID,
            EMPLOYEE_NAME,
          ),
        ).rejects.toThrow('already in progress')
      })
    })
  })

  describe('reset', () => {
    it('resets to idle state', async () => {
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

      const { result } = renderHook(() => useRegisterEmployee())

      act(() => {
        result.current.registerEmployee(
          EMPLOYEE_ADDRESS,
          COMPANY_ID,
          EMPLOYEE_NAME,
        )
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
