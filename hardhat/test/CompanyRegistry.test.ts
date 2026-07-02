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

describe("CompanyRegistry", function () {
  async function deployFixture() {
    const [owner, other, companyAdmin, minterWallet, anotherWallet] =
      await hre.viem.getWalletClients();

    // Deploy NFT57B (owner gets DEFAULT_ADMIN_ROLE)
    const nft = await hre.viem.deployContract("NFT57B", [
      owner.account.address,
    ]);

    // Deploy CompanyRegistry (owner gets DEFAULT_ADMIN_ROLE)
    const registry = await hre.viem.deployContract("CompanyRegistry", [
      nft.address,
      owner.account.address,
    ]);

    return {
      nft,
      registry,
      owner,
      other,
      companyAdmin,
      minterWallet,
      anotherWallet,
    };
  }

  describe("R9: registerCompany", function () {
    it("R9-Happy: should create company with incrementing ID and emit CompanyRegistered", async function () {
      const { registry, owner, companyAdmin } = await loadFixture(deployFixture);

      // Register first company
      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );

      let company = await registry.read.getCompany([0n]);
      expect(company.name).to.equal("ACME Corp");
      expect(getAddress(company.admin)).to.equal(
        getAddress(companyAdmin.account.address)
      );
      expect(company.id).to.equal(0n);
      expect(Number(company.createdAt)).to.be.gt(0);

      // Register second company with different data — ID should increment
      await registry.write.registerCompany(
        ["Tech Inc", companyAdmin.account.address],
        { account: owner.account }
      );

      // Company 0 still has original data
      company = await registry.read.getCompany([0n]);
      expect(company.name).to.equal("ACME Corp");

      // Company 1 has new data
      const company2 = await registry.read.getCompany([1n]);
      expect(company2.name).to.equal("Tech Inc");
      expect(company2.id).to.equal(1n);
    });

    it("R9-Error: should revert when caller is not DEFAULT_ADMIN", async function () {
      const { registry, other, companyAdmin } = await loadFixture(deployFixture);

      // Non-admin (other) tries to register
      await expectRevertWithError(
        () =>
          registry.write.registerCompany(
            ["Community DAO", companyAdmin.account.address],
            { account: other.account }
          ),
        registry.abi,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("R15: Employee Registration", function () {
    it("R15-Happy: employee should register to a company", async function () {
      const { registry, owner, companyAdmin, anotherWallet } =
        await loadFixture(deployFixture);

      // Register company
      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );

      // anotherWallet registers as employee of company 0
      await registry.write.registerEmployee([0n], {
        account: anotherWallet.account,
      });

      const employeeCompany = await registry.read.getEmployeeCompany([
        anotherWallet.account.address,
      ]);
      expect(employeeCompany).to.equal(0n);
    });

    it("R15-Happy: multiple employees can register to the same company", async function () {
      const { registry, owner, companyAdmin, minterWallet, anotherWallet } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );

      await registry.write.registerEmployee([0n], {
        account: minterWallet.account,
      });
      await registry.write.registerEmployee([0n], {
        account: anotherWallet.account,
      });

      expect(await registry.read.getEmployeeCompany([minterWallet.account.address])).to.equal(0n);
      expect(await registry.read.getEmployeeCompany([anotherWallet.account.address])).to.equal(0n);
    });

    it("R15-Error: should revert when company does not exist", async function () {
      const { registry, anotherWallet } =
        await loadFixture(deployFixture);

      // Company ID 0 was never registered
      await expectRevertWithError(
        () =>
          registry.write.registerEmployee([0n], {
            account: anotherWallet.account,
          }),
        registry.abi,
        "CompanyNotFound"
      );
    });

    it("R15-Error: should revert when employee is already registered", async function () {
      const { registry, owner, companyAdmin, anotherWallet } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );

      await registry.write.registerEmployee([0n], {
        account: anotherWallet.account,
      });

      // Try to register again
      await expectRevertWithError(
        () =>
          registry.write.registerEmployee([0n], {
            account: anotherWallet.account,
          }),
        registry.abi,
        "EmployeeAlreadyRegistered"
      );
    });

    it("R15-Error: should revert when employee tries to register to a different company", async function () {
      const { registry, owner, companyAdmin, anotherWallet } =
        await loadFixture(deployFixture);

      // Register two companies
      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerCompany(
        ["Tech Inc", companyAdmin.account.address],
        { account: owner.account }
      );

      // Register to company 0
      await registry.write.registerEmployee([0n], {
        account: anotherWallet.account,
      });

      // Try to register to company 1
      await expectRevertWithError(
        () =>
          registry.write.registerEmployee([1n], {
            account: anotherWallet.account,
          }),
        registry.abi,
        "EmployeeAlreadyRegistered"
      );
    });
  });

  describe("R16: Employee Removal", function () {
    it("R16-Happy: DEFAULT_ADMIN can remove an employee", async function () {
      const { registry, owner, companyAdmin, anotherWallet } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([0n], {
        account: anotherWallet.account,
      });

      // Admin removes employee
      await registry.write.removeEmployee([anotherWallet.account.address], {
        account: owner.account,
      });

      // Employee should be unregistered (returns 0)
      expect(await registry.read.getEmployeeCompany([anotherWallet.account.address])).to.equal(0n);
    });

    it("R16-Happy: company admin can remove an employee", async function () {
      const { registry, owner, companyAdmin, anotherWallet } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([0n], {
        account: anotherWallet.account,
      });

      // Company admin removes employee
      await registry.write.removeEmployee([anotherWallet.account.address], {
        account: companyAdmin.account,
      });

      expect(await registry.read.getEmployeeCompany([anotherWallet.account.address])).to.equal(0n);
    });

    it("R16-Error: should revert when non-admin/non-company-admin tries to remove", async function () {
      const { registry, owner, companyAdmin, other, anotherWallet } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([0n], {
        account: anotherWallet.account,
      });

      // Random wallet (other) tries to remove
      await expectRevertWithError(
        () =>
          registry.write.removeEmployee([anotherWallet.account.address], {
            account: other.account,
          }),
        registry.abi,
        "OnlyCompanyAdminOrAdmin"
      );
    });

    it("R16-Error: should revert when removing non-existent employee", async function () {
      const { registry, owner, anotherWallet } =
        await loadFixture(deployFixture);

      await expectRevertWithError(
        () =>
          registry.write.removeEmployee([anotherWallet.account.address], {
            account: owner.account,
          }),
        registry.abi,
        "EmployeeNotRegistered"
      );
    });

    it("R16-Error: should revert when company admin from a different company tries to remove", async function () {
      const { registry, owner, companyAdmin, other, anotherWallet } =
        await loadFixture(deployFixture);

      // other is NOT admin of company 0 — only companyAdmin is
      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([0n], {
        account: anotherWallet.account,
      });

      // other (not admin of company 0, not DEFAULT_ADMIN) tries to remove
      await expectRevertWithError(
        () =>
          registry.write.removeEmployee([anotherWallet.account.address], {
            account: other.account,
          }),
        registry.abi,
        "OnlyCompanyAdminOrAdmin"
      );
    });
  });

  describe("R14: Company queries", function () {
    it("R14-Happy: getCompany should return full struct with id, name, admin, and createdAt", async function () {
      const { registry, owner, companyAdmin } = await loadFixture(deployFixture);

      await registry.write.registerCompany(
        ["Kudos Foundation", companyAdmin.account.address],
        { account: owner.account }
      );

      const company = await registry.read.getCompany([0n]);
      expect(company.id).to.equal(0n);
      expect(company.name).to.equal("Kudos Foundation");
      expect(getAddress(company.admin)).to.equal(
        getAddress(companyAdmin.account.address)
      );
      expect(Number(company.createdAt)).to.be.gt(0);
    });
  });
});
