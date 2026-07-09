import { useState } from 'react'
import { useCompanyNFTs } from '../hooks/useCompanyNFTs'
import { useTokenMetadata } from '../hooks/useTokenMetadata'
import type { NFTData } from '../hooks/useCompanyNFTs'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NFTTableProps {
  companyId: bigint
}

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  border: '1px solid var(--border, #e5e4e7)',
  borderRadius: '8px',
  background: 'var(--bg, #fff)',
  overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  borderBottom: '1px solid var(--border, #e5e4e7)',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontWeight: 600,
  color: 'var(--text-h, #08060d)',
  borderBottom: '1px solid var(--border, #e5e4e7)',
  background: 'var(--bg-subtle, #f8f8fa)',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderBottom: '1px solid var(--border, #e5e4e7)',
  color: 'var(--text, #6b6375)',
}

const filterInputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: '12px',
  border: '1px solid var(--border, #e5e4e7)',
  borderRadius: '4px',
  width: '140px',
}

const skeletonStyle: React.CSSProperties = {
  height: '16px',
  background: 'var(--bg-subtle, #f0f0f5)',
  borderRadius: '4px',
  animation: 'pulse 1.5s ease-in-out infinite',
}

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  color: 'var(--text, #6b6375)',
  fontSize: '14px',
}

const filterRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
}

const linkStyle: React.CSSProperties = {
  color: 'var(--accent, #aa3bff)',
  textDecoration: 'underline',
  fontSize: '12px',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncateAddress(addr: `0x${string}`): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function buildGatewayURL(uri: string): string {
  const cid = uri.replace('ipfs://', '')
  const gateway = import.meta.env.VITE_IPFS_GATEWAY ?? 'https://gateway.pinata.cloud'
  return `${gateway}/ipfs/${cid}`
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
      <td style={tdStyle}>#{nft.tokenId.toString()}</td>
      <td style={tdStyle}>{truncateAddress(nft.employee)}</td>
      <td style={tdStyle}>
        {isLoading ? (
          <div style={{ ...skeletonStyle, width: '60px' }} />
        ) : (
          resolvedValue || '—'
        )}
      </td>
      <td style={tdStyle}>
        {isLoading ? (
          <div style={{ ...skeletonStyle, width: '80px' }} />
        ) : (
          resolvedDate || '—'
        )}
      </td>
      <td style={tdStyle}>
        {nft.tokenURI ? (
          <a
            href={buildGatewayURL(nft.tokenURI)}
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
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
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Minted NFTs</h3>
        </div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Token ID</th>
              <th style={thStyle}>Employee</th>
              <th style={thStyle}>Value (ETH)</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} data-testid="skeleton-row">
                <td style={tdStyle}><div style={{ ...skeletonStyle, width: '40px' }} /></td>
                <td style={tdStyle}><div style={{ ...skeletonStyle, width: '120px' }} /></td>
                <td style={tdStyle}><div style={{ ...skeletonStyle, width: '60px' }} /></td>
                <td style={tdStyle}><div style={{ ...skeletonStyle, width: '80px' }} /></td>
                <td style={tdStyle}><div style={{ ...skeletonStyle, width: '50px' }} /></td>
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
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Minted NFTs</h3>
        </div>
        <div style={emptyStyle}>
          <p style={{ color: '#e53e3e' }}>Failed to load NFTs</p>
        </div>
      </div>
    )
  }

  // ── Render: Empty ─────────────────────────────────────────────────────────

  if (nfts.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Minted NFTs</h3>
        </div>
        <div style={emptyStyle}>
          <p>No NFTs minted yet</p>
        </div>
      </div>
    )
  }

  // ── Render: Data ──────────────────────────────────────────────────────────

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Minted NFTs</h3>
        <div style={filterRowStyle}>
          <input
            type="text"
            placeholder="Filter employee…"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            style={filterInputStyle}
            aria-label="Filter by employee address"
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Token ID</th>
              <th style={thStyle}>Employee</th>
              <th style={thStyle}>Value (ETH)</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Metadata</th>
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
