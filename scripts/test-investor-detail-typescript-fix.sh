#!/bin/bash

# TypeScript compilation check for specific files modified in InvestorDetailPage fix
# August 12, 2025

echo "🔍 Testing TypeScript compilation for modified files..."
echo ""

cd "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend"

# Test specific files that were modified
FILES=(
  "src/components/compliance/management/InvestorDetailPage.tsx"
  "src/components/auth/hooks/useAuth.ts" 
  "src/components/compliance/management/investorManagementService.ts"
)

echo "Files to check:"
for file in "${FILES[@]}"; do
  echo "  - $file"
done
echo ""

# Run TypeScript check on specific files
echo "⚡ Running TypeScript check..."
npx tsc --noEmit --skipLibCheck "${FILES[@]}"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ SUCCESS: All modified files pass TypeScript compilation!"
  echo ""
  echo "📋 Fix Summary:"
  echo "  • Fixed supabase client import path"
  echo "  • Added useAuth re-export to auth hooks"
  echo "  • Added compliance_checked_email property to interface"
  echo ""
  echo "🎯 Ready for production use"
else
  echo ""
  echo "❌ FAILED: TypeScript compilation errors found"
  echo ""
  echo "🔧 Check the errors above and apply additional fixes"
fi
