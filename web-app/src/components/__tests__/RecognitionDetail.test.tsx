import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecognitionDetail } from '../RecognitionDetail'

// --- Hoisted mocks ---

const mockClaim = vi.hoisted(() => vi.fn())
const mockReset = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useClaimNFT', () => ({
  useClaimNFT: vi.fn(() => ({
    claim: mockClaim,
    step: 'idle',
    txHash: undefined,
    error: null,
    reset: mockReset,
  })),
}))

// --- Tests ---

describe('RecognitionDetail', () => {
  const defaultProps = {
    category: 'Innovation' as const,
    employeeName: 'Alice',
    description: 'Great work',
    isOpen: true,
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders claim button when tokenId is provided', () => {
    render(<RecognitionDetail {...defaultProps} tokenId={1n} />)
    expect(screen.getByRole('button', { name: /claim/i })).toBeInTheDocument()
  })

  it('disables claim button when tokenId is null', () => {
    render(<RecognitionDetail {...defaultProps} tokenId={null} />)
    const button = screen.getByRole('button', { name: /claim/i })
    expect(button).toBeDisabled()
  })
})
