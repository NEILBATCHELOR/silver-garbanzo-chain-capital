# ERC-4626 Vault Token Forms Refactor

## Overview

This document outlines the comprehensive refactor of ERC-4626 (Vault Token) configuration forms, implementing a modular approach with a base form and dedicated sub-forms for each related database table.

## Architecture

### Database Schema Coverage

The new forms provide complete coverage of the ERC-4626 database schema:

**Main Table:**
- `token_erc4626_properties` (110 columns)

**Related Tables:**
- `token_erc4626_vault_strategies` (16 columns)
- `token_erc4626_asset_allocations` (9 columns) 
- `token_erc4626_fee_tiers` (12 columns)
- `token_erc4626_performance_metrics` (14 columns)
- `token_erc4626_strategy_params` (10 columns)

### File Structure

```
src/components/tokens/config/max/
├── ERC4626Config.tsx              # Main configuration orchestrator
├── ERC4626BaseForm.tsx            # Base vault configuration form
├── ERC4626VaultStrategiesForm.tsx # Investment strategies management
├── ERC4626AssetAllocationsForm.tsx # Asset allocation configuration  
├── ERC4626FeeTiersForm.tsx        # Fee tier structure setup
├── ERC4626PerformanceMetricsForm.tsx # Performance tracking & metrics
└── ERC4626StrategyParamsForm.tsx  # Custom strategy parameters
```

## Component Details

### 1. ERC4626Config.tsx (Main Orchestrator)

**Purpose:** Coordinates all sub-forms and provides comprehensive vault configuration

**Features:**
- Accordion-based organization for optimal UX
- Configuration summary with live statistics
- Feature toggle management for 25+ advanced features
- Complete integration with all sub-forms
- Real-time validation and state management

**Key Sections:**
- Base Vault Configuration
- Investment Strategies  
- Asset Allocations
- Fee Structure & Tiers
- Performance Tracking
- Strategy Parameters
- Advanced Features (DeFi, Analytics, Institutional)

### 2. ERC4626BaseForm.tsx

**Purpose:** Core vault configuration including asset details, strategy setup, access control, and risk management

**Key Features:**
- Underlying asset configuration (address, name, symbol, decimals)
- Vault type and strategy selection (8 types, 6 strategies)
- Access control settings (5 control types)
- Security features (mintable, burnable, pausable, permit, flash loans)
- Deposit/withdrawal limits configuration
- Risk management settings with insurance options

**Field Coverage:** 50+ core properties from token_erc4626_properties

### 3. ERC4626VaultStrategiesForm.tsx

**Purpose:** Management of multiple investment strategies for the vault

**Key Features:**
- Add/remove investment strategies dynamically
- Strategy configuration (name, type, protocol, allocations)
- Risk scoring (1-10 scale)
- APY tracking (expected vs actual)
- Allocation validation (ensures total ≤ 100%)
- Strategy status management (active/inactive)

**Strategy Types Supported:**
- Yield Farming, Lending, Staking, Liquidity Provision
- Arbitrage, Delta Neutral, Leveraged Farming
- Options Strategy, Perpetual Trading, Cross Chain

### 4. ERC4626AssetAllocationsForm.tsx

**Purpose:** Define how vault assets are distributed across different assets and protocols

**Key Features:**
- Asset selection with common tokens (USDC, USDT, DAI, WETH, etc.)
- Protocol selection (15+ DeFi protocols supported)
- Percentage allocation with validation
- Expected APY tracking
- Weighted average APY calculation
- Asset breakdown visualization

### 5. ERC4626FeeTiersForm.tsx

**Purpose:** Configure tiered fee structures based on user balance

**Key Features:**
- Multiple fee tiers with balance ranges
- Four fee types: Management, Performance, Deposit, Withdrawal
- Tier benefits configuration (custom key-value pairs)
- Range validation to prevent overlaps
- Active/inactive tier management
- Comprehensive tier summary

### 6. ERC4626PerformanceMetricsForm.tsx

**Purpose:** Performance tracking configuration and manual metrics entry

**Key Features:**
- Automated tracking toggle
- Benchmark comparison (12+ benchmark options)
- Manual metrics entry with validation
- Performance indicators (APY, Sharpe ratio, volatility, drawdown)
- Flow tracking (deposits, withdrawals, net flow)
- History retention settings
- Real-time performance indicators

