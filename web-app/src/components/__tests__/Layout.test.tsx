import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Layout } from '../Layout'
import type { UserRole } from '../../hooks/useUserRole'

const mockUseWalletConnection = vi.hoisted(() => vi.fn())
const mockUseUserRole = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useWalletConnection', () => ({
  useWalletConnection: mockUseWalletConnection,
}))

vi.mock('../../hooks/useUserRole', () => ({
  useUserRole: mockUseUserRole,
}))

function renderLayout(route = '/', role: UserRole = 'visitor') {
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
    role,
    employeeCompanyId: undefined,
    isLoading: false,
    error: null,
  })

  return render(
    <MemoryRouter initialEntries={[route]}>
      <Layout>
        <div>Content</div>
      </Layout>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Structure ───────────────────────────────────────────────────────────

  it('renders children in content area', () => {
    renderLayout()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('does not render a sidebar', () => {
    renderLayout()
    expect(screen.queryByRole('navigation', { name: /sidebar/i })).not.toBeInTheDocument()
    // Sidebar used NavLink with navItem class — verify none exist
    expect(document.querySelector('[class*="sidebar"]')).not.toBeInTheDocument()
  })

  it('renders TabNav inside the header', () => {
    renderLayout()
    const header = document.querySelector('[class*="header"]')
    expect(header).toBeInTheDocument()
    // TabNav renders a <nav aria-label="Tab navigation">
    const tabNav = screen.getByRole('navigation', { name: 'Tab navigation' })
    expect(header).toContainElement(tabNav)
  })

  it('renders logo and network badge in header', () => {
    renderLayout()
    expect(screen.getByText('🏆 NFT57B')).toBeInTheDocument()
    // Wallet not connected → NetworkBadge shows "Not Connected"
    expect(screen.getByText(/not connected/i)).toBeInTheDocument()
  })

  // ── Role-based tabs ─────────────────────────────────────────────────────

  it('shows only Home tab for visitor', () => {
    renderLayout('/', 'visitor')
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Company' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'My Portfolio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mint' })).not.toBeInTheDocument()
  })

  it('shows Home + My Portfolio for employee', () => {
    renderLayout('/', 'employee')
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My Portfolio' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Company' })).not.toBeInTheDocument()
  })

  it('shows Home + My Portfolio + Mint for minter', () => {
    renderLayout('/', 'minter')
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My Portfolio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mint' })).toBeInTheDocument()
  })

  it('shows Home + Company for admin', () => {
    renderLayout('/', 'admin')
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Company' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'My Portfolio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mint' })).not.toBeInTheDocument()
  })

  // ── Active state ────────────────────────────────────────────────────────

  it('marks active tab when route matches', () => {
    renderLayout('/portfolio', 'employee')
    const portfolioTab = screen.getByRole('link', { name: 'My Portfolio' })
    expect(portfolioTab).toHaveAttribute('aria-current', 'page')
  })
})
