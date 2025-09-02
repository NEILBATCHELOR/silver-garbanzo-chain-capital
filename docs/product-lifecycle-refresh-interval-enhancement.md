# Product Lifecycle Refresh Interval Enhancement

## Overview

This enhancement adds user-configurable refresh intervals to the Product Lifecycle Manager component. Users can now select how frequently they want the data to refresh when using polling mode.

## Features Added

1. **Default 15-minute refresh interval** - Changed the default polling interval from 10 seconds to 15 minutes for better performance
2. **User-selectable refresh intervals** - Added a dropdown menu allowing users to choose between 1, 5, 10, and 15 minute refresh intervals
3. **Visible refresh status** - Updated the status indicator to show the current refresh interval
4. **Notifications** - Added toast notifications when refresh intervals are changed

## Implementation Details

### Modified Files

1. `/frontend/src/hooks/supabase/useSupabaseSubscription.ts`
   - Updated default polling interval to 15 minutes (900,000 ms)

2. `/frontend/src/components/products/lifecycle/product-lifecycle-manager.tsx`
   - Added state for tracking the selected refresh interval
   - Added a dropdown menu for interval selection
   - Updated the useSupabaseSubscription hook to use the selected interval
   - Added effect hook to handle refresh interval changes
   - Updated the UI to display the current refresh interval

### User Experience

- The component now shows the current refresh interval in the status indicator
- When changing the refresh interval, users get a toast notification confirming the change
- Users can manually trigger a refresh at any time using the "Refresh Now" button
- The dropdown menu makes it easy to select different refresh intervals based on need

## Benefits

- Reduced server load by decreasing the default polling frequency
- Improved user control over data freshness
- Better visibility into the current refresh status
- More efficient use of resources by allowing longer intervals for less time-sensitive data
