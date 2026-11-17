import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

describe('Test infrastructure', () => {
  it('renders in jsdom and supports jest-dom matchers', () => {
    render(<div>Hello Vitest</div>)
    expect(screen.getByText('Hello Vitest')).toBeInTheDocument()
  })

  describe('QueryClient defaults', () => {
    it('has expected default query options', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })

      // Verify the default options are stored correctly
      const defaultOptions = queryClient.getDefaultOptions()
      expect(defaultOptions.queries?.staleTime).toBe(30_000)
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false)
      expect(defaultOptions.queries?.retry).toBe(1)
    })
  })
})
