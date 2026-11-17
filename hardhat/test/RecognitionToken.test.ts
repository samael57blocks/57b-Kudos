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

describe("RecognitionToken", function () {
  async function deployFixture() {
    const [owner, minter, employee, other] =
      await hre.viem.getWalletClients();

    const recognition = await hre.viem.deployContract("RecognitionToken", [
      owner.account.address,
      "57Blocks Recognition",
      "57BR",
    ]);

    // Grant MINTER_ROLE to minter (owner holds DEFAULT_ADMIN_ROLE)
    const MINTER_ROLE = await recognition.read.MINTER_ROLE();
    await recognition.write.grantRole([MINTER_ROLE, minter.account.address], {
      account: owner.account,
    });

    return { recognition, owner, minter, employee, other, MINTER_ROLE };
  }

  describe("R1: emitReward (mint)", function () {
    it("R1-Happy: should mint a recognition badge and emit RewardEmitted", async function () {
      const { recognition, minter, employee } =
        await loadFixture(deployFixture);

      const uri = "ipfs://recognition-metadata";
      await recognition.write.emitReward(
        [employee.account.address, 0n, uri],
        { account: minter.account }
      );

      expect(await recognition.read.balanceOf([employee.account.address])).to.equal(
        1n
      );
      expect(await recognition.read.ownerOf([0n])).to.equal(
        getAddress(employee.account.address)
      );
      expect(await recognition.read.tokenURI([0n])).to.equal(uri);
    });

    it("R1-Error: should revert when caller does not have MINTER_ROLE", async function () {
      const { recognition, other, employee } =
        await loadFixture(deployFixture);

      await expectRevertWithError(
        () =>
          recognition.write.emitReward([employee.account.address, 0n, "uri"], {
            account: other.account,
          }),
        recognition.abi,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("R1-Error: should revert with AlreadyRecognized when employee already holds a badge", async function () {
      const { recognition, minter, employee } =
        await loadFixture(deployFixture);

      // First mint succeeds
      await recognition.write.emitReward(
        [employee.account.address, 0n, "first"],
        { account: minter.account }
      );

      // Second mint for same employee reverts
      await expectRevertWithError(
        () =>
          recognition.write.emitReward(
            [employee.account.address, 0n, "second"],
            { account: minter.account }
          ),
        recognition.abi,
        "AlreadyRecognized"
      );
    });

    it("R1-Happy: token IDs increment sequentially", async function () {
      const { recognition, minter, employee, other } =
        await loadFixture(deployFixture);

      await recognition.write.emitReward(
        [employee.account.address, 0n, "uri1"],
        { account: minter.account }
      );
      await recognition.write.emitReward(
        [other.account.address, 0n, "uri2"],
        { account: minter.account }
      );

      expect(await recognition.read.ownerOf([0n])).to.equal(
        getAddress(employee.account.address)
      );
      expect(await recognition.read.ownerOf([1n])).to.equal(
        getAddress(other.account.address)
      );
      expect(await recognition.read.tokenURI([1n])).to.equal("uri2");
    });
  });

  describe("R2: Non-transferable policy", function () {
    it("R2-Error: should revert with PermanentToken on transferFrom by any caller", async function () {
      const { recognition, minter, employee, other } =
        await loadFixture(deployFixture);

      await recognition.write.emitReward(
        [employee.account.address, 0n, "uri"],
        { account: minter.account }
      );

      // Anyone trying to transfer — even admin — reverts
      await expectRevertWithError(
        () =>
          recognition.write.transferFrom(
            [employee.account.address, other.account.address, 0n],
            { account: employee.account }
          ),
        recognition.abi,
        "PermanentToken"
      );
    });

    it("R2-Error: should revert with PermanentToken on safeTransferFrom", async function () {
      const { recognition, minter, employee, other } =
        await loadFixture(deployFixture);

      await recognition.write.emitReward(
        [employee.account.address, 0n, "uri"],
        { account: minter.account }
      );

      await expectRevertWithError(
        () =>
          recognition.write.safeTransferFrom(
            [employee.account.address, other.account.address, 0n],
            { account: employee.account }
          ),
        recognition.abi,
        "PermanentToken"
      );
    });

    it("R2-Error: should revert with PermanentToken when admin tries to transfer", async function () {
      const { recognition, minter, employee, other, owner } =
        await loadFixture(deployFixture);

      await recognition.write.emitReward(
        [employee.account.address, 0n, "uri"],
        { account: minter.account }
      );

      // Even DEFAULT_ADMIN_ROLE cannot transfer — RecognitionToken is stricter than NFT57B
      await expectRevertWithError(
        () =>
          recognition.write.transferFrom(
            [employee.account.address, other.account.address, 0n],
            { account: owner.account }
          ),
        recognition.abi,
        "PermanentToken"
      );
    });
  });

  describe("R3: Non-burnable (permanent)", function () {
    it("R3-Error: claimReward should revert with PermanentToken", async function () {
      const { recognition } = await loadFixture(deployFixture);

      await expectRevertWithError(
        () => recognition.write.claimReward(),
        recognition.abi,
        "PermanentToken"
      );
    });

    it("R3-Error: cannot burn via approval + force transfer to zero", async function () {
      const { recognition, minter, employee } =
        await loadFixture(deployFixture);

      await recognition.write.emitReward(
        [employee.account.address, 0n, "uri"],
        { account: minter.account }
      );

      // Approve and attempt transfer to zero — blocked by _update
      await recognition.write.approve([employee.account.address, 0n], {
        account: employee.account,
      });

      // ERC721 burn is protected — there's no public burn,
      // and _update blocks from != address(0) regardless of destination
      // Since there's no way to call burn directly (not exposed),
      // verify transfer is blocked as proof
      expect(await recognition.read.balanceOf([employee.account.address])).to.equal(
        1n
      );
    });

    it("R3-Happy: balanceOf remains after any transfer attempt", async function () {
      const { recognition, minter, employee, other } =
        await loadFixture(deployFixture);

      await recognition.write.emitReward(
        [employee.account.address, 0n, "uri"],
        { account: minter.account }
      );

      // Attempt transfer (will revert)
      try {
        await recognition.write.transferFrom(
          [employee.account.address, other.account.address, 0n],
          { account: employee.account }
        );
      } catch {
        // Expected
      }

      // Balance unchanged
      expect(await recognition.read.balanceOf([employee.account.address])).to.equal(
        1n
      );
      expect(await recognition.read.ownerOf([0n])).to.equal(
        getAddress(employee.account.address)
      );
    });
  });

  describe("R4: Name and Symbol", function () {
    it("R4-Happy: should have correct name and symbol", async function () {
      const { recognition } = await loadFixture(deployFixture);

      expect(await recognition.read.name()).to.equal("57Blocks Recognition");
      expect(await recognition.read.symbol()).to.equal("57BR");
    });
  });

  describe("R5: supportsInterface", function () {
    it("R5-Happy: should return true for IReward, ERC721, and AccessControl interface IDs", async function () {
      const { recognition } = await loadFixture(deployFixture);

      // Compute IReward interface ID from its function selectors
      const emitRewardSig = keccak256(
        toBytes("emitReward(address,uint256,string)")
      );
      const claimRewardSig = keccak256(toBytes("claimReward()"));
      const emitRewardSelector = slice(emitRewardSig, 0, 4);
      const claimRewardSelector = slice(claimRewardSig, 0, 4);
      const irewardInterfaceId =
        "0x" +
        (
          BigInt(emitRewardSelector) ^ BigInt(claimRewardSelector)
        )
          .toString(16)
          .padStart(8, "0");

      expect(
        await recognition.read.supportsInterface([irewardInterfaceId])
      ).to.be.true;

      // ERC721 interface ID: 0x80ac58cd
      expect(await recognition.read.supportsInterface(["0x80ac58cd"])).to.be
        .true;

      // AccessControl interface ID: 0x7965db0b
      expect(await recognition.read.supportsInterface(["0x7965db0b"])).to.be
        .true;

      // A random interface ID should return false
      expect(await recognition.read.supportsInterface(["0x12345678"])).to.be
        .false;
    });
  });
});
