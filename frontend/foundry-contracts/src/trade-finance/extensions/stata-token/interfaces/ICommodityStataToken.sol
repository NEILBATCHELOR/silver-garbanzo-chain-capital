// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICommodityStataToken
 * @notice Interface for ERC4626 vault wrapper for commodity receipt tokens
 * @dev Extends ERC4626 to provide yield-bearing wrappers for cTokens
 */
interface ICommodityStataToken is IERC4626 {
    
    // ============ Structs ============
    
    /**
     * @notice Signature parameters for permit functions
     */
    struct SignatureParams {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    
    // ============ Events ============
    
    // Note: Paused and Unpaused events inherited from OpenZeppelin PausableUpgradeable
    event CommodityTypeSet(bytes32 indexed commodityType);
    
    // ============ Errors ============
    
    error OnlyPauseGuardian(address caller);
    error PoolAddressMismatch(address expectedPool);
    error InvalidCommodityType();
    
    // ============ View Functions ============
    
    /**
     * @notice Returns the underlying commodity receipt token (cToken) address
     * @return The cToken address
     */
    function cToken() external view returns (address);
    
    /**
     * @notice Returns the underlying commodity asset address
     * @return The commodity token address
     */
    function underlying() external view returns (address);
    
    /**
     * @notice Returns the commodity type (e.g., "GOLD", "OIL", "WHEAT")
     * @return The commodity type identifier
     */
    function commodityType() external view returns (bytes32);
    
    /**
     * @notice Check if a user can pause the contract
     * @param actor The address to check
     * @return True if the actor can pause
     */
    function canPause(address actor) external view returns (bool);
    
    /**
     * @notice Check if the contract is paused
     * @return True if paused
     */
    function paused() external view returns (bool);
    
    /**
     * @notice Get the current exchange rate (cToken to StataToken)
     * @return The exchange rate in RAY units (1e27)
     */
    function getExchangeRate() external view returns (uint256);
    
    /**
     * @notice Get accumulated rewards for a user
     * @param user The user address
     * @return rewardTokens Array of reward token addresses
     * @return rewardAmounts Array of reward amounts
     */
    function getUserRewards(address user) external view returns (
        address[] memory rewardTokens,
        uint256[] memory rewardAmounts
    );
    
    // ============ State-Changing Functions ============
    
    /**
     * @notice Deposit cTokens directly
     * @param assets Amount of cTokens to deposit
     * @param receiver Address receiving the StataTokens
     * @return shares Amount of StataTokens minted
     */
    function depositCTokens(
        uint256 assets,
        address receiver
    ) external returns (uint256 shares);
    
    /**
     * @notice Deposit with permit
     * @param assets Amount to deposit
     * @param receiver Address receiving the StataTokens
     * @param deadline Permit deadline
     * @param sig Signature parameters
     * @param depositToPool Whether to deposit underlying to pool first
     * @return shares Amount of StataTokens minted
     */
    function depositWithPermit(
        uint256 assets,
        address receiver,
        uint256 deadline,
        SignatureParams calldata sig,
        bool depositToPool
    ) external returns (uint256 shares);
    
    /**
     * @notice Redeem for cTokens directly
     * @param shares Amount of StataTokens to redeem
     * @param receiver Address receiving the cTokens
     * @param owner Owner of the StataTokens
     * @return assets Amount of cTokens received
     */
    function redeemCTokens(
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256 assets);
    
    /**
     * @notice Pause the contract (emergency only)
     * @param paused True to pause, false to unpause
     */
    function setPaused(bool paused) external;
    
    /**
     * @notice Claim accumulated rewards
     * @param receiver Address to receive rewards
     * @return rewardTokens Array of reward token addresses
     * @return rewardAmounts Array of reward amounts claimed
     */
    function claimRewards(address receiver) external returns (
        address[] memory rewardTokens,
        uint256[] memory rewardAmounts
    );
    
    /**
     * @notice Claim rewards on behalf of another user (if authorized)
     * @param user User to claim for
     * @param receiver Address to receive rewards
     * @return rewardTokens Array of reward token addresses
     * @return rewardAmounts Array of reward amounts claimed
     */
    function claimRewardsOnBehalf(
        address user,
        address receiver
    ) external returns (
        address[] memory rewardTokens,
        uint256[] memory rewardAmounts
    );
}
