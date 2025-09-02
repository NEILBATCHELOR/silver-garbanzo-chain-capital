# JSON Token Configuration Upload

## Overview

The JSON Token Configuration Upload feature allows users to upload JSON files to automatically populate token creation forms. This feature supports all 6 token standards and provides comprehensive validation and error handling.

## Features

### ✅ Comprehensive Token Standard Support
- **ERC-20**: Fungible tokens with fee structure, governance, and rebasing
- **ERC-721**: NFTs with royalties, attributes, and metadata
- **ERC-1155**: Multi-tokens with token types and URI mappings
- **ERC-1400**: Security tokens with partitions and compliance
- **ERC-3525**: Semi-fungible tokens with slots and allocations
- **ERC-4626**: Tokenized vaults with strategies and asset allocations

### ✅ Smart JSON Validation
- **Standard Detection**: Automatically detects token standard from JSON structure
- **Field Validation**: Validates required fields and data types
- **Cross-Reference**: Warns about mismatches with selected standard
- **Error Recovery**: Provides helpful error messages and suggestions

### ✅ Advanced Features
- **Template Generation**: Download JSON templates for each token standard
- **Configuration Mode Detection**: Automatically switches to advanced mode if needed
- **Debug Integration**: Full debug tracking for upload operations
- **Real-time Feedback**: Live validation during upload process

## Usage

### 1. Access Upload Feature

In the token creation page, navigate to the "Configure" step and click the "Load Configuration" button.

### 2. Upload JSON File

1. Click "Load Configuration" button
2. Select your JSON file (must have .json extension)
3. Review validation results
4. Click "Load Configuration" to populate the form

### 3. Download Templates

Click the "Template" button in the upload dialog to download a JSON template for your selected token standard.

## JSON Structure

### Base Structure (All Standards)

```json
{
  "name": "Token Name",
  "symbol": "TKN",
  "description": "Token description",
  "decimals": 18,
  "standard": "ERC-20",
  "status": "DRAFT",
  "configMode": "max"
}
```

### ERC-20 Example

```json
{
  "name": "S&P 500 Buffer Note Liquidity Token",
  "symbol": "lSP500BN",
  "description": "Liquid trading token representing fractionalized interests",
  "decimals": 18,
  "standard": "ERC-20",
  "initialSupply": "50000000000000000000000000",
  "erc20Properties": {
    "isMintable": true,
    "isBurnable": true,
    "isPausable": true,
    "cap": "100000000000000000000000000",
    "tokenType": "asset_backed",
    "accessControl": "roles",
    "allowanceManagement": true,
    "permit": true,
    "snapshot": true,
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
    "liquidityMechanism": "automated_market_maker"
  }
}
```

### ERC-721 Example

```json
{
  "name": "Digital Art Collection",
  "symbol": "DAC",
  "description": "Unique digital art NFT collection",
  "standard": "ERC-721",
  "erc721Properties": {
    "baseUri": "https://api.example.com/metadata/",
    "metadataStorage": "ipfs",
    "maxSupply": "10000",
    "hasRoyalty": true,
    "royaltyPercentage": "2.5",
    "royaltyReceiver": "0x1234567890123456789012345678901234567890",
    "isMintable": true,
    "isBurnable": false,
    "isPausable": false,
    "assetType": "unique_asset",
    "mintingMethod": "open",
    "autoIncrementIds": true
  },
  "tokenAttributes": [
    {
      "name": "rarity",
      "type": "string",
      "required": true
    },
    {
      "name": "power",
      "type": "number",
      "required": false
    }
  ]
}
```

### ERC-1155 Example

```json
{
  "name": "Gaming Token Collection",
  "symbol": "GTC",
  "description": "Multi-token collection for gaming assets",
  "standard": "ERC-1155",
  "erc1155Properties": {
    "baseUri": "https://api.example.com/metadata/{id}",
    "metadataStorage": "ipfs",
    "hasRoyalty": true,
    "royaltyPercentage": "5.0",
    "royaltyReceiver": "0x1234567890123456789012345678901234567890",
    "supplyTracking": true,
    "enableApprovalForAll": true
  },
  "tokenTypes": [
    {
      "id": "1",
      "name": "Sword",
      "supply": "1000",
      "fungible": true
    },
    {
      "id": "2",
      "name": "Shield",
      "supply": "500",
      "fungible": true
    }
  ]
}
```

