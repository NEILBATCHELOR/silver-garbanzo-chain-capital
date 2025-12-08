// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {WadRayMath} from "../libraries/math/WadRayMath.sol";
import {ICommodityLendingPool} from "../interfaces/ICommodityLendingPool.sol";
import {Errors} from "../libraries/helpers/Errors.sol";

/**
 * @title CommodityDebtToken
 * @notice Implements a debt token to track borrowing positions in the commodity lending pool
 * @dev Non-transferable token that represents debt owed by borrowers
 * Balance auto-rebases with accrued interest
 */
contract CommodityDebtToken is IERC20 {
    using WadRayMath for uint256;
    using SafeCast for uint256;

    // ============ State Variables ============

    ICommodityLendingPool public immutable POOL;
    address internal _underlyingAsset;
    
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    // Scaled balances (before interest multiplication)
    mapping(address => uint256) private _scaledBalances;
    uint256 private _scaledTotalSupply;

    // Borrow allowances for credit delegation
    mapping(address => mapping(address => uint256)) private _borrowAllowances;

    // ============ Events ============

    event Mint(
        address indexed from,
        address indexed onBehalfOf,
        uint256 value,
        uint256 balanceIncrease,
        uint256 index
    );

    event Burn(
        address indexed from,
        address indexed target,
        uint256 value,
        uint256 balanceIncrease,
        uint256 index
    );

    event BorrowAllowanceDelegated(
        address indexed fromUser,
        address indexed toUser,
        address indexed asset,
        uint256 amount
    );

    // ============ Modifiers ============

    modifier onlyPool() {
        require(msg.sender == address(POOL), Errors.CALLER_MUST_BE_POOL);
        _;
    }

    // ============ Constructor ============

    constructor(
        ICommodityLendingPool pool,
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) {
        POOL = pool;
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
    }

    // ============ ERC20 View Functions ============

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public view returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Returns the debt balance of user (includes accrued interest)
     * @param user The address of the user
     * @return The debt balance with interest
     */
    function balanceOf(address user) public view override returns (uint256) {
        uint256 scaledBalance = _scaledBalances[user];
        if (scaledBalance == 0) {
            return 0;
        }
        return scaledBalance.rayMul(POOL.getReserveNormalizedVariableDebt(_underlyingAsset));
    }

    /**
     * @notice Returns the scaled balance (without interest)
     * @param user The address of the user
     * @return The scaled balance
     */
    function scaledBalanceOf(address user) external view returns (uint256) {
        return _scaledBalances[user];
    }

    /**
     * @notice Returns total supply (includes accrued interest)
     * @return Total debt with interest
     */
    function totalSupply() public view override returns (uint256) {
        uint256 currentScaledTotalSupply = _scaledTotalSupply;
        if (currentScaledTotalSupply == 0) {
            return 0;
        }
        return currentScaledTotalSupply.rayMul(
            POOL.getReserveNormalizedVariableDebt(_underlyingAsset)
        );
    }

    /**
     * @notice Returns scaled total supply (without interest)
     * @return The scaled total supply
     */
    function scaledTotalSupply() external view returns (uint256) {
        return _scaledTotalSupply;
    }

    /**
     * @notice Returns the principal debt balance of user (excludes interest)
     * @param user The address of the user
     * @return The principal debt balance
     */
    function principalBalanceOf(address user) external view returns (uint256) {
        return _scaledBalances[user];
    }

    // ============ Mint & Burn Functions ============

    /**
     * @notice Mints debt token to the `onBehalfOf` address
     * @dev Only callable by the Pool
     * @param user The address receiving the borrowed underlying
     * @param onBehalfOf The address receiving the debt tokens
     * @param amount The amount being minted
     * @param index The variable debt index of the reserve
     * @return True if the previous balance was 0
     */
    function mint(
        address user,
        address onBehalfOf,
        uint256 amount,
        uint256 index
    ) external onlyPool returns (bool) {
        if (user != onBehalfOf) {
            _decreaseBorrowAllowance(onBehalfOf, user, amount);
        }

        uint256 previousBalance = balanceOf(onBehalfOf);
        uint256 amountScaled = amount.rayDiv(index);
        require(amountScaled != 0, Errors.INVALID_MINT_AMOUNT);

        uint256 balanceIncrease = balanceOf(onBehalfOf) - previousBalance;

        _scaledBalances[onBehalfOf] += amountScaled;
        _scaledTotalSupply += amountScaled;

        emit Transfer(address(0), onBehalfOf, amount);
        emit Mint(user, onBehalfOf, amount, balanceIncrease, index);

        return previousBalance == 0;
    }

    /**
     * @notice Burns user variable debt
     * @dev Only callable by the Pool
     * @param from The address from which the debt will be burned
     * @param amount The amount being burned
     * @param index The variable debt index of the reserve
     * @return The scaled total supply after burn
     */
    function burn(
        address from,
        uint256 amount,
        uint256 index
    ) external onlyPool returns (uint256) {
        uint256 amountScaled = amount.rayDiv(index);
        require(amountScaled != 0, Errors.INVALID_BURN_AMOUNT);

        uint256 balanceIncrease = balanceOf(from) - _scaledBalances[from].rayMul(index);

        _scaledBalances[from] -= amountScaled;
        _scaledTotalSupply -= amountScaled;

        emit Transfer(from, address(0), amount);
        emit Burn(from, address(0), amount, balanceIncrease, index);

        return _scaledTotalSupply;
    }

    // ============ Borrow Allowance Functions ============

    /**
     * @notice Approves delegation of borrowing power
     * @param delegatee The address to delegate borrowing power to
     * @param amount The amount of borrowing power to delegate
     */
    function approveDelegation(address delegatee, uint256 amount) external {
        _borrowAllowances[msg.sender][delegatee] = amount;
        emit BorrowAllowanceDelegated(msg.sender, delegatee, _underlyingAsset, amount);
    }

    /**
     * @notice Returns the borrow allowance of the user
     * @param fromUser The user delegating the borrowing power
     * @param toUser The user receiving the delegated borrowing power
     * @return The borrow allowance
     */
    function borrowAllowance(
        address fromUser,
        address toUser
    ) external view returns (uint256) {
        return _borrowAllowances[fromUser][toUser];
    }

    /**
     * @dev Decreases the borrow allowance of a user on the specific debt token
     * @param delegator The address delegating the borrowing power
     * @param delegatee The address receiving the delegated borrowing power
     * @param amount The amount to subtract from the current allowance
     */
    function _decreaseBorrowAllowance(
        address delegator,
        address delegatee,
        uint256 amount
    ) internal {
        uint256 newAllowance = _borrowAllowances[delegator][delegatee] - amount;
        _borrowAllowances[delegator][delegatee] = newAllowance;
        emit BorrowAllowanceDelegated(delegator, delegatee, _underlyingAsset, newAllowance);
    }

    // ============ Disabled ERC20 Functions ============
    // Debt tokens are non-transferable

    function transfer(address, uint256) external pure override returns (bool) {
        revert(Errors.OPERATION_NOT_SUPPORTED);
    }

    function allowance(address, address) external pure override returns (uint256) {
        revert(Errors.OPERATION_NOT_SUPPORTED);
    }

    function approve(address, uint256) external pure override returns (bool) {
        revert(Errors.OPERATION_NOT_SUPPORTED);
    }

    function transferFrom(address, address, uint256) external pure override returns (bool) {
        revert(Errors.OPERATION_NOT_SUPPORTED);
    }

    // ============ Admin Functions ============

    /**
     * @notice Initializes the debt token
     * @param underlyingAsset The address of the underlying asset
     */
    function initialize(address underlyingAsset) external {
        require(_underlyingAsset == address(0), "Already initialized");
        _underlyingAsset = underlyingAsset;
    }

    /**
     * @notice Returns the underlying asset
     * @return The address of the underlying asset
     */
    function UNDERLYING_ASSET_ADDRESS() external view returns (address) {
        return _underlyingAsset;
    }
}
