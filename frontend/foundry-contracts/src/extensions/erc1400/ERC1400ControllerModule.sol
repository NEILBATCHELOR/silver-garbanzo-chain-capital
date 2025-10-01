// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC1400ControllerModule.sol";
import "./storage/ControllerStorage.sol";

/**
 * @title ERC1400ControllerModule
 * @notice Modular controller operations for ERC-1400 security tokens
 * @dev Implements forced transfers and emergency operations
 */
contract ERC1400ControllerModule is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC1400ControllerModule,
    ControllerStorage
{
    // ============ Roles ============
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize controller module
     * @param admin Admin address
     * @param controllable Whether token is controllable
     */
    function initialize(address admin, bool controllable) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CONTROLLER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        _isControllable = controllable;
    }
    
    // ============ Controller Management ============
    
    function addController(address controller)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (controller == address(0)) revert InvalidControllerAddress();
        if (_controllers[controller]) revert ControllerAlreadyExists(controller);
        
        _controllers[controller] = true;
        _controllerList.push(controller);
        _controllerIndexes[controller] = _controllerList.length - 1;
        
        _grantRole(CONTROLLER_ROLE, controller);
        emit ControllerAdded(controller);
    }
    
    function removeController(address controller)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (!_controllers[controller]) revert NotController(controller);
        
        // Remove from array
        uint256 index = _controllerIndexes[controller];
        uint256 lastIndex = _controllerList.length - 1;
        
        if (index != lastIndex) {
            address lastController = _controllerList[lastIndex];
            _controllerList[index] = lastController;
            _controllerIndexes[lastController] = index;
        }
        
        _controllerList.pop();
        delete _controllerIndexes[controller];
        delete _controllers[controller];
        
        _revokeRole(CONTROLLER_ROLE, controller);
        emit ControllerRemoved(controller);
    }
    
    function isController(address account) external view returns (bool) {
        return hasRole(CONTROLLER_ROLE, account);
    }
    
    function getControllers() external view returns (address[] memory) {
        return _controllerList;
    }
    
    // ============ Controllability ============
    
    function isControllable() external view returns (bool) {
        return _isControllable;
    }
    
    function setControllable(bool controllable)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _isControllable = controllable;
        emit ControllableStatusChanged(controllable);
    }
    
    // ============ Forced Operations ============
    
    function controllerTransfer(
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata operatorData
    ) external onlyRole(CONTROLLER_ROLE) {
        if (!_isControllable) revert NotControllable();
        
        // Note: Actual transfer logic should be implemented in the token contract
        // This module only validates and logs the operation
        
        emit ControllerTransfer(msg.sender, from, to, value, data, operatorData);
    }
    
    function controllerRedeem(
        address tokenHolder,
        uint256 value,
        bytes calldata data,
        bytes calldata operatorData
    ) external onlyRole(CONTROLLER_ROLE) {
        if (!_isControllable) revert NotControllable();
        
        // Note: Actual redemption logic should be implemented in the token contract
        // This module only validates and logs the operation
        
        emit ControllerRedeem(msg.sender, tokenHolder, value, data, operatorData);
    }
    
    // ============ Account Freezing ============
    
    function freezeAccount(address account, bytes32 reason)
        external
        onlyRole(CONTROLLER_ROLE)
    {
        if (_frozenAccounts[account].isFrozen) revert AccountAlreadyFrozen(account);
        
        _frozenAccounts[account] = FreezeData({
            isFrozen: true,
            reason: reason,
            timestamp: block.timestamp
        });
        
        _frozenAccountList.push(account);
        _frozenIndexes[account] = _frozenAccountList.length - 1;
        
        emit AccountFrozen(account, reason);
    }
    
    function unfreezeAccount(address account)
        external
        onlyRole(CONTROLLER_ROLE)
    {
        if (!_frozenAccounts[account].isFrozen) revert AccountNotFrozen(account);
        
        // Remove from frozen list
        uint256 index = _frozenIndexes[account];
        uint256 lastIndex = _frozenAccountList.length - 1;
        
        if (index != lastIndex) {
            address lastAccount = _frozenAccountList[lastIndex];
            _frozenAccountList[index] = lastAccount;
            _frozenIndexes[lastAccount] = index;
        }
        
        _frozenAccountList.pop();
        delete _frozenIndexes[account];
        delete _frozenAccounts[account];
        
        emit AccountUnfrozen(account);
    }
    
    function isFrozen(address account) external view returns (bool) {
        return _frozenAccounts[account].isFrozen;
    }
    
    function getFreezeReason(address account) external view returns (bytes32) {
        return _frozenAccounts[account].reason;
    }
    
    function getFrozenAccounts() external view returns (address[] memory) {
        return _frozenAccountList;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
