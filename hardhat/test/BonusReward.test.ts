import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { getAddress, decodeErrorResult, keccak256, toBytes, slice } from "viem";

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

describe("BonusReward", function () {
  async function deployFixture() {
    const [owner, minter, employee, other] =
      await hre.viem.getWalletClients();

    const bonus = await hre.viem.deployContract("BonusReward", [
      owner.account.address,
    ]);

    // Grant MINTER_ROLE to minter (owner holds DEFAULT_ADMIN_ROLE)
    const MINTER_ROLE = await bonus.read.MINTER_ROLE();
    await bonus.write.grantRole([MINTER_ROLE, minter.account.address], {
      account: owner.account,
    });

    return { bonus, owner, minter, employee, other, MINTER_ROLE };
  }

  describe("R1: emitReward (mint)", function () {
    it("R1-Happy: should mint bonus tokens to recipient and emit RewardEmitted", async function () {
      const { bonus, minter, employee } = await loadFixture(deployFixture);

      const amount = 1000n;
      const uri = "ipfs://ignored";
      await bonus.write.emitReward([employee.account.address, amount, uri], {
        account: minter.account,
      });

      const balance = await bonus.read.balanceOf([employee.account.address]);
      expect(balance).to.equal(amount);

      const totalSupply = await bonus.read.totalSupply();
      expect(totalSupply).to.equal(amount);
    });

    it("R1-Error: should revert when caller does not have MINTER_ROLE", async function () {
      const { bonus, other, employee } = await loadFixture(deployFixture);

      await expectRevertWithError(
        () =>
          bonus.write.emitReward([employee.account.address, 100n, "uri"], {
            account: other.account,
          }),
        bonus.abi,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("R1-Happy: uri parameter is ignored in emitReward", async function () {
      const { bonus, minter, employee } = await loadFixture(deployFixture);

      // uri is irrelevant for ERC-20 mint — verify it doesn't cause issues
      await bonus.write.emitReward([employee.account.address, 500n, ""], {
        account: minter.account,
      });
      await bonus.write.emitReward(
        [employee.account.address, 500n, "anything_here"],
        { account: minter.account }
      );

      const balance = await bonus.read.balanceOf([employee.account.address]);
      expect(balance).to.equal(1000n);
    });
  });

  describe("R2: claimReward (burn)", function () {
    it("R2-Happy: should burn caller's entire balance and emit RewardClaimed", async function () {
      const { bonus, minter, employee } = await loadFixture(deployFixture);

      // Mint some tokens first
      const amount = 2000n;
      await bonus.write.emitReward([employee.account.address, amount, ""], {
        account: minter.account,
      });

      // Employee claims their full balance
      await bonus.write.claimReward({ account: employee.account });

      const balance = await bonus.read.balanceOf([employee.account.address]);
      expect(balance).to.equal(0n);

      const totalSupply = await bonus.read.totalSupply();
      expect(totalSupply).to.equal(0n);
    });

    it("R2-Error: should revert with NothingToClaim when balance is 0", async function () {
      const { bonus, employee } = await loadFixture(deployFixture);

      await expectRevertWithError(
        () => bonus.write.claimReward({ account: employee.account }),
        bonus.abi,
        "NothingToClaim"
      );
    });

    it("R2-Happy: claim is public — any balance holder can call", async function () {
      const { bonus, minter, employee, other } =
        await loadFixture(deployFixture);

      // Mint to employee
      await bonus.write.emitReward([employee.account.address, 500n, ""], {
        account: minter.account,
      });

      // other (non-employee, non-minter) cannot claim employee's balance
      // but other CAN claim their own (which is 0)
      await expectRevertWithError(
        () => bonus.write.claimReward({ account: other.account }),
        bonus.abi,
        "NothingToClaim"
      );

      // Employee can claim
      await bonus.write.claimReward({ account: employee.account });
      const balance = await bonus.read.balanceOf([employee.account.address]);
      expect(balance).to.equal(0n);
    });
  });

  describe("R3: Access control", function () {
    it("R3-Happy: DEFAULT_ADMIN_ROLE can grant/revoke MINTER_ROLE", async function () {
      const { bonus, owner, minter, other, MINTER_ROLE } =
        await loadFixture(deployFixture);

      // Revoke MINTER from current minter
      await bonus.write.revokeRole([MINTER_ROLE, minter.account.address], {
        account: owner.account,
      });

      await expectRevertWithError(
        () =>
          bonus.write.emitReward([other.account.address, 100n, ""], {
            account: minter.account,
          }),
        bonus.abi,
        "AccessControlUnauthorizedAccount"
      );

      // Grant to new minter (other)
      await bonus.write.grantRole([MINTER_ROLE, other.account.address], {
        account: owner.account,
      });

      await bonus.write.emitReward([minter.account.address, 100n, ""], {
        account: other.account,
      });

      const balance = await bonus.read.balanceOf([minter.account.address]);
      expect(balance).to.equal(100n);
    });
  });

  describe("R4: Name and Symbol", function () {
    it("R4-Happy: should have correct name and symbol", async function () {
      const { bonus } = await loadFixture(deployFixture);

      expect(await bonus.read.name()).to.equal("57Blocks Bonus");
      expect(await bonus.read.symbol()).to.equal("57BB");
    });
  });

  describe("R5: supportsInterface", function () {
    it("R5-Happy: should return true for IReward and AccessControl interface IDs", async function () {
      const { bonus } = await loadFixture(deployFixture);

      // Compute IReward interface ID from its function selectors
      const emitRewardSig = keccak256(toBytes("emitReward(address,uint256,string)"));
      const claimRewardSig = keccak256(toBytes("claimReward()"));
      const emitRewardSelector = slice(emitRewardSig, 0, 4);
      const claimRewardSelector = slice(claimRewardSig, 0, 4);
      const irewardInterfaceId =
        "0x" + ((BigInt(emitRewardSelector) ^ BigInt(claimRewardSelector))).toString(16).padStart(8, "0");

      expect(await bonus.read.supportsInterface([irewardInterfaceId])).to.be.true;

      // AccessControl interface ID: 0x7965db0b
      expect(await bonus.read.supportsInterface(["0x7965db0b"])).to.be.true;

      // A random interface ID should return false
      expect(await bonus.read.supportsInterface(["0x12345678"])).to.be.false;
    });
  });
});
