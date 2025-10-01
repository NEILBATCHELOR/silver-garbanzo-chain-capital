# PolicyOperationTypes Quick Reference
## One-Page Cheat Sheet for All Operations

**Last Updated**: October 1, 2025

---

## 📖 Import Statement

```solidity
import "../policy/libraries/PolicyOperationTypes.sol";
```

---

## 🔧 Universal Operations (4)

| Constant | Operation | Use Case |
|----------|-----------|----------|
| `DEPLOY` | Deploy token | Initial contract deployment |
| `PAUSE` | Pause all transfers | Emergency stop |
| `UNPAUSE` | Resume transfers | Resume after emergency |
| `UPGRADE` | Upgrade implementation | Contract upgrades (UUPS) |

---

## 💰 ERC-20 Operations (8)

| Constant | Operation | Use Case |
|----------|-----------|----------|
| `ERC20_MINT` | Mint tokens | Create new tokens |
| `ERC20_BURN` | Burn tokens | Destroy tokens |
| `ERC20_TRANSFER` | Transfer tokens | Move tokens between accounts |
| `ERC20_APPROVE` | Approve spending | Allow spender to use tokens |
| `ERC20_LOCK` | Lock tokens | Prevent transfers (vesting) |
| `ERC20_UNLOCK` | Unlock tokens | Allow transfers again |
| `ERC20_BLOCK` | Block address | Ban address from transfers |
| `ERC20_UNBLOCK` | Unblock address | Allow address again |

---

## 🖼️ ERC-721 Operations (10)

| Constant | Operation | Use Case |
|----------|-----------|----------|
| `ERC721_MINT` | Mint NFT | Create single NFT |
| `ERC721_MINT_BATCH` | Mint NFTs batch | Create multiple NFTs |
| `ERC721_BURN` | Burn NFT | Destroy NFT |
| `ERC721_TRANSFER` | Transfer NFT | Move NFT ownership |
| `ERC721_APPROVE` | Approve NFT | Allow transfer by another |
| `ERC721_SET_APPROVAL_FOR_ALL` | Approve operator | Allow all NFTs transfer |
| `ERC721_LOCK` | Lock NFT | Prevent NFT transfer |
| `ERC721_UNLOCK` | Unlock NFT | Allow NFT transfer |
| `ERC721_BLOCK` | Block address | Ban from NFT transfers |
| `ERC721_UNBLOCK` | Unblock address | Allow NFT transfers |

---

## 🎮 ERC-1155 Operations (7)

| Constant | Operation | Use Case |
|----------|-----------|----------|
| `ERC1155_MINT` | Mint token(s) | Create tokens of one ID |
| `ERC1155_MINT_BATCH` | Mint batch | Create tokens of multiple IDs |
| `ERC1155_BURN` | Burn token(s) | Destroy tokens of one ID |
| `ERC1155_BURN_BATCH` | Burn batch | Destroy tokens of multiple IDs |
| `ERC1155_TRANSFER` | Transfer tokens | Move single token type |
| `ERC1155_BATCH_TRANSFER` | Transfer batch | Move multiple token types |
| `ERC1155_SET_APPROVAL_FOR_ALL` | Approve operator | Allow all token transfers |

---

## 🎫 ERC-3525 Operations (7)

| Constant | Operation | Use Case |
|----------|-----------|----------|
| `ERC3525_MINT` | Mint token | Create semi-fungible token |
| `ERC3525_BURN` | Burn token | Destroy token |
| `ERC3525_TRANSFER` | Transfer ownership | Move token to another owner |
| `ERC3525_TRANSFER_VALUE` | Transfer value | Move value between tokens (same slot) |
| `ERC3525_APPROVE` | Approve transfer | Allow token transfer |
| `ERC3525_APPROVE_VALUE` | Approve value | Allow value spending |
| `ERC3525_SET_APPROVAL_FOR_ALL` | Approve operator | Allow all token operations |

---

## 🏦 ERC-4626 Operations (6)

| Constant | Operation | Use Case |
|----------|-----------|----------|
| `ERC4626_DEPOSIT` | Deposit assets | Put assets in vault |
| `ERC4626_MINT` | Mint shares | Issue vault shares |
| `ERC4626_WITHDRAW` | Withdraw assets | Take assets from vault |
| `ERC4626_REDEEM` | Redeem shares | Exchange shares for assets |
| `ERC4626_TRANSFER` | Transfer shares | Move vault shares |
| `ERC4626_APPROVE` | Approve shares | Allow share spending |

