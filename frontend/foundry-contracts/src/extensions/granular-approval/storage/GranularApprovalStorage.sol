// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title GranularApprovalStorage
 * @notice Storage layout for ERC-5216 Granular Approval Module
 * @dev Uses diamond storage pattern to avoid collisions
 */
library GranularApprovalStorage {
    /// @notice Storage position for the module
    bytes32 private constant STORAGE_SLOT = 
        keccak256("chaincapital.storage.GranularApproval");

    struct Layout {
        /// @notice Mapping: owner => spender => tokenId => amount
        /// @dev Tracks approved amounts per token ID
        mapping(address => mapping(address => mapping(uint256 => uint256))) allowances;
        
        /// @notice Address of the parent ERC-1155 token contract
        address tokenContract;
        
        /// @notice Whether granular approvals are enabled
        bool enabled;
        
        /// @notice Reserved for future use
        uint256[47] __gap;
    }

    /**
     * @notice Get storage layout
     * @return l The storage layout
     */
    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
