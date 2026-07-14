import { useState } from 'react'
import { useCompanyNFTs } from '../hooks/useCompanyNFTs'
import { useTokenMetadata } from '../hooks/useTokenMetadata'
import type { NFTData } from '../hooks/useCompanyNFTs'
import { formatAddress } from '../utils/format'
import { gatewayURL } from '../utils/ipfs'
import styles from './NFTTable.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NFTTableProps {
  companyId: bigint
}

// ── NFTTableRow sub-component ─────────────────────────────────────────────────

/**
 * Render a single NFT table row with IPFS metadata resolution.
 *
 * Extracted as a separate component so each row can independently call
 * the `useTokenMetadata` hook (hooks cannot be called inside loops/map).
 */
function NFTTableRow({ nft }: { nft: NFTData }) {
  const { data: metadata, isLoading, error } = useTokenMetadata(nft.tokenURI)

  const isFallback = isLoading || error || !metadata

  const resolvedValue = isFallback
    ? nft.value
    : extractAttribute(metadata, 'Value') ?? nft.value

  const resolvedDate = isFallback
    ? nft.date
    : extractAttribute(metadata, 'Date') ?? nft.date

  return (
    <tr>
      <td className={styles.td}>#{nft.tokenId.toString()}</td>
      <td className={styles.td}>{formatAddress(nft.employee)}</td>
      <td className={styles.td}>
        {isLoading ? (
          <div className={styles.skeleton} style={{ width: '60px' }} />
        ) : (
          resolvedValue || '—'
        )}
      </td>
      <td className={styles.td}>
        {isLoading ? (
          <div className={styles.skeleton} style={{ width: '80px' }} />
        ) : (
          resolvedDate || '—'
        )}
      </td>
      <td className={styles.td}>
        {nft.tokenURI ? (
          <a
            href={gatewayURL(nft.tokenURI.replace('ipfs://', ''))}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            View
          </a>
        ) : (
          <span style={{ color: '#ccc' }}>—</span>
        )}
      </td>
    </tr>
  )
}

/**
 * Extract an attribute value by trait_type from IPFS metadata attributes array.
 */
function extractAttribute(
  metadata: Record<string, unknown>,
  traitType: string,
): string | undefined {
  const attributes = metadata.attributes
  if (!Array.isArray(attributes)) return undefined
  const attr = attributes.find(
    (a: unknown) =>
      typeof a === 'object' &&
      a !== null &&
      (a as Record<string, unknown>).trait_type === traitType,
  )
  if (!attr) return undefined
  const val = (attr as Record<string, unknown>).value
  return typeof val === 'string' ? val : undefined
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NFTTable({ companyId }: NFTTableProps) {
  const { nfts, isLoading, error } = useCompanyNFTs(companyId)

  // Filters
  const [employeeFilter, setEmployeeFilter] = useState('')

  // ── Derived data ──────────────────────────────────────────────────────────

  const filteredNFTs = nfts.filter((nft) => {
    if (employeeFilter) {
      const addr = nft.employee.toLowerCase()
      const filter = employeeFilter.toLowerCase()
      if (!addr.includes(filter)) return false
    }
    return true
  })

  // ── Render: Loading ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.headerTitle}>Minted NFTs</h3>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Token ID</th>
              <th className={styles.th}>Employee</th>
              <th className={styles.th}>Value (ETH)</th>
              <th className={styles.th}>Date</th>
              <th className={styles.th}>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} data-testid="skeleton-row">
                <td className={styles.td}><div className={styles.skeleton} style={{ width: '40px' }} /></td>
                <td className={styles.td}><div className={styles.skeleton} style={{ width: '120px' }} /></td>
                <td className={styles.td}><div className={styles.skeleton} style={{ width: '60px' }} /></td>
                <td className={styles.td}><div className={styles.skeleton} style={{ width: '80px' }} /></td>
                <td className={styles.td}><div className={styles.skeleton} style={{ width: '50px' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Render: Error ─────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.headerTitle}>Minted NFTs</h3>
        </div>
        <div className={styles.empty}>
          <p style={{ color: '#e53e3e' }}>Failed to load NFTs</p>
        </div>
      </div>
    )
  }

  // ── Render: Empty ─────────────────────────────────────────────────────────

  if (nfts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.headerTitle}>Minted NFTs</h3>
        </div>
        <div className={styles.empty}>
          <p>No NFTs minted yet</p>
        </div>
      </div>
    )
  }

  // ── Render: Data ──────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>Minted NFTs</h3>
        <div className={styles.filterRow}>
          <input
            type="text"
            placeholder="Filter employee…"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className={styles.filterInput}
            aria-label="Filter by employee address"
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Token ID</th>
              <th className={styles.th}>Employee</th>
              <th className={styles.th}>Value (ETH)</th>
              <th className={styles.th}>Date</th>
              <th className={styles.th}>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {filteredNFTs.map((nft) => (
              <NFTTableRow key={nft.tokenId.toString()} nft={nft} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
