import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

describe('Test infrastructure', () => {
  it('renders in jsdom and supports jest-dom matchers', () => {
    render(<div>Hello Vitest</div>)
    expect(screen.getByText('Hello Vitest')).toBeInTheDocument()
  })
})
