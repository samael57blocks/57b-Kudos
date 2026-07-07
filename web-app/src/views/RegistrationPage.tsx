import { useAccount } from 'wagmi'
import { useUserRole } from '../hooks/useUserRole'
import { Layout } from '../components/Layout'
import { CompanyRegistrationForm } from '../components/CompanyRegistrationForm'
import { EmployeeRegistration } from '../components/EmployeeRegistration'

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

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '80px',
  color: 'var(--text, #6b6375)',
}

const RESPONSIVE_CSS = `
@media (max-width: 900px) {
  .registration-grid {
    grid-template-columns: 1fr !important;
  }
}
`

// ── Component ─────────────────────────────────────────────────────────────────

export function RegistrationPage() {
  const { address } = useAccount()
  const { role } = useUserRole()

  // ── Not connected ─────────────────────────────────────────────────────────

  if (!address) {
    return (
      <Layout>
        <div style={emptyStyle}>
          <p>Connect your wallet to register</p>
        </div>
      </Layout>
    )
  }

  // ── Employee (already registered) ─────────────────────────────────────────

  if (role === 'employee') {
    return (
      <Layout>
        <div style={emptyStyle}>
          <p>You are already registered to a company</p>
        </div>
      </Layout>
    )
  }

  // ── Admin: both forms in grid ─────────────────────────────────────────────

  if (role === 'admin') {
    return (
      <Layout>
        <div style={containerStyle}>
          <style>{RESPONSIVE_CSS}</style>
          <h1 style={titleStyle}>Registration</h1>
          <div className="registration-grid" style={gridStyle}>
            <CompanyRegistrationForm />
            <EmployeeRegistration />
          </div>
        </div>
      </Layout>
    )
  }

  // ── Visitor (connected, no role): employee registration only ──────────────

  return (
    <Layout>
      <div style={containerStyle}>
        <h1 style={titleStyle}>Employee Registration</h1>
        <EmployeeRegistration />
      </div>
    </Layout>
  )
}
