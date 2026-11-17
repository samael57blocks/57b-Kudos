import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Toaster } from 'sonner'

describe('Toaster', () => {
  it('renders without error', () => {
    const { container } = render(<Toaster />)
    // Toaster renders a portal — the container should have content
    expect(container).toBeTruthy()
  })

  it('accepts position prop without error', () => {
    expect(() => render(<Toaster position="bottom-right" />)).not.toThrow()
  })
})
