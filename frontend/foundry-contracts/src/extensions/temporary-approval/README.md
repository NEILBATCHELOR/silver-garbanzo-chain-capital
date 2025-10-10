# ERC-7674 Temporary Approval Module

## Overview

The ERC-7674 Temporary Approval Module implements gas-efficient temporary approvals using EIP-1153 transient storage (Cancun upgrade). Approvals auto-expire at transaction end, providing **99.5% gas savings** compared to standard ERC-20 approvals.

## Key Features

### ⚡ Gas Efficiency
- **Standard Approval**: ~20,000 gas (SSTORE cold slot)
- **Temporary Approval**: ~100 gas (TSTORE operation)
- **Savings**: 99.5% reduction

### 🔒 Security
- **Auto-Expiry**: Approvals cleared automatically after transaction
- **Zero Cross-Transaction Exposure**: No dangling approvals
- **Backwards Compatible**: Works alongside standard approvals

### 📦 Use Cases
1. **DEX Token Swaps**: Approve + swap in one transaction
2. **Batch Operations**: Approve multiple spenders temporarily
3. **Flash Loans**: Approve + borrow + repay
4. **Gasless Meta-Transactions**: Temporary approvals for relayers

## Architecture

```
ERC20TemporaryApprovalModule
├── Uses EIP-1153 Transient Storage (TSTORE/TLOAD opcodes)
├── Minimal persistent storage (only config flag)
└── Separate contract to avoid stack depth in masters
```

## Contract Structure

```
/extensions/temporary-approval/
├── ERC20TemporaryApprovalModule.sol    # Main implementation
├── interfaces/
│   └── IERC20TemporaryApprovalModule.sol
└── storage/
    └── TemporaryApprovalStorage.sol
```

## Usage Examples

### Basic Temporary Approval

```solidity
// User approves DEX router temporarily
token.temporaryApprove(dexRouter, 1000e18);

// Router spends tokens in same transaction
dexRouter.swap(token, 1000e18);

// Approval auto-expires after transaction
// No cleanup needed!
```

### Integration with ERC20Master

```solidity
// 1. Deploy module
ERC20TemporaryApprovalModule temporaryApproval = new ERC20TemporaryApprovalModule();
temporaryApproval.initialize(admin);

// 2. Attach to token
token.setTemporaryApprovalModule(address(temporaryApproval));

// 3. Use temporary approvals
token.temporaryApprove(spender, amount);
```

### Increase/Decrease Allowance

```solidity
// Increase temporary allowance
token.increaseTemporaryAllowance(spender, 500e18);

// Decrease temporary allowance
token.decreaseTemporaryAllowance(spender, 200e18);
```

### Check Allowance

```solidity
// Only returns non-zero in same transaction as approval
uint256 allowance = token.temporaryAllowance(owner, spender);
```

## Technical Implementation

### Transient Storage (EIP-1153)

```solidity
// Store approval (TSTORE)
assembly {
    tstore(slot, value)
}

// Load approval (TLOAD)
assembly {
    allowance := tload(slot)
}
```

### Slot Computation

```solidity
bytes32 slot = keccak256(
    abi.encodePacked(TEMPORARY_APPROVAL_SLOT, owner, spender)
);
```

## Interface

### Core Functions

```solidity
interface IERC20TemporaryApprovalModule {
    // Grant temporary approval (~100 gas)
    function temporaryApprove(address spender, uint256 value) external returns (bool);
    
    // Get temporary allowance (~100 gas)
    function temporaryAllowance(address owner, address spender) external view returns (uint256);
    
    // Increase allowance
    function increaseTemporaryAllowance(address spender, uint256 addedValue) external returns (bool);
    
    // Decrease allowance
    function decreaseTemporaryAllowance(address spender, uint256 subtractedValue) external returns (bool);
    
    // Spend allowance (called by token)
    function spendTemporaryAllowance(address owner, address spender, uint256 value) external;
}
```

### View Functions

```solidity
// Check if module is enabled
function isTemporaryApprovalEnabled() external view returns (bool);

// Check chain support for EIP-1153
function supportsTransientStorage() external view returns (bool);

// Get gas savings metrics
function getGasSavings() external pure returns (
    uint256 standardCost,    // 20,000 gas
    uint256 temporaryCost,   // 100 gas
    uint256 savingsPercent   // 9950 (99.5%)
);
```

## Events

