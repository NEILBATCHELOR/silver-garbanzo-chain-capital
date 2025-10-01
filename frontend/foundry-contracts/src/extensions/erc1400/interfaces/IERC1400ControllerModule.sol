// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC1400ControllerModule
 * @notice Interface for ERC-1400 security token controller operations
 * @dev Implements forced transfers and emergency operations for regulatory compliance
 */
interface IERC1400ControllerModule {
    // ============ Events ============
    
    event ControllerTransfer(
        address indexed controller,
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data,
        bytes operatorData
    );
    
    event ControllerRedeem(
        address indexed controller,
        address indexed tokenHolder,
        uint256 value,
        bytes data,
        bytes operatorData
    );
    
    event ControllerAdded(address indexed controller);
    event ControllerRemoved(address indexed controller);
    event ControllableStatusChanged(bool controllable);
    event AccountFrozen(address indexed account, bytes32 reason);
    event AccountUnfrozen(address indexed account);
    
    // ============ Errors ============
    
    error NotController(address caller);
    error NotControllable();
    error AccountAlreadyFrozen(address account);
    error AccountNotFrozen(address account);
    error InvalidControllerAddress();
    error ControllerAlreadyExists(address controller);
    
    // ============ Controller Management ============
    
    /**
     * @notice Add a new controller
     * @param controller Address to grant controller role
     */
    function addController(address controller) external;
    
    /**
     * @notice Remove a controller
     * @param controller Address to revoke controller role
     */
    function removeController(address controller) external;
    
    /**
     * @notice Check if address is a controller
     * @param account Address to check
     * @return bool True if account is controller
     */
    function isController(address account) external view returns (bool);
    
    /**
     * @notice Get all controllers
     * @return address[] Array of controller addresses
     */
    function getControllers() external view returns (address[] memory);
    
    // ============ Controllability ============
    
    /**
     * @notice Check if token is controllable
     * @return bool True if controllable
     */
    function isControllable() external view returns (bool);
    
    /**
     * @notice Enable or disable controllability
     * @param controllable New controllability status
     */
    function setControllable(bool controllable) external;
    
    // ============ Forced Operations ============
    
    /**
     * @notice Controller forced transfer (regulatory recovery)
     * @param from Source address
     * @param to Destination address
     * @param value Amount to transfer
     * @param data Additional transfer data
     * @param operatorData Data from controller
     */
    function controllerTransfer(
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata operatorData
    ) external;
    
    /**
     * @notice Controller forced redemption (token burn)
     * @param tokenHolder Address whose tokens to redeem
     * @param value Amount to redeem
     * @param data Additional redemption data
     * @param operatorData Data from controller
     */
    function controllerRedeem(
        address tokenHolder,
        uint256 value,
        bytes calldata data,
        bytes calldata operatorData
    ) external;
    
    // ============ Account Freezing ============
    
    /**
     * @notice Freeze an account (prevent all transfers)
     * @param account Address to freeze
     * @param reason Reason for freezing
     */
    function freezeAccount(address account, bytes32 reason) external;
    
    /**
     * @notice Unfreeze an account
     * @param account Address to unfreeze
     */
    function unfreezeAccount(address account) external;
    
    /**
     * @notice Check if account is frozen
     * @param account Address to check
     * @return bool True if frozen
     */
    function isFrozen(address account) external view returns (bool);
    
    /**
     * @notice Get freeze reason for account
     * @param account Address to check
     * @return bytes32 Freeze reason
     */
    function getFreezeReason(address account) external view returns (bytes32);
    
    /**
     * @notice Get all frozen accounts
     * @return address[] Array of frozen addresses
     */
    function getFrozenAccounts() external view returns (address[] memory);
}
