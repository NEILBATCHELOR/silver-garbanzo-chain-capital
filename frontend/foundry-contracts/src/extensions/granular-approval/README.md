# ERC-5216 Granular Approval Module

## Overview

The ERC-5216 Granular Approval Module implements the **ERC-5216 standard** for granular approvals on ERC-1155 tokens. This extension adds per-token-ID approval mechanisms, allowing specific amounts of specific token IDs to be approved, rather than the all-or-nothing operator approval model in standard ERC-1155.

## Standard Reference

- **EIP**: [EIP-5216](https://eips.ethereum.org/EIPS/eip-5216)
- **Title**: ERC-1155 Approval Extension
- **Status**: Draft
- **Type**: Standards Track

## Problem Statement

Standard ERC-1155 only supports `setApprovalForAll(operator, approved)`:
- **All or Nothing**: Approves ALL token IDs and amounts
- **Security Risk**: Over-permissioned approvals
- **Poor UX**: Cannot approve specific tokens for marketplace listings

## Solution

ERC-5216 adds granular approvals:
- âœ… Approve specific token ID
- âœ… Approve specific amount
- âœ… Increase/decrease allowances
- âœ… Compatible with existing ERC-1155 operator model

## Features

✅ **Per-Token Approvals**
- `approve(spender, id, amount)` - Approve specific amount for specific ID
- `allowance(owner, spender, id)` - Query approved amount

✅ **Allowance Management**
- `increaseAllowance(spender, id, addedValue)` - Add to current allowance
- `decreaseAllowance(spender, id, subtractedValue)` - Reduce current allowance

✅ **Transfer Integration**
- `consumeAllowance(owner, spender, id, amount)` - Called during transfers
- Falls back to operator approval if no granular approval exists

✅ **Access Controlled**
- Role-based permissions for admin functions
- Only token contract can consume allowances

✅ **Upgradeable**
- UUPS proxy pattern for future enhancements
- Diamond storage prevents collisions

## Architecture

```
ERC1155Master
     â†"
[safeTransferFrom() Hook]
     â†"
ERC5216GranularApprovalModule
     â†"
1. Check granular allowance
2. If sufficient â†' consume & allow transfer
3. If not â†' fall back to operator approval
```

## Use Cases

### 1. **Marketplace Listings**
List specific token without giving full approval:
```solidity
// Approve marketplace to sell only token #5 (10 units)
approvalModule.approve(marketplaceAddress, 5, 10);

// User retains full control of all other tokens
```

### 2. **Gaming Asset Rentals**
Temporarily approve specific game items:
```solidity
// Approve guild to use weapon #42 (1 unit) for raid
approvalModule.approve(guildAddress, 42, 1);

// After raid, automatically revoked
```

### 3. **Fractionalized Ownership**
Allow partial transfers of specific assets:
```solidity
// Approve buyer for 25 units of real estate token #1
approvalModule.approve(buyerAddress, 1, 25);

// Transfer occurs, allowance reduced to 0
```

## Integration Guide

### Deploying the Module

```solidity
// Deploy via TokenFactory
address moduleAddress = tokenFactory.deployGranularApprovalModule(
    erc1155TokenAddress,  // Parent ERC-1155 contract
    owner                 // Admin address
);
```

### Attaching to ERC-1155 Contract

```solidity
// In ERC1155Master.sol
address public granularApprovalModule;

function setGranularApprovalModule(address module) 
    external 
    onlyRole(DEFAULT_ADMIN_ROLE) 
{
    granularApprovalModule = module;
    emit GranularApprovalModuleSet(module);
}
```

### Integration in Transfer Hook

```solidity
// In ERC1155Master._update() or safeTransferFrom()
function _update(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts
) internal virtual override {
    // Check granular approval if exists
    if (granularApprovalModule != address(0) && from != msg.sender) {
        for (uint256 i = 0; i < ids.length; i++) {
            (bool success, ) = ERC5216GranularApprovalModule(granularApprovalModule)
                .consumeAllowance(from, msg.sender, ids[i], amounts[i]);
            
            if (!success) {
                // Fall back to standard operator approval
                require(
                    isApprovedForAll(from, msg.sender),
                    "Not approved"
                );
            }
        }
    }
    
    // Continue with standard transfer
    super._update(from, to, ids, amounts);
}
```

## Functions

### Core Approval Functions

#### `approve(address spender, uint256 id, uint256 amount)`
Approve specific amount of specific token ID.
- **Access**: Anyone (owner of tokens)
- **Gas**: ~45,000 gas (cold storage) or ~5,000 gas (warm)
- **Event**: `ApprovalValue(owner, spender, id, amount)`

#### `allowance(address owner, address spender, uint256 id) → uint256`
Query approved amount for specific token.
- **Access**: Public view
- **Gas**: ~2,100 gas
- **Returns**: Approved amount

### Allowance Management

#### `increaseAllowance(address spender, uint256 id, uint256 addedValue)`
Increase existing allowance without overwriting.
- **Gas**: ~48,000 gas
- **Benefit**: Safer than `approve()` for incrementing

#### `decreaseAllowance(address spender, uint256 id, uint256 subtractedValue)`
Decrease existing allowance.
- **Gas**: ~30,000 gas
- **Reverts**: If insufficient allowance

### Transfer Integration

#### `consumeAllowance(address owner, address spender, uint256 id, uint256 amount) → (bool success, uint256 remaining)`
Consume allowance during transfer (internal use).
- **Access**: Only parent token contract
- **Returns**: 
  - `success`: Whether allowance was sufficient
  - `remaining`: Remaining allowance after consumption

### Admin Functions

#### `setApprovalsEnabled(bool enabled)`
Enable or disable granular approvals system-wide.
- **Access**: `DEFAULT_ADMIN_ROLE`
- **Use**: Emergency pause mechanism

## Events

```solidity
// Core approval event
event ApprovalValue(
    address indexed owner,
    address indexed spender,
    uint256 indexed id,
    uint256 amount
);

// Allowance decrease event
event ApprovalDecreased(
    address indexed owner,
    address indexed spender,
    uint256 indexed id,
    uint256 previousAmount,
    uint256 newAmount
);

// Module management
event ModuleInitialized(address indexed tokenContract);
event ApprovalsEnabledChanged(bool enabled);
```

## Access Control

### Roles

1. **DEFAULT_ADMIN_ROLE**
   - Enable/disable approvals
   - Grant/revoke roles
   - Upgrade contract

2. **UPGRADER_ROLE**
   - Authorize contract upgrades
   - Granted to admin by default

3. **Token Contract (Implicit)**
   - Can consume allowances during transfers
   - Set during initialization

## Gas Costs

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| First Approval (Cold Storage) | ~45,000 | Initial SSTORE |
| Subsequent Approval (Warm) | ~5,000 | SSTORE update |
| Increase Allowance | ~48,000 | Read + write |
| Decrease Allowance | ~30,000 | Read + write |
| Consume Allowance (Success) | ~28,000 | Read + write + emit |
| Consume Allowance (Fail) | ~3,000 | Read only |
| Query Allowance | ~2,100 | SLOAD |

## Security Considerations

### ✅ **Best Practices**

1. **Approve Minimum Necessary**
   ```solidity
   // Bad: Approve max
   module.approve(spender, tokenId, type(uint256).max);
   
   // Good: Approve exact amount
   module.approve(spender, tokenId, 100);
   ```

2. **Reset Allowances**
   ```solidity
   // Reset to zero before changing spenders
   module.approve(oldSpender, tokenId, 0);
   module.approve(newSpender, tokenId, 100);
   ```

3. **Use Increase/Decrease**
   ```solidity
   // Safer than setting absolute values
   module.increaseAllowance(spender, tokenId, 50);
   ```

### âš ï¸ **Attack Vectors**

#### Front-Running Attack
**Scenario**: Attacker observes allowance change transaction and front-runs it.

**Example**:
1. Alice approves Bob for 100 tokens
2. Bob wants to change to 50
3. Attacker sees pending tx, spends 100 before change
4. Then spends additional 50 after change

**Mitigation**: Always reset to 0 first or use increaseAllowance/decreaseAllowance.

#### Reentrancy
**Mitigation**: Module uses ReentrancyGuard on all state-changing functions.

## Examples

### Example 1: Marketplace Integration

```solidity
contract GameItemMarketplace {
    ERC1155 public gameItems;
    ERC5216GranularApprovalModule public approvalModule;
    
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 amount;
        uint256 price;
    }
    
    mapping(uint256 => Listing) public listings;
    
    function createListing(
        uint256 tokenId,
        uint256 amount,
        uint256 price
    ) external {
        // User only needs to approve this specific listing
        approvalModule.approve(address(this), tokenId, amount);
        
        listings[nextListingId] = Listing({
            seller: msg.sender,
            tokenId: tokenId,
            amount: amount,
            price: price
        });
    }
    
    function buy(uint256 listingId) external payable {
        Listing memory listing = listings[listingId];
        require(msg.value >= listing.price, "Insufficient payment");
        
        // Transfer will consume the granular approval
        gameItems.safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId,
            listing.amount,
            ""
        );
        
        // Allowance automatically consumed
    }
}
```

### Example 2: Time-Limited Approval

```solidity
contract TimeLimitedApproval {
    struct TimedApproval {
        uint256 amount;
        uint256 expiry;
    }
    
    mapping(address => mapping(address => mapping(uint256 => TimedApproval))) 
        public timedApprovals;
    
    function approveUntil(
        address spender,
        uint256 tokenId,
        uint256 amount,
        uint256 duration
    ) external {
        timedApprovals[msg.sender][spender][tokenId] = TimedApproval({
            amount: amount,
            expiry: block.timestamp + duration
        });
        
        approvalModule.approve(spender, tokenId, amount);
    }
    
    function revokeIfExpired(
        address owner,
        address spender,
        uint256 tokenId
    ) external {
        TimedApproval memory approval = timedApprovals[owner][spender][tokenId];
        
        if (block.timestamp >= approval.expiry) {
            // Admin or owner can revoke
            approvalModule.decreaseAllowance(spender, tokenId, approval.amount);
        }
    }
}
```

## Compatibility

### Token Standards

- ✅ **ERC-1155** (Primary use case)
- ⚠️ **ERC-721** (Use native ERC-721 approvals instead)
- ⚠️ **ERC-20** (Use native ERC-20 approvals instead)

### Marketplace Support

Most marketplaces use operator approval (`setApprovalForAll`). Granular approvals provide additional security:

- ✅ **OpenSea** - Falls back to operator if granular not set
- ✅ **Rarible** - Compatible
- ✅ **LooksRare** - Compatible
- ⚠️ Custom integration needed for granular-only workflows

## Testing

Run tests with:
```bash
forge test --match-path test/extensions/ERC5216GranularApprovalModule.t.sol
```

Test coverage includes:
- ✅ Approval mechanisms
- ✅ Allowance consumption
- ✅ Increase/decrease allowances
- ✅ Access control
- ✅ Integration with ERC-1155 transfers
- ✅ Front-running protection
- ✅ Reentrancy protection
- ✅ Enable/disable functionality

## Deployment

### Testnet Deployment

```bash
forge script script/extensions/DeployERC5216Module.s.sol \
  --rpc-url $TESTNET_RPC_URL \
  --broadcast \
  --verify
```

### Production Deployment

```bash
forge script script/extensions/DeployERC5216Module.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --legacy
```

## Comparison: Operator vs Granular Approval

| Feature | Operator Approval | Granular Approval |
|---------|-------------------|-------------------|
| Scope | All tokens | Specific token IDs |
| Amount Control | No | Yes |
| Security | Lower | Higher |
| Gas (First) | ~45,000 | ~45,000 |
| Gas (Query) | ~2,100 | ~2,100 |
| Marketplace Support | Universal | Growing |
| Revocation | Binary on/off | Per-token amounts |

## Future Enhancements

Potential additions in future versions:
- [ ] Time-bound approvals
- [ ] Conditional approvals (e.g., if price > X)
- [ ] Delegated approval management
- [ ] Batch approval operations
- [ ] Approval spending limits per time period

## References

- [EIP-5216 Specification](https://eips.ethereum.org/EIPS/eip-5216)
- [ERC-1155 Standard](https://eips.ethereum.org/EIPS/eip-1155)
- [OpenZeppelin ERC-1155 Documentation](https://docs.openzeppelin.com/contracts/5.x/api/token/erc1155)
- [Chain Capital Documentation](/docs)

## License

MIT License - See LICENSE file for details
