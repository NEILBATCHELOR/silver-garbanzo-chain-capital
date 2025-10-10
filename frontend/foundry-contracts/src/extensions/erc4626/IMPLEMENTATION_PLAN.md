# ERC-4626 Advanced Extensions Implementation Plan

## 📋 Implementation Status

### ✅ Already Implemented
- [x] ERC-7674 Temporary Approval Module (99.5% gas savings)
- [x] ERC-4626 Fee Strategy Module
- [x] ERC-4626 Withdrawal Queue Module
- [x] ERC-4626 Yield Strategy Module

### 🎯 TIER 1: Critical Security & Core Features (This Implementation)

#### 1. Virtual Offset Defense (ERC4626Master Enhancement) ⚠️ CRITICAL
**Priority**: HIGHEST - Security Fix  
**Impact**: Prevents inflation/donation attacks (Venus-style exploits)  
**Implementation**: Direct modification to ERC4626Master.sol  
**Gas Impact**: Minimal (~200 gas per deposit/mint)  

**What it does**:
- Adds virtual shares/assets offset to prevent manipulation
- Makes front-running attacks 1,000,000x more expensive
- Industry standard: 6-decimal offset (1,000,000 virtual shares)

**Files to Modify**:
- `/src/masters/ERC4626Master.sol` - Add `_decimalsOffset()` override

---

#### 2. ERC-7540 Async Vault Module 🔄 CRITICAL  
**Priority**: HIGH - RWA Tokenization Requirement  
**Impact**: Enables real-world asset vaults with settlement delays  
**Use Cases**: 
- Real estate tokenization (property sales take days/weeks)
- Liquid staking (unbonding periods: 7-28 days)
- Private equity funds (capital calls)
- Cross-chain deposits (bridge delays)

**Architecture**:
```
User                    Async Module              Vault
  │                          │                      │
  ├─ requestDeposit ────────>│                      │
  │                          ├─ Queue request       │
  │                          │  (PENDING status)    │
  │                          │                      │
  │     [Wait for fulfillment - could be days]     │
  │                          │                      │
  │                          │<─ fulfillDeposit ────┤ (Operator)
  │                          ├─ CLAIMABLE status    │
  │                          │                      │
  ├─ claimDeposit ──────────>│                      │
  │<─ Receive shares ─────────┤<──────────────────── │
```

**Key Functions**:
- `requestDeposit(assets, controller, owner)` → requestId
- `requestRedeem(shares, controller, owner)` → requestId
- `fulfillDeposit(requestId)` (operator only)
- `claimDeposit(requestId)` → shares
- `cancelDepositRequest(requestId)`

**Files to Create**:
```
/extensions/erc4626/async/
├── ERC7540AsyncVaultModule.sol
├── interfaces/
│   └── IERC7540AsyncVault.sol
├── storage/
│   └── AsyncVaultStorage.sol
└── README.md
```

---

#### 3. ERC-7535 Native ETH Vault Module 💧 HIGH
**Priority**: HIGH - UX Improvement  
**Impact**: Users can deposit native ETH without wrapping to WETH first  
**Gas Savings**: ~40,000 gas per deposit (no WETH.deposit() call)  

**Architecture**:
```solidity
// Standard ERC-4626 Vault (WETH only)
WETH.deposit{value: 1 ether}();  // User wraps ETH → WETH
WETH.approve(vault, 1 ether);    // User approves
vault.deposit(1 ether, user);     // User deposits

// ERC-7535 Native Vault
vault.deposit{value: 1 ether}(user);  // Direct ETH deposit ✅
```

**Key Features**:
- Payable `deposit()` and `mint()` functions
- `asset()` returns `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` (native ETH marker)
- Internal WETH wrapping/unwrapping
- No ERC-20 approvals needed for ETH

**Files to Create**:
```
/extensions/erc4626/native/
├── ERC7535NativeVaultModule.sol
├── interfaces/
│   └── IERC7535NativeVault.sol
├── storage/
│   └── NativeVaultStorage.sol
└── README.md
```

---

### 🎯 TIER 2: Advanced Features (Next Implementation)

#### 4. ERC-7575 Multi-Asset Vault Module 🎨
**Priority**: MEDIUM - Advanced DeFi  
**Impact**: Curve/Balancer-style LP tokens with multiple underlying assets  

**Use Cases**:
- Stablecoin pools (DAI + USDC + USDT)
- Liquidity provision (ETH + USDC pairs)
- Index funds (basket of tokens)

**Architecture**:
```
Single Share Token
      │
      ├─ Asset 1: DAI (33.3%)
      ├─ Asset 2: USDC (33.3%)
      └─ Asset 3: USDT (33.4%)
```

**Key Functions**:
- `deposit(address asset, uint256 amount, address receiver)` → shares
- `withdraw(address asset, uint256 amount, address receiver, address owner)` → assets
- `totalAssets()` → combined value of all assets
- `assetRatio(address asset)` → percentage allocation

