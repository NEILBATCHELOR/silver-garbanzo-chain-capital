# Investment Products Database Schema Implementation

This documentation outlines the implementation of a comprehensive database schema for managing various investment products and their lifecycle events. 

## Overview

The implementation is designed to handle 15 different types of investment products:

1. Structured Products
2. Equity
3. Commodities
4. Funds, ETFs, ETPs
5. Bonds
6. Quantitative Investment Strategies
7. Private Equity
8. Private Debt
9. Real Estate
10. Energy (including Solar and Wind Energy, Climate Receivables)
11. Infrastructure
12. Collectibles & Other Assets
13. Asset Backed or Invoice Receivables
14. Digital Tokenised Funds
15. Stablecoins (multiple types)

Each product type has specific fields categorized into:
- **Terms**: Contractual features, specifications, and characteristics
- **Lifecycle**: Events and stages the asset goes through (issuance, trading, redemption, etc.)

## Implementation Components

### 1. SQL Migration Script

The `20250816_product_fields_enhancement.sql` migration script:

- Creates new enum types for standardization
- Enhances existing product tables with additional fields
- Improves the lifecycle events table
- Adds enhanced stablecoin collateral tracking
- Creates performance indexes
- Adds documentation comments

### 2. TypeScript Interfaces

Enhanced TypeScript interfaces have been created in `enhancedProducts.ts` to provide type safety and documentation for all product fields, including:

- Base properties common across all products
- Product-specific fields
- Enhanced fields for more detailed product management
- Lifecycle event tracking
- Support for various collateral types for stablecoins

### 3. Integration with Existing Code

The enhanced product types have been integrated with the existing type system through:

- Updated exports in `index.ts`
- Maintaining compatibility with existing interfaces
- Supporting polymorphic operations through union types

## Database Schema Structure

The database follows a pattern where:

1. Each product type has its own dedicated table (e.g., `structured_products`, `equity_products`)
2. All tables share common fields like `id`, `project_id`, `created_at`, and `updated_at`
3. Product-specific fields are stored in their respective tables
4. The `product_lifecycle_events` table handles events across all product types

## Type System Architecture

The TypeScript interfaces follow a hierarchical structure:

1. `BaseProduct`: Common fields for all products
2. Product-specific interfaces: Fields specific to each product type
3. Enhanced interfaces: Extended versions with additional fields
4. Union types for polymorphic operations

## Field Categorization

Fields for each product type are categorized as:

- **Identification**: Unique identifiers, names, symbols
- **Terms**: Product specifications, features, rates, and contractual details
- **Lifecycle**: Dates, status, events, and history
- **Performance**: Metrics, values, and historical performance data
- **Risk**: Ratings, indicators, and risk management parameters

## Usage Examples

### Creating a New Product

```typescript
import { ProductServiceInterface, EnhancedStructuredProduct } from '../types/products';

// Example of creating a new structured product
const createStructuredProduct = async (
  productService: ProductServiceInterface<EnhancedStructuredProduct>,
  projectId: string
) => {
  const newProduct: Omit<EnhancedStructuredProduct, 'id' | 'createdAt' | 'updatedAt'> = {
    projectId,
    productName: "Capital Protected Note on S&P 500",
    issuer: "Investment Bank XYZ",
    underlyingAssets: ["S&P 500 Index"],
    payoffStructure: "capital_protected",
    barrierLevel: 80,
    couponRate: 4.5,
    protectionLevel: 100,
    currency: "USD",
    nominalAmount: 1000000,
    issueDate: new Date("2025-09-01"),
    maturityDate: new Date("2028-09-01"),
    status: "Active",
    // Enhanced fields
    targetAudience: "Conservative investors seeking capital protection",
    distributionStrategy: "Private placement through wealth management",
    riskRating: 3,
    complexFeatures: {
      participationRate: 65,
      airbagFeature: true
    }
  };
  
  return await productService.create(newProduct);
};
```

### Recording a Lifecycle Event

```typescript
import { LifecycleEventServiceInterface, CreateLifecycleEventRequest } from '../types/products';

// Example of recording a coupon payment event
const recordCouponPayment = async (
  lifecycleService: LifecycleEventServiceInterface,
  productId: string
) => {
  const event: CreateLifecycleEventRequest = {
    productId,
    productType: "structured_product",
    eventType: "Coupon_Payment",
    quantity: 45000, // $45,000 coupon payment
    actor: "System",
    details: "Regular coupon payment of 4.5% on nominal amount"
  };
  
  return await lifecycleService.createEvent(event);
};
```

## Further Considerations

1. **Migration Strategy**: Consider how to migrate existing data to take advantage of new fields
2. **UI Components**: Update UI components to display and edit enhanced fields
3. **Validation**: Implement server-side validation for the new fields
4. **Documentation**: Keep documentation updated as the system evolves
5. **Performance**: Monitor query performance as data volume grows

## Conclusion

This implementation provides a comprehensive and flexible foundation for managing diverse investment products throughout their lifecycle. The combination of detailed database schema and type-safe interfaces enables robust product management while maintaining extensibility for future enhancements.
