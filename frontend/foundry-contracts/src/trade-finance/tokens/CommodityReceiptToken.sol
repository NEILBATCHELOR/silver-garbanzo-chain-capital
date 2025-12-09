// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {WadRayMath} from "../libraries/math/WadRayMath.sol";
import {ICommodityToken} from "../interfaces/ICommodityToken.sol";

interface ICommodityLendingPool {
    function getReserveNormalizedIncome(address asset) external view returns (uint256);
}

/**
 * @title CommodityReceiptToken
 * @notice Receipt token representing supplied commodity collateral
 * @dev Auto-rebases based on liquidity index to reflect accrued value
 * Similar to Chain Capital's aToken but for commodity-specific use cases
 */
contract CommodityReceiptToken is ICommodityToken {
    using WadRayMath for uint256;
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice The Pool contract address
    address public immutable POOL;

    /// @notice The underlying commodity token address
    address public immutable UNDERLYING_COMMODITY;

    /// @notice Token metadata
    string private _name;
    string private _symbol;
    uint8 private constant DECIMALS = 18;

    /// @notice Scaled balances (stored as scaled down by liquidity index)
    mapping(address => uint256) private _scaledBalances;

    /// @notice Scaled total supply
    uint256 private _scaledTotalSupply;

    /// @notice Allowances
    mapping(address => mapping(address => uint256)) private _allowances;

    /// @notice User state for tracking last index
    mapping(address => uint128) private _userLastIndex;

    // ============ Errors ============

    error OnlyPool();
    error InvalidMintAmount();
    error InvalidBurnAmount();
    error TransferExceedsBalance();
    error ApprovalFailed();

    // ============ Modifiers ============

    modifier onlyPool() {
        if (msg.sender != POOL) revert OnlyPool();
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Constructor
     * @param pool The pool contract address
     * @param underlyingCommodity The underlying commodity token
     * @param tokenName The cToken name
     * @param tokenSymbol The cToken symbol
     */
    constructor(
        address pool,
        address underlyingCommodity,
        string memory tokenName,
        string memory tokenSymbol
    ) {
        POOL = pool;
        UNDERLYING_COMMODITY = underlyingCommodity;
        _name = tokenName;
        _symbol = tokenSymbol;
    }

    // ============ ERC20 Standard Functions ============

    /**
     * @notice Returns the name of the token
     * @return The token name
     */
    function name() public view returns (string memory) {
        return _name;
    }

    /**
     * @notice Returns the symbol of the token
     * @return The token symbol
     */
    function symbol() public view returns (string memory) {
        return _symbol;
    }

    /**
     * @notice Returns the decimals of the token
     * @return The token decimals
     */
    function decimals() public pure returns (uint8) {
        return DECIMALS;
    }

    /// @inheritdoc IERC20
    function totalSupply() public view override returns (uint256) {
        uint256 currentIndex = _getPoolLiquidityIndex();
        
        if (currentIndex == 0) {
            return 0;
        }

        return _scaledTotalSupply.rayMul(currentIndex);
    }

    /// @inheritdoc IERC20
    function balanceOf(address account) public view override returns (uint256) {
        uint256 scaledBalance = _scaledBalances[account];
        
        if (scaledBalance == 0) {
            return 0;
        }

        uint256 currentIndex = _getPoolLiquidityIndex();
        return scaledBalance.rayMul(currentIndex);
    }

    /// @inheritdoc IERC20
    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @inheritdoc IERC20
    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @inheritdoc IERC20
    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /// @inheritdoc IERC20
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external override returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) revert TransferExceedsBalance();
            unchecked {
                _approve(from, msg.sender, currentAllowance - amount);
            }
        }

        _transfer(from, to, amount);
        return true;
    }

    // ============ Scaled Balance Functions ============

    /**
     * @notice Returns the scaled balance of the user
     * @param user The address of the user
     * @return The scaled balance
     */
    function scaledBalanceOf(address user) external view returns (uint256) {
        return _scaledBalances[user];
    }

    /**
     * @notice Returns the scaled balance and total supply
     * @param user The address of the user
     * @return userScaledBalance The scaled balance of user
     * @return totalScaledSupply The scaled total supply
     */
    function getScaledUserBalanceAndSupply(
        address user
    ) external view returns (uint256 userScaledBalance, uint256 totalScaledSupply) {
        return (_scaledBalances[user], _scaledTotalSupply);
    }

    /**
     * @notice Returns the scaled total supply
     * @return The scaled total supply
     */
    function scaledTotalSupply() public view returns (uint256) {
        return _scaledTotalSupply;
    }

    /**
     * @notice Returns the previous index of a user
     * @param user The address of the user
     * @return The user's previous index
     */
    function getPreviousIndex(address user) external view returns (uint256) {
        return _userLastIndex[user];
    }

    // ============ Pool-Only Functions ============

    /**
     * @notice Mints cTokens to a user
     * @param caller The address performing the mint
     * @param onBehalfOf The address receiving the minted tokens
     * @param amount The amount being minted (in underlying units)
     * @param index The current liquidity index
     * @return bool True if previous balance was zero
     */
    function mint(
        address caller,
        address onBehalfOf,
        uint256 amount,
        uint256 index
    ) external onlyPool returns (bool) {
        return _mintScaled(caller, onBehalfOf, amount, index);
    }

    /**
     * @notice Burns cTokens from a user
     * @param from The address being burned from
     * @param receiverOfUnderlying The address receiving the underlying commodity
     * @param amount The amount being burned (in underlying units)
     * @param index The current liquidity index
     */
    function burn(
        address from,
        address receiverOfUnderlying,
        uint256 amount,
        uint256 index
    ) external onlyPool {
        _burnScaled(from, receiverOfUnderlying, amount, index);
    }

    /**
     * @notice Transfers underlying commodity to destination
     * @dev Only callable by Pool during burn
     * @param target The recipient of the underlying
     * @param amount The amount being transferred
     */
    function transferUnderlyingTo(address target, uint256 amount) external onlyPool {
        IERC20(UNDERLYING_COMMODITY).safeTransfer(target, amount);
    }

    /**
     * @notice Transfers tokens on liquidation
     * @dev Only callable by Pool during liquidation
     * @param from The address being liquidated
     * @param to The liquidator address
     * @param value The amount to transfer
     */
    function transferOnLiquidation(
        address from,
        address to,
        uint256 value
    ) external onlyPool {
        _transfer(from, to, value);
    }

    /**
     * @notice Returns the underlying commodity token address
     * @return The commodity token address
     */
    function UNDERLYING_ASSET_ADDRESS() external view returns (address) {
        return UNDERLYING_COMMODITY;
    }

    // ============ Internal Functions ============

    /**
     * @dev Mints scaled tokens
     * @param caller The caller of the mint
     * @param onBehalfOf The recipient
     * @param amount The amount to mint (in underlying units)
     * @param index The current liquidity index
     * @return bool True if previous balance was zero
     */
    function _mintScaled(
        address caller,
        address onBehalfOf,
        uint256 amount,
        uint256 index
    ) internal returns (bool) {
        uint256 amountScaled = amount.rayDiv(index);
        if (amountScaled == 0) revert InvalidMintAmount();

        uint256 scaledBalance = _scaledBalances[onBehalfOf];
        uint256 balanceIncrease = _calculateBalanceIncrease(onBehalfOf, index);

        _userLastIndex[onBehalfOf] = uint128(index);

        _scaledBalances[onBehalfOf] = scaledBalance + amountScaled;
        _scaledTotalSupply += amountScaled;

        emit Mint(caller, onBehalfOf, amount, balanceIncrease, index);
        emit Transfer(address(0), onBehalfOf, amount);

        return scaledBalance == 0;
    }

    /**
     * @dev Burns scaled tokens
     * @param from The address being burned from
     * @param receiverOfUnderlying The receiver of underlying
     * @param amount The amount to burn (in underlying units)
     * @param index The current liquidity index
     */
    function _burnScaled(
        address from,
        address receiverOfUnderlying,
        uint256 amount,
        uint256 index
    ) internal {
        uint256 amountScaled = amount.rayDiv(index);
        if (amountScaled == 0) revert InvalidBurnAmount();

        uint256 scaledBalance = _scaledBalances[from];
        uint256 balanceIncrease = _calculateBalanceIncrease(from, index);

        _userLastIndex[from] = uint128(index);

        _scaledBalances[from] = scaledBalance - amountScaled;
        _scaledTotalSupply -= amountScaled;

        emit Burn(from, receiverOfUnderlying, amount, balanceIncrease, index);
        emit Transfer(from, address(0), amount);
    }

    /**
     * @dev Transfers tokens between accounts
     * @param from The sender
     * @param to The recipient
     * @param amount The amount to transfer
     */
    function _transfer(address from, address to, uint256 amount) internal {
        if (from == address(0) || to == address(0)) revert TransferExceedsBalance();

        uint256 currentIndex = _getPoolLiquidityIndex();

        uint256 fromBalanceIncrease = _calculateBalanceIncrease(from, currentIndex);
        uint256 toBalanceIncrease = _calculateBalanceIncrease(to, currentIndex);

        uint256 amountScaled = amount.rayDiv(currentIndex);
        
        uint256 fromScaledBalance = _scaledBalances[from];
        if (fromScaledBalance < amountScaled) revert TransferExceedsBalance();

        _userLastIndex[from] = uint128(currentIndex);
        _userLastIndex[to] = uint128(currentIndex);

        _scaledBalances[from] = fromScaledBalance - amountScaled;
        _scaledBalances[to] += amountScaled;

        emit Transfer(from, to, amount);
    }

    /**
     * @dev Approves spending
     * @param owner The token owner
     * @param spender The spender
     * @param amount The approval amount
     */
    function _approve(address owner, address spender, uint256 amount) internal {
        if (owner == address(0) || spender == address(0)) revert ApprovalFailed();

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Calculates balance increase since last update
     * @param user The user address
     * @param currentIndex The current liquidity index
     * @return The balance increase
     */
    function _calculateBalanceIncrease(
        address user,
        uint256 currentIndex
    ) internal view returns (uint256) {
        uint256 scaledBalance = _scaledBalances[user];
        if (scaledBalance == 0) {
            return 0;
        }

        uint256 previousIndex = _userLastIndex[user];
        if (previousIndex == 0) {
            return 0;
        }

        return scaledBalance.rayMul(currentIndex) - scaledBalance.rayMul(previousIndex);
    }

    /**
     * @dev Gets current liquidity index from Pool
     * @return The current liquidity index
     */
    function _getPoolLiquidityIndex() internal view returns (uint256) {
        return ICommodityLendingPool(POOL).getReserveNormalizedIncome(UNDERLYING_COMMODITY);
    }
}
