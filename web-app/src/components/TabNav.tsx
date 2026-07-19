import { NavLink } from 'react-router-dom'
import type { UserRole } from '../hooks/useUserRole'
import styles from './TabNav.module.css'

interface TabConfig {
  label: string
  path: string
  roles: UserRole[]
}

interface TabNavProps {
  role: UserRole
  currentPath: string
}

const TAB_CONFIG: TabConfig[] = [
  { label: 'Home',         path: '/',         roles: ['admin', 'minter', 'company_admin', 'employee', 'visitor'] },
  { label: 'Company',      path: '/company',   roles: ['admin', 'company_admin'] },
  { label: 'My Portfolio', path: '/portfolio', roles: ['minter', 'employee'] },
  { label: 'Mint',         path: '/mint',      roles: ['minter'] },
]

export function TabNav({ role }: TabNavProps) {
  const visibleTabs = TAB_CONFIG.filter((tab) => tab.roles.includes(role))

  return (
    <nav className={styles.container} aria-label="Tab navigation">
      {visibleTabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.tabActive : ''}`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
