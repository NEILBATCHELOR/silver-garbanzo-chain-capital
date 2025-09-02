# JSON Token Upload - Usage Examples

## Quick Start

### 1. Basic ERC-20 Token Upload

```json
{
  "name": "My Utility Token",
  "symbol": "MUT",
  "description": "A simple utility token for my platform",
  "decimals": 18,
  "standard": "ERC-20",
  "initialSupply": "1000000000000000000000000",
  "erc20Properties": {
    "isMintable": true,
    "isBurnable": true,
    "isPausable": false,
    "tokenType": "utility",
    "accessControl": "ownable"
  }
}
```

### 2. Upload Steps
1. Navigate to **Tokens** → **Create Token**
2. Go to the **Configure** step
3. Click **Load Configuration** button
4. Select your JSON file
5. Review validation results
6. Click **Load Configuration**

## Real-World Examples

### Example 1: Asset-Backed Security Token

This example matches the provided JSON structure for an S&P 500 Buffer Note:

```json
{
  "name": "S&P 500 Buffer Note Liquidity Token",
  "symbol": "lSP500BN",
  "description": "Liquid trading token representing fractionalized interests in S&P 500 Buffer Note 2025 for secondary market trading",
  "decimals": 18,
  "standard": "ERC-20",
  "productCategory": "structured_product",
  "tokenType": "asset_backed",
  "initialSupply": "50000000000000000000000000",
  "configMode": "max",
  "erc20Properties": {
    "isMintable": true,
    "isBurnable": true,
    "isPausable": true,
    "cap": "100000000000000000000000000",
    "accessControl": "roles",
    "permit": true,
    "snapshot": true,
    "allowanceManagement": true,
    "feeOnTransfer": {
      "enabled": true,
      "fee": "0.25",
      "recipient": "0x742d35Cc6558aa658D0Bf1234567890123456789",
      "feeType": "percentage"
    },
    "governanceFeatures": {
      "enabled": false,
      "votingPeriod": 0,
      "votingThreshold": "0"
    },
    "rebasing": {
      "enabled": false,
      "mode": "automatic",
      "targetSupply": "0"
    }
  },
  "metadata": {
    "backingAsset": "S&P 500 Buffer Note 2025",
    "backingRatio": "1:1",
    "liquidityMechanism": "automated_market_maker",
    "redemptionMechanism": "burn_to_redeem",
    "oracleAddress": "0x1234567890123456789012345678901234567890",
    "priceUpdateFrequency": "daily",
    "minimumLiquidity": "1000000",
    "tradingHours": "24/7",
    "settlementPeriod": "T+0"
  },
  "blocks": {
    "liquidity_features": {
      "instant_settlement": true,
      "fractional_trading": true,
      "automated_pricing": true,
      "cross_chain_compatible": true
    },
    "risk_management": {
      "circuit_breakers": true,
      "maximum_daily_volume": "10000000",
      "price_deviation_limit": "5%"
    },
    "integration": {
      "defi_compatible": true,
      "lending_collateral": true,
      "yield_farming": true,
      "staking_rewards": false
    }
  }
}
```

### Example 2: NFT Collection

```json
{
  "name": "Digital Art Masterpieces",
  "symbol": "DAM",
  "description": "Exclusive collection of digital art masterpieces",
  "standard": "ERC-721",
  "erc721Properties": {
    "baseUri": "https://api.digitalart.com/metadata/",
    "metadataStorage": "ipfs",
    "maxSupply": "5000",
    "hasRoyalty": true,
    "royaltyPercentage": "7.5",
    "royaltyReceiver": "0x1234567890123456789012345678901234567890",
    "isMintable": true,
    "isBurnable": false,
    "isPausable": true,
    "assetType": "unique_asset",
    "mintingMethod": "whitelist",
    "autoIncrementIds": true,
    "enumerable": true,
    "uriStorage": "tokenId",
    "updatableUris": false
  },
  "tokenAttributes": [
    {
      "name": "artist",
      "type": "string",
      "required": true
    },
    {
      "name": "year_created",
      "type": "number",
      "required": true
    },
    {
      "name": "rarity",
      "type": "string",
      "required": true
    },
    {
      "name": "medium",
      "type": "string",
      "required": false
    }
  ]
}
```

