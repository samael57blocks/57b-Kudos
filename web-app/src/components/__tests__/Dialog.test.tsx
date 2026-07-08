import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Dialog } from '../Dialog'

// --- Hoisted mocks ---

vi.mock('react-dom', () => ({
  createPortal: (children: React.ReactNode) => children,
}))

// --- Tests ---

describe('Dialog', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <Dialog open={false} onClose={vi.fn()}>
        <div>Content</div>
      </Dialog>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders children when open is true', () => {
    render(
      <Dialog open={true} onClose={vi.fn()}>
        <div>Visible Content</div>
      </Dialog>,
    )

    expect(screen.getByText('Visible Content')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()

    render(
      <Dialog open={true} onClose={onClose}>
        <div>Content</div>
      </Dialog>,
    )

    // The backdrop has role="dialog"
    const backdrop = screen.getByRole('dialog')
    fireEvent.click(backdrop)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()

    render(
      <Dialog open={true} onClose={onClose}>
        <div>Content</div>
      </Dialog>,
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when clicking inside dialog content', () => {
    const onClose = vi.fn()

    render(
      <Dialog open={true} onClose={onClose}>
        <div data-testid="inner-content">Content</div>
      </Dialog>,
    )

    // Click the inner content — stopPropagation on the dialog container
    // should prevent the backdrop's onClick from firing.
    fireEvent.click(screen.getByTestId('inner-content'))

    expect(onClose).not.toHaveBeenCalled()
  })
})
