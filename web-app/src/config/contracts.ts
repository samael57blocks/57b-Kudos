import { parseAbi } from 'viem'

// ── Chain IDs ─────────────────────────────────────────────────────────────────

export const HARDHAT_CHAIN_ID = 31337
export const SEPOLIA_CHAIN_ID = 11_155_111

// ── Address resolution ────────────────────────────────────────────────────────

export interface ContractAddresses {
  nft57b: `0x${string}`
  companyRegistry: `0x${string}`
}

/**
 * Resolve contract addresses for the current chain.
 * Falls back to env vars for flexibility (useful during development).
 */
export function getContractAddresses(): ContractAddresses | null {
  // If env vars are set, use those regardless of chain
  const envNFT = import.meta.env.VITE_NFT57B_ADDRESS as `0x${string}` | undefined
  const envRegistry = import.meta.env
    .VITE_COMPANY_REGISTRY_ADDRESS as `0x${string}` | undefined

  if (envNFT && envRegistry) {
    return { nft57b: envNFT, companyRegistry: envRegistry }
  }

  // No addresses configured yet — user needs to deploy contracts first
  return null
}

// ── ABIs (minimal — only the functions/events we need) ─────────────────────────

export const NFT57B_ABI = parseAbi([
  // Read
  'function balanceOf(address owner) external view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
  // Write
  'function burn(uint256 tokenId) external',
  // AccessControl
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() external pure returns (bytes32)',
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
])

export const COMPANY_REGISTRY_ABI = parseAbi([
  // Read
  'function getCompany(uint256 companyId) external view returns ((uint256 id, string name, address admin, uint256 createdAt))',
  'function getEmployeeCompany(address employee) external view returns (uint256 companyId)',
  'function nft57b() external view returns (address)',
  // Write
  'function registerCompany(string calldata name, address adminWallet) external returns (uint256 companyId)',
  'function registerEmployee(uint256 companyId) external',
  'function recognize(address employee, string calldata uri) external returns (uint256 tokenId)',
  // Events
  'event CompanyRegistered(uint256 indexed companyId, string name, address indexed admin)',
  'event EmployeeRegistered(uint256 indexed companyId, address indexed employee)',
  'event Recognized(uint256 indexed tokenId, uint256 indexed companyId, address indexed employee)',
])
