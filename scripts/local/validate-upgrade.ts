import { ethers, upgrades } from "hardhat";

async function main() {
  // 1. 먼저 V1 배포
  const [deployer] = await ethers.getSigners();
  const CollateralV1 = await ethers.getContractFactory("Collateral_V1", deployer);
  const proxy = await upgrades.deployProxy(CollateralV1, [deployer.address], {
    initializer: "initialize",
    kind: "uups",
  });
  await proxy.waitForDeployment();

  console.log("✅ Deployed Collateral V1 Proxy at:", await proxy.getAddress());

  const CollateralV2 = await ethers.getContractFactory("Collateral", deployer);
  await upgrades.validateUpgrade(await proxy.getAddress(), CollateralV2, { kind: "uups" });

  console.log("✅ Storage layout validation passed (local)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});