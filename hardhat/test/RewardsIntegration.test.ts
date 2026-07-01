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
  async function integrationFixture() {
    const [owner, companyAdmin, employee, other] =
      await hre.viem.getWalletClients();

    // ── Deploy NFT57B ──
    const nft = await hre.viem.deployContract("NFT57B", [
      owner.account.address,
    ]);

    // ── Deploy CompanyRegistry ──
    const registry = await hre.viem.deployContract("CompanyRegistry", [
      nft.address,
      owner.account.address,
    ]);

    // ── Deploy BonusReward ──
    const bonus = await hre.viem.deployContract("BonusReward", [
      owner.account.address,
    ]);

    // ── Deploy RecognitionToken ──
    const recognition = await hre.viem.deployContract("RecognitionToken", [
      owner.account.address,
      "57Blocks Recognition",
      "57BR",
    ]);

    // ── Wire up roles ──

    // Grant MINTER_ROLE on BonusReward to CompanyRegistry
    const BONUS_MINTER_ROLE = await bonus.read.MINTER_ROLE();
    await bonus.write.grantRole([BONUS_MINTER_ROLE, registry.address], {
      account: owner.account,
    });

    // Grant MINTER_ROLE on RecognitionToken to CompanyRegistry
    const RECOGNITION_MINTER_ROLE = await recognition.read.MINTER_ROLE();
    await recognition.write.grantRole(
      [RECOGNITION_MINTER_ROLE, registry.address],
      { account: owner.account }
    );

    // ── Wire up contract addresses ──

    // Set CompanyRegistry address on NFT57B (enables safeMint from registry)
    await nft.write.setCompanyRegistry([registry.address], {
      account: owner.account,
    });

    // Set reward contracts and amount on CompanyRegistry
    const rewardAmount = 100n * 10n ** 18n; // 100 tokens
    await registry.write.setRewardContracts(
      [bonus.address, recognition.address],
      { account: owner.account }
    );
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
      } = await loadFixture(integrationFixture);

      const uri = "ipfs://kudos-metadata";

      // ── Step 1: Register company ──
      await registry.write.registerCompany(
        ["57Blocks", companyAdmin.account.address],
        { account: owner.account }
      );

      // ── Step 2: Register employee ──
      await registry.write.registerEmployee([0n], {
        account: employee.account,
      });

      // ── Step 3: Recognize (companyAdmin calls registry.recognize()) ──
      const recognizeHash = await registry.write.recognize(
        [employee.account.address, uri],
        { account: companyAdmin.account }
      );

      // Verify NFT was minted via recognize
      expect(await nft.read.ownerOf([0n])).to.equal(
        getAddress(employee.account.address)
      );
      expect(await nft.read.tokenURI([0n])).to.equal(uri);

      // Verify Recognized event params
      const publicClient = await hre.viem.getPublicClient();
      const recognizeReceipt = await publicClient.getTransactionReceipt({
        hash: recognizeHash,
      });
      const recognizeLog = recognizeReceipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi: registry.abi,
              data: log.data,
              topics: log.topics,
            });
          } catch {
            return null;
          }
        })
        .find((e) => e && e.eventName === "Recognized") as {
        eventName: "Recognized";
        args: { tokenId: bigint; companyId: bigint; employee: `0x${string}` };
      } | undefined;
      expect(recognizeLog).to.not.be.undefined;
      if (recognizeLog && recognizeLog.args) {
        expect(recognizeLog.args.tokenId).to.equal(0n);
      }

      // ── Step 4: Claim (employee claims token 0) ──
      await nft.write.claim([0n], { account: employee.account });

      // ── Step 5: Verify NFT is burned ──
      expect(await nft.read.balanceOf([employee.account.address])).to.equal(0n);

      // ── Step 6: Verify BonusReward balance ──
      const bonusBalance = await bonus.read.balanceOf([
        employee.account.address,
      ]);
      expect(bonusBalance).to.equal(rewardAmount);

      // ── Step 7: Verify RecognitionToken balance ──
      const recogBalance = await recognition.read.balanceOf([
        employee.account.address,
      ]);
      expect(recogBalance).to.equal(1n);

      // ── Step 8: Verify RecognitionToken metadata ──
      const recogTokenURI = await recognition.read.tokenURI([0n]);
      expect(recogTokenURI).to.equal(uri);
    });
  });

  describe("R2: Claim — edge cases", function () {
    it("R2-Error: should revert with ClaimNotAllowed when non-owner tries to claim", async function () {
      const {
        nft,
        registry,
        owner,
        companyAdmin,
        employee,
        other,
      } = await loadFixture(integrationFixture);

      // Setup: register company, employee, mint via recognize
      await registry.write.registerCompany(
        ["57Blocks", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([0n], {
        account: employee.account,
      });
      await registry.write.recognize([employee.account.address, "ipfs://test"], {
        account: companyAdmin.account,
      });

      // other (not the owner) tries to claim
      await expectRevertWithError(
        () => nft.write.claim([0n], { account: other.account }),
        nft.abi,
        "ClaimNotAllowed"
      );
    });

    it("R2-Error: should revert with EnforcedPause when contract is paused", async function () {
      const {
        nft,
        registry,
        owner,
        companyAdmin,
        employee,
      } = await loadFixture(integrationFixture);

      // Setup: register company, employee, mint via recognize
      await registry.write.registerCompany(
        ["57Blocks", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([0n], {
        account: employee.account,
      });
      await registry.write.recognize([employee.account.address, "ipfs://test"], {
        account: companyAdmin.account,
      });

      // Pause contract
      await nft.write.pause({ account: owner.account });

      // Claim when paused reverts with EnforcedPause
      await expectRevertWithError(
        () => nft.write.claim([0n], { account: employee.account }),
        nft.abi,
        "EnforcedPause"
      );
    });

    it("R2-Error: should revert with CompanyRegistryNotSet when companyRegistry is 0", async function () {
      const { nft, registry, owner, companyAdmin, employee } =
        await loadFixture(integrationFixture);

      // Setup: register company, employee, mint via recognize
      await registry.write.registerCompany(
        ["57Blocks", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([0n], {
        account: employee.account,
      });
      await registry.write.recognize([employee.account.address, "ipfs://test"], {
        account: companyAdmin.account,
      });

      // Reset companyRegistry to zero via admin
      await nft.write.setCompanyRegistry([
        "0x0000000000000000000000000000000000000000",
      ], { account: owner.account });

      // Claim should revert because companyRegistry is 0
      await expectRevertWithError(
        () => nft.write.claim([0n], { account: employee.account }),
        nft.abi,
        "CompanyRegistryNotSet"
      );
    });
  });

  describe("R3: Recognize — edge cases", function () {
    it("R3-Error: should revert with CompanyNotFound when company does not exist", async function () {
      const { registry, employee } =
        await loadFixture(integrationFixture);

      // Try to register employee to a non-existent company
      await expectRevertWithError(
        () =>
          registry.write.registerEmployee([0n], {
            account: employee.account,
          }),
        registry.abi,
        "CompanyNotFound"
      );
    });
  });

  describe("R4: onClaimed — edge cases", function () {
    it("R4-Error: should revert with NotNFT57B when called directly by non-NFT57B", async function () {
      const { registry, other, employee } =
        await loadFixture(integrationFixture);

      await expectRevertWithError(
        () =>
          registry.write.onClaimed([employee.account.address, 0n, "uri"], {
            account: other.account,
          }),
        registry.abi,
        "NotNFT57B"
      );
    });

    it("R4-Error: should revert with RewardContractsNotSet when reward contracts are zero", async function () {
      const [owner] = await hre.viem.getWalletClients();

      // Deploy without reward contracts
      const nft = await hre.viem.deployContract("NFT57B", [
        owner.account.address,
      ]);
      const registry = await hre.viem.deployContract("CompanyRegistry", [
        nft.address,
        owner.account.address,
      ]);

      // Set companyRegistry on NFT57B so safeMint can be called
      await nft.write.setCompanyRegistry([registry.address], {
        account: owner.account,
      });

      // Register company and employee to use recognize for minting
      await registry.write.registerCompany(
        ["Test", owner.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([0n], {
        account: owner.account,
      });

      // Mint via recognize
      await registry.write.recognize([owner.account.address, "ipfs://test"], {
        account: owner.account,
      });

      // Claim should fail because onClaimed reverts with RewardContractsNotSet
      await expectRevertWithError(
        () => nft.write.claim([0n], { account: owner.account }),
        registry.abi,
        "RewardContractsNotSet"
      );
    });
  });

  describe("R5: Access control on new functions", function () {
    it("R5-Happy: setCompanyRegistry can only be called by DEFAULT_ADMIN", async function () {
      const { nft, owner, other } = await loadFixture(integrationFixture);

      // other (not admin) should not be able to set company registry
      await expectRevertWithError(
        () =>
          nft.write.setCompanyRegistry(
            ["0x0000000000000000000000000000000000000001"],
            { account: other.account }
          ),
        nft.abi,
        "AccessControlUnauthorizedAccount"
      );

      // Admin can set it
      const newRegistry = "0x0000000000000000000000000000000000000002";
      await nft.write.setCompanyRegistry([newRegistry], {
        account: owner.account,
      });
      const stored = await nft.read.companyRegistry();
      expect(stored.toLowerCase()).to.equal(newRegistry.toLowerCase());
    });

    it("R5-Happy: setRewardContracts can only be called by DEFAULT_ADMIN", async function () {
      const { registry, other } = await loadFixture(integrationFixture);

      await expectRevertWithError(
        () =>
          registry.write.setRewardContracts(
            [
              "0x0000000000000000000000000000000000000001",
              "0x0000000000000000000000000000000000000002",
            ],
            { account: other.account }
          ),
        registry.abi,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("R7: recognize — edge cases", function () {
    it("R7-Error: should revert with OnlyCompanyAdmin when non-admin calls recognize", async function () {
      const { registry, owner, companyAdmin, employee, other } =
        await loadFixture(integrationFixture);

      const uri = "ipfs://test";

      // Setup company and employee
      await registry.write.registerCompany(
        ["57Blocks", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([0n], {
        account: employee.account,
      });

      // other (not companyAdmin) tries to recognize
      await expectRevertWithError(
        () =>
          registry.write.recognize([employee.account.address, uri], {
            account: other.account,
          }),
        registry.abi,
        "OnlyCompanyAdmin"
      );
    });

    it("R7-Error: should revert with OnlyCompanyAdmin when admin from wrong company calls recognize", async function () {
      const { registry, owner, companyAdmin, employee } =
        await loadFixture(integrationFixture);

      const uri = "ipfs://test";
      const [otherAdmin] = await hre.viem.getWalletClients();

      // Setup company 0 and employee
      await registry.write.registerCompany(
        ["57Blocks", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([0n], {
        account: employee.account,
      });

      // Register another company with a different admin
      await registry.write.registerCompany(
        ["OtherCorp", otherAdmin.account.address],
        { account: owner.account }
      );

      // otherAdmin (admin of company 1, not company 0) tries to recognize employee of company 0
      await expectRevertWithError(
        () =>
          registry.write.recognize([employee.account.address, uri], {
            account: otherAdmin.account,
          }),
        registry.abi,
        "OnlyCompanyAdmin"
      );
    });

    it("R7-Error: should revert with EmployeeNotInCompany when employee not registered", async function () {
      const { registry, owner, companyAdmin, other } =
        await loadFixture(integrationFixture);

      const uri = "ipfs://test";

      // Setup company
      await registry.write.registerCompany(
        ["57Blocks", companyAdmin.account.address],
        { account: owner.account }
      );

      // Try to recognize an unregistered employee
      await expectRevertWithError(
        () =>
          registry.write.recognize([other.account.address, uri], {
            account: companyAdmin.account,
          }),
        registry.abi,
        "EmployeeNotInCompany"
      );
    });
  });

  describe("R6: Events on new functions", function () {
    it("R6-Happy: claim should emit ClaimInitiated with correct params", async function () {
      const { nft, registry, owner, companyAdmin, employee } =
        await loadFixture(integrationFixture);

      await registry.write.registerCompany(
        ["57Blocks", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([0n], {
        account: employee.account,
      });
      await registry.write.recognize([employee.account.address, "ipfs://test"], {
        account: companyAdmin.account,
      });

      // Claim and decode event
      const hash = await nft.write.claim([0n], { account: employee.account });
      const publicClient = await hre.viem.getPublicClient();
      const receipt = await publicClient.getTransactionReceipt({ hash });

      // Find the ClaimInitiated event in the logs
      const claimLog = receipt.logs
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
      if (claimLog) {
        expect(claimLog.eventName).to.equal("ClaimInitiated");
        expect(claimLog.args.tokenId).to.equal(0n);
        expect(claimLog.args.employee.toLowerCase()).to.equal(
          employee.account.address.toLowerCase()
        );
      }
    });

    it("R6-Happy: setCompanyRegistry should emit CompanyRegistryUpdated", async function () {
      const { nft, owner } = await loadFixture(integrationFixture);

      const newRegistry = "0x0000000000000000000000000000000000000001";
      const hash = await nft.write.setCompanyRegistry([newRegistry], {
        account: owner.account,
      });

      // Decode event params
      const publicClient = await hre.viem.getPublicClient();
      const receipt = await publicClient.getTransactionReceipt({ hash });

      const updatedLog = receipt.logs
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
        .find((e) => e && e.eventName === "CompanyRegistryUpdated") as {
        eventName: "CompanyRegistryUpdated";
        args: { registry: `0x${string}` };
      } | undefined;
      expect(updatedLog).to.not.be.undefined;
      if (updatedLog && updatedLog.args) {
        expect(updatedLog.args.registry.toLowerCase()).to.equal(
          newRegistry.toLowerCase()
        );
      }

      const stored = await nft.read.companyRegistry();
      expect(stored.toLowerCase()).to.equal(newRegistry.toLowerCase());
    });

    it("R6-Happy: recognize should emit Recognized with correct params", async function () {
      const { nft, registry, owner, companyAdmin, employee } =
        await loadFixture(integrationFixture);

      const uri = "ipfs://kudos-metadata";

      // Setup company and employee
      await registry.write.registerCompany(
        ["57Blocks", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([0n], {
        account: employee.account,
      });

      // recognize via registry
      const hash = await registry.write.recognize(
        [employee.account.address, uri],
        { account: companyAdmin.account }
      );

      const publicClient = await hre.viem.getPublicClient();
      const receipt = await publicClient.getTransactionReceipt({ hash });

      const recogLog = receipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi: registry.abi,
              data: log.data,
              topics: log.topics,
            });
          } catch {
            return null;
          }
        })
        .find((e) => e && e.eventName === "Recognized") as {
        eventName: "Recognized";
        args: { tokenId: bigint; companyId: bigint; employee: `0x${string}` };
      } | undefined;
      expect(recogLog).to.not.be.undefined;
      if (recogLog && recogLog.args) {
        expect(recogLog.args.tokenId).to.equal(0n);
      }
    });
  });
});
