import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NFTTable } from '../NFTTable'

// --- Hoisted mocks ---

const mockUseCompanyNFTs = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useCompanyNFTs', () => ({
  useCompanyNFTs: mockUseCompanyNFTs,
}))

// --- Fixtures ---

const COMPANY_ID = 42n

const MOCK_NFTS = [
  {
    tokenId: 1n,
    tokenURI: 'ipfs://QmFirst',
    employee: '0x1111111111111111111111111111111111111111' as `0x${string}`,
    value: '1000',
    date: '2024-01-15',
  },
  {
    tokenId: 2n,
    tokenURI: 'ipfs://QmSecond',
    employee: '0x2222222222222222222222222222222222222222' as `0x${string}`,
    value: '500',
    date: '2024-02-20',
  },
  {
    tokenId: 3n,
    tokenURI: 'ipfs://QmThird',
    employee: '0x3333333333333333333333333333333333333333' as `0x${string}`,
    value: '250',
    date: '2024-03-10',
  },
]

// --- Helper ---

function setupNFTState(overrides: Record<string, unknown> = {}) {
  const defaults = {
    nfts: MOCK_NFTS,
    isLoading: false,
    error: null,
  }
  mockUseCompanyNFTs.mockReturnValue({ ...defaults, ...overrides })
}

function renderTable() {
  return render(<NFTTable companyId={COMPANY_ID} />)
}

// --- Tests ---

describe('NFTTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupNFTState()
  })

  it('renders column headers', () => {
    renderTable()

    expect(screen.getByText('Token ID')).toBeInTheDocument()
    expect(screen.getByText('Employee')).toBeInTheDocument()
    expect(screen.getByText('Value (ETH)')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Metadata')).toBeInTheDocument()
  })

  it('shows loading skeleton rows when isLoading is true', () => {
    setupNFTState({ isLoading: true, nfts: [] })
    renderTable()

    // Should show 5 skeleton rows
    const skeletonRows = screen.getAllByTestId('skeleton-row')
    expect(skeletonRows).toHaveLength(5)

    // Should NOT show data or empty state
    expect(screen.queryByText('No NFTs minted yet')).not.toBeInTheDocument()
  })

  it('shows empty state when no NFTs', () => {
    setupNFTState({ nfts: [] })
    renderTable()

    expect(screen.getByText('No NFTs minted yet')).toBeInTheDocument()
  })

  it('renders NFT data rows with truncated employee addresses', () => {
    renderTable()

    // Token IDs
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()

    // Truncated addresses
    expect(screen.getByText('0x1111...1111')).toBeInTheDocument()
    expect(screen.getByText('0x2222...2222')).toBeInTheDocument()
    expect(screen.getByText('0x3333...3333')).toBeInTheDocument()

    // Values in ETH (wei to ETH conversion)
    expect(screen.getByText('1000')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('250')).toBeInTheDocument()

    // Dates
    expect(screen.getByText('2024-01-15')).toBeInTheDocument()
    expect(screen.getByText('2024-02-20')).toBeInTheDocument()
    expect(screen.getByText('2024-03-10')).toBeInTheDocument()
  })

  it('shows metadata link that opens ipfs:// gateway URL', () => {
    renderTable()

    const links = screen.getAllByRole('link', { name: /view/i })
    expect(links).toHaveLength(3)

    // First NFT link should point to IPFS gateway
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('QmFirst'))
    expect(links[1]).toHaveAttribute('href', expect.stringContaining('QmSecond'))
  })

  describe('filters', () => {
    it('filters by employee address text', () => {
      renderTable()

      // Type in employee address filter
      fireEvent.change(screen.getByPlaceholderText(/filter.*employee/i), {
        target: { value: '0x1111' },
      })

      // Should show only matching row
      expect(screen.getByText('0x1111...1111')).toBeInTheDocument()
      expect(screen.queryByText('0x2222...2222')).not.toBeInTheDocument()
    })

    it('shows all rows when employee filter is cleared', () => {
      renderTable()

      const filterInput = screen.getByPlaceholderText(/filter.*employee/i)

      // Filter to show only one
      fireEvent.change(filterInput, { target: { value: '0x1111' } })
      expect(screen.queryByText('0x2222...2222')).not.toBeInTheDocument()

      // Clear filter
      fireEvent.change(filterInput, { target: { value: '' } })

      // All should show
      expect(screen.getByText('0x1111...1111')).toBeInTheDocument()
      expect(screen.getByText('0x2222...2222')).toBeInTheDocument()
    })
  })
})
