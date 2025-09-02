# Quick Start: Token Debug System Usage

## Enable Debug Mode

### Method 1: Browser Console (Recommended for Testing)
```javascript
// Enable debug logging with all features
window.__enableTokenDebug();

// Disable debug logging
window.__disableTokenDebug();
```

### Method 2: Application Configuration (Development)
Add to your `main.tsx` or `App.tsx`:

```typescript
import { initializeDebugLogging } from '@/components/tokens/debug';

// Enable in development
if (import.meta.env.DEV) {
  initializeDebugLogging({
    enabled: true,
    logLevel: 'debug',
    features: {
      fieldTracking: true,
      validationLogging: true, 
      databaseLogging: true,
      performanceLogging: true,
      userActionLogging: true
    },
    output: {
      console: true,
      localStorage: true,
      downloadable: true
    }
  });
}
```

## Using Debug Features

### 1. Token Creation Page
1. Enable debug mode (see above)
2. Navigate to `/tokens/create`
3. Debug controls appear in "Configure" and "Review" steps
4. Click "Debug" button to open debug panel
5. Watch real-time logs in browser console
6. Download logs from success dialog

### 2. Token Edit Form
```typescript
<TokenEditForm
  token={tokenData}
  onChange={handleChange}
  onSave={handleSave}
  enableDebug={true}
  standard={TokenStandard.ERC20}
  configMode="max"
/>
```

### 3. Debug Panel
- **Position Options**: Bottom, Right, or Floating
- **Real-time Metrics**: Field changes, validation errors, DB operations
- **Log Filtering**: Filter by log level (ERROR, WARN, INFO, DEBUG, TRACE)
- **Export Options**: Download JSON or CSV logs

## What Gets Tracked

- ✅ **Field Changes**: Every form input with before/after values
- ✅ **Validation**: Success/failure with detailed error messages  
- ✅ **Database Operations**: Insert/update operations with timing
- ✅ **User Actions**: Clicks, selections, form submissions
- ✅ **Performance**: Operation duration and success rates
- ✅ **Session Data**: Complete user interaction timeline

## Download Debug Logs

```javascript
// From browser console
downloadDebugLogs({
  format: 'json',        // or 'csv'
  standards: ['ERC-20'], // optional filter
  includeErrors: true    // include error logs
});
```

## Environment Setup

The debug system is already integrated and ready to use. Simply enable it when needed for:

- 🐛 **Bug Investigation**: Track exact user actions leading to issues
- 🧪 **Testing**: Validate form behavior and data flow
- 📊 **Performance Analysis**: Identify slow operations
- 🔍 **Development**: Real-time feedback during feature development

**Next**: Enable debug mode and try creating a token to see the system in action!
