import type { ReactElement } from 'react'

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

// ── Styles ────────────────────────────────────────────────────────────────────

const pillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#fff',
  lineHeight: '20px',
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

  return <span style={{ ...pillStyle, backgroundColor: bg }}>{text}</span>
}
