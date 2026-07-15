import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmployeeList } from '../EmployeeList'

// --- Hoisted mocks ---

const mockRefresh = vi.hoisted(() => vi.fn())
const mockUseCompanyEmployees = vi.hoisted(() => vi.fn())
const mockUseMinterRole = vi.hoisted(() => vi.fn())
const mockUseRegisterEmployee = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useCompanyEmployees', () => ({
  useCompanyEmployees: mockUseCompanyEmployees,
}))

vi.mock('../../hooks/useMinterRole', () => ({
  useMinterRole: mockUseMinterRole,
}))

vi.mock('../../hooks/useRegisterEmployee', () => ({
  useRegisterEmployee: mockUseRegisterEmployee,
}))

// --- Fixtures ---

const COMPANY_ID = 42n

const MOCK_EMPLOYEES = [
  {
    employee: '0x1111111111111111111111111111111111111111' as `0x${string}`,
    date: '2024-01-10',
  },
  {
    employee: '0x2222222222222222222222222222222222222222' as `0x${string}`,
    date: '2024-02-15',
  },
]

// --- Helpers ---

function setupEmployeeState(overrides: Record<string, unknown> = {}) {
  const defaults = {
    employees: MOCK_EMPLOYEES,
    isLoading: false,
    error: null,
    refresh: mockRefresh,
  }
  mockUseCompanyEmployees.mockReturnValue({ ...defaults, ...overrides })
}

function setupMinterRoleState(overrides: Record<string, unknown> = {}) {
  const defaults = {
    isMinter: false,
    isLoading: false,
    grantMinter: vi.fn().mockResolvedValue(undefined),
    revokeMinter: vi.fn().mockResolvedValue(undefined),
    error: null,
  }
  mockUseMinterRole.mockReturnValue({ ...defaults, ...overrides })
}

function renderList(showMinterToggle = false) {
  return render(<EmployeeList companyId={COMPANY_ID} showMinterToggle={showMinterToggle} />)
}

// --- Tests ---

describe('EmployeeList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupEmployeeState()
    setupMinterRoleState()
    mockUseRegisterEmployee.mockReturnValue({
      registerEmployee: vi.fn().mockResolvedValue('0xTxHash' as `0x${string}`),
      step: 'idle',
      isConfirming: false,
      txHash: undefined,
      error: null,
      reset: vi.fn(),
    })
  })

  it('renders column headers', () => {
    renderList()

    expect(screen.getByText('Employee Address')).toBeInTheDocument()
    expect(screen.getByText('Registration Date')).toBeInTheDocument()
  })

  it('shows loading skeleton rows when isLoading is true', () => {
    setupEmployeeState({ isLoading: true, employees: [] })
    renderList()

    const skeletonRows = screen.getAllByTestId('skeleton-row')
    expect(skeletonRows).toHaveLength(3)

    expect(screen.queryByText('No employees registered')).not.toBeInTheDocument()
  })

  it('shows empty state when no employees', () => {
    setupEmployeeState({ employees: [] })
    renderList()

    expect(screen.getByText('No employees registered')).toBeInTheDocument()
  })

  it('renders employee data rows with truncated addresses', () => {
    renderList()

    expect(screen.getByText('0x1111...1111')).toBeInTheDocument()
    expect(screen.getByText('0x2222...2222')).toBeInTheDocument()

    expect(screen.getByText('2024-01-10')).toBeInTheDocument()
    expect(screen.getByText('2024-02-15')).toBeInTheDocument()
  })

  it('calls refresh when refresh button is clicked', () => {
    renderList()

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  // ── Minter Role column (admin-only) ─────────────────────────────────────────

  it('does not render Minter Role column when showMinterToggle is false', () => {
    renderList(false)

    expect(screen.queryByText('Minter Role')).not.toBeInTheDocument()
  })

  it('renders Minter Role column header when showMinterToggle is true', () => {
    renderList(true)

    expect(screen.getByText('Minter Role')).toBeInTheDocument()
  })

  it('shows Grant button for non-minter employee', () => {
    setupMinterRoleState({ isMinter: false })
    renderList(true)

    // Both employees show "Grant" — verify at least one is rendered
    const grantButtons = screen.getAllByRole('button', { name: /grant minter role to/i })
    expect(grantButtons.length).toBeGreaterThanOrEqual(1)
    expect(grantButtons[0]).toHaveTextContent('Grant')
  })

  it('shows Minter status for minter employee', () => {
    setupMinterRoleState({ isMinter: true })
    renderList(true)

    // Both employees show "Minter" — verify at least one is rendered
    const minterButtons = screen.getAllByRole('button', { name: /revoke minter role from/i })
    expect(minterButtons.length).toBeGreaterThanOrEqual(1)
    expect(minterButtons[0]).toHaveTextContent('Minter')
  })

  it('calls grantMinter when Grant is clicked', () => {
    const grantMinter = vi.fn().mockResolvedValue(undefined)
    setupMinterRoleState({ isMinter: false, grantMinter })
    renderList(true)

    // Click the first Grant button
    const grantButtons = screen.getAllByRole('button', { name: /grant minter role to/i })
    fireEvent.click(grantButtons[0])

    expect(grantMinter).toHaveBeenCalledTimes(1)
  })

  it('calls revokeMinter when Revoke is clicked', () => {
    const revokeMinter = vi.fn().mockResolvedValue(undefined)
    setupMinterRoleState({ isMinter: true, revokeMinter })
    renderList(true)

    // Click the first Revoke button
    const revokeButtons = screen.getAllByRole('button', { name: /revoke minter role from/i })
    fireEvent.click(revokeButtons[0])

    expect(revokeMinter).toHaveBeenCalledTimes(1)
  })
})
