import { BADGE_CONFIG, type BadgeCategory } from '../../lib/recognition-data'
const HEX_CLIP_PATH =
    'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)'

const SIZE_MAP = {
  sm: { outer: 56, inner: 45, fontSize: 18 },
  md: { outer: 100, inner: 92, fontSize: 26 },
  lg: { outer: 160, inner: 160, fontSize: 36 },
} as const

interface HexBadgeProps {
  category: BadgeCategory
  size?: keyof typeof SIZE_MAP
}

export const Badge = ({
  category,
  size = 'md'
}: HexBadgeProps) => {

    const config = BADGE_CONFIG[category]
    const { outer, fontSize } = SIZE_MAP[size]

    const outerHex = (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                clipPath: HEX_CLIP_PATH,
                background: config.lightColor,
            }}
        />
    )

    const innerHex = (
        <div
            style={{
                position: "absolute",
                inset: 4,
                clipPath: HEX_CLIP_PATH,
                background: config.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
            <span
                style={{
                    fontSize,
                    color: '#fff',
                    lineHeight: 1,
                    userSelect: 'none',
                }}
                aria-hidden="true"
            >
                {config.icon}
            </span>
        </div>
    )

    return (
        <div 
            style={{
                position: 'relative',
                width: outer,
                height: outer,
                padding: 0,
            }}
            >
            {size !== 'lg' && outerHex}
            {innerHex}
        </div>
    )
}