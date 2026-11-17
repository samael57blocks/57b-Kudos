import styles from './ProfileHeader.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileHeaderProps {
  employeeName: string | null
  address: string
  totalRecognitions: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract initials from a full name.
 * "John Doe" → "JD", "Alice" → "A"
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase()
}

/**
 * Format wallet address for display: 0x1234...abcd
 */
function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileHeader({
  employeeName,
  address,
  totalRecognitions,
}: ProfileHeaderProps) {
  const displayName = employeeName ?? formatAddress(address)
  const initials = employeeName ? getInitials(employeeName) : address.slice(2, 4).toUpperCase()

  return (
    <div className={styles.header}>
      {/* Avatar */}
      <div className={styles.avatar}>
        <span className={styles.initials}>{initials}</span>
      </div>

      {/* Info */}
      <div className={styles.info}>
        <h1 className={styles.name}>{displayName}</h1>
        <p className={styles.count}>
          <span className={styles.countNumber}>{totalRecognitions}</span>{' '}
          recognition{totalRecognitions !== 1 ? 's' : ''} received
        </p>
      </div>
    </div>
  )
}
