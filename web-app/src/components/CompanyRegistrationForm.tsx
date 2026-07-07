import { useState, useEffect, useRef, type FormEvent } from 'react'
import { isAddress } from 'viem'
import { useRegisterCompany } from '../hooks/useRegisterCompany'

// ── Styles ────────────────────────────────────────────────────────────────────

const formStyle: React.CSSProperties = {
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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
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

const successStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#38a169',
  fontWeight: 600,
}

const linkStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--accent, #aa3bff)',
  textDecoration: 'underline',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CompanyRegistrationForm() {
  const { registerCompany, step, isConfirming, txHash, error, reset } =
    useRegisterCompany()

  // Form fields
  const [companyName, setCompanyName] = useState('')
  const [adminWallet, setAdminWallet] = useState('')
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({})

  // Track previous step for detecting transitions
  const prevStepRef = useRef(step)

  // ── Reset form on success ────────────────────────────────────────────────

  useEffect(() => {
    if (step === 'success' && prevStepRef.current !== 'success') {
      setCompanyName('')
      setAdminWallet('')
      setValidationErrors({})
      reset()
    }
    prevStepRef.current = step
  }, [step, reset])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationErrors({})

    const errors: Record<string, string> = {}

    if (!companyName.trim()) {
      errors.companyName = 'Company name is required'
    }

    if (!isAddress(adminWallet)) {
      errors.adminWallet = 'Invalid wallet address'
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      await registerCompany(
        companyName.trim(),
        adminWallet as `0x${string}`,
      )
    } catch {
      // Error handled by useRegisterCompany
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────

  const isInFlight = step !== 'idle'
  const isFormDisabled = isInFlight
  const explorerUrl =
    txHash && import.meta.env.VITE_BLOCK_EXPLORER_URL
      ? `${import.meta.env.VITE_BLOCK_EXPLORER_URL}${txHash}`
      : txHash
        ? `https://etherscan.io/tx/${txHash}`
        : undefined

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
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

      {/* Admin Wallet Address */}
      <label style={labelStyle}>
        Admin Wallet Address
        <input
          type="text"
          value={adminWallet}
          onChange={(e) => setAdminWallet(e.target.value)}
          placeholder="0x..."
          disabled={isFormDisabled}
          style={inputStyle}
          aria-label="Admin Wallet Address"
        />
        {validationErrors.adminWallet && (
          <span style={errorStyle} role="alert">
            {validationErrors.adminWallet}
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

      {step === 'success' && (
        <p style={successStyle}>Company registered!</p>
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
