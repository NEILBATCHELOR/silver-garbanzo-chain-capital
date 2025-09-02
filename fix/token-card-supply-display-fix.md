# Token Card Supply Display Fix

## Issue Fixed
**Problem**: Token cards were incorrectly showing "Not Set" for supply values due to improper parsing logic.

## Root Cause
1. **parseInt() Failure**: Using `parseInt(token.total_supply)` failed on:
   - Empty strings (`""`) → returned `NaN`
   - Very large numbers → parsing issues
   - Non-numeric strings → returned `NaN`

2. **Missing Fallback Logic**: No fallback to properties tables when main `total_supply` was empty

3. **No Token Standard Context**: All token types treated the same way

## Solution Implemented

### 1. Enhanced OptimizedTokenCard.tsx

**Added `getFormattedSupply()` Helper Function**:
```typescript
const getFormattedSupply = (token: TokenCardData): string => {
  // Token standard-specific handling
  if (token.standard === 'ERC-721') {
    return 'NFT Collection';
  }
  
  // Proper number parsing with error handling
  const supplyNumber = parseFloat(supply);
  
  // Large number formatting with suffixes
  if (supplyNumber >= 1e12) return `${(supplyNumber / 1e12).toFixed(1)}T`;
  if (supplyNumber >= 1e9) return `${(supplyNumber / 1e9).toFixed(1)}B`;
  if (supplyNumber >= 1e6) return `${(supplyNumber / 1e6).toFixed(1)}M`;
  if (supplyNumber >= 1e3) return `${(supplyNumber / 1e3).toFixed(1)}K`;
  
  return supplyNumber.toLocaleString();
};
```

**Benefits**:
- ✅ **Proper Number Parsing**: Uses `parseFloat()` instead of `parseInt()`
- ✅ **Error Handling**: Try-catch blocks with graceful fallbacks
- ✅ **Large Number Formatting**: Shows "1.5M" instead of "1,500,000"
- ✅ **Token Standard Awareness**: Different display for NFTs vs fungible tokens

### 2. Enhanced token-card-service.ts

**Added Supply Fallback Logic**:
```typescript
// Fetch supply from properties when main total_supply is empty
const tokensWithEmptySupply = tokens.filter(token => 
  !token.total_supply || token.total_supply.trim() === ''
);

// Standard-specific supply fetching
switch (token.standard) {
  case 'ERC-20':
    // Fallback to initial_supply from token_erc20_properties
    const { data: erc20Props } = await supabase
      .from('token_erc20_properties')
      .select('initial_supply, cap')
      .eq('token_id', token.id)
      .single();
    break;
    
  case 'ERC-721':
    // Fallback to maxSupply from token_erc721_properties
    break;
    
  case 'ERC-1155':
    // Multi-token handling
    break;
}
```

**Benefits**:
- ✅ **Comprehensive Data Fetching**: Gets supply from properties tables when needed
- ✅ **Standard-Specific Logic**: Different handling for each token standard
- ✅ **Performance Optimized**: Only fetches properties for tokens with empty supply
- ✅ **Graceful Degradation**: Continues working even if properties fetch fails

## Token Standard-Specific Display

| Standard | Supply Display | Fallback Source |
|----------|---------------|-----------------|
| **ERC-20** | Formatted number (1.5M, 2.3B) | `initial_supply` from properties |
| **ERC-721** | "NFT Collection" | `maxSupply` from properties |
| **ERC-1155** | "Multi-Token" | Type-specific logic |
| **ERC-1400** | Formatted number | Properties table |
| **ERC-3525** | Formatted number | Properties table |
| **ERC-4626** | Formatted number | Properties table |

## Examples of Fixed Display

### Before (Broken)
```
Supply: Not Set    // Even when data existed
Supply: NaN        // parseInt() failed
Supply: 1000000000 // Unreadable large numbers
```

### After (Fixed)
```
Supply: 1.5M           // Readable formatting
Supply: NFT Collection // Appropriate for NFTs
Supply: 1,500,000      // Proper comma formatting
Supply: Multi-Token    // Appropriate for ERC-1155
```

## Error Handling

**Graceful Fallbacks**:
- Invalid data → "Invalid"
- Missing data → "Not Set"
- Network errors → "Error"
- Standard-specific defaults

**Console Warnings**:
- Logs errors without breaking UI
- Helps debugging without user impact

## Files Modified

1. **`/src/components/tokens/display/OptimizedTokenCard.tsx`**
   - Added `getFormattedSupply()` helper function
   - Replaced broken `parseInt()` logic

2. **`/src/components/tokens/services/token-card-service.ts`**
   - Enhanced `getTokenCardsForProject()` with supply fallback logic
   - Added properties table queries for empty supply values

## Testing Verification

**Test Scenarios**:
- ✅ ERC-20 tokens with valid supply → Shows formatted numbers
- ✅ ERC-20 tokens with empty supply → Falls back to `initial_supply`
- ✅ ERC-721 tokens → Shows "NFT Collection"
- ✅ ERC-1155 tokens → Shows "Multi-Token"
- ✅ Large numbers → Shows with K/M/B/T suffixes
- ✅ Invalid data → Shows "Invalid" instead of crashing

## Result

**Supply display now works correctly** for all token standards with proper formatting, fallback logic, and error handling. Users see meaningful supply information instead of "Not Set" errors.