---

## 🔐 ERC-1400 Operations (5)

| Constant | Operation | Use Case |
|----------|-----------|----------|
| `ERC1400_ISSUE` | Issue tokens | Create tokens in partition |
| `ERC1400_REDEEM` | Redeem tokens | Destroy tokens from partition |
| `ERC1400_TRANSFER_BY_PARTITION` | Transfer partition | Move tokens in partition |
| `ERC1400_CONTROLLER_TRANSFER` | Controller transfer | Forced transfer (regulatory) |
| `ERC1400_CONTROLLER_REDEEM` | Controller redeem | Forced redemption |

---

## 💡 Usage Examples

### Basic Validation

```solidity
function mint(address to, uint256 amount) external {
    // Validate with PolicyEngine
    if (policyEngine != address(0)) {
        (bool approved, string memory reason) = 
            IPolicyEngine(policyEngine).validateOperation(
                address(this),
                msg.sender,
                PolicyOperationTypes.ERC20_MINT,  // ← Use constant
                amount
            );
        require(approved, reason);
    }
    
    _mint(to, amount);
}
```

### With Target Address

```solidity
function transfer(address to, uint256 amount) public override returns (bool) {
    if (policyEngine != address(0)) {
        (bool approved, string memory reason) = 
            IPolicyEngine(policyEngine).validateOperationWithTarget(
                address(this),
                msg.sender,
                to,  // ← Include target
                PolicyOperationTypes.ERC20_TRANSFER,
                amount
            );
        require(approved, reason);
    }
    
    return super.transfer(to, amount);
}
```

### Batch Operation

```solidity
function mintBatch(
    address to, 
    uint256[] memory ids, 
    uint256[] memory amounts
) external {
    // Sum total for validation
    uint256 total = 0;
    for (uint256 i = 0; i < amounts.length; i++) {
        total += amounts[i];
    }
    
    if (policyEngine != address(0)) {
        (bool approved, string memory reason) = 
            IPolicyEngine(policyEngine).validateOperation(
                address(this),
                msg.sender,
                PolicyOperationTypes.ERC1155_MINT_BATCH,  // ← Batch constant
                total  // ← Total amount
            );
        require(approved, reason);
    }
    
    _mintBatch(to, ids, amounts, "");
}
```

---

## 🔍 Helper Functions

### Check if Operation Type is Valid

```solidity
bool isValid = PolicyOperationTypes.isValidOperationType("ERC20_MINT");
// Returns: true
```

### Get Operation Category

```solidity
string memory category = PolicyOperationTypes.getOperationCategory("ERC20_MINT");
// Returns: "ERC20"
```

---

## 📊 Quick Stats

| Standard | Operations | Coverage |
|----------|-----------|----------|
| **Universal** | 4 | ✅ 100% |
| **ERC-20** | 8 | ✅ 100% |
| **ERC-721** | 10 | ✅ 100% |
| **ERC-1155** | 7 | ✅ 100% |
| **ERC-3525** | 7 | ✅ 100% |
| **ERC-4626** | 6 | ✅ 100% |
| **ERC-1400** | 5 | ✅ 100% |
| **Total** | **47** | **✅ Complete** |

---

## 🎯 Common Patterns

### Pattern 1: Simple Operation
```solidity
_validatePolicy(PolicyOperationTypes.ERC20_MINT, amount);
```

### Pattern 2: With Target
```solidity
_validatePolicyWithTarget(PolicyOperationTypes.ERC20_TRANSFER, to, amount);
```

### Pattern 3: Batch Sum
```solidity
uint256 total = sum(amounts);
_validatePolicy(PolicyOperationTypes.ERC1155_MINT_BATCH, total);
```

### Pattern 4: Boolean to Amount
```solidity
uint256 amount = approved ? 1 : 0;
_validatePolicyWithTarget(PolicyOperationTypes.ERC721_SET_APPROVAL_FOR_ALL, operator, amount);
```

---

## 📚 Full Documentation

- **Complete Guide**: [POLICY-INTEGRATION-GUIDE.md](./POLICY-INTEGRATION-GUIDE.md)
- **Implementation Summary**: [POLICY-OPERATIONS-UPDATE-SUMMARY.md](./POLICY-OPERATIONS-UPDATE-SUMMARY.md)
- **Source Code**: [PolicyOperationTypes.sol](../frontend/foundry-contracts/src/policy/libraries/PolicyOperationTypes.sol)

---

**Print this page for quick reference during integration!** 📄
