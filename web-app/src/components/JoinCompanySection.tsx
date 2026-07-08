import { useCompanies } from '../hooks/useCompanies'
import { useRegisterEmployee } from '../hooks/useRegisterEmployee'

// ── Styles ─────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card, #f5f3f7)',
  borderRadius: '12px',
  padding: '16px 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
}

const companyNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--text-h, #08060d)',
}

const adminStyle: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: '13px',
  color: 'var(--text, #6b6375)',
  fontFamily: 'monospace',
}

const joinButtonStyle: React.CSSProperties = {
  padding: '8px 20px',
  fontSize: '14px',
  fontWeight: 600,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  background: 'var(--accent, #aa3bff)',
  color: '#fff',
  whiteSpace: 'nowrap',
}

const joinButtonDisabledStyle: React.CSSProperties = {
  ...joinButtonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
}

const successTextStyle: React.CSSProperties = {
  color: '#22c55e',
  fontWeight: 600,
  fontSize: '14px',
}

const errorTextStyle: React.CSSProperties = {
  color: '#ef4444',
  fontSize: '14px',
  marginTop: '12px',
}

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  color: 'var(--text, #6b6375)',
  padding: '40px 0',
}

// ── Component ──────────────────────────────────────────────────────────────────

interface JoinCompanySectionProps {
  employeeCompanyId?: number
}

export function JoinCompanySection({
  employeeCompanyId,
}: JoinCompanySectionProps = {}) {
  const { companies, isLoading: companiesLoading } = useCompanies()
  const { registerEmployee, step, isConfirming, error, reset } =
    useRegisterEmployee()

  const handleJoin = async (companyId: bigint) => {
    try {
      await registerEmployee(companyId)
    } catch {
      // error is captured by the hook
    }
  }

  const isPending = step === 'confirming'
  const isSuccess = step === 'success'

  if (companiesLoading) {
    return (
      <p style={{ color: 'var(--text, #6b6375)' }}>
        Loading available companies…
      </p>
    )
  }

  if (companies.length === 0) {
    return <div style={emptyStyle}>No companies registered yet.</div>
  }

  return (
    <div>
      {companies.map((company) => {
        const alreadyJoined =
          employeeCompanyId !== undefined &&
          company.id === BigInt(employeeCompanyId)

        return (
          <div key={company.id.toString()} style={{ marginBottom: '12px' }}>
            <div style={cardStyle}>
              <div>
                <h3 style={companyNameStyle}>{company.name}</h3>
                <p style={adminStyle}>
                  Admin: {company.admin.slice(0, 6)}...{company.admin.slice(-4)}
                </p>
              </div>

              {alreadyJoined ? (
                <span style={successTextStyle}>✓ Joined</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleJoin(company.id)}
                  disabled={isPending}
                  style={isPending ? joinButtonDisabledStyle : joinButtonStyle}
                >
                  {isPending ? 'Joining…' : 'Join Company'}
                </button>
              )}
            </div>

            {step === 'success' && !alreadyJoined && (
              <p style={successTextStyle}>
                ✓ Successfully joined {company.name}!
              </p>
            )}

            {error && !alreadyJoined && (
              <p style={errorTextStyle} role="alert">
                {error.message}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
