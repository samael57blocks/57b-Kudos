import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../HomePage'
import type { UserRole } from '../../hooks/useUserRole'

// --- Hoisted mocks ---

const mockUseWalletConnection = vi.hoisted(() => vi.fn())
const mockUseUserRole = vi.hoisted(() => vi.fn())
const mockUseCompanyId = vi.hoisted(() => vi.fn())
const mockUseCompanyEmployees = vi.hoisted(() => vi.fn())
const mockUseCompanyNFTs = vi.hoisted(() => vi.fn())
const mockUseReadContract = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useWalletConnection', () => ({
  useWalletConnection: mockUseWalletConnection,
}))

vi.mock('../../hooks/useUserRole', () => ({
  useUserRole: mockUseUserRole,
}))

vi.mock('../../hooks/useCompanyId', () => ({
  useCompanyId: mockUseCompanyId,
}))

vi.mock('../../hooks/useCompanyEmployees', () => ({
  useCompanyEmployees: mockUseCompanyEmployees,
}))

vi.mock('../../hooks/useCompanyNFTs', () => ({
  useCompanyNFTs: mockUseCompanyNFTs,
}))

vi.mock('wagmi', () => ({
  useReadContract: mockUseReadContract,
  useAccount: vi.fn(() => ({ address: undefined, isConnected: false })),
}))

vi.mock('../../config/contracts', () => ({
  COMPANY_REGISTRY_ABI: [],
  getContractAddresses: () => ({
    companyRegistry: '0xRegistry',
    nft57b: '0xNFT57B',
  }),
}))

// Mock dashboard section components so they don't pull in deep dependencies
vi.mock('../CompanyDashboardSection', () => ({
  CompanyDashboardSection: ({ companyId }: { companyId: bigint }) => (
    <div data-testid="company-dashboard-section">
      CompanyDashboardSection: {companyId.toString()}
    </div>
  ),
}))

vi.mock('../MinterDashboardSection', () => ({
  MinterDashboardSection: ({ companyId }: { companyId: bigint | null }) => (
    <div data-testid="minter-dashboard-section">
      MinterDashboardSection: {companyId?.toString() ?? 'null'}
    </div>
  ),
}))

// --- Helpers ---

const DEFAULT_WALLET = {
  isConnected: true,
  isCorrectNetwork: true,
  address: '0xUser' as `0x${string}`,
  isConnecting: false,
  chainName: 'localhost',
  targetNetwork: 'localhost',
  connect: vi.fn(),
  disconnect: vi.fn(),
  switchToTargetNetwork: vi.fn(),
  isSwitchingNetwork: false,
}

function setupRole(role: UserRole, overrides: Record<string, unknown> = {}) {
  mockUseWalletConnection.mockReturnValue(DEFAULT_WALLET)
  mockUseUserRole.mockReturnValue({
    role,
    employeeCompanyId: undefined,
    isLoading: false,
    error: null,
    refetchRole: vi.fn(),
    ...overrides,
  })
  mockUseCompanyId.mockReturnValue({ companyId: null, isLoading: false, error: null })
  mockUseCompanyEmployees.mockReturnValue({ employees: [], isLoading: false })
  mockUseCompanyNFTs.mockReturnValue({ nfts: [], isLoading: false })
  mockUseReadContract.mockReturnValue({ data: undefined })
}

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <HomePage />
    </MemoryRouter>,
  )
}

