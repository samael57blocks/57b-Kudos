import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RegistrationPage } from '../RegistrationPage'
import type { ReactNode } from 'react'

// --- Hoisted mocks ---

const mockUseAccount = vi.hoisted(() => vi.fn())
const mockUseUserRole = vi.hoisted(() => vi.fn())
const mockUseCompanyId = vi.hoisted(() => vi.fn())
const mockUseReadContract = vi.hoisted(() => vi.fn())
const mockUsePublicClient = vi.hoisted(() => vi.fn())
const mockUseWriteContract = vi.hoisted(() => vi.fn())
const mockUseWaitForTx = vi.hoisted(() => vi.fn())
const mockGetContractAddresses = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
  useReadContract: mockUseReadContract,
  usePublicClient: mockUsePublicClient,
  useWriteContract: mockUseWriteContract,
  useWaitForTransactionReceipt: mockUseWaitForTx,
}))

vi.mock('../../hooks/useUserRole', () => ({
  useUserRole: mockUseUserRole,
}))

vi.mock('../../hooks/useCompanyId', () => ({
  useCompanyId: mockUseCompanyId,
}))

vi.mock('../../config/contracts', () => ({
  getContractAddresses: mockGetContractAddresses,
  COMPANY_REGISTRY_ABI: [],
}))

// Mock Layout to render children
vi.mock('../../components/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => (
    <div data-testid="layout-wrapper">{children}</div>
  ),
}))

// Mock child components so they don't need their own dep trees
vi.mock('../../components/CompanyCard', () => ({
  CompanyCard: () => <div data-testid="company-card">Company Card</div>,
}))

vi.mock('../../components/EmployeeList', () => ({
  EmployeeList: () => <div data-testid="employee-list">Employee List</div>,
}))

vi.mock('../../components/RegisterCompanyDialog', () => ({
  RegisterCompanyDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <div data-testid="register-dialog">
      Dialog
      {open && (
        <button type="button" onClick={onClose} data-testid="dialog-close-btn">
          Close
        </button>
      )}
    </div>
  ),
}))

vi.mock('../../components/JoinCompanySection', () => ({
  JoinCompanySection: ({ onJoinSuccess }: { onJoinSuccess?: () => void }) => (
    <div data-testid="join-section">
      Join Section
      {onJoinSuccess && <span data-testid="on-join-success-prop">present</span>}
    </div>
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
    refetchRole: vi.fn(),
  }
  const companyIdDefaults = {
    companyId: null,
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
  mockUseCompanyId.mockReturnValue({
    ...companyIdDefaults,
    ...(overrides.companyId ?? {}),
  })
  mockUseReadContract.mockReturnValue({
    data: overrides.companyInfo ?? undefined,
    isLoading: false,
  })
  mockUsePublicClient.mockReturnValue(undefined)
  mockUseWriteContract.mockReturnValue({
    writeContractAsync: vi.fn(),
    data: undefined,
    error: undefined,
  })
  mockUseWaitForTx.mockReturnValue({
    isLoading: false,
    isSuccess: false,
    error: undefined,
  })
  mockGetContractAddresses.mockReturnValue({
    nft57b: '0xNFT' as `0x${string}`,
    companyRegistry: '0xRegistry' as `0x${string}`,
    recognitionToken: '0xToken' as `0x${string}`,
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

  // ── Not connected ─────────────────────────────────────────────────────────

  it('shows connect prompt when wallet is not connected', () => {
    setupMocks({ account: { address: undefined, isConnected: false } })
    renderPage()

    expect(
      screen.getByText('Connect your wallet to register'),
    ).toBeInTheDocument()
  })

  // ── Admin: empty state ────────────────────────────────────────────────────

  it('shows empty state for admin with no company', () => {
    setupMocks({
      role: { role: 'admin' },
      companyId: { companyId: null, isLoading: false },
    })
    renderPage()

    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('No company registered yet')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /register company/i }),
    ).toBeInTheDocument()

    expect(screen.queryByTestId('company-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('employee-list')).not.toBeInTheDocument()
  })

  it('shows dialog when Register Company button is clicked in empty state', () => {
    setupMocks({
      role: { role: 'admin' },
      companyId: { companyId: null, isLoading: false },
    })
    renderPage()

    expect(screen.getByTestId('register-dialog')).toBeInTheDocument()
    // Dialog should not render its open content initially
    expect(screen.queryByTestId('dialog-close-btn')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /register company/i }))

    expect(screen.getByTestId('dialog-close-btn')).toBeInTheDocument()
  })

  it('shows loading message while resolving company ID', () => {
    setupMocks({
      role: { role: 'admin' },
      companyId: { companyId: null, isLoading: true },
    })
    renderPage()

    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(
      screen.getByText('Loading company information…'),
    ).toBeInTheDocument()
  })

  // ── Admin: populated state ────────────────────────────────────────────────

  it('shows company card and employee list for admin with company', () => {
    setupMocks({
      role: { role: 'admin' },
      companyId: { companyId: 42n, isLoading: false },
      companyInfo: {
        id: 42n,
        name: 'Test Corp',
        admin: '0xUser' as `0x${string}`,
        createdAt: 1000n,
      },
    })
    renderPage()

    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByTestId('company-card')).toBeInTheDocument()
    expect(screen.getByTestId('employee-list')).toBeInTheDocument()

    expect(
      screen.queryByText('No company registered yet'),
    ).not.toBeInTheDocument()
  })

  // ── Visitor role ──────────────────────────────────────────────────────────

  it('shows join company section for visitor role', () => {
    setupMocks({ role: { role: 'visitor' } })
    renderPage()

    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(
      screen.getByText('Join an existing company below to start receiving Kudos.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('company-card'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('employee-list'),
    ).not.toBeInTheDocument()
  })

  it('passes onJoinSuccess to JoinCompanySection for visitor role', () => {
    setupMocks({ role: { role: 'visitor' } })
    renderPage()

    expect(screen.getByTestId('on-join-success-prop')).toBeInTheDocument()
  })

  // ── Employee role ─────────────────────────────────────────────────────────

  it('shows already registered message for employee role and no forms', () => {
    setupMocks({
      role: { role: 'employee', employeeCompanyId: 5 },
    })
    renderPage()

    expect(
      screen.getByText('You are already registered to a company'),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('company-card'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('employee-list'),
    ).not.toBeInTheDocument()
  })

  // ── Layout wrapper ────────────────────────────────────────────────────────

  it('renders layout wrapper when not connected', () => {
    setupMocks({ account: { address: undefined, isConnected: false } })
    renderPage()
    expect(screen.getByTestId('layout-wrapper')).toBeInTheDocument()
  })

  it('renders layout wrapper for admin role with populated company', () => {
    setupMocks({
      role: { role: 'admin' },
      companyId: { companyId: 42n, isLoading: false },
      companyInfo: {
        id: 42n,
        name: 'Test Corp',
        admin: '0xUser' as `0x${string}`,
        createdAt: 1000n,
      },
    })
    renderPage()
    expect(screen.getByTestId('layout-wrapper')).toBeInTheDocument()
  })
})
