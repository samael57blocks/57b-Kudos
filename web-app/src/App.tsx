import { Layout } from './components/Layout'
import { useWalletConnection } from './hooks/useWalletConnection'
import { useUserRole } from './hooks/useUserRole'

function App() {
  const { isConnected, isCorrectNetwork, address } = useWalletConnection()
  const { role, isLoading: isRoleLoading } = useUserRole()

  // ── Not connected ────────────────────────────────────────
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

  // ── Wrong network ────────────────────────────────────────
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

  // ── Connected + loading role ─────────────────────────────
  if (isRoleLoading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', marginTop: '80px' }}>
          <p style={{ color: 'var(--text, #6b6375)' }}>Loading your profile…</p>
        </div>
      </Layout>
    )
  }

  // ── Connected + role detected ───────────────────────────
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

export default App
