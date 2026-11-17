import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { EmployeeList } from '../EmployeeList'

// --- Hoisted mocks ---

const mockRefresh = vi.hoisted(() => vi.fn())
const mockUseCompanyEmployees = vi.hoisted(() => vi.fn())
const mockUseMinterRole = vi.hoisted(() => vi.fn())
const mockUseUpdateEmployeeName = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useCompanyEmployees', () => ({
  useCompanyEmployees: mockUseCompanyEmployees,
}))

vi.mock('../../hooks/useMinterRole', () => ({
  useMinterRole: mockUseMinterRole,
}))

vi.mock('../../hooks/useUpdateEmployeeName', () => ({
  useUpdateEmployeeName: mockUseUpdateEmployeeName,
}))

vi.mock('../AddEmployeeDialog', () => ({
  AddEmployeeDialog: ({ open, onClose, onSuccess, companyId }: { open: boolean; onClose: () => void; onSuccess: () => void; companyId: bigint }) => {
    if (!open) return null
    return (
      <div data-testid="add-employee-dialog">
        <span data-testid="dialog-company-id">{companyId.toString()}</span>
        <button onClick={onClose}>Close Dialog</button>
        <button onClick={onSuccess}>Simulate Success</button>
      </div>
    )
  },
}))

// --- Fixtures ---

const COMPANY_ID = 42n

const MOCK_EMPLOYEES = [
  {
    employee: '0x1111111111111111111111111111111111111111' as `0x${string}`,
    name: 'Alice',
    registrationDate: '1/10/2024',
  },
  {
    employee: '0x2222222222222222222222222222222222222222' as `0x${string}`,
    name: '',
    registrationDate: '2/15/2024',
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

function setupUpdateEmployeeNameState(overrides: Record<string, unknown> = {}) {
  const defaults = {
    updateEmployeeName: vi.fn().mockResolvedValue('0xTxHash' as `0x${string}`),
    step: 'idle',
    isConfirming: false,
    txHash: undefined,
    error: null,
    reset: vi.fn(),
  }
  mockUseUpdateEmployeeName.mockReturnValue({ ...defaults, ...overrides })
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
    setupUpdateEmployeeNameState()
  })

  it('renders column headers including Name', () => {
    renderList()

    expect(screen.getByText('Employee Address')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
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

  it('renders employee data rows with truncated addresses and names', () => {
    renderList()

    expect(screen.getByText('0x1111...1111')).toBeInTheDocument()
    expect(screen.getByText('0x2222...2222')).toBeInTheDocument()

    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows "—" fallback for employees with empty name', () => {
    renderList()

    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
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

    const grantButtons = screen.getAllByRole('button', { name: /grant minter role to/i })
    expect(grantButtons.length).toBeGreaterThanOrEqual(1)
    expect(grantButtons[0]).toHaveTextContent('Grant')
  })

  it('shows Minter status for minter employee', () => {
    setupMinterRoleState({ isMinter: true })
    renderList(true)

    const minterButtons = screen.getAllByRole('button', { name: /revoke minter role from/i })
    expect(minterButtons.length).toBeGreaterThanOrEqual(1)
    expect(minterButtons[0]).toHaveTextContent('Minter')
  })

  it('calls grantMinter when Grant is clicked', () => {
    const grantMinter = vi.fn().mockResolvedValue(undefined)
    setupMinterRoleState({ isMinter: false, grantMinter })
    renderList(true)

    const grantButtons = screen.getAllByRole('button', { name: /grant minter role to/i })
    fireEvent.click(grantButtons[0])

    expect(grantMinter).toHaveBeenCalledTimes(1)
  })

  it('calls revokeMinter when Revoke is clicked', () => {
    const revokeMinter = vi.fn().mockResolvedValue(undefined)
    setupMinterRoleState({ isMinter: true, revokeMinter })
    renderList(true)

    const revokeButtons = screen.getAllByRole('button', { name: /revoke minter role from/i })
    fireEvent.click(revokeButtons[0])

    expect(revokeMinter).toHaveBeenCalledTimes(1)
  })

  // ── Add Employee dialog ────────────────────────────────────────────────────

  it('shows Add Employee button only when showMinterToggle is true', () => {
    renderList(false)
    expect(screen.queryByText('Add Employee')).not.toBeInTheDocument()

    renderList(true)
    expect(screen.getByText('Add Employee')).toBeInTheDocument()
  })

  it('opens the AddEmployeeDialog when Add Employee is clicked', () => {
    renderList(true)

    fireEvent.click(screen.getByText('Add Employee'))
    expect(screen.getByTestId('add-employee-dialog')).toBeInTheDocument()
  })

  it('passes correct companyId to dialog', () => {
    renderList(true)

    fireEvent.click(screen.getByText('Add Employee'))
    expect(screen.getByTestId('dialog-company-id')).toHaveTextContent('42')
  })

  it('calls refresh when dialog signals success', () => {
    renderList(true)

    fireEvent.click(screen.getByText('Add Employee'))
    fireEvent.click(screen.getByText('Simulate Success'))

    expect(mockRefresh).toHaveBeenCalled()
  })

  it('closes dialog when dialog signals close', () => {
    renderList(true)

    fireEvent.click(screen.getByText('Add Employee'))
    expect(screen.getByTestId('add-employee-dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Close Dialog'))
    expect(screen.queryByTestId('add-employee-dialog')).not.toBeInTheDocument()
  })

  // ── Inline name edit ───────────────────────────────────────────────────────

  it('does not enter edit mode on name click when showMinterToggle is false', () => {
    renderList(false)

    fireEvent.click(screen.getByText('Alice'))
    expect(screen.queryByRole('textbox', { name: /employee name/i })).not.toBeInTheDocument()
  })

  it('clicking name in admin mode enters edit mode', async () => {
    renderList(true)

    const nameSpan = screen.getByText('Alice')
    fireEvent.click(nameSpan)

    const input = screen.getByRole('textbox', { name: /employee name/i })
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('Alice')
  })

  it('saves name via useUpdateEmployeeName on Enter', async () => {
    const updateEmployeeName = vi.fn().mockResolvedValue('0xTxHash' as `0x${string}`)
    setupUpdateEmployeeNameState({ updateEmployeeName })
    renderList(true)

    fireEvent.click(screen.getByText('Alice'))
    const input = screen.getByRole('textbox', { name: /employee name/i })

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Alice Updated' } })
      fireEvent.keyDown(input, { key: 'Enter' })
    })

    expect(updateEmployeeName).toHaveBeenCalledWith(
      '0x1111111111111111111111111111111111111111',
      'Alice Updated',
    )
  })

  it('cancels edit and restores original name on Escape', () => {
    renderList(true)

    fireEvent.click(screen.getByText('Alice'))
    const input = screen.getByRole('textbox', { name: /employee name/i })

    fireEvent.change(input, { target: { value: 'Changed' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByRole('textbox', { name: /employee name/i })).not.toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})
