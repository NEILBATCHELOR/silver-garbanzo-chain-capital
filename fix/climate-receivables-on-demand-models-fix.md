# Climate Receivables Dashboard: On-Demand Models Fix

## Problem
Risk and financial models were automatically activating on page load instead of on user demand in the Climate Receivables Dashboard.

## Root Cause
1. **`useClimateReceivablesServices` hook** was initialized with automatic services:
   - `autoRefresh: true` (5-minute intervals)
   - `enableRiskCalculation: true` (auto-activated on load)
   - `enableCashFlowForecasting: true` (auto-activated on load)
   - `enableAlerts: true` (auto-activated on load)

2. **`useIntegratedClimateValuation` hook** was initialized with:
   - `enableMLModels: true` (ML models auto-activated)
   - `enableStressTesting: true` (stress testing auto-activated)
   - `autoRefresh: true` (continuous refreshing)

3. **Automatic initialization** in `useClimateReceivablesServices.ts` lines 370-374:
   ```typescript
   useEffect(() => {
     if (projectId) {
       initializeAllServices(); // ← AUTO-RUNS ON PAGE LOAD!
     }
   }, [projectId, initializeAllServices]);
   ```

## Solution: On-Demand Only Models

### 1. Modified Hook Configuration
**File:** `EnhancedClimateReceivablesDashboard.tsx`

```typescript
// BEFORE (Auto-activated)
useClimateReceivablesServices({
  autoRefresh: true,
  enableRiskCalculation: true,
  enableCashFlowForecasting: true,
  enableAlerts: true
});

// AFTER (On-demand only)
useClimateReceivablesServices({
  autoRefresh: false,           // ← DISABLED
  enableRiskCalculation: false, // ← DISABLED  
  enableCashFlowForecasting: false, // ← DISABLED
  enableAlerts: false          // ← DISABLED
});
```

### 2. Removed Automatic Initialization
**File:** `useClimateReceivablesServices.ts`

```typescript
// REMOVED: Automatic initialization useEffect
// Now requires manual call to initializeAllServices()
```

### 3. Added Manual Service Controls
- **Service Status Indicators:** Visual badges showing which services are active/disabled
- **Individual Service Buttons:** Enable specific models (Risk, Cash Flow, Climate NAV, Alerts)
- **Enable All Services Button:** One-click activation of all models
- **Loading States:** Clear feedback during model initialization

### 4. Enhanced User Experience
- **Service Enablement Cards:** Interactive cards explaining each model type
- **Progressive Disclosure:** Only show data when relevant services are active
- **Clear Visual Feedback:** Loading spinners and status updates

## Files Modified

### Core Changes
1. **`/components/climateReceivables/EnhancedClimateReceivablesDashboard.tsx`**
   - Disabled auto-initialization in both hooks
   - Added manual service control state
   - Added individual service trigger functions
   - Enhanced UI with service status indicators
   - Modified tabs to show enablement prompts

2. **`/components/climateReceivables/hooks/useClimateReceivablesServices.ts`**
   - Removed automatic initialization useEffect
   - Now requires explicit manual calls

## Usage

### Page Load Behavior (Fixed)
- **Before:** All models automatically started running
- **After:** Page loads instantly with no model execution

### Manual Model Activation
- **Individual Services:** Click specific service cards or buttons
- **All Services:** Click "Enable All Models" button
- **Visual Feedback:** Status badges and loading indicators

## Benefits
1. **Faster Page Load:** No models run automatically on page load
2. **User Control:** Models activate only when needed
3. **Resource Efficiency:** No unnecessary calculations
4. **Better UX:** Clear service status and manual controls
5. **Scalable:** Easy to add more on-demand services

## Testing
Navigate to: `http://localhost:5173/projects/cdc4f92c-8da1-4d80-a917-a94eb8cafaf0/climate-receivables/dashboard`

**Expected Behavior:**
1. Page loads quickly without model execution
2. Service status badges show "Disabled" states  
3. "Enable All Models" button is visible
4. Models activate only when user clicks enable buttons
5. Visual feedback during model initialization
6. Data appears only after services are activated

## Notes
- Models now run **on-demand only** as requested
- All automatic initialization has been removed
- User has full control over when models execute
- Maintains all original functionality when services are enabled
