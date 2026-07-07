import { useState, useRef, type FormEvent } from 'react'
import { useAccount } from 'wagmi'
import { useRegisterCompany } from '../hooks/useRegisterCompany'

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

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-h, #08060d)',
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid var(--border, #e5e4e7)',
  borderRadius: '6px',
  background: 'var(--bg, #fff)',
  color: 'var(--text, #08060d)',
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 600,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  background: 'var(--accent, #aa3bff)',
  color: '#fff',
}

const outlineButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'transparent',
  color: 'var(--accent, #aa3bff)',
  border: '1px solid var(--accent, #aa3bff)',
}

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
}

const errorStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#e53e3e',
  marginTop: '2px',
}

const linkStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--accent, #aa3bff)',
  textDecoration: 'underline',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatAddress(address: `0x${string}`): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * Success card displayed after a company is successfully registered.
 */
function SuccessCard({
  companyName,
  companyId,
  adminAddress,
  onRegisterAnother,
}: {
  companyName: string
  companyId: bigint | undefined
  adminAddress: `0x${string}`
  onRegisterAnother: () => void
}) {
  return (
    <div style={cardStyle} role="status">
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: '#e6f7e6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          color: '#38a169',
        }}
      >
        ✓
      </div>

      <div>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
          Company Registered
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
          Your new company is ready on-chain
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr',
          gap: '8px 12px',
          fontSize: '13px',
          padding: '12px',
          background: '#f9f9fb',
          borderRadius: '6px',
        }}
      >
        <span style={{ color: '#666' }}>Name</span>
        <span style={{ fontWeight: 600 }}>{companyName}</span>

        <span style={{ color: '#666' }}>Company ID</span>
        <span style={{ fontWeight: 600 }}>
          {companyId !== undefined ? `#${companyId.toString()}` : '—'}
        </span>

        <span style={{ color: '#666' }}>Admin</span>
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {formatAddress(adminAddress)}
        </span>
      </div>

      <button
        type="button"
        onClick={onRegisterAnother}
        style={outlineButtonStyle}
      >
        Register another company
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CompanyRegistrationForm() {
  const { registerCompany, step, txHash, companyId, error, reset } =
    useRegisterCompany()
  const { address } = useAccount()

  // Form fields
  const [companyName, setCompanyName] = useState('')
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({})

  // Store the name that was submitted so we can show it in the success card
  const [submittedName, setSubmittedName] = useState<string | null>(null)

  // Track previous step for detecting success transitions
  const prevStepRef = useRef(step)

  // ── Capture submitted name on success transition ──────────────────────────
  if (step === 'success' && prevStepRef.current !== 'success') {
    // name is already stored in submittedName from handleSubmit
  }
  prevStepRef.current = step

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationErrors({})

    const errors: Record<string, string> = {}

    if (!companyName.trim()) {
      errors.companyName = 'Company name is required'
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    if (!address) return

    try {
      setSubmittedName(companyName.trim())
      await registerCompany(companyName.trim(), address)
    } catch {
      // Error handled by useRegisterCompany
    }
  }

  const handleRegisterAnother = () => {
    setSubmittedName(null)
    setCompanyName('')
    setValidationErrors({})
    reset()
  }

  // ── Derived state ────────────────────────────────────────────────────────

  const isInFlight = step === 'confirming'
  const isFormDisabled = isInFlight
  const explorerUrl =
    txHash && import.meta.env.VITE_BLOCK_EXPLORER_URL
      ? `${import.meta.env.VITE_BLOCK_EXPLORER_URL}${txHash}`
      : txHash
        ? `https://etherscan.io/tx/${txHash}`
        : undefined

  // ── Render: success card ─────────────────────────────────────────────────

  if (step === 'success' && submittedName && address) {
    return (
      <SuccessCard
        companyName={submittedName}
        companyId={companyId}
        adminAddress={address}
        onRegisterAnother={handleRegisterAnother}
      />
    )
  }

  // ── Render: form ─────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} style={cardStyle}>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
        Register Company
      </h3>

      {/* Company Name */}
      <label style={labelStyle}>
        Company Name
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Enter company name"
          disabled={isFormDisabled}
          style={inputStyle}
          aria-label="Company Name"
        />
        {validationErrors.companyName && (
          <span style={errorStyle} role="alert">
            {validationErrors.companyName}
          </span>
        )}
      </label>

      {/* Status messages */}
      {step === 'confirming' && txHash && explorerUrl && (
        <p style={linkStyle}>
          Transaction submitted:{' '}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
          >
            View on Etherscan
          </a>
        </p>
      )}

      {step === 'error' && error && (
        <p style={errorStyle} role="alert">
          {error.message}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isFormDisabled}
        style={isFormDisabled ? buttonDisabledStyle : buttonStyle}
      >
        {step === 'confirming' ? 'Confirming…' : 'Register Company'}
      </button>
    </form>
  )
}
