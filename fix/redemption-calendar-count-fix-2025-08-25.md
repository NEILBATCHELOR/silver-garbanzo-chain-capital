# Redemption Calendar Count Fix

**Date**: August 25, 2025  
**Issue**: Incorrect entity counts in redemption calendar summary  
**Status**: âœ… FIXED

## Problem Description

The redemption calendar at `/redemption/calendar` was displaying incorrect counts:
- **Expected**: Windows: 2, Rules: 2 (actual database entities)
- **Actual**: Windows: 8, Rules: 4 (calendar events generated from entities)

## Root Cause Analysis

The calendar service creates multiple events per database entity:

### Windows (2 entities → 8 events)
Each redemption window generates 4 calendar events:
1. `submission_open` - When submissions start
2. `submission_close` - When submissions end 
3. `processing_start` - When processing begins
4. `processing_end` - When processing completes

### Rules (2 entities → 4 events)  
Each redemption rule generates 1-2 calendar events:
1. `rule_open` - When rule becomes active
2. `lockup_end` - When lockup period ends (if applicable)

The `CalendarSummary` component was counting all calendar events by source instead of unique entities.

## Solution Implemented

**File Modified**: `/frontend/src/components/redemption/calendar/CalendarSummary.tsx`

**Changes Made**:
```typescript
// OLD: Count all events by source
<span>Windows: {stats.bySource.window || 0}</span>
<span>Rules: {stats.bySource.rule || 0}</span>

// NEW: Count unique entities by sourceId  
<span>Windows: {
  new Set(events.filter(e => e.source === 'window').map(e => e.sourceId)).size
}</span>
<span>Rules: {
  new Set(events.filter(e => e.source === 'rule').map(e => e.sourceId)).size
}</span>
```

**Additional Enhancement**:
- Added debug information showing actual event counts
- Maintains clarity between entity counts vs event counts

## Result

Calendar now correctly displays:
- **Windows: 2** (actual redemption windows in database)
- **Rules: 2** (actual redemption rules in database) 
- **Total Events: 12** (all calendar events generated)

## Testing

**Database Verification**:
```sql
-- Confirmed 2 windows exist
SELECT COUNT(*) FROM redemption_windows WHERE project_id = 'cdc4f92c-8da1-4d80-a917-a94eb8cafaf0';
-- Result: 2

-- Confirmed 2 rules exist  
SELECT COUNT(*) FROM redemption_rules WHERE project_id = 'cdc4f92c-8da1-4d80-a917-a94eb8cafaf0';
-- Result: 2
```

**Calendar Logic**:
- 2 windows × 4 events each = 8 window events
- 2 rules × 2 events each = 4 rule events (both have lockup periods)
- Total: 12 events (correct)

## Impact

✅ **User Experience**: Clear, accurate entity counts  
✅ **Data Integrity**: Counts match actual database entities  
✅ **Debugging**: Event counts still visible for troubleshooting  
✅ **No Breaking Changes**: Calendar functionality unchanged

## Files Modified

1. `/frontend/src/components/redemption/calendar/CalendarSummary.tsx`
   - Updated entity counting logic
   - Added debug event counts
   - Maintained existing functionality

---

**Status**: Complete and ready for production use