## Field Mapping

### Standard-Specific Properties

The upload system automatically maps JSON fields to the correct form fields:

- **Camel Case Conversion**: `initialSupply` → `initial_supply`
- **Nested Objects**: `erc20Properties.feeOnTransfer` → form fee configuration
- **Arrays**: `tokenAttributes` → attribute configuration
- **Standard Detection**: Detects standard from `erc[X]Properties` presence

### Supported Field Types

- **Strings**: Text fields, addresses, URIs
- **Numbers**: Decimals, supplies, percentages
- **Booleans**: Feature flags, enable/disable options
- **Objects**: Complex configurations (fees, governance)
- **Arrays**: Token attributes, partitions, slots

## Validation Rules

### Required Fields
- `name`: Token name (string, max 50 characters)
- `symbol`: Token symbol (string, max 10 characters)
- `standard`: Token standard (must be supported)

### Optional Fields
- `decimals`: 0-18 (default: 18)
- `description`: Token description (max 500 characters)
- `initialSupply`: Token supply (string, numeric)

### Standard-Specific Validation
- **ERC-20**: Validates fee recipients, governance thresholds
- **ERC-721**: Validates royalty percentages, URI formats
- **ERC-1155**: Validates token type configurations
- **ERC-1400**: Validates compliance settings, partitions
- **ERC-3525**: Validates slot configurations
- **ERC-4626**: Validates asset addresses, vault strategies

## Error Handling

### Validation Errors
- **Missing Required Fields**: Clear indication of what's missing
- **Invalid Data Types**: Expected vs. actual type information
- **Range Violations**: Valid ranges for numeric fields
- **Format Issues**: Proper format requirements

### Recovery Options
- **Error Messages**: Detailed explanation of issues
- **Suggestions**: How to fix common problems
- **Template Download**: Get correct format examples
- **Partial Loading**: Load valid fields, highlight issues

## Integration Features

### Debug Tracking
- Upload operations are tracked in the debug system
- Field mapping is logged for troubleshooting
- Performance metrics for upload processing

### Configuration Mode Detection
- Automatically switches to advanced mode for complex configurations
- Maintains basic mode for simple configurations
- Preserves user's mode preference where appropriate

### Form Integration
- Seamless integration with existing form validation
- Preserves project context and settings
- Maintains debug session continuity

## Best Practices

### JSON File Preparation
1. **Use Templates**: Start with downloaded templates
2. **Validate Syntax**: Ensure valid JSON format
3. **Check Required Fields**: Include all mandatory fields
4. **Standard Consistency**: Match properties to selected standard

### Upload Process
1. **Review Validation**: Check all validation messages
2. **Handle Warnings**: Address any compatibility warnings
3. **Test Configuration**: Verify form population is correct
4. **Save Progress**: Consider saving after successful upload

### Troubleshooting
1. **Check File Format**: Must be valid JSON with .json extension
2. **Verify Standard**: Ensure JSON matches selected token standard
3. **Review Field Names**: Use correct camelCase naming
4. **Check Data Types**: Ensure proper types (string, number, boolean)

## Technical Details

### Component Location
- **Main Component**: `/src/components/tokens/components/TokenConfigUploadDialog.tsx`
- **Integration**: `/src/components/tokens/pages/CreateTokenPage.tsx`

### Dependencies
- React file upload handling
- JSON parsing and validation
- Token form data interface compatibility
- Debug system integration

### Performance
- Lightweight JSON processing
- Immediate validation feedback
- Non-blocking upload operations
- Memory-efficient file handling

## Future Enhancements

### Planned Features
- **Batch Upload**: Multiple token configurations
- **Format Conversion**: Support for CSV import
- **Cloud Integration**: Direct import from cloud storage
- **Version Control**: Track configuration changes

### Advanced Validation
- **Cross-Standard Validation**: Detect conversion opportunities
- **Compliance Checking**: Regulatory requirement validation
- **Gas Estimation**: Deployment cost estimation
- **Security Analysis**: Configuration security review

## Support

For issues or questions about JSON token configuration upload:

1. **Check Documentation**: Review field requirements
2. **Download Templates**: Use provided templates as reference
3. **Enable Debug Mode**: Use debug features for troubleshooting
4. **Contact Support**: Report bugs with example JSON files