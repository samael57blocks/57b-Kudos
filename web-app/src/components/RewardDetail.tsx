import { Dialog } from './Dialog'
import styles from './RewardDetail.module.css'

interface RewardDetailProps {
  balance: string
  symbol?: string
  isOpen: boolean
  onClose: () => void
  onClaim: () => Promise<void>
  isClaiming: boolean
}

/**
 * Dialog showing BonusReward details with claim functionality.
 * Shows balance and a "Claim Rewards" button that burns the entire balance.
 */
export function RewardDetail({
  balance,
  symbol = '57BB',
  isOpen,
  onClose,
  onClaim,
  isClaiming,
}: RewardDetailProps) {
  const handleClaim = async () => {
    try {
      await onClaim()
    } catch {
      // Error handled by parent
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className={styles.dialog}>
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
            <div className={styles.coinIcon}>★</div>
            <h2 className={styles.title}>Bonus Reward</h2>
            <p className={styles.subtitle}>57Blocks Bonus Token</p>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className={styles.body}>
          <div className={styles.balanceSection}>
            <span className={styles.balanceLabel}>Your Balance</span>
            <span className={styles.balanceValue}>
              {balance} {symbol}
            </span>
          </div>

          <p className={styles.description}>
            Bonus Rewards are fungible tokens earned through recognition.
            Claiming will burn your entire balance.
          </p>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.claimButton}
            onClick={handleClaim}
            disabled={isClaiming || balance === '0'}
          >
            {isClaiming ? 'Claiming...' : 'Claim Rewards'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
