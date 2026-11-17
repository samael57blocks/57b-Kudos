import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecognitionBadge } from '../RecognitionBadge'

describe('RecognitionBadge', () => {
  it('renders the value as text when value is provided', () => {
    render(<RecognitionBadge value={5} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    // Verify it renders as a span (pill element)
    expect(screen.getByText('5').tagName).toBe('SPAN')
  })

  it('renders label instead of value when both are provided', () => {
    render(<RecognitionBadge value={100} label="High Performer" />)
    expect(screen.getByText('High Performer')).toBeInTheDocument()
    expect(screen.queryByText('100')).not.toBeInTheDocument()
  })

  it('renders label text when only label is provided', () => {
    render(<RecognitionBadge label="Bronze" />)
    expect(screen.getByText('Bronze')).toBeInTheDocument()
  })

  it('renders nothing when neither value nor label is provided', () => {
    const { container } = render(<RecognitionBadge />)
    expect(container).toBeEmptyDOMElement()
  })

  it('handles bigint values correctly', () => {
    render(<RecognitionBadge value={BigInt(25)} />)
    expect(screen.getByText('25')).toBeInTheDocument()
  })
})
