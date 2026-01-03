// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IFuturesCurveOracle} from "../interfaces/IFuturesCurveOracle.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title FuturesCurveOracle
 * @notice Oracle for commodity futures curve data
 * @dev Provides contango/backwardation signals and regional basis data
 *      for commodity interest rate adjustments. Data is updated by
 *      authorized data providers (off-chain oracles or keeper bots)
 * 
 * PHASE 2 UPGRADE: Converted to UUPS upgradeable pattern
 * - Owner-controlled upgrades
 * - Storage gap for future enhancements
 * - Initialize-based deployment instead of constructor
 */
contract FuturesCurveOracle is 
    IFuturesCurveOracle,
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    
    // ============ Constants ============
    
    // Maximum staleness for futures data (24 hours)
    uint256 public constant MAX_STALENESS = 24 hours;
    
    // Minimum staleness check (1 hour)
    uint256 public constant MIN_STALENESS_CHECK = 1 hours;
    
    // Maximum basis spread (50% annualized)
    int256 public constant MAX_BASIS_BPS = 5000;
    int256 public constant MIN_BASIS_BPS = -5000;
    
    // ============ State Variables ============
    
    // Commodity => futures curve data
    mapping(address => FuturesCurveData) private _futuresCurveData;

    
    // Commodity => region => regional basis
    mapping(address => mapping(bytes32 => RegionalBasis)) private _regionalBasis;
    
    // Authorized data providers
    mapping(address => bool) public dataProviders;
    
    // ============ Storage Gap ============
    
    /// @dev Reserve 47 slots for future variables (50 total - 3 current)
    uint256[47] private __gap;
    
    // ============ Region Constants ============
    
    bytes32 public constant REGION_LME = keccak256("LME");      // London Metal Exchange
    bytes32 public constant REGION_COMEX = keccak256("COMEX");  // Chicago COMEX
    bytes32 public constant REGION_SHFE = keccak256("SHFE");    // Shanghai Futures
    bytes32 public constant REGION_NYMEX = keccak256("NYMEX");  // New York Mercantile
    bytes32 public constant REGION_ICE = keccak256("ICE");      // Intercontinental Exchange
    bytes32 public constant REGION_CME = keccak256("CME");      // Chicago Mercantile
    
    // ============ Events ============
    
    event DataProviderUpdated(address indexed provider, bool authorized);
    event Upgraded(address indexed newImplementation);
    
    // ============ Errors ============
    
    error ZeroAddress();
    error InvalidProvider();
    error InvalidSpotPrice();
    error InvalidNearMonthPrice();
    error NearMonthExpired();
    error BasisOutOfRange();
    error NotAuthorized();
    
    // ============ Constructor ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initialization ============
    
    /**
     * @notice Initialize the FuturesCurveOracle (replaces constructor)
     * @param owner The owner address
     */
    function initialize(address owner) external initializer {
        if (owner == address(0)) revert ZeroAddress();

        __Ownable_init(owner);
        __UUPSUpgradeable_init();
    }

    // ============ Upgrade Authorization ============
    
    /**
     * @notice Authorize contract upgrades
     * @dev Only owner can upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {
        emit Upgraded(newImplementation);
    }
    
    // ============ Modifiers ============
    
    modifier onlyDataProvider() {
        if (!dataProviders[msg.sender] && msg.sender != owner()) revert NotAuthorized();
        _;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set data provider authorization
     * @param provider Address of the data provider
     * @param authorized Whether the provider is authorized
     */
    function setDataProvider(address provider, bool authorized) external onlyOwner {
        if (provider == address(0)) revert InvalidProvider();
        dataProviders[provider] = authorized;
        emit DataProviderUpdated(provider, authorized);
    }
    
    // ============ Data Update Functions ============
    
    /**
     * @notice Update futures curve data for a commodity
     * @param commodity The commodity token address
     * @param spotPrice Current spot price (8 decimals)
     * @param nearMonthPrice Near month futures price
     * @param farMonthPrice Far month futures price
     * @param nearMonthExpiry Near month expiry timestamp
     * @param farMonthExpiry Far month expiry timestamp
     */
    function updateFuturesCurve(
        address commodity,
        uint256 spotPrice,
        uint256 nearMonthPrice,
        uint256 farMonthPrice,
        uint256 nearMonthExpiry,
        uint256 farMonthExpiry
    ) external onlyDataProvider {
        if (commodity == address(0)) revert ZeroAddress();
        if (spotPrice == 0) revert InvalidSpotPrice();
        if (nearMonthPrice == 0) revert InvalidNearMonthPrice();
        if (nearMonthExpiry <= block.timestamp) revert NearMonthExpired();
        
        // Calculate contango/backwardation
        bool isContangoState = nearMonthPrice > spotPrice;
        
        // Calculate annualized basis
        int256 annualizedBasis = _calculateAnnualizedBasis(
            spotPrice,
            nearMonthPrice,
            nearMonthExpiry
        );
        
        // Store data
        _futuresCurveData[commodity] = FuturesCurveData({
            spotPrice: spotPrice,
            nearMonthPrice: nearMonthPrice,
            farMonthPrice: farMonthPrice,
            nearMonthExpiry: nearMonthExpiry,
            farMonthExpiry: farMonthExpiry,
            lastUpdateTimestamp: block.timestamp,
            isContango: isContangoState,
            annualizedBasisBps: annualizedBasis
        });
        
        emit FuturesCurveUpdated(
            commodity,
            spotPrice,
            nearMonthPrice,
            isContangoState,
            annualizedBasis
        );
    }

    
    /**
     * @notice Update regional basis for a commodity
     * @param commodity The commodity token address
     * @param region The region identifier
     * @param premiumBps Premium/discount in basis points
     */
    function updateRegionalBasis(
        address commodity,
        bytes32 region,
        int256 premiumBps
    ) external onlyDataProvider {
        if (commodity == address(0)) revert ZeroAddress();
        if (premiumBps < MIN_BASIS_BPS || premiumBps > MAX_BASIS_BPS) revert BasisOutOfRange();
        
        _regionalBasis[commodity][region] = RegionalBasis({
            region: region,
            premiumBps: premiumBps,
            lastUpdateTimestamp: block.timestamp
        });
        
        emit RegionalBasisUpdated(commodity, region, premiumBps);
    }
    
    // ============ View Functions ============
    
    /// @inheritdoc IFuturesCurveOracle
    function getFuturesCurveData(
        address commodity
    ) external view override returns (FuturesCurveData memory) {
        return _futuresCurveData[commodity];
    }

    
    /// @inheritdoc IFuturesCurveOracle
    function getAnnualizedBasis(
        address commodity
    ) external view override returns (int256) {
        return _futuresCurveData[commodity].annualizedBasisBps;
    }
    
    /// @inheritdoc IFuturesCurveOracle
    function isContango(address commodity) external view override returns (bool) {
        return _futuresCurveData[commodity].isContango;
    }
    
    /// @inheritdoc IFuturesCurveOracle
    function getRegionalBasis(
        address commodity,
        bytes32 region
    ) external view override returns (int256) {
        return _regionalBasis[commodity][region].premiumBps;
    }
    
    /// @inheritdoc IFuturesCurveOracle
    function isFresh(
        address commodity,
        uint256 maxAge
    ) external view override returns (bool) {
        FuturesCurveData memory data = _futuresCurveData[commodity];
        if (data.lastUpdateTimestamp == 0) {
            return false;
        }
        return (block.timestamp - data.lastUpdateTimestamp) <= maxAge;
    }

    
    // ============ Internal Functions ============
    
    /**
     * @notice Calculate annualized basis from spot and futures prices
     * @param spotPrice Current spot price
     * @param futuresPrice Futures contract price
     * @param futuresExpiry Futures expiry timestamp
     * @return annualizedBasisBps Annualized basis in bps
     */
    function _calculateAnnualizedBasis(
        uint256 spotPrice,
        uint256 futuresPrice,
        uint256 futuresExpiry
    ) internal view returns (int256) {
        if (spotPrice == 0) return 0;
        
        // Calculate time to expiry in days
        uint256 daysToExpiry = (futuresExpiry - block.timestamp) / 1 days;
        if (daysToExpiry == 0) daysToExpiry = 1; // Minimum 1 day
        
        // Calculate raw basis: (futures - spot) / spot
        int256 rawBasisBps;
        if (futuresPrice >= spotPrice) {
            rawBasisBps = int256(((futuresPrice - spotPrice) * 10000) / spotPrice);
        } else {
            rawBasisBps = -int256(((spotPrice - futuresPrice) * 10000) / spotPrice);
        }
        
        // Annualize: (rawBasis * 365) / daysToExpiry
        int256 annualized = (rawBasisBps * 365) / int256(daysToExpiry);
        
        // Cap at maximum values
        if (annualized > MAX_BASIS_BPS) return MAX_BASIS_BPS;
        if (annualized < MIN_BASIS_BPS) return MIN_BASIS_BPS;
        
        return annualized;
    }
}
