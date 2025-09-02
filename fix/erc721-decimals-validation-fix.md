# ERC-721 Token Decimals Validation Error Fix

## Issue Summary

**Problem**: ERC-721 tokens were failing validation with the error:
```
Token validation failed: decimals - Invalid literal value, expected 0
```

**Root Cause**: Multiple components in the token system were applying a default decimals value of 18 to ALL token standards, including ERC-721 which must have decimals = 0.

## Why ERC-721 Requires decimals = 0

ERC-721 tokens are Non-Fungible Tokens (NFTs) that represent unique, indivisible assets. Unlike ERC-20 tokens which can be fractional (e.g., 0.5 tokens), NFTs cannot be divided into smaller units. Therefore:

- **ERC-721 tokens MUST have decimals = 0**
- **ERC-1155 tokens typically have decimals = 0** (semi-fungible tokens)
- **ERC-20, ERC-1400, ERC-3525, ERC-4626 tokens default to decimals = 18**

## Validation Schema

The ERC-721 validation schema correctly enforces this requirement:

```typescript
// From erc721.ts schema
decimals: z.literal(0).default(0),
```

The `z.literal(0)` means the decimals field must be **exactly** 0, not just any number.

## Files Fixed

### 1. TokenTestUtility.tsx - parseAndValidateJson Function

**Problem**: Applied `decimals: parsedData.decimals || 18` to all token standards.

**Fix**: Added standard-specific logic:

```typescript
// Set appropriate decimals based on token standard
let defaultDecimals;
if (parsedData.decimals !== undefined) {
  defaultDecimals = parsedData.decimals;
} else {
  // Set standard-specific default decimals
  switch (detectedStandard) {
    case 'ERC-721':
    case 'ERC721':
    case TokenStandard.ERC721:
      defaultDecimals = 0; // NFTs always have 0 decimals
      break;
    case 'ERC-1155':
    case 'ERC1155':  
    case TokenStandard.ERC1155:
      defaultDecimals = 0; // Semi-fungible tokens typically have 0 decimals
      break;
    default:
      defaultDecimals = 18; // ERC-20, ERC-1400, ERC-3525, ERC-4626 default to 18
      break;
  }
}
```

**Locations Fixed**:
- Enhanced format section (line ~232)
- Legacy format section (line ~270)

### 2. tokenService.ts - createToken Function

**Problem**: Used `decimals: decimals || 18` without considering token standard.

**Fix**: Added standard-specific decimals logic:

```typescript
// Set appropriate decimals based on token standard
let finalDecimals = decimals;
if (finalDecimals === undefined || finalDecimals === null) {
  // Set standard-specific default decimals
  switch (standard) {
    case 'ERC-721':
    case 'ERC721':
    case 'ERC-1155':
    case 'ERC1155':
      finalDecimals = 0; // NFTs and semi-fungible tokens have 0 decimals
      break;
    default:
      finalDecimals = 18; // ERC-20, ERC-1400, ERC-3525, ERC-4626 default to 18
      break;
  }
}
```

### 3. tokenTemplates.ts - Template Definitions

**Problem**: ERC-721 and ERC-1155 templates were missing explicit decimals fields.

**Fix**: Added explicit `decimals: 0` to all NFT and semi-fungible templates:

```typescript
const erc721BasicTemplate = {
  name: "My NFT Collection",
  symbol: "MNFT",
  standard: TokenStandard.ERC721,
  decimals: 0, // NFTs always have 0 decimals
  // ... rest of template
};

const erc1155BasicTemplate = {
  name: "My Multi-Token",
  symbol: "MMT",
  standard: TokenStandard.ERC1155,
  decimals: 0, // Semi-fungible tokens typically have 0 decimals
  // ... rest of template
};
```

## Token Standard Decimals Reference

| Token Standard | Default Decimals | Reason |
|----------------|------------------|---------|
| ERC-20 | 18 | Fungible tokens, divisible |
| ERC-721 | 0 | Non-fungible tokens, indivisible |
| ERC-1155 | 0 | Semi-fungible tokens, typically indivisible |
| ERC-1400 | 18 | Security tokens, divisible |
| ERC-3525 | 18 | Semi-fungible value tokens, divisible |
| ERC-4626 | 18 | Tokenized vaults, divisible |

## Testing

After implementing these fixes, the following should work without validation errors:

1. **ERC-721 Token Creation**: Creating NFT collections with the Diamond Reserve Collection example should succeed.

2. **ERC-1155 Token Creation**: Creating multi-token collections should respect decimals = 0.

3. **Mixed Token Testing**: Creating different token standards in sequence should apply correct decimals for each.

## Validation Flow

The validation now follows this priority:

1. **Explicit decimals in JSON**: If `decimals` is explicitly set in the JSON data, use that value.
2. **Standard-specific defaults**: If no decimals specified, apply the correct default based on token standard.
3. **Schema validation**: The Zod schema validates that the final decimals value matches requirements.

## Impact

This fix prevents validation errors when working with ERC-721 and ERC-1155 tokens while maintaining backward compatibility for ERC-20 and other fungible token standards.

## Related Components

Other components in the system already had correct decimals handling:

- `validation/utils.ts` - Already used standard-specific logic
- ERC-721 validation schema - Already required `z.literal(0)`
- ERC-1155 validation schema - Already handled appropriately

This fix brings the parsing and service layers in line with the validation requirements.
