import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockUseAccount = vi.hoisted(() => vi.fn())
const mockUseReadContract = vi.hoisted(() => vi.fn())
const mockUseCompanyId = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
  useReadContract: mockUseReadContract,
}))

vi.mock('../useCompanyId', () => ({
  useCompanyId: mockUseCompanyId,
}))

const { useMintCompanyId } = await import('../useMintCompanyId')

const MOCK_ADDRESS = '0xMinter' as `0x${string}`

function mockReadContractSequence(
  seq: Array<{ data: unknown; isFetching: boolean; error?: Error | null }>,
) {
  let callCount = 0
  mockUseReadContract.mockImplementation(() => {
    const idx = callCount % seq.length
    callCount++
    return seq[idx]
  })
}

describe('useMintCompanyId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: MOCK_ADDRESS })
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isFetching: false,
      error: null,
    })
  })

  it('returns admin companyId from useCompanyId without employee lookup', async () => {
    mockUseCompanyId.mockReturnValue({
      companyId: 5n,
      isLoading: false,
      error: null,
    })

    const { result } = renderHook(() => useMintCompanyId())

    expect(result.current.companyId).toBe(5n)
    expect(result.current.error).toBeNull()
    expect(
      mockUseReadContract.mock.calls.some(
        ([args]) => args.query?.enabled === true,
      ),
    ).toBe(false)
  })

  it('falls back to getEmployeeCompany for minter employees', async () => {
    mockUseCompanyId.mockReturnValue({
      companyId: null,
      isLoading: false,
      error: null,
    })
    mockReadContractSequence([
      { data: 3n, isFetching: false },
      { data: true, isFetching: false },
    ])

    const { result } = renderHook(() => useMintCompanyId())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.companyId).toBe(3n)
    expect(result.current.error).toBeNull()
  })

  it('accepts company ID 0 when employee is registered to the first company', async () => {
    mockUseCompanyId.mockReturnValue({
      companyId: null,
      isLoading: false,
      error: null,
    })
    mockReadContractSequence([
      { data: 0n, isFetching: false },
      { data: true, isFetching: false },
    ])

    const { result } = renderHook(() => useMintCompanyId())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.companyId).toBe(0n)
    expect(result.current.error).toBeNull()
  })

  it('returns resolution error when wallet has no company', async () => {
    mockUseCompanyId.mockReturnValue({
      companyId: null,
      isLoading: false,
      error: null,
    })
    mockReadContractSequence([
      { data: 0n, isFetching: false },
      { data: false, isFetching: false },
    ])

    const { result } = renderHook(() => useMintCompanyId())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.companyId).toBeNull()
    expect(result.current.error?.message).toMatch(/unable to find a company/i)
  })

  it('propagates admin lookup errors', () => {
    mockUseCompanyId.mockReturnValue({
      companyId: null,
      isLoading: false,
      error: new Error('RPC failed'),
    })

    const { result } = renderHook(() => useMintCompanyId())

    expect(result.current.error?.message).toBe('RPC failed')
    expect(
      mockUseReadContract.mock.calls.some(
        ([args]) => args.query?.enabled === true,
      ),
    ).toBe(false)
  })
})
