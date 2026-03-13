// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    uint256 private _value;

    event ValueChanged(uint256 newValue);

    function set(uint256 newValue) external {
        _value = newValue;
        emit ValueChanged(newValue);
    }

    function get() external view returns (uint256) {
        return _value;
    }
}

