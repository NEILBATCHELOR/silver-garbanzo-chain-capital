// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PayableTokenStorage
 * @notice Storage layout for ERC-1363 Payable Token Module
 * @dev Uses ERC-7201 namespaced storage to prevent collisions
 */
abstract contract PayableTokenStorage {
    /// @custom:storage-location erc7201:chaincapital.storage.PayableToken
    struct PayableTokenStorageLayout {
        // Token contract this module is attached to
        address tokenContract;
        
        // Whether the module is enabled
        bool enabled;
        
        // Gas limit for callback executions (prevents griefing)
        uint256 callbackGasLimit;
        
        // Whitelist mode: only whitelisted receivers/spenders can be called
        bool whitelistEnabled;
        
        // Whitelisted receiver contracts
        mapping(address => bool) whitelistedReceivers;
        
        // Whitelisted spender contracts
        mapping(address => bool) whitelistedSpenders;
    }
    
    // keccak256(abi.encode(uint256(keccak256("chaincapital.storage.PayableToken")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant PayableTokenStorageLocation = 
        0x8d2c9a8e6b5a8f8e9c8b8a8e8f8e8d8c8b8a8e8f8e8d8c8b8a8e8f8e8d8c8b00;
    
    function _getPayableTokenStorage() internal pure returns (PayableTokenStorageLayout storage $) {
        assembly {
            $.slot := PayableTokenStorageLocation
        }
    }
    
    // Storage getters
    function _tokenContract() internal view returns (address) {
        return _getPayableTokenStorage().tokenContract;
    }
    
    function _enabled() internal view returns (bool) {
        return _getPayableTokenStorage().enabled;
    }
    
    function _callbackGasLimit() internal view returns (uint256) {
        return _getPayableTokenStorage().callbackGasLimit;
    }
    
    function _whitelistEnabled() internal view returns (bool) {
        return _getPayableTokenStorage().whitelistEnabled;
    }
}
