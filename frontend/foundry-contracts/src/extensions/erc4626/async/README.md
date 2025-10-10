# ERC-7540 Async Vault Module

## Overview
The ERC-7540 Async Vault Module extends ERC-4626 vaults with async deposit/redeem functionality, enabling vaults with settlement delays for Real-World Assets (RWA), liquid staking, and cross-chain operations.

## Key Features

### 🔄 Request-Based Workflow
- **Deposit Flow**: Request → Fulfill (operator) → Claim (user)
- **Redeem Flow**: Request → Fulfill (operator) → Claim (user)
- **Cancellation**: Users can cancel before fulfillment

### ⏱️ Configurable Delays
- Minimum fulfillment delay (seconds)
- Operator-controlled fulfillment timing
- Prevents instant withdrawals for illiquid assets

### 🔒 Security Features
- Role-based access control (OPERATOR_ROLE)
- Maximum pending requests per user
- Asset/share locking during requests
- UUPS upgradeable

## Use Cases

### 1. Real Estate Tokenization
Property sales take days/weeks to complete:
```solidity
// Configure for 7-day property settlement
asyncVault.initialize(
    admin,
    vault,
    7 days,        // Minimum 7 days to sell property
    5              // Max 5 pending requests
);
```

### 2. Liquid Staking
Unbonding periods (7-28 days):
```solidity
// Ethereum staking: 27-hour unbonding
asyncVault.initialize(
    admin,
    vault,
    27 hours,      // ETH unbonding period
    10             // Max 10 pending unstakes
);
```

### 3. Private Equity Funds
Capital calls with approval delays:
```solidity
// 30-day capital call process
asyncVault.initialize(
    admin,
    vault,
    30 days,       // 30-day approval period
    3              // Max 3 pending calls
);
```

### 4. Cross-Chain Deposits
Bridge settlement delays:
```solidity
// 1-hour bridge finality
asyncVault.initialize(
    admin,
    vault,
    1 hours,       // Bridge confirmation time
    20             // Max 20 pending bridges
);
```

## Architecture

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ 1. requestDeposit(assets)
       ▼
┌─────────────────────┐
│  Async Vault Module │
│  (Locks assets)     │
└──────┬──────────────┘
       │ [Wait for fulfillment delay]
       ▼
┌─────────────┐
│  Operator   │ 2. fulfillDepositRequest(requestId)
└──────┬──────┘    (Calculates shares at current rate)
       │
       ▼
┌─────────────────────┐
│  ERC-4626 Vault     │ (Deposits assets, mints shares)
└──────┬──────────────┘
       │ 3. claimDeposit(requestId)
       ▼
┌─────────────┐
│    User     │ (Receives shares)
└─────────────┘
```

## Contract Structure

```
/extensions/erc4626/async/
├── ERC7540AsyncVaultModule.sol     # Main implementation (440 lines)
├── interfaces/
│   └── IERC7540AsyncVault.sol      # Interface (240 lines)
├── storage/
│   └── AsyncVaultStorage.sol       # Storage layout (76 lines)
└── README.md                        # This file
```

## Usage Examples

### Basic Deposit Flow

```solidity
// 1. User requests deposit
uint256 requestId = asyncVault.requestDeposit(
    1000e6,        // 1,000 USDC
    user,          // Controller (can manage request)
    user           // Owner (will receive shares)
);

// 2. Wait for minimum fulfillment delay...

// 3. Operator fulfills when ready
asyncVault.fulfillDepositRequest(requestId);

// 4. User claims shares
uint256 shares = asyncVault.claimDeposit(requestId, user);
```

### Cancel Before Fulfillment

```solidity
// User requests deposit
uint256 requestId = asyncVault.requestDeposit(1000e6, user, user);

// User changes mind before fulfillment
asyncVault.cancelDepositRequest(requestId);
// Assets returned to user
```

### Redeem Flow

```solidity
// 1. User requests redeem
uint256 requestId = asyncVault.requestRedeem(
    500e18,        // 500 shares
    user,          // Controller
    user           // Owner
);

// 2. Operator fulfills
asyncVault.fulfillRedeemRequest(requestId);

// 3. User claims assets
uint256 assets = asyncVault.claimRedeem(requestId, user);
```

## Interface

### Core Functions

```solidity
// Deposit lifecycle
function requestDeposit(uint256 assets, address controller, address owner) external returns (uint256 requestId);
function fulfillDepositRequest(uint256 requestId) external; // Operator only
function claimDeposit(uint256 requestId, address receiver) external returns (uint256 shares);
function cancelDepositRequest(uint256 requestId) external;

