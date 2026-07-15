import { useAccount } from 'wagmi'
import { Layout } from '../components/Layout'
import { useCompanyId } from '../hooks/useCompanyId'
import { useCompanyEmployees } from '../hooks/useCompanyEmployees'
import { MinterMintForm } from '../components/MinterMintForm'
import styles from './MintNftPage.module.css'

// ── Component ─────────────────────────────────────────────────────────────────

export function MintNftPage() {
  const { address, isConnected } = useAccount()
  const { companyId, isLoading: isCompanyLoading } = useCompanyId(address)
  const { employees, isLoading: isEmployeesLoading } = useCompanyEmployees(
    companyId ?? null,
  )

  // ── Not connected ─────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <Layout>
        <div className={styles.connect}>
          <p>Connect your wallet to mint Kudos NFTs.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Mint Kudos NFT</h1>
        <p className={styles.subtitle}>
          Reward an employee with a recognition NFT.
        </p>

        {isCompanyLoading || isEmployeesLoading ? (
          <div className={styles.loading}>Loading employees...</div>
        ) : companyId != null ? (
          <MinterMintForm companyId={companyId} employees={employees} />
        ) : null}
      </div>
    </Layout>
  )
}
