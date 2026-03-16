// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EnergyTrading {
    // Central battery for energy diversion
    uint256 public centralBatteryLevel;

    // Mapping from house ID to owner address
    mapping(string => address) private houseOwners;

    // Event emitted when surplus energy is recorded
    event SurplusRecorded(string indexed houseId, address indexed owner, uint256 amount);

    // Event emitted when a house is registered
    event HouseRegistered(string indexed houseId, address indexed owner);

    // Event emitted when energy is diverted to central battery
    event EnergyDiverted(address indexed user, uint256 amount);

    /**
     * @notice Register a house and map it to the caller's wallet address
     * @param houseId The unique identifier for the house
     */
    function registerHouse(string calldata houseId) external {
        require(bytes(houseId).length > 0, "House ID cannot be empty");
        require(houseOwners[houseId] == address(0), "House already registered");

        houseOwners[houseId] = msg.sender;
        emit HouseRegistered(houseId, msg.sender);
    }

    /**
     * @notice Record surplus energy for a house
     * @param houseId The unique identifier for the house
     * @param amount The amount of surplus energy in wei
     */
    function recordSurplus(string calldata houseId, uint256 amount) external {
        require(bytes(houseId).length > 0, "House ID cannot be empty");
        require(houseOwners[houseId] != address(0), "House not registered");
        require(houseOwners[houseId] == msg.sender, "Not the house owner");
        require(amount > 0, "Amount must be greater than zero");

        emit SurplusRecorded(houseId, msg.sender, amount);
    }

    /**
     * @notice Divert energy to the central battery
     * @param user The user address
     * @param amount The amount to divert
     */
    function divertEnergy(address user, uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        centralBatteryLevel += amount;
        emit EnergyDiverted(user, amount);
    }

    /**
     * @notice Get the owner of a house
     * @param houseId The unique identifier for the house
     * @return The owner address of the house
     */
    function getOwner(string calldata houseId) external view returns (address) {
        return houseOwners[houseId];
    }

    /**
     * @notice Check if a house is registered
     * @param houseId The unique identifier for the house
     * @return True if the house is registered, false otherwise
     */
    function isRegistered(string calldata houseId) external view returns (bool) {
        return houseOwners[houseId] != address(0);
    }
}