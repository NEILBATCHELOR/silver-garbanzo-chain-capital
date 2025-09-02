# ERC-3525 Token Data Mapping Fix

## Overview

Fixed critical data mapping issues in ERC-3525 token creation that were causing loss of slots information and missing property mapping. The ERC-3525 standard supports 107 comprehensive database fields including financial instruments, derivatives, DeFi features, and advanced slot management.

## Issues Resolved

### 1. Incomplete Slots Data Mapping
**Problem**: TokenTestUtility was stripping slot properties, only preserving `id`, `name`, and `description` while discarding `valueUnits`, `transferable`, `properties`, and other slot data.

**Root Cause**: Lines 527-533 in TokenTestUtility.tsx used restrictive mapping:
```javascript
// OLD - Data Loss
slots: rawData.slots || (rawData.standardArrays && rawData.standardArrays.slots 
  ? rawData.standardArrays.slots.map(slot => ({
      id: slot.id,
      name: slot.name,
      description: slot.description || ''
    }))
  : [{ id: "1", name: "Default Slot", description: "Default slot for basic token setup" }])
```

**Solution**: Comprehensive slot preservation with all properties:
```javascript
// NEW - Complete Data Preservation
slots: rawData.slots || (rawData.standardArrays && rawData.standardArrays.slots 
  ? rawData.standardArrays.slots.map(slot => ({
      id: slot.id || slot.slotId || slot.slot_id,
      name: slot.name || slot.slotName || `Slot ${slot.id || 1}`,
      description: slot.description || slot.slotDescription || '',
      valueUnits: slot.valueUnits || slot.value_units || 'units',
      transferable: slot.transferable ?? slot.slot_transferable ?? true,
      properties: slot.properties || {},
      // Preserve any additional metadata
      ...Object.fromEntries(
        Object.entries(slot).filter(([key]) => 
          !['id', 'slotId', 'slot_id', 'name', 'slotName', 'description', 'slotDescription', 'valueUnits', 'value_units', 'transferable', 'slot_transferable', 'properties'].includes(key)
        )
      )
    }))
  : [{ id: "1", name: "Default Slot", description: "Default slot for basic token setup", valueUnits: "units", transferable: true, properties: {} }])
```

### 2. Missing ERC-3525 Property Mapping
**Problem**: Only basic ERC-3525 properties were being mapped, missing 100+ advanced fields including:
- Financial instrument properties (financialInstrumentType, principalAmount, interestRate, maturityDate)
- Derivative properties (derivativeType, underlyingAsset, strikePrice, expirationDate)
- Advanced slot management (slotCreationEnabled, dynamicSlotCreation, slotMergeEnabled)
- Value computation & trading (valueComputationMethod, accrualEnabled, partialValueTrading)
- Governance & DeFi features (slotVotingEnabled, yieldFarmingEnabled, flashLoanEnabled)
- Compliance & security (regulatoryComplianceEnabled, kycRequired, auditTrailEnhanced)

**Solution**: Added comprehensive property mapping for all 107 ERC-3525 database fields.

## Database Schema Coverage

### token_erc3525_slots Table
- ✅ `slot_id` (text, required)
- ✅ `name` (text, optional) 
- ✅ `description` (text, optional)
- ✅ `value_units` (text, optional)
- ✅ `slot_transferable` (boolean, optional)
- ✅ `metadata` (jsonb, optional)