**Files to Create**:
```
/extensions/erc4626/multi-asset/
├── ERC7575MultiAssetVaultModule.sol
├── interfaces/
│   └── IERC7575MultiAssetVault.sol
├── storage/
│   └── MultiAssetVaultStorage.sol
└── README.md
```

---

#### 5. ERC4626Router Module 🔀
**Priority**: MEDIUM - DeFi Aggregation  
**Impact**: Multicall support, slippage protection, batch operations  

**Key Features**:
- Batch deposits across multiple vaults
- Slippage protection (maxAmountIn, minAmountOut)
- Permit + deposit in single transaction
- Multi-hop vault strategies

**Functions**:
- `depositMax(vault, to, maxAmountIn)` → sharesOut
- `redeemMax(vault, to, maxSharesIn, minAmountOut)` → assetsOut
- `migrate(fromVault, toVault, shares)` → newShares
- `multicall(calls[])` → results

**Files to Create**:
```
/extensions/erc4626/router/
├── ERC4626Router.sol
├── interfaces/
│   └── IERC4626Router.sol
└── README.md
```

---

## 📅 Implementation Timeline

### Week 1: Security & Core (TIER 1)
- **Day 1**: Virtual Offset Defense in ERC4626Master ✅
- **Day 2-3**: ERC-7540 Async Vault Module
- **Day 4-5**: ERC-7535 Native ETH Vault Module
- **Day 6-7**: Testing & Documentation

### Week 2: Advanced Features (TIER 2)
- **Day 1-3**: ERC-7575 Multi-Asset Vault Module
- **Day 4-5**: ERC4626Router
- **Day 6-7**: Integration Testing & Final Documentation

---

## 🔧 Technical Specifications

### Virtual Offset Defense
```solidity
// In ERC4626Master.sol
function _decimalsOffset() internal pure virtual override returns (uint8) {
    return 6; // 1,000,000 virtual shares
}
```

**Impact**:
- Attack cost increases from ~$1 to ~$1,000,000
- Minimal gas overhead (~200 gas per operation)
- Backwards compatible (doesn't affect existing deposits)

---

### ERC-7540 Async Vault Storage
```solidity
struct DepositRequest {
    address controller;
    address owner;
    uint256 assets;
    uint256 shares;
    RequestStatus status; // PENDING, FULFILLED, CLAIMED, CANCELLED
    uint256 requestedAt;
    uint256 fulfilledAt;
}

enum RequestStatus {
    PENDING,
    FULFILLED,
    CLAIMABLE,
    CLAIMED,
    CANCELLED
}

mapping(uint256 => DepositRequest) public depositRequests;
uint256 public nextRequestId;
```

---

### ERC-7535 Native Vault Flow
```solidity
function deposit(uint256 assets, address receiver) 
    public 
    payable 
    override 
    returns (uint256 shares) 
{
    if (msg.value > 0) {
        // Native ETH deposit
        require(msg.value == assets, "ETH amount mismatch");
        WETH.deposit{value: msg.value}();
    } else {
        // Standard ERC-20 deposit
        SafeERC20.safeTransferFrom(asset(), msg.sender, address(this), assets);
    }
    
    shares = previewDeposit(assets);
    _mint(receiver, shares);
    emit Deposit(msg.sender, receiver, assets, shares);
}
```

---

## ✅ Testing Requirements

### Security Tests
- [ ] Virtual offset prevents inflation attack
- [ ] Front-running protection verified
- [ ] Edge cases (zero deposits, max values)

### Async Vault Tests
- [ ] Request lifecycle (pending → fulfilled → claimed)
- [ ] Cancellation before fulfillment
- [ ] Multiple simultaneous requests
- [ ] Role-based fulfillment access

### Native Vault Tests
- [ ] ETH deposit/withdraw flow
- [ ] WETH wrapping/unwrapping
- [ ] Gas comparison vs standard vault
- [ ] Fallback handling

---

## 📊 Expected Outcomes

### Gas Savings
- Virtual Offset: +200 gas per operation (security premium)
- Native ETH Vault: -40,000 gas per deposit (no WETH wrapping)
- **Net Savings**: ~39,800 gas per native deposit

### Security Improvements
- Inflation attack resistance: 1,000,000x cost increase
- No dangling approvals (native ETH)
- Request-based withdrawals (async vaults)

### User Experience
- No WETH wrapping for ETH vaults
- Predictable settlement for RWA tokenization
- Multi-asset support for diversified strategies

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (100% coverage)
- [ ] Gas benchmarking completed
- [ ] Security audit scheduled
- [ ] Documentation reviewed

### Deployment
- [ ] Deploy to testnet (Sepolia/Goerli)
- [ ] Verify contracts on Etherscan
- [ ] Test with live DeFi protocols
- [ ] Monitor for 1 week

### Post-Deployment
- [ ] Mainnet deployment
- [ ] Integration with frontend
- [ ] Marketing announcement
- [ ] Community feedback collection

---

**Status**: 🚧 IN PROGRESS  
**Start Date**: January 6, 2025  
**Target Completion**: January 20, 2025  
**Owner**: Chain Capital Development Team
