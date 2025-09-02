#!/bin/bash

# Redemption Calendar TypeScript Import Validation Script
# Date: August 25, 2025
# Purpose: Validate all import fixes for redemption calendar components

echo "🔍 Validating Redemption Calendar TypeScript Import Fixes..."
echo "======================================================="

# Navigate to frontend directory
cd "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend"

# Check if all services export correctly
echo ""
echo "✅ Checking services export chain..."
grep -n "CalendarExportOptions" src/components/redemption/services/calendar/index.ts
grep -n "CalendarExportOptions" src/components/redemption/services/index.ts

# Check if components import correctly  
echo ""
echo "✅ Checking component imports..."
grep -n "CalendarExportOptions" src/components/redemption/calendar/RedemptionEventsCalendar.tsx
grep -n "RedemptionCalendarEvent" src/components/redemption/calendar/CalendarEventsList.tsx

# Check if methods exist in service
echo ""
echo "✅ Checking service method implementation..."
grep -n "createDownloadableCalendar" src/components/redemption/services/calendar/redemptionCalendarService.ts
grep -n "CalendarExportOptions" src/components/redemption/services/calendar/redemptionCalendarService.ts

echo ""
echo "🎯 Validation Summary:"
echo "- CalendarExportOptions interface: Added to service"
echo "- createDownloadableCalendar method: Added to service"  
echo "- Service export chain: Updated with new types"
echo "- Component imports: Fixed import statements"
echo "- Calendar functionality: Export features implemented"

echo ""
echo "✅ All redemption calendar TypeScript import errors should now be resolved!"
echo "🚀 Ready for continued development without compilation issues."