// Redeem lifecycle
function requestRedeem(uint256 shares, address controller, address owner) external returns (uint256 requestId);
function fulfillRedeemRequest(uint256 requestId) external; // Operator only
function claimRedeem(uint256 requestId, address receiver) external returns (uint256 assets);
function cancelRedeemRequest(uint256 requestId) external;

// View functions
function getDepositRequest(uint256 requestId) external view returns (...);
function getRedeemRequest(uint256 requestId) external view returns (...);
function isDepositClaimable(uint256 requestId) external view returns (bool);
function isRedeemClaimable(uint256 requestId) external view returns (bool);
function getUserDepositRequests(address user) external view returns (uint256[] memory);
function getUserRedeemRequests(address user) external view returns (uint256[] memory);
```

## Events

```solidity
event DepositRequested(uint256 indexed requestId, address indexed controller, address indexed owner, uint256 assets);
event DepositFulfilled(uint256 indexed requestId, address indexed controller, uint256 assets, uint256 shares);
event DepositClaimed(uint256 indexed requestId, address indexed receiver, uint256 shares);
event DepositCancelled(uint256 indexed requestId, address indexed controller);

event RedeemRequested(uint256 indexed requestId, address indexed controller, address indexed owner, uint256 shares);
event RedeemFulfilled(uint256 indexed requestId, address indexed controller, uint256 shares, uint256 assets);
event RedeemClaimed(uint256 indexed requestId, address indexed receiver, uint256 assets);
event RedeemCancelled(uint256 indexed requestId, address indexed controller);
```

## Deployment

### 1. Deploy Module

```bash
forge script script/DeployAsyncVault.s.sol --broadcast --verify
```

### 2. Initialize

```solidity
ERC7540AsyncVaultModule asyncVault = new ERC7540AsyncVaultModule();
asyncVault.initialize(
    admin,
    vaultAddress,
    1 days,        // Minimum fulfillment delay
    10             // Max pending requests per user
);
```

### 3. Grant Operator Role

```solidity
asyncVault.grantRole(OPERATOR_ROLE, operatorAddress);
```

## Testing

```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts
forge test --match-contract AsyncVaultTest -vvv
```

## Gas Costs (Estimated)

| Operation | Gas Cost |
|-----------|----------|
| requestDeposit | ~150,000 gas |
| fulfillDepositRequest | ~200,000 gas |
| claimDeposit | ~80,000 gas |
| cancelDepositRequest | ~100,000 gas |
| requestRedeem | ~150,000 gas |
| fulfillRedeemRequest | ~200,000 gas |
| claimRedeem | ~80,000 gas |

## Security Considerations

### ✅ Protections
- Assets/shares locked during pending requests
- Role-based fulfillment (operator only)
- Configurable fulfillment delays
- Maximum pending requests limit
- User cancellation before fulfillment

### ⚠️ Considerations
- Operator has significant control
- Fulfillment delays can impact UX
- Exchange rate risk during delays
- Requires operator monitoring

## Comparison with Standard ERC-4626

| Feature | Standard ERC-4626 | Async Vault (ERC-7540) |
|---------|------------------|----------------------|
| Deposit | Instant | Request → Fulfill → Claim |
| Redeem | Instant | Request → Fulfill → Claim |
| Liquidity | Must be immediately available | Can be illiquid |
| Use Cases | Liquid assets | RWA, staking, cross-chain |
| Complexity | Simple | Advanced workflow |

## Integration Example

```solidity
// Deploy base vault
ERC4626Master vault = new ERC4626Master();
vault.initialize(USDC, "Property Vault", "pvUSDC", 0, 1000e6, admin);

// Deploy async module
ERC7540AsyncVaultModule asyncVault = new ERC7540AsyncVaultModule();
asyncVault.initialize(admin, address(vault), 7 days, 5);

// Grant roles
asyncVault.grantRole(OPERATOR_ROLE, propertyManager);

// User flow
uint256 requestId = asyncVault.requestDeposit(10000e6, user, user);
// ... wait for property purchase ...
asyncVault.fulfillDepositRequest(requestId); // Property manager
uint256 shares = asyncVault.claimDeposit(requestId, user);
```

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Implementation Date**: January 6, 2025  
**License**: MIT