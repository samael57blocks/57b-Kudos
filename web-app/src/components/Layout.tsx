import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { ConnectButton } from './ConnectButton'
import { NetworkBadge } from './NetworkBadge'
import { useUserRole } from '../hooks/useUserRole'
import styles from './Layout.module.css'

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
      <header className={styles.header}>
        <span className={styles.logo}>🏆 NFT57B</span>
        <div className={styles.headerRight}>
          <NetworkBadge />
          <ConnectButton />
        </div>
      </header>

      <div className={styles.mainArea}>
        <nav className={styles.sidebar}>
          {role === 'admin' ? (
            <>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                Overview
              </NavLink>
              <NavLink
                to="/company"
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                 Company
              </NavLink>
            </>
          ) : role === 'minter' ? (
            <>
              <NavLink
                to="/mint"
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                Mint
              </NavLink>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/portfolio"
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                My Portfolio
              </NavLink>
            </>
          ) : role === 'employee' ? (
            <NavLink
              to="/portfolio"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              My Portfolio
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/portfolio"
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                My Portfolio
              </NavLink>
            </>
          )}
        </nav>

        <main className={styles.content}>{children}</main>
      </div>
    </>
  )
}
