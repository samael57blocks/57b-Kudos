import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { useUserRole } from '../hooks/useUserRole'
import { useCompanyId } from '../hooks/useCompanyId'
import { Layout } from '../components/Layout'
import { CompanyCard } from '../components/CompanyCard'
import { EmployeeList } from '../components/EmployeeList'
import { JoinCompanySection } from '../components/JoinCompanySection'
import { RegisterCompanyDialog } from '../components/RegisterCompanyDialog'
import { getContractAddresses, COMPANY_REGISTRY_ABI } from '../config/contracts'

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '22px',
  fontWeight: 700,
  color: 'var(--text-h, #08060d)',
}

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '80px',
  color: 'var(--text, #6b6375)',
}

const ctaButtonStyle: React.CSSProperties = {
  marginTop: '16px',
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: 600,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  background: 'var(--accent, #aa3bff)',
  color: '#fff',
}

const loadingStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '80px',
  color: 'var(--text, #6b6375)',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RegistrationPage() {
  const { address } = useAccount()
  const { role } = useUserRole()
  const { companyId: hookCompanyId, isLoading: isCompanyIdLoading, error: companyIdError } =
    useCompanyId(address)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Local companyId override: after dialog success, store the companyId locally
  // so the view transitions to populated state immediately without waiting for
  // useCompanyId to refetch (which only happens on address/client change).
  const [localCompanyId, setLocalCompanyId] = useState<bigint | null>(null)
  const companyId = hookCompanyId ?? localCompanyId

  const contracts = getContractAddresses()

  const { data: companyInfo } = useReadContract({
    address: contracts?.companyRegistry,
    abi: COMPANY_REGISTRY_ABI,
    functionName: 'getCompany',
    args: companyId !== null ? [companyId] : undefined,
    query: {
      enabled: !!contracts?.companyRegistry && companyId !== null,
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleDialogSuccess = (newCompanyId: bigint) => {
    setIsDialogOpen(false)
    setLocalCompanyId(newCompanyId)
  }

  // ── Not connected ─────────────────────────────────────────────────────────

  if (!address) {
    return (
      <Layout>
        <div style={emptyStyle}>
          <p>Connect your wallet to register</p>
        </div>
      </Layout>
    )
  }

  // ── Employee (already registered) ─────────────────────────────────────────

  if (role === 'employee') {
    return (
      <Layout>
        <div style={emptyStyle}>
          <p>You are already registered to a company</p>
        </div>
      </Layout>
    )
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  if (role === 'admin') {
    // Loading state while resolving company ID
    if (isCompanyIdLoading) {
      return (
        <Layout>
          <div style={containerStyle}>
            <h1 style={titleStyle}>Company</h1>
            <div style={loadingStyle}>
              <p>Loading company information…</p>
            </div>
          </div>
        </Layout>
      )
    }

    // Error state
    if (companyIdError) {
      return (
        <Layout>
          <div style={containerStyle}>
            <h1 style={titleStyle}>Company</h1>
            <div style={emptyStyle}>
              <p role="alert">Error loading company: {companyIdError.message}</p>
            </div>
          </div>
        </Layout>
      )
    }

    // Empty state: admin has no company registered yet
    if (companyId === null) {
      return (
        <Layout>
          <div style={containerStyle}>
            <h1 style={titleStyle}>Company</h1>
            <div style={emptyStyle}>
              <p>No company registered yet</p>
              <button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                style={ctaButtonStyle}
              >
                Register Company
              </button>
            </div>
          </div>

          <RegisterCompanyDialog
            open={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={handleDialogSuccess}
          />
        </Layout>
      )
    }

    // Populated state: company card + employee list
    return (
      <Layout>
        <div style={containerStyle}>
          <h1 style={titleStyle}>Company</h1>

          <CompanyCard
            companyName={companyInfo?.name ?? 'Unknown'}
            companyId={companyId}
            adminAddress={
              (companyInfo?.admin as `0x${string}`) ?? address
            }
          />

          <EmployeeList companyId={companyId} />
        </div>

        <RegisterCompanyDialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSuccess={handleDialogSuccess}
        />
      </Layout>
    )
  }

  // ── Visitor (connected, no role) ──────────────────────────────────────────

  return (
    <Layout>
      <div style={containerStyle}>
        <h1 style={titleStyle}>Company</h1>
        <p style={{ color: 'var(--text, #6b6375)', fontSize: '14px', marginTop: '8px' }}>
          Join an existing company below to start receiving Kudos.
        </p>
        <JoinCompanySection />
      </div>
    </Layout>
  )
}
