// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

/**
 * @title TokenBeacon
 * @notice Centralized upgrade beacon for token proxies
 * @dev Implements EIP-1967 beacon pattern for efficient batch upgrades
 * 
 * Key Features:
 * - Single point of upgrade for all associated proxies
 * - Gas-efficient: 1 transaction upgrades all tokens
 * - Security: Owner-controlled upgrades with optional timelock
 * - Transparency: All upgrades logged on-chain
 * 
 * Gas Savings Example:
 * - Upgrading 100 tokens individually: 100 × 50,000 = 5,000,000 gas
 * - Upgrading via beacon: 1 × 50,000 = 50,000 gas
 * - Savings: 99% reduction (4,950,000 gas saved)
 */
contract TokenBeacon is UpgradeableBeacon {
    // Events
    event BeaconUpgraded(
        address indexed oldImplementation,
        address indexed newImplementation,
        address indexed upgrader,
        uint256 timestamp
    );

    /**
     * @notice Deploy a new beacon with initial implementation
     * @param implementation_ Address of the master implementation contract
     * @param owner_ Address that will own the beacon (can upgrade)
     */
    constructor(address implementation_, address owner_) 
        UpgradeableBeacon(implementation_, owner_)
    {
        require(implementation_ != address(0), "TokenBeacon: zero address");
        require(owner_ != address(0), "TokenBeacon: zero owner");
    }

    /**
     * @notice Upgrade the beacon to a new implementation
     * @dev Overrides UpgradeableBeacon.upgradeTo to add logging
     * @param newImplementation Address of the new master implementation
     */
    function upgradeTo(address newImplementation) public override onlyOwner {
        address oldImplementation = implementation();
        
        super.upgradeTo(newImplementation);
        
        emit BeaconUpgraded(
            oldImplementation,
            newImplementation,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Get current implementation address
     * @return Address of the current master implementation
     */
    function getImplementation() external view returns (address) {
        return implementation();
    }
}