// --- Tests ---

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Disconnected / error states ─────────────────────────────────────────

  it('shows welcome message when wallet is not connected', () => {
    mockUseWalletConnection.mockReturnValue({ ...DEFAULT_WALLET, isConnected: false })
    mockUseUserRole.mockReturnValue({
      role: 'visitor', employeeCompanyId: undefined,
      isLoading: false, error: null, refetchRole: vi.fn(),
    })
    mockUseCompanyId.mockReturnValue({ companyId: null, isLoading: false, error: null })
    mockUseCompanyEmployees.mockReturnValue({ employees: [], isLoading: false })
    mockUseCompanyNFTs.mockReturnValue({ nfts: [], isLoading: false })
    mockUseReadContract.mockReturnValue({ data: undefined })

    renderHomePage()

    expect(screen.getByRole('heading', { name: /welcome to nft57b/i })).toBeInTheDocument()
    expect(screen.getByText(/connect your wallet to get started/i)).toBeInTheDocument()
  })

  it('shows wrong network message when on wrong network', () => {
    mockUseWalletConnection.mockReturnValue({ ...DEFAULT_WALLET, isCorrectNetwork: false })
    mockUseUserRole.mockReturnValue({
      role: 'visitor', employeeCompanyId: undefined,
      isLoading: false, error: null, refetchRole: vi.fn(),
    })
    mockUseCompanyId.mockReturnValue({ companyId: null, isLoading: false, error: null })
    mockUseCompanyEmployees.mockReturnValue({ employees: [], isLoading: false })
    mockUseCompanyNFTs.mockReturnValue({ nfts: [], isLoading: false })
    mockUseReadContract.mockReturnValue({ data: undefined })

    renderHomePage()

    expect(screen.getByRole('heading', { name: /wrong network/i })).toBeInTheDocument()
    expect(screen.getByText(/please switch to the correct network/i)).toBeInTheDocument()
  })

  it('shows loading while role is being resolved', () => {
    mockUseWalletConnection.mockReturnValue(DEFAULT_WALLET)
    mockUseUserRole.mockReturnValue({
      role: 'visitor', employeeCompanyId: undefined,
      isLoading: true, error: null, refetchRole: vi.fn(),
    })
    mockUseCompanyId.mockReturnValue({ companyId: null, isLoading: false, error: null })
    mockUseCompanyEmployees.mockReturnValue({ employees: [], isLoading: false })
    mockUseCompanyNFTs.mockReturnValue({ nfts: [], isLoading: false })
    mockUseReadContract.mockReturnValue({ data: undefined })

    renderHomePage()

    expect(screen.getByText(/loading your profile/i)).toBeInTheDocument()
  })

  // ── Role-based rendering ────────────────────────────────────────────────

  it('renders CompanyDashboardSection for company_admin role', () => {
    setupRole('company_admin')
    mockUseCompanyId.mockReturnValue({ companyId: 42n, isLoading: false, error: null })

    renderHomePage()

    expect(screen.getByTestId('company-dashboard-section')).toBeInTheDocument()
    expect(screen.getByText('CompanyDashboardSection: 42')).toBeInTheDocument()
    expect(screen.queryByTestId('minter-dashboard-section')).not.toBeInTheDocument()
  })

  it('renders MinterDashboardSection for minter role', () => {
    setupRole('minter', { employeeCompanyId: 7 })
    mockUseCompanyId.mockReturnValue({ companyId: 7n, isLoading: false, error: null })

    renderHomePage()

    expect(screen.getByTestId('minter-dashboard-section')).toBeInTheDocument()
    expect(screen.getByText('MinterDashboardSection: 7')).toBeInTheDocument()
    expect(screen.queryByTestId('company-dashboard-section')).not.toBeInTheDocument()
  })

  it('renders company overview for admin role', () => {
    setupRole('admin')
    mockUseCompanyId.mockReturnValue({ companyId: 1n, isLoading: false, error: null })
    mockUseCompanyEmployees.mockReturnValue({
      employees: [{ employee: '0xABC123' }, { employee: '0xDEF456' }],
      isLoading: false,
    })
    mockUseCompanyNFTs.mockReturnValue({ nfts: [{}, {}, {}], isLoading: false })

    renderHomePage()

    expect(screen.getByRole('heading', { name: /company overview/i })).toBeInTheDocument()
    expect(screen.getByText('Total Employees')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Total NFTs Minted')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByTestId('company-dashboard-section')).not.toBeInTheDocument()
    expect(screen.queryByTestId('minter-dashboard-section')).not.toBeInTheDocument()
  })

  it('renders employee overview for employee role', () => {
    setupRole('employee', { employeeCompanyId: 5 })
    mockUseCompanyEmployees.mockReturnValue({
      employees: [{ employee: '0xAAAA' }],
      isLoading: false,
    })
    mockUseCompanyNFTs.mockReturnValue({ nfts: [{}], isLoading: false })

    renderHomePage()

    expect(screen.getByText('Coworkers')).toBeInTheDocument()
    expect(screen.getByText('Kudos Minted')).toBeInTheDocument()
    expect(screen.getByText('View My Portfolio →')).toBeInTheDocument()
    expect(screen.queryByTestId('company-dashboard-section')).not.toBeInTheDocument()
    expect(screen.queryByTestId('minter-dashboard-section')).not.toBeInTheDocument()
  })

  it('renders welcome message for visitor role', () => {
    setupRole('visitor')

    renderHomePage()

    expect(screen.getByRole('heading', { name: /^welcome$/i })).toBeInTheDocument()
    expect(screen.getByText(/your admin needs to add you/i)).toBeInTheDocument()
  })

  // ── No Layout wrapper ───────────────────────────────────────────────────

  it('does not render Layout wrapper', () => {
    setupRole('visitor')

    renderHomePage()

    // After refactor, HomePage is pure content — no Layout.
    // The real Layout renders "🏆 NFT57B" logo in header.
    // Verify it's not present.
    expect(screen.queryByText('🏆 NFT57B')).not.toBeInTheDocument()
  })
})
