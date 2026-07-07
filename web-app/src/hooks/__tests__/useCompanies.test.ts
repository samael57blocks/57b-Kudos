import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCompanies } from '../useCompanies'

// --- Hoisted mocks ---

const mockGetLogs = vi.hoisted(() => vi.fn())
const mockReadContract = vi.hoisted(() => vi.fn())
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

const COMPANY_A_LOG = {
  args: {
    companyId: 1n,
    name: 'Acme Corp',
    admin: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  },
}

const COMPANY_B_LOG = {
  args: {
    companyId: 2n,
    name: 'Globex Inc',
    admin: '0x2222222222222222222222222222222222222222' as `0x${string}`,
  },
}

const COMPANY_A_DATA = {
  id: 1n,
  name: 'Acme Corp',
  admin: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  createdAt: 1000n,
}

const COMPANY_B_DATA = {
  id: 2n,
  name: 'Globex Inc',
  admin: '0x2222222222222222222222222222222222222222' as `0x${string}`,
  createdAt: 2000n,
}

// --- Setup ---

function setupClient() {
  mockUsePublicClient.mockReturnValue({
    getLogs: mockGetLogs,
    readContract: mockReadContract,
  })
}

describe('useCompanies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupClient()
  })

  describe('initial state', () => {
    it('starts loading immediately with empty companies', async () => {
      // Keep getLogs pending so we can observe the loading state
      mockGetLogs.mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => useCompanies())

      expect(result.current.companies).toEqual([])
      expect(result.current.isLoading).toBe(true)
      expect(result.current.error).toBeNull()
    })
  })

  describe('fetch flow — success', () => {
    it('fetches companies from events and enriches with getCompany', async () => {
      mockGetLogs.mockImplementation(async () => [COMPANY_A_LOG, COMPANY_B_LOG])
      mockReadContract.mockImplementation(async ({ args }) => {
        if (args[0] === 1n) return COMPANY_A_DATA
        return COMPANY_B_DATA
      })

      const { result } = renderHook(() => useCompanies())

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.companies).toHaveLength(2)
      expect(result.current.error).toBeNull()
      expect(result.current.companies[0]).toMatchObject({
        id: 1n,
        name: 'Acme Corp',
        admin: '0x1111111111111111111111111111111111111111',
        createdAt: 1000n,
      })
      expect(result.current.companies[1].name).toBe('Globex Inc')
    })

    it('returns empty array when no CompanyRegistered events', async () => {
      mockGetLogs.mockImplementation(async () => [])

      const { result } = renderHook(() => useCompanies())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.companies).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('deduplicates companies when same companyId appears in multiple events', async () => {
      mockGetLogs.mockImplementation(async () => [
        COMPANY_A_LOG,
        COMPANY_A_LOG, // duplicate
        COMPANY_B_LOG,
      ])
      mockReadContract.mockImplementation(async ({ args }) => {
        if (args[0] === 1n) return COMPANY_A_DATA
        return COMPANY_B_DATA
      })

      const { result } = renderHook(() => useCompanies())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.companies).toHaveLength(2)
      expect(mockReadContract).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    it('sets error when getLogs fails', async () => {
      mockGetLogs.mockImplementation(async () => {
        throw new Error('RPC error')
      })

      const { result } = renderHook(() => useCompanies())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.companies).toEqual([])
      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toContain('RPC error')
    })

    it('sets error when getCompany fails', async () => {
      mockGetLogs.mockImplementation(async () => [COMPANY_A_LOG, COMPANY_B_LOG])
      mockReadContract.mockImplementation(async () => {
        throw new Error('Contract read failed')
      })

      const { result } = renderHook(() => useCompanies())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.companies).toEqual([])
      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toContain('Contract read failed')
    })
  })

  describe('refresh', () => {
    it('manual refresh re-fetches and updates companies', async () => {
      // Initial fetch returns empty
      mockGetLogs.mockImplementation(async () => [])
      mockReadContract.mockImplementation(async () => COMPANY_A_DATA)

      const { result } = renderHook(() => useCompanies())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.companies).toEqual([])

      // Second fetch returns data
      mockGetLogs.mockImplementation(async () => [COMPANY_A_LOG])

      await act(async () => {
        result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.companies).toHaveLength(1)
      })

      expect(result.current.companies[0].name).toBe('Acme Corp')
    })
  })
})
