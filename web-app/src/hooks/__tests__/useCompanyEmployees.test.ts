import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCompanyEmployees } from '../useCompanyEmployees'

// --- Hoisted mocks ---

const mockGetLogs = vi.hoisted(() => vi.fn())
const mockGetBlock = vi.hoisted(() => vi.fn())
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
      companyId: 42n,
      employee: '0x1111111111111111111111111111111111111111' as `0x${string}`,
      name: 'Alice',
    },
    blockNumber: 100n,
  },
  {
    args: {
      companyId: 42n,
      employee: '0x2222222222222222222222222222222222222222' as `0x${string}`,
      name: 'Bob',
    },
    blockNumber: 200n,
  },
]

describe('useCompanyEmployees', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePublicClient.mockReturnValue({
      getLogs: mockGetLogs,
      getBlock: mockGetBlock,
    })
    mockGetBlock.mockResolvedValue({ timestamp: 1_700_000_000n })
  })

  it('returns employees from EmployeeRegistered events filtered by companyId', async () => {
    mockGetLogs.mockImplementation(async () => MOCK_EVENTS)

    const { result } = renderHook(() => useCompanyEmployees(42n))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.employees).toHaveLength(2)
    expect(result.current.employees[0]).toMatchObject({
      employee: '0x1111111111111111111111111111111111111111',
      name: 'Alice',
    })
    expect(result.current.employees[1]).toMatchObject({
      employee: '0x2222222222222222222222222222222222222222',
      name: 'Bob',
    })
  })

  it('fetches employees when companyId is 0n (first company)', async () => {
    mockGetLogs.mockImplementation(async () => MOCK_EVENTS)

    const { result } = renderHook(() => useCompanyEmployees(0n))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.employees).toHaveLength(2)
  })

  it('returns empty array when companyId is null', async () => {
    const { result } = renderHook(() => useCompanyEmployees(null))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.employees).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('sets loading during fetch, then resolves to empty when no events', async () => {
    mockGetLogs.mockImplementation(async () => [])

    const { result } = renderHook(() => useCompanyEmployees(42n))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.employees).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('catches errors and returns error state', async () => {
    mockGetLogs.mockImplementation(async () => {
      throw new Error('RPC error')
    })

    const { result } = renderHook(() => useCompanyEmployees(42n))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.employees).toEqual([])
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toContain('RPC error')
  })

  it('manual refresh re-fetches events and updates employees', async () => {
    mockGetLogs.mockImplementation(async () => [])

    const { result } = renderHook(() => useCompanyEmployees(42n))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.employees).toEqual([])

    mockGetLogs.mockImplementation(async () => MOCK_EVENTS)

    await act(async () => {
      result.current.refresh()
    })

    await waitFor(() => {
      expect(result.current.employees).toHaveLength(2)
    })
  })

  it('parses name from EmployeeRegistered event logs', async () => {
    mockGetLogs.mockImplementation(async () => MOCK_EVENTS)

    const { result } = renderHook(() => useCompanyEmployees(42n))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.employees[0].name).toBe('Alice')
    expect(result.current.employees[1].name).toBe('Bob')
  })

  it('handles missing name gracefully (falls back to empty string)', async () => {
    const eventsWithoutName = [
      {
        args: {
          companyId: 42n,
          employee: '0x3333333333333333333333333333333333333333' as `0x${string}`,
        },
        blockNumber: 50n,
      },
    ]
    mockGetLogs.mockImplementation(async () => eventsWithoutName)

    const { result } = renderHook(() => useCompanyEmployees(42n))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.employees[0].name).toBe('')
  })

  it('fetches block timestamps for registration dates', async () => {
    mockGetLogs.mockImplementation(async () => MOCK_EVENTS)
    mockGetBlock.mockResolvedValue({ timestamp: 1_700_000_000n })

    const { result } = renderHook(() => useCompanyEmployees(42n))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetBlock).toHaveBeenCalledWith({ blockNumber: 100n })
    expect(mockGetBlock).toHaveBeenCalledWith({ blockNumber: 200n })
    expect(result.current.employees[0].registrationDate).toBe(
      new Date(1_700_000_000 * 1000).toLocaleDateString(),
    )
    expect(result.current.employees[1].registrationDate).toBe(
      new Date(1_700_000_000 * 1000).toLocaleDateString(),
    )
  })

  it('handles getBlock failure gracefully (falls back to "—")', async () => {
    mockGetLogs.mockImplementation(async () => MOCK_EVENTS)
    mockGetBlock.mockRejectedValue(new Error('Block not found'))

    const { result } = renderHook(() => useCompanyEmployees(42n))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.employees[0].registrationDate).toBe('—')
    expect(result.current.employees[1].registrationDate).toBe('—')
  })
})
