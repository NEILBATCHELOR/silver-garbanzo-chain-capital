// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {DataTypes} from "../libraries/types/DataTypes.sol";
import {SupplyLogic} from "../libraries/logic/SupplyLogic.sol";
import {BorrowLogic} from "../libraries/logic/BorrowLogic.sol";
import {LiquidationLogic} from "../libraries/logic/LiquidationLogic.sol";
import {FlashLoanLogic} from "../libraries/logic/FlashLoanLogic.sol";
import {ReserveLogic} from "../libraries/logic/ReserveLogic.sol";
import {ReserveConfiguration} from "../libraries/configuration/ReserveConfiguration.sol";
import {UserConfiguration} from "../libraries/configuration/UserConfiguration.sol";
import {Errors} from "../libraries/helpers/Errors.sol";
import {IERC20WithPermit} from "../interfaces/IERC20WithPermit.sol";

/**
 * @title CommodityLendingPool
 * @author Chain Capital
 * @notice Main entry point for commodity trade finance lending protocol
 * @dev Upgradeable via UUPS pattern
 * 
 * WEEK 2 ENHANCEMENT: Added Multicall support for batch operations
 * Users can now execute multiple operations in a single transaction:
 * - Supply collateral + Set E-Mode + Borrow
 * - Supply multiple assets in one tx
 * - Approve delegation + Supply + Set position manager
 * 
 * PHASE 2 UPGRADE: Converted to UUPS upgradeable pattern
 * - Role-based access control for upgrades and administration
 * - Storage gap for future enhancements
 * - Initialize-based deployment instead of constructor
 */
