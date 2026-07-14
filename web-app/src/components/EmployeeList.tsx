import { useCompanyEmployees, type EmployeeData } from '../hooks/useCompanyEmployees'
import { useMinterRole } from '../hooks/useMinterRole'

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 700,
  color: 'var(--text-h, #08060d)',
}

const refreshButtonStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '12px',
  fontWeight: 600,
  border: '1px solid var(--border, #e5e4e7)',
  borderRadius: '6px',
  cursor: 'pointer',
  background: 'var(--bg, #fff)',
  color: 'var(--text, #6b6375)',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '2px solid var(--border, #e5e4e7)',
  color: 'var(--text, #6b6375)',
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--border, #e5e4e7)',
  color: 'var(--text-h, #08060d)',
}

const monoStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '12px',
}

const skeletonStyle: React.CSSProperties = {
  height: '16px',
  background: '#f0f0f5',
  borderRadius: '4px',
  animation: 'pulse 1.5s ease-in-out infinite',
}

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '32px',
  color: 'var(--text, #6b6375)',
  fontSize: '14px',
}

const toggleButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 600,
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.15s',
}

const minterActiveStyle: React.CSSProperties = {
  ...toggleButtonStyle,
  background: '#e6f7e6',
  color: '#38a169',
}

const minterInactiveStyle: React.CSSProperties = {
  ...toggleButtonStyle,
  background: '#f0f0f5',
  color: '#6b6375',
}

const minterLoadingStyle: React.CSSProperties = {
  ...toggleButtonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
}

const minterColumnStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: 'center',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAddress(address: `0x${string}`): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

// ── EmployeeRow sub-component ─────────────────────────────────────────────────

/**
 * Render a single employee row with address, date, and optionally a Minter role toggle.
 *
 * Extracted as a separate component so each row can independently call
 * the `useMinterRole` hook (hooks cannot be called inside loops/map).
 */
function EmployeeRow({
  employee,
  showMinterToggle,
}: {
  employee: EmployeeData
  showMinterToggle: boolean
}) {
  const { isMinter, isLoading, grantMinter, revokeMinter, error } = useMinterRole(
    showMinterToggle ? employee.employee : undefined,
  )

  const handleToggle = async () => {
    try {
      if (isMinter) {
        await revokeMinter()
      } else {
        await grantMinter()
      }
    } catch {
      // Error handled by useMinterRole
    }
  }

  return (
    <tr>
      <td style={{ ...tdStyle, ...monoStyle }}>{formatAddress(employee.employee)}</td>
      <td style={tdStyle}>{employee.date || '—'}</td>
      {showMinterToggle && (
        <td style={minterColumnStyle}>
          <button
            type="button"
            onClick={handleToggle}
            disabled={isLoading}
            style={
              isLoading
                ? minterLoadingStyle
                : isMinter
                  ? minterActiveStyle
                  : minterInactiveStyle
            }
            aria-label={
              isMinter
                ? `Revoke Minter role from ${employee.employee}`
                : `Grant Minter role to ${employee.employee}`
            }
            title={error ? `Error: ${error.message}` : undefined}
          >
            {isLoading ? '…' : isMinter ? 'Minter' : 'Grant'}
          </button>
        </td>
      )}
    </tr>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface EmployeeListProps {
  companyId: bigint
  /** Show the Minter role toggle column (admin-only). Default: false */
  showMinterToggle?: boolean
}

/**
 * Table of employees registered to a company, showing employee address,
 * registration date, and optionally a Minter role toggle button per row.
 *
 * Uses `useCompanyEmployees` for the employee list and `useMinterRole`
 * per row for role state (only when showMinterToggle is true).
 */
export function EmployeeList({ companyId, showMinterToggle = false }: EmployeeListProps) {
  const { employees, isLoading, error, refresh } = useCompanyEmployees(companyId)

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={sectionStyle}>
        <div style={headerRowStyle}>
          <h3 style={titleStyle}>Employees</h3>
        </div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Employee Address</th>
              <th style={thStyle}>Registration Date</th>
              {showMinterToggle && <th style={thStyle}>Minter Role</th>}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} data-testid="skeleton-row">
                <td style={tdStyle}><div style={skeletonStyle} /></td>
                <td style={tdStyle}><div style={skeletonStyle} /></td>
                {showMinterToggle && <td style={tdStyle}><div style={skeletonStyle} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <div style={sectionStyle}>
        <div style={headerRowStyle}>
          <h3 style={titleStyle}>Employees</h3>
          <button type="button" onClick={refresh} style={refreshButtonStyle}>
            Retry
          </button>
        </div>
        <p style={{ ...emptyStyle, color: '#e53e3e' }} role="alert">
          {error.message}
        </p>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (employees.length === 0) {
    return (
      <div style={sectionStyle}>
        <div style={headerRowStyle}>
          <h3 style={titleStyle}>Employees</h3>
        </div>
        <p style={emptyStyle}>No employees registered</p>
      </div>
    )
  }

  // ── Data state ────────────────────────────────────────────────────────────

  return (
    <div style={sectionStyle}>
      <div style={headerRowStyle}>
        <h3 style={titleStyle}>Employees</h3>
        <button type="button" onClick={refresh} style={refreshButtonStyle}>
          Refresh
        </button>
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Employee Address</th>
            <th style={thStyle}>Registration Date</th>
            {showMinterToggle && <th style={thStyle}>Minter Role</th>}
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <EmployeeRow
              key={emp.employee}
              employee={emp}
              showMinterToggle={showMinterToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
