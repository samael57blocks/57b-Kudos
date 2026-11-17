import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCompanyId } from '../useCompanyId'

const mockGetLogs = vi.hoisted(() => vi.fn())
const mockReadContract = vi.hoisted(() => vi.fn())
const mockUsePublicClient = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  usePublicClient: mockUsePublicClient,
}))

const MOCK_ADMIN = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

describe('useCompanyId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePublicClient.mockReturnValue({
      getLogs: mockGetLogs,
      readContract: mockReadContract,
    })
  })

  it('returns companyId when wallet is admin of a company', async () => {
    mockGetLogs.mockResolvedValue([
      {
        args: {
          companyId: 1n,
          name: 'Test Corp',
          admin: MOCK_ADMIN,
        },
      },
    ])

    const { result } = renderHook(() => useCompanyId(MOCK_ADMIN as `0x${string}`))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.companyId).toBe(1n)
    expect(result.current.error).toBeNull()
  })

  it('returns null when wallet is not an admin or employee', async () => {
    mockGetLogs.mockResolvedValue([])
    // getEmployeeCompany returns 0 (unregistered), isEmployee returns false
    mockReadContract
      .mockResolvedValueOnce(0n) // getEmployeeCompany
      .mockResolvedValueOnce(false) // isEmployee

    const { result } = renderHook(() => useCompanyId(MOCK_ADMIN as `0x${string}`))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.companyId).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('returns companyId when wallet is an employee (minter flow)', async () => {
    mockGetLogs.mockResolvedValue([]) // No admin events
    // getEmployeeCompany returns 2, isEmployee returns true
    mockReadContract
      .mockResolvedValueOnce(2n) // getEmployeeCompany
      .mockResolvedValueOnce(true) // isEmployee

    const { result } = renderHook(() => useCompanyId(MOCK_ADMIN as `0x${string}`))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.companyId).toBe(2n)
    expect(result.current.error).toBeNull()
  })

  it('returns null when address is undefined', () => {
    const { result } = renderHook(() => useCompanyId(undefined))

    expect(result.current.companyId).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('returns error on RPC failure', async () => {
    mockGetLogs.mockRejectedValue(new Error('RPC error'))

    const { result } = renderHook(() => useCompanyId(MOCK_ADMIN as `0x${string}`))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.companyId).toBeNull()
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toContain('RPC error')
  })

  it('handles multiple companies by returning the first', async () => {
    mockGetLogs.mockResolvedValue([
      {
        args: {
          companyId: 1n,
          name: 'First Corp',
          admin: MOCK_ADMIN,
        },
      },
      {
        args: {
          companyId: 2n,
          name: 'Second Corp',
          admin: MOCK_ADMIN,
        },
      },
    ])

    const { result } = renderHook(() => useCompanyId(MOCK_ADMIN as `0x${string}`))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.companyId).toBe(1n)
  })
})
