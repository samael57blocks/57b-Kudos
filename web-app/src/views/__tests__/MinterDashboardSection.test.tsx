import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MinterDashboardSection } from '../MinterDashboardSection'

// --- Hoisted mocks ---

const mockUseAccount = vi.hoisted(() => vi.fn())
const mockUsePublicClient = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
  usePublicClient: mockUsePublicClient,
}))

vi.mock('../../config/contracts', () => ({
  getContractAddresses: () => ({
    companyRegistry: '0xRegistry',
    nft57b: '0xNFT57B',
  }),
}))

// --- Fixtures ---

const MOCK_MINTS = [
  { args: { tokenId: 1n, companyId: 1n, employee: '0xEmp1' as `0x${string}`, minter: '0xMinter' as `0x${string}` }, blockNumber: 100n },
  { args: { tokenId: 2n, companyId: 1n, employee: '0xEmp2' as `0x${string}`, minter: '0xMinter' as `0x${string}` }, blockNumber: 200n },
  { args: { tokenId: 3n, companyId: 1n, employee: '0xEmp1' as `0x${string}`, minter: '0xOther' as `0x${string}` }, blockNumber: 300n },
]

function setupMocks(overrides: {
  account?: { address?: `0x${string}`; isConnected?: boolean }
  logs?: { mints: unknown[] }
} = {}) {
  mockUseAccount.mockReturnValue({
    address: '0xMinter' as `0x${string}`,
    isConnected: true,
    ...(overrides.account ?? {}),
  })

  const mints = overrides.logs?.mints ?? MOCK_MINTS
  const stableGetLogs = vi.fn().mockReturnValue(Promise.resolve(mints))
  const stableClient = { getLogs: stableGetLogs }
  mockUsePublicClient.mockReturnValue(stableClient)
}

function renderSection(companyId: bigint | null = 1n) {
  return render(<MinterDashboardSection companyId={companyId} />)
}

// --- Tests ---

describe('MinterDashboardSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders heading "Minter Dashboard"', async () => {
    renderSection()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /minter dashboard/i })).toBeInTheDocument()
    })
  })

  it('renders stat cards with total mints, my mints, and last mint block', async () => {
    renderSection()

    await waitFor(() => {
      expect(screen.getByText('Block #300')).toBeInTheDocument()
    })

    expect(screen.getByText('Total Mints')).toBeInTheDocument()
    expect(screen.getByText('My Mints')).toBeInTheDocument()
    expect(screen.getByText('Last Mint')).toBeInTheDocument()
  })

  it('renders employee NFT table with data', async () => {
    renderSection()

    await waitFor(() => {
      expect(screen.getByText('#1, #3')).toBeInTheDocument()
    })

    expect(screen.getByText('Employee NFTs')).toBeInTheDocument()
    expect(screen.getAllByText('0xEmp1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('0xEmp2').length).toBeGreaterThanOrEqual(1)
  })

  it('renders recent activity list', async () => {
    renderSection()

    await waitFor(() => {
      expect(screen.getAllByText(/0xEmp1/i).length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getAllByText(/0xEmp2/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty state when no mints exist', async () => {
    setupMocks({ logs: { mints: [] } })
    renderSection()

    await waitFor(() => {
      expect(screen.getByText('Total Mints')).toBeInTheDocument()
    })

    expect(screen.getByText('No mints yet')).toBeInTheDocument()
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })

  it('shows not connected message when wallet is disconnected', () => {
    setupMocks({ account: { isConnected: false } })
    renderSection()

    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
  })

  it('shows loading state while companyId is resolving', () => {
    renderSection(null)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
