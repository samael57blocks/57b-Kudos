import { formatAddress } from '../utils/format'
import styles from './CompanyCard.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompanyCardProps {
  companyName: string
  companyId: bigint
  adminAddress: `0x${string}`
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Displays company information as a persistent card.
 *
 * Extracted from the inline `SuccessCard` in `CompanyRegistrationForm`.
 * Props-only — no hooks, no registration logic.
 */
export function CompanyCard({ companyName, companyId, adminAddress }: CompanyCardProps) {
  return (
    <div className={styles.card} role="status">
      <div className={styles.header}>
        <h3 className={styles.title}>
          Company ready on-chain
        </h3>
        <div className={styles.checkCircle}>✓</div>
      </div>

      <div className={styles.detailsGrid}>
        <span className={styles.label}>Name</span>
        <span className={styles.value}>{companyName}</span>

        <span className={styles.label}>Company ID</span>
        <span className={styles.value}>#{companyId.toString()}</span>

        <span className={styles.label}>Admin</span>
        <span className={styles.monoValue}>{formatAddress(adminAddress)}</span>
      </div>
    </div>
  )
}
