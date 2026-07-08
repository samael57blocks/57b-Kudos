import { Link } from 'react-router-dom'
import { useReadContract } from 'wagmi'
import { Layout } from '../components/Layout'
import { JoinCompanySection } from '../components/JoinCompanySection'
import { useWalletConnection } from '../hooks/useWalletConnection'
import { useUserRole } from '../hooks/useUserRole'
import { useCompanyId } from '../hooks/useCompanyId'
import { useCompanyEmployees } from '../hooks/useCompanyEmployees'
import { useCompanyNFTs } from '../hooks/useCompanyNFTs'
import {
  COMPANY_REGISTRY_ABI,
  getContractAddresses,
} from '../config/contracts'

// ── Styles ─────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  padding: '32px 40px',
}

const cardRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap',
  marginBottom: '32px',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card, #f5f3f7)',
  borderRadius: '12px',
  padding: '20px 24px',
  flex: 1,
  minWidth: 200,
}

const statNumberStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: 'var(--accent, #aa3bff)',
  margin: '8px 0',
}

const statLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--text, #6b6375)',
  margin: 0,
}

const employeeItemStyle: React.CSSProperties = {
  padding: '8px 0',
  borderBottom: '1px solid var(--border, #e0dce6)',
  fontSize: '14px',
  color: 'var(--text, #6b6375)',
  fontFamily: 'monospace',
}

const linkStyle: React.CSSProperties = {
  color: 'var(--accent, #aa3bff)',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '14px',
}

const welcomeStyle: React.CSSProperties = {
  maxWidth: '480px',
  marginBottom: '32px',
}

// ── Component ──────────────────────────────────────────────────────────────────

function HomePage() {
  const { isConnected, isCorrectNetwork, address } = useWalletConnection()
  const { role, isLoading: isRoleLoading, employeeCompanyId } = useUserRole()
  const { companyId: adminCompanyId } = useCompanyId(
    role === 'admin' ? address : undefined,
  )

  // Admin uses their own company ID; employee uses the one from userRole
  const companyId =
    role === 'admin'
      ? adminCompanyId
      : role === 'employee' && employeeCompanyId !== undefined
        ? BigInt(employeeCompanyId)
        : null

  const { employees, isLoading: empLoading } = useCompanyEmployees(companyId)
  const { nfts, isLoading: nftLoading } = useCompanyNFTs(companyId)

  // Company name resolution
  const contracts = getContractAddresses()
  const { data: companyInfo } = useReadContract({
    address: contracts?.companyRegistry,
    abi: COMPANY_REGISTRY_ABI,
    functionName: 'getCompany',
    args: companyId !== null ? [companyId] : undefined,
    query: {
      enabled: !!contracts?.companyRegistry && companyId !== null,
    },
  })

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

  // ── Admin: metrics dashboard ──

  if (role === 'admin') {
    return (
      <Layout>
        <div style={sectionStyle}>
          <h1 style={{ marginBottom: '24px' }}>Company Overview</h1>

          {empLoading || nftLoading ? (
            <p style={{ color: 'var(--text, #6b6375)' }}>Loading metrics…</p>
          ) : (
            <>
              <div style={cardRowStyle}>
                <div style={cardStyle}>
                  <p style={statLabelStyle}>Total Employees</p>
                  <p style={statNumberStyle}>{employees.length}</p>
                </div>
                <div style={cardStyle}>
                  <p style={statLabelStyle}>Total NFTs Minted</p>
                  <p style={statNumberStyle}>{nfts.length}</p>
                </div>
              </div>

              {employees.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>
                    Latest Registered Employees
                  </h2>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {employees
                      .slice(-3)
                      .reverse()
                      .map((emp) => (
                        <li key={emp.employee} style={employeeItemStyle}>
                          {emp.employee.slice(0, 6)}...{emp.employee.slice(-4)}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <Link to="/company" style={linkStyle}>
                Go to Company Management →
              </Link>
            </>
          )}
        </div>
      </Layout>
    )
  }

  // ── Employee: company overview ──

  if (role === 'employee') {
    return (
      <Layout>
        <div style={sectionStyle}>
          <h1 style={{ marginBottom: '24px' }}>
            {companyInfo?.name ?? 'Your Company'}
          </h1>

          <p style={{ color: 'var(--text, #6b6375)', marginBottom: '24px', fontSize: '14px' }}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>

          {empLoading || nftLoading ? (
            <p style={{ color: 'var(--text, #6b6375)' }}>Loading metrics…</p>
          ) : (
            <>
              <div style={cardRowStyle}>
                <div style={cardStyle}>
                  <p style={statLabelStyle}>Coworkers</p>
                  <p style={statNumberStyle}>{employees.length}</p>
                </div>
                <div style={cardStyle}>
                  <p style={statLabelStyle}>Kudos Minted</p>
                  <p style={statNumberStyle}>{nfts.length}</p>
                </div>
              </div>

              <Link to="/portfolio" style={linkStyle}>
                View My Portfolio →
              </Link>
            </>
          )}
        </div>
      </Layout>
    )
  }

  // ── Visitor: join a company ──

  return (
    <Layout>
      <div style={sectionStyle}>
        <h1 style={{ marginBottom: '24px' }}>Welcome</h1>
        <p style={{ color: 'var(--text, #6b6375)', ...welcomeStyle }}>
          You are not yet registered to any company. Join one below to start
          receiving Kudos recognition NFTs.
        </p>

        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
          Available Companies
        </h2>

        <JoinCompanySection />
      </div>
    </Layout>
  )
}

export default HomePage
