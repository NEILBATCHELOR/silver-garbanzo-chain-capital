# ERC-20 Token Form Refactoring

## Overview
Refactored the ERC-20 token configuration forms to improve maintainability and follow domain separation principles. Split the large monolithic `ERC20Config.tsx` (946+ lines) into modular components.

## New Structure

### Max Configuration (Advanced Mode)
- **ERC20BaseForm.tsx** - Core token fields from main `tokens` table (name, symbol, decimals, total_supply, description)
- **ERC20PropertiesForm.tsx** - All 59 ERC-20 specific properties from `token_erc20_properties` table
- **ERC20Config.tsx** - Main component that combines both forms

### Min Configuration (Basic Mode)
- **ERC20Config.tsx** - Simplified configuration with essential fields only (existing file, unchanged)

## Database Field Coverage

### Base Fields (tokens table)
- name (required)
- symbol (required) 
- decimals (required, default: 18)
- total_supply (optional)
- description (optional)
- standard (automatically set to 'ERC-20')

### Properties Fields (token_erc20_properties table)
All 59 fields organized into logical sections:

1. **Supply Management** (7 fields)
   - initial_supply, cap, max_total_supply, is_mintable, is_burnable, is_pausable

2. **Access Control** (5 fields)
   - token_type, access_control, pausable_by, mintable_by, burnable_by

3. **Advanced Features** (3 fields)
   - allow_management, permit, snapshot

4. **Anti-Whale Protection** (3 fields)
   - anti_whale_enabled, max_wallet_amount, cooldown_period

5. **DeFi Fee System** (6 fields)
   - buy_fee_enabled, sell_fee_enabled, liquidity_fee_percentage, marketing_fee_percentage, charity_fee_percentage, auto_liquidity_enabled

6. **Tokenomics** (8 fields)
   - reflection_enabled, reflection_percentage, deflation_enabled, deflation_rate, burn_on_transfer, burn_percentage, staking_enabled, staking_rewards_rate, lottery_enabled, lottery_percentage

7. **Trading Controls** (2 fields)
   - blacklist_enabled, trading_start_time

8. **Presale** (4 fields)
   - presale_enabled, presale_rate, presale_start_time, presale_end_time

9. **Vesting** (4 fields)
   - vesting_enabled, vesting_cliff_period, vesting_total_period, vesting_release_frequency

10. **Geographic Restrictions** (2 fields)
    - use_geographic_restrictions, default_restriction_policy

11. **Governance** (7 fields)
    - governance_enabled, quorum_percentage, proposal_threshold, voting_delay, voting_period, timelock_delay, governance_token_address

12. **JSONB Configuration Objects** (7 fields)
    - fee_on_transfer, rebasing, governance_features, transfer_config, gas_config, compliance_config, whitelist_config

## Benefits

1. **Maintainability** - Smaller, focused files under 400 lines each
2. **Domain Separation** - Clear separation between base token fields and ERC-20 specific properties
3. **Reusability** - Base form can be reused for other token standards
4. **Database Alignment** - Direct mapping to database table structure
5. **Type Safety** - Proper TypeScript interfaces for each component
6. **User Experience** - Organized sections with progressive disclosure using accordions

## File Changes

### Created
- `/src/components/tokens/config/max/ERC20BaseForm.tsx` (67 lines)
- `/src/components/tokens/config/max/ERC20PropertiesForm.tsx` (394 lines)
- `/src/components/tokens/config/max/index.ts` (updated exports)

### Modified
- `/src/components/tokens/config/max/ERC20Config.tsx` - Replaced with modular component that combines base and properties forms (45 lines)

### Backup
- `/src/components/tokens/config/max/ERC20Config.backup.tsx` - Original 946-line file preserved

## Usage

The forms maintain the same external API for backward compatibility:

```typescript
<ERC20Config
  tokenForm={tokenForm}
  handleInputChange={handleInputChange}
  setTokenForm={setTokenForm}
  onConfigChange={onConfigChange}
/>
```

Individual forms can also be used standalone:

```typescript
<ERC20BaseForm tokenForm={tokenForm} onInputChange={handleInputChange} />
<ERC20PropertiesForm tokenForm={tokenForm} onInputChange={handleInputChange} />
```

## Next Steps

This refactoring approach can be applied to other token standards:
- ERC-721 (84 properties fields)
- ERC-1155 (69 properties fields)  
- ERC-3525 (107 properties fields)
- ERC-1400 (119 properties fields)
- ERC-4626 (110 properties fields)

Each would follow the same pattern:
- BaseForm (core tokens table fields)
- PropertiesForm (standard-specific properties table fields)
- Main config component combining both