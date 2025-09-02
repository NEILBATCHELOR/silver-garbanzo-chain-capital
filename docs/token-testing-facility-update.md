# Token Testing Facility Update

## Overview

The token testing facility has been updated to use the comprehensive examples folder instead of the public JSON_Products folder. This provides access to 100+ real-world token configuration examples across all asset classes and token standards.

## Key Updates

### 1. New Example File Service
- **File**: `/src/components/tokens/services/exampleFileService.ts`
- **Purpose**: Registry-based service for accessing token JSON examples
- **Features**: 
  - Static imports for reliable build compatibility
  - 100+ example files across all asset types
  - Automatic token standard detection
  - Enhanced display names and categorization

### 2. Updated Product Selector
- **File**: `/src/components/tokens/components/ProductSelector.tsx`
- **Changes**:
  - Now uses examples folder instead of public JSON_Products
  - Added 60-second auto-refresh functionality with toggle
  - Enhanced filtering by asset type, category, and token standard
  - Improved file display with better naming and badges
  - Real-time refresh timestamp display

### 3. Example Folder Structure
The examples folder is organized by asset classes:

```
/src/components/tokens/examples/
├── alternative-assets/
│   ├── asset-backed-receivables/
│   ├── carbon-credits/
│   ├── collectibles-other/
│   ├── energy/
│   ├── infrastructure/
│   ├── private-debt/
│   ├── private-equity/
│   ├── real-estate/
│   └── solar-wind-energy-climate-receivables/
├── digital-assets/
│   └── digital-tokenised-fund/
├── stablecoins/
│   ├── algorithmic/
│   ├── commodity-backed/
│   ├── crypto-backed/
│   └── fiat-backed/
└── traditional-assets/
    ├── bonds/
    ├── commodities/
    ├── equity/
    ├── funds-etfs-etps/
    ├── quantitative-strategies/
    └── structured-products/
```

Each asset class contains:
- `primary/` folder - Primary token standard approach
- `alternative/` folder - Alternative token standard approach

## Usage

### Testing Facility Access
1. Navigate to Token Testing Page: `/tokens/:projectId/testing`
2. The page will automatically load available examples from the examples folder
3. Auto-refresh occurs every 60 seconds (can be toggled off)

### File Selection
1. Use search to find specific examples by name or type
2. Filter by:
   - Asset Type (e.g., "Alternative Assets / Private Equity")
   - Category (Primary or Alternative)
   - Token Standard (ERC20, ERC721, ERC1155, ERC1400, ERC3525, ERC4626)
3. Click on any example to load it into the testing utility

### Auto-Refresh Feature
- Automatically scans for new files every 60 seconds
- Shows last refresh timestamp
- Can be toggled on/off via checkbox
- Displays file count (filtered / total)

## Technical Details

### File Registry Approach
Instead of dynamic file discovery, the service uses a static registry with pre-imported JSON files. This ensures:
- Reliable builds in production
- Fast file access without network requests
- Type safety with TypeScript imports
- No dependency on file system APIs

### Token Standard Detection
Token standards are automatically detected from filenames:
- `erc20-*` → ERC20
- `erc721-*` → ERC721  
- `erc1155-*` → ERC1155
- `erc1400-*` → ERC1400
- `erc3525-*` → ERC3525
- `erc4626-*` → ERC4626

### Configuration Mode
All examples use "max" configuration mode by default, providing access to all available fields for comprehensive testing.

## Files Updated

1. **New Files**:
   - `/src/components/tokens/services/exampleFileService.ts`

2. **Updated Files**:
   - `/src/components/tokens/components/ProductSelector.tsx`
   - `/src/components/tokens/services/index.ts`

3. **Testing Facility Files** (compatible with updates):
   - `/src/components/tokens/testing/TokenTestingPage.tsx`
   - `/src/components/tokens/testing/TokenTestUtility.tsx`

## Benefits

1. **Comprehensive Examples**: Access to 100+ real-world token configurations
2. **Better Organization**: Examples organized by asset class and approach
3. **Enhanced UX**: Auto-refresh, better filtering, improved display names
4. **Build Reliability**: Static imports ensure production compatibility
5. **Testing Efficiency**: All fields covered with max configuration mode

## Future Enhancements

1. **Example Validation**: Automatic validation of example files against schemas
2. **Custom Examples**: Allow users to save custom configurations as examples
3. **Example Versioning**: Track changes to example files over time
4. **Export Functionality**: Export current configuration as new example file

## Troubleshooting

If examples don't load:
1. Check console for import errors
2. Verify all JSON files are properly formatted
3. Ensure file paths match the registry in `exampleFileService.ts`
4. Try toggling auto-refresh or manually clicking refresh button

The testing facility is now fully compatible with the new configuration upload dialogs and provides comprehensive access to all token standards and field configurations.