### Example 3: Gaming Multi-Token

```json
{
  "name": "Fantasy Quest Items",
  "symbol": "FQI",
  "description": "Multi-token standard for fantasy quest game items",
  "standard": "ERC-1155",
  "erc1155Properties": {
    "baseUri": "https://api.fantasyquest.com/metadata/{id}",
    "metadataStorage": "ipfs",
    "hasRoyalty": true,
    "royaltyPercentage": "2.5",
    "royaltyReceiver": "0x1234567890123456789012345678901234567890",
    "isBurnable": true,
    "isPausable": true,
    "supplyTracking": true,
    "enableApprovalForAll": true,
    "accessControl": "roles",
    "updatableUris": true
  },
  "tokenTypes": [
    {
      "id": "1",
      "name": "Iron Sword",
      "supply": "10000",
      "fungible": true,
      "rarityLevel": "common"
    },
    {
      "id": "2",
      "name": "Magic Staff",
      "supply": "5000",
      "fungible": true,
      "rarityLevel": "uncommon"
    },
    {
      "id": "3",
      "name": "Dragon Scale Armor",
      "supply": "100",
      "fungible": true,
      "rarityLevel": "legendary"
    },
    {
      "id": "4",
      "name": "Unique Artifact",
      "supply": "1",
      "fungible": false,
      "rarityLevel": "legendary"
    }
  ]
}
```

### Example 4: Security Token

```json
{
  "name": "TechCorp Equity Token",
  "symbol": "TECH",
  "description": "Tokenized equity shares of TechCorp Inc.",
  "decimals": 18,
  "standard": "ERC-1400",
  "initialSupply": "10000000000000000000000000",
  "erc1400Properties": {
    "cap": "50000000000000000000000000",
    "securityType": "equity",
    "issuingJurisdiction": "US",
    "issuingEntityName": "TechCorp Inc.",
    "issuingEntityLei": "123456789012345678AB",
    "enforceKYC": true,
    "forcedTransfersEnabled": false,
    "isIssuable": true,
    "whitelistEnabled": true,
    "investorAccreditation": true,
    "holdingPeriod": "365",
    "maxInvestorCount": "2000",
    "autoCompliance": true,
    "manualApprovals": false,
    "complianceAutomationLevel": "fully-automated",
    "geographicRestrictions": ["CN", "KP", "IR"]
  },
  "partitions": [
    {
      "name": "Class A Common",
      "partitionId": "CLASSA",
      "amount": "7000000000000000000000000",
      "transferable": true,
      "partitionType": "common"
    },
    {
      "name": "Class B Preferred",
      "partitionId": "CLASSB",
      "amount": "3000000000000000000000000",
      "transferable": true,
      "partitionType": "preferred"
    }
  ],
  "controllers": [
    "0x1234567890123456789012345678901234567890",
    "0x2345678901234567890123456789012345678901"
  ]
}
```

### Example 5: Tokenized Vault

```json
{
  "name": "DeFi Yield Vault",
  "symbol": "DYV",
  "description": "Automated yield farming vault for DeFi protocols",
  "decimals": 18,
  "standard": "ERC-4626",
  "erc4626Properties": {
    "assetAddress": "0x1234567890123456789012345678901234567890",
    "assetName": "USD Coin",
    "assetSymbol": "USDC",
    "assetDecimals": 6,
    "vaultType": "yield",
    "vaultStrategy": "automated_yield_farming",
    "customStrategy": true,
    "strategyController": "0x2345678901234567890123456789012345678901",
    "accessControl": "roles",
    "isMintable": true,
    "isBurnable": true,
    "isPausable": true,
    "permit": true,
    "flashLoans": true,
    "emergencyShutdown": true,
    "performanceMetrics": true,
    "managementFee": "2.0",
    "performanceFee": "20.0",
    "depositFee": "0.1",
    "withdrawalFee": "0.1",
    "feeRecipient": "0x3456789012345678901234567890123456789012"
  },
  "fee": {
    "enabled": true,
    "managementFee": "2.0",
    "performanceFee": "20.0",
    "depositFee": "0.1",
    "withdrawalFee": "0.1",
    "feeRecipient": "0x3456789012345678901234567890123456789012"
  },
  "assetAllocation": [
    {
      "asset": "Compound USDC",
      "percentage": "40"
    },
    {
      "asset": "Aave USDC",
      "percentage": "35"
    },
    {
      "asset": "Yearn USDC",
      "percentage": "25"
    }
  ]
}
```

