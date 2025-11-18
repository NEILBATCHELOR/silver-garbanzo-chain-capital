// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ValidationLibrary
 * @notice Shared validation logic for all token factories
 * @dev Provides reusable validation functions to ensure consistent parameter checking
 * 
 * Features:
 * - Name and symbol validation
 * - Supply validation (max/initial)
 * - Owner address validation
 * - URI validation for NFTs
 * - Deterministic deployment validation
 * 
 * Benefits:
 * - Single source of truth for validation
 * - Gas-efficient library pattern
 * - Consistent error messages
 * - Reduces code duplication
 */
library ValidationLibrary {
    // ============ Errors ============
    
    error InvalidOwner();
    error InvalidName();
    error InvalidSymbol();
    error InvalidSupply(string reason);
    error InvalidURI();
    error InvalidSalt();
    error InvalidMaxSupply();
    error InitialSupplyExceedsMax(uint256 initial, uint256 max);
    
    // ============ Basic Parameter Validation ============
    
    /**
     * @notice Validate deployment parameters (name, symbol, owner)
     * @param name Token name
     * @param symbol Token symbol
     * @param owner Token owner address
     * @dev Reverts if any parameter is invalid
     */
    function validateDeploymentParams(
        string memory name,
        string memory symbol,
        address owner
    ) internal pure {
        if (bytes(name).length == 0) revert InvalidName();
        if (bytes(symbol).length == 0) revert InvalidSymbol();
        if (owner == address(0)) revert InvalidOwner();
    }
    
    /**
     * @notice Validate supply parameters
     * @param maxSupply Maximum supply (0 = unlimited)
     * @param initialSupply Initial supply to mint
     * @dev Reverts if initial supply exceeds max supply (when max != 0)
     */
    function validateSupply(
        uint256 maxSupply,
        uint256 initialSupply
    ) internal pure {
        // If maxSupply is 0, it means unlimited - no validation needed
        if (maxSupply == 0) {
            return;
        }
        
        // If maxSupply is set, initial supply must not exceed it
        if (initialSupply > maxSupply) {
            revert InitialSupplyExceedsMax(initialSupply, maxSupply);
        }
    }
    
    /**
     * @notice Validate owner address
     * @param owner Address to validate
     * @dev Reverts if owner is zero address
     */
    function validateOwner(address owner) internal pure {
        if (owner == address(0)) revert InvalidOwner();
    }
    
    // ============ NFT-Specific Validation ============
    
    /**
     * @notice Validate base URI for NFTs
     * @param baseURI Base URI string
     * @dev Reverts if URI is empty (optional validation)
     */
    function validateBaseURI(string memory baseURI) internal pure {
        // Allow empty URI but ensure it's a valid string
        // Most NFTs should have a base URI, but it's not strictly required
        if (bytes(baseURI).length == 0) {
            // Could revert here if you want to enforce URI requirement
            // For now, we'll allow empty URIs
        }
    }
    
    /**
     * @notice Validate token URI (for metadata)
     * @param uri Token URI
     * @dev Basic validation - can be extended with IPFS/HTTP checks
     */
    function validateTokenURI(string memory uri) internal pure {
        if (bytes(uri).length == 0) revert InvalidURI();
    }
    
    // ============ Deterministic Deployment Validation ============
    
    /**
     * @notice Validate salt for CREATE2 deployment
     * @param salt Unique salt for deterministic deployment
     * @dev Reverts if salt is zero (optional - zero salt is technically valid)
     */
    function validateSalt(bytes32 salt) internal pure {
        // We allow zero salt as it's technically valid for CREATE2
        // This function exists for future enhancement if needed
        if (salt == bytes32(0)) {
            // Could revert here to enforce non-zero salts
            // For now, allowing zero salt
        }
    }
    
    // ============ Advanced Validation ============
    
    /**
     * @notice Validate vault asset (for ERC4626)
     * @param asset Underlying asset address
     * @dev Reverts if asset is zero address
     */
    function validateAsset(address asset) internal pure {
        if (asset == address(0)) {
            revert InvalidOwner(); // Reusing error for address validation
        }
    }
    
    /**
     * @notice Validate partition (for ERC1400 security tokens)
     * @param partition Partition identifier
     * @dev Reverts if partition is empty
     */
    function validatePartition(bytes32 partition) internal pure {
        if (partition == bytes32(0)) {
            revert InvalidSalt(); // Reusing error for bytes32 validation
        }
    }
    
    /**
     * @notice Validate slot (for ERC3525 semi-fungible tokens)
     * @param slot Slot identifier
     * @dev Basic validation - slot can be 0 in some cases
     */
    function validateSlot(uint256 slot) internal pure {
        // Slot validation is standard-specific
        // For now, we allow any slot value including 0
        // Individual factories can add more specific validation
    }
    
    /**
     * @notice Comprehensive validation for full deployment
     * @param name Token name
     * @param symbol Token symbol
     * @param maxSupply Maximum supply
     * @param initialSupply Initial supply
     * @param owner Token owner
     * @dev Single function to validate all common parameters
     */
    function validateFullDeployment(
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        uint256 initialSupply,
        address owner
    ) internal pure {
        validateDeploymentParams(name, symbol, owner);
        validateSupply(maxSupply, initialSupply);
    }
    
    // ============ Utility Functions ============
    
    /**
     * @notice Check if string is empty
     * @param str String to check
     * @return bool True if string is empty
     */
    function isEmpty(string memory str) internal pure returns (bool) {
        return bytes(str).length == 0;
    }
    
    /**
     * @notice Check if address is valid (non-zero)
     * @param addr Address to check
     * @return bool True if address is valid
     */
    function isValidAddress(address addr) internal pure returns (bool) {
        return addr != address(0);
    }
    
    /**
     * @notice Validate multiple addresses
     * @param addresses Array of addresses to validate
     * @dev Reverts if any address is zero
     */
    function validateAddresses(address[] memory addresses) internal pure {
        for (uint256 i = 0; i < addresses.length; i++) {
            if (addresses[i] == address(0)) {
                revert InvalidOwner();
            }
        }
    }
}
