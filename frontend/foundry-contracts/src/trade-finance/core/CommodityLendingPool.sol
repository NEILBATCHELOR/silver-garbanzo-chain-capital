// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {DataTypes} from "../libraries/types/DataTypes.sol";
import {SupplyLogic} from "../libraries/logic/SupplyLogic.sol";
import {BorrowLogic} from "../libraries/logic/BorrowLogic.sol";
import {LiquidationLogic} from "../libraries/logic/LiquidationLogic.sol";
import {ReserveLogic} from "../libraries/logic/ReserveLogic.sol";
import {ReserveConfiguration} from "../libraries/configuration/ReserveConfiguration.sol";
import {UserConfiguration} from "../libraries/configuration/UserConfiguration.sol";
import {Errors} from "../libraries/helpers/Errors.sol";

/**
 * @title CommodityLendingPool
 * @author Chain Capital
 * @notice Main entry point for commodity trade finance lending protocol
 */
contract CommodityLendingPool is Initializable {
    using ReserveLogic for DataTypes.CommodityReserveData;
    using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
    using UserConfiguration for DataTypes.UserConfigurationMap;

    // ============================================
    // STATE VARIABLES
    // ============================================

    mapping(address => DataTypes.CommodityReserveData) internal _reserves;
    mapping(uint256 => address) internal _reservesList;
    uint256 internal _reservesCount;
    mapping(address => DataTypes.UserConfigurationMap) internal _usersConfig;
    mapping(uint8 => DataTypes.EModeCategory) internal _eModeCategories;
    mapping(address => uint8) internal _usersEModeCategory;
    
    address internal _priceOracle;
    address internal _priceOracleSentinel;
    bool internal _paused;
    
    address public admin;
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
        address indexed asset,
        address user,
        address indexed onBehalfOf,
        uint256 amount,
        uint8 interestRateMode,
        uint256 borrowRate,
        uint16 indexed referralCode
    );

    event Repay(
        address indexed asset,
        address indexed user,
        address indexed repayer,
        uint256 amount,
        bool useATokens
    );

    event Liquidation(
        address indexed collateralAsset,
        address indexed debtAsset,
        address indexed user,
        uint256 debtToCover,
        uint256 liquidatedCollateralAmount,
        address liquidator,
        bool receiveAToken
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
        require(msg.sender == emergencyAdmin, Errors.CALLER_NOT_EMERGENCY_ADMIN);
        _;
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function initialize(
        address priceOracle,
        address priceOracleSentinel
    ) external initializer {
        _priceOracle = priceOracle;
        _priceOracleSentinel = priceOracleSentinel;
        admin = msg.sender;
        emergencyAdmin = msg.sender;
    }

    // ============================================
    // SUPPLY FUNCTIONS
    // ============================================

    /**
     * @notice Supply commodity tokens as collateral
     */
    function supply(
        address commodity,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external whenNotPaused {
        SupplyLogic.executeSupply(
            _reserves,
            _reservesList,
            _usersConfig[onBehalfOf],
            DataTypes.ExecuteSupplyParams({
                asset: commodity,
                amount: amount,
                onBehalfOf: onBehalfOf,
                referralCode: referralCode
            })
        );

        emit Supply(commodity, msg.sender, onBehalfOf, amount, referralCode);
    }

    /**
     * @notice Withdraw supplied commodity tokens
     */
    function withdraw(
        address commodity,
        uint256 amount,
        address to
    ) external whenNotPaused returns (uint256) {
        uint256 amountWithdrawn = SupplyLogic.executeWithdraw(
            _reserves,
            _reservesList,
            _eModeCategories,
            _usersConfig[msg.sender],
            DataTypes.ExecuteWithdrawParams({
                asset: commodity,
                amount: amount,
                to: to,
                reservesCount: _reservesCount,
                oracle: _priceOracle,
                userEModeCategory: _usersEModeCategory[msg.sender]
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
     */
    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external whenNotPaused {
        BorrowLogic.executeBorrow(
            _reserves,
            _reservesList,
            _eModeCategories,
            _usersConfig[onBehalfOf],
            DataTypes.ExecuteBorrowParams({
                asset: asset,
                user: msg.sender,
                onBehalfOf: onBehalfOf,
                amount: amount,
                interestRateMode: DataTypes.InterestRateMode(interestRateMode),
                referralCode: referralCode,
                releaseUnderlying: true,
                maxStableRateBorrowSizePercent: 0,
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
            uint8(interestRateMode),
            _reserves[asset].currentVariableBorrowRate,
            referralCode
        );
    }

    /**
     * @notice Repay borrowed assets
     */
    function repay(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external whenNotPaused returns (uint256) {
        uint256 paybackAmount = BorrowLogic.executeRepay(
            _reserves,
            _reservesList,
            _usersConfig[onBehalfOf],
            DataTypes.ExecuteRepayParams({
                asset: asset,
                amount: amount,
                interestRateMode: DataTypes.InterestRateMode(interestRateMode),
                onBehalfOf: onBehalfOf,
                useATokens: false
            })
        );

        emit Repay(
            asset,
            onBehalfOf,
            msg.sender,
            paybackAmount,
            false
        );

        return paybackAmount;
    }

    /**
     * @notice Repay with aTokens instead of underlying
     */
    function repayWithATokens(
        address asset,
        uint256 amount,
        uint256 interestRateMode
    ) external whenNotPaused returns (uint256) {
        uint256 paybackAmount = BorrowLogic.executeRepay(
            _reserves,
            _reservesList,
            _usersConfig[msg.sender],
            DataTypes.ExecuteRepayParams({
                asset: asset,
                amount: amount,
                interestRateMode: DataTypes.InterestRateMode(interestRateMode),
                onBehalfOf: msg.sender,
                useATokens: true
            })
        );

        emit Repay(
            asset,
            msg.sender,
            msg.sender,
            paybackAmount,
            true
        );

        return paybackAmount;
    }

    // ============================================
    // LIQUIDATION FUNCTIONS
    // ============================================

    /**
     * @notice Liquidate an undercollateralized position
     */
    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receiveAToken
    ) external whenNotPaused {
        LiquidationLogic.executeLiquidationCall(
            _reserves,
            _reservesList,
            _usersConfig,
            _eModeCategories,
            DataTypes.ExecuteLiquidationCallParams({
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

        emit Liquidation(
            collateralAsset,
            debtAsset,
            user,
            debtToCover,
            0, // Will be calculated in logic library
            msg.sender,
            receiveAToken
        );
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get reserve data
     */
    function getReserveData(address asset) external view returns (
        DataTypes.CommodityReserveData memory
    ) {
        return _reserves[asset];
    }

    /**
     * @notice Get user configuration
     */
    function getUserConfiguration(address user) external view returns (
        DataTypes.UserConfigurationMap memory
    ) {
        return _usersConfig[user];
    }

    /**
     * @notice Get reserves list
     */
    function getReservesList() external view returns (address[] memory) {
        address[] memory reservesList = new address[](_reservesCount);
        for (uint256 i = 0; i < _reservesCount; i++) {
            reservesList[i] = _reservesList[i];
        }
        return reservesList;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Pause the pool
     */
    function pause() external onlyEmergencyAdmin {
        _paused = true;
        emit Paused();
    }

    /**
     * @notice Unpause the pool
     */
    function unpause() external onlyEmergencyAdmin {
        _paused = false;
        emit Unpaused();
    }

    /**
     * @notice Set price oracle
     */
    function setPriceOracle(address oracle) external onlyAdmin {
        _priceOracle = oracle;
    }

    /**
     * @notice Configure E-Mode category
     */
    function configureEModeCategory(
        uint8 categoryId,
        uint16 ltv,
        uint16 liquidationThreshold,
        uint16 liquidationBonus,
        address priceSource,
        string memory label,
        uint128 collateralBitmap,
        uint128 borrowableBitmap
    ) external onlyAdmin {
        _eModeCategories[categoryId] = DataTypes.EModeCategory({
            ltv: ltv,
            liquidationThreshold: liquidationThreshold,
            liquidationBonus: liquidationBonus,
            priceSource: priceSource,
            label: label,
            collateralBitmap: collateralBitmap,
            borrowableBitmap: borrowableBitmap
        });
    }

    /**
     * @notice Set user E-Mode category
     */
    function setUserEMode(uint8 categoryId) external {
        _usersEModeCategory[msg.sender] = categoryId;
    }

    /**
     * @notice Get user E-Mode category
     */
    function getUserEMode(address user) external view returns (uint8) {
        return _usersEModeCategory[user];
    }

    /**
     * @notice Initialize a new reserve
     */
    function initReserve(
        address asset,
        address cTokenAddress,
        address stableDebtAddress,
        address variableDebtAddress,
        address interestRateStrategyAddress
    ) external onlyAdmin {
        require(_reserves[asset].cTokenAddress == address(0), "Reserve already initialized");
        
        _reserves[asset].init(
            cTokenAddress,
            variableDebtAddress,
            interestRateStrategyAddress
        );
        
        _addReserveToList(asset);
    }

    /**
     * @notice Set reserve configuration
     */
    function setConfiguration(
        address asset,
        DataTypes.CommodityConfigurationMap memory configuration
    ) external onlyAdmin {
        require(_reserves[asset].cTokenAddress != address(0), "Reserve not initialized");
        _reserves[asset].configuration = configuration;
    }

    /**
     * @notice Get reserve configuration
     */
    function getConfiguration(address asset) external view returns (
        DataTypes.CommodityConfigurationMap memory
    ) {
        return _reserves[asset].configuration;
    }

    /**
     * @notice Get normalized income for a reserve
     */
    function getReserveNormalizedIncome(address asset) external view returns (uint256) {
        return _reserves[asset].getNormalizedIncome();
    }

    /**
     * @notice Get normalized variable debt for a reserve
     */
    function getReserveNormalizedVariableDebt(address asset) external view returns (uint256) {
        return _reserves[asset].getNormalizedDebt();
    }

    /**
     * @notice Add reserve to list
     */
    function _addReserveToList(address asset) internal {
        uint256 reservesCount = _reservesCount;

        bool reserveAlreadyAdded = _reserves[asset].id != 0 || _reservesList[0] == asset;

        if (!reserveAlreadyAdded) {
            _reserves[asset].id = uint16(reservesCount);
            _reservesList[reservesCount] = asset;
            _reservesCount = reservesCount + 1;
        }
    }
}
