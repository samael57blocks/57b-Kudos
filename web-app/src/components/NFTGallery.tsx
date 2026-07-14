import { useMemo, useState } from 'react'
import { RecognitionBadge } from './RecognitionBadge'
import type { EmployeeNFTData } from '../hooks/useEmployeeNFTs'
import styles from './NFTGallery.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NFTGalleryProps {
  nfts: EmployeeNFTData[]
  isLoading: boolean
  error: Error | null
  onSelect: (nft: EmployeeNFTData) => void
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return <div data-testid="nft-skeleton" className={styles.skeleton} />
}

// ── NFT Card ──────────────────────────────────────────────────────────────────

interface NFTCardProps {
  nft: EmployeeNFTData
  onSelect: (nft: EmployeeNFTData) => void
}

function NFTCard({ nft, onSelect }: NFTCardProps) {
  return (
    <article
      className={styles.card}
      onClick={() => onSelect(nft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(nft)
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`NFT #${nft.tokenId} from ${nft.companyName ?? 'unknown company'}`}
    >
      <div className={styles.cardHeader}>
        <span className={styles.tokenId}>
          #{nft.tokenId.toString()}
        </span>
        <RecognitionBadge value={Number(nft.tokenId)} />
      </div>
      <span className={styles.companyName}>
        {nft.companyName ?? 'Unknown Company'}
      </span>
    </article>
  )
}

// ── Filter bar ────────────────────────────────────────────────────────────────

interface FilterState {
  company: string
}

interface FilterBarProps {
  companies: string[]
  filter: FilterState
  onChange: (filter: FilterState) => void
}

function FilterBar({ companies, filter, onChange }: FilterBarProps) {
  return (
    <div className={styles.filterBar}>
      <label className={styles.filterLabel} htmlFor="company-filter">
        Company
      </label>
      <select
        id="company-filter"
        className={styles.select}
        value={filter.company}
        onChange={(e) => onChange({ ...filter, company: e.target.value })}
        aria-label="Filter by company"
      >
        <option value="">All Companies</option>
        {companies.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Gallery of NFT cards displayed in a responsive CSS grid.
 *
 * Supports:
 * - Loading state (6 skeleton cards with pulse animation)
 * - Empty state (centered message)
 * - Error state (inline error banner)
 * - Client-side filtering by company name
 * - Card click invokes onSelect with the NFT data
 */
export function NFTGallery({ nfts, isLoading, error, onSelect }: NFTGalleryProps) {
  const [filter, setFilter] = useState<FilterState>({ company: '' })

  // Derive unique company names from the data
  const companies = useMemo(() => {
    const names = new Set<string>()
    for (const nft of nfts) {
      if (nft.companyName) names.add(nft.companyName)
    }
    return Array.from(names).sort()
  }, [nfts])

  // Apply filters
  const filteredNfts = useMemo(() => {
    return nfts.filter((nft) => {
      if (filter.company && nft.companyName !== filter.company) return false
      return true
    })
  }, [nfts, filter])

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={styles.error} role="alert">
        <p className={styles.errorTitle}>Failed to load NFTs</p>
        <p className={styles.errorMessage}>{error.message}</p>
      </div>
    )
  }

  // Empty state
  if (nfts.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>
          No recognition NFTs yet
        </p>
        <p className={styles.emptyDescription}>
          Your recognition NFTs will appear here once you receive them.
        </p>
      </div>
    )
  }

  return (
    <>
      {companies.length > 1 && (
        <FilterBar
          companies={companies}
          filter={filter}
          onChange={setFilter}
        />
      )}
      <div className={styles.grid}>
        {filteredNfts.map((nft) => (
          <NFTCard key={nft.tokenId.toString()} nft={nft} onSelect={onSelect} />
        ))}
      </div>
    </>
  )
}
