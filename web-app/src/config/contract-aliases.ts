import type { PublicClient } from 'viem'
import {
  COMPANY_REGISTRY_ABI,
  COMPANY_ABI,
  getContractAddresses,
} from './contracts'

// ── Company Resolution ────────────────────────────────────────────────────────

/** A resolved Company contract address */
export type CompanyAddress = `0x${string}`

/** Result of resolving a Company address from the factory */
export interface ResolvedCompany {
  /** The Company contract address */
  address: CompanyAddress
  /** The companyId (1-based registration id) */
  companyId: bigint
}

// ── Registry Read Helpers ─────────────────────────────────────────────────────

/**
 * Resolve a Company address by employee address.
 * Uses factory.getCompanyAddressByEmployee(employee).
 * Returns null if EmployeeNotRegistered.
 */
export async function resolveCompanyByEmployee(
  publicClient: PublicClient,
  employee: `0x${string}`,
): Promise<ResolvedCompany | null> {
  const contracts = getContractAddresses()
  if (!contracts) return null

  try {
    const companyAddress = (await publicClient.readContract({
      address: contracts.companyRegistry,
      abi: COMPANY_REGISTRY_ABI,
      functionName: 'getCompanyAddressByEmployee',
      args: [employee],
    })) as CompanyAddress

    if (companyAddress === '0x0000000000000000000000000000000000000000')
      return null

    return { address: companyAddress, companyId: 0n }
  } catch {
    return null
  }
}

/**
 * Resolve a Company address by companyId.
 * Uses factory.getCompanyAddress(companyId).
 * Returns null if CompanyNotFound.
 */
export async function resolveCompanyById(
  publicClient: PublicClient,
  companyId: bigint,
): Promise<ResolvedCompany | null> {
  const contracts = getContractAddresses()
  if (!contracts) return null

  try {
    const companyAddress = (await publicClient.readContract({
      address: contracts.companyRegistry,
      abi: COMPANY_REGISTRY_ABI,
      functionName: 'getCompanyAddress',
      args: [companyId],
    })) as CompanyAddress

    if (companyAddress === '0x0000000000000000000000000000000000000000')
      return null

    return { address: companyAddress, companyId }
  } catch {
    return null
  }
}

/**
 * Check if an address is a factory-deployed Company.
 * Uses factory.isCompany(address).
 */
export async function isCompanyAddress(
  publicClient: PublicClient,
  address: `0x${string}`,
): Promise<boolean> {
  const contracts = getContractAddresses()
  if (!contracts) return false

  try {
    return (await publicClient.readContract({
      address: contracts.companyRegistry,
      abi: COMPANY_REGISTRY_ABI,
      functionName: 'isCompany',
      args: [address],
    })) as boolean
  } catch {
    return false
  }
}

/**
 * Get all registered Company addresses.
 * Uses factory.getCompanies().
 */
export async function getAllCompanies(
  publicClient: PublicClient,
): Promise<CompanyAddress[]> {
  const contracts = getContractAddresses()
  if (!contracts) return []

  try {
    return (await publicClient.readContract({
      address: contracts.companyRegistry,
      abi: COMPANY_REGISTRY_ABI,
      functionName: 'getCompanies',
    })) as CompanyAddress[]
  } catch {
    return []
  }
}

/**
 * Get the total number of registered companies.
 * Uses factory.companyCount().
 */
export async function getCompanyCount(
  publicClient: PublicClient,
): Promise<bigint> {
  const contracts = getContractAddresses()
  if (!contracts) return 0n

  try {
    return (await publicClient.readContract({
      address: contracts.companyRegistry,
      abi: COMPANY_REGISTRY_ABI,
      functionName: 'companyCount',
    })) as bigint
  } catch {
    return 0n
  }
}

// ── Company Read Helpers ──────────────────────────────────────────────────────

/**
 * Get a Company's name by its address.
 * Uses Company.name().
 */
export async function getCompanyName(
  publicClient: PublicClient,
  companyAddress: CompanyAddress,
): Promise<string | null> {
  try {
    return (await publicClient.readContract({
      address: companyAddress,
      abi: COMPANY_ABI,
      functionName: 'name',
    })) as string
  } catch {
    return null
  }
}

/**
 * Check if an address is an active employee of a Company.
 * Uses Company.isEmployee(address).
 */
export async function isEmployeeOf(
  publicClient: PublicClient,
  companyAddress: CompanyAddress,
  employee: `0x${string}`,
): Promise<boolean> {
  try {
    return (await publicClient.readContract({
      address: companyAddress,
      abi: COMPANY_ABI,
      functionName: 'isEmployee',
      args: [employee],
    })) as boolean
  } catch {
    return false
  }
}

/**
 * Check if an address holds MINTER_ROLE on a Company.
 * Uses Company.hasMinterRole(address).
 */
export async function hasMinterRoleOn(
  publicClient: PublicClient,
  companyAddress: CompanyAddress,
  account: `0x${string}`,
): Promise<boolean> {
  try {
    return (await publicClient.readContract({
      address: companyAddress,
      abi: COMPANY_ABI,
      functionName: 'hasMinterRole',
      args: [account],
    })) as boolean
  } catch {
    return false
  }
}
