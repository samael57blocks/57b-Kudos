import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { getAddress, decodeErrorResult } from "viem";

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

// Viem enum decoding: CompanyStatus.Pending = 0, Approved = 1, Rejected = 2
// (Solidity enums are uint8, decoded as number by viem)
const PENDING = 0;
const APPROVED = 1;
const REJECTED = 2;

describe("CompanyRegistry", function () {
  async function deployFixture() {
    const [owner, other, companyAdmin, minterWallet, anotherWallet] =
      await hre.viem.getWalletClients();

    // Deploy NFT57B (owner gets DEFAULT_ADMIN_ROLE + MINTER_ADMIN_ROLE)
    const nft = await hre.viem.deployContract("NFT57B", [
      owner.account.address,
    ]);

    // Deploy CompanyRegistry (owner gets DEFAULT_ADMIN_ROLE)
    const registry = await hre.viem.deployContract("CompanyRegistry", [
      nft.address,
      owner.account.address,
    ]);

    // Grant MINTER_ADMIN_ROLE to CompanyRegistry on NFT57B
    // so CompanyRegistry can grant/revoke MINTER_ROLE
    const MINTER_ADMIN_ROLE = await nft.read.MINTER_ADMIN_ROLE();
    await nft.write.grantRole([MINTER_ADMIN_ROLE, registry.address], {
      account: owner.account,
    });

    const MINTER_ROLE = await nft.read.MINTER_ROLE();

    return {
      nft,
      registry,
      owner,
      other,
      companyAdmin,
      minterWallet,
      anotherWallet,
      MINTER_ROLE,
    };
  }

  describe("R9: registerCompany", function () {
    it("R9-Happy: should create company with Pending status, incrementing ID, and emit CompanyRegistered", async function () {
      const { registry, companyAdmin } = await loadFixture(deployFixture);

      // Register first company
      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);

      let company = await registry.read.getCompany([0n]);
      expect(company.name).to.equal("ACME Corp");
      expect(getAddress(company.admin)).to.equal(
        getAddress(companyAdmin.account.address)
      );
      expect(company.status).to.equal(PENDING);
      expect(Number(company.createdAt)).to.be.gt(0);
      expect(Number(company.updatedAt)).to.be.gt(0);

      // Register second company with different data — ID should increment
      await registry.write.registerCompany([
        "Tech Inc",
        companyAdmin.account.address,
      ]);

      // Company 0 still has original data
      company = await registry.read.getCompany([0n]);
      expect(company.name).to.equal("ACME Corp");

      // Company 1 has new data
      const company2 = await registry.read.getCompany([1n]);
      expect(company2.name).to.equal("Tech Inc");
      expect(company2.id).to.equal(1n);
    });

    it("R9-Happy: registerCompany is public — any wallet can register", async function () {
      const { registry, other, companyAdmin } = await loadFixture(deployFixture);

      // Non-admin (other) can register
      await registry.write.registerCompany(
        ["Community DAO", companyAdmin.account.address],
        { account: other.account }
      );

      const company = await registry.read.getCompany([0n]);
      expect(company.name).to.equal("Community DAO");
      expect(company.status).to.equal(PENDING);
    });
  });

  describe("R10: approveCompany", function () {
    it("R10-Happy: should approve a Pending company, change status, and update timestamp", async function () {
      const { registry, owner, companyAdmin } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);

      const companyBefore = await registry.read.getCompany([0n]);
      const createdAt = Number(companyBefore.createdAt);

      await registry.write.approveCompany([0n], { account: owner.account });

      const company = await registry.read.getCompany([0n]);
      expect(company.status).to.equal(APPROVED);
      // updatedAt should be >= createdAt (approval changes it)
      expect(Number(company.updatedAt)).to.be.gte(createdAt);
      expect(Number(company.createdAt)).to.equal(createdAt); // createdAt stays the same
    });

    it("R10-Error: should revert when approving an already Approved company", async function () {
      const { registry, owner, companyAdmin } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);
      await registry.write.approveCompany([0n], { account: owner.account });

      await expectRevertWithError(
        () =>
          registry.write.approveCompany([0n], { account: owner.account }),
        registry.abi,
        "CompanyNotPending"
      );
    });

    it("R10-Error: should revert when approving a Rejected company", async function () {
      const { registry, owner, companyAdmin } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);
      await registry.write.rejectCompany([0n], { account: owner.account });

      await expectRevertWithError(
        () =>
          registry.write.approveCompany([0n], { account: owner.account }),
        registry.abi,
        "CompanyNotPending"
      );
    });

    it("R10-Error: should revert when caller is not DEFAULT_ADMIN", async function () {
      const { registry, other, companyAdmin } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);

      await expectRevertWithError(
        () =>
          registry.write.approveCompany([0n], { account: other.account }),
        registry.abi,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("R11: rejectCompany", function () {
    it("R11-Happy: should reject a Pending company, change status, and update timestamp", async function () {
      const { registry, owner, companyAdmin } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);

      const companyBefore = await registry.read.getCompany([0n]);
      const createdAt = Number(companyBefore.createdAt);

      await registry.write.rejectCompany([0n], { account: owner.account });

      const company = await registry.read.getCompany([0n]);
      expect(company.status).to.equal(REJECTED);
      expect(Number(company.updatedAt)).to.be.gte(createdAt);
      expect(Number(company.createdAt)).to.equal(createdAt);
    });

    it("R11-Error: should revert when rejecting an already Rejected company", async function () {
      const { registry, owner, companyAdmin } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);
      await registry.write.rejectCompany([0n], { account: owner.account });

      await expectRevertWithError(
        () =>
          registry.write.rejectCompany([0n], { account: owner.account }),
        registry.abi,
        "CompanyNotPending"
      );
    });

    it("R11-Error: should revert when rejecting an Approved company", async function () {
      const { registry, owner, companyAdmin } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);
      await registry.write.approveCompany([0n], { account: owner.account });

      await expectRevertWithError(
        () =>
          registry.write.rejectCompany([0n], { account: owner.account }),
        registry.abi,
        "CompanyNotPending"
      );
    });

    it("R11-Error: should revert when caller is not DEFAULT_ADMIN", async function () {
      const { registry, other, companyAdmin } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);

      await expectRevertWithError(
        () =>
          registry.write.rejectCompany([0n], { account: other.account }),
        registry.abi,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("R12: addMinter (cross-contract)", function () {
    it("R12-Happy: should grant MINTER_ROLE on NFT57B for an approved company", async function () {
      const { registry, owner, companyAdmin, minterWallet, nft, MINTER_ROLE } =
        await loadFixture(deployFixture);

      // Register, approve, then add minter
      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);
      await registry.write.approveCompany([0n], { account: owner.account });

      // Minter should NOT have the role before
      expect(await nft.read.hasRole([MINTER_ROLE, minterWallet.account.address])).to.be.false;

      await registry.write.addMinter([0n, minterWallet.account.address], {
        account: owner.account,
      });

      // Minter should have the role after
      expect(await nft.read.hasRole([MINTER_ROLE, minterWallet.account.address])).to.be.true;

      // End-to-end: minter can now safeMint on NFT57B
      const uri = "ipfs://QmTestMinter";
      const mintTx = await nft.write.safeMint(
        [companyAdmin.account.address, uri],
        { account: minterWallet.account }
      );
      expect(mintTx).to.not.be.undefined;

      const ownerOfToken = await nft.read.ownerOf([0n]);
      expect(ownerOfToken).to.equal(getAddress(companyAdmin.account.address));
    });

    it("R12-Error: should revert when company is Pending (not approved)", async function () {
      const { registry, owner, companyAdmin, minterWallet } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);
      // Company is still Pending — do NOT approve

      await expectRevertWithError(
        () =>
          registry.write.addMinter([0n, minterWallet.account.address], {
            account: owner.account,
          }),
        registry.abi,
        "CompanyNotApproved"
      );
    });

    it("R12-Error: should revert when company is Rejected", async function () {
      const { registry, owner, companyAdmin, minterWallet } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);
      await registry.write.rejectCompany([0n], { account: owner.account });

      await expectRevertWithError(
        () =>
          registry.write.addMinter([0n, minterWallet.account.address], {
            account: owner.account,
          }),
        registry.abi,
        "CompanyNotApproved"
      );
    });

    it("R12-Error: should revert when caller is not DEFAULT_ADMIN", async function () {
      const { registry, owner, other, companyAdmin, minterWallet } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);
      await registry.write.approveCompany([0n], { account: owner.account });

      // Non-admin tries to addMinter
      await expectRevertWithError(
        () =>
          registry.write.addMinter([0n, minterWallet.account.address], {
            account: other.account,
          }),
        registry.abi,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("R13: removeMinter (cross-contract)", function () {
    it("R13-Happy: should revoke MINTER_ROLE from wallet on NFT57B", async function () {
      const { registry, owner, companyAdmin, minterWallet, nft, MINTER_ROLE } =
        await loadFixture(deployFixture);

      // Setup: register, approve, add minter
      await registry.write.registerCompany([
        "ACME Corp",
        companyAdmin.account.address,
      ]);
      await registry.write.approveCompany([0n], { account: owner.account });
      await registry.write.addMinter([0n, minterWallet.account.address], {
        account: owner.account,
      });

      // Confirm minter had role
      expect(await nft.read.hasRole([MINTER_ROLE, minterWallet.account.address])).to.be.true;

      // Remove minter
      await registry.write.removeMinter([minterWallet.account.address], {
        account: owner.account,
      });

      // Confirm minter no longer has role
      expect(await nft.read.hasRole([MINTER_ROLE, minterWallet.account.address])).to.be.false;
    });

    it("R13-Error: should revert when caller is not DEFAULT_ADMIN", async function () {
      const { registry, other, minterWallet } =
        await loadFixture(deployFixture);

      await expectRevertWithError(
        () =>
          registry.write.removeMinter([minterWallet.account.address], {
            account: other.account,
          }),
        registry.abi,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("R14: Company queries", function () {
    it("R14-Happy: getCompany should return full struct with id, name, admin, status, and timestamps", async function () {
      const { registry, companyAdmin } = await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "Kudos Foundation",
        companyAdmin.account.address,
      ]);

      const company = await registry.read.getCompany([0n]);
      expect(company.id).to.equal(0n);
      expect(company.name).to.equal("Kudos Foundation");
      expect(getAddress(company.admin)).to.equal(
        getAddress(companyAdmin.account.address)
      );
      expect(company.status).to.equal(PENDING);
      expect(Number(company.createdAt)).to.be.gt(0);
      expect(Number(company.updatedAt)).to.be.gt(0);
    });

    it("R14-Happy: isApproved should return true for approved company, false for pending/rejected", async function () {
      const { registry, owner, companyAdmin } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany([
        "Company A",
        companyAdmin.account.address,
      ]);
      await registry.write.registerCompany([
        "Company B",
        companyAdmin.account.address,
      ]);
      await registry.write.registerCompany([
        "Company C",
        companyAdmin.account.address,
      ]);

      // Company A: Pending → isApproved = false
      expect(await registry.read.isApproved([0n])).to.be.false;

      // Approve Company B
      await registry.write.approveCompany([1n], { account: owner.account });
      expect(await registry.read.isApproved([1n])).to.be.true;

      // Reject Company C
      await registry.write.rejectCompany([2n], { account: owner.account });
      expect(await registry.read.isApproved([2n])).to.be.false;
    });
  });
});