### 7. ERC4626StrategyParamsForm.tsx

**Purpose:** Custom parameter configuration for vault strategies

**Key Features:**
- 8 parameter types supported (string, number, percentage, address, boolean, duration, URL, JSON)
- Parameter validation based on type
- Required/optional parameter designation
- Preset common parameters (slippage, rebalance threshold, leverage, etc.)
- Type filtering and organization
- Visual parameter type indicators

## Advanced Features Integration

The forms support 25+ advanced features organized by category:

### Yield Optimization
- Yield optimization enabled
- Automated rebalancing
- Auto compounding

### DeFi Integration  
- Liquidity mining
- Market making
- Arbitrage
- Cross-DEX optimization
- Impermanent loss protection
- Cross-chain yield

### Lending & Leverage
- Lending protocol integration
- Borrowing capabilities
- Leverage support

### Analytics & Reporting
- Portfolio analytics
- Real-time P&L tracking
- Tax reporting
- Automated reporting

### Institutional Features
- Institutional grade compliance
- Custody integration
- Comprehensive audit trails
- Compliance reporting
- Fund administration
- Third-party audits

### User Experience
- Notification systems
- Mobile app integration
- Social trading features

## Technical Implementation

### Type Safety
- Full TypeScript integration with `TokenERC4626Properties` interface
- Comprehensive prop interfaces for all sub-forms
- Type-safe state management and validation

### Validation
- Real-time validation for all form fields
- Type-specific validation (addresses, percentages, etc.)
- Cross-form validation (allocation totals, tier ranges)
- Visual error indicators and helpful error messages

### State Management
- Centralized state in main config component
- Efficient change propagation to parent forms
- Local state optimization for performance

### User Experience
- Accordion-based progressive disclosure
- Live statistics and summaries
- Helpful tooltips and guidance
- Visual indicators for validation states
- Preset configurations for quick setup

## Integration Points

### With Existing System
- Seamless integration with `CreateTokenPage.tsx`
- Compatible with existing token form structure
- Maintains consistency with other token standard forms
- Supports both basic and advanced configuration modes

### Database Integration
- Direct mapping to all database tables and columns
- Support for complex data types (JSONB, arrays)
- Proper handling of relationships between tables

### Export Structure
```typescript
// Available exports from max config
export { default as ERC4626Config } from './ERC4626Config';
export { default as ERC4626DetailedConfig } from './ERC4626Config'; // Alias
export { default as ERC4626BaseForm } from './ERC4626BaseForm';
export { default as ERC4626VaultStrategiesForm } from './ERC4626VaultStrategiesForm';
export { default as ERC4626AssetAllocationsForm } from './ERC4626AssetAllocationsForm';
export { default as ERC4626FeeTiersForm } from './ERC4626FeeTiersForm';
export { default as ERC4626PerformanceMetricsForm } from './ERC4626PerformanceMetricsForm';
export { default as ERC4626StrategyParamsForm } from './ERC4626StrategyParamsForm';
```

## Benefits

### For Developers
- Modular, maintainable code structure
- Type-safe development experience
- Clear separation of concerns
- Easy to extend and modify

### For Users
- Comprehensive vault configuration options
- Intuitive, progressive disclosure interface
- Real-time validation and feedback
- Professional-grade feature set

### For the Platform
- Complete database schema coverage
- Institutional-grade vault capabilities
- Competitive feature parity with leading DeFi protocols
- Foundation for advanced vault strategies

## Future Enhancements

1. **Strategy Templates:** Pre-configured strategy combinations for common vault types
2. **Live Data Integration:** Real-time APY and performance data from protocols
3. **Strategy Simulation:** Backtesting and simulation capabilities
4. **Advanced Analytics:** Enhanced performance visualization and analysis
5. **Multi-chain Support:** Cross-chain vault strategies and asset management

## Conclusion

The ERC-4626 forms refactor provides a comprehensive, modular, and user-friendly interface for configuring advanced vault tokens. With complete database schema coverage and professional-grade features, it positions the platform as a leader in tokenized vault solutions.
