import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { ConnectButton } from './ConnectButton'
import { NetworkBadge } from './NetworkBadge'
import { useUserRole } from '../hooks/useUserRole'

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 24px',
  borderBottom: '1px solid var(--border, #e5e4e7)',
  background: 'var(--bg, #fff)',
}

const logoStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: '18px',
  color: 'var(--text-h, #08060d)',
  letterSpacing: '-0.3px',
}

const headerRightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}

const sidebarStyle: React.CSSProperties = {
  width: '220px',
  borderRight: '1px solid var(--border, #e5e4e7)',
  padding: '16px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}

const mainAreaStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: '24px',
  overflowY: 'auto',
}

const navItemStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: '14px',
  color: 'var(--text, #6b6375)',
  textDecoration: 'none',
  borderLeft: '3px solid transparent',
  transition: 'all 0.15s',
}

interface LayoutProps {
  children: ReactNode
}

/**
 * Main application layout with header, sidebar navigation, and content area.
 *
 * Navigation items are conditionally shown based on the connected wallet's role:
 * - Admin sees: Company
 * - Company admin sees: Dashboard
 * - Employee sees: Portfolio
 * - Visitor sees: nothing extra
 */
export function Layout({ children }: LayoutProps) {
  const { role } = useUserRole()

  return (
    <>
      <header style={headerStyle}>
        <span style={logoStyle}>🏆 NFT57B</span>
        <div style={headerRightStyle}>
          <NetworkBadge />
          <ConnectButton />
        </div>
      </header>

      <div style={mainAreaStyle}>
        <nav style={sidebarStyle}>
          {role === 'admin' ? (
            <>
              <NavLink
                to="/"
                style={({ isActive }) => ({
                  ...navItemStyle,
                  color: isActive ? 'var(--text-h, #08060d)' : 'var(--text, #6b6375)',
                  borderLeftColor: isActive ? 'var(--accent, #aa3bff)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                Overview
              </NavLink>
              <NavLink
                to="/company"
                style={({ isActive }) => ({
                  ...navItemStyle,
                  color: isActive ? 'var(--text-h, #08060d)' : 'var(--text, #6b6375)',
                  borderLeftColor: isActive ? 'var(--accent, #aa3bff)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                 Company
              </NavLink>
            </>
          ) : role === 'minter' ? (
            <>
              <NavLink
                to="/mint"
                style={({ isActive }) => ({
                  ...navItemStyle,
                  color: isActive ? 'var(--text-h, #08060d)' : 'var(--text, #6b6375)',
                  borderLeftColor: isActive ? 'var(--accent, #aa3bff)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                Mint
              </NavLink>
              <NavLink
                to="/dashboard"
                style={({ isActive }) => ({
                  ...navItemStyle,
                  color: isActive ? 'var(--text-h, #08060d)' : 'var(--text, #6b6375)',
                  borderLeftColor: isActive ? 'var(--accent, #aa3bff)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/portfolio"
                style={({ isActive }) => ({
                  ...navItemStyle,
                  color: isActive ? 'var(--text-h, #08060d)' : 'var(--text, #6b6375)',
                  borderLeftColor: isActive ? 'var(--accent, #aa3bff)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                My Portfolio
              </NavLink>
            </>
          ) : role === 'employee' ? (
            <NavLink
              to="/portfolio"
              style={({ isActive }) => ({
                ...navItemStyle,
                color: isActive ? 'var(--text-h, #08060d)' : 'var(--text, #6b6375)',
                borderLeftColor: isActive ? 'var(--accent, #aa3bff)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
              })}
            >
              My Portfolio
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/dashboard"
                style={({ isActive }) => ({
                  ...navItemStyle,
                  color: isActive ? 'var(--text-h, #08060d)' : 'var(--text, #6b6375)',
                  borderLeftColor: isActive ? 'var(--accent, #aa3bff)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/portfolio"
                style={({ isActive }) => ({
                  ...navItemStyle,
                  color: isActive ? 'var(--text-h, #08060d)' : 'var(--text, #6b6375)',
                  borderLeftColor: isActive ? 'var(--accent, #aa3bff)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                My Portfolio
              </NavLink>
            </>
          )}
        </nav>

        <main style={contentStyle}>{children}</main>
      </div>
    </>
  )
}