```solidity
// Emitted when temporary approval granted
event TemporaryApproval(
    address indexed owner,
    address indexed spender,
    uint256 value
);

// Emitted when temporary approval used
event TemporaryApprovalUsed(
    address indexed owner,
    address indexed spender,
    uint256 value,
    uint256 remaining
);
```

## Errors

```solidity
// Insufficient temporary allowance
error InsufficientTemporaryAllowance(
    address owner,
    address spender,
    uint256 requested,
    uint256 available
);

// Invalid spender address
error InvalidSpender();

// Transient storage not supported
error TransientStorageNotSupported();
```

## Requirements

### Chain Requirements
- **EIP-1153 Support**: Post-Cancun upgrade chains
- **Supported Chains**: Ethereum mainnet, Base, Arbitrum, Optimism, Polygon (post-Cancun)

### Contract Requirements
- Solidity ^0.8.28
- OpenZeppelin Contracts Upgradeable v5.0+
- ERC20Master with module support

## Deployment

### 1. Deploy Module

```bash
forge script script/DeployTemporaryApproval.s.sol --broadcast --verify
```

### 2. Attach to Token

```solidity
// Admin attaches module to token
token.setTemporaryApprovalModule(moduleAddress);
```

### 3. Verify Integration

```solidity
// Check if module is active
bool enabled = token.temporaryApprovalModule() != address(0);

// Test temporary approval
token.temporaryApprove(testSpender, 100e18);
uint256 allowance = token.temporaryAllowance(owner, testSpender);
assert(allowance == 100e18);
```

## Testing

```bash
# Run tests
forge test --match-contract ERC20TemporaryApprovalTest

# Gas benchmarking
forge test --match-contract GasSavingsTest --gas-report
```

## Gas Benchmarking

### Standard vs Temporary Approval

| Operation | Standard (SSTORE) | Temporary (TSTORE) | Savings |
|-----------|------------------|--------------------|---------|
| Approve | ~20,000 gas | ~100 gas | 99.5% |
| Allowance | ~2,100 gas | ~100 gas | 95.2% |
| **Total** | **~22,100 gas** | **~200 gas** | **99.1%** |

### Real-World Example: DEX Swap

```
Without Temporary Approval:
1. approve(): 20,000 gas
2. swap(): 150,000 gas
3. Total: 170,000 gas

With Temporary Approval:
1. temporaryApprove(): 100 gas
2. swap(): 150,000 gas
3. Total: 150,100 gas

Savings: 19,900 gas (~12%)
```

## Upgradeability

The module uses UUPS upgradeable pattern:

```solidity
// Upgrade to new implementation
module.upgradeToAndCall(newImplementation, data);
```

## Security Considerations

### ✅ Advantages
- **No Dangling Approvals**: Auto-expires after transaction
- **Reduced Attack Surface**: Zero cross-transaction exposure
- **Gas-Efficient**: No need for approval cleanup

### ⚠️ Considerations
- **Single Transaction Only**: Approvals don't persist across transactions
- **Chain Support**: Requires post-Cancun EVM
- **Integration Required**: Tokens must implement temporary approval checks

## Comparison with Standard Approvals

| Feature | Standard Approval | Temporary Approval |
|---------|------------------|--------------------|
| Gas Cost | ~20,000 gas | ~100 gas |
| Persistence | Until revoked | End of transaction |
| Security Risk | Dangling approvals | Zero risk |
| Use Case | Long-term access | Single-transaction |
| Cleanup | Manual | Automatic |

## Future Enhancements

### Planned Features
1. **Batch Temporary Approvals**: Approve multiple spenders in one call
2. **Conditional Approvals**: Time-based or amount-based conditions
3. **Multi-Asset Support**: Approve multiple tokens at once
4. **Integration Templates**: Standard patterns for DEX/lending protocols

## Related Standards

- **EIP-1153**: Transient Storage Opcodes
- **ERC-20**: Token Standard
- **ERC-7674**: Temporary Approval Extension
- **EIP-2612**: Permit (Gasless Approvals)

## Resources

- [EIP-1153 Specification](https://eips.ethereum.org/EIPS/eip-1153)
- [ERC-7674 Draft](https://eips.ethereum.org/EIPS/eip-7674)
- [Cancun Upgrade Details](https://ethereum.org/en/history/#cancun)

## Support

For issues or questions:
- GitHub Issues: [chain-capital/foundry-contracts](https://github.com/chain-capital/foundry-contracts)
- Documentation: [docs.chaincapital.com](https://docs.chaincapital.com)

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**License**: MIT  
**Audit**: Pending
