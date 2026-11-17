import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMintNFT } from '../useMintNFT'

// --- Hoisted mocks ---

const mockWriteContractAsync = vi.hoisted(() => vi.fn())
const mockUseWriteContract = vi.hoisted(() => vi.fn())
const mockUseWaitForTransactionReceipt = vi.hoisted(() => vi.fn())
const mockUsePublicClient = vi.hoisted(() => vi.fn())
const mockBuildMetadata = vi.hoisted(() => vi.fn())
const mockUploadMetadata = vi.hoisted(() => vi.fn())
const mockGetContractAddresses = vi.hoisted(() =>
  vi.fn(() => ({
    nft57b: '0xNFT' as `0x${string}`,
    companyRegistry: '0xRegistry' as `0x${string}`,
  })),
)

vi.mock('wagmi', () => ({
  usePublicClient: mockUsePublicClient,
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

vi.mock('../../utils/metadata', () => ({
  buildMetadata: mockBuildMetadata,
}))

vi.mock('../../utils/ipfs', () => ({
  uploadMetadata: mockUploadMetadata,
}))

// --- Fixtures ---

const MOCK_HASH = '0xTxHash' as `0x${string}`
const MOCK_ACHIEVEMENT = {
  employee: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  name: 'Employee of the Month',
  description: 'Awarded for outstanding performance',
  value: '1000',
  date: '2024-01-15',
  employeeName: 'John Doe',
}

const MOCK_METADATA = {
  name: 'Employee of the Month',
  description: 'Awarded for outstanding performance',
  image: '',
  attributes: [
    { trait_type: 'Value', value: '1000' },
    { trait_type: 'Date', value: '2024-01-15' },
    { trait_type: 'Employee', value: 'John Doe' },
  ],
}

// --- Setup ---

function setupMocks(options?: {
  wcData?: `0x${string}`
  wcError?: Error
  wtfrIsSuccess?: boolean
}) {
  const { wcData, wcError, wtfrIsSuccess = true } = options ?? {}

  mockUsePublicClient.mockReturnValue(undefined)
  mockUseWriteContract.mockReturnValue({
    writeContractAsync: mockWriteContractAsync,
    data: wcData,
    isPending: false,
    error: wcError ?? null,
  })
  mockUseWaitForTransactionReceipt.mockReturnValue({
    isLoading: false,
    isSuccess: wtfrIsSuccess,
    error: null,
  })
  mockBuildMetadata.mockReturnValue(MOCK_METADATA)
  mockUploadMetadata.mockResolvedValue('ipfs://QmUploaded')
  mockWriteContractAsync.mockResolvedValue(MOCK_HASH)
}

describe('useMintNFT', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  describe('initial state', () => {
    it('starts in idle step with no error', () => {
      const { result } = renderHook(() => useMintNFT(42n))

      expect(result.current.step).toBe('idle')
      expect(result.current.isConfirming).toBe(false)
      expect(result.current.txHash).toBeUndefined()
      expect(result.current.error).toBeNull()
    })
  })

  describe('mint flow — success', () => {
    it('transitions idle → uploading → confirming → success on happy path', async () => {
      const { result } = renderHook(() => useMintNFT(42n))

      expect(result.current.step).toBe('idle')

      let hash: `0x${string}` | undefined
      act(() => {
        result.current.mint(MOCK_ACHIEVEMENT).then((h) => {
          hash = h
        })
      })

      // Should reach 'uploading' or 'confirming' quickly
      await waitFor(() => {
        expect(result.current.step).not.toBe('idle')
      })

      // Eventually should be 'success'
      await waitFor(() => {
        expect(result.current.step).toBe('success')
      })

      expect(hash).toBe(MOCK_HASH)
      expect(result.current.error).toBeNull()
      expect(result.current.txHash).toBe(MOCK_HASH)
    })

    it('builds metadata and uploads to IPFS', async () => {
      const { result } = renderHook(() => useMintNFT(42n))

      act(() => {
        result.current.mint(MOCK_ACHIEVEMENT)
      })

      await waitFor(() => {
        expect(result.current.step).toBe('success')
      })

      expect(mockBuildMetadata).toHaveBeenCalledWith({
        name: MOCK_ACHIEVEMENT.name,
        description: MOCK_ACHIEVEMENT.description,
        value: MOCK_ACHIEVEMENT.value,
        date: MOCK_ACHIEVEMENT.date,
        employeeName: MOCK_ACHIEVEMENT.employeeName,
      })
      expect(mockUploadMetadata).toHaveBeenCalledWith(MOCK_METADATA)
      expect(mockWriteContractAsync).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('transitions to error when IPFS upload fails', async () => {
      mockUploadMetadata.mockRejectedValue(new Error('Pinata timeout'))

      const { result } = renderHook(() => useMintNFT(42n))

      act(() => {
        result.current.mint(MOCK_ACHIEVEMENT).catch(() => {
          /* expected */
        })
      })

      await waitFor(() => {
        expect(result.current.step).toBe('error')
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toContain('Pinata timeout')
    })

    it('transitions to error when writeContractAsync fails', async () => {
      mockWriteContractAsync.mockRejectedValue(
        new Error('User rejected transaction'),
      )

      const { result } = renderHook(() => useMintNFT(42n))

      act(() => {
        result.current.mint(MOCK_ACHIEVEMENT).catch(() => {
          /* expected */
        })
      })

      await waitFor(() => {
        expect(result.current.step).toBe('error')
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toContain('User rejected transaction')
    })
  })

  describe('functionName parameterization', () => {
    it('defaults to recognize when no contractFunction is provided', async () => {
      const { result } = renderHook(() => useMintNFT(42n))

      act(() => {
        result.current.mint(MOCK_ACHIEVEMENT)
      })

      await waitFor(() => {
        expect(result.current.step).toBe('success')
      })

      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'recognize' }),
      )
    })

    it('explicitly calls recognize when contractFunction is recognize', async () => {
      const { result } = renderHook(() =>
        useMintNFT(42n, 'recognize'),
      )

      act(() => {
        result.current.mint(MOCK_ACHIEVEMENT)
      })

      await waitFor(() => {
        expect(result.current.step).toBe('success')
      })

      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'recognize' }),
      )
    })

    it('calls mintKudos when contractFunction is mintKudos', async () => {
      const { result } = renderHook(() =>
        useMintNFT(42n, 'mintKudos'),
      )

      act(() => {
        result.current.mint(MOCK_ACHIEVEMENT)
      })

      await waitFor(() => {
        expect(result.current.step).toBe('success')
      })

      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'mintKudos' }),
      )
    })

    it('both paths receive identical args structure', async () => {
      // recognize path
      const { result: r1 } = renderHook(() => useMintNFT(42n, 'recognize'))
      act(() => { r1.current.mint(MOCK_ACHIEVEMENT) })
      await waitFor(() => { expect(r1.current.step).toBe('success') })

      const recognizeArgs = mockWriteContractAsync.mock.calls[0][0].args

      mockWriteContractAsync.mockClear()

      // mintKudos path
      const { result: r2 } = renderHook(() => useMintNFT(42n, 'mintKudos'))
      act(() => { r2.current.mint(MOCK_ACHIEVEMENT) })
      await waitFor(() => { expect(r2.current.step).toBe('success') })

      const mintKudosArgs = mockWriteContractAsync.mock.calls[0][0].args

      expect(recognizeArgs).toEqual([MOCK_ACHIEVEMENT.employee, 'ipfs://QmUploaded'])
      expect(mintKudosArgs).toEqual([MOCK_ACHIEVEMENT.employee, 'ipfs://QmUploaded'])
    })

    it('state machine works identically for both functions', async () => {
      for (const fn of ['recognize', 'mintKudos'] as const) {
        mockWriteContractAsync.mockClear()
        const { result } = renderHook(() => useMintNFT(42n, fn))

        expect(result.current.step).toBe('idle')

        act(() => { result.current.mint(MOCK_ACHIEVEMENT) })

        await waitFor(() => {
          expect(result.current.step).not.toBe('idle')
        })
        await waitFor(() => {
          expect(result.current.step).toBe('success')
        })

        expect(result.current.error).toBeNull()
        expect(result.current.txHash).toBe(MOCK_HASH)
      }
    })

    it('error handling is function-agnostic', async () => {
      mockWriteContractAsync.mockRejectedValue(new Error('Revert'))

      for (const fn of ['recognize', 'mintKudos'] as const) {
        mockWriteContractAsync.mockRejectedValue(new Error('Revert'))
        const { result } = renderHook(() => useMintNFT(42n, fn))

        act(() => {
          result.current.mint(MOCK_ACHIEVEMENT).catch(() => {})
        })

        await waitFor(() => {
          expect(result.current.step).toBe('error')
        })
        expect(result.current.error?.message).toContain('Revert')

        act(() => { result.current.reset() })
        expect(result.current.step).toBe('idle')
      }
    })

    it('double-submit guard works for both functions', async () => {
      for (const fn of ['recognize', 'mintKudos'] as const) {
        mockWriteContractAsync.mockClear()
        setupMocks({ wtfrIsSuccess: false })

        const { result } = renderHook(() => useMintNFT(42n, fn))

        // First mint — slow
        mockWriteContractAsync.mockImplementation(
          () => new Promise<`0x${string}`>(() => {}),
        )

        act(() => { result.current.mint(MOCK_ACHIEVEMENT) })

        await waitFor(() => {
          expect(result.current.step).toBe('confirming')
        })

        // Second mint while first is in flight
        await expect(
          result.current.mint(MOCK_ACHIEVEMENT),
        ).rejects.toThrow('Mint already in progress')

        expect(mockWriteContractAsync).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('reset', () => {
    it('resets to idle state after success', async () => {
      const { result } = renderHook(() => useMintNFT(42n))

      act(() => {
        result.current.mint(MOCK_ACHIEVEMENT)
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
      mockUploadMetadata.mockRejectedValue(new Error('Upload failed'))

      const { result } = renderHook(() => useMintNFT(42n))

      act(() => {
        result.current.mint(MOCK_ACHIEVEMENT).catch(() => {
          /* expected */
        })
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
