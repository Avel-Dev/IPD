# Blockchain Implementation

This document describes how blockchain is currently integrated into the energy telemetry system.

## Overview

The project uses **Ethereum** via **Hardhat** as a local development blockchain. It provides decentralized ownership verification for houses and energy surplus recording.

## Network Configuration

| Property | Value |
|----------|-------|
| Network | Hardhat Local |
| Chain ID | 31337 (0x7a69) |
| RPC URL | http://127.0.0.1:8545 |
| Currency | ETH |

## Smart Contract

### EnergyTrading.sol

Location: `hardhat/contracts/EnergyTrading.sol`

The main smart contract provides:

- **House Registration**: Maps house IDs to wallet addresses
- **Surplus Energy Recording**: Logs surplus energy production on-chain
- **Energy Diversion**: Tracks energy diverted to a central battery
- **Owner Verification**: Validates that only registered house owners can record surplus

#### Key Functions

```solidity
// Register a house to the caller's wallet
function registerHouse(string calldata houseId) external

// Record surplus energy (only by house owner)
function recordSurplus(string calldata houseId, uint256 amount) external

// Divert energy to central battery
function divertEnergy(address user, uint256 amount) external

// View functions
function getOwner(string calldata houseId) external view returns (address)
function isRegistered(string calldata houseId) external view returns (bool)
```

#### Events

- `HouseRegistered(string indexed houseId, address indexed owner)` - Emitted on house registration
- `SurplusRecorded(string indexed houseId, address indexed owner, uint256 amount)` - Emitted on surplus recording
- `EnergyDiverted(address indexed user, uint256 amount)` - Emitted on energy diversion

## Deployment

### Commands

```bash
# Terminal 1: Start Hardhat node
cd hardhat && npm run node

# Terminal 2: Deploy contract
cd hardhat && npm run deploy
```

The deployment script (`hardhat/scripts/deploy.js`) saves the contract address to `hardhat/deployments/EnergyTrading.json`.

## Frontend Integration

The frontend communicates with the blockchain via **ethers.js**. Key configuration is in `frontend/src/lib/eth.js`:

- Network chain ID: 31337 (Hardhat)
- MetaMask wallet connection required for blockchain writes
- Read operations use read-only calls to the contract

## Current Usage Status

The blockchain integration is currently **minimal**:

1. **Contract is deployed** but not actively used by the frontend
2. **MetaMask wallet connection** is required for the app but blockchain writes are not implemented
3. **Database (Supabase)** handles the primary data flow for energy readings

The smart contract provides a foundation for decentralized ownership but the frontend currently relies on the backend API for all data operations.

## Future Enhancements

Potential improvements to increase blockchain usage:

1. **On-chain energy records**: Store energy readings directly in the smart contract
2. **Tokenized energy**: Create ERC-20 tokens representing surplus energy
3. **Automated trading**: Smart contract for P2P energy trading between houses
4. **Proof of energy**: Use events as proof of energy production for verification