import { useCompanies } from '../hooks/useCompanies'
import { useRegisterEmployee } from '../hooks/useRegisterEmployee'
import { useEffect } from 'react'
import styles from './JoinCompanySection.module.css'

// ── Component ──────────────────────────────────────────────────────────────────

interface JoinCompanySectionProps {
  employeeCompanyId?: number
  onJoinSuccess?: () => void
}

export function JoinCompanySection({
  employeeCompanyId,
  onJoinSuccess,
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

  // Notify parent when registration succeeds so it can refetch user role
  useEffect(() => {
    if (isSuccess && onJoinSuccess) {
      onJoinSuccess()
    }
  }, [isSuccess, onJoinSuccess])

  if (companiesLoading) {
    return (
      <p style={{ color: 'var(--text, #6b6375)' }}>
        Loading available companies…
      </p>
    )
  }

  if (companies.length === 0) {
    return <div className={styles.empty}>No companies registered yet.</div>
  }

  return (
    <div>
      {companies.map((company) => {
        const alreadyJoined =
          employeeCompanyId !== undefined &&
          company.id === BigInt(employeeCompanyId)

        return (
          <div key={company.id.toString()} style={{ marginBottom: '12px' }}>
            <div className={styles.card}>
              <div>
                <h3 className={styles.companyName}>{company.name}</h3>
                <p className={styles.admin}>
                  Admin: {company.admin.slice(0, 6)}...{company.admin.slice(-4)}
                </p>
              </div>

              {alreadyJoined ? (
                <span className={styles.successText}>✓ Joined</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleJoin(company.id)}
                  disabled={isPending}
                  className={isPending ? styles.buttonDisabled : styles.button}
                >
                  {isPending ? 'Joining…' : 'Join Company'}
                </button>
              )}
            </div>

            {step === 'success' && !alreadyJoined && (
              <p className={styles.successText}>
                ✓ Successfully joined {company.name}!
              </p>
            )}

            {error && !alreadyJoined && (
              <p className={styles.errorText} role="alert">
                {error.message}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
