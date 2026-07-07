import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { useCompanies } from '../hooks/useCompanies'
import { useRegisterEmployee } from '../hooks/useRegisterEmployee'
import { COMPANY_REGISTRY_ABI, getContractAddresses } from '../config/contracts'

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

export function EmployeeRegistration() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const contracts = getContractAddresses()
  const { companies, isLoading, error: companiesError } = useCompanies()
  const { registerEmployee, step, isConfirming, txHash, error, reset } =
    useRegisterEmployee()

  // Form fields
  const [selectedCompanyId, setSelectedCompanyId] = useState('')

  // Duplicate guard state
  const [checkingRegistration, setCheckingRegistration] = useState(true)
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)

  // Track previous step for detecting transitions
  const prevStepRef = useRef(step)

  // ── Check if already registered on mount ─────────────────────────────────

  useEffect(() => {
    if (!publicClient || !address || !contracts) {
      setCheckingRegistration(false)
      return
    }

    let cancelled = false

    const checkRegistration = async () => {
      try {
        const result = (await publicClient.readContract({
          address: contracts.companyRegistry,
          abi: COMPANY_REGISTRY_ABI,
          functionName: 'getEmployeeCompany',
          args: [address],
        })) as bigint

        if (!cancelled) {
          setIsAlreadyRegistered(result > 0n)
          setCheckingRegistration(false)
        }
      } catch {
        if (!cancelled) {
          setCheckingRegistration(false)
        }
      }
    }

    checkRegistration()

    return () => {
      cancelled = true
    }
  }, [publicClient, address, contracts])

  // ── Reset form on success ────────────────────────────────────────────────

  useEffect(() => {
    if (step === 'success' && prevStepRef.current !== 'success') {
      setSelectedCompanyId('')
      reset()
    }
    prevStepRef.current = step
  }, [step, reset])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const companyId = BigInt(selectedCompanyId)

    try {
      await registerEmployee(companyId)
    } catch {
      // Error handled by useRegisterEmployee
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────

  const isInFlight = step !== 'idle'
  const isFormDisabled = isInFlight || !selectedCompanyId
  const explorerUrl =
    txHash && import.meta.env.VITE_BLOCK_EXPLORER_URL
      ? `${import.meta.env.VITE_BLOCK_EXPLORER_URL}${txHash}`
      : txHash
        ? `https://etherscan.io/tx/${txHash}`
        : undefined

  // ── Render: already registered ───────────────────────────────────────────

  if (checkingRegistration) {
    return null // or a loading indicator
  }

  if (isAlreadyRegistered) {
    return (
      <div style={formStyle}>
        <p style={{ fontSize: '14px', color: 'var(--text, #6b6375)' }}>
          You are already registered to a company.
        </p>
      </div>
    )
  }

  // ── Render: companies loading ────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={formStyle}>
        <p style={{ fontSize: '14px', color: 'var(--text, #6b6375)' }}>
          Loading companies…
        </p>
      </div>
    )
  }

  // ── Render: companies error ──────────────────────────────────────────────

  if (companiesError) {
    return (
      <div style={formStyle}>
        <p style={errorStyle} role="alert">
          {companiesError.message}
        </p>
      </div>
    )
  }

  // ── Render: no companies ─────────────────────────────────────────────────

  if (companies.length === 0) {
    return (
      <div style={formStyle}>
        <p style={{ fontSize: '14px', color: 'var(--text, #6b6375)' }}>
          No companies registered yet. Please contact an admin to register a
          company.
        </p>
      </div>
    )
  }

  // ── Render: form ─────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
        Register as Employee
      </h3>

      {/* Company selector */}
      <label style={labelStyle}>
        Select Company
        <select
          value={selectedCompanyId}
          onChange={(e) => setSelectedCompanyId(e.target.value)}
          disabled={isFormDisabled}
          style={selectStyle}
          aria-label="Select Company"
        >
          <option value="">Select a company</option>
          {companies.map((company) => (
            <option key={company.id.toString()} value={company.id.toString()}>
              {company.name}
            </option>
          ))}
        </select>
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
        <p style={successStyle}>Successfully registered as employee!</p>
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
        {step === 'confirming' ? 'Confirming…' : 'Register as Employee'}
      </button>
    </form>
  )
}
