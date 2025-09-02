# Financial Products Lifecycle Management

## Overview

This implementation adds advanced lifecycle management features for all 15 financial product types in the application. The feature set includes:

1. **Lifecycle Event Visualization**
   - Timeline view of lifecycle events
   - Card-based view of events
   - Detail views for individual events

2. **Service Integration**
   - Complete CRUD operations for lifecycle events
   - Integration with product services
   - Analytics and reporting services

3. **Advanced Features**
   - Interactive analytics and charts
   - Report generation with export options
   - Advanced filtering and search capabilities

## Components

### Core Components

- **`ProductLifecycleManager`** - Main component for managing lifecycle events
- **`LifecycleTimeline`** - Timeline visualization for events
- **`LifecycleEventCard`** - Card component for displaying individual events
- **`LifecycleEventForm`** - Form for adding/editing events
- **`LifecycleAnalytics`** - Analytics and visualization component
- **`LifecycleReport`** - Report generation component

### Services

- **`ProductLifecycleService`** - Service for managing lifecycle events
- Integration with **`ProductFactoryService`** for product-specific operations

### Hooks

- **`useProductLifecycle`** - Custom hook for simplified lifecycle management

## Features

### Lifecycle Event Visualization

The implementation provides multiple ways to visualize lifecycle events:

1. **Timeline View**
   - Chronological display of events
   - Grouped by date
   - Visual indicators for event status
   - Interactive elements for event management

2. **Card View**
   - Grid display of event cards
   - Quick access to event details
   - Action buttons for editing/deleting events

### Analytics and Reporting

Advanced analytics features include:

1. **Event Distribution**
   - Pie charts showing event types and statuses
   - Interactive legends and tooltips

2. **Event Trends**
   - Line charts for event frequency over time
   - Bar charts for recent trends

3. **Value Changes**
   - Line charts for quantitative changes over time
   - Date range filtering

4. **Report Generation**
   - Multiple report types (summary, detailed, audit, etc.)
   - Export options (PDF, CSV)
   - Print and email functionality

## Usage

### Adding to Product Details

The lifecycle management is integrated into the `ProductDetails` component as a tab:

```jsx
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="lifecycle">Lifecycle Events</TabsTrigger>
    <TabsTrigger value="documents">Documents</TabsTrigger>
  </TabsList>
  
  <TabsContent value="lifecycle">
    <ProductLifecycleManager 
      productId={product.id}
      productType={projectType}
    />
  </TabsContent>
</Tabs>
```

### Creating Lifecycle Events

Events can be created using the lifecycle service:

```typescript
import { lifecycleService } from '@/services/products/productLifecycleService';
import { LifecycleEventType, ProjectType } from '@/types/products';

// Create a new event
await lifecycleService.createEvent({
  productId: 'product-id',
  productType: ProjectType.STRUCTURED_PRODUCTS,
  eventType: LifecycleEventType.COUPON_PAYMENT,
  quantity: 50000,
  actor: 'System',
  details: 'Regular coupon payment',
});
```

### Using the Hook

The custom hook simplifies lifecycle management:

```typescript
import { useProductLifecycle } from '@/hooks/products';

function MyComponent({ productId }) {
  const { 
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchAnalytics,
    analyticsData
  } = useProductLifecycle(productId);
  
  // Use the hook methods and data
}
```

## Technical Implementation

- Built using React and TypeScript
- Uses the shadcn/ui component library
- Recharts for data visualization
- Fully responsive design
- Follows project coding standards and naming conventions

## Future Enhancements

- Integration with blockchain for event verification
- Automated event generation based on product terms
- Notification system for upcoming lifecycle events
- More advanced reporting options
- Integration with external data sources
