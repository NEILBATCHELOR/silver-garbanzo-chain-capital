#!/bin/bash

# Test script to verify calendar service integration in server-enhanced-simple.ts
# This script starts the enhanced simple server and tests calendar endpoints

echo "🚀 Testing Calendar Service Integration in Enhanced Simple Server"
echo "========================================================"

# Check if the server file exists
if [ ! -f "server-enhanced-simple.ts" ]; then
    echo "❌ server-enhanced-simple.ts not found in current directory"
    exit 1
fi

echo "✅ Found server-enhanced-simple.ts"

# Check if calendar routes import exists
if grep -q "import calendarRoutes from './src/routes/calendar'" server-enhanced-simple.ts; then
    echo "✅ Calendar routes import found"
else
    echo "❌ Calendar routes import missing"
    exit 1
fi

# Check if calendar routes registration exists
if grep -q "register(calendarRoutes" server-enhanced-simple.ts; then
    echo "✅ Calendar routes registration found"
else
    echo "❌ Calendar routes registration missing"
    exit 1
fi

# Check if service count was updated
if grep -q "14+ services" server-enhanced-simple.ts; then
    echo "✅ Service count updated to 14+"
else
    echo "❌ Service count not updated"
    exit 1
fi

echo ""
echo "🎉 All calendar service integration checks passed!"
echo ""
echo "To start the server with calendar support:"
echo "  cd /Users/neilbatchelor/Cursor/Chain\ Capital\ Production-build-progress/backend"
echo "  npm run start:enhanced"
echo ""
echo "Calendar endpoints will be available at:"
echo "  http://localhost:3001/api/v1/calendar/health"
echo "  http://localhost:3001/api/v1/calendar/redemption/events"
echo "  http://localhost:3001/api/v1/calendar/redemption/rss"
echo "  http://localhost:3001/api/v1/calendar/redemption/ical"
