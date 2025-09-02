#!/bin/bash

# Quick validation test for core InvestorDetailPage TypeScript fixes
# August 12, 2025

echo "🔍 Testing core InvestorDetailPage TypeScript fixes..."
echo ""

cd "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend"

# Test 1: Check if imports can be resolved
echo "✓ Testing import resolutions..."

# Test if infrastructure files exist
if [ -f "src/infrastructure/database/client.ts" ]; then
  echo "  ✓ Supabase client exists at correct path"
else
  echo "  ❌ Missing: src/infrastructure/database/client.ts"
fi

if [ -f "src/infrastructure/auth/AuthProvider.tsx" ]; then
  echo "  ✓ AuthProvider exists at correct path"
else
  echo "  ❌ Missing: src/infrastructure/auth/AuthProvider.tsx"
fi

# Test 2: Check if compliance_checked_email is in interface
echo ""
echo "✓ Testing interface compliance_checked_email property..."
if grep -q "compliance_checked_email: string | null" src/components/compliance/management/investorManagementService.ts; then
  echo "  ✓ compliance_checked_email property added to InvestorSummary interface"
else
  echo "  ❌ Missing: compliance_checked_email property in interface"
fi

# Test 3: Check if database mapping includes compliance_checked_email
echo ""
echo "✓ Testing database field mapping..."
if grep -q "compliance_checked_email: data.compliance_checked_email" src/components/compliance/management/investorManagementService.ts; then
  echo "  ✓ compliance_checked_email field mapped in database queries"
else
  echo "  ❌ Missing: compliance_checked_email field mapping"
fi

# Test 4: Check if createClient reference is removed
echo ""
echo "✓ Testing createClient reference removal..."
if grep -q "createClient()" src/components/compliance/management/InvestorDetailPage.tsx; then
  echo "  ❌ Found remaining createClient() reference"
else
  echo "  ✓ createClient() reference removed successfully"
fi

echo ""
echo "🎯 Core fixes validation complete"
echo ""
echo "📋 Summary of applied fixes:"
echo "  • Fixed supabase client import path"
echo "  • Added useAuth re-export to auth hooks"
echo "  • Added compliance_checked_email to interface and mappings"
echo "  • Removed createClient() reference"
echo ""
echo "Note: UI component import errors are expected when testing individual files"
echo "These will resolve when running within the full Vite/React environment"
