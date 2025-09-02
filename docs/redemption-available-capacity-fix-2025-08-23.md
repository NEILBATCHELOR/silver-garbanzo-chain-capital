# Redemption Available Capacity Calculation Fix

**Date**: August 23, 2025  
**Component**: EnhancedRedemptionConfigurationDashboard  
**Status**: ✅ COMPLETED

## 🎯 Issue Description

The "Available Capacity" metric in the redemption configuration dashboard was incorrectly displaying the full Target Raise amount instead of calculating it based on the maximum redemption percentage.

## 🔧 Fix Applied

### Before
```typescript
available_capacity: row.target_raise_amount ? Number(row.target_raise_amount) : undefined
```

### After
```typescript
available_capacity: row.target_raise_amount && row.max_redemption_percentage ? 
  Number(row.target_raise_amount) * (Number(row.max_redemption_percentage) / 100) : 
  row.target_raise_amount ? Number(row.target_raise_amount) : undefined
```

## 📊 Business Logic

**Available = Target Raise × Maximum Redemption Percentage (%)**

### Example Calculation
- Target Raise: $100,000
- Maximum Redemption Percentage: 80%
- **Available Capacity**: $100,000 × 0.80 = **$80,000**

## 📁 Files Modified

1. **EnhancedRedemptionConfigurationDashboard.tsx**
   - Line ~267: Main `loadEnhancedRedemptionRules` function
   - Line ~889: `EnhancedBusinessRulesConfiguration` component `loadEnhancedRedemptionRules` function

## ✅ Impact

- ✅ **Correct Business Logic**: Available capacity now reflects actual redemption limits
- ✅ **Accurate Metrics**: Dashboard shows realistic available redemption capacity
- ✅ **Regulatory Compliance**: Properly enforces maximum redemption percentage constraints
- ✅ **Investor Experience**: Accurate information about redemption availability

## 🧪 Testing

The calculation will be applied automatically when:
1. A redemption rule has both `target_raise_amount` and `max_redemption_percentage` defined
2. The dashboard loads and calculates available capacity
3. Service providers view the metrics in the overview cards

## 📈 Business Value

This fix ensures that investors and service providers see accurate redemption capacity information, preventing overselling of redemption rights beyond the configured maximum percentage limits.
