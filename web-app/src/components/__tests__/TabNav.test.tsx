import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TabNav } from '../TabNav'
import type { UserRole } from '../../hooks/useUserRole'

function renderTabNav(role: UserRole, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TabNav role={role} currentPath={path} />
    </MemoryRouter>,
  )
}

describe('TabNav', () => {
  it('renders only Home tab for visitor role', () => {
    renderTabNav('visitor')

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Company' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'My Portfolio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mint' })).not.toBeInTheDocument()
  })

  it('renders Home and My Portfolio for employee role', () => {
    renderTabNav('employee')

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My Portfolio' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Company' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mint' })).not.toBeInTheDocument()
  })

  it('renders Home, My Portfolio, and Mint for minter role', () => {
    renderTabNav('minter')

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My Portfolio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mint' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Company' })).not.toBeInTheDocument()
  })

  it('renders Home and Company for company_admin role', () => {
    renderTabNav('company_admin')

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Company' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'My Portfolio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mint' })).not.toBeInTheDocument()
  })

  it('renders Home and Company for admin role', () => {
    renderTabNav('admin')

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Company' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'My Portfolio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mint' })).not.toBeInTheDocument()
  })

  it('marks active tab with aria-current when currentPath matches', () => {
    renderTabNav('minter', '/mint')

    const mintTab = screen.getByRole('link', { name: 'Mint' })
    expect(mintTab).toHaveAttribute('aria-current', 'page')

    const homeTab = screen.getByRole('link', { name: 'Home' })
    expect(homeTab).not.toHaveAttribute('aria-current', 'page')
  })

  it('marks Home tab active when on root path', () => {
    renderTabNav('employee', '/')

    const homeTab = screen.getByRole('link', { name: 'Home' })
    expect(homeTab).toHaveAttribute('aria-current', 'page')
  })

  it('navigates to correct path when tab is clicked', () => {
    renderTabNav('minter', '/')

    const mintTab = screen.getByRole('link', { name: 'Mint' })
    expect(mintTab).toHaveAttribute('href', '/mint')
  })

  it('has exactly the correct number of tabs for each role', () => {
    const { unmount: u1 } = renderTabNav('visitor')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    u1()

    const { unmount: u2 } = renderTabNav('employee')
    expect(screen.getAllByRole('link')).toHaveLength(2)
    u2()

    const { unmount: u3 } = renderTabNav('minter')
    expect(screen.getAllByRole('link')).toHaveLength(3)
    u3()

    const { unmount: u4 } = renderTabNav('company_admin')
    expect(screen.getAllByRole('link')).toHaveLength(2)
    u4()

    const { unmount: u5 } = renderTabNav('admin')
    expect(screen.getAllByRole('link')).toHaveLength(2)
    u5()
  })
})
