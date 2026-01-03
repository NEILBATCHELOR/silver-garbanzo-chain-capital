// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IScaledBalanceToken} from "../interfaces/IScaledBalanceToken.sol";
import {IRewardsDistributor} from "./interfaces/IRewardsDistributor.sol";
import {RewardsDataTypes} from "./libraries/RewardsDataTypes.sol";

/**
 * @title RewardsDistributor
 * @notice Accounting contract for managing multiple reward distributions
 * @dev Upgradeable contract handling reward index calculations and user accruals
 * Supports multiple reward tokens per asset for flexible liquidity mining programs
 * 
 * UPGRADEABILITY:
 * - UUPS upgradeable pattern
 * - Owner can authorize upgrades
 * - Storage gaps for future variables
 */
contract RewardsDistributor is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    IRewardsDistributor 
{
    // ============ Storage ============

    /// @notice The emission manager address (can configure rewards)
    address private _emissionManager;

    /// @notice Asset address => asset reward data
    mapping(address => RewardsDataTypes.AssetData) internal _assets;

    /// @notice Reward token enabled status
    mapping(address => bool) internal _isRewardEnabled;

    /// @notice List of all reward tokens
    address[] internal _rewardsList;

    /// @notice List of all incentivized assets
    address[] internal _assetsList;

    // ============ Storage Gap ============
    // Reserve 45 slots for future variables (50 total - 5 current)
    uint256[45] private __gap;

    // ============ Errors ============

    error OnlyEmissionManager();
    error InvalidInput();
    error DistributionDoesNotExist();
    error IndexOverflow();
    error ZeroAddress();

    // ============ Events ============

    event Upgraded(address indexed newImplementation);

    // ============ Modifiers ============

    modifier onlyEmissionManager() {
        if (msg.sender != _emissionManager) revert OnlyEmissionManager();
        _;
    }

    // ============ Constructor ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initializer ============

    /**
     * @notice Initialize the rewards distributor
     * @param emissionManager Address of the emission manager
     * @param owner Address of the contract owner
     */
    function initialize(
        address emissionManager,
        address owner
    ) public virtual initializer {
        if (emissionManager == address(0)) revert ZeroAddress();
        if (owner == address(0)) revert ZeroAddress();

        __Ownable_init(owner);
        __UUPSUpgradeable_init();

        _emissionManager = emissionManager;
    }

    /**
     * @notice Internal initializer for child contracts (if needed)
     * @dev Can be called by child contracts in their initialize function
     * @param emissionManager Address of the emission manager
     */
    function __RewardsDistributor_init(address emissionManager) internal onlyInitializing {
        if (emissionManager == address(0)) revert ZeroAddress();
        _emissionManager = emissionManager;
    }

    // ============ View Functions ============

    /// @inheritdoc IRewardsDistributor
    function getRewardsData(
        address asset,
        address reward
    ) external view override returns (uint256, uint256, uint256, uint256) {
        return (
            _assets[asset].rewards[reward].index,
            _assets[asset].rewards[reward].emissionPerSecond,
            _assets[asset].rewards[reward].lastUpdateTimestamp,
            _assets[asset].rewards[reward].distributionEnd
        );
    }

    /// @inheritdoc IRewardsDistributor
    function getAssetIndex(
        address asset,
        address reward
    ) external view override returns (uint256, uint256) {
        RewardsDataTypes.RewardData storage rewardData = _assets[asset].rewards[reward];
        return _getAssetIndex(
            rewardData,
            IScaledBalanceToken(asset).scaledTotalSupply(),
            10 ** _assets[asset].decimals
        );
    }

    /// @inheritdoc IRewardsDistributor
    function getDistributionEnd(
        address asset,
        address reward
    ) external view override returns (uint256) {
        return _assets[asset].rewards[reward].distributionEnd;
    }

    /// @inheritdoc IRewardsDistributor
    function getRewardsByAsset(
        address asset
    ) external view override returns (address[] memory) {
        uint128 rewardsCount = _assets[asset].availableRewardsCount;
        address[] memory availableRewards = new address[](rewardsCount);

        for (uint128 i = 0; i < rewardsCount; i++) {
            availableRewards[i] = _assets[asset].availableRewards[i];
        }
        return availableRewards;
    }

    /// @inheritdoc IRewardsDistributor
    function getRewardsList() external view override returns (address[] memory) {
        return _rewardsList;
    }

    /// @inheritdoc IRewardsDistributor
    function getUserAssetIndex(
        address user,
        address asset,
        address reward
    ) external view override returns (uint256) {
        return _assets[asset].rewards[reward].usersData[user].index;
    }

    /// @inheritdoc IRewardsDistributor
    function getUserAccruedRewards(
        address user,
        address reward
    ) external view override returns (uint256) {
        uint256 totalAccrued;
        for (uint256 i = 0; i < _assetsList.length; i++) {
            totalAccrued += _assets[_assetsList[i]].rewards[reward].usersData[user].accrued;
        }
        return totalAccrued;
    }

    /// @inheritdoc IRewardsDistributor
    function getUserRewards(
        address[] calldata assets,
        address user,
        address reward
    ) external view override returns (uint256) {
        return _getUserReward(user, reward, _getUserAssetBalances(assets, user));
    }

    /// @inheritdoc IRewardsDistributor
    function getAllUserRewards(
        address[] calldata assets,
        address user
    ) external view override returns (
        address[] memory rewardsList,
        uint256[] memory unclaimedAmounts
    ) {
        RewardsDataTypes.UserAssetBalance[] memory userAssetBalances = 
            _getUserAssetBalances(assets, user);
        
        rewardsList = new address[](_rewardsList.length);
        unclaimedAmounts = new uint256[](rewardsList.length);

        // Add unrealized rewards from user to unclaimedRewards
        for (uint256 i = 0; i < userAssetBalances.length; i++) {
            for (uint256 r = 0; r < rewardsList.length; r++) {
                rewardsList[r] = _rewardsList[r];
                unclaimedAmounts[r] += _assets[userAssetBalances[i].asset]
                    .rewards[rewardsList[r]]
                    .usersData[user]
                    .accrued;

                if (userAssetBalances[i].userBalance == 0) {
                    continue;
                }
                unclaimedAmounts[r] += _getPendingRewards(
                    user,
                    rewardsList[r],
                    userAssetBalances[i]
                );
            }
        }
        return (rewardsList, unclaimedAmounts);
    }

    /// @inheritdoc IRewardsDistributor
    function getAssetDecimals(address asset) external view override returns (uint8) {
        return _assets[asset].decimals;
    }

    /// @inheritdoc IRewardsDistributor
    function getEmissionManager() external view override returns (address) {
        return _emissionManager;
    }

    // ============ External Functions ============

    /// @inheritdoc IRewardsDistributor
    function setDistributionEnd(
        address asset,
        address reward,
        uint32 newDistributionEnd
    ) external override onlyEmissionManager {
        uint256 oldDistributionEnd = _assets[asset].rewards[reward].distributionEnd;
        _assets[asset].rewards[reward].distributionEnd = newDistributionEnd;

        emit AssetConfigUpdated(
            asset,
            reward,
            _assets[asset].rewards[reward].emissionPerSecond,
            _assets[asset].rewards[reward].emissionPerSecond,
            oldDistributionEnd,
            newDistributionEnd,
            _assets[asset].rewards[reward].index
        );
    }

    /// @inheritdoc IRewardsDistributor
    function setEmissionPerSecond(
        address asset,
        address[] calldata rewards,
        uint88[] calldata newEmissionsPerSecond
    ) external override onlyEmissionManager {
        if (rewards.length != newEmissionsPerSecond.length) revert InvalidInput();

        for (uint256 i = 0; i < rewards.length; i++) {
            RewardsDataTypes.AssetData storage assetConfig = _assets[asset];
            RewardsDataTypes.RewardData storage rewardConfig = _assets[asset].rewards[rewards[i]];
            
            uint256 decimals = assetConfig.decimals;
            if (decimals == 0 || rewardConfig.lastUpdateTimestamp == 0) {
                revert DistributionDoesNotExist();
            }

            (uint256 newIndex, ) = _updateRewardData(
                rewardConfig,
                IScaledBalanceToken(asset).scaledTotalSupply(),
                10 ** decimals
            );

            uint256 oldEmissionPerSecond = rewardConfig.emissionPerSecond;
            rewardConfig.emissionPerSecond = newEmissionsPerSecond[i];

            emit AssetConfigUpdated(
                asset,
                rewards[i],
                oldEmissionPerSecond,
                newEmissionsPerSecond[i],
                rewardConfig.distributionEnd,
                rewardConfig.distributionEnd,
                newIndex
            );
        }
    }

    // ============ Internal Functions ============

    /**
     * @dev Configure assets for reward distribution
     * @param rewardsInput Array of reward configuration inputs
     */
    function _configureAssets(
        RewardsDataTypes.RewardsConfigInput[] memory rewardsInput
    ) internal {
        for (uint256 i = 0; i < rewardsInput.length; i++) {
            // Initialize asset if first time
            if (_assets[rewardsInput[i].asset].decimals == 0) {
                _assetsList.push(rewardsInput[i].asset);
            }

            // Get decimals from token
            uint256 decimals = _assets[rewardsInput[i].asset].decimals = 
                _getAssetDecimals(rewardsInput[i].asset);

            RewardsDataTypes.RewardData storage rewardConfig = 
                _assets[rewardsInput[i].asset].rewards[rewardsInput[i].reward];

            // Add reward to asset's available rewards if new
            if (rewardConfig.lastUpdateTimestamp == 0) {
                _assets[rewardsInput[i].asset].availableRewards[
                    _assets[rewardsInput[i].asset].availableRewardsCount
                ] = rewardsInput[i].reward;
                _assets[rewardsInput[i].asset].availableRewardsCount++;
            }

            // Add to global rewards list if new
            if (!_isRewardEnabled[rewardsInput[i].reward]) {
                _isRewardEnabled[rewardsInput[i].reward] = true;
                _rewardsList.push(rewardsInput[i].reward);
            }

            // Update the index
            (uint256 newIndex, ) = _updateRewardData(
                rewardConfig,
                rewardsInput[i].totalSupply,
                10 ** decimals
            );

            // Configure emission parameters
            uint88 oldEmissionsPerSecond = rewardConfig.emissionPerSecond;
            uint32 oldDistributionEnd = rewardConfig.distributionEnd;
            rewardConfig.emissionPerSecond = rewardsInput[i].emissionPerSecond;
            rewardConfig.distributionEnd = rewardsInput[i].distributionEnd;

            emit AssetConfigUpdated(
                rewardsInput[i].asset,
                rewardsInput[i].reward,
                oldEmissionsPerSecond,
                rewardsInput[i].emissionPerSecond,
                oldDistributionEnd,
                rewardsInput[i].distributionEnd,
                newIndex
            );
        }
    }

    /**
     * @dev Update reward data and calculate new index
     * @param rewardData Storage pointer to reward configuration
     * @param totalSupply Current total supply of the asset
     * @param assetUnit One unit of the asset (10^decimals)
     * @return newIndex The updated index
     * @return indexUpdated Whether the index was updated
     */
    function _updateRewardData(
        RewardsDataTypes.RewardData storage rewardData,
        uint256 totalSupply,
        uint256 assetUnit
    ) internal returns (uint256, bool) {
        (uint256 oldIndex, uint256 newIndex) = _getAssetIndex(
            rewardData,
            totalSupply,
            assetUnit
        );
        
        bool indexUpdated;
        if (newIndex != oldIndex) {
            if (newIndex > type(uint104).max) revert IndexOverflow();
            indexUpdated = true;
            rewardData.index = uint104(newIndex);
            rewardData.lastUpdateTimestamp = uint32(block.timestamp);
        } else {
            rewardData.lastUpdateTimestamp = uint32(block.timestamp);
        }

        return (newIndex, indexUpdated);
    }

    /**
     * @dev Update user reward data
     * @param rewardData Storage pointer to reward configuration
     * @param user User address
     * @param userBalance User's scaled balance
     * @param newAssetIndex Updated asset index
     * @param assetUnit One unit of the asset (10^decimals)
     * @return rewardsAccrued Rewards accrued since last update
     * @return dataUpdated Whether user data was updated
     */
    function _updateUserData(
        RewardsDataTypes.RewardData storage rewardData,
        address user,
        uint256 userBalance,
        uint256 newAssetIndex,
        uint256 assetUnit
    ) internal returns (uint256, bool) {
        uint256 userIndex = rewardData.usersData[user].index;
        uint256 rewardsAccrued;
        bool dataUpdated;
        
        if ((dataUpdated = userIndex != newAssetIndex)) {
            rewardData.usersData[user].index = uint104(newAssetIndex);
            if (userBalance != 0) {
                rewardsAccrued = _getRewards(
                    userBalance,
                    newAssetIndex,
                    userIndex,
                    assetUnit
                );
                rewardData.usersData[user].accrued += uint128(rewardsAccrued);
            }
        }
        return (rewardsAccrued, dataUpdated);
    }

    /**
     * @dev Update all reward data for a user on an asset
     * @param asset The incentivized asset
     * @param user User address
     * @param userBalance User's current balance
     * @param totalSupply Current total supply
     */
    function _updateData(
        address asset,
        address user,
        uint256 userBalance,
        uint256 totalSupply
    ) internal {
        uint256 assetUnit;
        uint256 numAvailableRewards = _assets[asset].availableRewardsCount;
        
        unchecked {
            assetUnit = 10 ** _assets[asset].decimals;
        }

        if (numAvailableRewards == 0) {
            return;
        }

        unchecked {
            for (uint128 r = 0; r < numAvailableRewards; r++) {
                address reward = _assets[asset].availableRewards[r];
                RewardsDataTypes.RewardData storage rewardData = _assets[asset].rewards[reward];

                (uint256 newAssetIndex, bool rewardDataUpdated) = _updateRewardData(
                    rewardData,
                    totalSupply,
                    assetUnit
                );

                (uint256 rewardsAccrued, bool userDataUpdated) = _updateUserData(
                    rewardData,
                    user,
                    userBalance,
                    newAssetIndex,
                    assetUnit
                );

                if (rewardDataUpdated || userDataUpdated) {
                    emit Accrued(
                        asset,
                        reward,
                        user,
                        newAssetIndex,
                        newAssetIndex,
                        rewardsAccrued
                    );
                }
            }
        }
    }

    /**
     * @dev Update data for multiple assets
     * @param user User address
     * @param userAssetBalances Array of user's asset balances
     */
    function _updateDataMultiple(
        address user,
        RewardsDataTypes.UserAssetBalance[] memory userAssetBalances
    ) internal {
        for (uint256 i = 0; i < userAssetBalances.length; i++) {
            _updateData(
                userAssetBalances[i].asset,
                user,
                userAssetBalances[i].userBalance,
                userAssetBalances[i].totalSupply
            );
        }
    }

    /**
     * @dev Calculate user's total rewards across assets
     * @param user User address
     * @param reward Reward token address
     * @param userAssetBalances Array of user's asset balances
     * @return unclaimedRewards Total unclaimed rewards
     */
    function _getUserReward(
        address user,
        address reward,
        RewardsDataTypes.UserAssetBalance[] memory userAssetBalances
    ) internal view returns (uint256 unclaimedRewards) {
        for (uint256 i = 0; i < userAssetBalances.length; i++) {
            if (userAssetBalances[i].userBalance == 0) {
                unclaimedRewards += _assets[userAssetBalances[i].asset]
                    .rewards[reward]
                    .usersData[user]
                    .accrued;

            } else {
                unclaimedRewards +=
                    _getPendingRewards(user, reward, userAssetBalances[i]) +
                    _assets[userAssetBalances[i].asset].rewards[reward].usersData[user].accrued;
            }
        }
        return unclaimedRewards;
    }

    /**
     * @dev Calculate pending rewards since last accrual
     * @param user User address
     * @param reward Reward token address
     * @param userAssetBalance User's asset balance data
     * @return Pending rewards
     */
    function _getPendingRewards(
        address user,
        address reward,
        RewardsDataTypes.UserAssetBalance memory userAssetBalance
    ) internal view returns (uint256) {
        RewardsDataTypes.RewardData storage rewardData = 
            _assets[userAssetBalance.asset].rewards[reward];
        uint256 assetUnit = 10 ** _assets[userAssetBalance.asset].decimals;
        (, uint256 nextIndex) = _getAssetIndex(
            rewardData,
            userAssetBalance.totalSupply,
            assetUnit
        );

        return _getRewards(
            userAssetBalance.userBalance,
            nextIndex,
            rewardData.usersData[user].index,
            assetUnit
        );
    }

    /**
     * @dev Calculate rewards based on index difference
     * @param userBalance User's balance
     * @param reserveIndex Current distribution index
     * @param userIndex User's last recorded index
     * @param assetUnit One unit of asset (10^decimals)
     * @return Reward amount
     */
    function _getRewards(
        uint256 userBalance,
        uint256 reserveIndex,
        uint256 userIndex,
        uint256 assetUnit
    ) internal pure returns (uint256) {
        uint256 result = userBalance * (reserveIndex - userIndex);
        assembly {
            result := div(result, assetUnit)
        }
        return result;
    }

    /**
     * @dev Calculate current and projected asset index
     * @param rewardData Storage pointer to reward data
     * @param totalSupply Current total supply
     * @param assetUnit One unit of asset (10^decimals)
     * @return oldIndex Current index
     * @return newIndex Projected index
     */
    function _getAssetIndex(
        RewardsDataTypes.RewardData storage rewardData,
        uint256 totalSupply,
        uint256 assetUnit
    ) internal view returns (uint256, uint256) {
        uint256 oldIndex = rewardData.index;
        uint256 distributionEnd = rewardData.distributionEnd;
        uint256 emissionPerSecond = rewardData.emissionPerSecond;
        uint256 lastUpdateTimestamp = rewardData.lastUpdateTimestamp;

        // No change if: no emission, no supply, already updated, or past end
        if (
            emissionPerSecond == 0 ||
            totalSupply == 0 ||
            lastUpdateTimestamp == block.timestamp ||
            lastUpdateTimestamp >= distributionEnd
        ) {
            return (oldIndex, oldIndex);
        }

        uint256 currentTimestamp = block.timestamp > distributionEnd
            ? distributionEnd
            : block.timestamp;
        uint256 timeDelta = currentTimestamp - lastUpdateTimestamp;
        uint256 firstTerm = emissionPerSecond * timeDelta * assetUnit;
        
        assembly {
            firstTerm := div(firstTerm, totalSupply)
        }
        
        return (oldIndex, (firstTerm + oldIndex));
    }

    /**
     * @dev Get user asset balances
     * @param assets Array of asset addresses
     * @param user User address
     * @return Array of user asset balances
     */
    function _getUserAssetBalances(
        address[] calldata assets,
        address user
    ) internal view virtual returns (RewardsDataTypes.UserAssetBalance[] memory) {
        RewardsDataTypes.UserAssetBalance[] memory balances = 
            new RewardsDataTypes.UserAssetBalance[](assets.length);
        
        for (uint256 i = 0; i < assets.length; i++) {
            balances[i] = RewardsDataTypes.UserAssetBalance({
                asset: assets[i],
                userBalance: IScaledBalanceToken(assets[i]).scaledBalanceOf(user),
                totalSupply: IScaledBalanceToken(assets[i]).scaledTotalSupply()
            });
        }
        
        return balances;
    }

    /**
     * @dev Get asset decimals
     * @param asset Asset address
     * @return Decimal places
     */
    function _getAssetDecimals(address asset) internal view returns (uint8) {
        return IERC20Metadata(asset).decimals();
    }

    // ============ Upgrade Authorization ============

    /**
     * @notice Authorize contract upgrades
     * @dev Only owner can upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        virtual
        override
        onlyOwner
    {
        emit Upgraded(newImplementation);
    }
}

/**
 * @title IERC20Metadata
 * @notice Interface for ERC20 metadata
 */
interface IERC20Metadata {
    function decimals() external view returns (uint8);
}
