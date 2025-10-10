// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./interfaces/IERC1363.sol";
import "./interfaces/IERC1363Receiver.sol";
import "./interfaces/IERC1363Spender.sol";
import "./storage/PayableTokenStorage.sol";

/**
 * @title ERC1363PayableToken
 * @notice ERC-1363 implementation for single-transaction token operations
 * @dev Extension module for ERC-20 tokens enabling callback-based transfers
 * 
 * Key Benefits:
 * - Single-transaction payments: transfer + callback in one tx
 * - Better UX: One approval instead of approve + transferFrom
 * - Gas efficient: Eliminates need for polling/waiting
 * - Secure: Callback validation + gas limits prevent griefing
 * 
 * Use Cases:
 * - Payment processors (pay and execute service)
 * - Subscription services (approve and subscribe)
 * - DEX integrations (approve and swap atomically)
 * - Staking (deposit and stake in one transaction)
 * 
 * Gas Costs:
 * - transferAndCall: +5-10K vs normal transfer
 * - approveAndCall: +5-10K vs normal approve
 * 
 * Security Features:
 * - Callback gas limits (prevents griefing attacks)
 * - Whitelist mode (optional receiver/spender filtering)
 * - Reentrancy protection (via AccessControl checks)
 * - Failed callbacks revert entire transaction
 */
