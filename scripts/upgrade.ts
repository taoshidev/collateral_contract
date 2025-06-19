import { ethers, upgrades } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();

  const Contract = await ethers.getContractFactory("Collateral");
  const proxy = await upgrades.upgradeProxy(process.env.PROXY_ADDRESS || "", Contract);
  await proxy.waitForDeployment();

  console.log("Contract upgraded at: ", await proxy.getAddress());
}

main();
