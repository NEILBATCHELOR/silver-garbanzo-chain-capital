# Project Detail Page Updates

## Overview

This update makes changes to the project details page to modify the financial information display.

## Changes Made

1. **Removed "Funding Goal" Card**
   - Removed the card that displayed the target fundraising amount
   - This simplifies the interface and focuses on actual subscriptions

2. **Renamed "Amount Raised" to "Amount Subscribed"**
   - Changed all occurrences of "Amount Raised" to "Amount Subscribed"
   - This provides more accurate terminology for the financial tracking

3. **Removed Progress Percentage**
   - Removed the "X% of goal" display that showed progress toward the funding goal
   - This aligns with removing the funding goal metric

## Files Modified

1. `/frontend/src/components/projects/ProjectDetailsPage.tsx`
   - Removed the Funding Goal card
   - Changed "Amount Raised" to "Amount Subscribed"
   - Removed the percentage of goal text

2. `/frontend/src/components/projects/ProjectDetail.tsx`
   - Changed "Target Raise" to "Amount Subscribed" in the metrics section
   - Updated the financial accordion to use "Amount Subscribed" and removed the separate "Raised Amount" field

## Reasoning

These changes align the UI with the actual usage of the platform, focusing on tracking actual subscriptions rather than goals or targets. This provides a clearer and more accurate representation of the project's financial status.

## Testing

To test these changes:
1. Navigate to any project detail page
2. Verify that the "Funding Goal" card no longer appears
3. Verify that "Amount Subscribed" appears instead of "Amount Raised"
4. Verify that no percentage of goal text appears
5. Check that these changes are consistent across both overview and financial tabs
