# ERC-4906 Metadata Events Module

## Overview

The ERC-4906 Metadata Events Module implements the **ERC-4906 standard** for NFT metadata update notifications. This extension adds standardized events that signal when token metadata has changed, enabling marketplaces, indexers, and other services to efficiently track and refresh metadata.

## Standard Reference

- **EIP**: [EIP-4906](https://eips.ethereum.org/EIPS/eip-4906)
- **Title**: ERC-721 Metadata Update Extension
- **Status**: Final
- **Type**: Standards Track

## Features

✅ **Standardized Events**
- `MetadataUpdate(uint256 _tokenId)` - Signal single token metadata change
- `BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId)` - Signal batch updates

✅ **EIP-165 Compatible**
- Supports interface detection via `supportsInterface()`
- Interface ID: `0x49064906`

✅ **Access Controlled**
- Role-based permissions for metadata updates
- Only authorized addresses can emit events

✅ **Upgradeable**
- UUPS proxy pattern for future enhancements
- Maintains state across upgrades

✅ **Minimal Gas Overhead**
- ~500 gas per event emission
- No storage operations, only events

## Architecture

```
ERC721Master / ERC1155Master
         â†"
    [Integration Hook]
         â†"
ERC4906MetadataModule
         â†"
    [Emits Events]
         â†"
   MetadataUpdate(tokenId)
   BatchMetadataUpdate(from, to)
```

## Use Cases

### 1. **Dynamic NFT Metadata**
When NFT metadata changes based on external events or state:
```solidity
// Update metadata URI in token contract
nft.setTokenURI(tokenId, newURI);

// Signal the update via module
metadataModule.emitMetadataUpdate(tokenId);
```

### 2. **Batch Metadata Refresh**
When updating metadata for multiple tokens:
```solidity
// Update base URI affecting tokens 1-100
nft.setBaseURI(newBaseURI);

// Signal batch update
metadataModule.emitBatchMetadataUpdate(1, 100);
```

### 3. **Marketplace Integration**
Marketplaces listening for these events can automatically:
- Refresh cached metadata
- Update displayed images/traits
- Re-index token properties

## Integration Guide

### Deploying the Module

```solidity
// Deploy via TokenFactory
address moduleAddress = tokenFactory.deployMetadataEventsModule(
    tokenAddress,  // Parent NFT contract
    owner          // Admin address
);
```

### Attaching to NFT Contract

```solidity
// In ERC721Master.sol
address public metadataModule;

function setMetadataModule(address module) external onlyRole(DEFAULT_ADMIN_ROLE) {
    metadataModule = module;
    emit MetadataModuleSet(module);
}
```

### Triggering Updates

```solidity
// Single token update
function setTokenURI(uint256 tokenId, string calldata uri) external {
    _setTokenURI(tokenId, uri);
    
    if (metadataModule != address(0)) {
        ERC4906MetadataModule(metadataModule).emitMetadataUpdate(tokenId);
    }
}

// Batch update
function setBaseURI(string calldata baseURI) external {
    _setBaseURI(baseURI);
    
    if (metadataModule != address(0)) {
        ERC4906MetadataModule(metadataModule).emitBatchMetadataUpdate(
            0,
            totalSupply() - 1
        );
    }
}
```

## Functions

### Core Functions

#### `emitMetadataUpdate(uint256 tokenId)`
Emit metadata update event for a single token.
- **Access**: `METADATA_UPDATER_ROLE`
- **Gas**: ~500 gas
- **Event**: `MetadataUpdate(tokenId)`

#### `emitBatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId)`
Emit metadata update event for a token range.
- **Access**: `METADATA_UPDATER_ROLE`
- **Gas**: ~500 gas
- **Event**: `BatchMetadataUpdate(fromTokenId, toTokenId)`

### Admin Functions

#### `setUpdatesEnabled(bool enabled)`
Enable or disable metadata update events.
- **Access**: `DEFAULT_ADMIN_ROLE`
- **Use**: Emergency pause mechanism

## Events

```solidity
// ERC-4906 Standard Events
event MetadataUpdate(uint256 _tokenId);
event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

// Module Management Events
event ModuleInitialized(address indexed tokenContract);
event UpdatesEnabledChanged(bool enabled);
```

## Access Control

### Roles

1. **DEFAULT_ADMIN_ROLE**
   - Grant/revoke roles
   - Enable/disable updates
   - Upgrade contract

2. **METADATA_UPDATER_ROLE**
   - Emit metadata update events
   - Granted to parent token contract and admin by default

3. **UPGRADER_ROLE**
   - Authorize contract upgrades
   - Granted to admin by default

## Gas Costs

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Initialize Module | ~150,000 | One-time deployment |
| Emit Single Update | ~500 | Per event |
| Emit Batch Update | ~500 | Single event for any range |
| Enable/Disable Updates | ~30,000 | Admin operation |

## Security Considerations

### ✅ **Best Practices**

1. **Role Management**
   - Only grant `METADATA_UPDATER_ROLE` to trusted contracts
   - Use multi-sig for admin role

2. **Update Frequency**
   - Consider gas costs for frequent updates
   - Use batch updates when possible

3. **Event Reliability**
   - Events cannot be used for on-chain logic
   - They are for off-chain indexing only

### âš ï¸ **Warnings**

- **No On-Chain State**: This module does not store metadata, only emits events
- **Permissioned**: Only authorized addresses can emit events
- **Not Retroactive**: Past metadata changes won't be signaled automatically

## Examples

### Example 1: Dynamic NFT Level-Up

```solidity
contract DynamicNFT is ERC721Master {
    mapping(uint256 => uint256) public nftLevel;
    
    function levelUp(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        
        nftLevel[tokenId]++;
        
        // Metadata changes, signal update
        if (metadataModule != address(0)) {
            ERC4906MetadataModule(metadataModule).emitMetadataUpdate(tokenId);
        }
    }
}
```

### Example 2: Seasonal Theme Update

```solidity
contract SeasonalNFT is ERC721Master {
    string public season; // "winter", "spring", etc.
    
    function setSeason(string calldata newSeason) external onlyOwner {
        season = newSeason;
        
        // All NFTs affected, signal batch update
        if (metadataModule != address(0)) {
            ERC4906MetadataModule(metadataModule).emitBatchMetadataUpdate(
                0,
                totalSupply() - 1
            );
        }
    }
}
```

## Compatibility

### Supported Token Standards

- ✅ **ERC-721** (NFTs)
- ✅ **ERC-1155** (Multi-Token)
- ✅ **ERC-3525** (Semi-Fungible)
- ✅ **ERC-1400** (Security Tokens with metadata)

### Marketplace Support

- ✅ **OpenSea** - Listens for `MetadataUpdate` events
- ✅ **LooksRare** - Supports ERC-4906
- ✅ **Blur** - Compatible
- ✅ **Rarible** - Supports metadata refresh

## Testing

Run tests with:
```bash
forge test --match-path test/extensions/ERC4906MetadataModule.t.sol
```

Test coverage includes:
- ✅ Event emission
- ✅ Access control
- ✅ Interface detection
- ✅ Integration with ERC-721
- ✅ Integration with ERC-1155
- ✅ Enable/disable functionality
- ✅ Upgrade scenarios

## Deployment

### Testnet Deployment

```bash
forge script script/extensions/DeployERC4906Module.s.sol \
  --rpc-url $TESTNET_RPC_URL \
  --broadcast \
  --verify
```

### Production Deployment

```bash
forge script script/extensions/DeployERC4906Module.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --legacy
```

## References

- [EIP-4906 Specification](https://eips.ethereum.org/EIPS/eip-4906)
- [OpenZeppelin ERC-4906 Documentation](https://docs.openzeppelin.com/contracts/5.x/api/interfaces#IERC4906)
- [Chain Capital Documentation](/docs)

## License

MIT License - See LICENSE file for details
