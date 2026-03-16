const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const EnergyTrading = await ethers.getContractFactory("EnergyTrading");
  const energyTrading = await EnergyTrading.deploy();
  await energyTrading.waitForDeployment();

  const contractAddress = await energyTrading.getAddress();
  console.log("EnergyTrading deployed to:", contractAddress);

  // Save deployed address for backend integration
  const deploymentPath = path.join(__dirname, "..", "deployments", "EnergyTrading.json");
  const deploymentDir = path.dirname(deploymentPath);

  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify({ address: contractAddress }, null, 2));
  console.log("Deployment info saved to:", deploymentPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

