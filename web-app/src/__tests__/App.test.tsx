import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import type { UserRole } from '../hooks/useUserRole'

const mockUseWalletConnection = vi.hoisted(() => vi.fn())
const mockUseUserRole = vi.hoisted(() => vi.fn())
const mockUseCompanyId = vi.hoisted(() => vi.fn())
const mockUseCompanyEmployees = vi.hoisted(() => vi.fn())
const mockUseCompanyNFTs = vi.hoisted(() => vi.fn())
const mockUseReadContract = vi.hoisted(() => vi.fn())
const mockUseWriteContract = vi.hoisted(() => vi.fn())
const mockUseWaitForTx = vi.hoisted(() => vi.fn())
const mockUsePublicClient = vi.hoisted(() => vi.fn())
const mockUseAccount = vi.hoisted(() => vi.fn())

vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(typeof actual === 'object' && actual !== null ? actual : {}),
    useAccount: mockUseAccount,
    useReadContract: mockUseReadContract,
    useWriteContract: mockUseWriteContract,
    useWaitForTransactionReceipt: mockUseWaitForTx,
    usePublicClient: mockUsePublicClient,
  }
})

vi.mock('../hooks/useWalletConnection', () => ({
  useWalletConnection: mockUseWalletConnection,
}))

vi.mock('../hooks/useUserRole', () => ({
  useUserRole: mockUseUserRole,
}))

vi.mock('../hooks/useCompanyId', () => ({
  useCompanyId: mockUseCompanyId,
}))

vi.mock('../hooks/useCompanyEmployees', () => ({
  useCompanyEmployees: mockUseCompanyEmployees,
}))

vi.mock('../hooks/useCompanyNFTs', () => ({
  useCompanyNFTs: mockUseCompanyNFTs,
}))

// Mock the protected views so they don't need their own dep trees
vi.mock('../views/EmployeePortfolio', () => ({
  EmployeePortfolio: () => <div data-testid="employee-portfolio">Employee Portfolio</div>,
}))
vi.mock('../views/MintNftPage', () => ({
  MintNftPage: () => <div data-testid="mint-page">Give a Recognition</div>,
}))
vi.mock('../views/RegistrationPage', () => ({
  RegistrationPage: () => <div data-testid="registration-page">Registration Page</div>,
}))

function connectedWallet(address: `0x${string}`, role: UserRole) {
  mockUseWalletConnection.mockReturnValue({
    address,
    isConnected: true,
    isConnecting: false,
    isCorrectNetwork: true,
    chainName: 'Hardhat Local',
    targetNetwork: 'localhost',
    connect: vi.fn(),
    disconnect: vi.fn(),
    switchToTargetNetwork: vi.fn(),
    isSwitchingNetwork: false,
  })
  mockUseAccount.mockReturnValue({
    address,
    isConnected: true,
  })
  mockUseUserRole.mockReturnValue({
    role,
    employeeCompanyId: role === 'employee' ? 1 : undefined,
    isLoading: false,
    error: null,
  })
  // Minter and company_admin need a companyId for their views
  if (role === 'minter' || role === 'company_admin' || role === 'admin') {
    mockUseCompanyId.mockReturnValue({
      companyId: 1,
      isLoading: false,
      error: null,
    })
  }
}