contract CommodityLendingPool is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using ReserveLogic for DataTypes.CommodityReserveData;
    using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
    using UserConfiguration for DataTypes.UserConfigurationMap;

    // ============================================
    // ROLES
    // ============================================

    bytes32 public constant POOL_ADMIN_ROLE = keccak256("POOL_ADMIN_ROLE");
    bytes32 public constant EMERGENCY_ADMIN_ROLE = keccak256("EMERGENCY_ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

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
    
    address public admin; // Kept for backwards compatibility
    address public emergencyAdmin; // Kept for backwards compatibility

    // Flash loan configuration
    uint128 internal _flashLoanPremiumTotal;      // Total premium (e.g., 9 bps = 0.09%)
    uint128 internal _flashLoanPremiumToProtocol; // Protocol share (e.g., 30% of premium)
    mapping(address => bool) internal _flashBorrowers; // Authorized borrowers
    address internal _addressesProvider; // For oracle access

    // Position Manager - CRITICAL FEATURE FROM AAVE V3 HORIZON
    // Enables institutional use cases: trading firms managing positions, automated bots, etc.
    mapping(address user => mapping(address manager => bool)) internal _positionManagers;

    // ============================================
    // STORAGE GAP
    // ============================================
    
    /// @dev Reserve 34 slots for future variables (50 total - 16 current)
    uint256[34] private __gap;

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

    // Position Manager Events
    event PositionManagerSet(
        address indexed user,
        address indexed manager,
        bool approved
    );

    event Upgraded(address indexed newImplementation);

    // ============================================
    // ERRORS
    // ============================================

    error ZeroAddress();
    error InvalidAddressesProvider();
    error InvalidOracle();

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * @notice Initialize the CommodityLendingPool (replaces constructor)
     * @param addressesProvider The addresses provider address
     * @param priceOracle The price oracle address
     * @param priceOracleSentinel The price oracle sentinel address
     * @param poolAdmin The pool administrator address
     */
    function initialize(
        address addressesProvider,
        address priceOracle,
        address priceOracleSentinel,
        address poolAdmin
    ) external initializer {
        if (addressesProvider == address(0)) revert InvalidAddressesProvider();
        if (priceOracle == address(0)) revert InvalidOracle();
        if (poolAdmin == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, poolAdmin);
        _grantRole(POOL_ADMIN_ROLE, poolAdmin);
        _grantRole(EMERGENCY_ADMIN_ROLE, poolAdmin);
        _grantRole(UPGRADER_ROLE, poolAdmin);
        
        // Initialize state
        _addressesProvider = addressesProvider;
        _priceOracle = priceOracle;
        _priceOracleSentinel = priceOracleSentinel;
        admin = poolAdmin; // Backwards compatibility
        emergencyAdmin = poolAdmin; // Backwards compatibility
        
        // Default flash loan premiums: 0.09% total, 30% to protocol
        _flashLoanPremiumTotal = 9; // 9 basis points = 0.09%
        _flashLoanPremiumToProtocol = 3000; // 30% of premium goes to protocol
    }

    // ============================================
    // UPGRADE AUTHORIZATION
    // ============================================

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

    // ============================================
    // MODIFIERS
    // ============================================

    modifier whenNotPaused() {
        require(!_paused, Errors.POOL_PAUSED);
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(POOL_ADMIN_ROLE, msg.sender), Errors.CALLER_NOT_POOL_ADMIN);
        _;
    }

    modifier onlyEmergencyAdmin() {
        require(hasRole(EMERGENCY_ADMIN_ROLE, msg.sender), Errors.CALLER_NOT_EMERGENCY_ADMIN);
        _;
    }

    /**
     * @dev Modifier to check if caller is authorized position manager for the user
     * @param onBehalfOf The user whose position is being managed
     */
    modifier onlyPositionManager(address onBehalfOf) {
        require(
            msg.sender == onBehalfOf || _positionManagers[onBehalfOf][msg.sender],
            Errors.CALLER_NOT_POSITION_MANAGER
        );
        _;
    }
    // ============================================
    // POSITION MANAGER FUNCTIONS
    // ============================================

    /**
     * @notice Approve or revoke a position manager for msg.sender
     * @dev Enables institutional use cases like trading firms managing multiple accounts
     * @param manager The address to approve/revoke as position manager
     * @param approved True to approve, false to revoke
     * 
     * Use Cases:
     * - Trading firms managing positions for multiple entities
     * - Automated trading bots with delegated authority
     * - Professional risk managers handling commodity portfolios
     * - Fund managers with discretionary trading authority
     */
    function setPositionManager(
        address manager,
        bool approved
    ) external {
        _positionManagers[msg.sender][manager] = approved;
        emit PositionManagerSet(msg.sender, manager, approved);
    }

    /**
     * @notice Check if an address is an approved position manager for a user
     * @param user The user whose position managers to check
     * @param manager The address to check
     * @return True if manager is approved, false otherwise
     */
    function getPositionManager(
        address user,
        address manager
    ) external view returns (bool) {
        return _positionManagers[user][manager];
    }

    // ============================================
    // SUPPLY FUNCTIONS
    // ============================================

    /**
     * @notice Supply commodity tokens as collateral
     * @dev Can be called by position manager if authorized
     */
    function supply(
        address commodity,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external whenNotPaused onlyPositionManager(onBehalfOf) {
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
     * @notice Supply commodity tokens using permit (EIP-2612) for gasless approval
     * @dev Combines permit + supply in one transaction, saving gas and improving UX
     * @param commodity The address of the commodity token
     * @param amount The amount to supply
     * @param onBehalfOf The address receiving the cTokens
     * @param referralCode Code for referral program (0 if none)
     * @param deadline The deadline for the permit signature
     * @param v The recovery byte of the signature
     * @param r Half of the ECDSA signature pair
     * @param s Half of the ECDSA signature pair
     */
    function supplyWithPermit(
        address commodity,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused onlyPositionManager(onBehalfOf) {
        // Execute permit to approve the pool
        IERC20WithPermit(commodity).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );

        // Execute supply
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
     * @dev Can be called by position manager if authorized
     */
    function withdraw(
        address commodity,
        uint256 amount,
        address to
    ) external whenNotPaused returns (uint256) {
        require(
            msg.sender == to || _positionManagers[to][msg.sender],
            Errors.CALLER_NOT_POSITION_MANAGER
        );

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
     * @dev Can be called by position manager if authorized
     */
    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external whenNotPaused onlyPositionManager(onBehalfOf) {
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
     * @dev Can be called by position manager if authorized
     */
    function repay(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external whenNotPaused onlyPositionManager(onBehalfOf) returns (uint256) {
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
     * @notice Repay borrowed assets using permit (EIP-2612) for gasless approval
     * @dev Combines permit + repay in one transaction, saving gas and improving UX
     * @param asset The address of the borrowed asset
     * @param amount The amount to repay
     * @param interestRateMode The interest rate mode (1 = stable, 2 = variable)
     * @param onBehalfOf The address whose debt is being repaid
     * @param deadline The deadline for the permit signature
     * @param v The recovery byte of the signature
     * @param r Half of the ECDSA signature pair
     * @param s Half of the ECDSA signature pair
     * @return The actual amount repaid
     */
    function repayWithPermit(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused onlyPositionManager(onBehalfOf) returns (uint256) {
        // Execute permit to approve the pool
        IERC20WithPermit(asset).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );

        // Execute repay
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

    // ============================================
    // FLASH LOAN FUNCTIONS
    // ============================================

    /**
     * @notice Allows smartcontracts to access the liquidity of the pool within one transaction
     * @param receiverAddress The address of the contract receiving the funds
     * @param assets The addresses of the assets being flash-borrowed
     * @param amounts The amounts of the assets being flash-borrowed
     * @param interestRateModes Types of debt: 0 for flash loan (repay), 1/2 for open debt position
     * @param onBehalfOf The address that will receive the debt in case of using modes 1 or 2
     * @param params Variadic packed params to pass to the receiver
     * @param referralCode Referral code for integrations
     */
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external whenNotPaused {
        _executeFlashLoan(
            receiverAddress,
            assets,
            amounts,
            interestRateModes,
            onBehalfOf,
            params,
            referralCode
        );
    }

    /**
     * @dev Internal function to execute flash loan - separate stack frame avoids stack too deep
     */
    function _executeFlashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) internal {
        // Build struct step-by-step to avoid stack too deep with calldata arrays
        DataTypes.FlashloanParams memory flashParams;
        
        // Assign parameters
        flashParams.receiverAddress = receiverAddress;
        flashParams.assets = assets;
        flashParams.amounts = amounts;
        flashParams.interestRateModes = interestRateModes;
        flashParams.onBehalfOf = onBehalfOf;
        flashParams.params = params;
        flashParams.referralCode = referralCode;
        
        // Assign storage values
        flashParams.flashLoanPremiumToProtocol = _flashLoanPremiumToProtocol;
        flashParams.flashLoanPremiumTotal = _flashLoanPremiumTotal;
        flashParams.reservesCount = _reservesCount;
        flashParams.addressesProvider = _addressesProvider;
        flashParams.pool = address(this);
        flashParams.userEModeCategory = _usersEModeCategory[onBehalfOf];
        flashParams.isAuthorizedFlashBorrower = _flashBorrowers[msg.sender];
        
        FlashLoanLogic.executeFlashLoan(
            _reserves,
            _reservesList,
            _eModeCategories,
            _usersConfig[onBehalfOf],
            flashParams
        );
    }

    /**
     * @notice Allows smartcontracts to access the liquidity of ONE reserve within one transaction
     * @param receiverAddress The address of the contract receiving the funds
     * @param asset The address of the asset being flash-borrowed
     * @param amount The amount of the asset being flash-borrowed
     * @param params Variadic packed params to pass to the receiver
     * @param referralCode Referral code for integrations
     */
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external whenNotPaused {
        FlashLoanLogic.executeFlashLoanSimple(
            _reserves[asset],
            DataTypes.FlashloanSimpleParams({
                receiverAddress: receiverAddress,
                asset: asset,
                amount: amount,
                params: params,
                referralCode: referralCode,
                flashLoanPremiumToProtocol: _flashLoanPremiumToProtocol,
                flashLoanPremiumTotal: _flashLoanPremiumTotal
            })
        );
    }

    // ============================================
    // FLASH LOAN ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Set flash loan premiums
     * @param flashLoanPremiumTotal Total premium in bps (e.g., 9 = 0.09%)
     * @param flashLoanPremiumToProtocol Protocol share in bps (e.g., 3000 = 30% of total premium)
     */
    function setFlashLoanPremiums(
        uint128 flashLoanPremiumTotal,
        uint128 flashLoanPremiumToProtocol
    ) external onlyAdmin {
        require(flashLoanPremiumToProtocol <= 10000, "Protocol premium > 100%");
        _flashLoanPremiumTotal = flashLoanPremiumTotal;
        _flashLoanPremiumToProtocol = flashLoanPremiumToProtocol;
    }

    /**
     * @notice Authorize/deauthorize a flash borrower (fee waiver)
     * @param borrower The address to authorize/deauthorize
     * @param authorized True to authorize, false to revoke
     */
    function setFlashBorrowerAuthorization(
        address borrower,
        bool authorized
    ) external onlyAdmin {
        _flashBorrowers[borrower] = authorized;
    }

    /**
     * @notice Get flash loan premium total
     */
    function getFlashLoanPremiumTotal() external view returns (uint128) {
        return _flashLoanPremiumTotal;
    }

    /**
     * @notice Get flash loan premium to protocol
     */
    function getFlashLoanPremiumToProtocol() external view returns (uint128) {
        return _flashLoanPremiumToProtocol;
    }

    /**
     * @notice Check if address is authorized flash borrower
     */
    function isFlashBorrower(address borrower) external view returns (bool) {
        return _flashBorrowers[borrower];
    }

    /**
     * @notice Get reserves count
     */
    function getReservesCount() external view returns (uint256) {
        return _reservesCount;
    }
}