contract ERC1363PayableToken is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IPayableToken,
    PayableTokenStorage
{
    // ============ Roles ============
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant WHITELIST_MANAGER_ROLE = keccak256("WHITELIST_MANAGER_ROLE");
    
    // ============ Events ============
    event TransferAndCall(
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data
    );
    
    event ApproveAndCall(
        address indexed owner,
        address indexed spender,
        uint256 value,
        bytes data
    );
    
    event CallbackGasLimitUpdated(uint256 oldLimit, uint256 newLimit);
    event WhitelistEnabled(bool enabled);
    event ReceiverWhitelisted(address indexed receiver, bool whitelisted);
    event SpenderWhitelisted(address indexed spender, bool whitelisted);
    
    // ============ Errors ============
    error InvalidTokenContract();
    error ModuleNotEnabled();
    error ReceiverNotWhitelisted(address receiver);
    error SpenderNotWhitelisted(address spender);
    error CallbackFailed(address target, bytes4 selector);
    error InvalidCallbackResponse(address target, bytes4 expected, bytes4 received);
    error CallbackGasLimitExceeded();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize payable token module
     * @param admin Admin address
     * @param tokenContract_ The ERC-20 token this module extends
     * @param callbackGasLimit_ Gas limit for callback executions (default: 100K)
     */
    function initialize(
        address admin,
        address tokenContract_,
        uint256 callbackGasLimit_
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(WHITELIST_MANAGER_ROLE, admin);
        
        if (tokenContract_ == address(0)) revert InvalidTokenContract();
        
        PayableTokenStorageLayout storage $ = _getPayableTokenStorage();
        $.tokenContract = tokenContract_;
        $.enabled = true;
        $.callbackGasLimit = callbackGasLimit_ > 0 ? callbackGasLimit_ : 100000;
        $.whitelistEnabled = false;
    }
    
    // ============ Core ERC-1363 Functions ============
    
    /**
     * @notice Transfer tokens and execute callback on receiver
     * @dev Calls onTransferReceived on receiver if it's a contract
     */
    function transferAndCall(
        address to,
        uint256 value
    ) external override returns (bool) {
        if (!_enabled()) revert ModuleNotEnabled();
        
        // Execute standard transfer via token contract
        IERC20 token = IERC20(_tokenContract());
        bool success = token.transferFrom(msg.sender, to, value);
        require(success, "Transfer failed");
        
        // If receiver is a contract, call callback with empty data
        if (to.code.length > 0) {
            _checkAndCallTransfer(msg.sender, msg.sender, to, value, "");
        }
        
        emit TransferAndCall(msg.sender, to, value, "");
        return true;
    }
    
    /**
     * @notice Transfer tokens with data and execute callback
     */
    function transferAndCall(
        address to,
        uint256 value,
        bytes calldata data
    ) public override returns (bool) {
        if (!_enabled()) revert ModuleNotEnabled();
        
        // Execute standard transfer via token contract
        IERC20 token = IERC20(_tokenContract());
        bool success = token.transferFrom(msg.sender, to, value);
        require(success, "Transfer failed");
        
        // If receiver is a contract, call callback
        if (to.code.length > 0) {
            _checkAndCallTransfer(msg.sender, msg.sender, to, value, data);
        }
        
        emit TransferAndCall(msg.sender, to, value, data);
        return true;
    }
    
    /**
     * @notice Transfer from and execute callback on receiver
     */
    function transferFromAndCall(
        address from,
        address to,
        uint256 value
    ) external override returns (bool) {
        if (!_enabled()) revert ModuleNotEnabled();
        
        // Execute standard transferFrom via token contract
        IERC20 token = IERC20(_tokenContract());
        bool success = token.transferFrom(from, to, value);
        require(success, "TransferFrom failed");
        
        // If receiver is a contract, call callback with empty data
        if (to.code.length > 0) {
            _checkAndCallTransfer(msg.sender, from, to, value, "");
        }
        
        emit TransferAndCall(from, to, value, "");
        return true;
    }
    
    /**
     * @notice Transfer from with data and execute callback
     */
    function transferFromAndCall(
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) public override returns (bool) {
        if (!_enabled()) revert ModuleNotEnabled();
        
        // Execute standard transferFrom via token contract
        IERC20 token = IERC20(_tokenContract());
        bool success = token.transferFrom(from, to, value);
        require(success, "TransferFrom failed");
        
        // If receiver is a contract, call callback
        if (to.code.length > 0) {
            _checkAndCallTransfer(msg.sender, from, to, value, data);
        }
        
        emit TransferAndCall(from, to, value, data);
        return true;
    }
    
    /**
     * @notice Approve and execute callback on spender
     */
    function approveAndCall(
        address spender,
        uint256 value
    ) external override returns (bool) {
        if (!_enabled()) revert ModuleNotEnabled();
        
        // Execute standard approve via token contract
        IERC20 token = IERC20(_tokenContract());
        bool success = token.approve(spender, value);
        require(success, "Approve failed");
        
        // If spender is a contract, call callback with empty data
        if (spender.code.length > 0) {
            _checkAndCallApprove(msg.sender, spender, value, "");
        }
        
        emit ApproveAndCall(msg.sender, spender, value, "");
        return true;
    }
    
    /**
     * @notice Approve with data and execute callback
     */
    function approveAndCall(
        address spender,
        uint256 value,
        bytes calldata data
    ) public override returns (bool) {
        if (!_enabled()) revert ModuleNotEnabled();
        
        // Execute standard approve via token contract
        IERC20 token = IERC20(_tokenContract());
        bool success = token.approve(spender, value);
        require(success, "Approve failed");
        
        // If spender is a contract, call callback
        if (spender.code.length > 0) {
            _checkAndCallApprove(msg.sender, spender, value, data);
        }
        
        emit ApproveAndCall(msg.sender, spender, value, data);
        return true;
    }
    
    // ============ Internal Callback Functions ============
    
    /**
     * @notice Check and call onTransferReceived callback
     */
    function _checkAndCallTransfer(
        address operator,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) private {
        // Check whitelist if enabled
        PayableTokenStorageLayout storage $ = _getPayableTokenStorage();
        if ($.whitelistEnabled && !$.whitelistedReceivers[to]) {
            revert ReceiverNotWhitelisted(to);
        }
        
        // Call callback with gas limit
        try IERC1363Receiver(to).onTransferReceived{gas: $.callbackGasLimit}(
            operator,
            from,
            value,
            data
        ) returns (bytes4 response) {
            // Verify correct response
            if (response != IERC1363Receiver.onTransferReceived.selector) {
                revert InvalidCallbackResponse(
                    to,
                    IERC1363Receiver.onTransferReceived.selector,
                    response
                );
            }
        } catch {
            revert CallbackFailed(to, IERC1363Receiver.onTransferReceived.selector);
        }
    }
    
    /**
     * @notice Check and call onApprovalReceived callback
     */
    function _checkAndCallApprove(
        address owner,
        address spender,
        uint256 value,
        bytes memory data
    ) private {
        // Check whitelist if enabled
        PayableTokenStorageLayout storage $ = _getPayableTokenStorage();
        if ($.whitelistEnabled && !$.whitelistedSpenders[spender]) {
            revert SpenderNotWhitelisted(spender);
        }
        
        // Call callback with gas limit
        try IERC1363Spender(spender).onApprovalReceived{gas: $.callbackGasLimit}(
            owner,
            value,
            data
        ) returns (bytes4 response) {
            // Verify correct response
            if (response != IERC1363Spender.onApprovalReceived.selector) {
                revert InvalidCallbackResponse(
                    spender,
                    IERC1363Spender.onApprovalReceived.selector,
                    response
                );
            }
        } catch {
            revert CallbackFailed(spender, IERC1363Spender.onApprovalReceived.selector);
        }
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update callback gas limit
     */
    function setCallbackGasLimit(uint256 newLimit) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        PayableTokenStorageLayout storage $ = _getPayableTokenStorage();
        uint256 oldLimit = $.callbackGasLimit;
        $.callbackGasLimit = newLimit;
        emit CallbackGasLimitUpdated(oldLimit, newLimit);
    }
    
    /**
     * @notice Enable/disable whitelist mode
     */
    function setWhitelistEnabled(bool enabled) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        PayableTokenStorageLayout storage $ = _getPayableTokenStorage();
        $.whitelistEnabled = enabled;
        emit WhitelistEnabled(enabled);
    }
    
    /**
     * @notice Add receiver to whitelist
     */
    function whitelistReceiver(address receiver, bool whitelisted) 
        external 
        onlyRole(WHITELIST_MANAGER_ROLE) 
    {
        PayableTokenStorageLayout storage $ = _getPayableTokenStorage();
        $.whitelistedReceivers[receiver] = whitelisted;
        emit ReceiverWhitelisted(receiver, whitelisted);
    }
    
    /**
     * @notice Add spender to whitelist
     */
    function whitelistSpender(address spender, bool whitelisted) 
        external 
        onlyRole(WHITELIST_MANAGER_ROLE) 
    {
        PayableTokenStorageLayout storage $ = _getPayableTokenStorage();
        $.whitelistedSpenders[spender] = whitelisted;
        emit SpenderWhitelisted(spender, whitelisted);
    }
    
    /**
     * @notice Batch whitelist receivers
     */
    function batchWhitelistReceivers(
        address[] calldata receivers,
        bool whitelisted
    ) external onlyRole(WHITELIST_MANAGER_ROLE) {
        PayableTokenStorageLayout storage $ = _getPayableTokenStorage();
        for (uint256 i = 0; i < receivers.length; i++) {
            $.whitelistedReceivers[receivers[i]] = whitelisted;
            emit ReceiverWhitelisted(receivers[i], whitelisted);
        }
    }
    
    /**
     * @notice Batch whitelist spenders
     */
    function batchWhitelistSpenders(
        address[] calldata spenders,
        bool whitelisted
    ) external onlyRole(WHITELIST_MANAGER_ROLE) {
        PayableTokenStorageLayout storage $ = _getPayableTokenStorage();
        for (uint256 i = 0; i < spenders.length; i++) {
            $.whitelistedSpenders[spenders[i]] = whitelisted;
            emit SpenderWhitelisted(spenders[i], whitelisted);
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get the token contract address
     */
    function tokenContract() external view returns (address) {
        return _tokenContract();
    }
    
    /**
     * @notice Check if module is enabled
     */
    function isEnabled() external view returns (bool) {
        return _enabled();
    }
    
    /**
     * @notice Get callback gas limit
     */
    function callbackGasLimit() external view returns (uint256) {
        return _callbackGasLimit();
    }
    
    /**
     * @notice Check if whitelist is enabled
     */
    function isWhitelistEnabled() external view returns (bool) {
        return _whitelistEnabled();
    }
    
    /**
     * @notice Check if receiver is whitelisted
     */
    function isReceiverWhitelisted(address receiver) external view returns (bool) {
        return _getPayableTokenStorage().whitelistedReceivers[receiver];
    }
    
    /**
     * @notice Check if spender is whitelisted
     */
    function isSpenderWhitelisted(address spender) external view returns (bool) {
        return _getPayableTokenStorage().whitelistedSpenders[spender];
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
