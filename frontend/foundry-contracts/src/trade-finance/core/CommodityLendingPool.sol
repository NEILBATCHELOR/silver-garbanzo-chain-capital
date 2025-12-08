// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {DataTypes} from "../libraries/types/DataTypes.sol";
import {SupplyLogic} from "../libraries/logic/SupplyLogic.sol";
import {BorrowLogic} from "../libraries/logic/BorrowLogic.sol";
import {LiquidationLogic} from "../libraries/logic/LiquidationLogic.sol";
import {EModeLogic} from "../libraries/logic/EModeLogic.sol";
import {IsolationModeLogic} from "../libraries/logic/IsolationModeLogic.sol";
import {ReserveLogic} from "../libraries/logic/ReserveLogic.sol";
import {ReserveConfiguration} from "../libraries/configuration/ReserveConfiguration.sol";
import {UserConfiguration} from "../libraries/configuration/UserConfiguration.sol";
import {Errors} from "../libraries/helpers/Errors.sol";

/**
 * @title CommodityLendingPool
 * @author Chain Capital
 * @notice Main entry point for commodity trade finance lending protocol
 * @dev Implements Aave V3 architecture patterns for commodity-backed lending
 */
contract CommodityLendingPool is Initializable {
    using ReserveLogic for DataTypes.CommodityReserveData;
    using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
    using UserConfiguration for DataTypes.UserConfigurationMap;

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Mapping of commodity addresses to reserve data
    mapping(address => DataTypes.CommodityReserveData) internal _reserves;

    /// @notice Mapping of reserve IDs to commodity addresses
    mapping(uint256 => address) internal _reservesList;

    /// @notice Total number of reserves
    uint256 internal _reservesCount;

    /// @notice Mapping of user addresses to their configuration
    mapping(address => DataTypes.UserConfigurationMap) internal _usersConfig;

    /// @notice Mapping of E-Mode category IDs to their configuration
    mapping(uint8 => DataTypes.EModeCategory) internal _eModeCategories;

    /// @notice Mapping of user addresses to their E-Mode category
    mapping(address => uint8) internal _usersEModeCategory;

    /// @notice Address of the price oracle
    address internal _priceOracle;

    /// @notice Address of the price oracle sentinel (for L2 sequencer checks)
    address internal _priceOracleSentinel;

    /// @notice Whether the pool is paused
    bool internal _paused;

    /// @notice Maximum stable rate borrow size as percentage of total borrow
    uint256 internal _maxStableRateBorrowSizePercent;

    /// @notice Protocol administrator
    address public admin;

    /// @notice Emergency administrator (can pause)
    address public emergencyAdmin;

    // ============================================
    // EVENTS
    // ============================================

    event Supply(
        address indexed commodity,
        address indexed user,
        address indexed onBehalfOf,
        uint256 amount,
        uint16 referralCode
    );

    event Withdraw(
        address indexed commodity,
        address indexed user,
        address indexed to,
        uint256 amount
    );

    event Borrow(
        address indexed commodity,
        address user,
        address indexed onBehalfOf,
        uint256 amount,
        DataTypes.InterestRateMode interestRateMode,
        uint256 borrowRate,
        uint16 indexed referralCode
    );

    event Repay(
        address indexed commodity,
        address indexed user,
        address indexed repayer,
        uint256 amount,
        bool useATokens
    );

    event LiquidationCall(
        address indexed collateralAsset,
        address indexed debtAsset,
        address indexed user,
        uint256 debtToCover,
        uint256 liquidatedCollateralAmount,
        address liquidator,
        bool receiveAToken
    );

    event ReserveInitialized(
        address indexed commodity,
        address indexed cToken,
        address stableDebtToken,
        address variableDebtToken,
        address interestRateStrategy
    );

    event UserEModeSet(
        address indexed user,
        uint8 categoryId
    );

    event Paused();
    event Unpaused();

    // ============================================
    // MODIFIERS
    // ============================================

    modifier whenNotPaused() {
        require(!_paused, Errors.POOL_PAUSED);
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, Errors.CALLER_NOT_POOL_ADMIN);
        _;
    }

    modifier onlyEmergencyAdmin() {
        require(
            msg.sender == emergencyAdmin || msg.sender == admin,
            Errors.CALLER_NOT_EMERGENCY_ADMIN
        );
        _;
    }

    // ============================================
    // CONSTRUCTOR & INITIALIZATION
    // ============================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the pool
     * @param priceOracle Address of the price oracle
     * @param priceOracleSentinel Address of the oracle sentinel
     */
    function initialize(
        address priceOracle,
        address priceOracleSentinel
    ) external initializer {
        require(priceOracle != address(0), Errors.ZERO_ADDRESS_NOT_VALID);
        
        _priceOracle = priceOracle;
        _priceOracleSentinel = priceOracleSentinel;
        _maxStableRateBorrowSizePercent = 25_00; // 25%
        admin = msg.sender;
        emergencyAdmin = msg.sender;
    }

    // ============================================
    // SUPPLY FUNCTIONS
    // ============================================

    /**
     * @notice Supply commodity tokens as collateral
     * @param commodity The address of the commodity token
     * @param amount The amount to supply
     * @param onBehalfOf The address receiving the cTokens
     * @param referralCode Referral code for rewards
     */
    function supply(
        address commodity,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external whenNotPaused {
        SupplyLogic.executeSupply(
            _reserves[commodity],
            SupplyLogic.ExecuteSupplyParams({
                commodityToken: commodity,
                user: msg.sender,
                onBehalfOf: onBehalfOf,
                amount: amount,
                referralCode: referralCode
            })
        );

        emit Supply(commodity, msg.sender, onBehalfOf, amount, referralCode);
    }

    /**
     * @notice Withdraw supplied commodity tokens
     * @param commodity The address of the commodity token
     * @param amount The amount to withdraw (use type(uint256).max for all)
     * @param to The address receiving the tokens
     * @return The actual amount withdrawn
     */
    function withdraw(
        address commodity,
        uint256 amount,
        address to
    ) external whenNotPaused returns (uint256) {
        uint256 amountWithdrawn = SupplyLogic.executeWithdraw(
            _reserves[commodity],
            SupplyLogic.ExecuteWithdrawParams({
                commodityToken: commodity,
                user: msg.sender,
                to: to,
                amount: amount
            })
        );

        emit Withdraw(commodity, msg.sender, to, amountWithdrawn);
        
        return amountWithdrawn;
    }

    // ============================================
    // BORROW FUNCTIONS
    // ============================================

    /**
     * @notice Borrow assets against commodity collateral
     * @param asset The address of the asset to borrow
     * @param amount The amount to borrow
     * @param interestRateMode The interest rate mode (stable/variable)
     * @param referralCode Referral code for rewards
     * @param onBehalfOf The address receiving the borrowed funds
     */
    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external whenNotPaused {
        BorrowLogic.executeBorrow(
            _reserves[asset],
            _reserves,
            _reservesList,
            _eModeCategories,
            _usersConfig[onBehalfOf],
            BorrowLogic.ExecuteBorrowParams({
                asset: asset,
                user: msg.sender,
                onBehalfOf: onBehalfOf,
                amount: amount,
                interestRateMode: DataTypes.InterestRateMode(interestRateMode),
                referralCode: referralCode,
                releaseUnderlying: true,
                maxStableRateBorrowSizePercent: _maxStableRateBorrowSizePercent,
                reservesCount: _reservesCount,
                oracle: _priceOracle,
                userEModeCategory: _usersEModeCategory[onBehalfOf],
                priceOracleSentinel: _priceOracleSentinel
            })
        );

        emit Borrow(
            asset,
            msg.sender,
            onBehalfOf,
            amount,
            DataTypes.InterestRateMode(interestRateMode),
            _reserves[asset].currentVariableBorrowRate,
            referralCode
        );
    }

    /**
     * @notice Repay borrowed assets
     * @param asset The address of the borrowed asset
     * @param amount The amount to repay (use type(uint256).max for all)
     * @param interestRateMode The interest rate mode
     * @param onBehalfOf The address whose debt is being repaid
     * @return The actual amount repaid
     */
    function repay(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external whenNotPaused returns (uint256) {
        uint256 amountRepaid = BorrowLogic.executeRepay(
            _reserves[asset],
            _usersConfig[onBehalfOf],
            BorrowLogic.ExecuteRepayParams({
                asset: asset,
                amount: amount,
                interestRateMode: DataTypes.InterestRateMode(interestRateMode),
                onBehalfOf: onBehalfOf,
                useATokens: false
            })
        );

        emit Repay(asset, onBehalfOf, msg.sender, amountRepaid, false);
        
        return amountRepaid;
    }

    // ============================================
    // LIQUIDATION FUNCTIONS
    // ============================================

    /**
     * @notice Liquidate an undercollateralized position
     * @param collateralAsset The address of the collateral commodity
     * @param debtAsset The address of the debt asset
     * @param user The address of the borrower
     * @param debtToCover The amount of debt to cover
     * @param receiveAToken Whether to receive aTokens or underlying
     */
    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receiveAToken
    ) external whenNotPaused {
        LiquidationLogic.executeLiquidationCall(
            _reserves[collateralAsset],
            _reserves[debtAsset],
            _reserves,
            _reservesList,
            _eModeCategories,
            _usersConfig[user],
            LiquidationLogic.LiquidationCallParams({
                reservesCount: _reservesCount,
                debtToCover: debtToCover,
                collateralAsset: collateralAsset,
                debtAsset: debtAsset,
                user: user,
                receiveAToken: receiveAToken,
                priceOracle: _priceOracle,
                userEModeCategory: _usersEModeCategory[user],
                priceOracleSentinel: _priceOracleSentinel
            })
        );
    }

    // ============================================
    // E-MODE FUNCTIONS
    // ============================================

    /**
     * @notice Set user's E-Mode category
     * @param categoryId The E-Mode category ID (0 to disable)
     */
    function setUserEMode(uint8 categoryId) external {
        EModeLogic.executeSetUserEMode(
            _reserves,
            _reservesList,
            _eModeCategories,
            _usersEModeCategory,
            _usersConfig[msg.sender],
            categoryId,
            _reservesCount,
            _priceOracle
        );

        emit UserEModeSet(msg.sender, categoryId);
    }

    /**
     * @notice Get user's E-Mode category
     * @param user The user address
     * @return The E-Mode category ID
     */
    function getUserEMode(address user) external view returns (uint8) {
        return _usersEModeCategory[user];
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Initialize a new commodity reserve
     * @param commodity The commodity address
     * @param cToken The cToken (receipt token) address
     * @param stableDebtToken The stable debt token address
     * @param variableDebtToken The variable debt token address
     * @param interestRateStrategy The interest rate strategy address
     */
    function initReserve(
        address commodity,
        address cToken,
        address stableDebtToken,
        address variableDebtToken,
        address interestRateStrategy
    ) external onlyAdmin {
        require(
            _reserves[commodity].cTokenAddress == address(0),
            Errors.RESERVE_ALREADY_INITIALIZED
        );

        _reserves[commodity].init(
            cToken,
            stableDebtToken,
            variableDebtToken,
            interestRateStrategy
        );

        _reserves[commodity].id = uint16(_reservesCount);
        _reservesList[_reservesCount] = commodity;
        _reservesCount++;

        emit ReserveInitialized(
            commodity,
            cToken,
            stableDebtToken,
            variableDebtToken,
            interestRateStrategy
        );
    }

    /**
     * @notice Configure E-Mode category
     * @param categoryId The category ID
     * @param ltv The loan-to-value ratio
     * @param liquidationThreshold The liquidation threshold
     * @param liquidationBonus The liquidation bonus
     * @param priceSource Optional price source for category
     * @param label Category label
     */
    function configureEModeCategory(
        uint8 categoryId,
        uint16 ltv,
        uint16 liquidationThreshold,
        uint16 liquidationBonus,
        address priceSource,
        string memory label
    ) external onlyAdmin {
        require(categoryId != 0, "Category 0 is reserved");
        
        _eModeCategories[categoryId] = DataTypes.EModeCategory({
            ltv: ltv,
            liquidationThreshold: liquidationThreshold,
            liquidationBonus: liquidationBonus,
            priceSource: priceSource,
            label: label
        });
    }

    /**
     * @notice Set reserve configuration
     * @param commodity The commodity address
     * @param configuration The configuration bitmap
     */
    function setConfiguration(
        address commodity,
        DataTypes.CommodityConfigurationMap memory configuration
    ) external onlyAdmin {
        _reserves[commodity].configuration = configuration;
    }

    /**
     * @notice Pause the pool (emergency only)
     */
    function pause() external onlyEmergencyAdmin {
        _paused = true;
        emit Paused();
    }

    /**
     * @notice Unpause the pool
     */
    function unpause() external onlyAdmin {
        _paused = false;
        emit Unpaused();
    }

    /**
     * @notice Update admin address
     * @param newAdmin The new admin address
     */
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), Errors.ZERO_ADDRESS_NOT_VALID);
        admin = newAdmin;
    }

    /**
     * @notice Update emergency admin address
     * @param newEmergencyAdmin The new emergency admin address
     */
    function setEmergencyAdmin(address newEmergencyAdmin) external onlyAdmin {
        require(newEmergencyAdmin != address(0), Errors.ZERO_ADDRESS_NOT_VALID);
        emergencyAdmin = newEmergencyAdmin;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get reserve data
     * @param commodity The commodity address
     * @return The reserve data
     */
    function getReserveData(
        address commodity
    ) external view returns (DataTypes.CommodityReserveData memory) {
        return _reserves[commodity];
    }

    /**
     * @notice Get user configuration
     * @param user The user address
     * @return The user configuration
     */
    function getUserConfiguration(
        address user
    ) external view returns (DataTypes.UserConfigurationMap memory) {
        return _usersConfig[user];
    }

    /**
     * @notice Get reserve normalized income
     * @param commodity The commodity address
     * @return The normalized income
     */
    function getReserveNormalizedIncome(
        address commodity
    ) external view returns (uint256) {
        return _reserves[commodity].getNormalizedIncome();
    }

    /**
     * @notice Get reserve normalized variable debt
     * @param commodity The commodity address
     * @return The normalized variable debt
     */
    function getReserveNormalizedVariableDebt(
        address commodity
    ) external view returns (uint256) {
        return _reserves[commodity].getNormalizedDebt();
    }

    /**
     * @notice Get the list of all reserves
     * @return The array of reserve addresses
     */
    function getReservesList() external view returns (address[] memory) {
        address[] memory reserves = new address[](_reservesCount);
        for (uint256 i = 0; i < _reservesCount; i++) {
            reserves[i] = _reservesList[i];
        }
        return reserves;
    }

    /**
     * @notice Check if pool is paused
     * @return True if paused
     */
    function paused() external view returns (bool) {
        return _paused;
    }

    /**
     * @notice Get price oracle address
     * @return The oracle address
     */
    function getPriceOracle() external view returns (address) {
        return _priceOracle;
    }

    /**
     * @notice Get E-Mode category configuration
     * @param categoryId The category ID
     * @return The E-Mode category data
     */
    function getEModeCategoryData(
        uint8 categoryId
    ) external view returns (DataTypes.EModeCategory memory) {
        return _eModeCategories[categoryId];
    }

    /**
     * @notice Get configuration of a reserve
     * @param asset The address of the underlying asset
     * @return The configuration map
     */
    function getConfiguration(
        address asset
    ) external view returns (DataTypes.CommodityConfigurationMap memory) {
        return _reserves[asset].configuration;
    }
}
