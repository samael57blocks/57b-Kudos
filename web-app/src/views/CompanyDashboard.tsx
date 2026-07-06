import { useAccount } from 'wagmi'
import { useCompanyId } from '../hooks/useCompanyId'
import { Layout } from '../components/Layout'
import { MintNFTForm } from '../components/MintNFTForm'
import { NFTTable } from '../components/NFTTable'
import { EmployeeList } from '../components/EmployeeList'

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '22px',
  fontWeight: 700,
  color: 'var(--text-h, #08060d)',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '380px 1fr',
  gap: '24px',
  alignItems: 'start',
}

const rightColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
}

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '80px',
  color: 'var(--text, #6b6375)',
}

const loadingStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '80px',
  color: 'var(--text, #6b6375)',
}

// Responsive grid: stack columns on narrow screens
const RESPONSIVE_CSS = `
@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr !important;
  }
}
`

// ── Component ─────────────────────────────────────────────────────────────────

export function CompanyDashboard() {
  const { address, isConnected } = useAccount()
  const { companyId, isLoading } = useCompanyId(address)

  // ── Not connected ─────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <Layout>
        <div style={emptyStyle}>
          <p>Connect your wallet to access the dashboard.</p>
        </div>
      </Layout>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Layout>
        <div style={loadingStyle}>
          <p>Loading dashboard…</p>
        </div>
      </Layout>
    )
  }

  // ── Not a company admin ───────────────────────────────────────────────────

  if (!companyId) {
    return (
      <Layout>
        <div style={emptyStyle}>
          <p>You are not registered as a company admin</p>
        </div>
      </Layout>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div style={containerStyle}>
        <style>{RESPONSIVE_CSS}</style>

        <h1 style={titleStyle}>Company Dashboard</h1>

        <div className="dashboard-grid" style={gridStyle}>
          {/* Left Column: Form */}
          <div>
            <MintNFTForm companyId={companyId} />
          </div>

          {/* Right Column: Tables */}
          <div style={rightColumnStyle}>
            <NFTTable companyId={companyId} />
            <EmployeeList companyId={companyId} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
