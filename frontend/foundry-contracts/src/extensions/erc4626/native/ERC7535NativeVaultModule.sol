// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "./interfaces/IERC7535NativeVault.sol";
import "./storage/NativeVaultStorage.sol";

/**
 * @title IWETH
 * @notice Minimal WETH interface for wrapping/unwrapping
 */
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

/**
 * @title ERC7535NativeVaultModule
 * @notice ERC-7535 implementation for native ETH vault deposits/withdrawals
 * @dev Wraps ETH → WETH internally for ERC-4626 compatibility
 * 
 * Gas Savings vs Standard Flow:
 * - Standard: User wraps ETH (~40K gas) + approve WETH (~45K gas) = 85K gas overhead
 * - Native: Module handles wrapping internally = 0 gas overhead for user
 * 
 * User Experience Benefits:
 * - No WETH needed
 * - No ERC-20 approvals
 * - Direct ETH deposits/withdrawals
 * - Simpler frontend integration
 * 
 * Technical Flow:
 * 1. depositNative{value: 1 ether}() → Wrap ETH → Deposit WETH → Mint shares
 * 2. redeemNative() → Burn shares → Withdraw WETH → Unwrap ETH → Send ETH
 */
contract ERC7535NativeVaultModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC7535NativeVault,
    NativeVaultStorage
{
    using SafeERC20 for IERC20;
    
    // ============ Roles ============
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ State Variables ============
    IERC4626 public vault;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize native vault module
     * @param admin Admin address
     * @param vault_ The ERC-4626 vault address (must use WETH as asset)
     * @param weth_ WETH contract address
     * @param acceptNativeToken_ Enable native ETH deposits
     * @param unwrapOnWithdrawal_ Automatically unwrap to ETH on withdrawal
     */
    function initialize(
        address admin,
        address vault_,
        address weth_,
        bool acceptNativeToken_,
        bool unwrapOnWithdrawal_
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        vault = IERC4626(vault_);
        _weth = weth_;
        _acceptNativeToken = acceptNativeToken_;
        _unwrapOnWithdrawal = unwrapOnWithdrawal_;
        
        // Verify vault uses WETH as asset
        if (vault.asset() != weth_) revert NotNativeVault();
    }
    
    // ============ Native ETH Deposit/Mint Functions ============
    
    /**
     * @notice Deposit native ETH and receive vault shares
     * @dev Wraps ETH → WETH, then deposits into vault
     * @param receiver Address to receive shares
     * @return shares Amount of shares minted
     */
    function depositNative(address receiver) external payable override returns (uint256 shares) {
        if (!_acceptNativeToken) revert NativeTokenNotAccepted();
        if (msg.value == 0) revert InsufficientEthSent();
        
        // Wrap ETH to WETH
        IWETH(_weth).deposit{value: msg.value}();
        
        // Approve vault to spend WETH
        IWETH(_weth).approve(address(vault), msg.value);
        
        // Deposit WETH into vault
        shares = vault.deposit(msg.value, receiver);
        
        emit NativeDeposit(msg.sender, receiver, msg.value, shares);
    }
    
    /**
     * @notice Mint exact shares by depositing ETH
     * @dev Calculates required ETH, wraps, and deposits
     * @param shares Exact amount of shares to mint
     * @param receiver Address to receive shares
     * @return ethAmount Amount of ETH consumed
     */
    function mintNative(uint256 shares, address receiver) external payable override returns (uint256 ethAmount) {
        // Calculate required ETH
        ethAmount = vault.previewMint(shares);
        
        if (msg.value < ethAmount) revert InsufficientEthSent();
        if (msg.value > ethAmount) revert ExcessEthSent();
        
        // Wrap ETH to WETH
        IWETH(_weth).deposit{value: ethAmount}();
        
        // Approve vault
        IWETH(_weth).approve(address(vault), ethAmount);
        
        // Mint shares
        vault.mint(shares, receiver);
        
        emit NativeMint(msg.sender, receiver, shares, ethAmount);
    }
    
    // ============ Native ETH Withdraw/Redeem Functions ============
    
    /**
     * @notice Withdraw native ETH by burning shares
     * @dev Burns shares → Withdraws WETH → Unwraps to ETH
     * @param ethAmount Amount of ETH to withdraw
     * @param receiver Address to receive ETH
     * @param owner Address that owns the shares
     * @return shares Amount of shares burned
     */
    function withdrawNative(
        uint256 ethAmount,
        address receiver,
        address owner
    ) external override returns (uint256 shares) {
        if (!_unwrapOnWithdrawal) revert UnwrapNotEnabled();
        
        // Calculate shares required
        shares = vault.previewWithdraw(ethAmount); burned
     */
    function withdrawNative(
        uint256 ethAmount,
        address receiver,
        address owner
    ) external override returns (uint256 shares) {
        // Calculate shares required
        shares = vault.previewWithdraw(ethAmount);
        
        // If not owner, transfer shares to this contract first
        if (msg.sender != owner) {
            IERC20(address(vault)).safeTransferFrom(owner, address(this), shares);
        }
        
        // Withdraw WETH from vault
        vault.withdraw(ethAmount, address(this), owner);
        
        // Unwrap WETH to ETH
        IWETH(_weth).withdraw(ethAmount);
        
        // Send ETH to receiver
        (bool success, ) = receiver.call{value: ethAmount}("");
        if (!success) revert EthTransferFailed();
        
        emit NativeWithdraw(msg.sender, receiver, owner, ethAmount, shares);
    }
    
    /**
     * @notice Redeem shares for native ETH
     * @dev Burns shares → Withdraws WETH → Unwraps to ETH
     * @param shares Amount of shares to burn
     * @param receiver Address to receive ETH
     * @param owner Address that owns the shares
     * @return ethAmount Amount of ETH received
     */
    function redeemNative(
        uint256 shares,
        address receiver,
        address owner
    ) external override returns (uint256 ethAmount) {
        if (!_unwrapOnWithdrawal) revert UnwrapNotEnabled();
        
        // If not owner, transfer shares to this contract first
        if (msg.sender != owner) {
            IERC20(address(vault)).safeTransferFrom(owner, address(this), shares);
        }
        
        // Redeem shares for WETH
        ethAmount = vault.redeem(shares, address(this), owner);
        
        // Unwrap WETH to ETH
        IWETH(_weth).withdraw(ethAmount);
        
        // Send ETH to receiver
        (bool success, ) = receiver.call{value: ethAmount}("");
        if (!success) revert EthTransferFailed();
        
        emit NativeRedeem(msg.sender, receiver, owner, shares, ethAmount);
    }
    
    // ============ View Functions ============
    
    function asset() external pure override returns (address) {
        return NATIVE_ETH;
    }
    
    function isNativeVault() external pure override returns (bool) {
        return true;
    }
    
    function weth() external view override returns (address) {
        return _weth;
    }
    
    function previewDepositNative(uint256 ethAmount) external view override returns (uint256 shares) {
        return vault.previewDeposit(ethAmount);
    }
    
    function previewMintNative(uint256 shares) external view override returns (uint256 ethAmount) {
        return vault.previewMint(shares);
    }
    
    function previewWithdrawNative(uint256 ethAmount) external view override returns (uint256 shares) {
        return vault.previewWithdraw(ethAmount);
    }
    
    function previewRedeemNative(uint256 shares) external view override returns (uint256 ethAmount) {
        return vault.previewRedeem(shares);
    }
    
    function maxDepositNative() external view override returns (uint256 maxEth) {
        return vault.maxDeposit(address(this));
    }
    
    function maxMintNative() external view override returns (uint256 maxShares) {
        return vault.maxMint(address(this));
    }
    
    function maxWithdrawNative(address owner) external view override returns (uint256 maxEth) {
        return vault.maxWithdraw(owner);
    }
    
    function maxRedeemNative(address owner) external view override returns (uint256 maxShares) {
        return vault.maxRedeem(owner);
    }
    
    /**
     * @notice Check if native token deposits are accepted
     */
    function acceptsNativeToken() external view returns (bool) {
        return _acceptNativeToken;
    }
    
    /**
     * @notice Check if automatic unwrapping is enabled on withdrawal
     */
    function unwrapsOnWithdrawal() external view returns (bool) {
        return _unwrapOnWithdrawal;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Enable/disable native token deposits
     */
    function setAcceptNativeToken(bool accept) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _acceptNativeToken = accept;
    }
    
    /**
     * @notice Enable/disable automatic unwrapping on withdrawal
     */
    function setUnwrapOnWithdrawal(bool unwrap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unwrapOnWithdrawal = unwrap;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
    
    // ============ Receive ETH ============
    
    /**
     * @notice Receive ETH (required for WETH unwrapping)
     */
    receive() external payable {}
}
