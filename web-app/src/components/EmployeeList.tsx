import { useState, useRef, useEffect } from 'react'
import { useCompanyEmployees, type EmployeeData } from '../hooks/useCompanyEmployees'
import { useMinterRole } from '../hooks/useMinterRole'
import { useUpdateEmployeeName } from '../hooks/useUpdateEmployeeName'
import { formatAddress } from '../utils/format'
import { AddEmployeeDialog } from './AddEmployeeDialog'
import styles from './EmployeeList.module.css'

// ── EmployeeRow sub-component ─────────────────────────────────────────────────

/**
 * Render a single employee row with address, name, date, and optionally
 * a Minter role toggle and inline name edit.
 *
 * Extracted as a separate component so each row can independently call
 * the `useMinterRole` hook (hooks cannot be called inside loops/map).
 */
function EmployeeRow({
  employee,
  showMinterToggle,
  onNameUpdated,
}: {
  employee: EmployeeData
  showMinterToggle: boolean
  onNameUpdated: () => void
}) {
  const { isMinter, isLoading, grantMinter, revokeMinter, error } = useMinterRole(
    showMinterToggle ? employee.employee : undefined,
  )
  const { updateEmployeeName, step: updateStep, reset: updateReset } = useUpdateEmployeeName()

  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(employee.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    if (updateStep === 'success') {
      setEditing(false)
      updateReset()
      onNameUpdated()
    }
  }, [updateStep, updateReset, onNameUpdated])

  useEffect(() => {
    setNameValue(employee.name)
  }, [employee.name])

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

  const handleNameClick = () => {
    if (!showMinterToggle) return
    setEditing(true)
  }

  const handleNameSave = async () => {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== employee.name) {
      try {
        await updateEmployeeName(employee.employee, trimmed)
      } catch {
        // Error handled by useUpdateEmployeeName
      }
    } else {
      setNameValue(employee.name)
      setEditing(false)
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave()
    } else if (e.key === 'Escape') {
      setNameValue(employee.name)
      setEditing(false)
    }
  }

  return (
    <tr>
      <td className={`${styles.td} ${styles.mono}`}>{formatAddress(employee.employee)}</td>
      <td className={styles.td}>
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            disabled={updateStep === 'confirming'}
            className={styles.nameInput}
            aria-label="Employee name"
          />
        ) : (
          <span
            className={showMinterToggle ? styles.nameEditable : undefined}
            onClick={handleNameClick}
            title={showMinterToggle ? 'Click to edit name' : undefined}
          >
            {employee.name || '—'}
          </span>
        )}
      </td>
      <td className={styles.td}>{employee.registrationDate || '—'}</td>
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
 * name, registration date, and optionally a Minter role toggle button per row.
 *
 * Uses `useCompanyEmployees` for the employee list and `useMinterRole`
 * per row for role state (only when showMinterToggle is true).
 */
export function EmployeeList({ companyId, showMinterToggle = false }: EmployeeListProps) {
  const { employees, isLoading, error, refresh } = useCompanyEmployees(companyId)
  const [dialogOpen, setDialogOpen] = useState(false)

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
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Registration Date</th>
              {showMinterToggle && <th className={styles.th}>Minter Role</th>}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} data-testid="skeleton-row">
                <td className={styles.td}><div className={styles.skeleton} /></td>
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
            <button type="button" onClick={refresh} className={styles.refreshButton}>
              Retry
            </button>
          </div>
        </div>
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
            {showMinterToggle && (
              <button type="button" onClick={() => setDialogOpen(true)} className={styles.addFormToggle}>
                Add Employee
              </button>
            )}
          </div>
        </div>
        <p className={styles.empty}>No employees registered</p>
        <AddEmployeeDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSuccess={() => { setDialogOpen(false); refresh() }}
          companyId={companyId}
        />
      </div>
    )
  }

  // ── Data state ────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Employees</h3>
        <div className={styles.headerActions}>
          {showMinterToggle && (
            <button type="button" onClick={() => setDialogOpen(true)} className={styles.addFormToggle}>
              Add Employee
            </button>
          )}
          <button type="button" onClick={refresh} className={styles.refreshButton}>
            Refresh
          </button>
        </div>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Employee Address</th>
            <th className={styles.th}>Name</th>
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
              onNameUpdated={refresh}
            />
          ))}
        </tbody>
      </table>
      <AddEmployeeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => { setDialogOpen(false); refresh() }}
        companyId={companyId}
      />
    </div>
  )
}
