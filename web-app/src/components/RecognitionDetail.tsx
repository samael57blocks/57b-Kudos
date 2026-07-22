import { Dialog } from './Dialog'
import { BADGE_CONFIG, type BadgeCategory } from '../lib/recognition-data'
import styles from './RecognitionDetail.module.css'
import { Badge } from './HexBadge/Badge'
import { useClaimNFT } from '../hooks/useClaimNFT'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecognitionDetailProps {
  category: BadgeCategory | null
  employeeName: string | null
  description: string | null
  tokenId: bigint | null
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
  tokenId,
  isOpen,
  onClose,
}: RecognitionDetailProps) {
  const { claim, step, error, reset } = useClaimNFT(tokenId ?? 0n)

  console.log('[RecognitionDetail] render, tokenId:', tokenId, 'step:', step, 'isDisabled:', !tokenId)

  if (!category) return null

  const config = BADGE_CONFIG[category]
  const initials = employeeName
    ? getInitials(employeeName)
    : '??'

  const isDisabled = tokenId == null || step === 'confirming' || step === 'success'

  const handleClaim = async () => {
    console.log('[RecognitionDetail] handleClaim called, tokenId:', tokenId)
    if (tokenId == null) {
      console.warn('[RecognitionDetail] No tokenId, returning early')
      return
    }
    try {
      await claim()
    } catch (err) {
      console.error('[RecognitionDetail] claim() threw:', err)
      // Error is handled by the hook
    }
  }

  const handleClose = () => {
    if (step === 'success') {
      reset()
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <div className={styles.dialog} style={{ '--category-color': config.color } as React.CSSProperties}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
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

          {error && (
            <p className={styles.description} role="alert">{error.message}</p>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.claimButton}
            onClick={handleClaim}
            disabled={isDisabled}
          >
            {step === 'confirming' ? 'Claiming...' : step === 'success' ? 'Claimed ✓' : 'Claim'}
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
