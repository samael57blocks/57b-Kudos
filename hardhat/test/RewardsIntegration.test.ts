import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { getAddress, decodeErrorResult, decodeEventLog } from "viem";

/**
 * Helper: assert a transaction reverts with a specific custom error name.
 * Walks the viem error chain to find the revert data and decodes it.
 */
async function expectRevertWithError(
  act: () => Promise<unknown>,
  abi: unknown[],
  errorName: string
): Promise<void> {
  try {
    await act();
    expect.fail("Expected transaction to revert");
  } catch (e: unknown) {
    const err = e as any;
    let revertData: `0x${string}` | undefined;

    // Walk the error hierarchy to find Solidity revert data
    if (typeof err.walk === "function") {
      err.walk((node: any) => {
        if (typeof node?.data === "string" && node.data.startsWith("0x")) {
          revertData = node.data as `0x${string}`;
          return true;
        }
        return false;
      });
    }

    // Fallback: try direct cause chain or raw data
    if (!revertData && err?.cause?.data) {
      revertData = err.cause.data as `0x${string}`;
    }

    if (!revertData) {
      throw new Error(
        `expectRevertWithError: no revert data found. Error: ${err.message}`
      );
    }

    const decoded = decodeErrorResult({
      abi: abi as any,
      data: revertData,
    });

    expect(decoded.errorName).to.equal(errorName);
  }
}

