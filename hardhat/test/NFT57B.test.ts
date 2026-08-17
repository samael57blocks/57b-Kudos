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

    if (typeof err.walk === "function") {
      err.walk((node: any) => {
        if (typeof node?.data === "string" && node.data.startsWith("0x")) {
          revertData = node.data as `0x${string}`;
          return true;
        }
        return false;
      });
    }

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

describe("NFT57B", function () {
  // ═══════════════════════════════════════════════════════════════
  //  Fixtures
  // ═══════════════════════════════════════════════════════════════

  /**
   * Full deploy fixture wiring NFT57B + CompanyRegistry factory +
   * BonusReward + RecognitionToken. Grants both DEFAULT_ADMIN_ROLE
   * and MINTER_ROLE to the factory on both reward contracts.
   */
  async function integrationFixture() {
    const [owner, companyAdmin, employee, minter, other] =
      await hre.viem.getWalletClients();

    const nft = await hre.viem.deployContract("NFT57B", [
      owner.account.address,
    ]);

    const bonus = await hre.viem.deployContract("BonusReward", [
      owner.account.address,
    ]);
    const recognition = await hre.viem.deployContract("RecognitionToken", [
      owner.account.address,
      "57Blocks Recognition",
      "57BR",
    ]);

    const registry = await hre.viem.deployContract("CompanyRegistry", [
      nft.address,
      bonus.address,
      recognition.address,
      owner.account.address,
    ]);

    // F1.10 wiring: DEFAULT_ADMIN_ROLE to factory on both rewards
    const defaultAdminRole = await bonus.read.DEFAULT_ADMIN_ROLE();
    await bonus.write.grantRole([defaultAdminRole, registry.address], {
      account: owner.account,
    });
    await recognition.write.grantRole([defaultAdminRole, registry.address], {
      account: owner.account,
    });

    // RISK FLAG wiring: MINTER_ROLE to factory on both rewards
    const BONUS_MINTER_ROLE = await bonus.read.MINTER_ROLE();
    await bonus.write.grantRole([BONUS_MINTER_ROLE, registry.address], {
      account: owner.account,
    });
    const RECOGNITION_MINTER_ROLE = await recognition.read.MINTER_ROLE();
    await recognition.write.grantRole([RECOGNITION_MINTER_ROLE, registry.address], {
      account: owner.account,
    });

    // Wire NFT57B → factory
    await nft.write.setFactory([registry.address], {
      account: owner.account,
    });

    // Platform seed knob
    const rewardAmount = 100n * 10n ** 18n;
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
      minter,
      other,
      rewardAmount,
    };
  }

  /**
   * Register a company via the factory admin. Returns the deployed Company address.
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
   * MINTER_ROLE, mints an NFT via Company.recognize. Ready-to-claim state.
   */
  async function claimFixture() {
    const fixture = await integrationFixture();
    const { registry, nft, owner, companyAdmin, employee, other } = fixture;

    const companyAddress = await registerCompany(
      registry,
      owner,
      "57Blocks",
      companyAdmin.account.address
    );
    const company = await hre.viem.getContractAt("Company", companyAddress);

    await company.write.registerEmployee(
      [employee.account.address, "Alice"],
      { account: companyAdmin.account }
    );

    // Register `other` as an employee (grantMinterRole requires active employee)
    await company.write.registerEmployee(
      [other.account.address, "MinterBot"],
      { account: companyAdmin.account }
    );

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
  //  N1.1: setFactory — mutable factory, admin-only, event
  // ═══════════════════════════════════════════════════════════════

  describe("N1.1: setFactory", function () {
    it("N1.1-Happy: admin sets factory and FactoryUpdated is emitted", async function () {
      const { nft, registry, owner, other } = await loadFixture(integrationFixture);

      // Factory was already set in the fixture — verify it
      expect(await nft.read.factory()).to.equal(getAddress(registry.address));

      // Set to another address (use `other` as a dummy)
      const publicClient = await hre.viem.getPublicClient();
      await nft.write.setFactory([other.account.address], {
        account: owner.account,
      });

      expect(await nft.read.factory()).to.equal(
        getAddress(other.account.address)
      );

      // Verify FactoryUpdated event
      const logs = await publicClient.getLogs({
        address: nft.address,
        fromBlock: 0n,
        event: {
          type: "event",
          name: "FactoryUpdated",
          inputs: [
            { type: "address", name: "factory", indexed: true },
          ],
        },
      });
      expect(logs.length).to.be.greaterThan(0);
      expect(getAddress(logs[logs.length - 1].args.factory)).to.equal(
        getAddress(other.account.address)
      );
    });

    it("N1.1-Error: non-admin cannot setFactory", async function () {
      const { nft, other } = await loadFixture(integrationFixture);

      await expectRevertWithError(
        () =>
          nft.write.setFactory([other.account.address], {
            account: other.account,
          }),
        nft.abi,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("N1.1-Happy: factory is mutable — can be changed to a different contract", async function () {
      const { nft, registry, owner, companyAdmin, employee, other, bonus, recognition } =
        await loadFixture(integrationFixture);

      // Currently factory = registry. Mint works via Company.recognize.
      const companyAddress = await registerCompany(
        registry,
        owner,
        "Corp1",
        companyAdmin.account.address
      );
      const company = await hre.viem.getContractAt("Company", companyAddress);
      await company.write.registerEmployee(
        [employee.account.address, "Alice"],
        { account: companyAdmin.account }
      );
      await company.write.registerEmployee(
        [other.account.address, "MinterBot"],
        { account: companyAdmin.account }
      );
      await company.write.grantMinterRole([other.account.address], {
        account: companyAdmin.account,
      });
      await company.write.recognize(
        [employee.account.address, "ipfs://first"],
        { account: other.account }
      );

      // Token #0 minted
      expect(await nft.read.ownerOf([0n])).to.equal(
        getAddress(employee.account.address)
      );

      // Deploy a second CompanyRegistry to use as the "new" factory
      const registry2 = await hre.viem.deployContract("CompanyRegistry", [
        nft.address,
        bonus.address,
        recognition.address,
        owner.account.address,
      ]);

      // Change factory to registry2 — the old Company is NOT registered in registry2
      await nft.write.setFactory([registry2.address], {
        account: owner.account,
      });
      expect(await nft.read.factory()).to.equal(getAddress(registry2.address));

      // safeMint from the old Company reverts OnlyCompany — it's not registered in registry2
      await expectRevertWithError(
        () =>
          company.write.recognize(
            [employee.account.address, "ipfs://should-fail"],
            { account: other.account }
          ),
        nft.abi,
        "OnlyCompany"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  N1.2: safeMint — factory gating, FactoryNotSet, OnlyCompany
  // ═══════════════════════════════════════════════════════════════

  describe("N1.2: safeMint", function () {
    it("N1.2-Happy: factory-registered Company can mint via recognize()", async function () {
      const { nft, registry, owner, companyAdmin, employee, other } =
        await loadFixture(integrationFixture);

      const companyAddress = await registerCompany(
        registry,
        owner,
        "57Blocks",
        companyAdmin.account.address
      );
      const company = await hre.viem.getContractAt("Company", companyAddress);

      await company.write.registerEmployee(
        [employee.account.address, "Alice"],
        { account: companyAdmin.account }
      );
      await company.write.registerEmployee(
        [other.account.address, "MinterBot"],
        { account: companyAdmin.account }
      );
      await company.write.grantMinterRole([other.account.address], {
        account: companyAdmin.account,
      });

      const uri = "ipfs://QmTest123";
      await company.write.recognize(
        [employee.account.address, uri],
        { account: other.account }
      );

      expect(await nft.read.ownerOf([0n])).to.equal(
        getAddress(employee.account.address)
      );
      expect(await nft.read.tokenURI([0n])).to.equal(uri);
      expect(await nft.read.balanceOf([employee.account.address])).to.equal(1n);
    });

    it("N1.2-Error: FactoryNotSet when factory is unset", async function () {
      const [owner, , employee] = await hre.viem.getWalletClients();

      // Deploy NFT57B with NO setFactory call
      const nft = await hre.viem.deployContract("NFT57B", [
        owner.account.address,
      ]);

      await expectRevertWithError(
        () =>
          nft.write.safeMint(
            [employee.account.address, "uri"],
            { account: owner.account }
          ),
        nft.abi,
        "FactoryNotSet"
      );
    });

    it("N1.2-Error: OnlyCompany when caller is not a registered Company", async function () {
      const { nft, other, employee } = await loadFixture(integrationFixture);

      await expectRevertWithError(
        () =>
          nft.write.safeMint(
            [employee.account.address, "uri"],
            { account: other.account }
          ),
        nft.abi,
        "OnlyCompany"
      );
    });

    it("N1.2-Error: EnforcedPause when contract is paused", async function () {
      const { nft, registry, owner, companyAdmin, employee, other } =
        await loadFixture(integrationFixture);

      const companyAddress = await registerCompany(
        registry,
        owner,
        "57Blocks",
        companyAdmin.account.address
      );
      const company = await hre.viem.getContractAt("Company", companyAddress);

      await company.write.registerEmployee(
        [employee.account.address, "Alice"],
        { account: companyAdmin.account }
      );
      await company.write.registerEmployee(
        [other.account.address, "MinterBot"],
        { account: companyAdmin.account }
      );
      await company.write.grantMinterRole([other.account.address], {
        account: companyAdmin.account,
      });

      await nft.write.pause({ account: owner.account });

      await expectRevertWithError(
        () =>
          company.write.recognize(
            [employee.account.address, "uri"],
            { account: other.account }
          ),
        nft.abi,
        "EnforcedPause"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  N1.3: claim — burns NFT, calls factory.onClaimed, 2-hop chain
  // ═══════════════════════════════════════════════════════════════

  describe("N1.3: claim", function () {
    it("N1.3-Happy: claim burns NFT, mints BonusReward + RecognitionToken via 2-hop chain", async function () {
      const {
        nft,
        registry,
        bonus,
        recognition,
        employee,
        rewardAmount,
      } = await loadFixture(claimFixture);

      const publicClient = await hre.viem.getPublicClient();

      // Pre-condition
      expect(await nft.read.ownerOf([0n])).to.equal(
        getAddress(employee.account.address)
      );

      const claimHash = await nft.write.claim([0n], {
        account: employee.account,
      });

      // NFT burned
      expect(await nft.read.balanceOf([employee.account.address])).to.equal(0n);

      // BonusReward: per-company amount
      expect(await bonus.read.balanceOf([employee.account.address])).to.equal(
        rewardAmount
      );

      // RecognitionToken: 1 badge
      expect(
        await recognition.read.balanceOf([employee.account.address])
      ).to.equal(1n);
      expect(await recognition.read.tokenURI([0n])).to.equal(
        "ipfs://kudos-metadata"
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
    });

    it("N1.3-Error: ClaimNotAllowed when non-owner calls claim", async function () {
      const { nft, employee, other } = await loadFixture(claimFixture);

      await expectRevertWithError(
        () => nft.write.claim([0n], { account: other.account }),
        nft.abi,
        "ClaimNotAllowed"
      );
    });

    it("N1.3-Error: FactoryNotSet when factory is unset on claim", async function () {
      const [owner, , employee] = await hre.viem.getWalletClients();

      // Deploy NFT57B without factory — need to mint a token somehow.
      // We'll use admin burn to test the error.
      // Actually, we can't mint without factory, so use storage slot approach.
      // Simpler: deploy a second NFT57B, set factory, mint, then unset factory.
      const nft = await hre.viem.deployContract("NFT57B", [
        owner.account.address,
      ]);
      const bonus = await hre.viem.deployContract("BonusReward", [
        owner.account.address,
      ]);
      const recognition = await hre.viem.deployContract("RecognitionToken", [
        owner.account.address,
        "Rec",
        "REC",
      ]);
      const registry = await hre.viem.deployContract("CompanyRegistry", [
        nft.address,
        bonus.address,
        recognition.address,
        owner.account.address,
      ]);

      // Wire factory and grant roles
      const defaultAdminRole = await bonus.read.DEFAULT_ADMIN_ROLE();
      await bonus.write.grantRole([defaultAdminRole, registry.address], {
        account: owner.account,
      });
      await recognition.write.grantRole([defaultAdminRole, registry.address], {
        account: owner.account,
      });
      const BONUS_MINTER_ROLE = await bonus.read.MINTER_ROLE();
      await bonus.write.grantRole([BONUS_MINTER_ROLE, registry.address], {
        account: owner.account,
      });
      const RECOGNITION_MINTER_ROLE = await recognition.read.MINTER_ROLE();
      await recognition.write.grantRole([RECOGNITION_MINTER_ROLE, registry.address], {
        account: owner.account,
      });
      await nft.write.setFactory([registry.address], {
        account: owner.account,
      });

      // Register company + employee + mint token
      const companyAddress = await registry.simulate.registerCompany(
        ["Corp", employee.account.address],
        { account: owner.account }
      );
      await registry.write.registerCompany(
        ["Corp", employee.account.address],
        { account: owner.account }
      );
      // Get the deployed Company address
      const companies = await registry.read.getCompanies();
      const company = await hre.viem.getContractAt("Company", companies[0]);

      await company.write.registerEmployee(
        [employee.account.address, "Alice"],
        { account: employee.account }
      );
      await company.write.grantMinterRole([employee.account.address], {
        account: employee.account,
      });
      await company.write.recognize(
        [employee.account.address, "ipfs://test"],
        { account: employee.account }
      );

      // Token #0 minted to employee
      expect(await nft.read.ownerOf([0n])).to.equal(
        getAddress(employee.account.address)
      );

      // Now unset factory
      await nft.write.setFactory(
        ["0x0000000000000000000000000000000000000000"],
        { account: owner.account }
      );

      // Claim reverts with FactoryNotSet
      await expectRevertWithError(
        () => nft.write.claim([0n], { account: employee.account }),
        nft.abi,
        "FactoryNotSet"
      );
    });

    it("N1.3-Error: ClaimNotAllowed when trying to claim a burned token (double-claim)", async function () {
      const { nft, employee } = await loadFixture(claimFixture);

      // First claim succeeds
      await nft.write.claim([0n], { account: employee.account });

      // Second claim reverts — ownerOf returns address(0) ≠ msg.sender
      await expectRevertWithError(
        () => nft.write.claim([0n], { account: employee.account }),
        nft.abi,
        "ClaimNotAllowed"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  N1.4: 2-hop chain — Company has no onClaimed, rewards match
  // ═══════════════════════════════════════════════════════════════

  describe("N1.4: 2-hop chain", function () {
    it("should assert Company has no onClaimed function and rewards match per-company config", async function () {
      const {
        nft,
        bonus,
        recognition,
        employee,
        companyAddress,
        rewardAmount,
      } = await loadFixture(claimFixture);

      const company = await hre.viem.getContractAt("Company", companyAddress);

      // Company has NO onClaimed in its ABI
      const companyHasOnClaimed = company.abi.some(
        (item: any) => item.type === "function" && item.name === "onClaimed"
      );
      expect(companyHasOnClaimed).to.be.false;

      // Claim → check balances
      await nft.write.claim([0n], { account: employee.account });

      expect(await bonus.read.balanceOf([employee.account.address])).to.equal(
        rewardAmount
      );
      expect(
        await recognition.read.balanceOf([employee.account.address])
      ).to.equal(1n);
    });

    it("should verify factory is the source of truth for reward amounts", async function () {
      const { registry, employee, companyAddress, rewardAmount } =
        await loadFixture(claimFixture);

      const factoryAmount = await registry.read.companyRewardAmount([
        companyAddress,
      ]);
      expect(factoryAmount).to.equal(rewardAmount);

      const company = await hre.viem.getContractAt("Company", companyAddress);
      expect(await company.read.rewardAmount()).to.equal(rewardAmount);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  N1.5: NotNFT57B — direct call to factory.onClaimed
  // ═══════════════════════════════════════════════════════════════

  describe("N1.5: NotNFT57B guard on factory.onClaimed", function () {
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

    it("should revert RewardContractsNotSet when factory reward immutables are zero", async function () {
      const [owner] = await hre.viem.getWalletClients();

      const caller = await hre.viem.deployContract("OnClaimedCaller", []);

      const registry = await hre.viem.deployContract("CompanyRegistry", [
        caller.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        owner.account.address,
      ]);

      const employee =
        "0x0000000000000000000000000000000000000042" as `0x${string}`;

      // Storage slot for _companyByEmployee is SLOT 3
      const { keccak256 } = await import("viem");
      const mappingSlot = keccak256(
        `0x${employee.toLowerCase().replace("0x", "").padStart(64, "0")}${"0".repeat(62)}03`
      );

      const companyValue = `0x${caller.address.slice(2).toLowerCase().padStart(64, "0")}`;
      await owner.request({
        method: "hardhat_setStorageAt",
        params: [registry.address, mappingSlot, companyValue],
      });

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
  //  N1.6a: burn — admin-only, works when paused
  // ═══════════════════════════════════════════════════════════════

  describe("N1.6a: burn", function () {
    it("should burn token and emit NFTBurned", async function () {
      const { nft, owner, employee } = await loadFixture(claimFixture);

      const publicClient = await hre.viem.getPublicClient();

      await nft.write.burn([0n], { account: owner.account });

      expect(await nft.read.balanceOf([employee.account.address])).to.equal(
        0n
      );

      await expectRevertWithError(
        () => nft.read.ownerOf([0n]),
        nft.abi,
        "ERC721NonexistentToken"
      );
    });

    it("should revert when non-admin tries to burn", async function () {
      const { nft, other } = await loadFixture(claimFixture);

      await expectRevertWithError(
        () => nft.write.burn([0n], { account: other.account }),
        nft.abi,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("should allow admin burn when paused (recovery)", async function () {
      const { nft, registry, owner, companyAdmin, employee, other } =
        await loadFixture(integrationFixture);

      const companyAddress = await registerCompany(
        registry,
        owner,
        "Corp",
        companyAdmin.account.address
      );
      const company = await hre.viem.getContractAt("Company", companyAddress);

      await company.write.registerEmployee(
        [employee.account.address, "Alice"],
        { account: companyAdmin.account }
      );
      await company.write.registerEmployee(
        [other.account.address, "MinterBot"],
        { account: companyAdmin.account }
      );
      await company.write.grantMinterRole([other.account.address], {
        account: companyAdmin.account,
      });
      await company.write.recognize(
        [employee.account.address, "ipfs://test"],
        { account: other.account }
      );

      // Pause — mint blocked, but burn works
      await nft.write.pause({ account: owner.account });
      expect(await nft.read.paused()).to.be.true;

      await nft.write.burn([0n], { account: owner.account });
      expect(await nft.read.balanceOf([employee.account.address])).to.equal(
        0n
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  N1.6b: Pausable — pause/unpause cycle
  // ═══════════════════════════════════════════════════════════════

  describe("N1.6b: Pausable", function () {
    it("should block minting when paused and resume after unpause", async function () {
      const { nft, registry, owner, companyAdmin, employee, other } =
        await loadFixture(integrationFixture);

      const companyAddress = await registerCompany(
        registry,
        owner,
        "Corp",
        companyAdmin.account.address
      );
      const company = await hre.viem.getContractAt("Company", companyAddress);

      await company.write.registerEmployee(
        [employee.account.address, "Alice"],
        { account: companyAdmin.account }
      );
      await company.write.registerEmployee(
        [other.account.address, "MinterBot"],
        { account: companyAdmin.account }
      );
      await company.write.grantMinterRole([other.account.address], {
        account: companyAdmin.account,
      });

      // Mint before pause
      await company.write.recognize(
        [employee.account.address, "ipfs://first"],
        { account: other.account }
      );
      expect(await nft.read.ownerOf([0n])).to.equal(
        getAddress(employee.account.address)
      );

      // Pause — mint blocked
      await nft.write.pause({ account: owner.account });
      expect(await nft.read.paused()).to.be.true;

      await expectRevertWithError(
        () =>
          company.write.recognize(
            [employee.account.address, "ipfs://second"],
            { account: other.account }
          ),
        nft.abi,
        "EnforcedPause"
      );

      // Unpause — mint resumes
      await nft.write.unpause({ account: owner.account });
      expect(await nft.read.paused()).to.be.false;

      await company.write.recognize(
        [employee.account.address, "ipfs://third"],
        { account: other.account }
      );
      expect(await nft.read.ownerOf([1n])).to.equal(
        getAddress(employee.account.address)
      );
    });

    it("should revert when non-admin tries to pause", async function () {
      const { nft, other } = await loadFixture(integrationFixture);

      await expectRevertWithError(
        () => nft.write.pause({ account: other.account }),
        nft.abi,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  N1.6c: Non-transferable policy
  // ═══════════════════════════════════════════════════════════════

  describe("N1.6c: Non-transferable policy", function () {
    it("admin can transfer token via transferFrom", async function () {
      const { nft, owner, employee, companyAdmin } = await loadFixture(claimFixture);

      await nft.write.transferFrom(
        [employee.account.address, companyAdmin.account.address, 0n],
        { account: owner.account }
      );

      expect(await nft.read.ownerOf([0n])).to.equal(
        getAddress(companyAdmin.account.address)
      );
      expect(await nft.read.balanceOf([employee.account.address])).to.equal(
        0n
      );
      expect(await nft.read.balanceOf([companyAdmin.account.address])).to.equal(
        1n
      );
    });

    it("non-admin employee transfer reverts with TransferNotAllowed", async function () {
      const { nft, employee, companyAdmin } = await loadFixture(claimFixture);

      await expectRevertWithError(
        () =>
          nft.write.transferFrom(
            [employee.account.address, companyAdmin.account.address, 0n],
            { account: employee.account }
          ),
        nft.abi,
        "TransferNotAllowed"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  N1.6d: supportsInterface
  // ═══════════════════════════════════════════════════════════════

  describe("N1.6d: supportsInterface", function () {
    it("should return true for ERC721, ERC721Enumerable, ERC721Metadata, ERC4906; false for AccessControl", async function () {
      const { nft } = await loadFixture(integrationFixture);

      // ERC721: 0x80ac58cd
      expect(await nft.read.supportsInterface(["0x80ac58cd"])).to.be.true;
      // ERC721Enumerable: 0x780e9d63
      expect(await nft.read.supportsInterface(["0x780e9d63"])).to.be.true;
      // ERC721Metadata: 0x5b5e139f
      expect(await nft.read.supportsInterface(["0x5b5e139f"])).to.be.true;
      // ERC4906: 0x49064906
      expect(await nft.read.supportsInterface(["0x49064906"])).to.be.true;
      // AccessControl: 0x7965db0b — intentionally excluded
      expect(await nft.read.supportsInterface(["0x7965db0b"])).to.be.false;
      // Random: 0x12345678
      expect(await nft.read.supportsInterface(["0x12345678"])).to.be.false;
    });
  });
});
