# Employee Recognition NFT Platform 🏆

A decentralized application (dApp) that enables registered companies to mint and distribute unique ERC-721 NFTs to their employees as verifiable, on-chain recognition of achievements and contributions.

Built on Ethereum (Sepolia testnet → Mainnet), with a focus on security, gas optimization, and clean architecture.

## Project Structure

```
├── hardhat/          # Smart contracts, tests, deployments (Hardhat + Ignition)
├── web-app/          # React + Vite + wagmi frontend
├── backend/          # Off-chain API (company registration, KYC-light)
├── proposal.md       # Technical proposal and architecture overview
├── AGENTS.md         # AI agent instructions and project conventions
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contracts** | Solidity 0.8.x, OpenZeppelin, ERC-721 |
| **Dev Framework** | Hardhat + Ignition |
| **Frontend** | React 19, Vite, TypeScript (strict) |
| **Web3** | wagmi v2+, viem, TanStack Query |
| **Backend** | Node.js + TypeScript (Express/Hono) |
| **Package Manager** | pnpm (exclusive) |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20 LTS
- [pnpm](https://pnpm.io/) >= 9
- [MetaMask](https://metamask.io/) or any WalletConnect-compatible wallet

## Getting Started

### 1. Install dependencies

```bash
# Root project — no shared deps yet
# Install hardhat dependencies
cd hardhat && pnpm install
# Install frontend dependencies
cd ../web-app && pnpm install
# Backend — TBD
```

### 2. Environment variables

Copy the example env files and fill in your keys:

```bash
cp hardhat/.env.example hardhat/.env
cp web-app/.env.example web-app/.env
```

Required services:
- **RPC URL**: Infura or Alchemy (Sepolia + Mainnet)
- **Etherscan API key**: For contract verification
- **Wallet private key**: For contract deployments (Sepolia only — never mainnet)

### 3. Compile contracts

```bash
cd hardhat
pnpm compile
```

### 4. Run tests

```bash
cd hardhat
pnpm test
```

### 5. Start frontend dev server

```bash
cd web-app
pnpm dev
```

## Deployment

Targets:
- **Sepolia testnet**: Development and QA
- **Ethereum Mainnet**: Production (future)

Deploy with Hardhat Ignition:

```bash
cd hardhat
pnpm deploy:sepolia    # Deploy to Sepolia
pnpm verify:sepolia    # Verify contracts on Etherscan
```

## Metadata & IPFS

NFT metadata (images + attribute JSON) is stored on IPFS via **Pinata** to guarantee immutability and decentralization.

### Flow Architecture

```
Upload (Hardhat scripts / Web App)
        │
        ▼
    ┌─────────────┐       ┌──────────────────┐
    │ Pinata API  │──────▶│  IPFS (filecoin) │
    │ pinFile/    │       │  ┌──────────────┐│
    │ pinJSON     │       │  │ CID │───────▶│ Content
    └─────────────┘       │  └──────────────┘│
        │                 └──────────────────┘
        │                        │
        ▼                        ▼
  ipfs://<CID>        IPFS Gateway (resolution)
```

**What gets uploaded?**
1. **Image** — achievement PNG (optional, via `pinFileToIPFS`)
2. **Metadata JSON** — name, description, image CID, and attributes (via `pinJSONToIPFS`)
3. The metadata JSON CID is the one stored on-chain as `tokenURI`

**When does it upload?**
- **Seed script** (`hardhat/scripts/seed.ts`): during local development, uploads placeholder image + metadata and mints a test NFT
- **Frontend** (`web-app/src/utils/ipfs.ts`): when a company admin mints an NFT from the UI, metadata is uploaded before calling `safeMint`

**How is it resolved?**
- Contracts store the URI as `ipfs://<CID>`
- The frontend resolves via `resolveMetadata(uri)` which:
  1. Extracts the CID from the URI
  2. Fetches from the configured gateway (`VITE_PINATA_GATEWAY`)
  3. Caches the result in an LRU (max 50 entries) to avoid unnecessary re-fetches

### Pinata Setup

You need a [Pinata](https://app.pinata.cloud/) account with API keys. Keys go in the `.env` files:

**Hardhat** (deploy/seed scripts):
```env
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
```

**Web App** (frontend — keys are exposed to the client):
```env
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud
```

> ⚠️ Pinata keys are not critical secrets (they only allow uploading files to your account), but they're still managed via `.env` and never committed.

### Metadata JSON Structure

Follows the [OpenSea Metadata Standard](https://docs.opensea.io/docs/metadata-standards) for marketplace and explorer compatibility:

```json
{
  "name": "Welcome to the team!",
  "description": "First Kudos for joining 57Blocks Labs",
  "image": "ipfs://Qm...",
  "attributes": [
    { "trait_type": "Value", "value": "1000" },
    { "trait_type": "Date", "value": "2026-07-03" },
    { "trait_type": "Employee", "value": "Dev Test" }
  ]
}
```

The structure is identical in both the contract (`MetadataBuilder.sol`) and the frontend (`web-app/src/utils/metadata.ts`) — they both generate the same schema.

### Useful Commands

```bash
# Upload metadata from hardhat (local seed)
cd hardhat
pnpm seed:localhost

# Verify metadata resolution (tests)
cd hardhat && pnpm test -- --grep upload
cd web-app  && pnpm test -- --grep ipfs
```

## Development Workflow

This project follows a **Spec-Driven Development (SDD)** workflow:
1. **Explore** — Investigate ideas and requirements
2. **Propose** — Formal proposal with intent, scope, and approach
3. **Spec** — Detailed specification with scenarios
4. **Design** — Technical architecture and component design
5. **Tasks** — Breakdown into implementation tasks
6. **Apply** — Implement tasks in batches
7. **Verify** — Validate against specs

**Git Flow**: `feature/*` branches off `develop`, merge via PR. No direct commits to `main`.

## Security

- Smart contracts use OpenZeppelin audited base implementations
- Role-based access control (AccessControl) for all privileged operations
- Emergency pause mechanism via Pausable
- Immutable metadata — once minted, token data cannot be altered
- Environment variables strictly managed via `.env` (never committed)

## License

MIT
