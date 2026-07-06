import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockUseAccount = vi.hoisted(() => vi.fn())
const mockUseReadContract = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
  useReadContract: mockUseReadContract,
}))

const { useUserRole } = await import('../useUserRole')

// Helper: create a sequence of useReadContract return values that repeats
// for React 19's double component body invocation.
function mockReadContractSequence(seq: Array<{ data: unknown; isFetching: boolean }>) {
  let callCount = 0
  mockUseReadContract.mockImplementation(() => {
    const idx = callCount % seq.length
    callCount++
    return seq[idx]
  })
}

describe('useUserRole — companyAdmin promotion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAccount.mockReturnValue({
      address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`,
    })
  })

  it('returns company_admin when companyAdmin=true and role is visitor', async () => {
    // Defaults: no admin role, no employee
    mockReadContractSequence([
      { data: undefined as `0x${string}` | undefined, isFetching: false }, // DEFAULT_ADMIN_ROLE
      { data: false, isFetching: false }, // hasRole
      { data: undefined, isFetching: false }, // getEmployeeCompany
    ])
    const { result } = renderHook(() => useUserRole({ companyAdmin: true }))

    await waitFor(() => {
      expect(result.current.role).toBe('company_admin')
    })
  })

  it('returns admin when companyAdmin=true but user already has admin role', async () => {
    mockReadContractSequence([
      { data: '0x00' as `0x${string}`, isFetching: false }, // DEFAULT_ADMIN_ROLE
      { data: true, isFetching: false }, // hasRole = admin
      { data: undefined, isFetching: false }, // getEmployeeCompany
    ])
    const { result } = renderHook(() => useUserRole({ companyAdmin: true }))

    await waitFor(() => {
      expect(result.current.role).toBe('admin')
    })
  })

  it('returns employee when companyAdmin=true but user is an employee', async () => {
    mockReadContractSequence([
      { data: undefined as `0x${string}` | undefined, isFetching: false }, // DEFAULT_ADMIN_ROLE
      { data: false, isFetching: false }, // hasRole
      { data: 5n, isFetching: false }, // getEmployeeCompany = 5
    ])
    const { result } = renderHook(() => useUserRole({ companyAdmin: true }))

    await waitFor(() => {
      expect(result.current.role).toBe('employee')
    })
  })

  it('returns normal role when companyAdmin is false', async () => {
    mockReadContractSequence([
      { data: undefined as `0x${string}` | undefined, isFetching: false },
      { data: false, isFetching: false },
      { data: undefined, isFetching: false },
    ])
    const { result } = renderHook(() => useUserRole({ companyAdmin: false }))

    await waitFor(() => {
      expect(result.current.role).toBe('visitor')
    })
  })

  it('returns normal role when companyAdmin is not provided', async () => {
    mockReadContractSequence([
      { data: undefined as `0x${string}` | undefined, isFetching: false },
      { data: false, isFetching: false },
      { data: undefined, isFetching: false },
    ])
    const { result } = renderHook(() => useUserRole())

    await waitFor(() => {
      expect(result.current.role).toBe('visitor')
    })
  })
})