describe("RewardsIntegration", function () {
  /**
   * Full deploy fixture matching the proven T1.14 wiring pattern.
   * Grants DEFAULT_ADMIN_ROLE to factory on both rewards (for registerCompany
   * to grant per-Company MINTER_ROLE) AND MINTER_ROLE to factory on both
   * rewards (RISK FLAG: factory.onClaimed calls emitReward directly with
   * factory as msg.sender).
   */
  async function integrationFixture() {
    const [owner, companyAdmin, employee, other] =
      await hre.viem.getWalletClients();

    // ── Deploy NFT57B ──
    const nft = await hre.viem.deployContract("NFT57B", [
      owner.account.address,
    ]);

    // ── Deploy reward contracts ──
    const bonus = await hre.viem.deployContract("BonusReward", [
      owner.account.address,
    ]);
    const recognition = await hre.viem.deployContract("RecognitionToken", [
      owner.account.address,
      "57Blocks Recognition",
      "57BR",
    ]);

    // ── Deploy CompanyRegistry factory (reward addresses as immutables) ──
    const registry = await hre.viem.deployContract("CompanyRegistry", [
      nft.address,
      bonus.address,
      recognition.address,
      owner.account.address,
    ]);

    // ── F1.10 wiring: DEFAULT_ADMIN_ROLE to factory on both rewards ──
    const defaultAdminRole = await bonus.read.DEFAULT_ADMIN_ROLE();
    await bonus.write.grantRole([defaultAdminRole, registry.address], {
      account: owner.account,
    });
    await recognition.write.grantRole([defaultAdminRole, registry.address], {
      account: owner.account,
    });

    // ── RISK FLAG wiring: MINTER_ROLE to factory on both rewards ──
    // factory.onClaimed calls emitReward with factory as msg.sender;
    // onlyRole(MINTER_ROLE) requires this grant.
    const BONUS_MINTER_ROLE = await bonus.read.MINTER_ROLE();
    await bonus.write.grantRole([BONUS_MINTER_ROLE, registry.address], {
      account: owner.account,
    });

    const RECOGNITION_MINTER_ROLE = await recognition.read.MINTER_ROLE();
    await recognition.write.grantRole([RECOGNITION_MINTER_ROLE, registry.address], {
      account: owner.account,
    });

    // ── Wire NFT57B → factory ──
    await nft.write.setFactory([registry.address], {
      account: owner.account,
    });

    // ── Platform seed knob (bootstraps _companyRewardAmount for future registrations) ──
    const rewardAmount = 100n * 10n ** 18n; // 100 tokens
    await registry.write.setRewardAmount([rewardAmount], {
      account: owner.account,
    });

    return {
      nft,
      registry,
      bonus,
      recognition,
      owner,
      companyAdmin,
      employee,
      other,
      rewardAmount,
    };
  }

  /**
   * Register a company via the factory admin. Returns the deployed Company
   * address — registerCompany now returns an address, not a companyId.
   */
  async function registerCompany(
    registry: any,
    admin: any,
    name: string,
    adminWallet: `0x${string}`
  ): Promise<`0x${string}`> {
    const { result } = await registry.simulate.registerCompany(
      [name, adminWallet],
      { account: admin.account }
    );
    await registry.write.registerCompany([name, adminWallet], {
      account: admin.account,
    });
    return result as `0x${string}`;
  }

  /**
   * Setup fixture for claim tests: registers a company, employee, grants
   * MINTER_ROLE, mints an NFT via Company.recognize. Provides the ready-to-claim
   * state for all claim-related test cases.
   */
  async function claimFixture() {
    const fixture = await integrationFixture();
    const { registry, nft, owner, companyAdmin, employee, other, rewardAmount } =
      fixture;

    // Register company
    const companyAddress = await registerCompany(
      registry,
      owner,
      "57Blocks",
      companyAdmin.account.address
    );
    const company = await hre.viem.getContractAt("Company", companyAddress);

    // Register `employee` (the NFT recipient who will claim)
    await company.write.registerEmployee(
      [employee.account.address, "Alice"],
      { account: companyAdmin.account }
    );

    // Register `other` as an employee too (grantMinterRole requires active employee)
    await company.write.registerEmployee(
      [other.account.address, "MinterBot"],
      { account: companyAdmin.account }
    );

    // Grant MINTER_ROLE to `other` (active employee ✓)
    await company.write.grantMinterRole([other.account.address], {
      account: companyAdmin.account,
    });

    // `other` recognizes `employee` → mints NFT57B #0 to employee
    await company.write.recognize(
      [employee.account.address, "ipfs://kudos-metadata"],
      { account: other.account }
    );

    return {
      ...fixture,
      company,
      companyAddress,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  R1: Full flow — register → employee → recognize → claim
  // ═══════════════════════════════════════════════════════════════

  describe("R1: Full flow — register → employee → recognize → claim", function () {
    it("R1-Happy: should complete the full rewards cycle end-to-end", async function () {
      const {
        nft,
        registry,
        bonus,
        recognition,
        owner,
        companyAdmin,
        employee,
        rewardAmount,
        companyAddress,
      } = await loadFixture(claimFixture);

      const publicClient = await hre.viem.getPublicClient();

      // Pre-condition: NFT57B #0 owned by employee
      expect(await nft.read.ownerOf([0n])).to.equal(
        getAddress(employee.account.address)
      );

      // ── Claim: employee claims token #0 ──
      const claimHash = await nft.write.claim([0n], {
        account: employee.account,
      });

      // ── NFT is burned ──
      expect(await nft.read.balanceOf([employee.account.address])).to.equal(
        0n
      );

      // ── BonusReward balance = per-company reward amount ──
      const bonusBalance = await bonus.read.balanceOf([
        employee.account.address,
      ]);
      expect(bonusBalance).to.equal(rewardAmount);

      // ── RecognitionToken balance = 1 (one badge per claim) ──
      const recogBalance = await recognition.read.balanceOf([
        employee.account.address,
      ]);
      expect(recogBalance).to.equal(1n);

      // ── RecognitionToken metadata matches the NFT URI ──
      const recogTokenURI = await recognition.read.tokenURI([0n]);
      expect(recogTokenURI).to.equal("ipfs://kudos-metadata");

      // ── Company has NO onClaimed involvement ──
      const company = await hre.viem.getContractAt("Company", companyAddress);
      const companyHasOnClaimed = company.abi.some(
        (item: any) => item.type === "function" && item.name === "onClaimed"
      );
      expect(companyHasOnClaimed).to.be.false;
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  R1-2hop: Assert 2-hop claim chain, no Company involvement
  // ═══════════════════════════════════════════════════════════════

  describe("R1-2hop: 2-hop claim chain", function () {
    it("should assert reward amounts match per-company config and Company has no onClaimed", async function () {
      const {
        nft,
        registry,
        bonus,
        recognition,
        employee,
        companyAddress,
      } = await loadFixture(claimFixture);

      // ── Per-company reward amount matches the platform bootstrap ──
      const companyReward = await registry.read.companyRewardAmount([
        companyAddress,
      ]);
      expect(companyReward).to.equal(100n * 10n ** 18n);

      // ── Company.rewardAmount() delegates to factory.companyRewardAmount(this) ──
      const company = await hre.viem.getContractAt("Company", companyAddress);
      const delegateAmount = await company.read.rewardAmount();
      expect(delegateAmount).to.equal(companyReward);

      // ── Claim → check balances reflect per-company config ──
      await nft.write.claim([0n], { account: employee.account });

      const bonusBalance = await bonus.read.balanceOf([
        employee.account.address,
      ]);
      expect(bonusBalance).to.equal(companyReward);

      const recogBalance = await recognition.read.balanceOf([
        employee.account.address,
      ]);
      expect(recogBalance).to.equal(1n);

      // ── Company has no onClaimed function in its ABI ──
      const companyHasOnClaimed = company.abi.some(
        (item: any) => item.type === "function" && item.name === "onClaimed"
      );
      expect(companyHasOnClaimed).to.be.false;
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  NotNFT57B: Direct call to factory.onClaimed by non-NFT57B
  // ═══════════════════════════════════════════════════════════════

  describe("NotNFT57B: direct call to onClaimed", function () {
    it("should revert NotNFT57B when called directly by a non-NFT57B address", async function () {
      const { registry, other, employee } =
        await loadFixture(integrationFixture);

      await expectRevertWithError(
        () =>
          registry.write.onClaimed(
            [employee.account.address, 0n, "uri"],
            { account: other.account }
          ),
        registry.abi,
        "NotNFT57B"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  EmployeeNotRegistered: claim for unmapped employee
  // ═══════════════════════════════════════════════════════════════

  describe("EmployeeNotRegistered: claim for unmapped employee", function () {
    it("should revert EmployeeNotRegistered when employee is not mapped to any company", async function () {
      const { registry, nft, owner, companyAdmin, employee, other } =
        await loadFixture(integrationFixture);

      // Setup: register company + employee + mint NFT to `other`
      const companyAddress = await registerCompany(
        registry,
        owner,
        "57Blocks",
        companyAdmin.account.address
      );
      const company = await hre.viem.getContractAt("Company", companyAddress);

      // Register `employee` (gets factory routing index)
      await company.write.registerEmployee(
        [employee.account.address, "Alice"],
        { account: companyAdmin.account }
      );

      // Grant MINTER_ROLE to `employee` (active employee ✓)
      await company.write.grantMinterRole([employee.account.address], {
        account: companyAdmin.account,
      });

      // `employee` recognizes `employee` → mints NFT #0 to `employee`
      await company.write.recognize(
        [employee.account.address, "ipfs://self"],
        { account: employee.account }
      );

      // `employee` transfers NFT #0 to `other` via admin transfer
      // (other is not registered as employee — no factory routing entry)
      await nft.write.transferFrom(
        [employee.account.address, other.account.address, 0n],
        { account: owner.account } // admin can transfer
      );

      // `other` is the token owner, but `other` is NOT registered as an employee
      // in the factory routing index → onClaimed reverts EmployeeNotRegistered
      await expectRevertWithError(
        () => nft.write.claim([0n], { account: other.account }),
        registry.abi,
        "EmployeeNotRegistered"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  RewardContractsNotSet: factory deployed with address(0) rewards
  // ═══════════════════════════════════════════════════════════════

  describe("RewardContractsNotSet: zero reward contract addresses", function () {
    it("should revert RewardContractsNotSet when factory reward immutables are zero", async function () {
      const [owner] = await hre.viem.getWalletClients();

      // Deploy the test helper first — its address will be used as the
      // factory's "nft57b" so onClaimed accepts it as msg.sender.
      const caller = await hre.viem.deployContract("OnClaimedCaller", []);

      // Deploy factory with ZERO reward addresses and the helper as "nft57b"
      const registry = await hre.viem.deployContract("CompanyRegistry", [
        caller.address, // nft57b (actually OnClaimedCaller — satisfies msg.sender gate)
        "0x0000000000000000000000000000000000000000", // bonusReward (zero)
        "0x0000000000000000000000000000000000000000", // recognitionToken (zero)
        owner.account.address,
      ]);

      // Employee address for the test (must be mapped in factory routing)
      const employee = "0x0000000000000000000000000000000000000042" as `0x${string}`;

      // registerCompany fails with zero rewards (grantRole on zero address reverts),
      // so we set the _companyByEmployee routing mapping directly via Hardhat RPC.
      // Storage layout (confirmed via storage scan): slot 0 = AccessControl._roles,
      // slot 1 = ReentrancyGuard._status, slot 2 = _companies[], slot 3 = _companyByEmployee.
      // Mapping slot = keccak256(abi.encode(key, 3)).
      const { keccak256 } = await import("viem");

      // Compute mapping slot using viem's keccak256
      const mappingSlot = keccak256(
        `0x${employee.toLowerCase().replace("0x", "").padStart(64, "0")}${"0".repeat(62)}03`
      );

      // Set _companyByEmployee[employee] = caller.address (non-zero = mapped)
      const companyValue = `0x${caller.address.slice(2).toLowerCase().padStart(64, "0")}`;
      await owner.request({
        method: "hardhat_setStorageAt",
        params: [registry.address, mappingSlot, companyValue],
      });

      // Verify the storage was set
      const storedValue = await owner.request({
        method: "eth_getStorageAt",
        params: [registry.address, mappingSlot, "latest"],
      });
      expect((storedValue as string).toLowerCase()).to.equal(companyValue.toLowerCase());

      // Now onClaimed passes employee routing → hits zero reward contracts
      await expectRevertWithError(
        () =>
          caller.write.callOnClaimed(
            [registry.address, employee, 0n, "ipfs://test"],
            { account: owner.account }
          ),
        registry.abi,
        "RewardContractsNotSet"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  Double-claim: claim a burned token
  // ═══════════════════════════════════════════════════════════════

  describe("Double-claim: claim a burned token", function () {
    it("should revert when trying to claim a token that was already burned", async function () {
      const { nft, employee } = await loadFixture(claimFixture);

      // First claim succeeds (burns token)
      await nft.write.claim([0n], { account: employee.account });

      // Second claim on same token reverts:
      // _ownerOf returns address(0) for burned token, which ≠ msg.sender → ClaimNotAllowed
      await expectRevertWithError(
        () => nft.write.claim([0n], { account: employee.account }),
        nft.abi,
        "ClaimNotAllowed"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  CompanyRewardAmountUpdated flow (admin + bootstrap)
  // ═══════════════════════════════════════════════════════════════

  describe("CompanyRewardAmountUpdated: admin and bootstrap paths", function () {
    it("admin path: admin sets new amount → event emitted → claim uses new amount", async function () {
      const {
        registry,
        nft,
        bonus,
        owner,
        companyAdmin,
        employee,
        companyAddress,
      } = await loadFixture(claimFixture);

      const publicClient = await hre.viem.getPublicClient();
      const company = await hre.viem.getContractAt("Company", companyAddress);
      const newAmount = 200n * 10n ** 18n;

      // ── Admin sets new reward amount via Company delegate ──
      const setHash = await company.write.setRewardAmount([newAmount], {
        account: companyAdmin.account,
      });

      // ── CompanyRewardAmountUpdated event emitted from the factory ──
      const updatedLogs = await publicClient.getLogs({
        address: registry.address,
        fromBlock: 0n,
        event: {
          type: "event",
          name: "CompanyRewardAmountUpdated",
          inputs: [
            { type: "address", name: "company", indexed: true },
            { type: "uint256", name: "amount", indexed: false },
          ],
        },
      });
      expect(updatedLogs.length).to.be.greaterThan(0);
      const lastLog = updatedLogs[updatedLogs.length - 1];
      expect(getAddress(lastLog.args.company)).to.equal(
        getAddress(companyAddress)
      );
      expect(lastLog.args.amount).to.equal(newAmount);

      // ── Claim uses the new amount ──
      await nft.write.claim([0n], { account: employee.account });

      const bonusBalance = await bonus.read.balanceOf([
        employee.account.address,
      ]);
      expect(bonusBalance).to.equal(newAmount);
    });

    it("bootstrap path: newly registered company picks up platform knob", async function () {
      const {
        registry,
        nft,
        bonus,
        owner,
        companyAdmin,
        employee,
        other,
        rewardAmount,
      } = await loadFixture(integrationFixture);

      // Register company → bootstrapped from platform seed knob (100 tokens)
      const companyAddress = await registerCompany(
        registry,
        owner,
        "57Blocks",
        companyAdmin.account.address
      );
      const company = await hre.viem.getContractAt("Company", companyAddress);

      // Verify bootstrap value
      const bootstrappedAmount = await registry.read.companyRewardAmount([
        companyAddress,
      ]);
      expect(bootstrappedAmount).to.equal(rewardAmount);

      // Register employee and `other` (as minter)
      await company.write.registerEmployee(
        [employee.account.address, "Alice"],
        { account: companyAdmin.account }
      );
      await company.write.registerEmployee(
        [other.account.address, "MinterBot"],
        { account: companyAdmin.account }
      );
      await company.write.grantMinterRole([other.account.address], {
        account: companyAdmin.account
      });

      // `other` recognizes `employee` → mints NFT
      await company.write.recognize(
        [employee.account.address, "ipfs://test"],
        { account: other.account }
      );

      // Claim → uses bootstrapped amount
      await nft.write.claim([0n], { account: employee.account });

      const bonusBalance = await bonus.read.balanceOf([
        employee.account.address,
      ]);
      expect(bonusBalance).to.equal(rewardAmount);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  Full R1 claim-chain integration test
  // ═══════════════════════════════════════════════════════════════

  describe("R1: Full claim-chain integration", function () {
    it("end-to-end: all wiring, events, balances, and error paths in one flow", async function () {
      const {
        nft,
        registry,
        bonus,
        recognition,
        owner,
        companyAdmin,
        employee,
        other,
        rewardAmount,
      } = await loadFixture(integrationFixture);

      const publicClient = await hre.viem.getPublicClient();

      // ── Step 1: Register company ──
      const companyAddress = await registerCompany(
        registry,
        owner,
        "57Blocks",
        companyAdmin.account.address
      );
      expect(companyAddress).to.match(/^0x[0-9a-fA-F]{40}$/);
      expect(await registry.read.isCompany([companyAddress])).to.be.true;

      // CompanyRegistered event
      const registeredLogs = await publicClient.getLogs({
        address: registry.address,
        fromBlock: 0n,
        event: {
          type: "event",
          name: "CompanyRegistered",
          inputs: [
            { type: "uint256", name: "companyId", indexed: true },
            { type: "address", name: "companyAddress", indexed: true },
            { type: "address", name: "owner", indexed: true },
            { type: "string", name: "name", indexed: false },
          ],
        },
      });
      expect(registeredLogs.length).to.equal(1);
      expect(registeredLogs[0].args.companyId).to.equal(1n);
      expect(registeredLogs[0].args.name).to.equal("57Blocks");

      // ── Step 2: Register employee and minter via Company ──
      const company = await hre.viem.getContractAt("Company", companyAddress);
      await company.write.registerEmployee(
        [employee.account.address, "Alice"],
        { account: companyAdmin.account }
      );
      // Register `other` as minter employee (grantMinterRole requires active employee)
      await company.write.registerEmployee(
        [other.account.address, "MinterBot"],
        { account: companyAdmin.account }
      );
      expect(await company.read.isEmployee([employee.account.address])).to.be
        .true;
      expect(await company.read.getEmployeeName([employee.account.address])).to.equal(
        "Alice"
      );
      expect(
        getAddress(
          await registry.read.getCompanyAddressByEmployee([
            employee.account.address,
          ])
        )
      ).to.equal(getAddress(companyAddress));

      // ── Step 3: Grant MINTER_ROLE to `other` and recognize ──
      await company.write.grantMinterRole([other.account.address], {
        account: companyAdmin.account,
      });
      const recognizeHash = await company.write.recognize(
        [employee.account.address, "ipfs://kudos-metadata"],
        { account: other.account }
      );

      // NFT minted to employee
      expect(await nft.read.ownerOf([0n])).to.equal(
        getAddress(employee.account.address)
      );
      expect(await nft.read.tokenURI([0n])).to.equal("ipfs://kudos-metadata");

      // Recognized event from the Company
      const recognizeReceipt = await publicClient.getTransactionReceipt({
        hash: recognizeHash,
      });
      const recognizeLog = recognizeReceipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi: company.abi,
              data: log.data,
              topics: log.topics,
            });
          } catch {
            return null;
          }
        })
        .find((e) => e && e.eventName === "Recognized") as {
        eventName: "Recognized";
        args: { tokenId: bigint; employee: `0x${string}` };
      } | undefined;
      expect(recognizeLog).to.not.be.undefined;
      expect(recognizeLog!.args.tokenId).to.equal(0n);

      // ── Step 4: Claim → burns NFT → factory.onClaimed mints rewards directly ──
      const claimHash = await nft.write.claim([0n], {
        account: employee.account,
      });

      // NFT burned
      expect(await nft.read.balanceOf([employee.account.address])).to.equal(
        0n
      );

      // ClaimInitiated event from NFT57B
      const claimReceipt = await publicClient.getTransactionReceipt({
        hash: claimHash,
      });
      const claimLog = claimReceipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi: nft.abi,
              data: log.data,
              topics: log.topics,
            });
          } catch {
            return null;
          }
        })
        .find((e) => e && e.eventName === "ClaimInitiated") as {
        eventName: "ClaimInitiated";
        args: { tokenId: bigint; employee: `0x${string}` };
      } | undefined;
      expect(claimLog).to.not.be.undefined;
      expect(claimLog!.args.tokenId).to.equal(0n);
      expect(claimLog!.args.employee.toLowerCase()).to.equal(
        employee.account.address.toLowerCase()
      );

      // BonusReward: per-company amount
      const bonusBalance = await bonus.read.balanceOf([
        employee.account.address,
      ]);
      expect(bonusBalance).to.equal(rewardAmount);

      // RecognitionToken: 1 badge
      const recogBalance = await recognition.read.balanceOf([
        employee.account.address,
      ]);
      expect(recogBalance).to.equal(1n);
      const recogTokenURI = await recognition.read.tokenURI([0n]);
      expect(recogTokenURI).to.equal("ipfs://kudos-metadata");

      // ── Step 5: Verify factory is the source of truth for reward amounts ──
      const factoryAmount = await registry.read.companyRewardAmount([
        companyAddress,
      ]);
      expect(factoryAmount).to.equal(rewardAmount);
      expect(await company.read.rewardAmount()).to.equal(rewardAmount);

      // ── Step 6: Admin updates reward amount → factory stores new value ──
      const newAmount = 200n * 10n ** 18n;
      await company.write.setRewardAmount([newAmount], {
        account: companyAdmin.account,
      });
      expect(await registry.read.companyRewardAmount([companyAddress])).to.equal(
        newAmount
      );
      expect(await company.read.rewardAmount()).to.equal(newAmount);

      // ── Step 7: Error paths ──
      // NotNFT57B: direct call to onClaimed
      await expectRevertWithError(
        () =>
          registry.write.onClaimed(
            [owner.account.address, 999n, "uri"],
            { account: owner.account }
          ),
        registry.abi,
        "NotNFT57B"
      );

      // EmployeeNotRegistered: claim for unmapped employee
      const unmapped = "0x0000000000000000000000000000000000000001" as `0x${string}`;
      await expectRevertWithError(
        () =>
          registry.read.getCompanyAddressByEmployee([unmapped]),
        registry.abi,
        "EmployeeNotRegistered"
      );
    });
  });
});
