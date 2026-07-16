import { useAccount } from 'wagmi'
import { Layout } from '../components/Layout'
import { useMintCompanyId } from '../hooks/useMintCompanyId'
import { useCompanyEmployees } from '../hooks/useCompanyEmployees'
import { MinterMintForm } from '../components/MinterMintForm'
import styles from './MintNftPage.module.css'


// ── Component ─────────────────────────────────────────────────────────────────

export function MintNftPage() {
  const { isConnected } = useAccount()
  const {
    companyId,
    isLoading: isCompanyLoading,
    error: companyError,
  } = useMintCompanyId()
  const {
    employees,
    isLoading: isEmployeesLoading,
    error: employeesError,
  } = useCompanyEmployees(companyId ?? null)

  const resolveError = companyError ?? employeesError

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

        {resolveError && (
          <div className={styles.error} role="alert">
            {resolveError.message}
          </div>
        )}

        {isCompanyLoading || isEmployeesLoading ? (
          <div className={styles.loading}>Loading employees...</div>
        ) : companyId != null ? (
          <MinterMintForm companyId={companyId} employees={employees} />
        ) : null}
      </div>
    </Layout>
  )
}
