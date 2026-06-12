# Proposal: Employee Recognition NFT Platform

## Intent

Build a decentralized application (dApp) that enables registered companies to mint and distribute unique ERC-721 NFTs to their employees as verifiable, on-chain recognition of achievements and contributions. Each NFT represents a specific accomplishment with an associated value, creating a permanent, transparent, and portable record of professional growth.

The platform bridges two distinct user roles — **Company** (issuer) and **Employee** (recipient) — each with tailored views and capabilities, while maintaining a single unified smart contract layer.

---

## Scope

### In Scope
- ERC-721 smart contract with role-based access control (owner/admin = company, minter role for authorized operators)
- Company registration and onboarding flow (KYC-light, wallet-based identity)
- NFT minting with unique metadata (achievement title, description, value, date, employee address)
- Employee dashboard: connect wallet, view owned NFTs with metadata, visual gallery
- Company dashboard: mint NFTs, assign to employee addresses, view all issued NFTs, manage metadata
- Token URI metadata standard compliant with OpenSea and common marketplaces
- Gas-optimized batch minting for company efficiency

### Out of Scope
- NFT marketplace or secondary trading (employees cannot yet transfer/sell — controlled by contract policy)
- KYC/AML verification beyond wallet-based company registration
- Fiat on-ramp or payment processing
- Mobile native apps (responsive web only)
- Multi-chain deployment (Ethereum mainnet + Sepolia testnet only)
- Employee self-claiming or request-based minting (company-initiated only)

---

## Capabilities

> This section is the contract between proposal and spec phases.

### New Capabilities
- `company-registration`: On-chain + off-chain company identity registration, approval workflow, and admin management
- `nft-minting`: Authorized minting of unique ERC-721 tokens with structured achievement metadata
- `employee-portfolio`: Wallet-connected view for employees to browse, filter, and display their earned NFTs
- `company-dashboard`: Administrative dashboard for company operators to mint, assign, and manage NFT issuance
- `nft-metadata`: Decentralized metadata storage (IPFS/Arweave) and token URI resolution conforming to ERC-721 metadata standard

### Modified Capabilities
- None (greenfield project — no existing spec to modify)

---

## Approach

### Smart Contract Layer
- Solidity v0.8.x, ERC-721 with `ERC721URIStorage` + `ERC721Enumerable` extensions
- OpenZeppelin's `AccessControl` for role management (DEFAULT_ADMIN_ROLE, MINTER_ROLE)
- Company registration via factory pattern or registry contract
- Metadata frozen at mint time — immutable achievement record

### Frontend Layer
- React + Vite + TypeScript with strict mode
- `wagmi` v2+ for wallet connection and contract interactions
- `viem` for low-level RPC and type-safe ABI encoding
- `@tanstack/react-query` for blockchain state caching and optimistic updates
- Conditional rendering based on connected wallet role (company vs employee)

### Infrastructure
- Hardhat (development, testing, deployment) or Foundry for faster compilation
- IPFS via Pinata/Filebase for metadata and asset storage
- Sepolia testnet for development, Ethereum mainnet for production
- Environment-based contract address and network configuration

---

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `contracts/NFT57B.sol` | New | Main ERC-721 contract with role-based access |
| `contracts/CompanyRegistry.sol` | New | Company identity and registration contract |
| `contracts/libraries/MetadataBuilder.sol` | New | Metadata URI construction helper |
| `test/` | New | Unit and integration tests for all contracts |
| `scripts/deploy.ts` | New | Deployment script with network configuration |
| `src/` | New | React frontend with role-based routing |
| `src/components/company/` | New | Company dashboard components |
| `src/components/employee/` | New | Employee portfolio components |
| `src/hooks/` | New | wagmi + react-query hooks for contract interaction |
| `src/utils/metadata.ts` | New | IPFS upload and metadata formatting utilities |

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Gas cost for batch minting too high for small companies | Medium | Implement ERC-721A for batch mints; offer gas estimation before minting |
| Employee wallet adoption friction | Medium | Support WalletConnect + browser extension wallets; clear onboarding guide |
| Metadata permanence if IPFS pinning service goes down | Low | Use Filebase with redundancy; consider Arweave for permanent storage |
| Smart contract vulnerability in role management | Low | OpenZeppelin audited contracts; extensive test coverage; Slither analysis |
| Company admin key management risk | Medium | Support multi-sig wallet for company admin (Gnosis Safe integration deferred to v2) |

---

## Rollback Plan

- **Before first employee mint**: Upgrade contract (UUPS proxy) or redeploy if critical bug found
- **After mints active**: Pause minting via emergency stop (OpenZeppelin `Pausable`); no metadata or ownership can be altered for existing tokens (immutable by design)
- **Deployment rollback**: Revert to previous contract address in frontend `.env` and redeploy frontend
- **Metadata rollback**: IPFS content is immutable; pointer in contract can be updated if using updatable URI pattern (proxied metadata)

---

## Dependencies

- OpenZeppelin Contracts v5.x (AccessControl, ERC-721, Pausable)
- IPFS pinning service (Pinata or Filebase) with paid subscription
- Infura/Alchemy RPC endpoint for Sepolia and mainnet
- Etherscan API key for contract verification
- WalletConnect Project ID (if supporting WalletConnect)

---

## Success Criteria

- [ ] Company can register and be approved on-chain
- [ ] Authorized company operator can mint an NFT and assign it to an employee wallet
- [ ] Employee can connect wallet and view their entire NFT collection
- [ ] Employee can click an NFT to see full metadata (title, description, value, date)
- [ ] Company dashboard lists all issued NFTs with assignment status
- [ ] All contract functions have 90%+ test coverage
- [ ] Deployment scripts work for Sepolia testnet
- [ ] Frontend builds with zero TypeScript errors in strict mode
