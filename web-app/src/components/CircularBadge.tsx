import styles from './CircularBadge.module.css'

interface CircularBadgeProps {
  amount: string
  symbol?: string
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

/**
 * Circular badge/coin showing a token balance.
 * Used for BonusReward display in the rewards section.
 */
export function CircularBadge({
  amount,
  symbol = '57BB',
  size = 'md',
  onClick,
}: CircularBadgeProps) {
  return (
    <button
      type="button"
      className={`${styles.badge} ${styles[size]}`}
      onClick={onClick}
      aria-label={`${amount} ${symbol}`}
    >
      <div className={styles.outerRing}>
        <div className={styles.innerCircle}>
          <span className={styles.icon}>★</span>
          <span className={styles.amount}>{amount}</span>
          <span className={styles.symbol}>{symbol}</span>
        </div>
      </div>
    </button>
  )
}