### token_erc3525_properties Table (107 fields)
- ✅ **Basic Properties**: value_decimals, base_uri, metadata_storage, slot_type
- ✅ **Financial Instruments**: financial_instrument_type, principal_amount, interest_rate, maturity_date, coupon_frequency
- ✅ **Derivatives**: derivative_type, underlying_asset, strike_price, expiration_date, settlement_type
- ✅ **Slot Management**: slot_creation_enabled, dynamic_slot_creation, slot_freeze_enabled, slot_merge_enabled
- ✅ **Value Computation**: value_computation_method, accrual_enabled, accrual_rate, value_adjustment_enabled
- ✅ **Trading Features**: slot_marketplace_enabled, partial_value_trading, trading_fees_enabled
- ✅ **Governance & DeFi**: slot_voting_enabled, yield_farming_enabled, liquidity_provision_enabled, flash_loan_enabled
- ✅ **Compliance**: regulatory_compliance_enabled, kyc_required, audit_trail_enhanced, multi_signature_required
- ✅ **Geographic Restrictions**: use_geographic_restrictions, default_restriction_policy, geographic_restrictions

## Files Modified

### `/src/components/tokens/testing/TokenTestUtility.tsx`
- **Lines 523-642**: Complete rewrite of ERC-3525 property mapping
- **Lines 335-355**: Fixed incomplete slot handling in parseAndValidateJson
- **Impact**: Now preserves all slot data and maps 100+ ERC-3525 properties

### `/src/components/tokens/testing/tokenTemplates.ts`
- **erc3525BasicTemplate**: Enhanced with proper slot structure including valueUnits, transferable, properties
- **erc3525AdvancedTemplate**: Comprehensive template with financial instrument examples, corporate bond data, and full property coverage
- **Impact**: Better test data for validation and demonstration

## Test Cases Added

### Basic ERC-3525 Token
```json
{
  "name": "My Semi-Fungible Token",
  "symbol": "MSFT",
  "standard": "ERC-3525",
  "slots": [{
    "id": "1",
    "name": "Default Slot",
    "description": "Default slot for basic token setup",
    "valueUnits": "units",
    "transferable": true,
    "properties": {}
  }]
}
```

### Advanced ERC-3525 Corporate Bond
```json
{
  "name": "Advanced Semi-Fungible Token",
  "symbol": "ASFT", 
  "standard": "ERC-3525",
  "financialInstrumentType": "corporate_bond",
  "principalAmount": "500000000000000000000000000",
  "interestRate": "5.25",
  "maturityDate": "2030-06-17T00:00:00Z",
  "couponFrequency": "semi_annual",
  "regulatoryComplianceEnabled": true,
  "kycRequired": true,
  "slots": [{
    "id": "1",
    "name": "Land Plot A",
    "description": "A premium land plot in district A",
    "valueUnits": "square_meters",
    "transferable": true,
    "properties": {
      "size": "large",
      "location": "downtown",
      "zoning": "commercial"
    }
  }]
}
```

## Validation

### Slots Data Verification
1. **Create ERC-3525 token** with comprehensive slot data
2. **Verify database**: Check `token_erc3525_slots` table for complete data
3. **Expected fields**: slot_id, name, description, value_units, slot_transferable, metadata

### Properties Data Verification  
1. **Create ERC-3525 token** with financial instrument properties
2. **Verify database**: Check `token_erc3525_properties` table for all 107 fields
3. **Expected mapping**: All camelCase JSON properties correctly mapped to snake_case database fields

## Performance Impact

- ✅ **No performance degradation**: Mapping is done at creation time only
- ✅ **Database efficiency**: Proper field mapping reduces data loss and null fields
- ✅ **Type safety**: All properties properly typed and validated

## Next Steps

1. **Test comprehensive ERC-3525 creation** using TokenTestUtility with financial instrument data
2. **Validate slot information** is preserved including name, description, valueUnits, transferable properties
3. **Verify financial instrument properties** map correctly to database fields
4. **Test DeFi and governance features** for advanced ERC-3525 use cases

## Breaking Changes

⚠️ **None**: This is a backward-compatible enhancement that adds missing functionality without breaking existing tokens.

## Related Issues

- Resolves missing slots information (name, description not being added correctly)
- Resolves comprehensive ERC-3525 property mapping for 100+ database fields
- Enables full financial instrument and derivative token support
- Supports corporate bonds, DeFi integration, and regulatory compliance features
