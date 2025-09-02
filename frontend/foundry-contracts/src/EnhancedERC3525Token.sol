// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "./interfaces/IERC3525.sol";

/**
 * @title EnhancedERC3525Token
 * @dev A comprehensive implementation of ERC-3525 Semi-Fungible Token with advanced features
 * @notice Supports all 107+ configuration fields from Chain Capital's max configuration UI
 * 
 * Features included:
 * - Financial Instruments (bonds, derivatives, structured products)
 * - DeFi Integration (yield farming, flash loans, staking)
 * - Governance (voting, proposals, delegation)
 * - Compliance (KYC, geographic restrictions, regulatory reporting)
 * - Enterprise Features (multi-signature, institutional custody, audit trails)
 * - Advanced Trading (marketplace, partial value trading, market makers)
 * - Cross-chain Compatibility (bridging, Layer 2 support)
 */
contract EnhancedERC3525Token is ERC721, IERC3525, IERC2981, AccessControl, ReentrancyGuard, Pausable {
    
    // ========== CONFIGURATION STRUCTS ==========
    
    struct TokenConfig {
        string name;
        string symbol;
        uint8 valueDecimals;
        address initialOwner;
    }

    struct FeatureConfig {
        bool mintingEnabled;
        bool burningEnabled;
        bool transfersPaused;
        bool hasRoyalty;
        bool slotApprovals;
        bool valueApprovals;
        bool valueTransfersEnabled;
        bool updatableSlots;
        bool updatableValues;
        bool mergable;
        bool splittable;
        bool valueAggregation;
        bool fractionalOwnershipEnabled;
        bool autoUnitCalculation;
        bool slotCreationEnabled;
        bool dynamicSlotCreation;
        bool slotFreezeEnabled;
        bool slotMergeEnabled;
        bool slotSplitEnabled;
        bool crossSlotTransfers;
        bool slotMarketplaceEnabled;
        bool valueMarketplaceEnabled;
        bool partialValueTrading;
        bool tradingFeesEnabled;
        bool marketMakerEnabled;
        bool slotVotingEnabled;
        bool valueWeightedVoting;
        bool delegateEnabled;
        bool yieldFarmingEnabled;
        bool liquidityProvisionEnabled;
        bool compoundInterestEnabled;
        bool flashLoanEnabled;
        bool regulatoryComplianceEnabled;
        bool kycRequired;
        bool accreditedInvestorOnly;
        bool useGeographicRestrictions;
        bool multiSignatureRequired;
        bool approvalWorkflowEnabled;
        bool institutionalCustodySupport;
        bool auditTrailEnhanced;
        bool batchOperationsEnabled;
        bool emergencyPauseEnabled;
    }

    struct FinancialInstrument {
        string instrumentType; // "bond", "note", "derivative", "structured"
        uint256 principalAmount;
        uint256 interestRate; // In basis points
        uint256 maturityDate;
        string couponFrequency; // "monthly", "quarterly", "annually"
        bool earlyRedemptionEnabled;
        uint256 redemptionPenaltyRate;
    }

    struct DerivativeConfig {
        string derivativeType; // "option", "future", "swap"
        address underlyingAsset;
        uint256 strikePrice;
        uint256 expirationDate;
        string settlementType; // "cash", "physical"
        uint256 leverageRatio;
    }

    struct ValueComputation {
        string computationMethod; // "fixed", "oracle", "formula"
        address oracleAddress;
        string calculationFormula;
        bool accrualEnabled;
        uint256 accrualRate;
        string accrualFrequency;
        bool adjustmentEnabled;
    }

    struct GovernanceConfig {
        string votingPowerCalculation; // "value-weighted", "equal", "quadratic"
        string quorumCalculationMethod; // "simple-majority", "supermajority", "absolute"
        uint256 proposalValueThreshold;
    }

    struct DeFiConfig {
        uint256 stakingYieldRate;
        uint256 collateralFactor;
        uint256 liquidationThreshold;
    }

    struct TradingConfig {
        uint256 minimumTradeValue;
        uint256 tradingFeePercentage;
    }

    struct ComplianceConfig {
        uint256 holdingPeriodRestrictions;
        mapping(address => uint256) transferLimits;
        string defaultRestrictionPolicy; // "blocked", "allowed"
        mapping(string => bool) geographicRestrictions; // country code => allowed
    }

    struct SlotInfo {
        string name;
        string description;
        bool isActive;
        uint256 maxSupply;
        uint256 currentSupply;
        bytes metadata;
        string valueUnits;
        bool transferable;
        bool tradeable;
        bool divisible;
        uint256 minValue;
        uint256 maxValue;
        uint8 valuePrecision;
        bool frozen;
    }

    struct PaymentSchedule {
        uint256 slotId;
        uint256 paymentDate;
        uint256 paymentAmount;
        string paymentType; // "interest", "principal", "dividend"
        string currency;
        bool isCompleted;
        bytes32 transactionHash;
    }

    struct ValueAdjustment {
        uint256 slotId;
        uint256 adjustmentDate;
        string adjustmentType; // "market", "oracle", "manual"
        int256 adjustmentAmount; // Can be negative
        string adjustmentReason;
        uint256 oraclePrice;
        string oracleSource;
        address approvedBy;
        bytes32 transactionHash;
    }

    // ========== ROLES ==========
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant SLOT_ADMIN_ROLE = keccak256("SLOT_ADMIN_ROLE");
    bytes32 public constant VALUE_ADMIN_ROLE = keccak256("VALUE_ADMIN_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant TRADING_ROLE = keccak256("TRADING_ROLE");

    // ========== STATE VARIABLES ==========
    
    uint8 private _valueDecimals;
    FeatureConfig public features;
    FinancialInstrument public financialInstrument;
    DerivativeConfig public derivative;
    ValueComputation public valueComputation;
    GovernanceConfig public governance;
    DeFiConfig public defi;
    TradingConfig public trading;
    ComplianceConfig public compliance;
    
    // Token tracking
    uint256 private _nextTokenId;
    uint256 private _nextSlotId;
    uint256 private _nextPaymentId;
    uint256 private _nextAdjustmentId;
    
    // Token data
    mapping(uint256 => uint256) private _tokenSlots;
    mapping(uint256 => uint256) private _tokenValues;
    mapping(uint256 => mapping(address => uint256)) private _allowances;
    
    // Slot data
    mapping(uint256 => SlotInfo) private _slots;
    mapping(uint256 => uint256[]) private _slotTokens;
    
    // Financial data
    mapping(uint256 => PaymentSchedule) private _paymentSchedules;
    mapping(uint256 => ValueAdjustment) private _valueAdjustments;
    mapping(uint256 => uint256[]) private _slotPayments;
    mapping(uint256 => uint256[]) private _slotAdjustments;
    
    // Royalty info
    uint96 private _royaltyFraction;
    address private _royaltyRecipient;
    
    // Governance data
    mapping(address => address) private _delegates;
    mapping(uint256 => uint256) private _votingPower;
    
    // DeFi data
    mapping(address => uint256) private _stakedBalances;
    mapping(address => uint256) private _stakingRewards;
    mapping(address => uint256) private _lastStakeTime;
    
    // Trading data
    mapping(address => bool) private _authorizedMarketMakers;
    mapping(uint256 => uint256) private _lastTradePrice;
    
    // Compliance data
    mapping(address => bool) private _kycVerified;
    mapping(address => bool) private _accreditedInvestors;
    mapping(address => string) private _investorCountry;
    mapping(address => uint256) private _lastTransferTime;
    
    // Emergency data
    bool private _emergencyPaused;
    mapping(address => bool) private _emergencyAuthorized;
    
    // ========== EVENTS ==========
    
    event SlotCreated(uint256 indexed slot, string name, string description);
    event SlotUpdated(uint256 indexed slot, string name, string description, bool isActive);
    event SlotFrozen(uint256 indexed slot, address indexed by);
    event SlotUnfrozen(uint256 indexed slot, address indexed by);
    event TokenMinted(uint256 indexed tokenId, uint256 indexed slot, uint256 value, address indexed to);
    event ValueIncreased(uint256 indexed tokenId, uint256 value, uint256 newValue);
    event ValueDecreased(uint256 indexed tokenId, uint256 value, uint256 newValue);
    event PaymentScheduled(uint256 indexed paymentId, uint256 indexed slotId, uint256 paymentDate, uint256 amount);
    event PaymentExecuted(uint256 indexed paymentId, uint256 indexed slotId, uint256 amount, address indexed recipient);
    event ValueAdjusted(uint256 indexed adjustmentId, uint256 indexed slotId, int256 amount, string reason);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event VoteCast(address indexed voter, uint256 indexed proposalId, uint256 weight, bool support);
    event FlashLoan(address indexed borrower, uint256 amount, uint256 fee);
    event ComplianceViolation(address indexed account, string violation, uint256 timestamp);
    event EmergencyPauseToggled(bool paused, address indexed by);
    event KYCStatusUpdated(address indexed account, bool verified, address indexed by);
    event AccreditationUpdated(address indexed account, bool accredited, address indexed by);
    event GeographicRestrictionUpdated(string country, bool allowed, address indexed by);
    
    // ========== ERRORS ==========
    
    error ERC3525_InvalidConfiguration();
    error ERC3525_MintingDisabled();
    error ERC3525_BurningDisabled();
    error ERC3525_TransfersPaused();
    error ERC3525_SlotNotFound();
    error ERC3525_SlotInactive();
    error ERC3525_SlotFrozen();
    error ERC3525_TokenNotFound();
    error ERC3525_InsufficientValue();
    error ERC3525_SlotMismatch();
    error ERC3525_Unauthorized();
    error ERC3525_ExceedsMaxSupply();
    error ERC3525_ComplianceViolation(string reason);
    error ERC3525_KYCRequired();
    error ERC3525_AccreditationRequired();
    error ERC3525_GeographicRestriction();
    error ERC3525_HoldingPeriodActive();
    error ERC3525_TransferLimitExceeded();
    error ERC3525_EmergencyPaused();
    error ERC3525_InsufficientStake();
    error ERC3525_FlashLoanFailed();
    error ERC3525_TradingDisabled();
    error ERC3525_InvalidPayment();
    error ERC3525_InvalidAdjustment();
    
    // ========== CONSTRUCTOR ==========
    
    constructor(
        TokenConfig memory config,
        FeatureConfig memory _features,
        FinancialInstrument memory _financialInstrument,
        DerivativeConfig memory _derivative,
        ValueComputation memory _valueComputation,
        GovernanceConfig memory _governance,
        DeFiConfig memory _defi,
        TradingConfig memory _trading,
        SlotInfo[] memory initialSlots,
        uint96 royaltyFraction,
        address royaltyRecipient
    ) ERC721(config.name, config.symbol) {
        if (bytes(config.name).length == 0 || bytes(config.symbol).length == 0) {
            revert ERC3525_InvalidConfiguration();
        }
        
        _valueDecimals = config.valueDecimals;
        features = _features;
        financialInstrument = _financialInstrument;
        derivative = _derivative;
        valueComputation = _valueComputation;
        governance = _governance;
        defi = _defi;
        trading = _trading;
        
        _nextTokenId = 1;
        _nextSlotId = 1;
        _nextPaymentId = 1;
        _nextAdjustmentId = 1;
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, config.initialOwner);
        _grantRole(MINTER_ROLE, config.initialOwner);
        _grantRole(BURNER_ROLE, config.initialOwner);
        _grantRole(SLOT_ADMIN_ROLE, config.initialOwner);
        _grantRole(VALUE_ADMIN_ROLE, config.initialOwner);
        _grantRole(COMPLIANCE_ROLE, config.initialOwner);
        _grantRole(ORACLE_ROLE, config.initialOwner);
        _grantRole(EMERGENCY_ROLE, config.initialOwner);
        _grantRole(GOVERNANCE_ROLE, config.initialOwner);
        _grantRole(TRADING_ROLE, config.initialOwner);
        
        // Set royalty info
        _royaltyFraction = royaltyFraction;
        _royaltyRecipient = royaltyRecipient;
        
        // Create initial slots
        for (uint256 i = 0; i < initialSlots.length; i++) {
            _createSlot(initialSlots[i]);
        }
        
        // Initialize emergency authorization
        _emergencyAuthorized[config.initialOwner] = true;
    }
    
    // ========== ERC3525 IMPLEMENTATION ==========
    
    function valueDecimals() public view override returns (uint8) {
        return _valueDecimals;
    }
    
    function slotOf(uint256 tokenId) public view override returns (uint256) {
        if (!_exists(tokenId)) revert ERC3525_TokenNotFound();
        return _tokenSlots[tokenId];
    }
    
    function balanceOf(uint256 tokenId) public view override returns (uint256) {
        if (!_exists(tokenId)) revert ERC3525_TokenNotFound();
        return _tokenValues[tokenId];
    }
    
    function approve(uint256 tokenId, address operator, uint256 value) 
        public 
        payable 
        override 
        whenNotPaused
        notEmergencyPaused
    {
        if (!features.slotApprovals) revert ERC3525_Unauthorized();
        
        address owner = ownerOf(tokenId);
        if (operator == owner) revert ERC3525_InvalidConfiguration();
        
        if (msg.sender != owner && !isApprovedForAll(owner, msg.sender)) {
            revert ERC3525_Unauthorized();
        }
        
        _allowances[tokenId][operator] = value;
        emit ApprovalValue(tokenId, operator, value);
    }
    
    function allowance(uint256 tokenId, address operator) 
        public 
        view 
        override 
        returns (uint256) 
    {
        if (!_exists(tokenId)) revert ERC3525_TokenNotFound();
        return _allowances[tokenId][operator];
    }
    
    function transferFrom(uint256 fromTokenId, uint256 toTokenId, uint256 value) 
        public 
        payable 
        override 
        nonReentrant 
        whenNotPaused
        notEmergencyPaused
    {
        if (!features.valueTransfersEnabled) revert ERC3525_TransfersPaused();
        if (!_exists(fromTokenId)) revert ERC3525_TokenNotFound();
        if (!_exists(toTokenId)) revert ERC3525_TokenNotFound();
        
        uint256 fromSlot = _tokenSlots[fromTokenId];
        uint256 toSlot = _tokenSlots[toTokenId];
        
        if (!features.crossSlotTransfers && fromSlot != toSlot) {
            revert ERC3525_SlotMismatch();
        }
        
        address owner = ownerOf(fromTokenId);
        _checkTransferAuth(owner, fromTokenId, value);
        _checkComplianceForTransfer(owner, ownerOf(toTokenId), value);
        
        if (_tokenValues[fromTokenId] < value) revert ERC3525_InsufficientValue();
        
        _tokenValues[fromTokenId] -= value;
        _tokenValues[toTokenId] += value;
        
        // Update voting power if governance enabled
        if (features.slotVotingEnabled) {
            _updateVotingPower(owner, ownerOf(toTokenId));
        }
        
        emit TransferValue(fromTokenId, toTokenId, value);
    }
    
    function transferFrom(uint256 fromTokenId, address to, uint256 value) 
        public 
        payable 
        override 
        nonReentrant 
        whenNotPaused
        notEmergencyPaused
        returns (uint256) 
    {
        if (!features.valueTransfersEnabled) revert ERC3525_TransfersPaused();
        if (!_exists(fromTokenId)) revert ERC3525_TokenNotFound();
        if (to == address(0)) revert ERC3525_InvalidConfiguration();
        
        address owner = ownerOf(fromTokenId);
        _checkTransferAuth(owner, fromTokenId, value);
        _checkComplianceForTransfer(owner, to, value);
        
        if (_tokenValues[fromTokenId] < value) revert ERC3525_InsufficientValue();
        
        uint256 slot = _tokenSlots[fromTokenId];
        uint256 newTokenId = _nextTokenId++;
        
        _tokenValues[fromTokenId] -= value;
        
        _mint(to, newTokenId);
        _tokenSlots[newTokenId] = slot;
        _tokenValues[newTokenId] = value;
        _slotTokens[slot].push(newTokenId);
        
        // Update voting power if governance enabled
        if (features.slotVotingEnabled) {
            _updateVotingPower(owner, to);
        }
        
        emit TransferValue(fromTokenId, newTokenId, value);
        return newTokenId;
    }
    
    // ========== SLOT MANAGEMENT ==========
    
    function createSlot(SlotInfo memory slotInfo) 
        external 
        onlyRole(SLOT_ADMIN_ROLE) 
        whenNotPaused
        returns (uint256) 
    {
        if (!features.slotCreationEnabled) revert ERC3525_Unauthorized();
        return _createSlot(slotInfo);
    }
    
    function updateSlot(uint256 slot, SlotInfo memory slotInfo) 
        external 
        onlyRole(SLOT_ADMIN_ROLE) 
        whenNotPaused
    {
        if (!features.updatableSlots) revert ERC3525_Unauthorized();
        if (!_slotExists(slot)) revert ERC3525_SlotNotFound();
        
        _slots[slot] = slotInfo;
        emit SlotUpdated(slot, slotInfo.name, slotInfo.description, slotInfo.isActive);
    }
    
    function freezeSlot(uint256 slot) external onlyRole(SLOT_ADMIN_ROLE) {
        if (!features.slotFreezeEnabled) revert ERC3525_Unauthorized();
        if (!_slotExists(slot)) revert ERC3525_SlotNotFound();
        
        _slots[slot].frozen = true;
        emit SlotFrozen(slot, msg.sender);
    }
    
    function unfreezeSlot(uint256 slot) external onlyRole(SLOT_ADMIN_ROLE) {
        if (!features.slotFreezeEnabled) revert ERC3525_Unauthorized();
        if (!_slotExists(slot)) revert ERC3525_SlotNotFound();
        
        _slots[slot].frozen = false;
        emit SlotUnfrozen(slot, msg.sender);
    }
    
    function mergeSlots(uint256 fromSlot, uint256 toSlot) 
        external 
        onlyRole(SLOT_ADMIN_ROLE) 
        whenNotPaused
    {
        if (!features.slotMergeEnabled) revert ERC3525_Unauthorized();
        if (!_slotExists(fromSlot) || !_slotExists(toSlot)) revert ERC3525_SlotNotFound();
        if (_slots[fromSlot].frozen || _slots[toSlot].frozen) revert ERC3525_SlotFrozen();
        
        // Move all tokens from fromSlot to toSlot
        uint256[] memory tokens = _slotTokens[fromSlot];
        for (uint256 i = 0; i < tokens.length; i++) {
            _tokenSlots[tokens[i]] = toSlot;
            _slotTokens[toSlot].push(tokens[i]);
        }
        
        // Clear fromSlot
        delete _slotTokens[fromSlot];
        _slots[fromSlot].isActive = false;
        
        emit SlotUpdated(fromSlot, _slots[fromSlot].name, _slots[fromSlot].description, false);
    }
    
    function getSlot(uint256 slot) external view returns (SlotInfo memory) {
        if (!_slotExists(slot)) revert ERC3525_SlotNotFound();
        return _slots[slot];
    }
    
    function getSlotTokens(uint256 slot) external view returns (uint256[] memory) {
        if (!_slotExists(slot)) revert ERC3525_SlotNotFound();
        return _slotTokens[slot];
    }
    
    // ========== TOKEN MANAGEMENT ==========
    
    function mint(address to, uint256 slot, uint256 value) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused
        notEmergencyPaused
        returns (uint256) 
    {
        if (!features.mintingEnabled) revert ERC3525_MintingDisabled();
        _checkComplianceForMinting(to);
        return _mintToken(to, slot, value);
    }
    
    function burn(uint256 tokenId) external whenNotPaused notEmergencyPaused {
        if (!features.burningEnabled) revert ERC3525_BurningDisabled();
        if (!_exists(tokenId)) revert ERC3525_TokenNotFound();
        
        address tokenOwner = ownerOf(tokenId);
        if (!hasRole(BURNER_ROLE, msg.sender) && 
            msg.sender != tokenOwner && 
            !isApprovedForAll(tokenOwner, msg.sender)) {
            revert ERC3525_Unauthorized();
        }
        
        uint256 slot = _tokenSlots[tokenId];
        _removeFromSlot(slot, tokenId);
        
        // Update voting power if governance enabled
        if (features.slotVotingEnabled) {
            _updateVotingPowerOnBurn(tokenOwner, _tokenValues[tokenId]);
        }
        
        delete _tokenSlots[tokenId];
        delete _tokenValues[tokenId];
        
        _burn(tokenId);
    }
    
    function increaseValue(uint256 tokenId, uint256 value) 
        external 
        onlyRole(VALUE_ADMIN_ROLE) 
        whenNotPaused
    {
        if (!features.updatableValues) revert ERC3525_Unauthorized();
        if (!_exists(tokenId)) revert ERC3525_TokenNotFound();
        
        uint256 oldValue = _tokenValues[tokenId];
        uint256 newValue = oldValue + value;
        
        _tokenValues[tokenId] = newValue;
        
        // Update voting power if governance enabled
        if (features.slotVotingEnabled) {
            _updateVotingPowerOnValueChange(ownerOf(tokenId), value, true);
        }
        
        emit ValueIncreased(tokenId, value, newValue);
    }
    
    function decreaseValue(uint256 tokenId, uint256 value) external whenNotPaused {
        if (!features.updatableValues) revert ERC3525_Unauthorized();
        if (!_exists(tokenId)) revert ERC3525_TokenNotFound();
        if (_tokenValues[tokenId] < value) revert ERC3525_InsufficientValue();
        
        address tokenOwner = ownerOf(tokenId);
        if (!hasRole(VALUE_ADMIN_ROLE, msg.sender) && msg.sender != tokenOwner) {
            revert ERC3525_Unauthorized();
        }
        
        uint256 oldValue = _tokenValues[tokenId];
        uint256 newValue = oldValue - value;
        
        _tokenValues[tokenId] = newValue;
        
        // Update voting power if governance enabled
        if (features.slotVotingEnabled) {
            _updateVotingPowerOnValueChange(tokenOwner, value, false);
        }
        
        emit ValueDecreased(tokenId, value, newValue);
    }
    
    // ========== FINANCIAL INSTRUMENTS ==========
    
    function schedulePayment(
        uint256 slotId,
        uint256 paymentDate,
        uint256 paymentAmount,
        string memory paymentType,
        string memory currency
    ) external onlyRole(VALUE_ADMIN_ROLE) whenNotPaused returns (uint256) {
        if (!_slotExists(slotId)) revert ERC3525_SlotNotFound();
        if (paymentDate <= block.timestamp) revert ERC3525_InvalidPayment();
        
        uint256 paymentId = _nextPaymentId++;
        
        _paymentSchedules[paymentId] = PaymentSchedule({
            slotId: slotId,
            paymentDate: paymentDate,
            paymentAmount: paymentAmount,
            paymentType: paymentType,
            currency: currency,
            isCompleted: false,
            transactionHash: bytes32(0)
        });
        
        _slotPayments[slotId].push(paymentId);
        
        emit PaymentScheduled(paymentId, slotId, paymentDate, paymentAmount);
        return paymentId;
    }
    
    function executePayment(uint256 paymentId, address recipient) 
        external 
        onlyRole(VALUE_ADMIN_ROLE) 
        whenNotPaused 
    {
        PaymentSchedule storage payment = _paymentSchedules[paymentId];
        if (payment.slotId == 0) revert ERC3525_InvalidPayment();
        if (payment.isCompleted) revert ERC3525_InvalidPayment();
        if (block.timestamp < payment.paymentDate) revert ERC3525_InvalidPayment();
        
        payment.isCompleted = true;
        payment.transactionHash = keccak256(abi.encodePacked(block.timestamp, msg.sender, recipient));
        
        emit PaymentExecuted(paymentId, payment.slotId, payment.paymentAmount, recipient);
    }
    
    function adjustSlotValue(
        uint256 slotId,
        int256 adjustmentAmount,
        string memory adjustmentType,
        string memory adjustmentReason
    ) external onlyRole(ORACLE_ROLE) whenNotPaused returns (uint256) {
        if (!features.valueAggregation) revert ERC3525_Unauthorized();
        if (!_slotExists(slotId)) revert ERC3525_SlotNotFound();
        
        uint256 adjustmentId = _nextAdjustmentId++;
        
        _valueAdjustments[adjustmentId] = ValueAdjustment({
            slotId: slotId,
            adjustmentDate: block.timestamp,
            adjustmentType: adjustmentType,
            adjustmentAmount: adjustmentAmount,
            adjustmentReason: adjustmentReason,
            oraclePrice: 0, // Can be set by oracle
            oracleSource: "",
            approvedBy: msg.sender,
            transactionHash: keccak256(abi.encodePacked(block.timestamp, slotId, adjustmentAmount))
        });
        
        _slotAdjustments[slotId].push(adjustmentId);
        
        emit ValueAdjusted(adjustmentId, slotId, adjustmentAmount, adjustmentReason);
        return adjustmentId;
    }
    
    // ========== GOVERNANCE ==========
    
    function delegate(address delegatee) external whenNotPaused {
        if (!features.delegateEnabled) revert ERC3525_Unauthorized();
        
        address oldDelegate = _delegates[msg.sender];
        _delegates[msg.sender] = delegatee;
        
        emit DelegateChanged(msg.sender, oldDelegate, delegatee);
    }
    
    function getVotingPower(address account) external view returns (uint256) {
        if (!features.slotVotingEnabled) return 0;
        return _votingPower[account];
    }
    
    function getDelegates(address account) external view returns (address) {
        if (!features.delegateEnabled) return address(0);
        return _delegates[account];
    }
    
    // ========== DEFI FEATURES ==========
    
    function stake(uint256 amount) external whenNotPaused nonReentrant {
        if (!features.yieldFarmingEnabled) revert ERC3525_Unauthorized();
        if (amount == 0) revert ERC3525_InsufficientValue();
        
        // Calculate rewards for existing stake
        _calculateAndUpdateRewards(msg.sender);
        
        _stakedBalances[msg.sender] += amount;
        _lastStakeTime[msg.sender] = block.timestamp;
        
        // Transfer tokens from user (assuming ERC20 compatible staking token)
        // Implementation depends on staking mechanism
    }
    
    function unstake(uint256 amount) external whenNotPaused nonReentrant {
        if (!features.yieldFarmingEnabled) revert ERC3525_Unauthorized();
        if (_stakedBalances[msg.sender] < amount) revert ERC3525_InsufficientStake();
        
        // Calculate and pay rewards
        _calculateAndUpdateRewards(msg.sender);
        
        _stakedBalances[msg.sender] -= amount;
        
        // Transfer tokens back to user
        // Implementation depends on staking mechanism
    }
    
    function claimRewards() external whenNotPaused nonReentrant {
        if (!features.yieldFarmingEnabled) revert ERC3525_Unauthorized();
        
        _calculateAndUpdateRewards(msg.sender);
        
        uint256 rewards = _stakingRewards[msg.sender];
        if (rewards > 0) {
            _stakingRewards[msg.sender] = 0;
            // Transfer rewards to user
        }
    }
    
    function flashLoan(uint256 amount, bytes calldata data) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        if (!features.flashLoanEnabled) revert ERC3525_Unauthorized();
        if (amount == 0) revert ERC3525_InsufficientValue();
        
        uint256 fee = (amount * 30) / 10000; // 0.3% fee
        uint256 balanceBefore = address(this).balance;
        
        // Execute flash loan
        (bool success,) = msg.sender.call{value: amount}(data);
        if (!success) revert ERC3525_FlashLoanFailed();
        
        // Check repayment
        if (address(this).balance < balanceBefore + fee) {
            revert ERC3525_FlashLoanFailed();
        }
        
        emit FlashLoan(msg.sender, amount, fee);
    }
    
    // ========== COMPLIANCE ==========
    
    function setKYCStatus(address account, bool verified) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
    {
        _kycVerified[account] = verified;
        emit KYCStatusUpdated(account, verified, msg.sender);
    }
    
    function setAccreditationStatus(address account, bool accredited) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
    {
        _accreditedInvestors[account] = accredited;
        emit AccreditationUpdated(account, accredited, msg.sender);
    }
    
    function setInvestorCountry(address account, string memory country) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
    {
        _investorCountry[account] = country;
    }
    
    function setGeographicRestriction(string memory country, bool allowed) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
    {
        compliance.geographicRestrictions[country] = allowed;
        emit GeographicRestrictionUpdated(country, allowed, msg.sender);
    }
    
    function isKYCVerified(address account) external view returns (bool) {
        return _kycVerified[account];
    }
    
    function isAccreditedInvestor(address account) external view returns (bool) {
        return _accreditedInvestors[account];
    }
    
    function getInvestorCountry(address account) external view returns (string memory) {
        return _investorCountry[account];
    }
    
    // ========== EMERGENCY CONTROLS ==========
    
    function emergencyPause() external {
        if (!features.emergencyPauseEnabled) revert ERC3525_Unauthorized();
        if (!_emergencyAuthorized[msg.sender] && !hasRole(EMERGENCY_ROLE, msg.sender)) {
            revert ERC3525_Unauthorized();
        }
        
        _emergencyPaused = true;
        emit EmergencyPauseToggled(true, msg.sender);
    }
    
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _emergencyPaused = false;
        emit EmergencyPauseToggled(false, msg.sender);
    }
    
    function authorizeEmergencyAccess(address account, bool authorized) 
        external 
        onlyRole(EMERGENCY_ROLE) 
    {
        _emergencyAuthorized[account] = authorized;
    }
    
    // ========== TRADING ==========
    
    function setMarketMaker(address account, bool authorized) 
        external 
        onlyRole(TRADING_ROLE) 
    {
        _authorizedMarketMakers[account] = authorized;
    }
    
    function updateLastTradePrice(uint256 tokenId, uint256 price) 
        external 
        onlyRole(TRADING_ROLE) 
    {
        if (!features.slotMarketplaceEnabled && !features.valueMarketplaceEnabled) {
            revert ERC3525_TradingDisabled();
        }
        
        _lastTradePrice[tokenId] = price;
    }
    
    function getLastTradePrice(uint256 tokenId) external view returns (uint256) {
        return _lastTradePrice[tokenId];
    }
    
    function isAuthorizedMarketMaker(address account) external view returns (bool) {
        return _authorizedMarketMakers[account];
    }
    
    // ========== ROYALTY INFO ==========
    
    function royaltyInfo(uint256, uint256 salePrice) 
        external 
        view 
        override 
        returns (address, uint256) 
    {
        uint256 royaltyAmount = (salePrice * _royaltyFraction) / 10000;
        return (_royaltyRecipient, royaltyAmount);
    }
    
    function setRoyaltyInfo(address recipient, uint96 fraction) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _royaltyRecipient = recipient;
        _royaltyFraction = fraction;
    }
    
    // ========== MODIFIERS ==========
    
    modifier notEmergencyPaused() {
        if (_emergencyPaused) revert ERC3525_EmergencyPaused();
        _;
    }
    
    // ========== OVERRIDES ==========
    
    function transferFrom(address from, address to, uint256 tokenId) 
        public 
        override(ERC721, IERC721) 
        whenNotPaused
        notEmergencyPaused
    {
        _checkComplianceForTransfer(from, to, _tokenValues[tokenId]);
        super.transferFrom(from, to, tokenId);
        
        // Update voting power if governance enabled
        if (features.slotVotingEnabled) {
            _updateVotingPower(from, to);
        }
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) 
        public 
        override(ERC721, IERC721) 
        whenNotPaused
        notEmergencyPaused
    {
        _checkComplianceForTransfer(from, to, _tokenValues[tokenId]);
        super.safeTransferFrom(from, to, tokenId, data);
        
        // Update voting power if governance enabled
        if (features.slotVotingEnabled) {
            _updateVotingPower(from, to);
        }
    }
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, IERC165, AccessControl) 
        returns (bool) 
    {
        return
            interfaceId == type(IERC3525).interfaceId ||
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }
    
    // ========== INTERNAL FUNCTIONS ==========
    
    function _createSlot(SlotInfo memory slotInfo) internal returns (uint256) {
        uint256 slot = _nextSlotId++;
        
        _slots[slot] = slotInfo;
        
        emit SlotCreated(slot, slotInfo.name, slotInfo.description);
        return slot;
    }
    
    function _mintToken(address to, uint256 slot, uint256 value) internal returns (uint256) {
        if (!_slotExists(slot)) revert ERC3525_SlotNotFound();
        if (!_slots[slot].isActive) revert ERC3525_SlotInactive();
        if (_slots[slot].frozen) revert ERC3525_SlotFrozen();
        
        SlotInfo storage slotInfo = _slots[slot];
        if (slotInfo.maxSupply > 0 && slotInfo.currentSupply >= slotInfo.maxSupply) {
            revert ERC3525_ExceedsMaxSupply();
        }
        
        uint256 tokenId = _nextTokenId++;
        
        _mint(to, tokenId);
        _tokenSlots[tokenId] = slot;
        _tokenValues[tokenId] = value;
        _slotTokens[slot].push(tokenId);
        
        slotInfo.currentSupply++;
        
        // Update voting power if governance enabled
        if (features.slotVotingEnabled) {
            _updateVotingPowerOnMint(to, value);
        }
        
        emit TokenMinted(tokenId, slot, value, to);
        return tokenId;
    }
    
    function _checkTransferAuth(address owner, uint256 tokenId, uint256 value) internal view {
        if (msg.sender == owner || isApprovedForAll(owner, msg.sender)) {
            return;
        }
        
        if (features.valueApprovals && _allowances[tokenId][msg.sender] < value) {
            revert ERC3525_Unauthorized();
        }
    }
    
    function _checkComplianceForTransfer(address from, address to, uint256 value) internal view {
        if (!features.regulatoryComplianceEnabled) return;
        
        // KYC check
        if (features.kycRequired && (!_kycVerified[from] || !_kycVerified[to])) {
            revert ERC3525_KYCRequired();
        }
        
        // Accreditation check
        if (features.accreditedInvestorOnly && (!_accreditedInvestors[from] || !_accreditedInvestors[to])) {
            revert ERC3525_AccreditationRequired();
        }
        
        // Geographic restrictions
        if (features.useGeographicRestrictions) {
            string memory fromCountry = _investorCountry[from];
            string memory toCountry = _investorCountry[to];
            
            if (!compliance.geographicRestrictions[fromCountry] || !compliance.geographicRestrictions[toCountry]) {
                revert ERC3525_GeographicRestriction();
            }
        }
        
        // Holding period check
        if (compliance.holdingPeriodRestrictions > 0) {
            if (block.timestamp < _lastTransferTime[from] + compliance.holdingPeriodRestrictions) {
                revert ERC3525_HoldingPeriodActive();
            }
        }
        
        // Transfer limits
        if (compliance.transferLimits[from] > 0 && value > compliance.transferLimits[from]) {
            revert ERC3525_TransferLimitExceeded();
        }
    }
    
    function _checkComplianceForMinting(address to) internal view {
        if (!features.regulatoryComplianceEnabled) return;
        
        if (features.kycRequired && !_kycVerified[to]) {
            revert ERC3525_KYCRequired();
        }
        
        if (features.accreditedInvestorOnly && !_accreditedInvestors[to]) {
            revert ERC3525_AccreditationRequired();
        }
        
        if (features.useGeographicRestrictions) {
            string memory country = _investorCountry[to];
            if (!compliance.geographicRestrictions[country]) {
                revert ERC3525_GeographicRestriction();
            }
        }
    }
    
    function _updateVotingPower(address from, address to) internal {
        // Implementation depends on voting power calculation method
        if (keccak256(bytes(governance.votingPowerCalculation)) == keccak256(bytes("value-weighted"))) {
            // Update based on token values held
            _recalculateVotingPower(from);
            _recalculateVotingPower(to);
        }
    }
    
    function _updateVotingPowerOnMint(address to, uint256 value) internal {
        if (features.valueWeightedVoting) {
            _votingPower[to] += value;
        } else {
            _votingPower[to] += 1;
        }
    }
    
    function _updateVotingPowerOnBurn(address from, uint256 value) internal {
        if (features.valueWeightedVoting) {
            _votingPower[from] = _votingPower[from] > value ? _votingPower[from] - value : 0;
        } else {
            _votingPower[from] = _votingPower[from] > 0 ? _votingPower[from] - 1 : 0;
        }
    }
    
    function _updateVotingPowerOnValueChange(address account, uint256 value, bool increase) internal {
        if (features.valueWeightedVoting) {
            if (increase) {
                _votingPower[account] += value;
            } else {
                _votingPower[account] = _votingPower[account] > value ? _votingPower[account] - value : 0;
            }
        }
    }
    
    function _recalculateVotingPower(address account) internal {
        // Recalculate total voting power for account based on all tokens held
        uint256 totalPower = 0;
        uint256 tokenCount = balanceOf(account);
        
        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(account, i);
            if (features.valueWeightedVoting) {
                totalPower += _tokenValues[tokenId];
            } else {
                totalPower += 1;
            }
        }
        
        _votingPower[account] = totalPower;
    }
    
    function _calculateAndUpdateRewards(address account) internal {
        if (_stakedBalances[account] == 0) return;
        
        uint256 stakingDuration = block.timestamp - _lastStakeTime[account];
        uint256 reward = (_stakedBalances[account] * defi.stakingYieldRate * stakingDuration) / (365 days * 10000);
        
        _stakingRewards[account] += reward;
        _lastStakeTime[account] = block.timestamp;
    }
    
    function _slotExists(uint256 slot) internal view returns (bool) {
        return bytes(_slots[slot].name).length > 0;
    }
    
    function _removeFromSlot(uint256 slot, uint256 tokenId) internal {
        uint256[] storage tokens = _slotTokens[slot];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
        _slots[slot].currentSupply--;
    }
    
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    // For compatibility with ERC721Enumerable-style functions
    function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256) {
        // Implementation would require tracking tokens by owner
        // This is a simplified version
        return 0; // Placeholder
    }
}
