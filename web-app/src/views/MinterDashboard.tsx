import { useEffect, useRef, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { Layout } from '../components/Layout'
import { useCompanyId } from '../hooks/useCompanyId'
import { getContractAddresses } from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MintEvent {
  tokenId: bigint
  companyId: bigint
  employee: `0x${string}`
  minter: `0x${string}`
  blockNumber: bigint
  timestamp?: number
}

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

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '16px',
}

const statCardStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderRadius: '10px',
  border: '1px solid var(--border, #e5e4e7)',
  background: 'var(--bg, #fff)',
}

const statLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text, #6b6375)',
  marginBottom: '4px',
}

const statValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: 'var(--text-h, #08060d)',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '14px',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid var(--border, #e5e4e7)',
  color: 'var(--text, #6b6375)',
  fontWeight: 500,
  fontSize: '13px',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--border, #e5e4e7)',
  color: 'var(--text-h, #08060d)',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--text-h, #08060d)',
  margin: 0,
  marginBottom: '12px',
}

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '24px',
  color: 'var(--text, #6b6375)',
  fontSize: '14px',
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

const codeStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '13px',
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
        <div style={connectStyle}>
          <p>Connect your wallet to access the dashboard.</p>
        </div>
      </Layout>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isCompanyLoading) {
    return (
      <Layout>
        <div style={loadingStyle}>Loading dashboard...</div>
      </Layout>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div style={containerStyle}>
        <h1 style={titleStyle}>Minter Dashboard</h1>

        {/* Stats Cards */}
        <div style={statsGridStyle}>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Total Mints</div>
            <div style={statValueStyle}>{isLoading ? '...' : totalMints}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>My Mints</div>
            <div style={statValueStyle}>{isLoading ? '...' : myMints}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Last Mint</div>
            <div style={statValueStyle}>
              {lastMintBlock !== null ? `Block #${lastMintBlock.toString()}` : '—'}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ ...emptyStyle, color: '#991b1b', background: '#fef2f2', borderRadius: '8px', padding: '12px 16px' }} role="alert">
            {error}
          </div>
        )}

        {/* Employee NFT Table */}
        <div>
          <h2 style={sectionTitleStyle}>Employee NFTs</h2>
          {employeeNFTs.size === 0 ? (
            <div style={emptyStyle}>No mints yet</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Employee</th>
                  <th style={thStyle}>Token IDs</th>
                  <th style={thStyle}>Count</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(employeeNFTs.values()).map((entry) => (
                  <tr key={entry.employee}>
                    <td style={{ ...tdStyle, ...codeStyle }}>{entry.employee}</td>
                    <td style={{ ...tdStyle, ...codeStyle }}>
                      {entry.tokens.map((t) => `#${t.toString()}`).join(', ')}
                    </td>
                    <td style={tdStyle}>{entry.tokens.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 style={sectionTitleStyle}>Recent Activity</h2>
          {mints.length === 0 ? (
            <div style={emptyStyle}>No recent activity</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Token</th>
                  <th style={thStyle}>Employee</th>
                  <th style={thStyle}>Minter</th>
                  <th style={thStyle}>Block</th>
                </tr>
              </thead>
              <tbody>
                {mints.slice(-10).reverse().map((mint) => (
                  <tr key={mint.tokenId.toString()}>
                    <td style={{ ...tdStyle, ...codeStyle }}>#{mint.tokenId.toString()}</td>
                    <td style={{ ...tdStyle, ...codeStyle }}>{mint.employee}</td>
                    <td style={{ ...tdStyle, ...codeStyle }}>{mint.minter}</td>
                    <td style={tdStyle}>{mint.blockNumber.toString()}</td>
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
