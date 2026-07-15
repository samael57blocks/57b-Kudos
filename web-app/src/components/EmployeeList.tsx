import { useState } from 'react'
import { useCompanyEmployees, type EmployeeData } from '../hooks/useCompanyEmployees'
import { useMinterRole } from '../hooks/useMinterRole'
import { useRegisterEmployee } from '../hooks/useRegisterEmployee'
import { formatAddress } from '../utils/format'
import styles from './EmployeeList.module.css'

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
      <td className={`${styles.td} ${styles.mono}`}>{formatAddress(employee.employee)}</td>
      <td className={styles.td}>{employee.date || '—'}</td>
      {showMinterToggle && (
        <td className={styles.minterColumn}>
          <button
            type="button"
            onClick={handleToggle}
            disabled={isLoading}
            className={
              isLoading
                ? styles.minterLoading
                : isMinter
                  ? styles.minterActive
                  : styles.minterInactive
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [addressInput, setAddressInput] = useState('')
  const { registerEmployee, step: addStep, error: addError, reset: addReset } = useRegisterEmployee()

  const isValidAddress =
    addressInput.startsWith('0x') &&
    addressInput.length === 42 &&
    /^0x[0-9a-fA-F]{40}$/.test(addressInput)

  const isAdding = addStep === 'confirming'

  const handleAddEmployee = async () => {
    if (!isValidAddress) return
    try {
      await registerEmployee(addressInput as `0x${string}`, companyId)
      setAddressInput('')
      setShowAddForm(false)
      refresh()
    } catch {
      // error is captured by the hook
    }
  }

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm)
    setAddressInput('')
    addReset()
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Employees</h3>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Employee Address</th>
              <th className={styles.th}>Registration Date</th>
              {showMinterToggle && <th className={styles.th}>Minter Role</th>}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} data-testid="skeleton-row">
                <td className={styles.td}><div className={styles.skeleton} /></td>
                <td className={styles.td}><div className={styles.skeleton} /></td>
                {showMinterToggle && <td className={styles.td}><div className={styles.skeleton} /></td>}
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
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Employees</h3>
          <div className={styles.headerActions}>
            {showAddForm && (
              <div className={styles.addForm}>
                <input
                  type="text"
                  placeholder="0x..."
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  disabled={isAdding}
                  className={styles.addFormInput}
                />
                <button
                  type="button"
                  onClick={handleAddEmployee}
                  disabled={!isValidAddress || isAdding}
                  className={
                    !isValidAddress || isAdding
                      ? styles.addFormButtonDisabled
                      : styles.addFormButton
                  }
                >
                  {isAdding ? '...' : 'Add'}
                </button>
              </div>
            )}
            {showMinterToggle && (
              <button type="button" onClick={toggleAddForm} className={styles.addFormToggle}>
                {showAddForm ? 'Cancel' : 'Add Employee'}
              </button>
            )}
            <button type="button" onClick={refresh} className={styles.refreshButton}>
              Retry
            </button>
          </div>
        </div>
        {showAddForm && addError && (
          <p className={styles.addFormError} role="alert">{addError.message}</p>
        )}
        <p className={`${styles.empty}`} style={{ color: '#e53e3e' }} role="alert">
          {error.message}
        </p>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (employees.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Employees</h3>
          <div className={styles.headerActions}>
            {showAddForm && (
              <div className={styles.addForm}>
                <input
                  type="text"
                  placeholder="0x..."
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  disabled={isAdding}
                  className={styles.addFormInput}
                />
                <button
                  type="button"
                  onClick={handleAddEmployee}
                  disabled={!isValidAddress || isAdding}
                  className={
                    !isValidAddress || isAdding
                      ? styles.addFormButtonDisabled
                      : styles.addFormButton
                  }
                >
                  {isAdding ? '...' : 'Add'}
                </button>
              </div>
            )}
            {showMinterToggle && (
              <button type="button" onClick={toggleAddForm} className={styles.addFormToggle}>
                {showAddForm ? 'Cancel' : 'Add Employee'}
              </button>
            )}
          </div>
        </div>
        {showAddForm && addError && (
          <p className={styles.addFormError} role="alert">{addError.message}</p>
        )}
        <p className={styles.empty}>No employees registered</p>
      </div>
    )
  }

  // ── Data state ────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Employees</h3>
        <div className={styles.headerActions}>
          {showAddForm && (
            <div className={styles.addForm}>
              <input
                type="text"
                placeholder="0x..."
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                disabled={isAdding}
                className={styles.addFormInput}
              />
              <button
                type="button"
                onClick={handleAddEmployee}
                disabled={!isValidAddress || isAdding}
                className={
                  !isValidAddress || isAdding
                    ? styles.addFormButtonDisabled
                    : styles.addFormButton
                }
              >
                {isAdding ? '...' : 'Add'}
              </button>
            </div>
          )}
          {showMinterToggle && (
            <button type="button" onClick={toggleAddForm} className={styles.addFormToggle}>
              {showAddForm ? 'Cancel' : 'Add Employee'}
            </button>
          )}
          <button type="button" onClick={refresh} className={styles.refreshButton}>
            Refresh
          </button>
        </div>
      </div>
      {showAddForm && addError && (
        <p className={styles.addFormError} role="alert">{addError.message}</p>
      )}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Employee Address</th>
            <th className={styles.th}>Registration Date</th>
            {showMinterToggle && <th className={styles.th}>Minter Role</th>}
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
