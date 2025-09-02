# ERC-1155 Multi-Token Configuration System

## Overview

The ERC-1155 configuration system has been completely redesigned to provide comprehensive coverage of all database fields and supporting tables. This modular approach ensures maintainability, scalability, and complete database field coverage.

## Architecture

### Database Coverage
- **Main Table**: `token_erc1155_properties` (69 fields) - 100% coverage
- **Supporting Tables**: 6 tables with complete CRUD operations
  - `token_erc1155_types` - Token type definitions
  - `token_erc1155_crafting_recipes` - Gaming mechanics  
  - `token_erc1155_discount_tiers` - Pricing tiers
  - `token_erc1155_uri_mappings` - Metadata mapping
  - `token_erc1155_type_configs` - Type configurations
  - `token_erc1155_balances` - Balance tracking (future)

### Component Structure

```
ERC1155Config.tsx (Main Orchestrator)
├── ERC1155BaseForm.tsx (Core Properties - 69 fields)
├── ERC1155TypesForm.tsx (Token Types Management)
├── ERC1155PricingForm.tsx (Economics & Discount Tiers)
├── ERC1155GamingForm.tsx (Gaming & Crafting Recipes)
├── ERC1155TypeConfigsForm.tsx (Individual Type Settings)
└── ERC1155UriMappingsForm.tsx (URI Management)
```

## Components

### 1. ERC1155Config (Main Orchestrator)
**Purpose**: Coordinates all sub-forms and manages complete configuration state
**Features**:
- Tabbed interface with completion indicators
- Real-time validation and warnings
- Configuration overview with statistics
- Unified state management

### 2. ERC1155BaseForm (Core Properties)
**Database Table**: `token_erc1155_properties`
**Coverage**: All 69 fields organized by functionality
**Features**:
- Collection details (base_uri, metadata_storage)
- Advanced features (royalty, access control, permissions)
- Batch operations configuration
- Geographic restrictions
- Role-based access management

### 3. ERC1155TypesForm (Token Types)
**Database Table**: `token_erc1155_types`
**Features**:
- Token type CRUD operations
- Metadata management (JSON editor)
- Fungibility type selection
- Supply cap configuration
- Rich token type editor with validation

### 4. ERC1155PricingForm (Economics)
**Database Table**: `token_erc1155_discount_tiers`
**Features**:
- Multiple pricing models (fixed, dynamic, auction, bonding curve, free)
- Bulk discount tier management
- Referral reward system
- Lazy minting configuration
- Marketplace fee settings
- Airdrop and claim period management

### 5. ERC1155GamingForm (Gaming Mechanics)
**Database Table**: `token_erc1155_crafting_recipes`
**Features**:
- Gaming feature toggles (crafting, fusion, XP, leveling)
- Crafting recipe management with JSON input validation
- Governance and voting power configuration
- Cross-chain bridge support
- Layer 2 network integration

### 6. ERC1155TypeConfigsForm (Type Settings)
**Database Table**: `token_erc1155_type_configs`
**Features**:
- Individual token type configuration
- Rarity tier management
- Utility type classification
- Economic settings per type
- Transfer and trading permissions
- Crafting materials and burn rewards

### 7. ERC1155UriMappingsForm (URI Management)
**Database Table**: `token_erc1155_uri_mappings`
**Features**:
- Custom URI mappings per token type
- URI format validation (IPFS, Arweave, HTTPS, Data URI)
- URI preview and external link functionality
- Override base URI for specific token types

## Usage

### Basic Integration
```typescript
import { ERC1155Config } from '@/components/tokens/config/max';

function TokenCreationPage() {
  const [config, setConfig] = useState({});

  return (
    <ERC1155Config
      onConfigChange={setConfig}
      initialConfig={existingConfig}
    />
  );
}
```

### Advanced Integration with Form State
```typescript
import { ERC1155Config } from '@/components/tokens/config/max';

function TokenEditPage() {
  const [tokenForm, setTokenForm] = useState(initialTokenData);

  return (
    <ERC1155Config
      tokenForm={tokenForm}
      setTokenForm={setTokenForm}
      onConfigChange={(config) => {
        // Handle config changes
        console.log('Updated config:', config);
      }}
    />
  );
}
```

## Data Structure

### Complete Configuration Object
```typescript
interface ERC1155CompleteConfig {
  // Base Properties (69 fields from token_erc1155_properties)
  base_uri?: string;
  metadata_storage?: string;
  has_royalty?: boolean;
  royalty_percentage?: string;
  royalty_receiver?: string;
  is_burnable?: boolean;
  is_pausable?: boolean;
  access_control?: string;
  // ... all 69 fields
  
  // Related Table Data
  tokenTypes?: TokenType[];
  discountTiers?: DiscountTier[];
  craftingRecipes?: CraftingRecipe[];
  typeConfigs?: TypeConfig[];
  uriMappings?: UriMapping[];
}
```

### Token Type Structure
```typescript
interface TokenType {
  id: string;
  token_type_id: string;
  name?: string;
  description?: string;
  max_supply?: string;
  metadata?: any;
  fungibility_type?: string;
}
```

### Crafting Recipe Structure
```typescript
interface CraftingRecipe {
  id: string;
  recipe_name: string;
  input_tokens: any; // JSON: {"1": 2, "2": 1}
  output_token_type_id: string;
  output_quantity: number;
  success_rate: number;
  cooldown_period: number;
  required_level: number;
  is_active: boolean;
}
```

## Features

### Validation System
- Real-time validation with error highlighting
- Warning system for recommendations
- Completion indicators per tab
- Required field validation

### User Experience
- Progressive disclosure with accordion sections
- Tabbed interface for organized configuration
- Rich tooltips with detailed explanations
- Dialog-based editors for complex data
- JSON validation with format examples

### Developer Experience
- TypeScript interfaces for all data structures
- Comprehensive prop validation
- Modular component architecture
- Easy customization and extension

## Migration from Previous System

### Breaking Changes
- Component interface changed from simple props to comprehensive config object
- New tabbed interface replaces single-form approach
- Enhanced validation requirements

### Migration Steps
1. Update imports to use new component structure
2. Adapt configuration object to new interface
3. Handle new table data arrays in parent components
4. Update form submission logic for complete configuration

### Backward Compatibility
The new system maintains compatibility with existing token form patterns while providing enhanced functionality.

## Future Enhancements

### Planned Features
1. **Real-time Preview**: Live preview of token configuration
2. **Template System**: Pre-built configuration templates
3. **Import/Export**: Configuration import/export functionality
4. **Validation Rules**: Custom validation rule engine
5. **Integration Testing**: Component interaction testing

### Extensibility
The modular architecture allows for easy addition of new forms and features:
- Add new sub-forms by implementing the standard interface
- Extend validation system with custom rules
- Add new database table support following existing patterns

## Performance

### Optimization Features
- Lazy loading of complex components
- Debounced state updates
- Memoized validation calculations
- Efficient re-render patterns

### Bundle Size
- Tree-shakeable components
- Shared UI component library
- Minimal external dependencies

## Support

### Documentation
- Comprehensive inline documentation
- TypeScript interfaces for all components
- Example usage patterns

### Error Handling
- Graceful error boundaries
- User-friendly error messages
- Recovery mechanisms

This system provides a complete, maintainable, and user-friendly solution for ERC-1155 token configuration with full database coverage and advanced features.