import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MinterDashboard } from '../MinterDashboard'
import type { ReactNode } from 'react'

// --- Hoisted mocks ---

const mockUseAccount = vi.hoisted(() => vi.fn())
const mockUseCompanyId = vi.hoisted(() => vi.fn())
const mockUsePublicClient = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
  usePublicClient: mockUsePublicClient,
}))

vi.mock('../../hooks/useCompanyId', () => ({
  useCompanyId: mockUseCompanyId,
}))

vi.mock('../../config/contracts', () => ({
  getContractAddresses: () => ({
    companyRegistry: '0xRegistry',
    nft57b: '0xNFT57B',
  }),
}))

// Mock Layout to just render children
vi.mock('../../components/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

// --- Fixtures ---

const MOCK_MINTS = [
  { args: { tokenId: 1n, companyId: 1n, employee: '0xEmp1' as `0x${string}`, minter: '0xMinter' as `0x${string}` }, blockNumber: 100n },
  { args: { tokenId: 2n, companyId: 1n, employee: '0xEmp2' as `0x${string}`, minter: '0xMinter' as `0x${string}` }, blockNumber: 200n },
  { args: { tokenId: 3n, companyId: 1n, employee: '0xEmp1' as `0x${string}`, minter: '0xOther' as `0x${string}` }, blockNumber: 300n },
]

function setupMocks(overrides: {
  account?: { address?: `0x${string}`; isConnected?: boolean }
  companyId?: { companyId?: bigint | null; isLoading?: boolean }
  logs?: { mints: unknown[] }
} = {}) {
  mockUseAccount.mockReturnValue({
    address: '0xMinter' as `0x${string}`,
    isConnected: true,
    ...(overrides.account ?? {}),
  })
  mockUseCompanyId.mockReturnValue({
    companyId: 1n,
    isLoading: false,
    ...(overrides.companyId ?? {}),
  })

  const mints = overrides.logs?.mints ?? MOCK_MINTS

  // Use a stable reference for publicClient to prevent useEffect re-runs
  const stableGetLogs = vi.fn().mockReturnValue(Promise.resolve(mints))
  const stableClient = { getLogs: stableGetLogs }
  mockUsePublicClient.mockReturnValue(stableClient)
}

function renderDashboard() {
  return render(<MinterDashboard />)
}

// --- Tests ---

describe('MinterDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders stat cards with total mints, my mints, and last mint', async () => {
    renderDashboard()

    // Wait for async data to load
    await waitFor(() => {
      expect(screen.getByText('Block #300')).toBeInTheDocument()
    })

    expect(screen.getByText('Total Mints')).toBeInTheDocument()
    expect(screen.getByText('My Mints')).toBeInTheDocument()
    expect(screen.getByText('Last Mint')).toBeInTheDocument()

    // Stats use getAllByText since "2" and "3" appear in table too
    const threes = screen.getAllByText('3')
    expect(threes.length).toBeGreaterThanOrEqual(1)
    const twos = screen.getAllByText('2')
    expect(twos.length).toBeGreaterThanOrEqual(1)
  })

  it('renders employee NFT table with data', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('#1, #3')).toBeInTheDocument()
    })

    expect(screen.getByText('Employee NFTs')).toBeInTheDocument()
    // Employees appear in both tables, so getAllByText
    expect(screen.getAllByText('0xEmp1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('0xEmp2').length).toBeGreaterThanOrEqual(1)
    // #2 appears in both Employee NFT table and Recent Activity table
    expect(screen.getAllByText('#2').length).toBeGreaterThanOrEqual(1)
  })

  it('renders recent activity list', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getAllByText(/0xEmp1/i).length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getAllByText(/0xEmp2/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty state when no mints exist', async () => {
    setupMocks({ logs: { mints: [] } })
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Total Mints')).toBeInTheDocument()
    })

    // Both stat cards show 0
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('No mints yet')).toBeInTheDocument()
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })

  it('shows not connected message when wallet is disconnected', () => {
    setupMocks({ account: { isConnected: false } })
    renderDashboard()

    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
  })

  it('shows loading state while companyId is resolving', () => {
    setupMocks({ companyId: { companyId: null, isLoading: true } })
    renderDashboard()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
