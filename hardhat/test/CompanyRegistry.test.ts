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

describe("CompanyRegistry — factory API", function () {
  async function deployFixture() {
    const [owner, other, companyAdmin, employee, anotherWallet] =
      await hre.viem.getWalletClients();

    // Deploy NFT57B (owner gets DEFAULT_ADMIN_ROLE)
    const nft = await hre.viem.deployContract("NFT57B", [
      owner.account.address,
    ]);

    // Deploy the two reward contracts (owner gets DEFAULT_ADMIN_ROLE)
    const bonus = await hre.viem.deployContract("BonusReward", [
      owner.account.address,
    ]);
    const recognition = await hre.viem.deployContract("RecognitionToken", [
      owner.account.address,
      "57Blocks Recognition",
      "57BR",
    ]);

    // Deploy the factory with the reward addresses pinned as immutables
    const registry = await hre.viem.deployContract("CompanyRegistry", [
      nft.address,
      bonus.address,
      recognition.address,
      owner.account.address, // DEFAULT_ADMIN_ROLE on the factory
    ]);

    // F1.10 wiring: the factory must be DEFAULT_ADMIN on both rewards so
    // registerCompany can grant MINTER_ROLE to each deployed Company
    const defaultAdminRole = await bonus.read.DEFAULT_ADMIN_ROLE();
    await bonus.write.grantRole([defaultAdminRole, registry.address], {
      account: owner.account,
    });
    await recognition.write.grantRole([defaultAdminRole, registry.address], {
      account: owner.account,
    });

    return {
      nft,
      registry,
      bonus,
      recognition,
      owner,
      other,
      companyAdmin,
      employee,
      anotherWallet,
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

  describe("registerCompany", function () {
    it("returns the deployed Company address and assigns 1-based ids in registration order", async function () {
      const { registry, owner, companyAdmin } = await loadFixture(
        deployFixture
      );

      // First registration → companyId 1 (array index + 1)
      const company1 = await registerCompany(
        registry,
        owner,
        "ACME Corp",
        companyAdmin.account.address
      );
      expect(company1).to.match(/^0x[0-9a-fA-F]{40}$/);
      expect(
        getAddress(await registry.read.getCompanyAddress([1n]))
      ).to.equal(getAddress(company1));
      expect(await registry.read.companyCount()).to.equal(1n);

      // Second registration → companyId 2; the first entry is unchanged
      const company2 = await registerCompany(
        registry,
        owner,
        "Tech Inc",
        companyAdmin.account.address
      );
      expect(company2).not.to.equal(company1);
      expect(await registry.read.companyCount()).to.equal(2n);
      expect(
        getAddress(await registry.read.getCompanyAddress([2n]))
      ).to.equal(getAddress(company2));
      expect(
        getAddress(await registry.read.getCompanyAddress([1n]))
      ).to.equal(getAddress(company1));
    });

    it("makes the passed adminWallet the Company DEFAULT_ADMIN_ROLE, not msg.sender", async function () {
      const { registry, owner, companyAdmin } = await loadFixture(
        deployFixture
      );

      const companyAddress = await registerCompany(
        registry,
        owner,
        "ACME Corp",
        companyAdmin.account.address
      );
      const company = await hre.viem.getContractAt("Company", companyAddress);

      const adminRole = await company.read.DEFAULT_ADMIN_ROLE();
      // The passed wallet is the company admin…
      expect(
        await company.read.hasRole([adminRole, companyAdmin.account.address])
      ).to.be.true;
      // …while the factory admin (msg.sender of registerCompany) is NOT
      expect(
        await company.read.hasRole([adminRole, owner.account.address])
      ).to.be.false;
    });

    it("emits CompanyRegistered with indexed companyId, companyAddress, adminWallet and name", async function () {
      const { registry, owner, companyAdmin } = await loadFixture(
        deployFixture
      );

      const companyAddress = await registerCompany(
        registry,
        owner,
        "ACME Corp",
        companyAdmin.account.address
      );

      const publicClient = await hre.viem.getPublicClient();
      const logs = await publicClient.getLogs({
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

      expect(logs.length).to.equal(1);
      expect(logs[0].args.companyId).to.equal(1n);
      expect(getAddress(logs[0].args.companyAddress)).to.equal(
        getAddress(companyAddress)
      );
      expect(getAddress(logs[0].args.owner)).to.equal(
        getAddress(companyAdmin.account.address)
      );
      expect(logs[0].args.name).to.equal("ACME Corp");
    });

    it("grants MINTER_ROLE on BonusReward and RecognitionToken to the deployed Company", async function () {
      const { registry, bonus, recognition, owner, companyAdmin } =
        await loadFixture(deployFixture);

      const companyAddress = await registerCompany(
        registry,
        owner,
        "ACME Corp",
        companyAdmin.account.address
      );

      const bonusMinterRole = await bonus.read.MINTER_ROLE();
      expect(
        await bonus.read.hasRole([bonusMinterRole, companyAddress])
      ).to.be.true;

      const recognitionMinterRole = await recognition.read.MINTER_ROLE();
      expect(
        await recognition.read.hasRole([recognitionMinterRole, companyAddress])
      ).to.be.true;
    });

    it("reverts AccessControlUnauthorizedAccount when the caller is not the factory DEFAULT_ADMIN", async function () {
      const { registry, other, companyAdmin } = await loadFixture(
        deployFixture
      );

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

    it("reverts InvalidAdminWallet when adminWallet is the zero address", async function () {
      const { registry, owner } = await loadFixture(deployFixture);

      await expectRevertWithError(
        () =>
          registry.write.registerCompany(
            ["ACME Corp", "0x0000000000000000000000000000000000000000"],
            { account: owner.account }
          ),
        registry.abi,
        "InvalidAdminWallet"
      );
    });
  });

  describe("isCompany", function () {
    it("returns true for a registered Company and false for other addresses", async function () {
      const { registry, owner, other, employee, companyAdmin } =
        await loadFixture(deployFixture);

      const companyAddress = await registerCompany(
        registry,
        owner,
        "ACME Corp",
        companyAdmin.account.address
      );

      expect(await registry.read.isCompany([companyAddress])).to.be.true;
      expect(await registry.read.isCompany([other.account.address])).to.be
        .false;
      expect(await registry.read.isCompany([employee.account.address])).to.be
        .false;
      expect(
        await registry.read.isCompany([
          "0x0000000000000000000000000000000000000000",
        ])
      ).to.be.false;
    });
  });

  describe("getCompanyAddressByEmployee", function () {
    async function withEmployeeFixture() {
      const fixture = await deployFixture();
      const { registry, owner, companyAdmin, employee } = fixture;

      const companyAddress = await registerCompany(
        registry,
        owner,
        "ACME Corp",
        companyAdmin.account.address
      );
      const company = await hre.viem.getContractAt("Company", companyAddress);

      // Company.registerEmployee syncs the factory routing index in the same
      // tx (CEI — F1.7/C1.7)
      await company.write.registerEmployee(
        [employee.account.address, "Alice"],
        { account: companyAdmin.account }
      );

      return { ...fixture, company, companyAddress };
    }

    it("returns the Company address for an employee registered via the Company", async function () {
      const { registry, employee, companyAddress } = await loadFixture(
        withEmployeeFixture
      );

      const mapped = await registry.read.getCompanyAddressByEmployee([
        employee.account.address,
      ]);
      expect(getAddress(mapped)).to.equal(getAddress(companyAddress));
    });

    it("reverts EmployeeNotRegistered for an unmapped employee", async function () {
      const { registry, anotherWallet } = await loadFixture(
        withEmployeeFixture
      );

      await expectRevertWithError(
        () =>
          registry.read.getCompanyAddressByEmployee([
            anotherWallet.account.address,
          ]),
        registry.abi,
        "EmployeeNotRegistered"
      );
    });
  });

  describe("company queries", function () {
    it("getCompanyAddress returns the Company address for a valid id", async function () {
      const { registry, owner, companyAdmin } = await loadFixture(
        deployFixture
      );

      const companyAddress = await registerCompany(
        registry,
        owner,
        "ACME Corp",
        companyAdmin.account.address
      );

      expect(
        getAddress(await registry.read.getCompanyAddress([1n]))
      ).to.equal(getAddress(companyAddress));
    });

    it("getCompanyAddress reverts CompanyNotFound for id 0 and out-of-range ids", async function () {
      const { registry, owner, companyAdmin } = await loadFixture(
        deployFixture
      );

      await registerCompany(
        registry,
        owner,
        "ACME Corp",
        companyAdmin.account.address
      );

      await expectRevertWithError(
        () => registry.read.getCompanyAddress([0n]),
        registry.abi,
        "CompanyNotFound"
      );
      await expectRevertWithError(
        () => registry.read.getCompanyAddress([2n]), // only 1 registered
        registry.abi,
        "CompanyNotFound"
      );
    });

    it("getCompanies returns all Company addresses in registration order", async function () {
      const { registry, owner, companyAdmin } = await loadFixture(
        deployFixture
      );

      const company1 = await registerCompany(
        registry,
        owner,
        "ACME Corp",
        companyAdmin.account.address
      );
      const company2 = await registerCompany(
        registry,
        owner,
        "Tech Inc",
        companyAdmin.account.address
      );

      const companies = await registry.read.getCompanies();
      expect(companies.length).to.equal(2);
      expect(getAddress(companies[0])).to.equal(getAddress(company1));
      expect(getAddress(companies[1])).to.equal(getAddress(company2));
    });

    it("companyCount tracks the number of registered companies", async function () {
      const { registry, owner, companyAdmin } = await loadFixture(
        deployFixture
      );

      expect(await registry.read.companyCount()).to.equal(0n);

      await registerCompany(
        registry,
        owner,
        "ACME Corp",
        companyAdmin.account.address
      );
      expect(await registry.read.companyCount()).to.equal(1n);

      await registerCompany(
        registry,
        owner,
        "Tech Inc",
        companyAdmin.account.address
      );
      expect(await registry.read.companyCount()).to.equal(2n);
    });
  });

  describe("Company-only gates (NotCompany)", function () {
    it("reverts NotCompany when a non-Company (even the factory admin) calls recordEmployee", async function () {
      const { registry, owner, employee } = await loadFixture(deployFixture);

      await expectRevertWithError(
        () =>
          registry.write.recordEmployee([employee.account.address], {
            account: owner.account,
          }),
        registry.abi,
        "NotCompany"
      );
    });

    it("reverts NotCompany when a non-Company calls removeEmployeeRecord", async function () {
      const { registry, owner, employee } = await loadFixture(deployFixture);

      await expectRevertWithError(
        () =>
          registry.write.removeEmployeeRecord([employee.account.address], {
            account: owner.account,
          }),
        registry.abi,
        "NotCompany"
      );
    });

    it("reverts NotCompany when a non-Company calls setCompanyRewardAmount", async function () {
      const { registry, owner } = await loadFixture(deployFixture);

      await expectRevertWithError(
        () => registry.write.setCompanyRewardAmount([1000n], {
          account: owner.account,
        }),
        registry.abi,
        "NotCompany"
      );
    });

    it("a deployed Company can set its reward amount via the Company admin delegate", async function () {
      const { registry, owner, companyAdmin } = await loadFixture(
        deployFixture
      );

      const companyAddress = await registerCompany(
        registry,
        owner,
        "ACME Corp",
        companyAdmin.account.address
      );
      const company = await hre.viem.getContractAt("Company", companyAddress);

      // Bootstrapped from the platform seed knob at registration (0 by default)
      expect(
        await registry.read.companyRewardAmount([companyAddress])
      ).to.equal(0n);

      // Company admin sets 1000 via the Company delegate → factory mapping
      await company.write.setRewardAmount([1000n], {
        account: companyAdmin.account,
      });
      expect(
        await registry.read.companyRewardAmount([companyAddress])
      ).to.equal(1000n);
      expect(await company.read.rewardAmount()).to.equal(1000n);
    });
  });
});
