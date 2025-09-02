# ERC-1400 Security Token Configuration - Modular Architecture

## Overview

The ERC-1400 configuration system has been redesigned with a modular architecture that separates concerns and provides comprehensive coverage of all 119+ database fields for security tokens.

## Architecture

### Base + Sub-form Structure

Instead of a monolithic configuration file, the new architecture consists of:

1. **ERC1400BaseForm.tsx** - Common token fields (name, symbol, decimals, etc.)
2. **ERC1400PropertiesForm.tsx** - ERC-1400 specific compliance and features
3. **ERC1400PartitionsForm.tsx** - Multi-class token partition management
4. **ERC1400ControllersForm.tsx** - Controller permissions and access control
5. **ERC1400Config.tsx** - Main orchestrating component with tabs and validation

## Features

### Comprehensive Field Coverage

- **119 fields** from `token_erc1400_properties` table
- **Related tables**: partitions, controllers, documents, corporate actions, custody providers
- **Advanced features**: Institutional-grade compliance, cross-border trading, governance

### Modular Design Benefits

- **Separation of concerns** - Each form handles specific aspects
- **Maintainability** - Easy to update individual features
- **Reusability** - Components can be reused in different contexts
- **Progressive disclosure** - Tab-based interface with validation

### Validation System

- **Real-time validation** across all forms
- **Tab-level error indicators** with error counts
- **Completion tracking** with progress bar
- **Severity levels** (errors vs warnings)

## Database Integration

### Main Properties Table
- `token_erc1400_properties` (119 columns)
- Comprehensive institutional features
- Compliance and regulatory fields
- Advanced governance capabilities

### Related Tables
- `token_erc1400_partitions` - Multi-class token support
- `token_erc1400_controllers` - Access control and permissions
- `token_erc1400_documents` - Legal document management
- `token_erc1400_corporate_actions` - Corporate action workflows
- `token_erc1400_custody_providers` - Institutional custody integration

## Component Structure

```typescript
ERC1400Config (Main Orchestrator)
├── ERC1400BaseForm (Basic token details)
├── ERC1400PropertiesForm (Compliance & features)
├── ERC1400PartitionsForm (Multi-class management)
├── ERC1400ControllersForm (Access control)
└── Advanced Tab (Future expansion)
```

## Key Features by Form

### ERC1400BaseForm
- Token identity (name, symbol, decimals)
- Supply configuration (initial, cap)
- Security type and regulation type
- Issuing entity information
- Basic token features (mintable, burnable, pausable)

### ERC1400PropertiesForm
- **Compliance & KYC**: KYC requirements, whitelist, accreditation
- **Transfer Restrictions**: Holding periods, investor limits, geographic restrictions
- **Controller Features**: Forced transfers, redemption, granular control
- **Partition Features**: Multi-class support, transferability
- **Corporate Actions**: Dividend distribution, corporate action management
- **Document Management**: Legal documents, prospectus, terms

### ERC1400PartitionsForm
- **Partition Management**: Create/edit token classes
- **Partition Properties**: Voting rights, dividend rights, liquidation preference
- **Cross-partition Features**: Transfer rules between partitions
- **Comprehensive Metadata**: All partition-specific configuration

### ERC1400ControllersForm
- **Controller Management**: Add/remove controllers
- **Permission System**: Granular permission assignment
- **Risk Assessment**: Permission risk levels (high/medium/low)
- **Validation**: Address validation and permission coverage

## Usage

```typescript
import { ERC1400Config } from '@/components/tokens/config/max';

// Basic usage
<ERC1400Config
  tokenForm={tokenForm}
  handleInputChange={handleInputChange}
  setTokenForm={setTokenForm}
/>

// With callback
<ERC1400Config
  tokenForm={tokenForm}
  handleInputChange={handleInputChange}
  setTokenForm={setTokenForm}
  onConfigChange={(config) => console.log('Config updated:', config)}
  initialConfig={existingConfig}
/>
```

## Validation Rules

### Required Fields
- Token name, symbol, decimals, initial supply
- Security type and issuing entity information
- At least one controller with valid address
- Partition configuration (if multi-class enabled)

### Business Rules
- KYC enforcement typically requires whitelist
- Regulation A+ has 2000 investor limit
- Controllers need appropriate permissions
- Multi-class tokens require partitions

## Future Expansions

The modular architecture allows easy addition of:

1. **ERC1400DocumentsForm** - Advanced document management
2. **ERC1400CorporateActionsForm** - Corporate action workflows
3. **ERC1400CustodyProvidersForm** - Institutional custody integration
4. **ERC1400RegulatoryForm** - Enhanced regulatory compliance
5. **ERC1400GovernanceForm** - Advanced governance features

## Implementation Status

- ✅ **Base Form** - Complete with all basic token fields
- ✅ **Properties Form** - Complete with all compliance features
- ✅ **Partitions Form** - Complete with multi-class support
- ✅ **Controllers Form** - Complete with permission system
- ✅ **Main Config** - Complete with tabs and validation
- 🚧 **Advanced Features** - Placeholder for future expansion

## Benefits Over Previous Implementation

1. **Coverage**: 119 fields vs ~30 fields (300%+ increase)
2. **Maintainability**: Modular vs monolithic architecture
3. **UX**: Tab-based progressive disclosure vs single long form
4. **Validation**: Comprehensive real-time validation system
5. **Extensibility**: Easy to add new features and forms
6. **Type Safety**: Full TypeScript integration with database schema

This architecture provides a solid foundation for comprehensive ERC-1400 security token configuration while maintaining code quality and user experience standards.
