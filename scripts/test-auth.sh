#!/bin/bash

# Chain Capital Auth System Testing Scripts
# Quick testing utilities for authentication functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Chain Capital Auth System Testing Scripts${NC}"
echo "=============================================="

# Function to check if dev server is running
check_dev_server() {
    if curl -s http://localhost:5173/ > /dev/null; then
        echo -e "${GREEN}✅ Dev server is running on http://localhost:5173/${NC}"
        return 0
    else
        echo -e "${RED}❌ Dev server is not running${NC}"
        echo "Run: npm run dev"
        return 1
    fi
}

# Function to check database connection
check_database() {
    echo -e "${BLUE}🗄️ Checking database connection...${NC}"
    # This would require PostgreSQL client tools
    echo "Database check requires manual verification"
    echo "Check: npm run postgres:query \"SELECT count(*) FROM auth.users;\""
}

# Function to display available test routes
show_test_routes() {
    echo -e "${BLUE}🧪 Available Test Routes:${NC}"
    echo ""
    echo "📧 Basic Authentication:"
    echo "  http://localhost:5173/auth/login"
    echo "  http://localhost:5173/auth/signup"
    echo "  http://localhost:5173/auth/reset-password"
    echo ""
    echo "🔒 Multi-Factor Authentication:"
    echo "  http://localhost:5173/auth/setup-totp"
    echo "  http://localhost:5173/auth/mfa"
    echo ""
    echo "🔗 Alternative Authentication:"
    echo "  http://localhost:5173/auth/magic-link"
    echo "  http://localhost:5173/auth/phone"
    echo "  http://localhost:5173/auth/oauth"
    echo "  http://localhost:5173/auth/anonymous"
    echo ""
    echo "⚙️ Settings & Management:"
    echo "  http://localhost:5173/settings/security"
    echo "  http://localhost:5173/settings/identity"
    echo "  http://localhost:5173/admin/auth"
}

# Function to generate test user data
generate_test_user() {
    local timestamp=$(date +%s)
    local random_num=$((RANDOM % 1000))
    
    echo -e "${BLUE}👤 Test User Data Generator:${NC}"
    echo "Email: test-user-${timestamp}@chaincapital.test"
    echo "Password: TestPassword123!"
    echo "Phone: +1555$(printf "%07d" $random_num)"
}

# Function to start comprehensive testing
start_testing() {
    echo -e "${YELLOW}🚀 Starting Auth System Testing...${NC}"
    
    # Check prerequisites
    check_dev_server || exit 1
    
    echo ""
    echo -e "${GREEN}Prerequisites met! Ready to test.${NC}"
    echo ""
    
    show_test_routes
    
    echo ""
    echo -e "${YELLOW}📋 Testing Checklist:${NC}"
    echo "1. Basic login with existing user (neil.batchelor@btinternet.com)"
    echo "2. User registration flow"
    echo "3. Password reset process"
    echo "4. MFA setup and verification"
    echo "5. Alternative auth methods"
    echo "6. Session management"
    echo ""
    echo "📖 Full testing plan: docs/auth-testing-plan.md"
}

# Function to monitor auth logs
monitor_logs() {
    echo -e "${BLUE}📊 Monitoring Auth System...${NC}"
    echo "Check browser console for auth events"
    echo "Check dev server output for errors"
    echo "Check network tab for API calls"
}

# Main menu
case "${1:-menu}" in
    "check")
        check_dev_server
        check_database
        ;;
    "routes")
        show_test_routes
        ;;
    "user")
        generate_test_user
        ;;
    "start")
        start_testing
        ;;
    "monitor")
        monitor_logs
        ;;
    "menu"|*)
        echo "Usage: $0 {check|routes|user|start|monitor}"
        echo ""
        echo "Commands:"
        echo "  check   - Check prerequisites (server, database)"
        echo "  routes  - Show all test routes"
        echo "  user    - Generate test user data"
        echo "  start   - Start comprehensive testing"
        echo "  monitor - Show monitoring tips"
        echo ""
        echo "Examples:"
        echo "  $0 check"
        echo "  $0 start"
        ;;
esac
