# ERC-1363 Payable Token Module

## Overview
Extension module implementing EIP-1363 "Payable Token" standard for single-transaction token operations with callback execution.

## Problem Solved
Traditional ERC-20 workflows require multiple transactions:
1. User approves token spending (`approve()`)
2. User calls service contract  
3. Service contract pulls tokens (`transferFrom()`)

**ERC-1363 enables one-transaction operations**: Transfer + Execute in a single call.

## Benefits
✅ **Better UX**: One click instead of two  
✅ **Gas Efficient**: Eliminates separate approval transaction  
✅ **Atomic Operations**: Transfer and execution cannot be separated  
✅ **Backwards Compatible**: Works alongside standard ERC-20  

## Use Cases
- **Payment Processors**: Pay and execute service in one transaction
- **Subscriptions**: Approve and subscribe atomically
- **DEX Integrations**: Approve and swap in one call
- **Staking**: Deposit and stake simultaneously
- **Gaming**: Pay and mint/claim NFT in one transaction

## Gas Costs
| Operation | Additional Gas | vs Standard |
|-----------|---------------|-------------|
| `transferAndCall` | +5-10K | vs `transfer()` |
| `approveAndCall` | +5-10K | vs `approve()` |

## Architecture

```solidity
User                    ERC20Token              PayableModule           Receiver/Spender
  |                          |                        |                        |
  |--transferAndCall()------>|                        |                        |
  |                          |--transferFrom()------->|                        |
  |                          |                        |--onTransferReceived()-->|
  |                          |<-----------------------|                        |
  |<-------------------------|                        |                        |
```

## Core Functions

### transferAndCall
```solidity
function transferAndCall(address to, uint256 value) external returns (bool);
function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);
```

Transfers tokens and calls `onTransferReceived()` on receiver if it's a contract.

**Example**:
```solidity
// User pays for subscription in one transaction
payableToken.transferAndCall(subscriptionService, 100e18);

// SubscriptionService.onTransferReceived() is automatically called
```

### transferFromAndCall
```solidity
function transferFromAndCall(address from, address to, uint256 value) external returns (bool);
function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);
```

Uses allowance to transfer tokens, then calls receiver callback.

### approveAndCall
```solidity
function approveAndCall(address spender, uint256 value) external returns (bool);
function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
```

Approves spending and calls `onApprovalReceived()` on spender.

**Example**:
```solidity
// User approves and swaps in one transaction
payableToken.approveAndCall(dexRouter, 1000e18, swapParams);

// DEXRouter.onApprovalReceived() pulls tokens and executes swap
```

## Implementing Receiver Contracts

### IERC1363Receiver
```solidity
contract MyReceiver is IERC1363Receiver {
    function onTransferReceived(
        address operator,
        address from,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        // SECURITY: Validate token contract
        require(msg.sender == trustedToken, "Invalid token");
        
        // Your logic here
        _processPayment(from, value, data);
        
        // Must return selector to accept
        return IERC1363Receiver.onTransferReceived.selector;
    }
}
```

### IERC1363Spender
```solidity
contract MySpender is IERC1363Spender {
    function onApprovalReceived(
        address owner,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        // SECURITY: Validate token contract
        require(msg.sender == trustedToken, "Invalid token");
        
        // Pull tokens and execute
        IERC20(msg.sender).transferFrom(owner, address(this), value);
        _executeSwap(owner, value, data);
        
        // Must return selector to accept
        return IERC1363Spender.onApprovalReceived.selector;
    }
}
```

## Security Features

### 1. Callback Gas Limits
Prevents griefing attacks by limiting callback execution gas:
```solidity
payableModule.setCallbackGasLimit(100000); // Default
```

### 2. Whitelist Mode
Optional whitelist for receivers/spenders:
```solidity
payableModule.setWhitelistEnabled(true);
payableModule.whitelistReceiver(trustedContract, true);
payableModule.whitelistSpender(dexRouter, true);
```

