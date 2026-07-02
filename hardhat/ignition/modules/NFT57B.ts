import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Default reward amount: 100 $57BB tokens (18 decimals).
 * CompanyRegistry mints this to employees when they claim an NFT57B.
 */
const DEFAULT_REWARD_AMOUNT = 100n * 10n ** 18n;

/**
 * NFT57B — Full deployment module
 *
 * Deploys the entire 57Blocks Kudos system:
 *   1. NFT57B (core ERC-721)
 *   2. CompanyRegistry (orchestrator)
 *   3. BonusReward (ERC-20 bonus token)
 *   4. RecognitionToken (permanent ERC-721 badge)
 *
 * Post-deploy wiring:
 *   - NFT57B.setCompanyRegistry(CompanyRegistry)
 *   - Grant MINTER_ROLE to CompanyRegistry on both reward contracts
 *   - CompanyRegistry.setRewardContracts(BonusReward, RecognitionToken)
 *   - CompanyRegistry.setRewardAmount(100 * 10^18)
 *
 * @param defaultAdmin — Module parameter, address that receives DEFAULT_ADMIN_ROLE everywhere
 */
export default buildModule("NFT57B", (m) => {
  const defaultAdmin = m.getParameter("defaultAdmin");

  // ── 1. Core contracts ──────────────────────────────────

  const nft57b = m.contract("NFT57B", [defaultAdmin]);
  const companyRegistry = m.contract("CompanyRegistry", [nft57b, defaultAdmin]);

  // Wire: NFT57B → CompanyRegistry (for claim → onClaimed callback)
  m.call(nft57b, "setCompanyRegistry", [companyRegistry]);

  // ── 2. Reward contracts ────────────────────────────────

  const bonusReward = m.contract("BonusReward", [defaultAdmin]);
  const recognitionToken = m.contract("RecognitionToken", [
    defaultAdmin,
    "57Blocks Recognition Badge",
    "57BR",
  ]);

  // Read MINTER_ROLE constant from BonusReward (same bytes32 for both reward contracts)
  const minterRole = m.staticCall(bonusReward, "MINTER_ROLE");

  // Grant MINTER_ROLE to CompanyRegistry so it can mint rewards on claim
  m.call(bonusReward, "grantRole", [minterRole, companyRegistry]);
  m.call(recognitionToken, "grantRole", [minterRole, companyRegistry]);

  // Wire: CompanyRegistry → reward contracts + reward amount
  m.call(companyRegistry, "setRewardContracts", [bonusReward, recognitionToken]);
  m.call(companyRegistry, "setRewardAmount", [DEFAULT_REWARD_AMOUNT]);

  return { nft57b, companyRegistry, bonusReward, recognitionToken };
});
