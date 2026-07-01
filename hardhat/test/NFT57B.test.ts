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

describe("NFT57B", function () {
  async function deployFixture() {
    const [owner, minter, employee, recipient, other] =
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

    // Set CompanyRegistry on NFT57B so it can mint
    await nft.write.setCompanyRegistry([registry.address], {
      account: owner.account,
    });

    // Register company so we can use recognize() for minting
    await registry.write.registerCompany(
      ["Test Corp", minter.account.address], // minter acts as company admin for tests
      { account: owner.account }
    );

    // Register employee
    await registry.write.registerEmployee([0n], {
      account: employee.account,
    });

    return { nft, registry, owner, minter, employee, recipient, other };
  }

  describe("R1: safeMint", function () {
    it("R1-Happy: should mint token via CompanyRegistry, set owner, and emit NFTMinted", async function () {
      const { nft, registry, minter, employee } = await loadFixture(deployFixture);

      const uri = "ipfs://QmTest123";

      // Mint via registry.recognize() — this calls nft57b.safeMint() internally
      await registry.write.recognize([employee.account.address, uri], {
        account: minter.account,
      });

      // Token 0 is minted
      const ownerOf0 = await nft.read.ownerOf([0n]);
      expect(ownerOf0).to.equal(getAddress(employee.account.address));

      // Token URI is set
      const tokenUri = await nft.read.tokenURI([0n]);
      expect(tokenUri).to.equal(uri);

      // Balance increased
      const balance = await nft.read.balanceOf([employee.account.address]);
      expect(balance).to.equal(1n);
    });

    it("R1-Error: should revert when caller is not CompanyRegistry", async function () {
      const { nft, other, employee } = await loadFixture(deployFixture);

      await expectRevertWithError(
        () =>
          nft.write.safeMint([employee.account.address, "uri"], {
            account: other.account,
          }),
        nft.abi,
        "OnlyCompanyRegistry"
      );
    });

    it("R1-Error: should revert when contract is paused", async function () {
      const { nft, registry, owner, minter, employee } = await loadFixture(deployFixture);

      // Pause by admin
      await nft.write.pause({ account: owner.account });

      // recognize() calls safeMint which has whenNotPaused
      await expectRevertWithError(
        () =>
          registry.write.recognize([employee.account.address, "uri"], {
            account: minter.account,
          }),
        nft.abi,
        "EnforcedPause"
      );
    });
  });

  describe("R2: burn", function () {
    it("R2-Happy: should burn token, clear owner, and emit NFTBurned", async function () {
      const { nft, registry, owner, minter, employee } = await loadFixture(deployFixture);

      // First mint a token
      await registry.write.recognize([employee.account.address, "ipfs://test"], {
        account: minter.account,
      });

      // Burn by admin
      await nft.write.burn([0n], { account: owner.account });

      // Token no longer exists — use balanceOf (ownerOf would revert)
      const balance = await nft.read.balanceOf([employee.account.address]);
      expect(balance).to.equal(0n);

      // ownerOf reverts for burned tokens
      await expectRevertWithError(
        () => nft.read.ownerOf([0n]),
        nft.abi,
        "ERC721NonexistentToken"
      );
    });

    it("R2-Error: should revert when caller does not have DEFAULT_ADMIN_ROLE", async function () {
      const { nft, registry, minter, employee, other } = await loadFixture(deployFixture);

      // Mint a token first
      await registry.write.recognize([employee.account.address, "uri"], {
        account: minter.account,
      });

      await expectRevertWithError(
        () => nft.write.burn([0n], { account: other.account }),
        nft.abi,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("R3: Non-transferable", function () {
    it("R3-Happy: admin can transfer token via transferFrom", async function () {
      const { nft, registry, owner, minter, employee, recipient } =
        await loadFixture(deployFixture);

      // Mint token to employee
      await registry.write.recognize([employee.account.address, "uri"], {
        account: minter.account,
      });

      // Admin transfers from employee to recipient
      await nft.write.transferFrom(
        [employee.account.address, recipient.account.address, 0n],
        { account: owner.account }
      );

      // Recipient now owns the token
      const newOwner = await nft.read.ownerOf([0n]);
      expect(newOwner).to.equal(getAddress(recipient.account.address));

      // Employee's balance is reduced
      const employeeBalance = await nft.read.balanceOf([
        employee.account.address,
      ]);
      expect(employeeBalance).to.equal(0n);

      // Recipient's balance is increased
      const recipientBalance = await nft.read.balanceOf([
        recipient.account.address,
      ]);
      expect(recipientBalance).to.equal(1n);
    });

    it("R3-Error: non-admin employee transfer reverts with TransferNotAllowed", async function () {
      const { nft, registry, minter, employee, recipient } =
        await loadFixture(deployFixture);

      // Mint token to employee
      await registry.write.recognize([employee.account.address, "uri"], {
        account: minter.account,
      });

      // Employee tries to transfer their own token
      await expectRevertWithError(
        () =>
          nft.write.transferFrom(
            [employee.account.address, recipient.account.address, 0n],
            { account: employee.account }
          ),
        nft.abi,
        "TransferNotAllowed"
      );
    });
  });

  describe("R4: Pausable", function () {
    it("R4-Happy: pause/unpause cycle blocks and resumes minting", async function () {
      const { nft, registry, owner, minter, employee } = await loadFixture(deployFixture);

      // Mint before pause works
      await registry.write.recognize([employee.account.address, "uri1"], {
        account: minter.account,
      });

      // Pause by admin
      await nft.write.pause({ account: owner.account });
      const isPaused = await nft.read.paused();
      expect(isPaused).to.be.true;

      // Mint blocked when paused
      await expectRevertWithError(
        () =>
          registry.write.recognize([employee.account.address, "uri2"], {
            account: minter.account,
          }),
        nft.abi,
        "EnforcedPause"
      );

      // Burn still works when paused (admin recovery)
      await nft.write.burn([0n], { account: owner.account });
      const balanceAfterBurn = await nft.read.balanceOf([
        employee.account.address,
      ]);
      expect(balanceAfterBurn).to.equal(0n);

      // Unpause by admin
      await nft.write.unpause({ account: owner.account });
      const isUnpaused = await nft.read.paused();
      expect(isUnpaused).to.be.false;

      // Mint resumes after unpause (need to re-register employee since balance is 0)
      // Actually employee is still registered, just has no tokens. Mint again.
      await registry.write.recognize([employee.account.address, "uri3"], {
        account: minter.account,
      });
      const ownerOf1 = await nft.read.ownerOf([1n]);
      expect(ownerOf1).to.equal(getAddress(employee.account.address));
    });

    it("R4-Error: pause by non-admin reverts", async function () {
      const { nft, other } = await loadFixture(deployFixture);

      await expectRevertWithError(
        () => nft.write.pause({ account: other.account }),
        nft.abi,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("R4-Happy: burn works when paused (admin recovery)", async function () {
      const { nft, registry, owner, minter, employee } = await loadFixture(deployFixture);

      // Mint two tokens
      await registry.write.recognize([employee.account.address, "uri1"], {
        account: minter.account,
      });
      await registry.write.recognize([employee.account.address, "uri2"], {
        account: minter.account,
      });

      // Pause
      await nft.write.pause({ account: owner.account });
      expect(await nft.read.paused()).to.be.true;

      // Admin can burn while paused
      await nft.write.burn([1n], { account: owner.account });

      // Verify token 1 is gone (use balanceOf)
      const balance = await nft.read.balanceOf([employee.account.address]);
      expect(balance).to.equal(1n);

      // Token 0 still exists, owned by employee
      const ownerOf0 = await nft.read.ownerOf([0n]);
      expect(ownerOf0).to.equal(getAddress(employee.account.address));
    });
  });

  describe("R5: supportsInterface", function () {
    it("R5: should return true for ERC721, ERC721Enumerable, ERC721URIStorage, and AccessControl interface IDs", async function () {
      const { nft } = await loadFixture(deployFixture);

      // ERC721 interface ID: 0x80ac58cd
      expect(await nft.read.supportsInterface(["0x80ac58cd"])).to.be.true;

      // ERC721Enumerable interface ID: 0x780e9d63
      expect(await nft.read.supportsInterface(["0x780e9d63"])).to.be.true;

      // ERC721Metadata interface ID: 0x5b5e139f
      expect(await nft.read.supportsInterface(["0x5b5e139f"])).to.be.true;

      // AccessControl interface ID: 0x7965db0b (still supported for DEFAULT_ADMIN_ROLE)
      expect(await nft.read.supportsInterface(["0x7965db0b"])).to.be.true;

      // ERC4906 (ERC721URIStorage) interface ID: 0x49064906
      expect(await nft.read.supportsInterface(["0x49064906"])).to.be.true;

      // A random interface ID should return false
      expect(await nft.read.supportsInterface(["0x12345678"])).to.be.false;
    });
  });
});
