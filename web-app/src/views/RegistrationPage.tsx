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
import styles from './RegistrationPage.module.css'

// ── Component ─────────────────────────────────────────────────────────────────

export function RegistrationPage() {
  const { address } = useAccount()
  const { role, refetchRole } = useUserRole()
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
        <div className={styles.empty}>
          <p>Connect your wallet to register</p>
        </div>
      </Layout>
    )
  }

  // ── Employee (already registered) ─────────────────────────────────────────

  if (role === 'employee') {
    return (
      <Layout>
        <div className={styles.empty}>
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
          <div className={styles.container}>
            <h1 className={styles.title}>Company</h1>
            <div className={styles.loading}>
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
          <div className={styles.container}>
            <h1 className={styles.title}>Company</h1>
            <div className={styles.empty}>
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
          <div className={styles.container}>
            <h1 className={styles.title}>Company</h1>
            <div className={styles.empty}>
              <p>No company registered yet</p>
              <button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className={styles.ctaButton}
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
        <div className={styles.container}>
          <h1 className={styles.title}>Company</h1>

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
      <div className={styles.container}>
        <h1 className={styles.title}>Company</h1>
        <p className={styles.subtitle}>
          Join an existing company below to start receiving Kudos.
        </p>
        <JoinCompanySection onJoinSuccess={() => refetchRole?.()} />
      </div>
    </Layout>
  )
}
