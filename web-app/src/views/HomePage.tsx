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
import styles from './HomePage.module.css'

// ── Component ──────────────────────────────────────────────────────────────────

function HomePage() {
  const { isConnected, isCorrectNetwork, address } = useWalletConnection()
  const { role, isLoading: isRoleLoading, employeeCompanyId, refetchRole } = useUserRole()
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
        <div className={styles.centerMessage}>
          <h1>Welcome to NFT57B</h1>
          <p className={styles.mutedTextBody}>
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
        <div className={styles.centerMessage}>
          <h1>Wrong Network</h1>
          <p className={styles.mutedText}>
            Please switch to the correct network using the badge in the header.
          </p>
        </div>
      </Layout>
    )
  }

  if (isRoleLoading) {
    return (
      <Layout>
        <div className={styles.centerMessage}>
          <p className={styles.mutedText}>Loading your profile…</p>
        </div>
      </Layout>
    )
  }

  // ── Admin: metrics dashboard ──

  if (role === 'admin') {
    return (
      <Layout>
        <div className={styles.section}>
          <h1 className={styles.headingSpacer}>Company Overview</h1>

          {empLoading || nftLoading ? (
            <p className={styles.mutedText}>Loading metrics…</p>
          ) : (
            <>
              <div className={styles.cardRow}>
                <div className={styles.card}>
                  <p className={styles.statLabel}>Total Employees</p>
                  <p className={styles.statNumber}>{employees.length}</p>
                </div>
                <div className={styles.card}>
                  <p className={styles.statLabel}>Total NFTs Minted</p>
                  <p className={styles.statNumber}>{nfts.length}</p>
                </div>
              </div>

              {employees.length > 0 && (
                <div className={styles.sectionSpacer}>
                  <h2 className={styles.subHeading}>
                    Latest Registered Employees
                  </h2>
                  <ul className={styles.listReset}>
                    {employees
                      .slice(-3)
                      .reverse()
                      .map((emp) => (
                        <li key={emp.employee} className={styles.employeeItem}>
                          {emp.employee.slice(0, 6)}...{emp.employee.slice(-4)}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <Link to="/company" className={styles.link}>
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
        <div className={styles.section}>
          <h1 className={styles.bodySpacer}>
            {companyInfo?.name ?? 'Your Company'}
          </h1>

          <p className={styles.sectionSubtitle}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>

          {empLoading || nftLoading ? (
            <p className={styles.mutedText}>Loading metrics…</p>
          ) : (
            <>
              <div className={styles.cardRow}>
                <div className={styles.card}>
                  <p className={styles.statLabel}>Coworkers</p>
                  <p className={styles.statNumber}>{employees.length}</p>
                </div>
                <div className={styles.card}>
                  <p className={styles.statLabel}>Kudos Minted</p>
                  <p className={styles.statNumber}>{nfts.length}</p>
                </div>
              </div>

              <Link to="/portfolio" className={styles.link}>
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
      <div className={styles.section}>
        <h1 className={styles.welcomeHeading}>Welcome</h1>
        <p className={styles.welcomeBody}>
          You are not yet registered to any company. Join one below to start
          receiving Kudos recognition NFTs.
        </p>

        <h2 className={styles.subHeadingLg}>
          Available Companies
        </h2>

        <JoinCompanySection
          employeeCompanyId={employeeCompanyId}
          onJoinSuccess={refetchRole}
        />
      </div>
    </Layout>
  )
}

export default HomePage
