#!/bin/bash

# Quick Test Script for Compliance Upload Functionality
# Tests both the CSV validation script and provides manual testing guidance

set -e  # Exit on error

echo "🧪 Chain Capital Compliance Upload - Quick Test Suite"
echo "===================================================="

BASE_DIR="/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/test-data/compliance-upload"
cd "$BASE_DIR"

echo ""
echo "📍 Working directory: $(pwd)"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js to run validation."
    exit 1
fi

echo ""
echo "🔍 Step 1: Validating test data structure..."
echo "============================================"

# Run the validation script
if node validate-test-data.js; then
    echo ""
    echo "✅ All validation checks passed!"
else
    echo ""
    echo "❌ Validation failed. Please check the errors above."
    exit 1
fi

echo ""
echo "📊 Step 2: Test data statistics..."
echo "=================================="

# Count CSV records
INVESTOR_RECORDS=$(tail -n +2 investor-test-data.csv | wc -l | tr -d ' ')
ISSUER_RECORDS=$(tail -n +2 issuer-test-data.csv | wc -l | tr -d ' ')

# Count documents
INVESTOR_DOCS=$(ls -1 investor-documents/*.pdf 2>/dev/null | wc -l | tr -d ' ')
ISSUER_DOCS=$(ls -1 issuer-documents/*.pdf 2>/dev/null | wc -l | tr -d ' ')

echo "📄 Investor CSV records: $INVESTOR_RECORDS"
echo "📄 Issuer CSV records: $ISSUER_RECORDS"
echo "📁 Investor documents: $INVESTOR_DOCS"
echo "📁 Issuer documents: $ISSUER_DOCS"

echo ""
echo "🎯 Step 3: Manual testing checklist..."
echo "====================================="

echo ""
echo "To test the compliance upload functionality:"
echo ""
echo "1️⃣  START FRONTEND"
echo "   cd /Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend"
echo "   npm run dev"
echo ""
echo "2️⃣  TEST INVESTOR UPLOAD"
echo "   🌐 Navigate to: http://localhost:5173/compliance/upload/investor"
echo "   📤 Upload file: test-data/compliance-upload/investor-test-data.csv"
echo "   ✅ Expected: $INVESTOR_RECORDS investors processed successfully"
echo "   📋 Verify: Complex JSON fields (risk_assessment, investment_preferences) parsed correctly"
echo "   📋 Verify: All investor types (individual, institutional, family_office, etc.) handled"
echo ""
echo "3️⃣  TEST ISSUER UPLOAD"
echo "   🌐 Navigate to: http://localhost:5173/compliance/upload/issuer"
echo "   📤 Upload file: test-data/compliance-upload/issuer-test-data.csv"
echo "   ✅ Expected: $ISSUER_RECORDS organizations processed successfully"
echo "   📋 Verify: JSON fields (address, legal_representatives) parsed correctly"
echo "   📋 Verify: International entities (UK, Switzerland, Singapore, etc.) handled"
echo ""
echo "4️⃣  TEST DOCUMENT UPLOAD"
echo "   📁 Upload investor documents from: investor-documents/ ($INVESTOR_DOCS files)"
echo "   📁 Upload issuer documents from: issuer-documents/ ($ISSUER_DOCS files)"
echo "   ✅ Expected: All documents categorized and linked to entities"
echo "   📋 Verify: Document type auto-detection working"
echo "   📋 Verify: Entity-document linking functional"
echo ""

echo "5️⃣  VALIDATION SCENARIOS TO TEST"
echo "   🔍 Required field validation (try removing 'name' or 'email')"
echo "   🔍 Invalid email format (try 'invalid-email')"
echo "   🔍 Invalid JSON (try malformed JSON in verification_details)"
echo "   🔍 Invalid date format (try 'invalid-date' in kyc_verified_at)"
echo "   🔍 Invalid enum values (try 'invalid_status' in kyc_status)"
echo "   🔍 Duplicate handling (upload same file twice)"
echo ""

echo "6️⃣  EDGE CASE TESTING"
echo "   ⚠️  Large file upload (try duplicating CSV rows to 100+ records)"
echo "   ⚠️  Network interruption (disconnect during upload)"
echo "   ⚠️  Invalid file format (try uploading .txt file)"
echo "   ⚠️  Empty file upload"
echo "   ⚠️  Special characters in names/emails"
echo ""

echo "🔧 TROUBLESHOOTING TIPS"
echo "======================="
echo ""
echo "📊 If CSV upload fails:"
echo "   • Check browser console for detailed errors"
echo "   • Verify CSV format matches templates exactly"
echo "   • Ensure JSON fields use double quotes"
echo "   • Check date formats are ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)"
echo ""
echo "📁 If document upload fails:"
echo "   • Ensure entities are uploaded first (CSV data)"
echo "   • Check file extensions are .pdf"
echo "   • Verify file sizes are reasonable (<50MB)"
echo "   • Check document type mapping in console"
echo ""
echo "🌐 If frontend errors occur:"
echo "   • Check backend is running and accessible"
echo "   • Verify database connection is working"
echo "   • Check network requests in browser dev tools"
echo "   • Look for CORS issues"
echo ""

echo "📈 SUCCESS INDICATORS"
echo "====================="
echo ""
echo "✅ CSV Upload Success:"
echo "   • Progress bar completes to 100%"
echo "   • Success message shows correct record count"
echo "   • Preview table displays data correctly"
echo "   • No validation errors in console"
echo ""
echo "✅ Document Upload Success:"
echo "   • All files upload without errors"
echo "   • Document type detection works automatically"
echo "   • Entity linking occurs correctly"
echo "   • Upload progress tracked properly"
echo ""
echo "✅ Database Verification:"
echo "   • New records appear in investors/organizations tables"
echo "   • Complex JSON fields stored correctly"
echo "   • Documents linked to correct entities"
echo "   • No duplicate records created (if testing duplicate handling)"
echo ""

echo "🚀 Ready to test! Follow the checklist above for comprehensive testing."
echo ""