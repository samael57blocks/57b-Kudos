import { MintNFTForm } from '../components/MintNFTForm'
import { NFTTable } from '../components/NFTTable'
import { EmployeeList } from '../components/EmployeeList'
import styles from './CompanyDashboard.module.css'

interface CompanyDashboardSectionProps {
  companyId: bigint
}

export function CompanyDashboardSection({ companyId }: CompanyDashboardSectionProps) {
  return (
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
  )
}
