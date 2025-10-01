# Policy Smart Contracts

On-chain policy enforcement system for Chain Capital token operations.

## Overview

The policy smart contracts provide on-chain validation for all token operations (mint, burn, transfer, lock, unlock, block, unblock) with configurable rules, limits, and multi-signature approvals.

## Architecture

```
Policy System Components:
│
├── PolicyEngine.sol              # Core policy validation engine
│   ├── Validates operations against defined policies
│   ├── Enforces amount limits & cooldown periods
│   ├── Manages multi-sig approval workflows
│   └── Tracks daily cumulative limits
│
├── PolicyRegistry.sol            # Central policy tracking
│   ├── Registers tokens and their policies
│   ├── Maps operations to policy configurations
│   ├── Enables policy discovery and querying
│   └── Supports compliance reporting
│
├── interfaces/
│   └── IPolicyEngine.sol         # Policy engine interface
│
└── libraries/
    └── PolicyTypes.sol           # Common types & utilities
```

## Integration with Token Masters

The policy contracts integrate seamlessly with the existing master contracts:

```solidity
// In ERC20Master.sol (or any master)
import "../policy/interfaces/IPolicyEngine.sol";

contract ERC20Master is ... {
    address public policyEngine;
    
    function mint(address to, uint256 amount) external {
        // Validate with policy engine before execution
        if (policyEngine != address(0)) {
            (bool approved, string memory reason) = IPolicyEngine(policyEngine)
                .validateOperation(address(this), msg.sender, "mint", amount);
            require(approved, reason);
        }
        
        // Execute operation
        _mint(to, amount);
    }
}
```

## Contract Details

### PolicyEngine.sol

Main contract for policy enforcement.

**Key Features:**
- Per-operation policy configuration
- Amount limits (per-operation and daily)
- Cooldown periods between operations
- Multi-signature approval workflows
- Comprehensive event logging

**Functions:**
```solidity
// Validation
validateOperation(token, operator, operationType, amount) -> (approved, reason)
validateOperationWithTarget(token, operator, target, operationType, amount) -> (approved, reason)

// Policy Management
createPolicy(token, operationType, maxAmount, dailyLimit, cooldownPeriod)
updatePolicy(token, operationType, active, maxAmount, dailyLimit)
enableApprovalRequirement(token, operationType, threshold)

// Multi-Sig Approval
requestApproval(token, operationType, amount, target) -> requestId
approveRequest(token, requestId)
executeApprovedRequest(token, requestId)

// View Functions
getPolicy(token, operationType) -> Policy
canOperate(token, operator, operationType, amount) -> (canOperate, reason)
getRemainingDailyLimit(token, operator, operationType) -> remaining
```

### PolicyRegistry.sol

Centralized registry for tracking all policies across tokens and operations.

**Key Features:**
- Token registration with standard tracking
- Policy metadata management
- Cross-token policy querying
- Compliance reporting support

**Functions:**
```solidity
// Registration
registerToken(token, standard, policyEngine)
registerPolicy(token, operationType, policyEngine)
deactivatePolicy(token, operationType)
reactivatePolicy(token, operationType)

// Queries
getPolicyMetadata(token, operationType) -> PolicyMetadata
getTokenRegistration(token) -> TokenRegistration
getTokenOperations(token) -> string[]
getAllTokens() -> address[]
getTokensByEngine(policyEngine) -> address[]
isTokenRegistered(token) -> bool
isPolicyRegistered(token, operationType) -> bool
isPolicyActive(token, operationType) -> bool
```

### PolicyTypes.sol

Library of common types and utilities for policy operations.

**Constants:**
```solidity
// Operation types
MINT, BURN, TRANSFER, LOCK, UNLOCK, BLOCK, UNBLOCK

// Severity levels
SEVERITY_LOW, SEVERITY_MEDIUM, SEVERITY_HIGH, SEVERITY_CRITICAL

// Time constants
ONE_MINUTE, ONE_HOUR, ONE_DAY, ONE_WEEK
```

**Helper Functions:**
```solidity
stringsEqual(a, b) -> bool
isNewDay(lastTime) -> bool
getRemainingCooldown(lastOperationTime, cooldownPeriod) -> remaining
addressInList(needle, haystack) -> found
isValidOperationType(operationType) -> valid
createValidationResult(approved, reason, severity) -> ValidationResult
createViolationRecord(...) -> PolicyViolationRecord
```

## Deployment

### Prerequisites

1. Foundry installed
2. Environment variables set:
   ```bash
   PRIVATE_KEY=your_private_key
   RPC_URL=your_rpc_url
   ADMIN_ADDRESS=your_admin_address
   ```

### Deployment Script

```bash
# Deploy to testnet (Sepolia)
forge script script/DeployPolicySystem.s.sol \
  --rpc-url sepolia \
  --broadcast \
  --verify

# Deploy to mainnet
forge script script/DeployPolicySystem.s.sol \
  --rpc-url mainnet \
  --broadcast \
  --verify
```

### Post-Deployment Setup

