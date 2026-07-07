import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RegistrationPage } from '../RegistrationPage'
import type { ReactNode } from 'react'

// --- Hoisted mocks ---

const mockUseAccount = vi.hoisted(() => vi.fn())
const mockUseUserRole = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
}))

vi.mock('../../hooks/useUserRole', () => ({
  useUserRole: mockUseUserRole,
}))

// Mock Layout to render children
vi.mock('../../components/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => (
    <div data-testid="layout-wrapper">{children}</div>
  ),
}))

// Mock child components so they don't need their own dep trees
vi.mock('../../components/CompanyRegistrationForm', () => ({
  CompanyRegistrationForm: () => (
    <div data-testid="company-registration-form">Company Registration</div>
  ),
}))

vi.mock('../../components/EmployeeRegistration', () => ({
  EmployeeRegistration: () => (
    <div data-testid="employee-registration">Employee Registration</div>
  ),
}))

// --- Helpers ---

function setupMocks(overrides: Record<string, unknown> = {}) {
  const accountDefaults = {
    address: '0xUser' as `0x${string}`,
    isConnected: true,
  }
  const roleDefaults = {
    role: 'visitor' as const,
    employeeCompanyId: undefined,
    isLoading: false,
    error: null,
  }
  mockUseAccount.mockReturnValue({
    ...accountDefaults,
    ...(overrides.account ?? {}),
  })
  mockUseUserRole.mockReturnValue({
    ...roleDefaults,
    ...(overrides.role ?? {}),
  })
}

function renderPage() {
  return render(<RegistrationPage />)
}

// --- Tests ---

describe('RegistrationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('shows connect prompt when wallet is not connected', () => {
    setupMocks({ account: { address: undefined, isConnected: false } })
    renderPage()

    expect(
      screen.getByText('Connect your wallet to register'),
    ).toBeInTheDocument()

    expect(
      screen.queryByTestId('company-registration-form'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('employee-registration'),
    ).not.toBeInTheDocument()
  })

  it('renders both forms in grid layout for admin role', () => {
    setupMocks({ role: { role: 'admin' } })
    renderPage()

    expect(
      screen.getByTestId('company-registration-form'),
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('employee-registration'),
    ).toBeInTheDocument()
  })

  it('renders only employee registration for visitor role', () => {
    setupMocks({ role: { role: 'visitor' } })
    renderPage()

    expect(
      screen.getByTestId('employee-registration'),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('company-registration-form'),
    ).not.toBeInTheDocument()
  })

  it('shows already registered message for employee role and no forms', () => {
    setupMocks({
      role: { role: 'employee', employeeCompanyId: 5 },
    })
    renderPage()

    expect(
      screen.getByText('You are already registered to a company'),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('company-registration-form'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('employee-registration'),
    ).not.toBeInTheDocument()
  })

  it('renders layout wrapper when not connected', () => {
    setupMocks({ account: { address: undefined, isConnected: false } })
    renderPage()
    expect(screen.getByTestId('layout-wrapper')).toBeInTheDocument()
  })

  it('renders layout wrapper for admin role with grid', () => {
    setupMocks({ role: { role: 'admin' } })
    renderPage()
    expect(screen.getByTestId('layout-wrapper')).toBeInTheDocument()
    expect(
      screen.getByTestId('company-registration-form'),
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('employee-registration'),
    ).toBeInTheDocument()
  })
})
