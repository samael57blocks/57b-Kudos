import { viem } from "hardhat";
import { parseAbi } from "viem";
import { existsSync } from "fs";
import { uploadImage } from "./lib/uploadImage";
import { uploadMetadata } from "./lib/uploadMetadata";

/**
 * Seed script for local development.
 *
 * Prereqs:
 *   1. Deploy contracts via Ignition: `pnpm deploy:localhost`
 *   2. Start a hardhat node: `pnpm node`
 *   3. Run this script: `pnpm seed:localhost`
 *
 * This script:
 *   - Reads deployed contract addresses from the Ignition deployment artifact
 *   - Creates a test company ("57Blocks Labs")
 *   - Registers a test employee
 *   - Mints a test Kudos NFT
 */

// ── ABI snippets (minimal — only the functions we need) ──────

const COMPANY_REGISTRY_ABI = parseAbi([
  "function registerCompany(string calldata name, address adminWallet) external returns (uint256 companyId)",
  "function registerEmployee(uint256 companyId) external",
  "function recognize(address employee, string calldata uri) external returns (uint256 tokenId)",
  "function getCompany(uint256 companyId) external view returns (uint256 id, string name, address admin, uint256 createdAt)",
]);

const NFT57B_ABI = parseAbi([
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
]);

async function main() {
  // ── Resolve deployed addresses from Ignition ─────────────
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const deployedAddresses = require("../ignition/deployments/chain-31337/deployed_addresses.json");

  const nft57bAddress = deployedAddresses["NFT57B#NFT57B"] as `0x${string}`;
  const companyRegistryAddress = deployedAddresses["NFT57B#CompanyRegistry"] as `0x${string}`;

  console.log("📡 Deployed addresses:");
  console.log(`   NFT57B:          ${nft57bAddress}`);
  console.log(`   CompanyRegistry: ${companyRegistryAddress}`);

  // ── Clients ─────────────────────────────────────────────
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  console.log(`\n🔑 Deployer: ${deployer.account.address}\n`);

  // ── Step 1: Register a test company ─────────────────────
  console.log("1️⃣  Registering test company '57Blocks Labs'...");
  const companyName = "57Blocks Labs";
  const companyAdmin = deployer.account.address;

  const registerHash = await deployer.writeContract({
    address: companyRegistryAddress,
    abi: COMPANY_REGISTRY_ABI,
    functionName: "registerCompany",
    args: [companyName, companyAdmin],
  });
  await publicClient.waitForTransactionReceipt({ hash: registerHash });

  const company = await publicClient.readContract({
    address: companyRegistryAddress,
    abi: COMPANY_REGISTRY_ABI,
    functionName: "getCompany",
    args: [0n],
  });
  console.log(`   ✅ Company registered: ID=0, Name="${company[1]}"\n`);

  // ── Step 2: Register deployer as employee ────────────────
  console.log("2️⃣  Registering deployer as employee of company 0...");
  const registerEmpHash = await deployer.writeContract({
    address: companyRegistryAddress,
    abi: COMPANY_REGISTRY_ABI,
    functionName: "registerEmployee",
    args: [0n],
  });
  await publicClient.waitForTransactionReceipt({ hash: registerEmpHash });
  console.log("   ✅ Employee registered\n");

  // ── Step 3: Mint a test Kudos NFT ───────────────────────
  console.log("3️⃣  Minting a test Kudos NFT...");

  // Build the token URI — either via IPFS (if Pinata keys are available)
  // or fall back to an inline data URI for local development
  let tokenUri: string;

  if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
    // ── IPFS pipeline ──────────────────────────────────────
    const placeholderPath = "scripts/assets/placeholder.png";
    if (!existsSync(placeholderPath)) {
      throw new Error(
        `Placeholder image not found at ${placeholderPath}. ` +
        "Run the seed script from the hardhat/ directory.",
      );
    }

    console.log("   📤 Uploading placeholder image to IPFS...");
    const imgCid = await uploadImage(placeholderPath);
    console.log(`   ✅ Image uploaded: ${imgCid}`);

    const metadata = {
      name: "Welcome to the team!",
      description: "First Kudos for joining 57Blocks Labs",
      image: imgCid,
      attributes: [
        { trait_type: "Value", value: "1000" },
        {
          trait_type: "Date",
          value: new Date().toISOString().split("T")[0],
        },
        { trait_type: "Employee", value: "Dev Test" },
      ],
    };

    console.log("   📤 Uploading metadata to IPFS...");
    const metaCid = await uploadMetadata(metadata);
    console.log(`   ✅ Metadata uploaded: ${metaCid}`);

    tokenUri = metaCid; // already in the form "ipfs://<CID>"
  } else {
    // ── Data URI fallback (no Pinata keys) ─────────────────
    tokenUri =
      "data:application/json;base64," +
      Buffer.from(
        JSON.stringify({
          title: "Welcome to the team!",
          description: "First Kudos for joining 57Blocks Labs",
          value: "1000",
          date: new Date().toISOString().split("T")[0],
          employeeName: "Dev Test",
        }),
      ).toString("base64");
  }

  const mintHash = await deployer.writeContract({
    address: companyRegistryAddress,
    abi: COMPANY_REGISTRY_ABI,
    functionName: "recognize",
    args: [deployer.account.address, tokenUri],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });
  console.log(`   ✅ Kudos minted! Tx: ${receipt.transactionHash}\n`);

  // ── Verify ───────────────────────────────────────────────
  const balance = await publicClient.readContract({
    address: nft57bAddress,
    abi: NFT57B_ABI,
    functionName: "balanceOf",
    args: [deployer.account.address],
  });
  console.log(`📊 Employee balance: ${balance} Kudos NFT(s)`);

  if (balance > 0n) {
    const tokenId = await publicClient.readContract({
      address: nft57bAddress,
      abi: NFT57B_ABI,
      functionName: "tokenOfOwnerByIndex",
      args: [deployer.account.address, 0n],
    });
    const uri = await publicClient.readContract({
      address: nft57bAddress,
      abi: NFT57B_ABI,
      functionName: "tokenURI",
      args: [tokenId],
    });
    console.log(`   Token #${tokenId}: ${uri.slice(0, 80)}...`);
  }

  console.log("\n✅ Seed complete! Local environment ready.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
