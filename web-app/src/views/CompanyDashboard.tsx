import { useAccount } from 'wagmi'
import { useCompanyId } from '../hooks/useCompanyId'
import { Layout } from '../components/Layout'
import { MintNFTForm } from '../components/MintNFTForm'
import { NFTTable } from '../components/NFTTable'
import { EmployeeList } from '../components/EmployeeList'
import styles from './CompanyDashboard.module.css'

// ── Component ─────────────────────────────────────────────────────────────────

export function CompanyDashboard() {
  const { address, isConnected } = useAccount()
  const { companyId, isLoading } = useCompanyId(address)

  // ── Not connected ─────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <Layout>
        <div className={styles.empty}>
          <p>Connect your wallet to access the dashboard.</p>
        </div>
      </Layout>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Layout>
        <div className={styles.loading}>
          <p>Loading dashboard…</p>
        </div>
      </Layout>
    )
  }

  // ── Not a company admin ───────────────────────────────────────────────────

  if (!companyId) {
    return (
      <Layout>
        <div className={styles.empty}>
          <p>You are not registered as a company admin</p>
        </div>
      </Layout>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Company Dashboard</h1>

        <div className={styles.dashboardGrid}>
          {/* Left Column: Form */}
          <div>
            <MintNFTForm companyId={companyId} />
          </div>

          {/* Right Column: Tables */}
          <div className={styles.rightColumn}>
            <NFTTable companyId={companyId} />
            <EmployeeList companyId={companyId} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
