# TypeScript Error Fix: useEnhancedAudit project_id Issue

## Issue
TypeScript error in `useEnhancedAudit.ts` at line 421:
```
"Object literal may only specify known properties, and 'project_id' does not exist in type '{ category?: string; severity?: string; entity_type?: string; user_id?: string; }'."
```

## Root Cause
The `createEventStream` method in `BackendAuditService.ts` had a filters parameter type that only allowed:
- `category?: string`
- `severity?: string`
- `entity_type?: string`
- `user_id?: string`

But the `useEnhancedAudit` hook was trying to pass `project_id: projectId` to this method, which wasn't included in the allowed type.

## Solution
Added `project_id?: string;` to the filters parameter type in the `createEventStream` method:

**File:** `/frontend/src/services/audit/BackendAuditService.ts`

**Before:**
```typescript
createEventStream(filters?: {
  category?: string;
  severity?: string;
  entity_type?: string;
  user_id?: string;
}): EventSource {
```

**After:**
```typescript
createEventStream(filters?: {
  category?: string;
  severity?: string;
  entity_type?: string;
  user_id?: string;
  project_id?: string;
}): EventSource {
```

## Files Modified
1. `/frontend/src/services/audit/BackendAuditService.ts` - Added `project_id?: string;` to createEventStream filters

## Status
✅ **FIXED** - TypeScript compilation error resolved

## Impact
- TypeScript compilation now passes without errors
- The `useEnhancedAudit` hook can properly pass `project_id` to event streaming
- Maintains consistency with other methods that already support `project_id` filtering
