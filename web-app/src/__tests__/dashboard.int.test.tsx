import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import type { UserRole } from '../hooks/useUserRole'

/**
 * Integration tests for the Company Dashboard routing and mint flow.
 *
 * Covers spec scenarios:
 *   S-001 — Admin auto-redirect to /dashboard
 *   S-003 — Non-admin stays on /
 *   S-005 — Unregistered employee inline error
 *
 * S-001 and S-003 route-level behavior is tested through App-level
 * routing with mocked useWalletConnection and useUserRole.
 *
 * S-005 is covered by MintNFTForm unit tests (validation layer).
 *
 * S-001 partial: full auto-redirect ( / → /dashboard on connect)
 * is not implemented in this PR — only ProtectedRoute gating is tested.
 */

// --- Hoisted mocks ---

const mockUseWalletConnection = vi.hoisted(() => vi.fn())
const mockUseUserRole = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useWalletConnection', () => ({
  useWalletConnection: mockUseWalletConnection,
}))

vi.mock('../hooks/useUserRole', () => ({
  useUserRole: mockUseUserRole,
}))

// Mock CompanyDashboard so it doesn't need Layout/useCompanyId dependencies
vi.mock('../views/CompanyDashboard', () => ({
  CompanyDashboard: () => <div data-testid="company-dashboard">Dashboard Content</div>,
}))

// --- Helpers ---

function renderApp(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  )
}

function setConnectedWallet(address = '0x1234') {
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
}

function setRole(role: UserRole = 'visitor') {
  mockUseUserRole.mockReturnValue({
    role,
    employeeCompanyId: undefined,
    isLoading: false,
    error: null,
  })
}

// --- Tests ---

describe('Dashboard Routing Integration (S-001 / S-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: disconnected
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
    setRole('visitor')
  })

  // S-001: Admin with company_admin role CAN access /dashboard
  it('S-001: company_admin role sees dashboard content at /dashboard', async () => {
    setConnectedWallet()
    setRole('company_admin')
    renderApp(['/dashboard'])

    await waitFor(() => {
      expect(screen.getByTestId('company-dashboard')).toBeInTheDocument()
    })
  })

  // S-003: Non-admin visitor is redirected from /dashboard to /
  it('S-003: visitor role is redirected from /dashboard to /', async () => {
    setConnectedWallet()
    setRole('visitor')
    renderApp(['/dashboard'])

    await waitFor(() => {
      // Visitor redirected to / sees 👋 Welcome
      expect(screen.getByText(/👋 Welcome/i)).toBeInTheDocument()
    })
    expect(screen.queryByTestId('company-dashboard')).not.toBeInTheDocument()
  })

  // S-003 variant: employee role is also redirected from /dashboard
  it('S-003: employee role is redirected from /dashboard to /', async () => {
    setConnectedWallet()
    setRole('employee')
    renderApp(['/dashboard'])

    await waitFor(() => {
      // Employee redirected to / sees 🎉 Employee Portfolio
      expect(screen.getByText(/🎉 Employee Portfolio/i)).toBeInTheDocument()
    })
    expect(screen.queryByTestId('company-dashboard')).not.toBeInTheDocument()
  })

  // S-001 variant: company_admin on / sees home page (no auto-redirect)
  it('S-001: company_admin on / stays on home page (no auto-redirect)', () => {
    setConnectedWallet()
    setRole('company_admin')
    renderApp(['/'])

    // company_admin on / stays on / — no auto-redirect implemented yet
    expect(screen.queryByTestId('company-dashboard')).not.toBeInTheDocument()
  })
})
