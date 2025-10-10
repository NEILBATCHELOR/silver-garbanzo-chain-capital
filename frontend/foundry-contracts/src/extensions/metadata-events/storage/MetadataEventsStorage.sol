// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MetadataEventsStorage
 * @notice Storage layout for ERC4906 Metadata Module
 * @dev This module has minimal storage requirements as it primarily emits events
 */
library MetadataEventsStorage {
    /// @notice Storage position for the module
    bytes32 private constant STORAGE_SLOT = 
        keccak256("chaincapital.storage.MetadataEvents");

    struct Layout {
        /// @notice Address of the parent token contract
        address tokenContract;
        
        /// @notice Whether metadata updates are enabled
        bool updatesEnabled;
        
        /// @notice Reserved for future use
        uint256[48] __gap;
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
