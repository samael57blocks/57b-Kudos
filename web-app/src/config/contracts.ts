import { parseAbi } from 'viem'

// ── Chain IDs ─────────────────────────────────────────────────────────────────

export const HARDHAT_CHAIN_ID = 31337
export const SEPOLIA_CHAIN_ID = 11_155_111

// ── Address resolution ────────────────────────────────────────────────────────

export interface ContractAddresses {
  nft57b: `0x${string}`
  companyRegistry: `0x${string}`
  recognitionToken?: `0x${string}`
  bonusReward?: `0x${string}`
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

  const envRecognitionToken = import.meta.env
    .VITE_RECOGNITION_TOKEN_ADDRESS as `0x${string}` | undefined
  const envBonusReward = import.meta.env
    .VITE_BONUS_REWARD_ADDRESS as `0x${string}` | undefined

  if (envNFT && envRegistry) {
    return {
      nft57b: envNFT,
      companyRegistry: envRegistry,
      ...(envRecognitionToken ? { recognitionToken: envRecognitionToken } : {}),
      ...(envBonusReward ? { bonusReward: envBonusReward } : {}),
    }
  }

  // No addresses configured yet — user needs to deploy contracts first
  return null
}

// ── ABIs (minimal — only the functions/events we need) ─────────────────────────

export const NFT57B_ABI = parseAbi([
  // Read
  'function balanceOf(address owner) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
  // Write
  'function burn(uint256 tokenId) external',
  'function claim(uint256 tokenId) external',
  // AccessControl
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() external pure returns (bytes32)',
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event ClaimInitiated(address indexed employee, uint256 indexed tokenId, string uri)',
])

export const COMPANY_REGISTRY_ABI = parseAbi([
  // Read
  'function getCompany(uint256 companyId) external view returns ((uint256 id, string name, address admin, uint256 createdAt))',
  'function getEmployeeCompany(address employee) external view returns (uint256 companyId)',
  'function isEmployee(address employee) external view returns (bool)',
  'function nft57b() external view returns (address)',
  // Write
  'function registerCompany(string calldata name, address adminWallet) external returns (uint256 companyId)',
  'function getEmployeeName(address employee) external view returns (string)',
  'function registerEmployee(address employee, uint256 companyId, string calldata name) external',
  'function updateEmployeeName(address employee, string calldata name) external',
  'function recognize(address employee, string calldata uri) external returns (uint256 tokenId)',
  // AccessControl
  'function MINTER_ROLE() external pure returns (bytes32)',
  'function grantMinterRole(address account) external',
  'function revokeMinterRole(address account) external',
  'function mintKudos(address to, string calldata uri) external returns (uint256)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  // Events
  'event CompanyRegistered(uint256 indexed companyId, string name, address indexed admin)',
  'event EmployeeRegistered(uint256 indexed companyId, address indexed employee, string name)',
  'event Recognized(uint256 indexed tokenId, uint256 indexed companyId, address indexed employee)',
  'event MinterRoleGranted(uint256 indexed companyId, address indexed employee)',
  'event MinterRoleRevoked(uint256 indexed companyId, address indexed employee)',
  'event KudosMinted(uint256 indexed tokenId, uint256 indexed companyId, address indexed employee, address minter)',
])

export const RECOGNITION_TOKEN_ABI = parseAbi([
  'function balanceOf(address owner) external view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function grantRole(bytes32 role, address account) external',
  'function revokeRole(bytes32 role, address account) external',
  'function MINTER_ROLE() external pure returns (bytes32)',
])

export const BONUS_REWARD_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function claimReward() external',
  'event RewardClaimed(address indexed claimer, uint256 amount)',
])