### 3. Validation
- Callbacks must return correct selector
- Failed callbacks revert entire transaction
- Token contract validation required in receivers

## Integration with ERC20Master

```solidity
// Deploy ERC20 token
ERC20Master token = new ERC20Master();
token.initialize("MyToken", "MTK", maxSupply, initialSupply, owner);

// Deploy payable module
ERC1363PayableToken payableModule = new ERC1363PayableToken();
payableModule.initialize(admin, address(token), 100000);

// Users can now use payable functions
token.approve(address(payableModule), amount);
payableModule.transferAndCall(receiver, amount);
```

## Admin Functions

```solidity
// Update callback gas limit
setCallbackGasLimit(uint256 newLimit)

// Enable/disable whitelist
setWhitelistEnabled(bool enabled)

// Manage whitelist
whitelistReceiver(address receiver, bool whitelisted)
whitelistSpender(address spender, bool whitelisted)
batchWhitelistReceivers(address[] receivers, bool whitelisted)
batchWhitelistSpenders(address[] spenders, bool whitelisted)
```

## Testing

Run comprehensive tests:
```bash
forge test --match-contract ERC1363PayableTokenTest -vvv
```

**Test Coverage**:
- ✅ transferAndCall (basic, with data, to EOA, bad receiver)
- ✅ transferFromAndCall
- ✅ approveAndCall (basic, with data, bad spender)
- ✅ Whitelist (enable, block, batch)
- ✅ Admin functions
- ✅ Gas measurements

## Real-World Examples

### 1. Subscription Service
```solidity
contract SubscriptionService is IERC1363Receiver {
    function onTransferReceived(
        address /*operator*/,
        address from,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        uint256 planId = abi.decode(data, (uint256));
        _activateSubscription(from, planId, value);
        return this.onTransferReceived.selector;
    }
}

// User subscribes in one transaction:
token.transferAndCall(
    subscriptionService,
    100e18,
    abi.encode(planId)
);
```

### 2. DEX Router
```solidity
contract SimpleDEX is IERC1363Spender {
    function onApprovalReceived(
        address owner,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        (address tokenOut, uint256 minOut) = abi.decode(data, (address, uint256));
        
        // Pull tokens
        IERC20(msg.sender).transferFrom(owner, address(this), value);
        
        // Execute swap
        uint256 amountOut = _swap(msg.sender, tokenOut, value);
        require(amountOut >= minOut, "Slippage");
        
        // Send output tokens to user
        IERC20(tokenOut).transfer(owner, amountOut);
        
        return this.onApprovalReceived.selector;
    }
}

// User swaps in one transaction:
token.approveAndCall(
    dexRouter,
    1000e18,
    abi.encode(outputToken, minAmountOut)
);
```

## Deployment

```bash
# Deploy module
forge script script/DeployERC1363Module.s.sol --broadcast --verify

# Testnet
forge script script/DeployERC1363Module.s.sol --rpc-url $SEPOLIA_RPC --broadcast

# Mainnet
forge script script/DeployERC1363Module.s.sol --rpc-url $MAINNET_RPC --broadcast --verify
```

## Events

```solidity
event TransferAndCall(address indexed from, address indexed to, uint256 value, bytes data);
event ApproveAndCall(address indexed owner, address indexed spender, uint256 value, bytes data);
event CallbackGasLimitUpdated(uint256 oldLimit, uint256 newLimit);
event WhitelistEnabled(bool enabled);
event ReceiverWhitelisted(address indexed receiver, bool whitelisted);
event SpenderWhitelisted(address indexed spender, bool whitelisted);
```

## Standards Compliance

✅ **EIP-1363**: Full implementation  
✅ **ERC-165**: Interface detection  
✅ **ERC-7201**: Namespaced storage  
✅ **UUPS**: Upgradeable  

## License
MIT

## Status
🟢 **COMPLETE** - Ready for testnet deployment

---

**Module Created**: October 6, 2025  
**Solidity Version**: ^0.8.28  
**Dependencies**: OpenZeppelin Contracts v5.1.0
