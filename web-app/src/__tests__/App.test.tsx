import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import type { UserRole } from '../hooks/useUserRole'

const mockUseWalletConnection = vi.hoisted(() => vi.fn())
const mockUseUserRole = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useWalletConnection', () => ({
  useWalletConnection: mockUseWalletConnection,
}))

vi.mock('../hooks/useUserRole', () => ({
  useUserRole: mockUseUserRole,
}))

// Mock the protected views so they don't need their own dep trees
vi.mock('../views/EmployeePortfolio', () => ({
  EmployeePortfolio: () => <div data-testid="employee-portfolio">Employee Portfolio</div>,
}))

function renderApp(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routing', () => {
  beforeEach(() => {
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
  })

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

  it('allows employee to access /portfolio route', async () => {
    mockUseWalletConnection.mockReturnValue({
      address: '0xE' as `0x${string}`,
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
      role: 'employee' as UserRole,
      employeeCompanyId: 1,
      isLoading: false,
      error: null,
    })

    renderApp(['/portfolio'])

    await waitFor(() => {
      expect(screen.getByTestId('employee-portfolio')).toBeInTheDocument()
    })
  })

  it('redirects visitor away from /portfolio route', async () => {
    mockUseWalletConnection.mockReturnValue({
      address: '0xE' as `0x${string}`,
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
      isLoading: false,
      error: null,
    })

    renderApp(['/portfolio'])

    // Visitor should be redirected to / and see the visitor greeting
    await waitFor(() => {
      expect(screen.getByText('👋 Welcome')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('employee-portfolio')).not.toBeInTheDocument()
  })
})
