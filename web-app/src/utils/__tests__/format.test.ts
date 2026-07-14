import { describe, it, expect } from 'vitest'
import { formatAddress, buildExplorerTxUrl } from '../format'

describe('formatAddress', () => {
  it('truncates a valid 42-char address', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678'
    expect(formatAddress(addr)).toBe('0x1234...5678')
  })

  it('handles a short address without length guard', () => {
    const addr = '0x1234'
    expect(formatAddress(addr)).toBe('0x1234...1234')
  })
})

describe('buildExplorerTxUrl', () => {
  it('returns undefined when txHash is undefined', () => {
    expect(buildExplorerTxUrl(undefined)).toBeUndefined()
  })

  it('uses default etherscan.io when no baseUrl provided', () => {
    expect(buildExplorerTxUrl('0xabc')).toBe(
      'https://etherscan.io/tx/0xabc',
    )
  })

  it('uses custom baseUrl when provided', () => {
    expect(
      buildExplorerTxUrl('0xabc', 'https://sepolia.etherscan.io'),
    ).toBe('https://sepolia.etherscan.io/tx/0xabc')
  })
})
