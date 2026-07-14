import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Layout } from '../components/Layout'
import { useCompanyId } from '../hooks/useCompanyId'
import { useCompanyEmployees } from '../hooks/useCompanyEmployees'
import { COMPANY_REGISTRY_ABI, getContractAddresses } from '../config/contracts'
import styles from './MintNftPage.module.css'

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
        <div className={styles.connect}>
          <p>Connect your wallet to mint Kudos NFTs.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Mint Kudos NFT</h1>
        <p className={styles.subtitle}>
          Reward an employee with a recognition NFT.
        </p>

        {/* Success message */}
        {receipt && (
          <div className={styles.preview} role="status">
            Kudos minted successfully!
          </div>
        )}

        {/* Error message */}
        {txError && (
          <div className={styles.error} role="alert">
            {txError}
          </div>
        )}

        {isCompanyLoading || isEmployeesLoading ? (
          <div className={styles.loading}>Loading employees...</div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              Employee
              <select
                className={styles.input}
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

            <label className={styles.field}>
              Metadata URI
              <input
                type="text"
                className={styles.input}
                placeholder="ipfs://Qm..."
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                aria-label="Metadata URI"
              />
            </label>

            <button
              type="submit"
              className={isPending || !selectedEmployee || !uri ? styles.buttonDisabled : styles.button}
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
