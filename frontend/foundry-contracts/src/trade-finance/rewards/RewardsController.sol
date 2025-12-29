// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {RewardsDistributor} from "./RewardsDistributor.sol";
import {IRewardsController} from "./interfaces/IRewardsController.sol";
import {ITransferStrategyBase} from "./interfaces/ITransferStrategyBase.sol";
import {IScaledBalanceToken} from "../interfaces/IScaledBalanceToken.sol";
import {RewardsDataTypes} from "./libraries/RewardsDataTypes.sol";

/**
 * @title RewardsController
 * @notice Main contract for managing reward distribution and claiming
 * @dev Extends RewardsDistributor with claim functionality and authorized claimers
 * Supports multiple reward tokens per asset for flexible liquidity mining
 */
contract RewardsController is RewardsDistributor, IRewardsController {
    // ============ Storage ============

    /// @notice Mapping of users to their authorized claimers
    mapping(address => address) internal _authorizedClaimers;

    /// @notice Mapping of reward tokens to their transfer strategies
    mapping(address => ITransferStrategyBase) internal _transferStrategy;

    /// @notice Mapping of reward tokens to their price oracles
    mapping(address => address) internal _rewardOracle;

    // ============ Errors ============

    error ClaimerUnauthorized();
    error InvalidToAddress();
    error InvalidUserAddress();
    error StrategyCannotBeZero();
    error StrategyMustBeContract();
    error OracleMustReturnPrice();
    error TransferError();

    // ============ Modifiers ============

    modifier onlyAuthorizedClaimers(address claimer, address user) {
        if (_authorizedClaimers[user] != claimer) revert ClaimerUnauthorized();
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Constructor
     * @param emissionManager Address of the emission manager
     */
    constructor(address emissionManager) RewardsDistributor(emissionManager) {}

    // ============ View Functions ============

    /// @inheritdoc IRewardsController
    function getClaimer(address user) external view override returns (address) {
        return _authorizedClaimers[user];
    }

    /// @inheritdoc IRewardsController
    function getRewardOracle(address reward) external view override returns (address) {
        return _rewardOracle[reward];
    }

    /// @inheritdoc IRewardsController
    function getTransferStrategy(address reward) external view override returns (address) {
        return address(_transferStrategy[reward]);
    }

    // ============ Configuration Functions ============

    /// @inheritdoc IRewardsController
    function configureAssets(
        RewardsDataTypes.RewardsConfigInput[] memory config
    ) external override onlyEmissionManager {
        for (uint256 i = 0; i < config.length; i++) {
            // Get current scaled total supply
            config[i].totalSupply = IScaledBalanceToken(config[i].asset).scaledTotalSupply();

            // Install transfer strategy
            _installTransferStrategy(config[i].reward, address(config[i].transferStrategy));

            // Set reward oracle
            _setRewardOracle(config[i].reward, config[i].rewardOracle);
        }
        _configureAssets(config);
    }

    /// @inheritdoc IRewardsController
    function setTransferStrategy(
        address reward,
        ITransferStrategyBase transferStrategy
    ) external override onlyEmissionManager {
        _installTransferStrategy(reward, address(transferStrategy));
    }

    /// @inheritdoc IRewardsController
    function setRewardOracle(
        address reward,
        address rewardOracle
    ) external override onlyEmissionManager {
        _setRewardOracle(reward, rewardOracle);
    }

    // ============ Action Handler ============

    /// @inheritdoc IRewardsController
    function handleAction(
        address user,
        uint256 totalSupply,
        uint256 userBalance
    ) external override {
        _updateData(msg.sender, user, userBalance, totalSupply);
    }

    // ============ Claimer Functions ============

    /// @inheritdoc IRewardsController
    function setClaimer(address user, address claimer) external override onlyEmissionManager {
        if (user == address(0)) revert InvalidUserAddress();
        _authorizedClaimers[user] = claimer;
        emit ClaimerSet(user, claimer);
    }

    // ============ Claim Functions ============

    /// @inheritdoc IRewardsController
    function claimRewards(
        address[] calldata assets,
        uint256 amount,
        address to,
        address reward
    ) external override returns (uint256) {
        if (to == address(0)) revert InvalidToAddress();
        return _claimRewards(assets, amount, msg.sender, msg.sender, to, reward);
    }

    /// @inheritdoc IRewardsController
    function claimRewardsOnBehalf(
        address[] calldata assets,
        uint256 amount,
        address user,
        address to,
        address reward
    ) external override onlyAuthorizedClaimers(msg.sender, user) returns (uint256) {
        if (user == address(0)) revert InvalidUserAddress();
        if (to == address(0)) revert InvalidToAddress();
        return _claimRewards(assets, amount, msg.sender, user, to, reward);
    }

    /// @inheritdoc IRewardsController
    function claimRewardsToSelf(
        address[] calldata assets,
        uint256 amount,
        address reward
    ) external override returns (uint256) {
        return _claimRewards(assets, amount, msg.sender, msg.sender, msg.sender, reward);
    }

    /// @inheritdoc IRewardsController
    function claimAllRewards(
        address[] calldata assets,
        address to
    ) external override returns (address[] memory rewardsList, uint256[] memory claimedAmounts) {
        if (to == address(0)) revert InvalidToAddress();
        return _claimAllRewards(assets, msg.sender, msg.sender, to);
    }

    /// @inheritdoc IRewardsController
    function claimAllRewardsOnBehalf(
        address[] calldata assets,
        address user,
        address to
    ) external override onlyAuthorizedClaimers(msg.sender, user) returns (
        address[] memory rewardsList,
        uint256[] memory claimedAmounts
    ) {
        if (user == address(0)) revert InvalidUserAddress();
        if (to == address(0)) revert InvalidToAddress();
        return _claimAllRewards(assets, msg.sender, user, to);
    }

    /// @inheritdoc IRewardsController
    function claimAllRewardsToSelf(
        address[] calldata assets
    ) external override returns (address[] memory rewardsList, uint256[] memory claimedAmounts) {
        return _claimAllRewards(assets, msg.sender, msg.sender, msg.sender);
    }

    // ============ Internal Functions ============

    /**
     * @dev Internal claim rewards for a specific reward token
     * @param assets Array of incentivized assets
     * @param amount Amount to claim (max uint256 for all)
     * @param claimer The address initiating the claim
     * @param user The user whose rewards are being claimed
     * @param to The recipient of the rewards
     * @param reward The reward token to claim
     * @return totalRewards Amount of rewards claimed
     */
    function _claimRewards(
        address[] calldata assets,
        uint256 amount,
        address claimer,
        address user,
        address to,
        address reward
    ) internal returns (uint256 totalRewards) {
        if (amount == 0) return 0;

        RewardsDataTypes.UserAssetBalance[] memory userAssetBalances = 
            _getUserAssetBalances(assets, user);

        for (uint256 i = 0; i < userAssetBalances.length; i++) {
            address asset = userAssetBalances[i].asset;
            uint256 userBalance = userAssetBalances[i].userBalance;
            uint256 totalSupply = userAssetBalances[i].totalSupply;
            
            _updateData(asset, user, userBalance, totalSupply);
            
            RewardsDataTypes.RewardData storage rewardData = _assets[asset].rewards[reward];
            uint256 accrued = rewardData.usersData[user].accrued;
            
            if (accrued != 0) {
                uint256 amountToClaim = accrued > (amount - totalRewards) 
                    ? (amount - totalRewards) 
                    : accrued;
                    
                rewardData.usersData[user].accrued = uint128(accrued - amountToClaim);
                totalRewards += amountToClaim;
                
                if (totalRewards >= amount) break;
            }
        }

        if (totalRewards > 0) {
            _transferRewards(to, reward, totalRewards);
            emit RewardsClaimed(user, reward, to, claimer, totalRewards);
        }
        
        return totalRewards;
    }

    /**
     * @dev Internal claim all rewards across all reward tokens
     * @param assets Array of incentivized assets
     * @param claimer The address initiating the claim
     * @param user The user whose rewards are being claimed
     * @param to The recipient of the rewards
     * @return rewardsList Array of reward tokens claimed
     * @return claimedAmounts Array of amounts claimed per reward token
     */
    function _claimAllRewards(
        address[] calldata assets,
        address claimer,
        address user,
        address to
    ) internal returns (address[] memory rewardsList, uint256[] memory claimedAmounts) {
        uint256 rewardsListLength = _rewardsList.length;
        rewardsList = new address[](rewardsListLength);
        claimedAmounts = new uint256[](rewardsListLength);

        RewardsDataTypes.UserAssetBalance[] memory userAssetBalances = 
            _getUserAssetBalances(assets, user);

        // Update all asset data
        _updateDataMultiple(user, userAssetBalances);

        // Iterate through each reward token
        for (uint256 r = 0; r < rewardsListLength; r++) {
            address reward = _rewardsList[r];
            uint256 totalClaimed;

            // Sum accrued rewards across all assets
            for (uint256 i = 0; i < userAssetBalances.length; i++) {
                address asset = userAssetBalances[i].asset;
                RewardsDataTypes.RewardData storage rewardData = _assets[asset].rewards[reward];
                uint256 accrued = rewardData.usersData[user].accrued;
                
                if (accrued != 0) {
                    rewardData.usersData[user].accrued = 0;
                    totalClaimed += accrued;
                }
            }

            rewardsList[r] = reward;
            claimedAmounts[r] = totalClaimed;

            if (totalClaimed > 0) {
                _transferRewards(to, reward, totalClaimed);
                emit RewardsClaimed(user, reward, to, claimer, totalClaimed);
            }
        }

        return (rewardsList, claimedAmounts);
    }

    /**
     * @dev Transfer rewards using the configured transfer strategy
     * @param to Recipient address
     * @param reward Reward token address
     * @param amount Amount to transfer
     */
    function _transferRewards(address to, address reward, uint256 amount) internal {
        ITransferStrategyBase strategy = _transferStrategy[reward];
        if (address(strategy) == address(0)) revert StrategyCannotBeZero();
        
        bool success = strategy.performTransfer(to, reward, amount);
        if (!success) revert TransferError();
    }

    /**
     * @dev Install transfer strategy for a reward token
     * @param reward Reward token address
     * @param transferStrategy Strategy contract address
     */
    function _installTransferStrategy(address reward, address transferStrategy) internal {
        if (transferStrategy == address(0)) revert StrategyCannotBeZero();
        
        uint256 size;
        assembly {
            size := extcodesize(transferStrategy)
        }
        if (size == 0) revert StrategyMustBeContract();
        
        _transferStrategy[reward] = ITransferStrategyBase(transferStrategy);
        emit TransferStrategyInstalled(reward, transferStrategy);
    }

    /**
     * @dev Set reward oracle for a reward token
     * @param reward Reward token address
     * @param rewardOracle Oracle address
     */
    function _setRewardOracle(address reward, address rewardOracle) internal {
        // Validate oracle returns a price
        if (rewardOracle != address(0)) {
            // Try to get price, will revert if oracle invalid
            try IAggregator(rewardOracle).latestAnswer() returns (int256 price) {
                if (price <= 0) revert OracleMustReturnPrice();
            } catch {
                revert OracleMustReturnPrice();
            }
        }
        
        _rewardOracle[reward] = rewardOracle;
        emit RewardOracleUpdated(reward, rewardOracle);
    }

    /**
     * @dev Override to implement user asset balance retrieval
     * @param assets Array of asset addresses
     * @param user User address
     * @return Array of user asset balances
     */
    function _getUserAssetBalances(
        address[] calldata assets,
        address user
    ) internal view override returns (RewardsDataTypes.UserAssetBalance[] memory) {
        RewardsDataTypes.UserAssetBalance[] memory userAssetBalances = 
            new RewardsDataTypes.UserAssetBalance[](assets.length);
            
        for (uint256 i = 0; i < assets.length; i++) {
            userAssetBalances[i].asset = assets[i];
            userAssetBalances[i].userBalance = IScaledBalanceToken(assets[i]).scaledBalanceOf(user);
            userAssetBalances[i].totalSupply = IScaledBalanceToken(assets[i]).scaledTotalSupply();
        }
        
        return userAssetBalances;
    }
}

/**
 * @title IAggregator
 * @notice Minimal interface for Chainlink aggregator
 */
interface IAggregator {
    function latestAnswer() external view returns (int256);
}
