import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NFTGallery } from '../NFTGallery'
import type { EmployeeNFTData } from '../../hooks/useEmployeeNFTs'

// --- Fixtures ---

const MOCK_NFTS: EmployeeNFTData[] = [
  {
    tokenId: 1n,
    tokenURI: 'ipfs://QmOne',
    companyName: 'Alpha Corp',
  },
  {
    tokenId: 2n,
    tokenURI: 'ipfs://QmTwo',
    companyName: 'Beta Inc',
  },
  {
    tokenId: 3n,
    tokenURI: 'ipfs://QmThree',
    companyName: 'Alpha Corp',
  },
]

describe('NFTGallery', () => {
  const onSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders NFT cards when data is provided', () => {
    render(
      <NFTGallery
        nfts={MOCK_NFTS}
        isLoading={false}
        error={null}
        onSelect={onSelect}
      />,
    )

    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
    // Alpha Corp appears in 2 card spans + 1 filter option = 3 total
    expect(screen.getAllByText('Alpha Corp')).toHaveLength(3)
    expect(screen.getAllByText('Beta Inc')).toHaveLength(2)
  })

  it('shows skeleton cards during loading', () => {
    const { container } = render(
      <NFTGallery
        nfts={[]}
        isLoading={true}
        error={null}
        onSelect={onSelect}
      />,
    )

    // Should have 6 skeleton cards
    const skeletons = container.querySelectorAll('[data-testid="nft-skeleton"]')
    expect(skeletons).toHaveLength(6)
  })

  it('shows empty state when no NFTs and not loading', () => {
    render(
      <NFTGallery
        nfts={[]}
        isLoading={false}
        error={null}
        onSelect={onSelect}
      />,
    )

    expect(screen.getByText('No recognition NFTs yet')).toBeInTheDocument()
  })

  it('shows error message when error is provided', () => {
    render(
      <NFTGallery
        nfts={[]}
        isLoading={false}
        error={new Error('Failed to load NFTs')}
        onSelect={onSelect}
      />,
    )

    // The error shows both a heading and the error.message
    expect(screen.getAllByText(/Failed to load NFTs/)).toHaveLength(2)
    // Verify the alert role is used
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('calls onSelect when an NFT card is clicked', () => {
    render(
      <NFTGallery
        nfts={MOCK_NFTS}
        isLoading={false}
        error={null}
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByText('#2'))
    expect(onSelect).toHaveBeenCalledWith(MOCK_NFTS[1])
  })

  it('filters NFTs by company name', () => {
    render(
      <NFTGallery
        nfts={MOCK_NFTS}
        isLoading={false}
        error={null}
        onSelect={onSelect}
      />,
    )

    // The filter should show 3 results by default
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()

    // Find the company filter select and change it
    const companySelect = screen.getByRole('combobox', { name: /company/i })
    fireEvent.change(companySelect, { target: { value: 'Alpha Corp' } })

    // After filtering, only Alpha Corp NFTs should show
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
    expect(screen.queryByText('#2')).not.toBeInTheDocument()
  })
})
