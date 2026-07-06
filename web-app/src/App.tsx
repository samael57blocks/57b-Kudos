import { useRoutes, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CompanyDashboard } from './views/CompanyDashboard'
import { EmployeePortfolio } from './views/EmployeePortfolio'
import { useWalletConnection } from './hooks/useWalletConnection'
import { useUserRole } from './hooks/useUserRole'

/**
 * Home page — shows contextual content based on wallet connection and role.
 * Mirrors the pre-routing App.tsx behavior: welcome, wrong-network, loading,
 * or role-specific greeting.
 */
function HomePage() {
  const { isConnected, isCorrectNetwork, address } = useWalletConnection()
  const { role, isLoading: isRoleLoading } = useUserRole()

  if (!isConnected) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', marginTop: '80px' }}>
          <h1>Welcome to NFT57B</h1>
          <p style={{ color: 'var(--text, #6b6375)', maxWidth: '480px', margin: '0 auto' }}>
            Connect your wallet to get started. Employee Recognition NFTs on
            Ethereum.
          </p>
        </div>
      </Layout>
    )
  }

  if (!isCorrectNetwork) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', marginTop: '80px' }}>
          <h1>Wrong Network</h1>
          <p style={{ color: 'var(--text, #6b6375)' }}>
            Please switch to the correct network using the badge in the header.
          </p>
        </div>
      </Layout>
    )
  }

  if (isRoleLoading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', marginTop: '80px' }}>
          <p style={{ color: 'var(--text, #6b6375)' }}>Loading your profile…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ textAlign: 'center', marginTop: '80px' }}>
        <h1>
          {role === 'admin' && '⚙️ Admin Dashboard'}
          {role === 'employee' && '🎉 Employee Portfolio'}
          {role === 'visitor' && '👋 Welcome'}
        </h1>
        <p style={{ color: 'var(--text, #6b6375)', fontSize: '14px' }}>
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
        <p style={{ color: 'var(--text, #6b6375)', marginTop: '16px' }}>
          {role === 'admin' && 'You have super admin privileges. Register companies from the sidebar.'}
          {role === 'employee' && 'Your NFTs will appear here once you receive recognition.'}
          {role === 'visitor' && 'Connect as an employee or register a company to get started.'}
        </p>
      </div>
    </Layout>
  )
}

function App() {
  return useRoutes([
    { path: '/', element: <HomePage /> },
    {
      path: '/dashboard',
      element: (
        <ProtectedRoute allowedRoles={['company_admin']}>
          <CompanyDashboard />
        </ProtectedRoute>
      ),
    },
    {
      path: '/portfolio',
      element: (
        <ProtectedRoute allowedRoles={['employee']}>
          <EmployeePortfolio />
        </ProtectedRoute>
      ),
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ])
}

export default App
