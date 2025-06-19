import { ethers, upgrades } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();

  const Contract = await ethers.getContractFactory("Collateral");
  const proxy = await upgrades.deployProxy(Contract, [owner.address], { initializer: "initialize" });
  await proxy.waitForDeployment();

  console.log("Contract deployed at: ", await proxy.getAddress());
}

main();
