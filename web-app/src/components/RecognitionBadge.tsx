import type { ReactElement } from 'react'
import styles from './RecognitionBadge.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecognitionBadgeProps {
  value?: bigint | string | number
  label?: string
}

// ── Color mapping ─────────────────────────────────────────────────────────────

function badgeColor(value: bigint | string | number): string {
  const num = typeof value === 'bigint' ? Number(value) : Number(value)
  if (num < 10) return '#22c55e' // green
  if (num < 50) return '#f59e0b' // amber
  return '#a855f7' // purple
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Small colored pill badge representing a recognition value or category.
 *
 * Color mapping:
 * - value < 10  → green
 * - value 10–49 → amber
 * - value ≥ 50  → purple
 *
 * If `label` is provided, it is shown instead of the numeric value.
 * If neither value nor label is provided, renders nothing.
 */
export function RecognitionBadge({
  value,
  label,
}: RecognitionBadgeProps): ReactElement | null {
  if (value === undefined && label === undefined) return null

  const bg = value !== undefined ? badgeColor(value) : '#6b7280'
  const text = label ?? String(value)

  return (
    <span
      className={styles.pill}
      style={{ '--badge-color': bg } as React.CSSProperties}
    >
      {text}
    </span>
  )
}
