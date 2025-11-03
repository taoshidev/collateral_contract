import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // 1. 기존 V1 배포
  const CollateralV1 = await ethers.getContractFactory("Collateral_V1", deployer);
  const proxy = await upgrades.deployProxy(CollateralV1, [deployer.address], {
    initializer: "initialize",
    kind: "uups",
  });
  await proxy.waitForDeployment();

  console.log("✅ Deployed Collateral V1 Proxy:", await proxy.getAddress());

  // 2. 상태 세팅
  await proxy.deposit(deployer.address, 100n);
  console.log("Before upgrade: total =", (await proxy.getTotalCollateral()).toString());

  // 3. 새 구현 업그레이드 시뮬레이션 (같은 컨트랙트를 V2로 가정)
  const CollateralV2 = await ethers.getContractFactory("Collateral", deployer);
  const upgraded = await upgrades.upgradeProxy(await proxy.getAddress(), CollateralV2, { kind: "uups" });
  console.log("✅ Proxy upgraded to new implementation");

  // 4. 업그레이드 후 상태 유지 확인
  const totalAfter = await upgraded.getTotalCollateral();
  console.log("After upgrade: total =", totalAfter.toString());

  if (totalAfter === 100n) {
    console.log("✅ State preserved successfully");
  } else {
    console.error("❌ State mismatch!");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});