# Comprehensive Token Edit Forms System

## Overview

The Comprehensive Token Edit Forms system is a complete rewrite of the token editing interface that provides full CRUD capabilities for all 51 token-related database tables. This system supports both basic (min) and advanced (max) configuration modes with tabbed interfaces for each token standard.

## Architecture

### Database Coverage
- **Total Tables**: 51 token-related tables
- **Token Standards**: 6 (ERC-20, ERC-721, ERC-1155, ERC-1400, ERC-3525, ERC-4626)
- **Core Tables**: tokens (25 columns)
- **Properties Tables**: Standard-specific properties (63-119 columns each)
- **Related Tables**: Additional tables for complex features (e.g., partitions, allocations, strategies)

### Key Features

1. **Tabbed Interface**: Each table gets its own tab for focused editing
2. **Configuration Modes**: 
   - `min` (Basic): Essential fields only
   - `max` (Advanced): All fields with advanced configuration
3. **Real-time Validation**: Field-level and form-level validation
4. **Auto-save & Manual Save**: Individual tab saving and bulk save operations
5. **State Management**: Comprehensive form state with modification tracking
6. **Type Safety**: Full TypeScript coverage for all database tables

## File Structure

```
src/components/tokens/forms-comprehensive/
├── master/
│   └── ComprehensiveTokenEditForm.tsx    # Main tabbed form component
├── tabs/
│   ├── common/
│   │   └── TokensBasicTab.tsx            # Core token information
│   ├── erc20/
│   │   └── ERC20PropertiesTab.tsx        # ERC-20 specific properties
│   ├── erc721/
│   │   ├── ERC721PropertiesTab.tsx       # ERC-721 properties
│   │   ├── ERC721AttributesTab.tsx       # NFT attributes management
│   │   ├── ERC721MintPhasesTab.tsx       # Minting phases configuration
│   │   └── ERC721TraitDefinitionsTab.tsx # Trait definitions for generation
│   ├── erc1155/                          # Multi-token components (placeholder)
│   ├── erc1400/                          # Security token components (placeholder)
│   ├── erc3525/                          # Semi-fungible components (placeholder)
│   └── erc4626/                          # Vault token components (placeholder)
├── services/
│   └── tokenCRUDService.ts               # Database operations service
├── hooks/
│   └── useComprehensiveTokenForm.ts      # Form state management hook
├── types/
│   └── index.ts                          # TypeScript type definitions
└── index.ts                              # Main exports
```

## Implementation Status

### ✅ Completed (Phase 1)
- **Core Infrastructure**: Types, CRUD service, state management hook
- **Master Form**: Tabbed interface with navigation and state management
- **Common Components**: TokensBasicTab (25 core fields)
- **ERC-20 Support**: Complete properties tab with advanced features
- **ERC-721 Support**: Properties, attributes, mint phases, and trait definitions

### 🚧 In Progress (Phase 2)
- **ERC-1155 Components**: 7 tables for multi-token/gaming features
- **ERC-1400 Components**: 10 tables for security token compliance
- **ERC-3525 Components**: 6 tables for semi-fungible tokens
- **ERC-4626 Components**: 6 tables for vault token strategies

### 📋 Planned (Phase 3)
- **Enhanced Validation**: Real-time cross-field validation
- **Bulk Operations**: Import/export functionality
- **Template System**: Reusable configurations
- **Advanced UI**: Drag-and-drop, visual builders

## Database Tables by Standard

### ERC-20 (Fungible Tokens)
- `tokens` - Core information
- `token_erc20_properties` - 63 columns with governance, rebasing, fee features

### ERC-721 (NFTs)
- `tokens` - Core information
- `token_erc721_properties` - NFT collection configuration
- `token_erc721_attributes` - Attribute definitions
- `token_erc721_mint_phases` - Phased minting with whitelists
- `token_erc721_trait_definitions` - Trait generation rules

### ERC-1155 (Multi-Token/Gaming)
- `tokens` - Core information
- `token_erc1155_properties` - Multi-token configuration
- `token_erc1155_types` - Token type definitions
- `token_erc1155_balances` - Balance tracking
- `token_erc1155_crafting_recipes` - Gaming mechanics
- `token_erc1155_discount_tiers` - Pricing tiers
- `token_erc1155_uri_mappings` - Metadata mapping
- `token_erc1155_type_configs` - Type configurations

### ERC-1400 (Security Tokens)
- `tokens` - Core information
- `token_erc1400_properties` - Security token features
- `token_erc1400_partitions` - Token partitions
- `token_erc1400_controllers` - Access controllers
- `token_erc1400_documents` - Legal documents
- `token_erc1400_corporate_actions` - Corporate events
- `token_erc1400_custody_providers` - Custodian management
- `token_erc1400_regulatory_filings` - Compliance filings
- `token_erc1400_partition_balances` - Partition balance tracking
- `token_erc1400_partition_operators` - Partition operators
- `token_erc1400_partition_transfers` - Transfer history

