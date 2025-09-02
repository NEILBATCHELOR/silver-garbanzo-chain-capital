# Quick Integration Guide: Remaining Enhanced Forms

## Overview
Complete the debug integration for the remaining 4 enhanced forms (ERC1155, ERC1400, ERC3525, ERC4626) using the established pattern.

## Integration Pattern (Copy-Paste Ready)

### 1. Add Debug Import
```typescript
// Add to imports section
import { 
  useEnhancedDebugLogger, 
  TokenDebugPanel,
  type EnhancedDebugLoggerOptions 
} from '../../debug';
```

### 2. Add enableDebug Prop
```typescript
interface FormProps {
  // ... existing props
  enableDebug?: boolean; // Add this prop
}
```

### 3. Initialize Debug Logger
```typescript
// Add after existing useState declarations
const debug = useEnhancedDebugLogger({
  standard: 'ERC-1155' as TokenStandard, // Change standard as needed
  configMode: configMode === TokenConfigMode.MIN ? 'min' : 'max',
  tokenId: token.id,
  enableFormTracking: enableDebug,
  enableServiceTracking: enableDebug,
  enableDatabaseTracking: enableDebug,
  enableFieldValidation: enableDebug
});

const [showDebugPanel, setShowDebugPanel] = useState(false);
```

### 4. Add Form Initialization Tracking
```typescript
// Add after other useEffect hooks
useEffect(() => {
  if (enableDebug) {
    debug.startOperation('FORM_INIT', {
      tokenId: token.id,
      configMode,
      formType: 'enhanced_edit', // Update as needed
      useAdvancedConfig
    });

    debug.trackFieldChange('formData', {}, formData, 'initialization');
  }
}, []);
```

### 5. Enhance Field Change Handler
```typescript
const handleFieldChange = (field: string, value: any) => {
  const oldValue = formData[field as keyof FormDataType];
  
  // Debug: Track field change
  if (enableDebug) {
    debug.trackFieldChange(field, oldValue, value, 'input');
    debug.trackStandardField(field, oldValue, value, configMode === TokenConfigMode.MIN ? 'min' : 'max');
  }

  setFormData(prev => ({
    ...prev,
    [field]: value
  }));
};
```

### 6. Enhance Validation Tracking
```typescript
useEffect(() => {
  if (!validationPaused) {
    if (enableDebug) {
      debug.trackValidation('form', true, [], 'onChange');
    }

    // ... existing validation logic

    if (!validation.isValid) {
      // ... existing error handling
      
      // Debug: Track validation errors
      if (enableDebug) {
        Object.entries(fieldErrors).forEach(([field, error]) => {
          debug.trackValidation(field, false, [error], 'onChange');
        });
      }
    } else {
      // Debug: Track validation success
      if (enableDebug) {
        debug.trackValidation('form', true, [], 'onChange');
      }
    }
  }
}, [formData, validationPaused, enableDebug, debug]);
```

### 7. Enhance Form Submission
```typescript
const handleSubmit = async () => {
  setIsLoading(true);
  
  // Debug: Start operation tracking
  const operationId = enableDebug ? debug.startOperation('UPDATE_TOKEN', {
    standard: 'ERC-1155', // Update standard
    configMode,
    formType: 'enhanced_edit'
  }) : '';
  
  try {
    // Debug: Track form submission
    if (enableDebug) {
      debug.trackFormSubmission(formData, errors);
    }

    // ... existing validation and submission logic

    if (enableDebug) {
      result = await debug.trackDatabaseOperation(
        'token_properties', // Update table name
        'UPDATE_TOKEN_WITH_PROPERTIES',
        () => service.updateTokenWithProperties(token.id, {}, formData)
      );
    } else {
      result = await service.updateTokenWithProperties(token.id, {}, formData);
    }

    if (result.success && result.data) {
      // Debug: Track success
      if (enableDebug) {
        debug.endOperation(operationId, true);
      }
      
      await onSave(result.data);
    } else {
      const errorMessage = result.errors ? result.errors.join(', ') : result.error || 'Failed to save token';
      
      // Debug: Track error
      if (enableDebug) {
        debug.endOperation(operationId, false, errorMessage);
      }
      
      setErrors({ general: errorMessage });
    }
  } catch (error: any) {
    const errorMessage = error.message || 'An unexpected error occurred';
    
    // Debug: Track error
    if (enableDebug) {
      debug.endOperation(operationId, false, errorMessage);
    }
    
    setErrors({ general: errorMessage });
  } finally {
    setIsLoading(false);
  }
};
```

