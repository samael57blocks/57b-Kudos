import { BADGE_CONFIG, type BadgeCategory } from '../../lib/recognition-data'

// ── Constants ─────────────────────────────────────────────────────────────────

const HEX_CLIP_PATH =
  'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)'

const SIZE_MAP = {
  sm: { outer: 56, inner: 50, fontSize: 18 },
  md: { outer: 80, inner: 72, fontSize: 26 },
  lg: { outer: 112, inner: 100, fontSize: 36 },
  xl: { outer: 160, inner: 144, fontSize: 52 },
} as const

// ── Types ─────────────────────────────────────────────────────────────────────

interface HexBadgeProps {
  category: BadgeCategory
  size?: keyof typeof SIZE_MAP
  selected?: boolean
  interactive?: boolean
  onClick?: () => void
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HexBadge({
  category,
  size = 'md',
  selected = false,
  interactive = false,
  onClick,
  className,
}: HexBadgeProps) {
  const config = BADGE_CONFIG[category]
  const { outer, inner, fontSize } = SIZE_MAP[size]
  const isClickable = interactive || !!onClick

  const baseClasses = [
    'hex-badge',
    'relative',
    'border-none p-0 bg-transparent',
    'transition-all duration-200',
    isClickable
      ? 'cursor-pointer hover:scale-110 active:scale-95'
      : 'cursor-default',
    selected ? 'ring-2 ring-offset-2' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const badgeStyle = {
    width: outer,
    height: outer,
    ...(selected ? { ringColor: config.color } : {}),
  }

  const outerHex = (
    <div
      className="absolute inset-0 transition-all duration-200"
      style={{
        clipPath: HEX_CLIP_PATH,
        background: config.color,
        opacity: selected ? 0.25 : 0.15,
      }}
    />
  )

  const innerHex = (
    <div
      className="absolute transition-all duration-200"
      style={{
        clipPath: HEX_CLIP_PATH,
        background: selected ? config.color : config.lightColor,
        width: inner,
        height: inner,
        top: '50%',
        left: '50%',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1,
      }}
    >
      <span
        style={{
          fontSize,
          color: selected ? '#fff' : config.color,
          lineHeight: 1,
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        {config.icon}
      </span>
    </div>
  )

  // Use <div> when non-interactive to avoid nested <button> issues
  if (!isClickable) {
    return (
      <div
        className={baseClasses}
        style={badgeStyle}
        aria-label={`${category} recognition badge`}
      >
        {outerHex}
        {innerHex}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClasses}
      style={badgeStyle}
      aria-label={`${category} recognition badge`}
      aria-pressed={selected || undefined}
    >
      {outerHex}
      {innerHex}
    </button>
  )
}