```solidity
// 1. Deploy PolicyEngine
PolicyEngine engine = new PolicyEngine();
engine.initialize(adminAddress);

// 2. Deploy PolicyRegistry
PolicyRegistry registry = new PolicyRegistry();
registry.initialize(adminAddress);

// 3. Register token with policy engine
registry.registerToken(tokenAddress, "ERC20", address(engine));

// 4. Create policies for token
engine.createPolicy(
    tokenAddress,
    "mint",
    1000000 * 10**18,  // maxAmount: 1M tokens
    10000000 * 10**18, // dailyLimit: 10M tokens
    3600                // cooldownPeriod: 1 hour
);

// 5. Set policy engine in token master
ERC20Master(tokenAddress).setPolicyEngine(address(engine));
```

## Integration Examples

### Example 1: Basic Policy Validation

```solidity
// Token master checks policy before minting
function mint(address to, uint256 amount) external {
    if (policyEngine != address(0)) {
        (bool approved, string memory reason) = IPolicyEngine(policyEngine)
            .validateOperation(address(this), msg.sender, "mint", amount);
        require(approved, reason);
    }
    _mint(to, amount);
}
```

### Example 2: Multi-Sig Approval Workflow

```solidity
// 1. Operator requests approval for large mint
uint256 requestId = policyEngine.requestApproval(
    tokenAddress,
    "mint",
    10000000 * 10**18,  // 10M tokens
    recipientAddress
);

// 2. Approvers approve the request
policyEngine.approveRequest(tokenAddress, requestId); // Approver 1
policyEngine.approveRequest(tokenAddress, requestId); // Approver 2

// 3. Original requester executes after threshold met
policyEngine.executeApprovedRequest(tokenAddress, requestId);
```

### Example 3: Policy Configuration

```solidity
// Create conservative policy for new token
policyEngine.createPolicy(
    newTokenAddress,
    "mint",
    100000 * 10**18,   // Max 100K per mint
    1000000 * 10**18,  // Max 1M daily
    7200                // 2 hour cooldown
);

// Update policy as token matures
policyEngine.updatePolicy(
    newTokenAddress,
    "mint",
    true,              // Keep active
    500000 * 10**18,   // Increase to 500K per mint
    5000000 * 10**18   // Increase to 5M daily
);
```

## Testing

### Run Tests

```bash
# Compile contracts
forge build

# Run all policy tests
forge test --match-path test/policy/**/*.t.sol -vv

# Run specific test
forge test --match-test testPolicyValidation -vvv

# Generate coverage report
forge coverage --match-path src/policy/**/*.sol
```

### Example Test Structure

```solidity
contract PolicyEngineTest is Test {
    PolicyEngine public engine;
    address public token;
    address public operator;
    
    function setUp() public {
        engine = new PolicyEngine();
        engine.initialize(address(this));
        
        // Create test policy
        engine.createPolicy(
            token,
            "mint",
            1000 * 10**18,
            10000 * 10**18,
            60
        );
    }
    
    function testValidateWithinLimits() public {
        (bool approved,) = engine.validateOperation(
            token,
            operator,
            "mint",
            500 * 10**18
        );
        assertTrue(approved);
    }
    
    function testValidateExceedsLimit() public {
        (bool approved, string memory reason) = engine.validateOperation(
            token,
            operator,
            "mint",
            2000 * 10**18
        );
        assertFalse(approved);
        assertEq(reason, "Exceeds maximum amount per operation");
    }
}
```

## Gas Optimization

The policy contracts are optimized for minimal gas consumption:

- **Validation Cost**: ~50K-80K gas
- **Policy Creation**: ~150K gas
- **Approval Request**: ~100K gas

Compared to full transaction costs, policy validation adds only ~5-10% overhead.

## Security Considerations

1. **Access Control**: Only admins can create/update policies
2. **UUPS Upgradeable**: Policies can be upgraded without changing addresses
3. **Multi-Sig Protection**: Critical operations can require multiple approvals
4. **Event Logging**: All validations and violations are logged on-chain
5. **Storage Gaps**: 45 slots reserved for future upgrades

## Hybrid On-Chain + Off-Chain Enforcement

The smart contracts work in tandem with the frontend PolicyEngine.ts:

```
Frontend Request
       ↓
PolicyEngine.ts (Off-chain pre-validation)
       ↓
CryptoOperationGateway
       ↓
PolicyEngine.sol (On-chain validation)
       ↓
Token Master (Execute operation)
```

**Benefits:**
- **Off-chain**: Fast feedback, complex business logic, database integration
- **On-chain**: Immutable enforcement, trustless validation, compliance proof

## Compliance & Auditing

All policy actions emit events for compliance tracking:

```solidity
event PolicyCreated(address indexed token, string operationType, ...)
event PolicyUpdated(address indexed token, string operationType, ...)
event OperationValidated(address indexed token, address indexed operator, ...)
event PolicyViolation(address indexed token, address indexed operator, ...)
event ApprovalRequested(address indexed token, uint256 indexed requestId, ...)
event ApprovalGranted(address indexed token, uint256 indexed requestId, ...)
```

These events integrate with the `compliance_audit_logs` table for comprehensive auditing.

## Future Enhancements

- **Time-based Policies**: Different limits for business hours vs off-hours
- **Role-based Limits**: Different limits for different user roles
- **Dynamic Policies**: Policies that adjust based on market conditions
- **Cross-Chain Policies**: Policies that span multiple chains
- **AI-Powered Policies**: ML-based risk assessment

## Support

For issues or questions:
- GitHub Issues: [Report bugs]
- Documentation: [This README]
- Smart Contract Tests: `test/policy/`

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: October 1, 2025
