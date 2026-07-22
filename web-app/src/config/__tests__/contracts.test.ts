import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock import.meta.env
const originalEnv = { ...import.meta.env }

describe('getContractAddresses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset env
    Object.keys(import.meta.env).forEach((key) => {
      if (key.startsWith('VITE_')) {
        delete (import.meta.env as Record<string, unknown>)[key]
      }
    })
  })

  it('returns null when required env vars are missing', async () => {
    const { getContractAddresses } = await import('../contracts')
    expect(getContractAddresses()).toBeNull()
  })

  it('returns nft57b and companyRegistry when those env vars are set', async () => {
    Object.assign(import.meta.env, {
      VITE_NFT57B_ADDRESS: '0xaaa',
      VITE_COMPANY_REGISTRY_ADDRESS: '0xbbb',
    })
    const { getContractAddresses } = await import('../contracts')
    const result = getContractAddresses()
    expect(result).not.toBeNull()
    expect(result!.nft57b).toBe('0xaaa')
    expect(result!.companyRegistry).toBe('0xbbb')
  })

  it('includes bonusReward when VITE_BONUS_REWARD_ADDRESS is set', async () => {
    Object.assign(import.meta.env, {
      VITE_NFT57B_ADDRESS: '0xaaa',
      VITE_COMPANY_REGISTRY_ADDRESS: '0xbbb',
      VITE_BONUS_REWARD_ADDRESS: '0xccc',
    })
    const { getContractAddresses } = await import('../contracts')
    const result = getContractAddresses()
    expect(result).not.toBeNull()
    expect(result!.bonusReward).toBe('0xccc')
  })

  it('omits bonusReward when VITE_BONUS_REWARD_ADDRESS is not set', async () => {
    Object.assign(import.meta.env, {
      VITE_NFT57B_ADDRESS: '0xaaa',
      VITE_COMPANY_REGISTRY_ADDRESS: '0xbbb',
    })
    const { getContractAddresses } = await import('../contracts')
    const result = getContractAddresses()
    expect(result).not.toBeNull()
    expect(result!.bonusReward).toBeUndefined()
  })
})
