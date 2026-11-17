import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ConnectButton } from './ConnectButton'
import { NetworkBadge } from './NetworkBadge'
import { TabNav } from './TabNav'
import { useUserRole } from '../hooks/useUserRole'
import styles from './Layout.module.css'

interface LayoutProps {
  children: ReactNode
}

/**
 * Main application layout with header containing logo, TabNav, and wallet controls.
 *
 * Navigation is role-based via TabNav (horizontal pill tabs in header).
 * The sidebar has been removed — all views render directly in the content area.
 */
export function Layout({ children }: LayoutProps) {
  const { role } = useUserRole()
  const { pathname } = useLocation()

  return (
    <>
      <header className={styles.header}>
        <span className={styles.logo}>🏆 NFT57B</span>
        <TabNav role={role} currentPath={pathname} />
        <div className={styles.headerRight}>
          <NetworkBadge />
          <ConnectButton />
        </div>
      </header>

      <main className={styles.content}>{children}</main>
    </>
  )
}
