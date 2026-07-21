import type { CategoryGroup } from '../hooks/usePortfolioData'
import type { BadgeCategory } from '../lib/recognition-data'
import styles from './RecognitionGallery.module.css'
import { Badge } from './HexBadge/Badge'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecognitionGalleryProps {
  categories: CategoryGroup[]
  isLoading: boolean
  onSelect?: (category: BadgeCategory) => void
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonBadge() {
  return <div className={styles.skeletonBadge} />
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Displays recognition categories as a HexBadge grid.
 * Each badge shows the category icon and name with a count.
 */
export function RecognitionGallery({ categories, isLoading, onSelect }: RecognitionGalleryProps) {
  if (isLoading) {
    return (
      <div className={styles.section}>
        <h2 className={styles.title}>Recognition Portfolio</h2>
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBadge key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className={styles.section}>
        <h2 className={styles.title}>Recognition Portfolio</h2>
        <div className={styles.empty}>
          <p className={styles.emptyText}>No recognitions yet</p>
          <p className={styles.emptySubtext}>
            Your recognition badges will appear here once you receive them.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Recognition Portfolio</h2>
      <div className={styles.grid}>
        {categories.map(({ category, count }) => (
          <button
            key={category}
            type="button"
            className={styles.badgeItem}
            onClick={() => onSelect?.(category)}
          >
            <Badge category={category}/>
            <span className={styles.categoryName}>{category}</span>
            {count > 1 && (
              <span className={styles.badgeCount}>×{count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
