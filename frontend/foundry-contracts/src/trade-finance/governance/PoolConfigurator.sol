// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IPoolAddressesProvider} from "../interfaces/IPoolAddressesProvider.sol";
import {ICommodityLendingPool} from "../interfaces/ICommodityLendingPool.sol";
import {IACLManager} from "../interfaces/IACLManager.sol";
import {DataTypes} from "../libraries/types/DataTypes.sol";
import {ReserveConfiguration} from "../libraries/configuration/ReserveConfiguration.sol";
import {PercentageMath} from "../libraries/math/PercentageMath.sol";

/**
 * @title PoolConfigurator
 * @notice Configuration manager for the lending pool
 * @dev Manages reserve parameters, risk settings, and asset listings
 * 
 * UPGRADEABILITY:
 * - Pattern: UUPS (Universal Upgradeable Proxy Standard)
 * - Upgrade Control: Only UPGRADER_ROLE can upgrade
 * - Storage: Uses storage gaps for future variables
 * - Initialization: Uses initialize() instead of constructor
 */
contract PoolConfigurator is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
    using PercentageMath for uint256;

    // ============ Roles ============
    
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ============ State Variables ============
    
    // Changed from immutable to storage variable for upgradeability
    IPoolAddressesProvider private _addressesProvider;
    
    // ============ Storage Gap ============
    // Reserve 49 slots for future variables (50 total - 1 current)
    uint256[49] private __gap;

    // ============ Events ============
    
    event ReserveInitialized(
        address indexed asset,
        address indexed cToken,
        address stableDebtToken,
        address variableDebtToken,
        address interestRateStrategy
    );
    event BorrowingEnabledOnReserve(address indexed asset);
    event BorrowingDisabledOnReserve(address indexed asset);
    event CollateralConfigurationChanged(
        address indexed asset,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    );
    event ReserveActive(address indexed asset);
    event ReserveDeactivated(address indexed asset);
    event ReserveFrozen(address indexed asset);
    event ReserveUnfrozen(address indexed asset);
    event ReservePaused(address indexed asset);
    event ReserveUnpaused(address indexed asset);
    event ReserveDropped(address indexed asset);
    event ReserveFactorChanged(address indexed asset, uint256 oldReserveFactor, uint256 newReserveFactor);
    event BorrowCapChanged(address indexed asset, uint256 oldBorrowCap, uint256 newBorrowCap);
    event SupplyCapChanged(address indexed asset, uint256 oldSupplyCap, uint256 newSupplyCap);
    event LiquidationProtocolFeeChanged(address indexed asset, uint256 oldFee, uint256 newFee);
    event EModeAssetCategoryChanged(address indexed asset, uint8 oldCategoryId, uint8 newCategoryId);
    event EModeCategoryAdded(
        uint8 indexed categoryId,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus,
        string label
    );
    event DebtCeilingChanged(address indexed asset, uint256 oldDebtCeiling, uint256 newDebtCeiling);
    event SiloedBorrowingChanged(address indexed asset, bool oldState, bool newState);
    event BridgeProtocolFeeUpdated(uint256 oldBridgeProtocolFee, uint256 newBridgeProtocolFee);
    event FlashloanPremiumTotalUpdated(uint256 oldFlashloanPremiumTotal, uint256 newFlashloanPremiumTotal);
    event FlashloanPremiumToProtocolUpdated(
        uint256 oldFlashloanPremiumToProtocol,
        uint256 newFlashloanPremiumToProtocol
    );
    event Upgraded(address indexed newImplementation);
    
    // ============ Errors ============
    
    error ZeroAddress();
    
    // ============ Constructor ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    // ============ Initializer ============
    
    /**
     * @notice Initialize the contract (replaces constructor)
     * @param provider The address of the PoolAddressesProvider
     * @param admin The default admin address
     */
    function initialize(
        IPoolAddressesProvider provider,
        address admin
    ) public initializer {
        if (address(provider) == address(0)) revert ZeroAddress();
        if (admin == address(0)) revert ZeroAddress();
        
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _addressesProvider = provider;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    // ============ Getters ============
    
    /**
     * @notice Returns the addresses provider
     */
    function ADDRESSES_PROVIDER() external view returns (IPoolAddressesProvider) {
        return _addressesProvider;
    }

    // ============ Modifiers ============

    modifier onlyPoolAdmin() {
        _onlyPoolAdmin();
        _;
    }

    modifier onlyEmergencyAdmin() {
        _onlyEmergencyAdmin();
        _;
    }

    modifier onlyAssetListingOrPoolAdmins() {
        _onlyAssetListingOrPoolAdmins();
        _;
    }

    modifier onlyRiskOrPoolAdmins() {
        _onlyRiskOrPoolAdmins();
        _;
    }

    function _onlyPoolAdmin() internal view {
        require(
            _hasRole(keccak256("POOL_ADMIN")),
            "PoolConfigurator: Caller is not pool admin"
        );
    }

    function _onlyEmergencyAdmin() internal view {
        require(
            _hasRole(keccak256("EMERGENCY_ADMIN")),
            "PoolConfigurator: Caller is not emergency admin"
        );
    }

    function _onlyAssetListingOrPoolAdmins() internal view {
        require(
            _hasRole(keccak256("ASSET_LISTING_ADMIN")) || _hasRole(keccak256("POOL_ADMIN")),
            "PoolConfigurator: Caller is not asset listing or pool admin"
        );
    }

    function _onlyRiskOrPoolAdmins() internal view {
        require(
            _hasRole(keccak256("RISK_ADMIN")) || _hasRole(keccak256("POOL_ADMIN")),
            "PoolConfigurator: Caller is not risk or pool admin"
        );
    }

    function _hasRole(bytes32 role) internal view returns (bool) {
        address aclManager = _addressesProvider.getACLManager();
        return IACLManager(aclManager).hasRole(role, msg.sender);
    }

    // ============ Reserve Configuration Functions ============

    /**
     * @notice Configures borrowing on a reserve
     * @param asset The address of the underlying asset
     * @param enabled True to enable borrowing, false otherwise
     */
    function setReserveBorrowing(address asset, bool enabled) external onlyRiskOrPoolAdmins {
        ICommodityLendingPool pool = ICommodityLendingPool(_addressesProvider.getPool());
        DataTypes.CommodityConfigurationMap memory currentConfig = pool.getConfiguration(asset);

        currentConfig.setBorrowingEnabled(enabled);
        pool.setConfiguration(asset, currentConfig);

        if (enabled) {
            emit BorrowingEnabledOnReserve(asset);
        } else {
            emit BorrowingDisabledOnReserve(asset);
        }
    }

    /**
     * @notice Configures the collateral parameters
     * @param asset The address of the underlying asset
     * @param ltv The loan to value of the asset when used as collateral
     * @param liquidationThreshold The threshold at which loans using this asset as collateral will be considered undercollateralized
     * @param liquidationBonus The bonus liquidators receive to liquidate this asset
     */
    function configureReserveAsCollateral(
        address asset,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    ) external onlyRiskOrPoolAdmins {
        ICommodityLendingPool pool = ICommodityLendingPool(_addressesProvider.getPool());
        DataTypes.CommodityConfigurationMap memory currentConfig = pool.getConfiguration(asset);

        require(ltv <= liquidationThreshold, "PoolConfigurator: Invalid risk parameters");

        currentConfig.setLtv(ltv);
        currentConfig.setLiquidationThreshold(liquidationThreshold);
        currentConfig.setLiquidationBonus(liquidationBonus);

        pool.setConfiguration(asset, currentConfig);

        emit CollateralConfigurationChanged(asset, ltv, liquidationThreshold, liquidationBonus);
    }

    /**
     * @notice Activates a reserve
     * @param asset The address of the underlying asset
     */
    function setReserveActive(address asset, bool active) external onlyPoolAdmin {
        ICommodityLendingPool pool = ICommodityLendingPool(_addressesProvider.getPool());
        DataTypes.CommodityConfigurationMap memory currentConfig = pool.getConfiguration(asset);

        currentConfig.setActive(active);
        pool.setConfiguration(asset, currentConfig);

        if (active) {
            emit ReserveActive(asset);
        } else {
            emit ReserveDeactivated(asset);
        }
    }

    /**
     * @notice Freezes or unfreezes a reserve
     * @param asset The address of the underlying asset
     * @param freeze True to freeze, false to unfreeze
     */
    function setReserveFreeze(address asset, bool freeze) external onlyRiskOrPoolAdmins {
        ICommodityLendingPool pool = ICommodityLendingPool(_addressesProvider.getPool());
        DataTypes.CommodityConfigurationMap memory currentConfig = pool.getConfiguration(asset);

        currentConfig.setFrozen(freeze);
        pool.setConfiguration(asset, currentConfig);

        if (freeze) {
            emit ReserveFrozen(asset);
        } else {
            emit ReserveUnfrozen(asset);
        }
    }

    /**
     * @notice Pauses or unpauses a reserve
     * @param asset The address of the underlying asset
     * @param paused True to pause, false to unpause
     */
    function setReservePause(address asset, bool paused) external onlyEmergencyAdmin {
        ICommodityLendingPool pool = ICommodityLendingPool(_addressesProvider.getPool());
        DataTypes.CommodityConfigurationMap memory currentConfig = pool.getConfiguration(asset);

        currentConfig.setPaused(paused);
        pool.setConfiguration(asset, currentConfig);

        if (paused) {
            emit ReservePaused(asset);
        } else {
            emit ReserveUnpaused(asset);
        }
    }

    /**
     * @notice Updates the reserve factor
     * @param asset The address of the underlying asset
     * @param newReserveFactor The new reserve factor
     */
    function setReserveFactor(address asset, uint256 newReserveFactor) external onlyRiskOrPoolAdmins {
        require(newReserveFactor <= PercentageMath.PERCENTAGE_FACTOR, "PoolConfigurator: Invalid reserve factor");

        ICommodityLendingPool pool = ICommodityLendingPool(_addressesProvider.getPool());
        DataTypes.CommodityConfigurationMap memory currentConfig = pool.getConfiguration(asset);

        uint256 oldReserveFactor = currentConfig.getReserveFactor();
        currentConfig.setReserveFactor(newReserveFactor);
        pool.setConfiguration(asset, currentConfig);

        emit ReserveFactorChanged(asset, oldReserveFactor, newReserveFactor);
    }

    /**
     * @notice Sets the borrow cap
     * @param asset The address of the underlying asset
     * @param newBorrowCap The new borrow cap
     */
    function setBorrowCap(address asset, uint256 newBorrowCap) external onlyRiskOrPoolAdmins {
        ICommodityLendingPool pool = ICommodityLendingPool(_addressesProvider.getPool());
        DataTypes.CommodityConfigurationMap memory currentConfig = pool.getConfiguration(asset);

        uint256 oldBorrowCap = currentConfig.getBorrowCap();
        currentConfig.setBorrowCap(newBorrowCap);
        pool.setConfiguration(asset, currentConfig);

        emit BorrowCapChanged(asset, oldBorrowCap, newBorrowCap);
    }

    /**
     * @notice Sets the supply cap
     * @param asset The address of the underlying asset
     * @param newSupplyCap The new supply cap
     */
    function setSupplyCap(address asset, uint256 newSupplyCap) external onlyRiskOrPoolAdmins {
        ICommodityLendingPool pool = ICommodityLendingPool(_addressesProvider.getPool());
        DataTypes.CommodityConfigurationMap memory currentConfig = pool.getConfiguration(asset);

        uint256 oldSupplyCap = currentConfig.getSupplyCap();
        currentConfig.setSupplyCap(newSupplyCap);
        pool.setConfiguration(asset, currentConfig);

        emit SupplyCapChanged(asset, oldSupplyCap, newSupplyCap);
    }

    /**
     * @notice Sets the debt ceiling for isolation mode
     * @param asset The address of the underlying asset
     * @param newDebtCeiling The new debt ceiling
     */
    function setDebtCeiling(address asset, uint256 newDebtCeiling) external onlyRiskOrPoolAdmins {
        ICommodityLendingPool pool = ICommodityLendingPool(_addressesProvider.getPool());
        DataTypes.CommodityConfigurationMap memory currentConfig = pool.getConfiguration(asset);

        uint256 oldDebtCeiling = currentConfig.getDebtCeiling();
        currentConfig.setDebtCeiling(newDebtCeiling);
        pool.setConfiguration(asset, currentConfig);

        emit DebtCeilingChanged(asset, oldDebtCeiling, newDebtCeiling);
    }

    /**
     * @notice Sets siloed borrowing for an asset
     * @param asset The address of the underlying asset
     * @param newSiloed True to enable siloed borrowing, false otherwise
     */
    function setSiloedBorrowing(address asset, bool newSiloed) external onlyRiskOrPoolAdmins {
        ICommodityLendingPool pool = ICommodityLendingPool(_addressesProvider.getPool());
        DataTypes.CommodityConfigurationMap memory currentConfig = pool.getConfiguration(asset);

        bool oldSiloed = currentConfig.getSiloedBorrowing();
        currentConfig.setSiloedBorrowing(newSiloed);
        pool.setConfiguration(asset, currentConfig);

        emit SiloedBorrowingChanged(asset, oldSiloed, newSiloed);
    }
    
    // ============ Upgrade Authorization ============
    
    /**
     * @notice Authorize contract upgrades
     * @dev Only UPGRADER_ROLE can upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {
        emit Upgraded(newImplementation);
    }
}
