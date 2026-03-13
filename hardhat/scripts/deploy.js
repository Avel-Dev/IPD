const { ethers } = require("hardhat");

async function main() {
  const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
  const simpleStorage = await SimpleStorage.deploy();
  await simpleStorage.waitForDeployment();

  console.log("SimpleStorage deployed to:", await simpleStorage.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

