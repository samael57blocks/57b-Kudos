import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTokenMetadata } from '../useTokenMetadata'
import type { ReactNode } from 'react'

// --- Hoisted mocks ---

const mockResolveMetadata = vi.hoisted(() => vi.fn())

vi.mock('../../utils/ipfs', () => ({
  resolveMetadata: mockResolveMetadata,
}))

// --- Helpers ---

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const MOCK_METADATA = {
  name: 'Employee of the Month',
  description: 'Awarded for outstanding performance',
  value: '1000',
  date: '2024-01-15',
}

describe('useTokenMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns metadata when uri is provided', async () => {
    mockResolveMetadata.mockResolvedValue(MOCK_METADATA)

    const { result } = renderHook(() => useTokenMetadata('ipfs://QmTest'), {
      wrapper: createWrapper(),
    })

    // Initial state is loading
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(MOCK_METADATA)
    expect(result.current.error).toBeNull()
    expect(mockResolveMetadata).toHaveBeenCalledWith('ipfs://QmTest')
  })

  it('returns error state when resolveMetadata throws', async () => {
    mockResolveMetadata.mockRejectedValue(new Error('IPFS network error'))

    const { result } = renderHook(() => useTokenMetadata('ipfs://QmBad'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toContain('IPFS network error')
  })

  it('does not fetch when uri is undefined', () => {
    const { result } = renderHook(() => useTokenMetadata(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeNull()
    expect(mockResolveMetadata).not.toHaveBeenCalled()
  })
})
