// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EnergyTrading {
    uint256 public centralBatteryLevel;

    event EnergyDiverted(address indexed user, uint256 amount);

    function divertEnergy(address user, uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        centralBatteryLevel += amount;
        emit EnergyDiverted(user, amount);
    }
}
