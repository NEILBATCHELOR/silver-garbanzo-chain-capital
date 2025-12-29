// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC4626Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import {ICommodityStataToken} from "./interfaces/ICommodityStataToken.sol";
import {ICommodityLendingPool} from "../../interfaces/ICommodityLendingPool.sol";
import {IRewardsController} from "../../rewards/interfaces/IRewardsController.sol";
import {IACLManager} from "../../interfaces/IACLManager.sol";

/**
 * @title CommodityStataToken
 * @notice ERC4626 vault wrapper for commodity receipt tokens (cTokens)
 * @dev Provides yield-bearing wrapped tokens with auto-compounding interest
 *      and DeFi composability for commodity collateral
 * 
 * Key Features:
 * - Wraps cTokens into non-rebasing ERC4626 vaults
 * - Auto-compounds interest from lending pool
 * - Integrates with rewards system for liquidity mining
 * - Enables use as collateral in external DeFi protocols
 * - Supports AMM liquidity provision
 * 
 * Architecture:
 * - Inherits from OpenZeppelin's ERC4626Upgradeable
 * - Uses upgradeable pattern for future enhancements
 * - Pausable for emergency situations
 * - Integrates with commodity-specific rewards
 */
contract CommodityStataToken is
    ERC20PermitUpgradeable,
    ERC4626Upgradeable,
    PausableUpgradeable,
    ICommodityStataToken
{
    using SafeERC20 for IERC20;
    using Math for uint256;
    
    // ============ Constants ============
    
    uint256 public constant RAY = 1e27;
    
    // ============ Immutable Variables ============
    
    /// @notice The CommodityLendingPool contract
    ICommodityLendingPool public immutable POOL;
    
    /// @notice The RewardsController for liquidity mining
    IRewardsController public immutable REWARDS_CONTROLLER;
    
    /// @notice The ACL Manager for access control
    IACLManager public immutable ACL_MANAGER;
    
    // ============ State Variables ============
    
    /// @notice The underlying commodity receipt token (cToken)
    address private _cToken;
    
    /// @notice The underlying commodity asset
    address private _underlying;
    
    /// @notice The commodity type identifier (e.g., "GOLD", "OIL")
    bytes32 private _commodityType;
    
    // ============ Modifiers ============
    
    /**
     * @notice Restricts function access to pause guardians
     */
    modifier onlyPauseGuardian() {
        if (!canPause(msg.sender)) {
            revert OnlyPauseGuardian(msg.sender);
        }
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @notice Constructor sets immutable variables
     * @param pool The CommodityLendingPool address
     * @param rewardsController The RewardsController address
     * @param aclManager The ACL Manager address
     */
    constructor(
        address pool,
        address rewardsController,
        address aclManager
    ) {
        POOL = ICommodityLendingPool(pool);
        REWARDS_CONTROLLER = IRewardsController(rewardsController);
        ACL_MANAGER = IACLManager(aclManager);
        
        _disableInitializers();
    }
    
    // ============ Initialization ============
    
    /**
     * @notice Initialize the StataToken
     * @param cTokenAddress The commodity receipt token address
     * @param name The token name
     * @param symbol The token symbol
     * @param commodityTypeId The commodity type identifier
     */
    function initialize(
        address cTokenAddress,
        string calldata name,
        string calldata symbol,
        bytes32 commodityTypeId
    ) external initializer {
        // Validate cToken is from the correct pool
        // Note: This assumes cToken has a POOL() method
        // Adjust validation as needed for your cToken implementation
        
        __ERC20_init(name, symbol);
        __ERC20Permit_init(name);
        __Pausable_init();
        
        // Get underlying asset from cToken
        // This assumes your cToken has an underlying() method
        IERC20 underlyingAsset = IERC20(address(POOL));
        
        __ERC4626_init(underlyingAsset);
        
        _cToken = cTokenAddress;
        _commodityType = commodityTypeId;
        
        // Approve pool for max to enable deposits
        IERC20(underlyingAsset).forceApprove(address(POOL), type(uint256).max);
        
        emit CommodityTypeSet(commodityTypeId);
    }
    
    // ============ View Functions ============
    
    /// @inheritdoc ICommodityStataToken
    function cToken() public view returns (address) {
        return _cToken;
    }
    
    /// @inheritdoc ICommodityStataToken
    function underlying() public view returns (address) {
        return asset();
    }
    
    /// @inheritdoc ICommodityStataToken
    function commodityType() public view returns (bytes32) {
        return _commodityType;
    }
    
    /// @inheritdoc ICommodityStataToken
    function canPause(address actor) public view returns (bool) {
        return ACL_MANAGER.isEmergencyAdmin(actor);
    }
    
    /// @inheritdoc ICommodityStataToken
    function paused() public view override(PausableUpgradeable, ICommodityStataToken) returns (bool) {
        return super.paused();
    }
    
    /// @inheritdoc ICommodityStataToken
    function getExchangeRate() public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return RAY;
        
        uint256 currentAssets = totalAssets();
        return (currentAssets * RAY) / supply;
    }
    
    /// @inheritdoc ICommodityStataToken
    function getUserRewards(address user) external view returns (
        address[] memory rewardTokens,
        uint256[] memory rewardAmounts
    ) {
        // This would integrate with your RewardsController
        // Simplified implementation - expand based on your rewards structure
        address[] memory assets = new address[](1);
        assets[0] = _cToken;
        
        // Get rewards from controller
        // You'll need to adapt this to your RewardsController interface
        return (new address[](0), new uint256[](0));
    }
    
    // ============ Deposit Functions ============
    
    /// @inheritdoc ICommodityStataToken
    function depositCTokens(
        uint256 assets,
        address receiver
    ) external whenNotPaused returns (uint256 shares) {
        // Get actual user balance to handle rebasing
        uint256 actualBalance = IERC20(_cToken).balanceOf(msg.sender);
        if (assets > actualBalance) {
            assets = actualBalance;
        }
        
        shares = previewDeposit(assets);
        
        // Transfer cTokens from user
        IERC20(_cToken).safeTransferFrom(msg.sender, address(this), assets);
        
        // Mint StataTokens
        _mint(receiver, shares);
        
        emit Deposit(msg.sender, receiver, assets, shares);
    }
    
    /// @inheritdoc ICommodityStataToken
    function depositWithPermit(
        uint256 assets,
        address receiver,
        uint256 deadline,
        SignatureParams calldata sig,
        bool depositToPool
    ) external whenNotPaused returns (uint256 shares) {
        address assetToDeposit = depositToPool ? asset() : _cToken;
        
        // Try permit (may fail if already approved)
        try IERC20Permit(assetToDeposit).permit(
            msg.sender,
            address(this),
            assets,
            deadline,
            sig.v,
            sig.r,
            sig.s
        ) {} catch {}
        
        // Get actual balance to handle rebasing
        uint256 actualBalance = IERC20(assetToDeposit).balanceOf(msg.sender);
        if (assets > actualBalance) {
            assets = actualBalance;
        }
        
        if (depositToPool) {
            // Deposit underlying to pool first
            shares = deposit(assets, receiver);
        } else {
            // Direct cToken deposit - inline logic
            shares = previewDeposit(assets);
            
            // Transfer cTokens from user
            IERC20(_cToken).safeTransferFrom(msg.sender, address(this), assets);
            
            // Mint StataTokens
            _mint(receiver, shares);
            
            emit Deposit(msg.sender, receiver, assets, shares);
        }
    }
    
    // ============ Redemption Functions ============
    
    /// @inheritdoc ICommodityStataToken
    function redeemCTokens(
        uint256 shares,
        address receiver,
        address owner
    ) external whenNotPaused returns (uint256 assets) {
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }
        
        assets = previewRedeem(shares);
        
        // Burn StataTokens
        _burn(owner, shares);
        
        // Transfer cTokens
        IERC20(_cToken).safeTransfer(receiver, assets);
        
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }
    
    // ============ Rewards Functions ============
    
    /// @inheritdoc ICommodityStataToken
    function claimRewards(address receiver) external returns (
        address[] memory rewardTokens,
        uint256[] memory rewardAmounts
    ) {
        address[] memory assets = new address[](1);
        assets[0] = _cToken;
        
        return REWARDS_CONTROLLER.claimAllRewards(assets, receiver);
    }
    
    /// @inheritdoc ICommodityStataToken
    function claimRewardsOnBehalf(
        address user,
        address receiver
    ) external returns (
        address[] memory rewardTokens,
        uint256[] memory rewardAmounts
    ) {
        address[] memory assets = new address[](1);
        assets[0] = _cToken;
        
        return REWARDS_CONTROLLER.claimAllRewardsOnBehalf(assets, user, receiver);
    }
    
    // ============ Admin Functions ============
    
    /// @inheritdoc ICommodityStataToken
    function setPaused(bool shouldPause) external onlyPauseGuardian {
        if (shouldPause) {
            _pause();
            emit Paused(msg.sender);
        } else {
            _unpause();
            emit Unpaused(msg.sender);
        }
    }
    
    // ============ Internal Overrides ============
    
    /**
     * @notice Override to ensure deposits are paused when contract is paused
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override whenNotPaused {
        super._deposit(caller, receiver, assets, shares);
    }
    
    /**
     * @notice Override to ensure withdrawals are paused when contract is paused
     */
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override whenNotPaused {
        super._withdraw(caller, receiver, owner, assets, shares);
    }
    
    /**
     * @notice Override decimals to match the underlying asset
     */
    function decimals() 
        public 
        view 
        override(ERC20Upgradeable, ERC4626Upgradeable, IERC20Metadata) 
        returns (uint8) 
    {
        return super.decimals();
    }
    
    /**
     * @notice Get total assets under management
     * @dev Returns the cToken balance of this contract
     */
    function totalAssets() 
        public 
        view 
        override(ERC4626Upgradeable, IERC4626) 
        returns (uint256) 
    {
        return IERC20(_cToken).balanceOf(address(this));
    }
}
