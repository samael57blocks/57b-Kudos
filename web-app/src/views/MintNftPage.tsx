import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Layout } from '../components/Layout'
import { useCompanyId } from '../hooks/useCompanyId'
import { useCompanyEmployees } from '../hooks/useCompanyEmployees'
import { COMPANY_REGISTRY_ABI, getContractAddresses } from '../config/contracts'

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
}

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: 'var(--text-h, #08060d)',
  marginBottom: '4px',
}

const subtitleStyle: React.CSSProperties = {
  color: 'var(--text, #6b6375)',
  fontSize: '14px',
  marginBottom: '24px',
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--text-h, #08060d)',
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border, #e5e4e7)',
  fontSize: '14px',
  fontFamily: 'inherit',
  background: 'var(--bg, #fff)',
  color: 'var(--text-h, #08060d)',
}

const buttonStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: '8px',
  border: 'none',
  background: 'var(--accent, #aa3bff)',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: '8px',
}

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.6,
  cursor: 'not-allowed',
}

const successStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: '8px',
  background: '#ecfdf5',
  border: '1px solid #6ee7b7',
  color: '#065f46',
  fontSize: '14px',
  marginBottom: '16px',
}

const errorStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: '8px',
  background: '#fef2f2',
  border: '1px solid #fca5a5',
  color: '#991b1b',
  fontSize: '14px',
  marginBottom: '16px',
}

const connectStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '80px 20px',
  color: 'var(--text, #6b6375)',
}

const loadingStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  color: 'var(--text, #6b6375)',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MintNftPage() {
  const { address, isConnected } = useAccount()
  const { companyId, isLoading: isCompanyLoading } = useCompanyId(address)
  const { employees, isLoading: isEmployeesLoading } = useCompanyEmployees(
    companyId ?? null,
  )
  const { writeContractAsync } = useWriteContract()
  const contracts = getContractAddresses()

  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [uri, setUri] = useState('')
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  const { isLoading: isReceiptLoading, data: receipt } =
    useWaitForTransactionReceipt({ hash: txHash ?? undefined })

  const isPending = isReceiptLoading || (txHash !== null && !receipt && !txError)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contracts?.companyRegistry || !selectedEmployee || !uri) return

    setTxError(null)
    setTxHash(null)

    try {
      const hash = await writeContractAsync({
        address: contracts.companyRegistry,
        abi: COMPANY_REGISTRY_ABI,
        functionName: 'mintKudos',
        args: [selectedEmployee as `0x${string}`, uri],
      })
      setTxHash(hash)
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Transaction failed')
    }
  }

  // ── Not connected ─────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <Layout>
        <div style={connectStyle}>
          <p>Connect your wallet to mint Kudos NFTs.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={containerStyle}>
        <h1 style={titleStyle}>Mint Kudos NFT</h1>
        <p style={subtitleStyle}>
          Reward an employee with a recognition NFT.
        </p>

        {/* Success message */}
        {receipt && (
          <div style={successStyle} role="status">
            Kudos minted successfully!
          </div>
        )}

        {/* Error message */}
        {txError && (
          <div style={errorStyle} role="alert">
            {txError}
          </div>
        )}

        {isCompanyLoading || isEmployeesLoading ? (
          <div style={loadingStyle}>Loading employees...</div>
        ) : (
          <form onSubmit={handleSubmit} style={formStyle}>
            <label style={labelStyle}>
              Employee
              <select
                style={inputStyle}
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                aria-label="Employee"
              >
                <option value="">Select an employee...</option>
                {employees.map((emp) => (
                  <option key={emp.employee} value={emp.employee}>
                    {emp.employee}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Metadata URI
              <input
                type="text"
                style={inputStyle}
                placeholder="ipfs://Qm..."
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                aria-label="Metadata URI"
              />
            </label>

            <button
              type="submit"
              style={
                isPending || !selectedEmployee || !uri
                  ? buttonDisabledStyle
                  : buttonStyle
              }
              disabled={isPending || !selectedEmployee || !uri}
            >
              {isPending ? 'Minting...' : 'Mint Kudos'}
            </button>
          </form>
        )}
      </div>
    </Layout>
  )
}