## Troubleshooting Common Issues

### Issue 1: "Invalid JSON format"

**Problem**: JSON syntax errors
**Solution**: Validate JSON using online validators or IDE

```json
// ❌ Wrong - Missing comma
{
  "name": "Test Token"
  "symbol": "TEST"
}

// ✅ Correct
{
  "name": "Test Token",
  "symbol": "TEST"
}
```

### Issue 2: "Missing required fields"

**Problem**: Required fields not provided
**Solution**: Include all mandatory fields

```json
// ❌ Wrong - Missing symbol
{
  "name": "Test Token"
}

// ✅ Correct
{
  "name": "Test Token",
  "symbol": "TEST"
}
```

### Issue 3: "Invalid address format"

**Problem**: Ethereum addresses must be 42 characters
**Solution**: Use proper address format

```json
// ❌ Wrong
"royaltyReceiver": "0x123"

// ✅ Correct
"royaltyReceiver": "0x1234567890123456789012345678901234567890"
```

### Issue 4: "Standard mismatch warning"

**Problem**: JSON contains different standard than selected
**Solution**: Either change selection or update JSON

```json
// If ERC-721 is selected but JSON has:
{
  "standard": "ERC-20",
  "erc20Properties": { ... }
}

// Change to:
{
  "standard": "ERC-721",
  "erc721Properties": { ... }
}
```

## Advanced Usage

### Custom Metadata

```json
{
  "name": "Advanced Token",
  "symbol": "ADV",
  "standard": "ERC-20",
  "metadata": {
    "customField1": "value1",
    "customField2": "value2",
    "projectData": {
      "version": "1.0",
      "author": "Developer Name"
    }
  },
  "blocks": {
    "custom_features": {
      "feature1": true,
      "feature2": "enabled"
    }
  }
}
```

### Configuration Mode Control

```json
{
  "name": "Pro Token",
  "symbol": "PRO",
  "configMode": "max",  // Forces advanced mode
  "standard": "ERC-20",
  "erc20Properties": {
    // Complex configuration options
  }
}
```

### Multi-Standard Support

You can prepare different JSON files for different standards and switch between them:

1. `erc20-token.json` - For fungible tokens
2. `erc721-nft.json` - For NFT collections  
3. `erc1155-gaming.json` - For gaming tokens
4. `erc1400-security.json` - For security tokens

## Best Practices

### 1. Use Version Control
Keep your JSON configurations in version control to track changes.

### 2. Template-Based Approach
Start with downloaded templates and modify them for your needs.

### 3. Validation First
Always validate JSON before uploading to catch syntax errors early.

### 4. Incremental Development
Start with basic configurations and add complexity gradually.

### 5. Documentation
Document custom fields and their purposes for team collaboration.

## Integration with Existing Workflows

### 1. Development Workflow
```bash
# 1. Download template
# 2. Modify configuration
# 3. Validate JSON
npm run validate-json token-config.json
# 4. Upload to platform
```

### 2. Team Collaboration
- Share JSON configurations via Git
- Use consistent naming conventions
- Document custom fields and values
- Review configurations before upload

### 3. Environment Management
- `dev-token.json` - Development environment
- `staging-token.json` - Staging environment  
- `prod-token.json` - Production environment

This comprehensive upload system makes it easy to programmatically create and manage token configurations across all supported standards.