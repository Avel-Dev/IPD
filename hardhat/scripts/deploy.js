const { ethers } = require("hardhat");

async function main() {
  const EnergyTrading = await ethers.getContractFactory("EnergyTrading");
  const energyTrading = await EnergyTrading.deploy();
  await energyTrading.waitForDeployment();

  console.log("EnergyTrading deployed to:", await energyTrading.getAddress());
  
  // Optional: Deploy SimpleStorage if it's still needed, 
  // but we'll focus on EnergyTrading for this feature.
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

