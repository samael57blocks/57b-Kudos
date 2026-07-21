import { Dialog } from './Dialog'
import { BADGE_CONFIG, type BadgeCategory } from '../lib/recognition-data'
import styles from './RecognitionDetail.module.css'
import { Badge } from './HexBadge/Badge'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecognitionDetailProps {
  category: BadgeCategory | null
  employeeName: string | null
  description: string | null
  isOpen: boolean
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Dialog showing recognition details for a specific category.
 *
 * Layout:
 * - Header: category color background, HexBadge with box-shadow, titles
 * - Body: white background, avatar + name, description in italic
 * - Footer: "Claim" button with category color
 */
export function RecognitionDetail({
  category,
  employeeName,
  description,
  isOpen,
  onClose,
}: RecognitionDetailProps) {
  if (!category) return null

  const config = BADGE_CONFIG[category]
  const initials = employeeName
    ? getInitials(employeeName)
    : '??'

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className={styles.dialog} style={{ '--category-color': config.color } as React.CSSProperties}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>

          <div className={styles.headerContent}>
            <div className={styles.badgeWrapper}>
              <Badge category={category} size='lg'></Badge>
            </div>
            <h2 className={styles.categoryName}>{category}</h2>
            <p className={styles.categoryTitle}>{config.description}</p>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className={styles.body}>
          <div className={styles.profile}>
            <div className={styles.avatar}>
              <span className={styles.initials}>{initials}</span>
            </div>
            <span className={styles.name}>{employeeName ?? 'Unknown'}</span>
          </div>

          {description && (
            <p className={styles.description}>"{description}"</p>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.claimButton}
            onClick={onClose}
          >
            Claim
          </button>
        </div>
      </div>
    </Dialog>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
