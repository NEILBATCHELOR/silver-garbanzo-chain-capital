// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/**
 * @title Errors library
 * @author Chain Capital (Adapted from Aave V3)
 * @notice Defines the error messages emitted by the Commodity Trade Finance protocol
 * @dev Error codes use string constants for gas efficiency in reverts
 * @dev Categories: Admin (1-10), Pool (11-30), Commodity (31-50), 
 *      Supply/Borrow (51-70), Liquidation (71-90), Oracle (91-100), Misc (101+)
 */
library Errors {
  // ==============================================
  // ADMIN & ACCESS CONTROL (1-10)
  // ==============================================
  
  string public constant CALLER_NOT_POOL_ADMIN = '1'; 
  // 'The caller of the function is not a pool admin'
  
  string public constant CALLER_NOT_EMERGENCY_ADMIN = '2'; 
  // 'The caller of the function is not an emergency admin'
  
  string public constant CALLER_NOT_POOL_OR_EMERGENCY_ADMIN = '3'; 
  // 'The caller of the function is not a pool or emergency admin'
  
  string public constant CALLER_NOT_RISK_OR_POOL_ADMIN = '4'; 
  // 'The caller of the function is not a risk or pool admin'
  
  string public constant CALLER_NOT_ASSET_LISTING_OR_POOL_ADMIN = '5'; 
  // 'The caller of the function is not an asset listing or pool admin'
  
  string public constant CALLER_NOT_BRIDGE = '6'; 
  // 'The caller of the function is not a bridge'
  
  string public constant CALLER_NOT_COMMODITY_MANAGER = '7'; 
  // 'The caller of the function is not a commodity manager'
  
  string public constant CALLER_NOT_LIQUIDATOR = '8'; 
  // 'The caller of the function is not an authorized liquidator'
  
  string public constant CALLER_NOT_WAREHOUSE_OPERATOR = '9'; 
  // 'The caller of the function is not a warehouse operator'
  
  string public constant UNAUTHORIZED_ROLE = '10'; 
  // 'The caller does not have the required role'

  // ==============================================
  // POOL CONFIGURATION & REGISTRATION (11-30)
  // ==============================================
  
  string public constant ADDRESSES_PROVIDER_NOT_REGISTERED = '11'; 
  // 'Pool addresses provider is not registered'
  
  string public constant INVALID_ADDRESSES_PROVIDER = '12'; 
  // 'The address of the pool addresses provider is invalid'
  
  string public constant INVALID_ADDRESSES_PROVIDER_ID = '13'; 
  // 'The id of the pool addresses provider is invalid'
  
  string public constant POOL_ADDRESSES_DO_NOT_MATCH = '14'; 
  // 'Pool addresses do not match between the two params'
  
  string public constant POOL_PAUSED = '15'; 
  // 'Pool is paused'
  
  string public constant POOL_NOT_ACTIVE = '16'; 
  // 'Pool is not active'
  
  string public constant POOL_NOT_PAUSED = '17'; 
  // 'Pool is not paused'
  
  string public constant CALLER_NOT_POOL_CONFIGURATOR = '18'; 
  // 'The caller of the function is not the pool configurator'
  
  string public constant NOT_CONTRACT = '19'; 
  // 'Address is not a contract'
  
  string public constant INVALID_FLASHLOAN_EXECUTOR_RETURN = '20'; 
  // 'Invalid flashloan executor return value'

  // ==============================================
  // COMMODITY-SPECIFIC ERRORS (31-50)
  // ==============================================
  
  string public constant COMMODITY_NOT_LISTED = '31'; 
  // 'Commodity is not listed for lending'
  
  string public constant COMMODITY_NOT_ACTIVE = '32'; 
  // 'Commodity is not active for operations'
  
  string public constant COMMODITY_FROZEN = '33'; 
  // 'Commodity is frozen'
  
  string public constant COMMODITY_PAUSED = '34'; 
  // 'Commodity is paused'
  
  string public constant COMMODITY_ALREADY_LISTED = '35'; 
  // 'Commodity is already listed'
  
  string public constant INVALID_COMMODITY_TYPE = '36'; 
  // 'Invalid commodity type'
  
  string public constant INVALID_COMMODITY_GRADE = '37'; 
  // 'Invalid commodity grade or quality specification'
  
  string public constant COMMODITY_EXPIRED = '38'; 
  // 'Commodity has expired or passed quality date'
  
  string public constant INVALID_STORAGE_LOCATION = '39'; 
  // 'Invalid or unverified storage location'
  
  string public constant STORAGE_CERTIFICATE_EXPIRED = '40'; 
  // 'Storage warehouse certificate has expired'
  
  string public constant INVALID_WAREHOUSE_RECEIPT = '41'; 
  // 'Warehouse receipt is invalid or not recognized'
  
  string public constant COMMODITY_NOT_TOKENIZED = '42'; 
  // 'Commodity has not been tokenized'
  
  string public constant INVALID_COMMODITY_SPECIFICATIONS = '43'; 
  // 'Commodity specifications do not meet requirements'
  
  string public constant INSUFFICIENT_COMMODITY_QUALITY = '44'; 
  // 'Commodity quality is below acceptable threshold'
  
  string public constant SEASONAL_RESTRICTION_ACTIVE = '45'; 
  // 'Seasonal restriction is active for this commodity'

  // ==============================================
  // SUPPLY & BORROW OPERATIONS (51-70)
  // ==============================================
  
  string public constant INVALID_AMOUNT = '51'; 
  // 'Amount must be greater than 0'
  
  string public constant NO_MORE_RESERVES_ALLOWED = '52'; 
  // 'Maximum number of reserves in the pool reached'
  
  string public constant SUPPLY_CAP_EXCEEDED = '53'; 
  // 'Supply cap is exceeded'
  
  string public constant BORROW_CAP_EXCEEDED = '54'; 
  // 'Borrow cap is exceeded'
  
  string public constant NOT_ENOUGH_AVAILABLE_USER_BALANCE = '55'; 
  // 'User cannot withdraw more than the available balance'
  
  string public constant INVALID_INTEREST_RATE_MODE_SELECTED = '56'; 
  // 'Invalid interest rate mode selected'
  
  string public constant COLLATERAL_BALANCE_IS_ZERO = '57'; 
  // 'The collateral balance is 0'
  
  string public constant HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD = '58'; 
  // 'Health factor is lesser than the liquidation threshold'
  
  string public constant COLLATERAL_CANNOT_COVER_NEW_BORROW = '59'; 
  // 'There is not enough collateral to cover a new borrow'
  
  string public constant COLLATERAL_SAME_AS_BORROWING_CURRENCY = '60'; 
  // 'Collateral is (mostly) the same currency that is being borrowed'
  
  string public constant AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE = '61'; 
  // 'The requested amount is greater than the max loan size in stable rate mode'
  
  string public constant NO_DEBT_OF_SELECTED_TYPE = '62'; 
  // 'User does not have debt of the selected type'
  
  string public constant NO_EXPLICIT_AMOUNT_TO_REPAY_ON_BEHALF = '63'; 
  // 'To repay on behalf of a user an explicit amount must be specified'
  
  string public constant NO_OUTSTANDING_STABLE_DEBT = '64'; 
  // 'User does not have outstanding stable rate debt on this commodity'
  
  string public constant NO_OUTSTANDING_VARIABLE_DEBT = '65'; 
  // 'User does not have outstanding variable rate debt on this commodity'
  
  string public constant UNDERLYING_BALANCE_ZERO = '66'; 
  // 'The underlying balance needs to be greater than 0'
  
  string public constant INTEREST_RATE_REBALANCE_CONDITIONS_NOT_MET = '67'; 
  // 'Interest rate rebalance conditions not met'
  
  string public constant SILOED_BORROWING_VIOLATION = '68'; 
  // 'User is trying to borrow multiple assets including a siloed one'
  
  string public constant RESERVE_DEBT_NOT_ZERO = '69'; 
  // 'The total debt of the reserve needs to be 0'
  
  string public constant FLASHLOAN_DISABLED = '70'; 
  // 'FlashLoaning for this asset is disabled'

  // ==============================================
  // LIQUIDATION ERRORS (71-90)
  // ==============================================
  
  string public constant LIQUIDATION_CALL_FAILED = '71'; 
  // 'Liquidation call failed'
  
  string public constant SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER = '72'; 
  // 'User did not borrow the specified currency'
  
  string public constant COLLATERAL_CANNOT_BE_LIQUIDATED = '73'; 
  // 'The collateral chosen cannot be liquidated'
  
  string public constant HEALTH_FACTOR_NOT_BELOW_THRESHOLD = '74'; 
  // 'Health factor is not below the threshold'
  
  string public constant INVALID_EQUAL_ASSETS_TO_SWAP = '75'; 
  // 'Cannot swap equal assets in liquidation'
  
  string public constant LIQUIDATION_AMOUNT_NOT_ENOUGH = '76'; 
  // 'Liquidation amount is not enough to cover debt'
  
  string public constant LIQUIDATION_GRACE_PERIOD_ACTIVE = '77'; 
  // 'Liquidation grace period is still active'
  
  string public constant PARTIAL_LIQUIDATION_NOT_ALLOWED = '78'; 
  // 'Partial liquidation is not allowed for this position'
  
  string public constant LIQUIDATION_BONUS_EXCEEDS_MAX = '79'; 
  // 'Liquidation bonus exceeds maximum allowed'
  
  string public constant LIQUIDATOR_NOT_WHITELISTED = '80'; 
  // 'Liquidator is not whitelisted for this commodity type'

  // ==============================================
  // ORACLE & PRICE ERRORS (91-100)
  // ==============================================
  
  string public constant ORACLE_PRICE_IS_ZERO = '91'; 
  // 'The oracle price is zero'
  
  string public constant ORACLE_SENTINEL_CHECK_FAILED = '92'; 
  // 'Oracle sentinel check failed'
  
  string public constant PRICE_ORACLE_SENTINEL_CHECK_FAILED = '92'; 
  // 'Oracle sentinel check failed (alias)'
  
  string public constant PRICE_ORACLE_NOT_AVAILABLE = '93'; 
  // 'Price oracle is not available for this commodity'
  
  string public constant INVALID_PRICE_SOURCE = '94'; 
  // 'Invalid price source specified'
  
  string public constant PRICE_DEVIATION_TOO_HIGH = '95'; 
  // 'Price deviation from oracle exceeds safe threshold'
  
  string public constant ORACLE_STALE_PRICE = '96'; 
  // 'Oracle price is stale and unreliable'
  
  string public constant MULTIPLE_ORACLE_SOURCES_MISMATCH = '97'; 
  // 'Multiple oracle sources show significant price mismatch'
  
  string public constant CHAINLINK_ORACLE_ERROR = '98'; 
  // 'Chainlink oracle returned an error'
  
  string public constant FALLBACK_ORACLE_NOT_SET = '99'; 
  // 'Fallback oracle is not configured'
  
  string public constant ORACLE_CIRCUIT_BREAKER_TRIGGERED = '100'; 
  // 'Oracle circuit breaker triggered due to suspicious price movement'

  // ==============================================
  // VALIDATION & CONFIGURATION (101-120)
  // ==============================================
  
  string public constant LTV_VALIDATION_FAILED = '101'; 
  // 'Loan-to-value ratio validation failed'
  
  string public constant INCONSISTENT_FLASHLOAN_PARAMS = '102'; 
  // 'Inconsistent flashloan parameters'
  
  string public constant RESERVE_LIQUIDITY_NOT_ZERO = '103'; 
  // 'The liquidity of the reserve needs to be 0'
  
  string public constant INVALID_RESERVE_PARAMS = '104'; 
  // 'Invalid reserve parameters'
  
  string public constant CALLER_NOT_TOKEN_HOLDER = '105'; 
  // 'The caller is not the token holder'
  
  string public constant BORROW_ALLOWANCE_NOT_ENOUGH = '106'; 
  // 'User borrows on behalf, but allowance is too small'
  
  string public constant USER_IN_ISOLATION_MODE = '107'; 
  // 'User is in isolation mode and can only interact with isolated commodities'
  
  string public constant ISOLATED_COLLATERAL_VIOLATION = '108'; 
  // 'User cannot enable non-isolated collateral when isolated collateral is enabled'
  
  string public constant ISOLATION_MODE_DEBT_CEILING_EXCEEDED = '109'; 
  // 'Debt ceiling in isolation mode exceeded'

  string public constant ASSET_NOT_BORROWABLE_IN_ISOLATION = '110'; 
  // 'Asset is not borrowable in isolation mode'
  
  string public constant EMODE_CATEGORY_RESERVED = '109'; 
  // 'E-Mode category 0 is reserved for volatile heterogeneous collateral'
  
  string public constant INCONSISTENT_EMODE_CATEGORY = '110'; 
  // 'E-Mode category is inconsistent'
  
  string public constant INVALID_EMODE_CATEGORY_ASSIGNMENT = '111'; 
  // 'Invalid E-Mode category assignment'

  string public constant EMODE_CATEGORY_DOES_NOT_EXIST = '112'; 
  // 'E-Mode category does not exist'
  
  string public constant UNAUTHORIZED_LTV_PARAMETER = '113'; 
  // 'LTV parameter is outside acceptable range'
  
  string public constant LIQUIDATION_THRESHOLD_TOO_LOW = '114'; 
  // 'Liquidation threshold is set too low'
  
  string public constant LIQUIDATION_THRESHOLD_TOO_HIGH = '115'; 
  // 'Liquidation threshold is set too high'

  // ==============================================
  // TOKEN & TRANSFER ERRORS (121-140)
  // ==============================================
  
  string public constant TRANSFER_NOT_ALLOWED = '121'; 
  // 'Transfer not allowed'
  
  string public constant ERC20_TRANSFER_FAILED = '122'; 
  // 'ERC20 transfer failed'
  
  string public constant TRANSFER_AMOUNT_EXCEEDS_BALANCE = '123'; 
  // 'Transfer amount exceeds balance'
  
  string public constant TOKEN_NOT_SUPPORTED = '124'; 
  // 'Token is not supported by the protocol'
  
  string public constant INSUFFICIENT_ALLOWANCE = '125'; 
  // 'Insufficient allowance for transfer'
  
  string public constant ATOKEN_SUPPLY_NOT_ZERO = '126'; 
  // 'CToken supply is not zero'
  
  string public constant STABLE_DEBT_NOT_ZERO = '127'; 
  // 'Stable debt supply is not zero'
  
  string public constant VARIABLE_DEBT_SUPPLY_NOT_ZERO = '128'; 
  // 'Variable debt supply is not zero'
  
  string public constant INVALID_MINT_AMOUNT = '129'; 
  // 'Invalid mint amount'
  
  string public constant INVALID_BURN_AMOUNT = '130'; 
  // 'Invalid burn amount'

  // ==============================================
  // INTEREST RATE ERRORS (141-160)
  // ==============================================
  
  string public constant STABLE_BORROWING_NOT_ENABLED = '141'; 
  // 'Stable borrowing not enabled'
  
  string public constant VARIABLE_BORROWING_NOT_ENABLED = '142'; 
  // 'Variable borrowing not enabled'
  
  string public constant BORROWING_NOT_ENABLED = '143'; 
  // 'Borrowing is not enabled'
  
  string public constant INTEREST_RATE_STRATEGY_NOT_SET = '144'; 
  // 'Interest rate strategy is not set'
  
  string public constant INVALID_INTEREST_RATE_STRATEGY = '145'; 
  // 'Invalid interest rate strategy address'
  
  string public constant INTEREST_RATE_TOO_HIGH = '146'; 
  // 'Interest rate exceeds maximum allowed'
  
  string public constant INTEREST_RATE_TOO_LOW = '147'; 
  // 'Interest rate below minimum required'
  
  string public constant SEASONAL_RATE_ADJUSTMENT_FAILED = '148'; 
  // 'Seasonal interest rate adjustment failed'
  
  string public constant UTILIZATION_RATE_OUT_OF_BOUNDS = '149'; 
  // 'Utilization rate is outside acceptable bounds'
  
  string public constant OPTIMAL_UTILIZATION_RATE_EXCEEDED = '150'; 
  // 'Optimal utilization rate exceeded'

  // ==============================================
  // RISK MANAGEMENT ERRORS (161-180)
  // ==============================================
  
  string public constant HAIRCUT_TOO_HIGH = '161'; 
  // 'Calculated haircut exceeds maximum allowed'
  
  string public constant HAIRCUT_CALCULATION_FAILED = '162'; 
  // 'Haircut calculation failed'
  
  string public constant VOLATILITY_THRESHOLD_EXCEEDED = '163'; 
  // 'Commodity volatility exceeds safe threshold'
  
  string public constant MAX_DRAWDOWN_EXCEEDED = '164'; 
  // 'Maximum drawdown exceeded for commodity'
  
  string public constant VAR_LIMIT_EXCEEDED = '165'; 
  // 'Value at Risk limit exceeded'
  
  string public constant LIQUIDITY_SCORE_TOO_LOW = '166'; 
  // 'Liquidity score is below minimum threshold'
  
  string public constant CONCENTRATION_RISK_TOO_HIGH = '167'; 
  // 'Concentration risk exceeds safe limits'
  
  string public constant POSITION_SIZE_EXCEEDS_LIMIT = '168'; 
  // 'Position size exceeds per-user or per-commodity limit'
  
  string public constant CORRELATION_RISK_WARNING = '169'; 
  // 'High correlation risk detected between collateral assets'
  
  string public constant INSUFFICIENT_DIVERSIFICATION = '170'; 
  // 'Insufficient portfolio diversification'

  // ==============================================
  // COMPLIANCE & VERIFICATION (181-200)
  // ==============================================
  
  string public constant KYC_NOT_VERIFIED = '181'; 
  // 'User KYC verification not complete'
  
  string public constant SANCTIONS_CHECK_FAILED = '182'; 
  // 'User or commodity failed sanctions screening'
  
  string public constant REGION_RESTRICTED = '183'; 
  // 'Operation restricted in user region'
  
  string public constant COMMODITY_CERTIFICATION_MISSING = '184'; 
  // 'Required commodity certification is missing'
  
  string public constant AUDIT_TRAIL_INCOMPLETE = '185'; 
  // 'Commodity audit trail is incomplete'
  
  string public constant PROVENANCE_VERIFICATION_FAILED = '186'; 
  // 'Commodity provenance verification failed'
  
  string public constant REGULATORY_LIMIT_EXCEEDED = '187'; 
  // 'Operation exceeds regulatory limits'
  
  string public constant INSURANCE_REQUIREMENT_NOT_MET = '188'; 
  // 'Insurance requirements not met for this commodity'
  
  string public constant ESCROW_CONDITION_NOT_MET = '189'; 
  // 'Escrow release conditions not met'
  
  string public constant TRADE_DOCUMENTATION_INCOMPLETE = '190'; 
  // 'Trade documentation is incomplete'

  // ==============================================
  // SYSTEM & MISCELLANEOUS (201+)
  // ==============================================
  
  string public constant REENTRANCY_NOT_ALLOWED = '201'; 
  // 'Reentrancy not allowed'
  
  string public constant OPERATION_NOT_SUPPORTED = '202'; 
  // 'Operation is not supported'
  
  string public constant ARRAY_LENGTH_MISMATCH = '203'; 
  // 'Array parameters have mismatched lengths'
  
  string public constant ZERO_ADDRESS_NOT_VALID = '204'; 
  // 'Zero address is not valid'
  
  string public constant INVALID_SIGNATURE = '205'; 
  // 'Invalid signature provided'
  
  string public constant DEADLINE_EXPIRED = '206'; 
  // 'Operation deadline has expired'
  
  string public constant INSUFFICIENT_GAS = '207'; 
  // 'Insufficient gas to complete operation'
  
  string public constant EMERGENCY_MODE_ACTIVE = '208'; 
  // 'Emergency mode is active, operation restricted'
  
  string public constant UPGRADE_IN_PROGRESS = '209'; 
  // 'System upgrade in progress, try again later'
  
  string public constant MAINTENANCE_WINDOW_ACTIVE = '210'; 
  // 'Maintenance window active, operations temporarily suspended'
  
  string public constant INVALID_RESERVE_INDEX = '211'; 
  // 'Invalid reserve index'
  
  string public constant BRIDGE_PROTOCOL_FEE_INVALID = '212'; 
  // 'Bridge protocol fee invalid'
  
  string public constant CALLER_MUST_BE_POOL = '213'; 
  // 'The caller of this function must be the pool'
  
  string public constant SUPPLY_NOT_ZERO = '214'; 
  // 'Supply is not zero'
  
  string public constant UNBACKED_MINT_CAP_EXCEEDED = '215'; 
  // 'Unbacked mint cap is exceeded'
  
  string public constant DEBT_CEILING_EXCEEDED = '216'; 
  // 'Debt ceiling exceeded'
  
  string public constant INVALID_DEBT_CEILING = '217'; 
  // 'Invalid debt ceiling'
  
  string public constant SILOED_BORROWING_NOT_ALLOWED = '218'; 
  // 'Siloed borrowing is not allowed for this commodity'
  
  string public constant RESERVE_ALREADY_ADDED = '219'; 
  // 'Reserve has already been added to the pool'
  
  string public constant ZERO_TOTAL_SUPPLY = '220'; 
  // 'Total supply is zero'
  
  string public constant COMMODITY_NOT_BORROWABLE_IN_ISOLATION = '221';
  // 'Commodity is not borrowable in isolation mode'
  
  string public constant INVALID_LTV = '222';
  // 'Invalid LTV parameter'
  
  string public constant INVALID_LIQ_THRESHOLD = '223';
  // 'Invalid liquidation threshold parameter'
  
  string public constant INVALID_LIQ_BONUS = '224';
  // 'Invalid liquidation bonus parameter'
  
  string public constant INVALID_DECIMALS = '225';
  // 'Invalid decimals parameter'
  
  string public constant INVALID_RESERVE_FACTOR = '226';
  // 'Invalid reserve factor parameter'
  
  string public constant INVALID_BORROW_CAP = '227';
  // 'Invalid borrow cap parameter'
  
  string public constant INVALID_SUPPLY_CAP = '228';
  // 'Invalid supply cap parameter'
  
  string public constant INVALID_LIQUIDATION_PROTOCOL_FEE = '229';
  // 'Invalid liquidation protocol fee parameter'
  
  string public constant INVALID_EMODE_CATEGORY = '230';
  // 'Invalid eMode category parameter'
  
  string public constant INVALID_EMODE_CATEGORY_ID = '231';
  // 'Invalid eMode category ID'
  
  string public constant INVALID_EMODE_CATEGORY_PARAMS = '232';
  // 'Invalid eMode category parameters'
  
  string public constant INVALID_UNBACKED_MINT_CAP = '233';
  // 'Invalid unbacked mint cap parameter'
  
  string public constant INVALID_COMMODITY_INDEX = '234';
  // 'Invalid commodity index'
}
