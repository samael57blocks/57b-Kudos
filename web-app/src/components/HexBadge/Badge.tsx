import { BADGE_CONFIG, type BadgeCategory } from '../../lib/recognition-data'
const HEX_CLIP_PATH =
  'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)'

const SIZE_MAP = {
  sm: { outer: 56, inner: 50, fontSize: 18 },
  md: { outer: 80, inner: 72, fontSize: 26 },
  lg: { outer: 112, inner: 100, fontSize: 36 },
  xl: { outer: 160, inner: 144, fontSize: 52 },
} as const

interface HexBadgeProps {
  category: BadgeCategory
  size?: keyof typeof SIZE_MAP
  selected?: boolean
  interactive?: boolean
  onClick?: () => void
  className?: string
}

export function Badge({ category, size = 'md', selected = false }: HexBadgeProps) {

    const config = BADGE_CONFIG[category]
    const { outer, inner, fontSize } = SIZE_MAP[size]
    const baseClasses = [
        'hex-badge',
        'relative',
        'border-none p-0 bg-transparent',
        'transition-all duration-200',
    ]
        .filter(Boolean)
        .join(' ')

    const outerHex = (
        <div
            className="absolute inset-0 transition-all duration-200"
            style={{
                clipPath: HEX_CLIP_PATH,
                background: "#06B6D4",
                opacity: true ? 0.25 : 0.15,
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
            transform: 'translate(0%, 0%)',
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

    const badgeStyle = {
    width: outer,
    height: outer,
    ...(true ? { ringColor: "#06B6D4" } : {}),
  }


    return(
        <button
            type="button"
            //onClick={onClick}
            className={baseClasses}
            style={badgeStyle}
            //aria-label={`${category} recognition badge`}
            //aria-pressed={selected || undefined}
        >
            {outerHex}
            {innerHex}
        </button>
    )
}