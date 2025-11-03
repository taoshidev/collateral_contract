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

  // ======================= Delegated (Contributor) path tests =======================
  async function deployCollateralForDelegated() {
    const [owner, miner1, miner2, contributor1, contributor2] = await ethers.getSigners();

    // @ts-ignore
    const Contract = await ethers.getContractFactory("Collateral", owner);
    const proxy = (await upgrades.deployProxy(Contract, [owner.address], {
      initializer: "initialize",
    })) as Collateral;

    return { contract: proxy, owner, miner1, miner2, contributor1, contributor2 };
  }

  describe("Delegated Collateral", function () {
    describe("Deployment", function () {
      it("Should set the right owner", async function () {
        const { contract, owner } = await loadFixture(deployCollateralForDelegated);

        expect(await contract.owner()).to.equal(owner.address);
      });
    });

    describe("DepositFor (delegated)", function () {
      it("Should fail with unauthorized account", async function () {
        const { contract, miner1, contributor1 } = await loadFixture(deployCollateralForDelegated);

        await expect(contract.connect(contributor1).depositFor(miner1.address, contributor1.address, 100))
          .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
          .withArgs(contributor1.address);
      });

      it("Should fail with invalid address", async function () {
        const { contract, contributor1 } = await loadFixture(deployCollateralForDelegated);

        await expect(contract.depositFor(ethers.ZeroAddress, contributor1.address, 100))
          .to.be.revertedWithCustomError(contract, "InvalidAddress");

        await expect(contract.depositFor(contributor1.address, ethers.ZeroAddress, 100))
          .to.be.revertedWithCustomError(contract, "InvalidAddress");
      });

      it("Should fail with invalid amount", async function () {
        const { contract, miner1, contributor1 } = await loadFixture(deployCollateralForDelegated);

        await expect(contract.depositFor(miner1.address, contributor1.address, 0))
          .to.be.revertedWithCustomError(contract, "InvalidAmount");
      });

      it("Should work", async function () {
        const { contract, miner1, miner2, contributor1, contributor2 } = await loadFixture(deployCollateralForDelegated);

        // First deposit
        await contract.depositFor(miner1.address, contributor1.address, 100);
        expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(100);
        expect(await contract.minerTotalCollateral(miner1.address)).to.equal(100);
        expect(await contract.totalDelegatedCollateral()).to.equal(100);

        // Second deposit for same miner by different contributor
        await contract.depositFor(miner1.address, contributor2.address, 200);
        expect(await contract.contributorBalance(miner1.address, contributor2.address)).to.equal(200);
        expect(await contract.minerTotalCollateral(miner1.address)).to.equal(300);
        expect(await contract.totalDelegatedCollateral()).to.equal(300);

        // Deposit for different miner
        await contract.depositFor(miner2.address, contributor1.address, 150);
        expect(await contract.contributorBalance(miner2.address, contributor1.address)).to.equal(150);
        expect(await contract.minerTotalCollateral(miner2.address)).to.equal(150);
        expect(await contract.totalDelegatedCollateral()).to.equal(450);

        // Additional deposit for same miner-contributor pair
        await contract.depositFor(miner1.address, contributor1.address, 50);
        expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(150);
        expect(await contract.minerTotalCollateral(miner1.address)).to.equal(350);
        expect(await contract.totalDelegatedCollateral()).to.equal(500);
      });
    });

    describe("WithdrawFor (delegated)", function () {
      it("Should fail with unauthorized account", async function () {
        const { contract, miner1, contributor1 } = await loadFixture(deployCollateralForDelegated);

        await expect(contract.connect(contributor1).withdrawFor(miner1.address, contributor1.address, 100))
          .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
          .withArgs(contributor1.address);
      });

      it("Should fail with invalid address", async function () {
        const { contract, contributor1 } = await loadFixture(deployCollateralForDelegated);

        await expect(contract.withdrawFor(ethers.ZeroAddress, contributor1.address, 100))
          .to.be.revertedWithCustomError(contract, "InvalidAddress");

        await expect(contract.withdrawFor(contributor1.address, ethers.ZeroAddress, 100))
          .to.be.revertedWithCustomError(contract, "InvalidAddress");
      });

      it("Should fail with invalid amount", async function () {
        const { contract, miner1, contributor1 } = await loadFixture(deployCollateralForDelegated);

        await expect(contract.withdrawFor(miner1.address, contributor1.address, 0))
          .to.be.revertedWithCustomError(contract, "InvalidAmount");
      });

      it("Should fail with insufficient balance", async function () {
        const { contract, miner1, contributor1 } = await loadFixture(deployCollateralForDelegated);

        await expect(contract.withdrawFor(miner1.address, contributor1.address, 100))
          .to.be.revertedWithCustomError(contract, "InsufficientBalance");
      });

      it("Should work", async function () {
        const { contract, miner1, miner2, contributor1, contributor2 } = await loadFixture(deployCollateralForDelegated);

        // Setup initial deposits
        await contract.depositFor(miner1.address, contributor1.address, 200);
        await contract.depositFor(miner1.address, contributor2.address, 200);
        await contract.depositFor(miner2.address, contributor1.address, 150);

        // Withdraw from contributor1 for miner1
        await contract.withdrawFor(miner1.address, contributor1.address, 100);
        expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(100);
        expect(await contract.minerTotalCollateral(miner1.address)).to.equal(300);
        expect(await contract.totalDelegatedCollateral()).to.equal(450);

        // Withdraw from contributor2 for miner1
        await contract.withdrawFor(miner1.address, contributor2.address, 50);
        expect(await contract.contributorBalance(miner1.address, contributor2.address)).to.equal(150);
        expect(await contract.minerTotalCollateral(miner1.address)).to.equal(250);
        expect(await contract.totalDelegatedCollateral()).to.equal(400);

        // Withdraw from contributor1 for miner2
        await contract.withdrawFor(miner2.address, contributor1.address, 150);
        expect(await contract.contributorBalance(miner2.address, contributor1.address)).to.equal(0);
        expect(await contract.minerTotalCollateral(miner2.address)).to.equal(0);
        expect(await contract.totalDelegatedCollateral()).to.equal(250);

        // Withdraw remaining from contributor1 for miner1
        await contract.withdrawFor(miner1.address, contributor1.address, 100);
        expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(0);
        expect(await contract.minerTotalCollateral(miner1.address)).to.equal(150);
        expect(await contract.totalDelegatedCollateral()).to.equal(150);
      });
    });

    describe("SlashFromContributor (delegated)", function () {
      it("Should fail with unauthorized account", async function () {
        const { contract, miner1, contributor1 } = await loadFixture(deployCollateralForDelegated);

        await expect(contract.connect(contributor1).slashFromContributor(miner1.address, contributor1.address, 100))
          .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
          .withArgs(contributor1.address);
      });

      it("Should fail with invalid address", async function () {
        const { contract, contributor1 } = await loadFixture(deployCollateralForDelegated);

        await expect(contract.slashFromContributor(ethers.ZeroAddress, contributor1.address, 100))
          .to.be.revertedWithCustomError(contract, "InvalidAddress");

        await expect(contract.slashFromContributor(contributor1.address, ethers.ZeroAddress, 100))
          .to.be.revertedWithCustomError(contract, "InvalidAddress");
      });

      it("Should fail with invalid amount", async function () {
        const { contract, miner1, contributor1 } = await loadFixture(deployCollateralForDelegated);

        await expect(contract.slashFromContributor(miner1.address, contributor1.address, 0))
          .to.be.revertedWithCustomError(contract, "InvalidAmount");
      });

      it("Should fail with insufficient balance", async function () {
        const { contract, miner1, contributor1 } = await loadFixture(deployCollateralForDelegated);

        await expect(contract.slashFromContributor(miner1.address, contributor1.address, 100))
          .to.be.revertedWithCustomError(contract, "InsufficientBalance");
      });

      it("Should work", async function () {
        const { contract, miner1, miner2, contributor1, contributor2 } = await loadFixture(deployCollateralForDelegated);

        // Setup initial deposits
        await contract.depositFor(miner1.address, contributor1.address, 200);
        await contract.depositFor(miner1.address, contributor2.address, 200);
        await contract.depositFor(miner2.address, contributor1.address, 150);

        // Initial state: miner1=400, miner2=150, totalDelegated=550
        expect(await contract.totalDelegatedCollateral()).to.equal(550);

        // Slash from contributor1 for miner1 (100)
        await contract.slashFromContributor(miner1.address, contributor1.address, 100);
        expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(100);
        expect(await contract.minerTotalCollateral(miner1.address)).to.equal(300);
        expect(await contract.minerSlashedCollateral(miner1.address)).to.equal(100);
        expect(await contract.totalDelegatedSlashedCollateral()).to.equal(100);
        expect(await contract.totalDelegatedCollateral()).to.equal(450);

        // Slash from contributor2 for miner1 (50)
        await contract.slashFromContributor(miner1.address, contributor2.address, 50);
        expect(await contract.contributorBalance(miner1.address, contributor2.address)).to.equal(150);
        expect(await contract.minerTotalCollateral(miner1.address)).to.equal(250);
        expect(await contract.minerSlashedCollateral(miner1.address)).to.equal(150);
        expect(await contract.totalDelegatedSlashedCollateral()).to.equal(150);
        expect(await contract.totalDelegatedCollateral()).to.equal(400);

        // Slash from contributor1 for miner2 (150)
        await contract.slashFromContributor(miner2.address, contributor1.address, 150);
        expect(await contract.contributorBalance(miner2.address, contributor1.address)).to.equal(0);
        expect(await contract.minerTotalCollateral(miner2.address)).to.equal(0);
        expect(await contract.minerSlashedCollateral(miner2.address)).to.equal(150);
        expect(await contract.totalDelegatedSlashedCollateral()).to.equal(300);
        expect(await contract.totalDelegatedCollateral()).to.equal(250);

        // Slash remaining from contributor1 for miner1 (100)
        await contract.slashFromContributor(miner1.address, contributor1.address, 100);
        expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(0);
        expect(await contract.minerTotalCollateral(miner1.address)).to.equal(150);
        expect(await contract.minerSlashedCollateral(miner1.address)).to.equal(250);
        expect(await contract.totalDelegatedSlashedCollateral()).to.equal(400);
        expect(await contract.totalDelegatedCollateral()).to.equal(150);
      });
    });

    describe("View Functions (delegated)", function () {
      it("Should return correct balances", async function () {
        const { contract, miner1, contributor1, contributor2 } = await loadFixture(deployCollateralForDelegated);

        await contract.depositFor(miner1.address, contributor1.address, 100);
        await contract.depositFor(miner1.address, contributor2.address, 200);

        expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(100);
        expect(await contract.contributorBalance(miner1.address, contributor2.address)).to.equal(200);
        expect(await contract.minerTotalCollateral(miner1.address)).to.equal(300);
        expect(await contract.totalDelegatedCollateral()).to.equal(300);
      });

      it("Should return zero for non-existent balances", async function () {
        const { contract, miner1, contributor1 } = await loadFixture(deployCollateralForDelegated);

        expect(await contract.contributorBalance(miner1.address, contributor1.address)).to.equal(0);
        expect(await contract.minerTotalCollateral(miner1.address)).to.equal(0);
        expect(await contract.minerSlashedCollateral(miner1.address)).to.equal(0);
      });
    });

    describe("Aggregate View Functions", function () {
      async function deployCollateralWithMixedDeposits() {
        const [owner, user1, miner1, contributor1] = await ethers.getSigners();

        // @ts-ignore
        const Contract = await ethers.getContractFactory("Collateral", owner);
        const proxy = (await upgrades.deployProxy(Contract, [owner.address], {
          initializer: "initialize",
        })) as Collateral;

        return { contract: proxy, owner, user1, miner1, contributor1 };
      }

      it("Should return combined totals for direct and delegated collateral", async function () {
        const { contract, owner, user1, miner1, contributor1 } = await loadFixture(deployCollateralWithMixedDeposits);

        // Deposit direct collateral
        await contract.deposit(user1.address, 200);
        expect(await contract.getTotalCollateral()).to.equal(200);
        expect(await contract.totalDelegatedCollateral()).to.equal(0);
        expect(await contract.totalAllCollateral()).to.equal(200);

        // Deposit delegated collateral
        await contract.depositFor(miner1.address, contributor1.address, 100);
        expect(await contract.getTotalCollateral()).to.equal(200);
        expect(await contract.totalDelegatedCollateral()).to.equal(100);
        expect(await contract.totalAllCollateral()).to.equal(300);

        // Add more of both
        await contract.deposit(user1.address, 50);
        await contract.depositFor(miner1.address, contributor1.address, 150);
        expect(await contract.getTotalCollateral()).to.equal(250);
        expect(await contract.totalDelegatedCollateral()).to.equal(250);
        expect(await contract.totalAllCollateral()).to.equal(500);
      });

      it("Should return combined slashed totals", async function () {
        const { contract, owner, user1, miner1, contributor1 } = await loadFixture(deployCollateralWithMixedDeposits);

        // Setup deposits
        await contract.deposit(user1.address, 200);
        await contract.depositFor(miner1.address, contributor1.address, 200);

        // Slash from direct collateral
        await contract.slash(user1.address, 50);
        expect(await contract.getSlashedCollateral()).to.equal(50);
        expect(await contract.totalDelegatedSlashedCollateral()).to.equal(0);
        expect(await contract.totalAllSlashed()).to.equal(50);

        // Slash from delegated collateral
        await contract.slashFromContributor(miner1.address, contributor1.address, 100);
        expect(await contract.getSlashedCollateral()).to.equal(50);
        expect(await contract.totalDelegatedSlashedCollateral()).to.equal(100);
        expect(await contract.totalAllSlashed()).to.equal(150);

        // More slashing
        await contract.slash(user1.address, 100);
        await contract.slashFromContributor(miner1.address, contributor1.address, 50);
        expect(await contract.getSlashedCollateral()).to.equal(150);
        expect(await contract.totalDelegatedSlashedCollateral()).to.equal(150);
        expect(await contract.totalAllSlashed()).to.equal(300);
      });
    });
  });
});
