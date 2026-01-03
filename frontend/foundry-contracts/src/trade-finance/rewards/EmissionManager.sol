// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IEmissionManager} from "./interfaces/IEmissionManager.sol";
import {IRewardsController} from "./interfaces/IRewardsController.sol";
import {ITransferStrategyBase} from "./interfaces/ITransferStrategyBase.sol";
import {RewardsDataTypes} from "./libraries/RewardsDataTypes.sol";

/**
 * @title EmissionManager
 * @notice Manages reward emission administration for the rewards system
 * @dev Handles emission admin permissions per reward token and delegates to RewardsController
 * Supports commodity-specific emission schedules and seasonal adjustments
 * 
 * UPGRADEABILITY:
 * - Pattern: UUPS (Universal Upgradeable Proxy Standard)
 * - Upgrade Control: Only owner can upgrade
 * - Storage: Uses storage gaps for future variables
 * - Initialization: Uses initialize() instead of constructor
 */
contract EmissionManager is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    IEmissionManager 
{
    // ============ Storage ============

    /// @notice The rewards controller contract
    IRewardsController internal _rewardsController;

    /// @notice Mapping of reward token to emission admin
    mapping(address => address) internal _emissionAdmins;

    /// @notice Commodity-specific emission configurations
    mapping(bytes32 => RewardsDataTypes.CommodityEmissionConfig) internal _commodityConfigs;

    // ============ Storage Gap ============
    // Reserve 47 slots for future variables (50 total - 3 current)
    uint256[47] private __gap;

    // ============ Errors ============

    error NotEmissionAdmin();
    error RewardsControllerNotSet();
    error InvalidRewardToken();
    error InvalidEmissionAdmin();
    error InvalidInput();
    error ZeroAddress();

    // ============ Events ============

    /// @notice Emitted when commodity emission config is updated
    event CommodityEmissionConfigUpdated(
        bytes32 indexed commodityType,
        uint256 seasonalMultiplier,
        uint256 volatilityAdjustment,
        uint88 minEmission,
        uint88 maxEmission
    );

    /// @notice Emitted when rewards controller is updated
    event RewardsControllerUpdated(address indexed newController);
    
    /// @notice Emitted when contract is upgraded
    event Upgraded(address indexed newImplementation);

    // ============ Modifiers ============

    modifier onlyEmissionAdmin(address reward) {
        if (_emissionAdmins[reward] != msg.sender && owner() != msg.sender) {
            revert NotEmissionAdmin();
        }
        _;
    }

    modifier onlyValidReward(address reward) {
        if (reward == address(0)) revert InvalidRewardToken();
        _;
    }

    // ============ Constructor ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initializer ============

    /**
     * @notice Initialize the contract (replaces constructor)
     * @param owner_ Initial owner address
     */
    function initialize(address owner_) public initializer {
        if (owner_ == address(0)) revert ZeroAddress();
        
        __Ownable_init(owner_);
        __UUPSUpgradeable_init();
    }

    // ============ View Functions ============

    /// @inheritdoc IEmissionManager
    function getRewardsController() external view override returns (IRewardsController) {
        return _rewardsController;
    }

    /// @inheritdoc IEmissionManager
    function getEmissionAdmin(address reward) external view override returns (address) {
        return _emissionAdmins[reward];
    }

    /**
     * @notice Get commodity emission configuration
     * @param commodityType The commodity type identifier
     * @return The emission configuration
     */
    function getCommodityEmissionConfig(
        bytes32 commodityType
    ) external view returns (RewardsDataTypes.CommodityEmissionConfig memory) {
        return _commodityConfigs[commodityType];
    }

    // ============ Admin Functions ============

    /// @inheritdoc IEmissionManager
    function setRewardsController(address controller) external override onlyOwner {
        _rewardsController = IRewardsController(controller);
        emit RewardsControllerUpdated(controller);
    }

    /// @inheritdoc IEmissionManager
    function setEmissionAdmin(
        address reward,
        address admin
    ) external override onlyOwner onlyValidReward(reward) {
        address oldAdmin = _emissionAdmins[reward];
        _emissionAdmins[reward] = admin;
        emit EmissionAdminUpdated(reward, oldAdmin, admin);
    }

    /// @inheritdoc IEmissionManager
    function setClaimer(address user, address claimer) external override onlyOwner {
        if (address(_rewardsController) == address(0)) revert RewardsControllerNotSet();
        _rewardsController.setClaimer(user, claimer);
    }

    /**
     * @notice Set commodity-specific emission configuration
     * @param commodityType The commodity type identifier
     * @param config The emission configuration
     */
    function setCommodityEmissionConfig(
        bytes32 commodityType,
        RewardsDataTypes.CommodityEmissionConfig calldata config
    ) external onlyOwner {
        _commodityConfigs[commodityType] = config;
        emit CommodityEmissionConfigUpdated(
            commodityType,
            config.seasonalMultiplier,
            config.volatilityAdjustment,
            config.minEmission,
            config.maxEmission
        );
    }

    // ============ Emission Configuration Functions ============

    /// @inheritdoc IEmissionManager
    function configureAssets(
        RewardsDataTypes.RewardsConfigInput[] memory config
    ) external override {
        if (address(_rewardsController) == address(0)) revert RewardsControllerNotSet();
        
        // Verify caller is admin for all rewards being configured
        for (uint256 i = 0; i < config.length; i++) {
            address reward = config[i].reward;
            if (_emissionAdmins[reward] != msg.sender && owner() != msg.sender) {
                revert NotEmissionAdmin();
            }
        }
        
        _rewardsController.configureAssets(config);
    }

    /// @inheritdoc IEmissionManager
    function setTransferStrategy(
        address reward,
        ITransferStrategyBase transferStrategy
    ) external override onlyEmissionAdmin(reward) {
        if (address(_rewardsController) == address(0)) revert RewardsControllerNotSet();
        _rewardsController.setTransferStrategy(reward, transferStrategy);
    }

    /// @inheritdoc IEmissionManager
    function setRewardOracle(
        address reward,
        address rewardOracle
    ) external override onlyEmissionAdmin(reward) {
        if (address(_rewardsController) == address(0)) revert RewardsControllerNotSet();
        _rewardsController.setRewardOracle(reward, rewardOracle);
    }

    /// @inheritdoc IEmissionManager
    function setDistributionEnd(
        address asset,
        address reward,
        uint32 newDistributionEnd
    ) external override onlyEmissionAdmin(reward) {
        if (address(_rewardsController) == address(0)) revert RewardsControllerNotSet();
        _rewardsController.setDistributionEnd(asset, reward, newDistributionEnd);
    }

    /// @inheritdoc IEmissionManager
    function setEmissionPerSecond(
        address asset,
        address[] calldata rewards,
        uint88[] calldata newEmissionsPerSecond
    ) external override {
        if (address(_rewardsController) == address(0)) revert RewardsControllerNotSet();
        if (rewards.length != newEmissionsPerSecond.length) revert InvalidInput();
        
        // Verify caller is admin for all rewards
        for (uint256 i = 0; i < rewards.length; i++) {
            if (_emissionAdmins[rewards[i]] != msg.sender && owner() != msg.sender) {
                revert NotEmissionAdmin();
            }
        }
        
        _rewardsController.setEmissionPerSecond(asset, rewards, newEmissionsPerSecond);
    }

    /**
     * @notice Calculate adjusted emission rate for a commodity
     * @dev Applies seasonal and volatility adjustments
     * @param commodityType The commodity type
     * @param baseEmission The base emission rate
     * @return Adjusted emission rate
     */
    function calculateAdjustedEmission(
        bytes32 commodityType,
        uint88 baseEmission
    ) external view returns (uint88) {
        RewardsDataTypes.CommodityEmissionConfig storage config = _commodityConfigs[commodityType];
        
        if (config.commodityType == bytes32(0)) {
            return baseEmission;
        }
        
        // Apply seasonal multiplier (1e18 = 100%)
        uint256 adjusted = (uint256(baseEmission) * config.seasonalMultiplier) / 1e18;
        
        // Apply volatility adjustment (1e18 = 100%)
        adjusted = (adjusted * (1e18 + config.volatilityAdjustment)) / 1e18;
        
        // Clamp to min/max bounds
        if (adjusted < config.minEmission) {
            return config.minEmission;
        }
        if (adjusted > config.maxEmission) {
            return config.maxEmission;
        }
        
        return uint88(adjusted);
    }

    // ============ Upgrade Authorization ============

    /**
     * @notice Authorize contract upgrades
     * @dev Only owner can upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {
        emit Upgraded(newImplementation);
    }
}
