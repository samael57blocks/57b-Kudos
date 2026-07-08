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

function renderLayout(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Layout>
        <div>Content</div>
      </Layout>
    </MemoryRouter>,
  )
}

describe('Layout NavLink', () => {
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

  it('renders dashboard and portfolio links in sidebar', () => {
    renderLayout('/')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('My Portfolio')).toBeInTheDocument()
  })

  it('applies active style to Dashboard link on /dashboard route', () => {
    renderLayout('/dashboard')
    const links = screen.getAllByText('Dashboard')
    // The NavLink renders as an anchor <a> element
    const dashboardLink = links.find((el) => el.tagName === 'A')
    expect(dashboardLink).toBeInTheDocument()
    // Verify it has the active aria attribute set by react-router
    expect(dashboardLink).toHaveAttribute('aria-current', 'page')
  })

  it('does not show Company link for visitor role', () => {
    renderLayout('/')
    expect(screen.queryByText('Company')).not.toBeInTheDocument()
  })

  it('shows Company link for admin role', () => {
    mockUseUserRole.mockReturnValue({
      role: 'admin' as UserRole,
      employeeCompanyId: undefined,
      isLoading: false,
      error: null,
    })
    renderLayout('/')
    expect(screen.getByText('Company')).toBeInTheDocument()
  })

  it('does not show Dashboard and My Portfolio for admin role', () => {
    mockUseUserRole.mockReturnValue({
      role: 'admin' as UserRole,
      employeeCompanyId: undefined,
      isLoading: false,
      error: null,
    })
    renderLayout('/')
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('My Portfolio')).not.toBeInTheDocument()
  })
})
