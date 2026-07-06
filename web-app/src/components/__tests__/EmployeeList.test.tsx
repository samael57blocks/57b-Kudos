import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmployeeList } from '../EmployeeList'

// --- Hoisted mocks ---

const mockRefresh = vi.hoisted(() => vi.fn())
const mockUseCompanyEmployees = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useCompanyEmployees', () => ({
  useCompanyEmployees: mockUseCompanyEmployees,
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

// --- Helper ---

function setupEmployeeState(overrides: Record<string, unknown> = {}) {
  const defaults = {
    employees: MOCK_EMPLOYEES,
    isLoading: false,
    error: null,
    refresh: mockRefresh,
  }
  mockUseCompanyEmployees.mockReturnValue({ ...defaults, ...overrides })
}

function renderList() {
  return render(<EmployeeList companyId={COMPANY_ID} />)
}

// --- Tests ---

describe('EmployeeList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupEmployeeState()
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
})
