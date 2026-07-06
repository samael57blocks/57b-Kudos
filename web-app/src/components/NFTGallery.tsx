import { useMemo, useState } from 'react'
import { RecognitionBadge } from './RecognitionBadge'
import type { EmployeeNFTData } from '../hooks/useEmployeeNFTs'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NFTGalleryProps {
  nfts: EmployeeNFTData[]
  isLoading: boolean
  error: Error | null
  onSelect: (nft: EmployeeNFTData) => void
}

// ── Styles ────────────────────────────────────────────────────────────────────

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '16px',
}

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--border, #e5e4e7)',
  borderRadius: '12px',
  padding: '20px',
  background: 'var(--bg, #fff)',
  cursor: 'pointer',
  transition: 'box-shadow 0.15s, transform 0.15s',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const skeletonStyle: React.CSSProperties = {
  border: '1px solid var(--border, #e5e4e7)',
  borderRadius: '12px',
  padding: '20px',
  background: 'var(--bg, #fff)',
  height: '160px',
  animation: 'pulse 1.5s ease-in-out infinite',
}

const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginBottom: '20px',
  flexWrap: 'wrap',
  alignItems: 'center',
}

const filterLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text, #6b6375)',
}

const selectStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border, #e5e4e7)',
  fontSize: '13px',
  background: 'var(--bg, #fff)',
  color: 'var(--text-h, #08060d)',
}

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '60px 20px',
  color: 'var(--text, #6b6375)',
}

const errorStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  color: '#ef4444',
  background: '#fef2f2',
  borderRadius: '12px',
  border: '1px solid #fecaca',
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return <div data-testid="nft-skeleton" style={skeletonStyle} />
}

// ── NFT Card ──────────────────────────────────────────────────────────────────

interface NFTCardProps {
  nft: EmployeeNFTData
  onSelect: (nft: EmployeeNFTData) => void
}

function NFTCard({ nft, onSelect }: NFTCardProps) {
  return (
    <article
      style={cardStyle}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-h, #08060d)' }}>
          #{nft.tokenId.toString()}
        </span>
        <RecognitionBadge value={Number(nft.tokenId)} />
      </div>
      <span style={{ fontSize: '13px', color: 'var(--text, #6b6375)' }}>
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
    <div style={filterBarStyle}>
      <label style={filterLabelStyle} htmlFor="company-filter">
        Company
      </label>
      <select
        id="company-filter"
        style={selectStyle}
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
      <div style={gridStyle}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={errorStyle} role="alert">
        <p style={{ fontWeight: 600, marginBottom: '4px' }}>Failed to load NFTs</p>
        <p style={{ fontSize: '13px' }}>{error.message}</p>
      </div>
    )
  }

  // Empty state
  if (nfts.length === 0) {
    return (
      <div style={emptyStyle}>
        <p style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
          No recognition NFTs yet
        </p>
        <p style={{ fontSize: '13px' }}>
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
      <div style={gridStyle}>
        {filteredNfts.map((nft) => (
          <NFTCard key={nft.tokenId.toString()} nft={nft} onSelect={onSelect} />
        ))}
      </div>
    </>
  )
}
