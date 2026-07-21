import { BADGE_CONFIG, type BadgeCategory } from '../lib/recognition-data'
import styles from './CategoryPicker.module.css'
import { Badge } from './HexBadge/Badge'

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
      <legend className={styles.legend}>Select a Recognition Category </legend>
      <div className={styles.grid}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={styles.option}
            style={{ 
              borderColor: value === cat ? BADGE_CONFIG[cat].color : '#fff',
              background: value === cat ? BADGE_CONFIG[cat].lightColor : '#f5f3f7'
            }}
          >
            <Badge category={cat} size='sm'></Badge>
            <span
              style={{
                color: value === cat ? BADGE_CONFIG[cat].color : '#6b6375'
              }} 
              className={styles.label}>
              {cat}
            </span>
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
