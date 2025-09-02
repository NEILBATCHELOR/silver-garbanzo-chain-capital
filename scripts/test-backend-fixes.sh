#!/bin/bash

# Backend Server Fix Verification Script
# Tests all three critical issues that were resolved

echo "🧪 Chain Capital Backend - Fix Verification Test"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001"
TESTS_PASSED=0
TOTAL_TESTS=4

# Test 1: Health Check
echo "Test 1: Health Check"
echo "-------------------"
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" "${BASE_URL}/health" -o /tmp/health_response.json)
HTTP_CODE="${HEALTH_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Health check returned 200"
    HEALTH_STATUS=$(cat /tmp/health_response.json | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Server reports healthy status"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC} - Server reports unhealthy status: $HEALTH_STATUS"
    fi
else
    echo -e "${RED}❌ FAIL${NC} - Health check failed with HTTP $HTTP_CODE"
fi
echo ""

# Test 2: Swagger Documentation
echo "Test 2: Swagger OpenAPI Documentation"
echo "------------------------------------"
SWAGGER_RESPONSE=$(curl -s -w "%{http_code}" "${BASE_URL}/docs/json" -o /tmp/swagger_response.json)
HTTP_CODE="${SWAGGER_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Swagger JSON returned 200"
    # Check if bearerAuth is present in the response
    if grep -q "bearerAuth" /tmp/swagger_response.json; then
        echo -e "${GREEN}✅ PASS${NC} - bearerAuth security scheme is present"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC} - bearerAuth security scheme not found"
    fi
else
    echo -e "${RED}❌ FAIL${NC} - Swagger documentation failed with HTTP $HTTP_CODE"
    if [ -f /tmp/swagger_response.json ]; then
        echo "Error response:"
        cat /tmp/swagger_response.json
    fi
fi
echo ""

# Test 3: Audit System - Single Event
echo "Test 3: Audit System - Single Event Creation"
echo "--------------------------------------------"
AUDIT_DATA='{"action":"TEST_SINGLE","category":"user_action","details":"Fix verification test"}'
AUDIT_RESPONSE=$(curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/audit/events" \
    -H "Content-Type: application/json" \
    -d "$AUDIT_DATA" \
    -o /tmp/audit_response.json)
HTTP_CODE="${AUDIT_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Single audit event created successfully"
    # Check if response contains a valid UUID in the id field
    if grep -qE '"id":"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"' /tmp/audit_response.json; then
        echo -e "${GREEN}✅ PASS${NC} - Valid UUID generated for audit event"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC} - Invalid or missing UUID in audit event"
        cat /tmp/audit_response.json
    fi
else
    echo -e "${RED}❌ FAIL${NC} - Audit event creation failed with HTTP $HTTP_CODE"
    if [ -f /tmp/audit_response.json ]; then
        echo "Error response:"
        cat /tmp/audit_response.json
    fi
fi
echo ""

# Test 4: Audit System - Bulk Events
echo "Test 4: Audit System - Bulk Event Creation"
echo "------------------------------------------"
BULK_AUDIT_DATA='{"events":[{"action":"TEST_BULK_1","category":"user_action","details":"Bulk test 1"},{"action":"TEST_BULK_2","category":"data_operation","details":"Bulk test 2"}]}'
BULK_RESPONSE=$(curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/audit/events/bulk" \
    -H "Content-Type: application/json" \
    -d "$BULK_AUDIT_DATA" \
    -o /tmp/bulk_response.json)
HTTP_CODE="${BULK_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Bulk audit events created successfully"
    # Check if the response doesn't contain any Promise objects
    if ! grep -q "\[object Promise\]" /tmp/bulk_response.json; then
        echo -e "${GREEN}✅ PASS${NC} - No Promise objects in JSON response"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC} - Promise objects found in JSON response"
        cat /tmp/bulk_response.json
    fi
else
    echo -e "${RED}❌ FAIL${NC} - Bulk audit events failed with HTTP $HTTP_CODE"
    if [ -f /tmp/bulk_response.json ]; then
        echo "Error response:"
        cat /tmp/bulk_response.json
    fi
fi
echo ""

# Summary
echo "Test Summary"
echo "============"
if [ $TESTS_PASSED -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! ($TESTS_PASSED/$TOTAL_TESTS)${NC}"
    echo -e "${GREEN}✅ Backend server is fully operational${NC}"
    echo -e "${GREEN}✅ All critical issues have been resolved${NC}"
    echo ""
    echo "🔗 Quick Access Links:"
    echo "   📚 API Docs: http://localhost:3001/docs"
    echo "   🏥 Health: http://localhost:3001/health"
    echo "   📊 Status: http://localhost:3001/api/v1/status"
    echo "   🐛 Debug: http://localhost:3001/debug/services"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED ($TESTS_PASSED/$TOTAL_TESTS passed)${NC}"
    echo -e "${YELLOW}⚠️  Please check the server logs for detailed error information${NC}"
    echo ""
    exit 1
fi

# Cleanup
rm -f /tmp/health_response.json /tmp/swagger_response.json /tmp/audit_response.json /tmp/bulk_response.json
