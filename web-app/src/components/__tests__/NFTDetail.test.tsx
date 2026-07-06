import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NFTDetail } from '../NFTDetail'
import type { EmployeeNFTData } from '../../hooks/useEmployeeNFTs'

// --- Mock useTokenMetadata ---

const mockUseTokenMetadata = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useTokenMetadata', () => ({
  useTokenMetadata: mockUseTokenMetadata,
}))

// --- Fixtures ---

const MOCK_NFT: EmployeeNFTData = {
  tokenId: 42n,
  tokenURI: 'ipfs://QmTest',
  companyName: 'Test Corp',
}

describe('NFTDetail', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Default: metadata loaded
    mockUseTokenMetadata.mockReturnValue({
      data: {
        name: 'Employee of the Month',
        description: 'Awarded for outstanding performance',
        value: '1000',
        date: '2024-01-15',
      },
      isLoading: false,
      error: null,
    })
  })

  it('renders NFT details when open with nft data', () => {
    render(<NFTDetail nft={MOCK_NFT} isOpen={true} onClose={onClose} />)

    expect(screen.getByText('NFT #42')).toBeInTheDocument()
    expect(screen.getByText('Test Corp')).toBeInTheDocument()
    expect(screen.getByText('Employee of the Month')).toBeInTheDocument()
    expect(screen.getByText('Awarded for outstanding performance')).toBeInTheDocument()
    expect(screen.getByText('1000')).toBeInTheDocument()
    expect(screen.getByText('2024-01-15')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<NFTDetail nft={MOCK_NFT} isOpen={false} onClose={onClose} />)

    expect(screen.queryByText('NFT #42')).not.toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', () => {
    render(<NFTDetail nft={MOCK_NFT} isOpen={true} onClose={onClose} />)

    // Click on the backdrop (the overlay)
    const overlay = screen.getByTestId('modal-overlay')
    fireEvent.click(overlay)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape key is pressed', () => {
    render(<NFTDetail nft={MOCK_NFT} isOpen={true} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
