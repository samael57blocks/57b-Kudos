import { formatAddress } from '../utils/format'

// ── Styles ────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '24px',
  border: '1px solid var(--border, #e5e4e7)',
  borderRadius: '8px',
  background: 'var(--bg, #fff)',
}

const checkCircleStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  background: '#e6f7e6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  color: '#38a169',
}

const detailsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px 1fr',
  gap: '8px 12px',
  fontSize: '13px',
  padding: '12px',
  background: '#f9f9fb',
  borderRadius: '6px',
}

const labelStyle: React.CSSProperties = {
  color: '#666',
}

const valueStyle: React.CSSProperties = {
  fontWeight: 600,
}

const monoValueStyle: React.CSSProperties = {
  ...valueStyle,
  fontFamily: 'monospace',
  fontSize: '12px',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompanyCardProps {
  companyName: string
  companyId: bigint
  adminAddress: `0x${string}`
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Displays company information as a persistent card.
 *
 * Extracted from the inline `SuccessCard` in `CompanyRegistrationForm`.
 * Props-only — no hooks, no registration logic.
 */
export function CompanyCard({ companyName, companyId, adminAddress }: CompanyCardProps) {
  return (
    <div style={cardStyle} role="status">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
          Company ready on-chain
        </h3>
        <div style={checkCircleStyle}>✓</div>
      </div>

      <div style={detailsGridStyle}>
        <span style={labelStyle}>Name</span>
        <span style={valueStyle}>{companyName}</span>

        <span style={labelStyle}>Company ID</span>
        <span style={valueStyle}>#{companyId.toString()}</span>

        <span style={labelStyle}>Admin</span>
        <span style={monoValueStyle}>{formatAddress(adminAddress)}</span>
      </div>
    </div>
  )
}
