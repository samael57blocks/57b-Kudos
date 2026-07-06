import { useCompanyEmployees } from '../hooks/useCompanyEmployees'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmployeeListProps {
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

const refreshButtonStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '12px',
  fontWeight: 600,
  border: '1px solid var(--border, #e5e4e7)',
  borderRadius: '4px',
  cursor: 'pointer',
  background: 'var(--bg, #fff)',
  color: 'var(--text-h, #08060d)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncateAddress(addr: `0x${string}`): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EmployeeList({ companyId }: EmployeeListProps) {
  const { employees, isLoading, error, refresh } =
    useCompanyEmployees(companyId)

  // ── Render: Loading ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
            Employees
          </h3>
        </div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Employee Address</th>
              <th style={thStyle}>Registration Date</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} data-testid="skeleton-row">
                <td style={tdStyle}>
                  <div style={{ ...skeletonStyle, width: '140px' }} />
                </td>
                <td style={tdStyle}>
                  <div style={{ ...skeletonStyle, width: '90px' }} />
                </td>
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
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
            Employees
          </h3>
        </div>
        <div style={emptyStyle}>
          <p style={{ color: '#e53e3e' }}>Failed to load employees</p>
        </div>
      </div>
    )
  }

  // ── Render: Empty ─────────────────────────────────────────────────────────

  if (employees.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
            Employees
          </h3>
        </div>
        <div style={emptyStyle}>
          <p>No employees registered</p>
        </div>
      </div>
    )
  }

  // ── Render: Data ──────────────────────────────────────────────────────────

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
          Employees
        </h3>
        <button
          type="button"
          onClick={refresh}
          style={refreshButtonStyle}
        >
          Refresh
        </button>
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Employee Address</th>
            <th style={thStyle}>Registration Date</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.employee}>
              <td style={tdStyle}>{truncateAddress(emp.employee)}</td>
              <td style={tdStyle}>{emp.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
