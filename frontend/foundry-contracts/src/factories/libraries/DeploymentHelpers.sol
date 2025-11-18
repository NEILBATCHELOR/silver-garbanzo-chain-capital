// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

/**
 * @title DeploymentHelpers
 * @notice Helper library for token deployment patterns
 * @dev Provides standardized deployment utilities for minimal proxies and beacon proxies
 * 
 * Features:
 * - ERC-1167 minimal proxy cloning
 * - CREATE2 deterministic deployment
 * - Beacon proxy deployment
 * - Address prediction utilities
 * 
 * Gas Savings:
 * - Minimal proxy: 95% cheaper than full deployment
 * - Deterministic addresses across all chains
 * - Reusable deployment patterns
 */
library DeploymentHelpers {
    using Clones for address;
    
    // ============ Errors ============
    
    error CloneFailed();
    error InitializationFailed();
    error AddressMismatch(address expected, address actual);
    error BeaconProxyFailed();
    
    // ============ Minimal Proxy Deployment ============
    
    /**
     * @notice Clone and initialize a master implementation
     * @param master Master implementation address
     * @param initData Initialization call data
     * @return clone Address of deployed clone
     * @dev Uses ERC-1167 minimal proxy pattern (55 bytes)
     */
    function cloneAndInitialize(
        address master,
        bytes memory initData
    ) internal returns (address clone) {
        // Deploy minimal proxy clone
        clone = master.clone();
        
        if (clone == address(0)) {
            revert CloneFailed();
        }
        
        // Initialize the clone
        if (initData.length > 0) {
            (bool success, ) = clone.call(initData);
            if (!success) {
                revert InitializationFailed();
            }
        }
        
        return clone;
    }
    
    /**
     * @notice Clone deterministically and initialize
     * @param master Master implementation address
     * @param salt Unique salt for CREATE2
     * @param initData Initialization call data
     * @return clone Address of deployed clone (deterministic)
     * @dev Same address on all EVM chains with same salt
     */
    function cloneDeterministicAndInitialize(
        address master,
        bytes32 salt,
        bytes memory initData
    ) internal returns (address clone) {
        // Predict address first
        address predicted = master.predictDeterministicAddress(salt);
        
        // Deploy deterministic clone
        clone = master.cloneDeterministic(salt);
        
        // Verify address matches prediction
        if (clone != predicted) {
            revert AddressMismatch(predicted, clone);
        }
        
        // Initialize the clone
        if (initData.length > 0) {
            (bool success, ) = clone.call(initData);
            if (!success) {
                revert InitializationFailed();
            }
        }
        
        return clone;
    }
    
    // ============ Beacon Proxy Deployment ============
    
    /**
     * @notice Deploy a beacon proxy
     * @param beacon Beacon address
     * @param initData Initialization call data
     * @return proxy Address of deployed beacon proxy
     * @dev Allows upgrades via beacon without touching individual proxies
     */
    function deployBeaconProxy(
        address beacon,
        bytes memory initData
    ) internal returns (address proxy) {
        try new BeaconProxy(beacon, initData) returns (BeaconProxy bp) {
            proxy = address(bp);
        } catch {
            revert BeaconProxyFailed();
        }
        
        return proxy;
    }
    
    /**
     * @notice Deploy beacon proxy deterministically
     * @param beacon Beacon address
     * @param salt Unique salt for CREATE2
     * @param initData Initialization call data
     * @return proxy Address of deployed beacon proxy
     * @dev Uses CREATE2 for deterministic cross-chain addresses
     */
    function deployBeaconProxyDeterministic(
        address beacon,
        bytes32 salt,
        bytes memory initData
    ) internal returns (address proxy) {
        try new BeaconProxy{salt: salt}(beacon, initData) returns (BeaconProxy bp) {
            proxy = address(bp);
        } catch {
            revert BeaconProxyFailed();
        }
        
        return proxy;
    }
    
    // ============ Address Prediction ============
    
    /**
     * @notice Predict deterministic clone address
     * @param master Master implementation address
     * @param salt Unique salt for CREATE2
     * @param deployer Deployer address (usually factory address)
     * @return predicted Predicted deployment address
     */
    function predictCloneAddress(
        address master,
        bytes32 salt,
        address deployer
    ) internal pure returns (address predicted) {
        return Clones.predictDeterministicAddress(master, salt, deployer);
    }
    
    /**
     * @notice Predict beacon proxy address
     * @param beacon Beacon address
     * @param salt Unique salt for CREATE2
     * @param initData Initialization data
     * @param deployer Deployer address
     * @return predicted Predicted deployment address
     */
    function predictBeaconProxyAddress(
        address beacon,
        bytes32 salt,
        bytes memory initData,
        address deployer
    ) internal pure returns (address predicted) {
        bytes memory bytecode = abi.encodePacked(
            type(BeaconProxy).creationCode,
            abi.encode(beacon, initData)
        );
        
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                deployer,
                salt,
                keccak256(bytecode)
            )
        );
        
        return address(uint160(uint256(hash)));
    }
    
    // ============ Utility Functions ============
    
    /**
     * @notice Check if an address contains contract code
     * @param account Address to check
     * @return bool True if address has contract code
     */
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }
    
    /**
     * @notice Verify a contract is deployed at expected address
     * @param expected Expected address
     * @param actual Actual address
     * @dev Reverts if addresses don't match
     */
    function verifyDeployment(address expected, address actual) internal pure {
        if (expected != actual) {
            revert AddressMismatch(expected, actual);
        }
    }
    
    /**
     * @notice Create initialization call data
     * @param selector Function selector
     * @param args Encoded arguments
     * @return bytes Complete call data
     */
    function createInitData(
        bytes4 selector,
        bytes memory args
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(selector, args);
    }
    
    /**
     * @notice Batch clone multiple instances
     * @param master Master implementation address
     * @param count Number of clones to create
     * @return clones Array of deployed clone addresses
     * @dev Useful for batch token deployment
     */
    function batchClone(
        address master,
        uint256 count
    ) internal returns (address[] memory clones) {
        clones = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            clones[i] = master.clone();
            if (clones[i] == address(0)) {
                revert CloneFailed();
            }
        }
        
        return clones;
    }
}
