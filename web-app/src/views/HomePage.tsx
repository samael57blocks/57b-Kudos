import { Link } from 'react-router-dom'
import { useReadContract } from 'wagmi'
import { useWalletConnection } from '../hooks/useWalletConnection'
import { useUserRole } from '../hooks/useUserRole'
import { useCompanyId } from '../hooks/useCompanyId'
import { useCompanyEmployees } from '../hooks/useCompanyEmployees'
import { useCompanyNFTs } from '../hooks/useCompanyNFTs'
import {
  COMPANY_REGISTRY_ABI,
  getContractAddresses,
} from '../config/contracts'
import { CompanyDashboardSection } from './CompanyDashboardSection'
import { MinterDashboardSection } from './MinterDashboardSection'
import styles from './HomePage.module.css'

// ── Component ──────────────────────────────────────────────────────────────────

function HomePage() {
  const { isConnected, isCorrectNetwork, address } = useWalletConnection()
  const { role, isLoading: isRoleLoading, employeeCompanyId } = useUserRole()
  const { companyId: adminCompanyId } = useCompanyId(
    role === 'admin' || role === 'company_admin' ? address : undefined,
  )

  // Admin and company_admin use their own company ID; employee/minter use the one from userRole
  const companyId =
    role === 'admin' || role === 'company_admin'
      ? adminCompanyId
      : (role === 'employee' || role === 'minter') && employeeCompanyId !== undefined
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
      <div className={styles.centerMessage}>
        <h1>Welcome to NFT57B</h1>
        <p className={styles.mutedTextBody}>
          Connect your wallet to get started. Employee Recognition NFTs on
          Ethereum.
        </p>
      </div>
    )
  }

  if (!isCorrectNetwork) {
    return (
      <div className={styles.centerMessage}>
        <h1>Wrong Network</h1>
        <p className={styles.mutedText}>
          Please switch to the correct network using the badge in the header.
        </p>
      </div>
    )
  }

  if (isRoleLoading) {
    return (
      <div className={styles.centerMessage}>
        <p className={styles.mutedText}>Loading your profile…</p>
      </div>
    )
  }

  // ── Admin: metrics dashboard ──

  if (role === 'admin') {
    return (
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
    )
  }

  // ── Company admin: dashboard section ──

  if (role === 'company_admin' && companyId !== null) {
    return <CompanyDashboardSection companyId={companyId} />
  }

  // ── Minter: dashboard section ──

  if (role === 'minter') {
    return <MinterDashboardSection companyId={companyId} />
  }

  // ── Employee: company overview ──

  if (role === 'employee') {
    return (
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
    )
  }

  // ── Visitor: contact admin message ──

  return (
    <div className={styles.section}>
      <h1 className={styles.welcomeHeading}>Welcome</h1>
      <p className={styles.welcomeBody}>
        Your admin needs to add you as an employee before you can start
        receiving Kudos.
      </p>
    </div>
  )
}

export default HomePage
