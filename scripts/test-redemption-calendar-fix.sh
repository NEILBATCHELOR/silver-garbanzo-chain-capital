#!/bin/bash

# RedemptionCalendarService Fix Verification Script
# Tests the calendar endpoints that were causing Prisma errors

BASE_URL="http://localhost:3001"
TEST_PROJECT_ID="cdc4f92c-8da1-4d80-a917-a94eb8cafaf0"

echo "🚀 Starting RedemptionCalendarService Fix Verification"
echo "=================================================="

test_endpoint() {
  local endpoint="$1"
  local description="$2"
  
  echo ""
  echo "🧪 Testing: $description"
  echo "📡 Endpoint: $endpoint"
  
  # Use curl with timeout and follow redirects
  response=$(curl -s -w "\n%{http_code}" --connect-timeout 5 --max-time 10 "$endpoint" 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    # Split response and status code
    status_code=$(echo "$response" | tail -n1)
    content=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "200" ]; then
      echo "✅ SUCCESS: 200 OK"
      
      # Show content type and length
      content_length=${#content}
      echo "📏 Content length: $content_length characters"
      
      if [ $content_length -gt 0 ] && [ $content_length -lt 200 ]; then
        echo "📋 Preview: ${content:0:100}..."
      fi
      
      # Check for XML/RSS content
      if [[ "$content" == *"<?xml"* ]]; then
        echo "📄 Content type: XML/RSS detected"
      elif [[ "$content" == *"BEGIN:VCALENDAR"* ]]; then
        echo "📄 Content type: iCal detected"
      elif [[ "$content" == *"{"* ]]; then
        echo "📄 Content type: JSON detected"
      fi
      
    else
      echo "❌ FAILED: $status_code"
      if [ ${#content} -gt 0 ] && [ ${#content} -lt 500 ]; then
        echo "📋 Error: ${content:0:200}..."
      fi
    fi
  else
    echo "💥 ERROR: Connection failed"
    echo "🔧 Hint: Backend server may not be running on $BASE_URL"
  fi
}

# Test 1: Basic health check
test_endpoint "$BASE_URL/health" "Basic Backend Health Check"

# Test 2: API status
test_endpoint "$BASE_URL/api/v1/status" "API Status Endpoint"

# Test 3: Calendar RSS endpoint (this was causing Prisma errors)
test_endpoint "$BASE_URL/api/v1/calendar/redemption/rss" "Calendar RSS Feed (No Project)"

# Test 4: Calendar RSS with project filter (this was causing Prisma errors)
test_endpoint "$BASE_URL/api/v1/calendar/redemption/rss?project=$TEST_PROJECT_ID" "Calendar RSS Feed (With Project)"

# Test 5: Calendar iCal endpoint (this was causing Prisma errors)
test_endpoint "$BASE_URL/api/v1/calendar/redemption/ical" "Calendar iCal Feed (No Project)"

# Test 6: Calendar iCal with project filter (this was causing Prisma errors)
test_endpoint "$BASE_URL/api/v1/calendar/redemption/ical?project=$TEST_PROJECT_ID" "Calendar iCal Feed (With Project)"

echo ""
echo "🎯 Test Summary"
echo "==============="
echo "✅ SUCCESS: Endpoints return 200 OK (fix worked)"
echo "❌ FAILED: Endpoints return errors (fix needs work)"
echo "💥 ERROR: Connection refused (server not running)"
echo ""
echo "If all calendar endpoints return 200 OK, the Prisma relationship fix worked! 🎉"
