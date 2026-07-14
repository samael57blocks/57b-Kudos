import { useEffect, useRef, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { Layout } from '../components/Layout'
import { useCompanyId } from '../hooks/useCompanyId'
import { getContractAddresses } from '../config/contracts'
import styles from './MinterDashboard.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MintEvent {
  tokenId: bigint
  companyId: bigint
  employee: `0x${string}`
  minter: `0x${string}`
  blockNumber: bigint
  timestamp?: number
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MinterDashboard() {
  const { address, isConnected } = useAccount()
  const { companyId, isLoading: isCompanyLoading } = useCompanyId(address)
  const publicClient = usePublicClient()
  const publicClientRef = useRef(publicClient)
  publicClientRef.current = publicClient
  const contracts = getContractAddresses()

  const [mints, setMints] = useState<MintEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contracts?.companyRegistry || companyId === null || companyId === undefined || !publicClientRef.current) {
      setMints([])
      return
    }

    let cancelled = false

    const fetchMints = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const logs = await publicClientRef.current!.getLogs({
          address: contracts.companyRegistry,
          event: parseAbiItem(
            'event KudosMinted(uint256 indexed tokenId, uint256 indexed companyId, address indexed employee, address minter)',
          ),
          args: { companyId: BigInt(companyId) },
          fromBlock: 0n,
        })

        if (cancelled) return

        const mintEvents: MintEvent[] = logs.map((log) => ({
          tokenId: log.args.tokenId!,
          companyId: log.args.companyId!,
          employee: log.args.employee!,
          minter: log.args.minter!,
          blockNumber: log.blockNumber,
        }))

        setMints(mintEvents)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to fetch mint events')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchMints()

    return () => { cancelled = true }
  }, [contracts?.companyRegistry, companyId])

  // ── Derived stats ─────────────────────────────────────────────────────────

  const totalMints = mints.length
  const myMints = mints.filter((m) => m.minter?.toLowerCase() === address?.toLowerCase()).length
  const lastMintBlock = mints.length > 0 ? mints[mints.length - 1].blockNumber : null

  // Unique employees who received NFTs
  const employeeNFTs = mints.reduce<
    Map<string, { employee: `0x${string}`; tokens: bigint[] }>
  >((acc, mint) => {
    const key = mint.employee.toLowerCase()
    if (!acc.has(key)) {
      acc.set(key, { employee: mint.employee, tokens: [] })
    }
    acc.get(key)!.tokens.push(mint.tokenId)
    return acc
  }, new Map())

  // ── Not connected ─────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <Layout>
        <div className={styles.connect}>
          <p>Connect your wallet to access the dashboard.</p>
        </div>
      </Layout>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isCompanyLoading) {
    return (
      <Layout>
        <div className={styles.loading}>Loading dashboard...</div>
      </Layout>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Minter Dashboard</h1>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Mints</div>
            <div className={styles.statValue}>{isLoading ? '...' : totalMints}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>My Mints</div>
            <div className={styles.statValue}>{isLoading ? '...' : myMints}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Last Mint</div>
            <div className={styles.statValue}>
              {lastMintBlock !== null ? `Block #${lastMintBlock.toString()}` : '—'}
            </div>
          </div>
        </div>

        {error && (
          <div className={styles.errorAlert} role="alert">
            {error}
          </div>
        )}

        {/* Employee NFT Table */}
        <div>
          <h2 className={styles.sectionTitle}>Employee NFTs</h2>
          {employeeNFTs.size === 0 ? (
            <div className={styles.empty}>No mints yet</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Employee</th>
                  <th className={styles.th}>Token IDs</th>
                  <th className={styles.th}>Count</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(employeeNFTs.values()).map((entry) => (
                  <tr key={entry.employee}>
                    <td className={`${styles.td} ${styles.code}`}>{entry.employee}</td>
                    <td className={`${styles.td} ${styles.code}`}>
                      {entry.tokens.map((t) => `#${t.toString()}`).join(', ')}
                    </td>
                    <td className={styles.td}>{entry.tokens.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          {mints.length === 0 ? (
            <div className={styles.empty}>No recent activity</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Token</th>
                  <th className={styles.th}>Employee</th>
                  <th className={styles.th}>Minter</th>
                  <th className={styles.th}>Block</th>
                </tr>
              </thead>
              <tbody>
                {mints.slice(-10).reverse().map((mint) => (
                  <tr key={mint.tokenId.toString()}>
                    <td className={`${styles.td} ${styles.code}`}>#{mint.tokenId.toString()}</td>
                    <td className={`${styles.td} ${styles.code}`}>{mint.employee}</td>
                    <td className={`${styles.td} ${styles.code}`}>{mint.minter}</td>
                    <td className={styles.td}>{mint.blockNumber.toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}