### 8. Add Debug Controls to Header
```typescript
{/* In CardHeader */}
<div className="flex items-center justify-between">
  <div>
    <CardTitle className="flex items-center gap-2">
      Enhanced ERC-1155 Token Configuration {/* Update title */}
      <Badge variant={useAdvancedConfig ? "default" : "secondary"}>
        {useAdvancedConfig ? "Advanced" : "Basic"} Mode
      </Badge>
      {enableDebug && (
        <Badge variant="outline" className="border-blue-500 text-blue-700">
          <Bug className="h-3 w-3 mr-1" />
          Debug Mode
        </Badge>
      )}
    </CardTitle>
    <CardDescription>
      Configure your token with advanced features {/* Update description */}
    </CardDescription>
  </div>
  
  {/* Debug Controls */}
  {enableDebug && (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDebugPanel(!showDebugPanel)}
      >
        <Bug className="h-4 w-4 mr-1" />
        {showDebugPanel ? 'Hide' : 'Show'} Debug
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => debug.downloadDebugLogs()}
      >
        Download Logs
      </Button>
    </div>
  )}
</div>
```

### 9. Add Debug Panel
```typescript
{/* Add after header */}
{enableDebug && showDebugPanel && (
  <TokenDebugPanel
    tokenId={token.id}
    standard="ERC-1155" // Update standard
    isVisible={showDebugPanel}
    onClose={() => setShowDebugPanel(false)}
    position="bottom"
  />
)}
```

### 10. Add Debug Metrics Summary
```typescript
{/* Add after progress indicator */}
{enableDebug && (
  <Card className="border-blue-200 bg-blue-50">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm text-blue-800">Debug Metrics</CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-blue-600">Field Changes:</span>
          <span className="ml-2 font-semibold">{debug.getMetrics().formSession.fieldChanges}</span>
        </div>
        <div>
          <span className="text-blue-600">Validation Errors:</span>
          <span className="ml-2 font-semibold">{debug.getMetrics().formSession.validationErrors}</span>
        </div>
        <div>
          <span className="text-blue-600">DB Operations:</span>
          <span className="ml-2 font-semibold">{debug.getMetrics().databaseOperations.total}</span>
        </div>
        <div>
          <span className="text-blue-600">Session Duration:</span>
          <span className="ml-2 font-semibold">{Math.round(debug.getMetrics().formSession.duration / 1000)}s</span>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

## Standard-Specific Customizations

### ERC1155 (Multi-Token)
- Track token type additions/removals
- Monitor collection-level changes
- Debug batch operations

### ERC1400 (Security Token)  
- Track regulatory compliance changes
- Monitor partition modifications
- Debug document management

### ERC3525 (Semi-Fungible)
- Track slot definitions
- Monitor value allocations
- Debug slot-specific operations

### ERC4626 (Tokenized Vault)
- Track strategy configurations
- Monitor fee structure changes
- Debug vault parameters

## Quick Implementation Checklist

For each enhanced form:
- [ ] Add debug imports
- [ ] Add enableDebug prop
- [ ] Initialize debug logger
- [ ] Add form initialization tracking
- [ ] Enhance field change handler
- [ ] Enhance validation tracking
- [ ] Enhance form submission
- [ ] Add debug controls to header
- [ ] Add debug panel
- [ ] Add debug metrics summary
- [ ] Test debug functionality

## Testing Each Integration

```typescript
// Enable debug mode
window.__enableTokenDebug();

// Test form interactions
// 1. Fill out form fields
// 2. Trigger validation
// 3. Submit form
// 4. Check console for debug logs
// 5. Use debug panel
// 6. Download debug logs
```

## Estimated Time Per Form
- **ERC1155EditForm.tsx**: 15 minutes (collection-specific features)
- **ERC1400EditForm.tsx**: 15 minutes (compliance-specific features)  
- **ERC3525EditForm.tsx**: 10 minutes (standard features)
- **ERC4626EditForm.tsx**: 10 minutes (standard features)

**Total remaining time: ~50 minutes for complete coverage**

## Benefits After Completion
- 100% debug coverage across all token standards
- Consistent debugging experience
- Complete form analytics and monitoring
- Production-ready debugging infrastructure