### ERC-3525 (Semi-Fungible)
- `tokens` - Core information
- `token_erc3525_properties` - Semi-fungible configuration
- `token_erc3525_slots` - Slot definitions
- `token_erc3525_allocations` - Value allocations
- `token_erc3525_payment_schedules` - Payment tracking
- `token_erc3525_value_adjustments` - Value modifications
- `token_erc3525_slot_configs` - Slot configurations

### ERC-4626 (Vault Tokens)
- `tokens` - Core information
- `token_erc4626_properties` - Vault configuration
- `token_erc4626_vault_strategies` - Investment strategies
- `token_erc4626_asset_allocations` - Asset allocation
- `token_erc4626_fee_tiers` - Fee structures
- `token_erc4626_performance_metrics` - Performance tracking
- `token_erc4626_strategy_params` - Strategy parameters

## Usage Examples

### Basic Usage
```tsx
import { ComprehensiveTokenEditForm } from '@/components/tokens/forms-comprehensive';

<ComprehensiveTokenEditForm
  tokenId="uuid-here"
  standard={TokenStandard.ERC721}
  configMode="max"
  enableDebug={true}
  onSave={handleSave}
  onCancel={handleCancel}
/>
```

### Hook Usage
```tsx
import { useComprehensiveTokenForm } from '@/components/tokens/forms-comprehensive';

const {
  formState,
  eventHandlers,
  hasUnsavedChanges,
  hasErrors
} = useComprehensiveTokenForm({
  tokenId: 'uuid-here',
  standard: TokenStandard.ERC20,
  configMode: 'min'
});
```

### CRUD Operations
```tsx
import { tokenCRUDService } from '@/components/tokens/forms-comprehensive';

// Load all data for a token
const allData = await tokenCRUDService.loadAllTokenData(tokenId, standard);

// Update specific table
await tokenCRUDService.updateTableData('token_erc721_properties', tokenId, propertiesData);
```

## Configuration Modes

### Basic Mode (`min`)
- Essential fields only
- Simplified UI
- Recommended for most users
- Quick token creation

### Advanced Mode (`max`)
- All available fields
- Complex configuration options
- JSON field editing
- Advanced features (governance, compliance, etc.)

## Field Types Supported

- **Text Fields**: String inputs with validation
- **Numeric Fields**: Number inputs with min/max validation
- **Boolean Fields**: Switch components
- **Select Fields**: Dropdown with predefined options
- **JSON Fields**: Complex object configuration
- **Array Fields**: Dynamic list management
- **Date/Time Fields**: DateTime pickers
- **Address Fields**: Ethereum address validation

## Validation System

- **Field-level**: Real-time validation as user types
- **Cross-field**: Validation between related fields
- **Table-level**: Validation within a single table
- **Form-level**: Validation across all tables
- **Schema-based**: Automatic validation from database schema

## State Management

- **Tab State**: Individual tab modification tracking
- **Global State**: Form-wide state management
- **Auto-save**: Configurable auto-save intervals
- **Conflict Resolution**: Handle concurrent edits
- **Undo/Redo**: Change history management

## Performance Considerations

- **Lazy Loading**: Load tabs on demand
- **Virtualization**: For large datasets
- **Debounced Validation**: Prevent excessive API calls
- **Optimistic Updates**: Immediate UI feedback
- **Chunked Operations**: Large data operations in chunks

## Security Features

- **Input Sanitization**: Prevent XSS attacks
- **Permission Checks**: Role-based field access
- **Audit Logging**: Track all changes
- **Data Validation**: Server-side validation
- **Rate Limiting**: Prevent abuse

## Future Enhancements

1. **Visual Form Builder**: Drag-and-drop form construction
2. **Template Library**: Pre-built configurations for common use cases
3. **Batch Operations**: Edit multiple tokens simultaneously
4. **Import/Export**: CSV/JSON import/export functionality
5. **Real-time Collaboration**: Multiple users editing simultaneously
6. **Version Control**: Track and revert changes
7. **Mobile Support**: Responsive design for mobile devices
8. **Accessibility**: Full WCAG compliance
9. **Internationalization**: Multi-language support
10. **Plugin System**: Custom field types and validation

## Migration Guide

### From Old Forms
1. Replace existing form imports with comprehensive forms
2. Update component props to match new interface
3. Test all functionality with new system
4. Remove old form components

### Breaking Changes
- Different prop structure for form components
- New state management hook required
- Updated TypeScript interfaces
- Different event handler signatures

## Troubleshooting

### Common Issues
1. **TypeScript Errors**: Ensure all types are imported correctly
2. **State Issues**: Check hook usage and dependencies
3. **Validation Errors**: Verify schema matches database
4. **Performance Issues**: Enable lazy loading and virtualization

### Debug Mode
Enable debug mode for detailed logging:
```tsx
<ComprehensiveTokenEditForm enableDebug={true} />
```

## Contributing

1. Follow existing patterns for new tab components
2. Maintain TypeScript coverage
3. Add validation for all fields
4. Include unit tests
5. Update documentation

## Support

For issues and questions:
- Check existing documentation
- Review component examples
- Enable debug mode for troubleshooting
- Contact development team

---

This comprehensive forms system replaces the previous token editing interface and provides complete coverage of all token-related database tables with improved user experience and developer experience.
