import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import type { UserRole } from '../../hooks/useUserRole'

const mockUseUserRole = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useUserRole', () => ({
  useUserRole: mockUseUserRole,
}))

function renderWithRouter(
  ui: React.ReactElement,
  { initialEntries = ['/'] } = {},
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/dashboard" element={ui} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseUserRole.mockReturnValue({
      role: 'visitor' as UserRole,
      employeeCompanyId: undefined,
      isLoading: false,
      error: null,
    })
  })

  it('renders children when role is allowed', () => {
    mockUseUserRole.mockReturnValue({
      role: 'company_admin' as UserRole,
      employeeCompanyId: undefined,
      isLoading: false,
      error: null,
    })
    renderWithRouter(
      <ProtectedRoute allowedRoles={['company_admin']}>
        <div>Dashboard Content</div>
      </ProtectedRoute>,
      { initialEntries: ['/dashboard'] },
    )
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument()
  })

  it('redirects to / when role is not in allowedRoles', async () => {
    renderWithRouter(
      <ProtectedRoute allowedRoles={['company_admin']}>
        <div>Dashboard Content</div>
      </ProtectedRoute>,
      { initialEntries: ['/dashboard'] },
    )
    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
    })
  })

  it('passes companyAdmin:true to useUserRole when allowedRoles includes company_admin', () => {
    mockUseUserRole.mockReturnValue({
      role: 'company_admin' as UserRole,
      employeeCompanyId: undefined,
      isLoading: false,
      error: null,
    })
    renderWithRouter(
      <ProtectedRoute allowedRoles={['company_admin']}>
        <div>Dashboard Content</div>
      </ProtectedRoute>,
      { initialEntries: ['/dashboard'] },
    )
    expect(mockUseUserRole).toHaveBeenCalledWith({ companyAdmin: true })
  })

  it('does NOT pass companyAdmin:true when allowedRoles excludes company_admin', () => {
    // Clear call history to isolate this test's assertion
    mockUseUserRole.mockClear()
    mockUseUserRole.mockReturnValue({
      role: 'employee' as UserRole,
      employeeCompanyId: 5,
      isLoading: false,
      error: null,
    })
    renderWithRouter(
      <ProtectedRoute allowedRoles={['employee', 'admin']}>
        <div>Dashboard Content</div>
      </ProtectedRoute>,
      { initialEntries: ['/dashboard'] },
    )
    // After mount, the last call to useUserRole should NOT have companyAdmin
    const calls = mockUseUserRole.mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(1)
    for (const call of calls) {
      expect(call[0]).toBeUndefined()
    }
  })

  it('redirects visitor role away from dashboard', async () => {
    renderWithRouter(
      <ProtectedRoute allowedRoles={['company_admin']}>
        <div>Dashboard Content</div>
      </ProtectedRoute>,
      { initialEntries: ['/dashboard'] },
    )
    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument()
    })
  })

  it('shows loading indicator while role is being determined', async () => {
    mockUseUserRole.mockReturnValue({
      role: 'visitor' as UserRole,
      employeeCompanyId: undefined,
      isLoading: true,
      error: null,
    })
    renderWithRouter(
      <ProtectedRoute allowedRoles={['company_admin']}>
        <div>Dashboard Content</div>
      </ProtectedRoute>,
      { initialEntries: ['/dashboard'] },
    )
    expect(screen.getByText('Checking access…')).toBeInTheDocument()
    // Navigate should NOT fire since isLoading is true — no redirect
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
  })
})
