import { HexBadge } from './HexBadge/HexBadge'
import { BADGE_CONFIG, type BadgeCategory } from '../lib/recognition-data'
import styles from './CategoryPicker.module.css'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = Object.keys(BADGE_CONFIG) as BadgeCategory[]

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategoryPickerProps {
  value: BadgeCategory | ''
  onChange: (category: BadgeCategory) => void
  disabled?: boolean
  error?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CategoryPicker({
  value,
  onChange,
  disabled = false,
  error,
}: CategoryPickerProps) {
  return (
    <fieldset className={styles.fieldset} disabled={disabled}>
      <legend className={styles.legend}>Recognition Category</legend>
      <div className={styles.grid}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={[
              styles.option,
              value === cat ? styles.optionSelected : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <HexBadge category={cat} size="sm" selected={value === cat} />
            <span className={styles.label}>{cat}</span>
          </button>
        ))}
      </div>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </fieldset>
  )
}
