# Deploy Guide — 57Blocks Kudos

## Prerequisites

- **pnpm** v9+ (root workspace install: `pnpm install`)
- **Hardhat** — already included in `hardhat/` package
- **.env** — copy `hardhat/.env.example` to `hardhat/.env` and fill in:

  ```bash
  # Required for Sepolia
  SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id
  DEPLOYER_PRIVATE_KEY=0x...
  ETHERSCAN_API_KEY=your_etherscan_key
  ```

---

## Localhost (development)

### 1. Start a Hardhat node

```bash
cd hardhat
pnpm node
# Chain ID: 31337
# Accounts: 20 test wallets pre-funded (standard Hardhat mnemonic)
```

### 2. Deploy contracts via Ignition

In a **separate terminal**:

```bash
cd hardhat
pnpm deploy:localhost
```

This deploys all 4 contracts in order:
  1. `NFT57B` — core ERC-721
  2. `CompanyRegistry` — orchestrator (minting authority)
  3. `BonusReward` — ERC-20 bonus token
  4. `RecognitionToken` — permanent ERC-721 badge

Post-deploy wiring is done automatically (grant roles, set addresses, set reward amount).

### 3. Seed test data (optional)

```bash
pnpm seed:localhost
```

Creates:
- A test company ("57Blocks Labs")
- Registers the deployer wallet as employee
- Mints 1 test Kudos NFT

### 4. Verify deployment

```bash
# Check deployed addresses
cat ignition/deployments/localhost/deployed_addresses.json
```

---

## Sepolia (testnet)

### 1. Configure parameters

Edit `ignition/params/sepolia.json` and set your `defaultAdmin` address:

```json
{
  "defaultAdmin": "0xYourAdminWalletAddress"
}
```

### 2. Set environment variables

```bash
# In hardhat/.env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<your_project_id>
DEPLOYER_PRIVATE_KEY=0x<deployer_wallet_private_key>
ETHERSCAN_API_KEY=<your_etherscan_api_key>
```

> ⚠️ The deployer wallet needs Sepolia ETH. Use a faucet like:
> - https://sepoliafaucet.com/
> - https://www.alchemy.com/faucets/ethereum-sepolia

### 3. Deploy

```bash
cd hardhat
pnpm deploy:sepolia
```

Ignition deploys interactively — you see each step as it executes.

### 4. Verify on Etherscan

```bash
pnpm verify:sepolia
```

Contracts are verified automatically if `ETHERSCAN_API_KEY` is set.

---

## Contract addresses (post-deploy)

After any deploy, Ignition writes the addresses to:

```
hardhat/ignition/deployments/<network>/deployed_addresses.json
```

Example output:

```json
{
  "NFT57B#NFT57B": "0x...",
  "NFT57B#CompanyRegistry": "0x...",
  "NFT57B#BonusReward": "0x...",
  "NFT57B#RecognitionToken": "0x..."
}
```

---

## Quick reference

| Command | What it does |
|---------|-------------|
| `pnpm deploy:localhost` | Deploy all contracts to local node |
| `pnpm seed:localhost` | Seed test data (company + employee + Kudos) |
| `pnpm deploy:sepolia` | Deploy all contracts to Sepolia testnet |
| `pnpm verify:sepolia` | Verify contracts on Etherscan |
| `pnpm node` | Start Hardhat local node |

---

## Architecture — contract wiring

```
                    ┌──────────────────────────┐
                    │      NFT57B (ERC-721)     │
                    │  safeMint() only via       │
                    │  CompanyRegistry           │
                    └──────────┬───────────────┘
                               │ setCompanyRegistry()
                               │
                    ┌──────────▼───────────────┐
                    │    CompanyRegistry        │
                    │  - registerCompany()      │
                    │  - recognize()            │
                    │  - onClaimed()            │
                    └──┬──────────────┬────────┘
                       │              │
              MINTER   │              │  MINTER
              _ROLE    │              │  _ROLE
                       │              │
              ┌────────▼───┐   ┌──────▼────────┐
              │ BonusReward │   │RecognitionToken│
              │  (ERC-20)   │   │  (ERC-721)     │
              └────────────┘   └───────────────┘
```