function renderApp(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWalletConnection.mockReturnValue({
      address: undefined,
      isConnected: false,
      isConnecting: false,
      isCorrectNetwork: true,
      chainName: undefined,
      targetNetwork: 'localhost',
      connect: vi.fn(),
      disconnect: vi.fn(),
      switchToTargetNetwork: vi.fn(),
      isSwitchingNetwork: false,
    })
    mockUseUserRole.mockReturnValue({
      role: 'visitor' as UserRole,
      employeeCompanyId: undefined,
      isLoading: false,
      error: null,
    })
    mockUseCompanyId.mockReturnValue({
      companyId: null,
      isLoading: false,
      error: null,
    })
    mockUseCompanyEmployees.mockReturnValue({
      employees: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    })
    mockUseCompanyNFTs.mockReturnValue({
      nfts: [],
      isLoading: false,
      error: null,
    })
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    })
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
    mockUsePublicClient.mockReturnValue(undefined)
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
    })
  })

  // ── Basic routing ───────────────────────────────────────────────────────

  it('renders welcome message at / when not connected', () => {
    renderApp(['/'])
    expect(screen.getByText('Welcome to NFT57B')).toBeInTheDocument()
  })

  it('shows wrong network message when on wrong chain', () => {
    mockUseWalletConnection.mockReturnValue({
      address: '0x1234' as `0x${string}`,
      isConnected: true,
      isConnecting: false,
      isCorrectNetwork: false,
      chainName: 'Wrong',
      targetNetwork: 'localhost',
      connect: vi.fn(),
      disconnect: vi.fn(),
      switchToTargetNetwork: vi.fn(),
      isSwitchingNetwork: false,
    })
    renderApp(['/'])
    expect(screen.getByText('Wrong Network')).toBeInTheDocument()
  })

  it('shows loading state while role is being determined', () => {
    mockUseWalletConnection.mockReturnValue({
      address: '0x1234' as `0x${string}`,
      isConnected: true,
      isConnecting: false,
      isCorrectNetwork: true,
      chainName: 'Hardhat Local',
      targetNetwork: 'localhost',
      connect: vi.fn(),
      disconnect: vi.fn(),
      switchToTargetNetwork: vi.fn(),
      isSwitchingNetwork: false,
    })
    mockUseUserRole.mockReturnValue({
      role: 'visitor' as UserRole,
      employeeCompanyId: undefined,
      isLoading: true,
      error: null,
      refetchRole: vi.fn(),
    })
    renderApp(['/'])
    expect(screen.getByText('Loading your profile…')).toBeInTheDocument()
  })

  it('redirects unknown routes to /', async () => {
    renderApp(['/unknown'])
    await waitFor(() => {
      expect(screen.getByText('Welcome to NFT57B')).toBeInTheDocument()
    })
  })

  // ── Route protection ────────────────────────────────────────────────────

  it('allows employee to access /portfolio route', async () => {
    connectedWallet('0xE' as `0x${string}`, 'employee')
    renderApp(['/portfolio'])
    await waitFor(() => {
      expect(screen.getByTestId('employee-portfolio')).toBeInTheDocument()
    })
  })

  it('allows company_admin to access /company route', async () => {
    connectedWallet('0xCA' as `0x${string}`, 'company_admin')
    renderApp(['/company'])
    await waitFor(() => {
      expect(screen.getByTestId('registration-page')).toBeInTheDocument()
    })
  })

  it('redirects visitor away from /portfolio route', async () => {
    connectedWallet('0xE' as `0x${string}`, 'visitor')
    renderApp(['/portfolio'])
    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
      expect(
        screen.getByText(/Your admin needs to add you as an employee/),
      ).toBeInTheDocument()
    })
    expect(screen.queryByTestId('employee-portfolio')).not.toBeInTheDocument()
  })

  // ── /mint minter-only (security) ────────────────────────────────────────

  it('allows minter to access /mint route', async () => {
    connectedWallet('0xM' as `0x${string}`, 'minter')
    renderApp(['/mint'])
    await waitFor(() => {
      expect(screen.getByTestId('mint-page')).toBeInTheDocument()
    })
  })

  it('redirects company_admin away from /mint route', async () => {
    connectedWallet('0xCA' as `0x${string}`, 'company_admin')
    renderApp(['/mint'])
    await waitFor(() => {
      // company_admin has no specific HomePage branch → visitor view
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })
  })

  it('redirects admin away from /mint route', async () => {
    connectedWallet('0xAD' as `0x${string}`, 'admin')
    renderApp(['/mint'])
    await waitFor(() => {
      // admin lands on HomePage → admin view
      expect(screen.getByText('Company Overview')).toBeInTheDocument()
    })
  })
})
