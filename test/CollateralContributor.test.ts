import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { CollateralContributor } from "../typechain-types";

describe("CollateralContributor", function () {
  async function deployCollateralContributor() {
    const [owner, miner1, miner2, contributor1, contributor2] = await ethers.getSigners();

    // @ts-ignore
    const Contract = await ethers.getContractFactory("CollateralContributor", owner);
    const proxy = (await upgrades.deployProxy(Contract, [owner.address], {
      initializer: "initialize",
    })) as CollateralContributor;

    return { contract: proxy, owner, miner1, miner2, contributor1, contributor2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { contract, owner } = await loadFixture(deployCollateralContributor);

      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("Deposit", function () {
    it("Should fail with unauthorized account", async function () {
      const { contract, miner1, contributor1 } = await loadFixture(deployCollateralContributor);

      await expect(contract.connect(contributor1).depositFor(miner1.address, contributor1.address, 100))
        .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
        .withArgs(contributor1.address);
    });

    it("Should fail with invalid address", async function () {
      const { contract, contributor1 } = await loadFixture(deployCollateralContributor);

      await expect(contract.depositFor(ethers.ZeroAddress, contributor1.address, 100))
        .to.be.revertedWithCustomError(contract, "InvalidAddress");

      await expect(contract.depositFor(contributor1.address, ethers.ZeroAddress, 100))
        .to.be.revertedWithCustomError(contract, "InvalidAddress");
    });

    it("Should fail with invalid amount", async function () {
      const { contract, miner1, contributor1 } = await loadFixture(deployCollateralContributor);

      await expect(contract.depositFor(miner1.address, contributor1.address, 0))
        .to.be.revertedWithCustomError(contract, "InvalidAmount");
    });

    it("Should work", async function () {
      const { contract, owner, miner1, miner2, contributor1, contributor2 } = await loadFixture(deployCollateralContributor);

      // First deposit
      await contract.depositFor(miner1.address, contributor1.address, 100);
      expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(100);
      expect(await contract.minerTotalCollateral(miner1.address)).to.equal(100);
      expect(await contract.totalCollateral()).to.equal(100);

      // Second deposit for same miner by different sponsor
      await contract.depositFor(miner1.address, contributor2.address, 200);
      expect(await contract.contributorBalance(miner1.address, contributor2.address)).to.equal(200);
      expect(await contract.minerTotalCollateral(miner1.address)).to.equal(300);
      expect(await contract.totalCollateral()).to.equal(300);

      // Deposit for different miner
      await contract.depositFor(miner2.address, contributor1.address, 150);
      expect(await contract.contributorBalance(miner2.address, contributor1.address)).to.equal(150);
      expect(await contract.minerTotalCollateral(miner2.address)).to.equal(150);
      expect(await contract.totalCollateral()).to.equal(450);

      // Additional deposit for same miner-sponsor pair
      await contract.depositFor(miner1.address, contributor1.address, 50);
      expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(150);
      expect(await contract.minerTotalCollateral(miner1.address)).to.equal(350);
      expect(await contract.totalCollateral()).to.equal(500);
    });
  });

  describe("Withdraw", function () {
    it("Should fail with unauthorized account", async function () {
      const { contract, miner1, contributor1 } = await loadFixture(deployCollateralContributor);

      await expect(contract.connect(contributor1).withdrawFor(miner1.address, contributor1.address, 100))
        .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
        .withArgs(contributor1.address);
    });

    it("Should fail with invalid address", async function () {
      const { contract, contributor1 } = await loadFixture(deployCollateralContributor);

      await expect(contract.withdrawFor(ethers.ZeroAddress, contributor1.address, 100))
        .to.be.revertedWithCustomError(contract, "InvalidAddress");

      await expect(contract.withdrawFor(contributor1.address, ethers.ZeroAddress, 100))
        .to.be.revertedWithCustomError(contract, "InvalidAddress");
    });

    it("Should fail with invalid amount", async function () {
      const { contract, miner1, contributor1 } = await loadFixture(deployCollateralContributor);

      await expect(contract.withdrawFor(miner1.address, contributor1.address, 0))
        .to.be.revertedWithCustomError(contract, "InvalidAmount");
    });

    it("Should fail with insufficient balance", async function () {
      const { contract, miner1, contributor1 } = await loadFixture(deployCollateralContributor);

      await expect(contract.withdrawFor(miner1.address, contributor1.address, 100))
        .to.be.revertedWithCustomError(contract, "InsufficientBalance");
    });

    it("Should work", async function () {
      const { contract, owner, miner1, miner2, contributor1, contributor2 } = await loadFixture(deployCollateralContributor);

      // Setup initial deposits
      await contract.depositFor(miner1.address, contributor1.address, 200);
      await contract.depositFor(miner1.address, contributor2.address, 200);
      await contract.depositFor(miner2.address, contributor1.address, 150);

      // Withdraw from contributor1 for miner1
      await contract.withdrawFor(miner1.address, contributor1.address, 100);
      expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(100);
      expect(await contract.minerTotalCollateral(miner1.address)).to.equal(300);
      expect(await contract.totalCollateral()).to.equal(450);

      // Withdraw from contributor2 for miner1
      await contract.withdrawFor(miner1.address, contributor2.address, 50);
      expect(await contract.contributorBalance(miner1.address, contributor2.address)).to.equal(150);
      expect(await contract.minerTotalCollateral(miner1.address)).to.equal(250);
      expect(await contract.totalCollateral()).to.equal(400);

      // Withdraw from contributor1 for miner2
      await contract.withdrawFor(miner2.address, contributor1.address, 150);
      expect(await contract.contributorBalance(miner2.address, contributor1.address)).to.equal(0);
      expect(await contract.minerTotalCollateral(miner2.address)).to.equal(0);
      expect(await contract.totalCollateral()).to.equal(250);

      // Withdraw remaining from contributor1 for miner1
      await contract.withdrawFor(miner1.address, contributor1.address, 100);
      expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(0);
      expect(await contract.minerTotalCollateral(miner1.address)).to.equal(150);
      expect(await contract.totalCollateral()).to.equal(150);
    });
  });

  describe("Slash", function () {
    it("Should fail with unauthorized account", async function () {
      const { contract, miner1, contributor1 } = await loadFixture(deployCollateralContributor);

      await expect(contract.connect(contributor1).slashFromContributor(miner1.address, contributor1.address, 100))
        .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
        .withArgs(contributor1.address);
    });

    it("Should fail with invalid address", async function () {
      const { contract, contributor1 } = await loadFixture(deployCollateralContributor);

      await expect(contract.slashFromContributor(ethers.ZeroAddress, contributor1.address, 100))
        .to.be.revertedWithCustomError(contract, "InvalidAddress");

      await expect(contract.slashFromContributor(contributor1.address, ethers.ZeroAddress, 100))
        .to.be.revertedWithCustomError(contract, "InvalidAddress");
    });

    it("Should fail with invalid amount", async function () {
      const { contract, miner1, contributor1 } = await loadFixture(deployCollateralContributor);

      await expect(contract.slashFromContributor(miner1.address, contributor1.address, 0))
        .to.be.revertedWithCustomError(contract, "InvalidAmount");
    });

    it("Should fail with insufficient balance", async function () {
      const { contract, miner1, contributor1 } = await loadFixture(deployCollateralContributor);

      await expect(contract.slashFromContributor(miner1.address, contributor1.address, 100))
        .to.be.revertedWithCustomError(contract, "InsufficientBalance");
    });

    it("Should work", async function () {
      const { contract, owner, miner1, miner2, contributor1, contributor2 } = await loadFixture(deployCollateralContributor);

      // Setup initial deposits
      await contract.depositFor(miner1.address, contributor1.address, 200);
      await contract.depositFor(miner1.address, contributor2.address, 200);
      await contract.depositFor(miner2.address, contributor1.address, 150);

      // Initial state: miner1=400, miner2=150, total=550
      expect(await contract.totalCollateral()).to.equal(550);

      // Slash from contributor1 for miner1 (100)
      await contract.slashFromContributor(miner1.address, contributor1.address, 100);
      expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(100);
      expect(await contract.minerTotalCollateral(miner1.address)).to.equal(300);
      expect(await contract.minerSlashedCollateral(miner1.address)).to.equal(100);
      expect(await contract.slashedCollateral()).to.equal(100);
      expect(await contract.totalCollateral()).to.equal(450);

      // Slash from contributor2 for miner1 (50)
      await contract.slashFromContributor(miner1.address, contributor2.address, 50);
      expect(await contract.contributorBalance(miner1.address, contributor2.address)).to.equal(150);
      expect(await contract.minerTotalCollateral(miner1.address)).to.equal(250);
      expect(await contract.minerSlashedCollateral(miner1.address)).to.equal(150);
      expect(await contract.slashedCollateral()).to.equal(150);
      expect(await contract.totalCollateral()).to.equal(400);

      // Slash from contributor1 for miner2 (150)
      await contract.slashFromContributor(miner2.address, contributor1.address, 150);
      expect(await contract.contributorBalance(miner2.address, contributor1.address)).to.equal(0);
      expect(await contract.minerTotalCollateral(miner2.address)).to.equal(0);
      expect(await contract.minerSlashedCollateral(miner2.address)).to.equal(150);
      expect(await contract.slashedCollateral()).to.equal(300);
      expect(await contract.totalCollateral()).to.equal(250);

      // Slash remaining from contributor1 for miner1 (100)
      await contract.slashFromContributor(miner1.address, contributor1.address, 100);
      expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(0);
      expect(await contract.minerTotalCollateral(miner1.address)).to.equal(150);
      expect(await contract.minerSlashedCollateral(miner1.address)).to.equal(250);
      expect(await contract.slashedCollateral()).to.equal(400);
      expect(await contract.totalCollateral()).to.equal(150);
    });
  });

  describe("View Functions", function () {
    it("Should return correct balances", async function () {
      const { contract, miner1, contributor1, contributor2 } = await loadFixture(deployCollateralContributor);

      await contract.depositFor(miner1.address, contributor1.address, 100);
      await contract.depositFor(miner1.address, contributor2.address, 200);

      expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(100);
      expect(await contract.contributorBalance(miner1.address, contributor2.address)).to.equal(200);
      expect(await contract.minerTotalCollateral(miner1.address)).to.equal(300);
      expect(await contract.totalCollateral()).to.equal(300);
    });

    it("Should return zero for non-existent balances", async function () {
      const { contract, miner1, contributor1 } = await loadFixture(deployCollateralContributor);

      expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(0);
      expect(await contract.minerTotalCollateral(miner1.address)).to.equal(0);
      expect(await contract.minerSlashedCollateral(miner1.address)).to.equal(0);
    });
  });
});
