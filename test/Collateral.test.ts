import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Collateral } from "../typechain-types";

describe("Collateral", function () {
  async function deployCollateral() {
    const [owner, user1, user2] = await ethers.getSigners();

    // @ts-ignore
    const Contract = await ethers.getContractFactory("Collateral", owner);
    const proxy = (await upgrades.deployProxy(Contract, [owner.address], {
      initializer: "initialize",
    })) as Collateral;

    return { contract: proxy, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { contract, owner } = await loadFixture(deployCollateral);

      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("Deposit", function () {
    it("Should fail", async function () {
      const { contract, user1 } = await loadFixture(deployCollateral);

      await expect(contract.connect(user1).deposit(user1.address, 100))
        .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });

    it("Should work", async function () {
      const { contract, owner, user1, user2 } = await loadFixture(deployCollateral);

      await contract.deposit(user1.address, 100);
      expect(await contract.balanceOf(user1.address)).to.equal(100);
      expect(await contract.getTotalCollateral()).to.equal(100);

      await contract.deposit(user1.address, 100);
      expect(await contract.balanceOf(user1.address)).to.equal(200);
      expect(await contract.getTotalCollateral()).to.equal(200);

      await contract.deposit(user2.address, 100);
      expect(await contract.balanceOf(user2.address)).to.equal(100);
      expect(await contract.getTotalCollateral()).to.equal(300);

      await contract.deposit(user2.address, 100);
      expect(await contract.balanceOf(user2.address)).to.equal(200);
      expect(await contract.getTotalCollateral()).to.equal(400);
    });
  });

  describe("Slash", function () {
    it("Should fail", async function () {
      const { contract, user1 } = await loadFixture(deployCollateral);

      await expect(contract.connect(user1).slash(user1.address, 100))
        .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);

      await expect(contract.slash(user1.address, 100)).to.be.revertedWithCustomError(contract, "InsufficientBalance");
    });

    it("Should work", async function () {
      const { contract, owner, user1, user2 } = await loadFixture(deployCollateral);

      await contract.deposit(user1.address, 200);
      await contract.deposit(user2.address, 200);

      await contract.slash(user1.address, 100);
      expect(await contract.balanceOf(user1.address)).to.equal(100);
      expect(await contract.getSlashedCollateral()).to.equal(100);
      expect(await contract.getTotalCollateral()).to.equal(300);

      await contract.slash(user1.address, 100);
      expect(await contract.balanceOf(user1.address)).to.equal(0);
      expect(await contract.getSlashedCollateral()).to.equal(200);
      expect(await contract.getTotalCollateral()).to.equal(200);

      await contract.slash(user2.address, 100);
      expect(await contract.balanceOf(user2.address)).to.equal(100);
      expect(await contract.getSlashedCollateral()).to.equal(300);
      expect(await contract.getTotalCollateral()).to.equal(100);

      await contract.slash(user2.address, 100);
      expect(await contract.balanceOf(user2.address)).to.equal(0);
      expect(await contract.getSlashedCollateral()).to.equal(400);
      expect(await contract.getTotalCollateral()).to.equal(0);
    });
  });

  describe("Withdraw", function () {
    it("Should fail", async function () {
      const { contract, user1 } = await loadFixture(deployCollateral);

      await expect(contract.connect(user1).deposit(user1.address, 100))
        .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);

      await expect(contract.withdraw(user1.address, 100)).to.be.revertedWithCustomError(
        contract,
        "InsufficientBalance"
      );
    });

    it("Should work", async function () {
      const { contract, owner, user1, user2 } = await loadFixture(deployCollateral);

      await contract.deposit(user1.address, 200);
      await contract.deposit(user2.address, 200);

      await contract.withdraw(user1.address, 100);
      expect(await contract.balanceOf(user1.address)).to.equal(100);
      expect(await contract.getTotalCollateral()).to.equal(300);

      await contract.withdraw(user1.address, 100);
      expect(await contract.balanceOf(user1.address)).to.equal(0);
      expect(await contract.getTotalCollateral()).to.equal(200);

      await contract.withdraw(user2.address, 100);
      expect(await contract.balanceOf(user2.address)).to.equal(100);
      expect(await contract.getTotalCollateral()).to.equal(100);

      await contract.withdraw(user2.address, 100);
      expect(await contract.balanceOf(user2.address)).to.equal(0);
      expect(await contract.getTotalCollateral()).to.equal(0);
    });
  });
});
