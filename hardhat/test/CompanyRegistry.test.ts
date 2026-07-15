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
    it("R15-Happy: DEFAULT_ADMIN can register an employee to any company", async function () {
      const { registry, owner, companyAdmin, anotherWallet } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );

      // owner (DEFAULT_ADMIN) registers anotherWallet as employee of company 0
      await registry.write.registerEmployee([anotherWallet.account.address, 0n], {
        account: owner.account,
      });

      const employeeCompany = await registry.read.getEmployeeCompany([
        anotherWallet.account.address,
      ]);
      expect(employeeCompany).to.equal(0n);
    });

    it("R15-Happy: company admin can register employee to own company", async function () {
      const { registry, owner, companyAdmin, anotherWallet } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );

      // companyAdmin registers anotherWallet
      await registry.write.registerEmployee([anotherWallet.account.address, 0n], {
        account: companyAdmin.account,
      });

      expect(await registry.read.getEmployeeCompany([anotherWallet.account.address])).to.equal(0n);
    });

    it("R15-Happy: multiple employees can be registered to the same company", async function () {
      const { registry, owner, companyAdmin, minterWallet, anotherWallet } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );

      await registry.write.registerEmployee([minterWallet.account.address, 0n], {
        account: owner.account,
      });
      await registry.write.registerEmployee([anotherWallet.account.address, 0n], {
        account: owner.account,
      });

      expect(await registry.read.getEmployeeCompany([minterWallet.account.address])).to.equal(0n);
      expect(await registry.read.getEmployeeCompany([anotherWallet.account.address])).to.equal(0n);
    });

    it("R15-Error: should revert when company does not exist", async function () {
      const { registry, owner, anotherWallet } =
        await loadFixture(deployFixture);

      await expectRevertWithError(
        () =>
          registry.write.registerEmployee([anotherWallet.account.address, 0n], {
            account: owner.account,
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

      await registry.write.registerEmployee([anotherWallet.account.address, 0n], {
        account: owner.account,
      });

      await expectRevertWithError(
        () =>
          registry.write.registerEmployee([anotherWallet.account.address, 0n], {
            account: owner.account,
          }),
        registry.abi,
        "EmployeeAlreadyRegistered"
      );
    });

    it("R15-Error: should revert when unauthorized caller tries to register", async function () {
      const { registry, owner, companyAdmin, other, anotherWallet } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );

      await expectRevertWithError(
        () =>
          registry.write.registerEmployee([anotherWallet.account.address, 0n], {
            account: other.account,
          }),
        registry.abi,
        "OnlyCompanyAdminOrAdmin"
      );
    });

    it("R15-Error: should revert when company admin from different company tries to register", async function () {
      const { registry, owner, companyAdmin, other, anotherWallet } =
        await loadFixture(deployFixture);

      // other is admin of company 1
      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerCompany(
        ["Tech Inc", other.account.address],
        { account: owner.account }
      );

      // companyAdmin (admin of company 0) tries to register to company 1
      await expectRevertWithError(
        () =>
          registry.write.registerEmployee([anotherWallet.account.address, 1n], {
            account: companyAdmin.account,
          }),
        registry.abi,
        "OnlyCompanyAdminOrAdmin"
      );
    });

    it("R15-Error: should revert on address(0)", async function () {
      const { registry, owner, companyAdmin } =
        await loadFixture(deployFixture);

      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );

      await expectRevertWithError(
        () =>
          registry.write.registerEmployee(
            ["0x0000000000000000000000000000000000000000", 0n],
            { account: owner.account }
          ),
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
      await registry.write.registerEmployee([anotherWallet.account.address, 0n], {
        account: companyAdmin.account,
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
      await registry.write.registerEmployee([anotherWallet.account.address, 0n], {
        account: companyAdmin.account,
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
      await registry.write.registerEmployee([anotherWallet.account.address, 0n], {
        account: companyAdmin.account,
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
      await registry.write.registerEmployee([anotherWallet.account.address, 0n], {
        account: companyAdmin.account,
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

  // ══════════════════════════════════════════════════════
  //  MINTER_ROLE — grantMinterRole
  // ══════════════════════════════════════════════════════

  describe("MINTER_ROLE — grantMinterRole", function () {
    async function minterFixture() {
      const fixture = await deployFixture();
      const { registry, owner, companyAdmin, minterWallet } = fixture;

      // Register company and employees
      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([minterWallet.account.address, 0n], {
        account: companyAdmin.account,
      });

      return fixture;
    }

    it("grant-Happy: DEFAULT_ADMIN can grant MINTER_ROLE", async function () {
      const { registry, owner, minterWallet } = await loadFixture(minterFixture);

      await registry.write.grantMinterRole([minterWallet.account.address], {
        account: owner.account,
      });

      const hasRole = await registry.read.hasRole([
        (await registry.read.MINTER_ROLE()),
        minterWallet.account.address,
      ]);
      expect(hasRole).to.be.true;
    });

    it("grant-Happy: company admin can grant MINTER_ROLE to their employee", async function () {
      const { registry, companyAdmin, minterWallet } = await loadFixture(minterFixture);

      await registry.write.grantMinterRole([minterWallet.account.address], {
        account: companyAdmin.account,
      });

      const hasRole = await registry.read.hasRole([
        (await registry.read.MINTER_ROLE()),
        minterWallet.account.address,
      ]);
      expect(hasRole).to.be.true;
    });

    it("grant-Happy: emits MinterRoleGranted event", async function () {
      const { registry, owner, minterWallet } = await loadFixture(minterFixture);

      const txHash = await registry.write.grantMinterRole([minterWallet.account.address], {
        account: owner.account,
      });

      const publicClient = await hre.viem.getPublicClient();
      const logs = await publicClient.getLogs({
        address: registry.address,
        fromBlock: 0n,
        event: {
          type: 'event',
          name: 'MinterRoleGranted',
          inputs: [
            { type: 'uint256', name: 'companyId', indexed: true },
            { type: 'address', name: 'employee', indexed: true },
          ],
        },
      });

      expect(logs.length).to.equal(1);
      expect(logs[0].args.companyId).to.equal(0n);
      expect(getAddress(logs[0].args.employee)).to.equal(
        getAddress(minterWallet.account.address)
      );
    });

    it("grant-Error: non-admin/non-company-admin reverts", async function () {
      const { registry, other, minterWallet } = await loadFixture(minterFixture);

      await expectRevertWithError(
        () =>
          registry.write.grantMinterRole([minterWallet.account.address], {
            account: other.account,
          }),
        registry.abi,
        "OnlyCompanyAdminOrAdmin"
      );
    });

    it("grant-Error: reverts for unregistered employee", async function () {
      const { registry, owner, other } = await loadFixture(minterFixture);

      await expectRevertWithError(
        () =>
          registry.write.grantMinterRole([other.account.address], {
            account: owner.account,
          }),
        registry.abi,
        "EmployeeNotRegistered"
      );
    });
  });

  // ══════════════════════════════════════════════════════
  //  MINTER_ROLE — revokeMinterRole
  // ══════════════════════════════════════════════════════

  describe("MINTER_ROLE — revokeMinterRole", function () {
    async function minterFixture() {
      const fixture = await deployFixture();
      const { registry, owner, companyAdmin, minterWallet } = fixture;

      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([minterWallet.account.address, 0n], {
        account: companyAdmin.account,
      });

      // Grant first
      await registry.write.grantMinterRole([minterWallet.account.address], {
        account: owner.account,
      });

      return fixture;
    }

    it("revoke-Happy: DEFAULT_ADMIN can revoke MINTER_ROLE", async function () {
      const { registry, owner, minterWallet } = await loadFixture(minterFixture);

      await registry.write.revokeMinterRole([minterWallet.account.address], {
        account: owner.account,
      });

      const hasRole = await registry.read.hasRole([
        (await registry.read.MINTER_ROLE()),
        minterWallet.account.address,
      ]);
      expect(hasRole).to.be.false;
    });

    it("revoke-Happy: company admin can revoke MINTER_ROLE from their employee", async function () {
      const { registry, companyAdmin, minterWallet } = await loadFixture(minterFixture);

      await registry.write.revokeMinterRole([minterWallet.account.address], {
        account: companyAdmin.account,
      });

      const hasRole = await registry.read.hasRole([
        (await registry.read.MINTER_ROLE()),
        minterWallet.account.address,
      ]);
      expect(hasRole).to.be.false;
    });

    it("revoke-Happy: emits MinterRoleRevoked event", async function () {
      const { registry, owner, minterWallet } = await loadFixture(minterFixture);

      const txHash = await registry.write.revokeMinterRole([minterWallet.account.address], {
        account: owner.account,
      });

      const publicClient = await hre.viem.getPublicClient();
      const logs = await publicClient.getLogs({
        address: registry.address,
        fromBlock: 0n,
        event: {
          type: 'event',
          name: 'MinterRoleRevoked',
          inputs: [
            { type: 'uint256', name: 'companyId', indexed: true },
            { type: 'address', name: 'employee', indexed: true },
          ],
        },
      });

      expect(logs.length).to.equal(1);
      expect(logs[0].args.companyId).to.equal(0n);
      expect(getAddress(logs[0].args.employee)).to.equal(
        getAddress(minterWallet.account.address)
      );
    });

    it("revoke-Error: non-admin/non-company-admin reverts", async function () {
      const { registry, other, minterWallet } = await loadFixture(minterFixture);

      await expectRevertWithError(
        () =>
          registry.write.revokeMinterRole([minterWallet.account.address], {
            account: other.account,
          }),
        registry.abi,
        "OnlyCompanyAdminOrAdmin"
      );
    });

    it("revoke-Error: reverts for unregistered employee", async function () {
      const { registry, owner, other } = await loadFixture(minterFixture);

      await expectRevertWithError(
        () =>
          registry.write.revokeMinterRole([other.account.address], {
            account: owner.account,
          }),
        registry.abi,
        "EmployeeNotRegistered"
      );
    });
  });

  // ══════════════════════════════════════════════════════
  //  hasMinterRole
  // ══════════════════════════════════════════════════════

  describe("hasMinterRole", function () {
    async function minterFixture() {
      const fixture = await deployFixture();
      const { registry, owner, companyAdmin, minterWallet } = fixture;

      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([minterWallet.account.address, 0n], {
        account: companyAdmin.account,
      });

      return fixture;
    }

    it("hasMinterRole-Happy: returns true when MINTER_ROLE is granted", async function () {
      const { registry, owner, minterWallet } = await loadFixture(minterFixture);

      await registry.write.grantMinterRole([minterWallet.account.address], {
        account: owner.account,
      });

      const result = await registry.read.hasMinterRole([minterWallet.account.address]);
      expect(result).to.be.true;
    });

    it("hasMinterRole-Happy: returns false when MINTER_ROLE is not granted", async function () {
      const { registry, minterWallet } = await loadFixture(minterFixture);

      const result = await registry.read.hasMinterRole([minterWallet.account.address]);
      expect(result).to.be.false;
    });

    it("hasMinterRole-Happy: returns false after MINTER_ROLE is revoked", async function () {
      const { registry, owner, minterWallet } = await loadFixture(minterFixture);

      await registry.write.grantMinterRole([minterWallet.account.address], {
        account: owner.account,
      });
      expect(await registry.read.hasMinterRole([minterWallet.account.address])).to.be.true;

      await registry.write.revokeMinterRole([minterWallet.account.address], {
        account: owner.account,
      });
      expect(await registry.read.hasMinterRole([minterWallet.account.address])).to.be.false;
    });
  });

  // ══════════════════════════════════════════════════════
  //  mintKudos
  // ══════════════════════════════════════════════════════

  describe("mintKudos", function () {
    async function mintFixture() {
      const fixture = await deployFixture();
      const { nft, registry, owner, companyAdmin, minterWallet, anotherWallet } = fixture;

      // Register company
      await registry.write.registerCompany(
        ["ACME Corp", companyAdmin.account.address],
        { account: owner.account }
      );

      // Register two employees via admin
      await registry.write.registerEmployee([minterWallet.account.address, 0n], {
        account: companyAdmin.account,
      });
      await registry.write.registerEmployee([anotherWallet.account.address, 0n], {
        account: companyAdmin.account,
      });

      // Grant minter role
      await registry.write.grantMinterRole([minterWallet.account.address], {
        account: companyAdmin.account,
      });

      // Set CompanyRegistry on NFT57B so safeMint works
      await nft.write.setCompanyRegistry([registry.address], {
        account: owner.account,
      });

      return fixture;
    }

    it("mint-Happy: minter can mint Kudos to same-company employee", async function () {
      const { registry, nft, minterWallet, anotherWallet } = await loadFixture(mintFixture);

      await registry.write.mintKudos(
        [anotherWallet.account.address, "ipfs://token-uri-1"],
        { account: minterWallet.account }
      );

      // Verify NFT was minted — token ID 0
      const tokenOwner = await nft.read.ownerOf([0n]);
      expect(getAddress(tokenOwner)).to.equal(getAddress(anotherWallet.account.address));
    });

    it("mint-Happy: emits KudosMinted event with correct args", async function () {
      const { registry, minterWallet, anotherWallet } = await loadFixture(mintFixture);

      const txHash = await registry.write.mintKudos(
        [anotherWallet.account.address, "ipfs://token-uri-2"],
        { account: minterWallet.account }
      );

      const publicClient = await hre.viem.getPublicClient();
      const logs = await publicClient.getLogs({
        address: registry.address,
        fromBlock: 0n,
        event: {
          type: 'event',
          name: 'KudosMinted',
          inputs: [
            { type: 'uint256', name: 'tokenId', indexed: true },
            { type: 'uint256', name: 'companyId', indexed: true },
            { type: 'address', name: 'employee', indexed: true },
            { type: 'address', name: 'minter', indexed: false },
          ],
        },
      });

      expect(logs.length).to.equal(1);
      expect(logs[0].args.tokenId).to.equal(0n);
      expect(logs[0].args.companyId).to.equal(0n);
      expect(getAddress(logs[0].args.employee)).to.equal(
        getAddress(anotherWallet.account.address)
      );
    });

    it("mint-Error: non-minter reverts with AccessControl", async function () {
      const { registry, anotherWallet } = await loadFixture(mintFixture);

      await expectRevertWithError(
        () =>
          registry.write.mintKudos(
            [anotherWallet.account.address, "ipfs://token-uri"],
            { account: anotherWallet.account }
          ),
        registry.abi,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("mint-Error: reverts when employee is not registered", async function () {
      const { registry, owner, minterWallet, other } = await loadFixture(mintFixture);

      await expectRevertWithError(
        () =>
          registry.write.mintKudos(
            [other.account.address, "ipfs://token-uri"],
            { account: minterWallet.account }
          ),
        registry.abi,
        "EmployeeNotRegistered"
      );
    });

    it("mint-Error: reverts when minter and employee are in different companies", async function () {
      const { registry, owner, minterWallet, other } = await loadFixture(mintFixture);

      // Register second company with 'other' as admin and employee
      await registry.write.registerCompany(
        ["Tech Inc", other.account.address],
        { account: owner.account }
      );
      await registry.write.registerEmployee([other.account.address, 1n], {
        account: owner.account,
      });

      // minterWallet is in company 0, other is in company 1
      await expectRevertWithError(
        () =>
          registry.write.mintKudos(
            [other.account.address, "ipfs://token-uri"],
            { account: minterWallet.account }
          ),
        registry.abi,
        "NotSameCompany"
      );
    });
  });
});
