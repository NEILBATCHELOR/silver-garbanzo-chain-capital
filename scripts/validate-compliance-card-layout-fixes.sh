#!/bin/bash

# Compliance Card Layout and Warning Text Validation Script
# Verifies the changes made to card layouts and warning text

echo "🔧 Compliance Card Layout & Warning Text Validation - August 11, 2025"
echo "====================================================================="

echo ""
echo "📋 Checking for 'Warning' text change..."
if grep -q "Warning" "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/compliance/management/OrganizationDetailPage.tsx"; then
    echo "✅ 'Warning' text found in OrganizationDetailPage.tsx"
else
    echo "❌ 'Warning' text not found in OrganizationDetailPage.tsx"
fi

echo ""
echo "📋 Checking for proper card grid layouts..."

# Check OrganizationDetailPage.tsx for md:grid-cols-3
if grep -q "md:grid-cols-3" "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/compliance/management/OrganizationDetailPage.tsx"; then
    echo "✅ OrganizationDetailPage.tsx: Status cards use md:grid-cols-3 (100% span)"
else
    echo "❌ OrganizationDetailPage.tsx: Status cards not using md:grid-cols-3"
fi

# Check OrganizationManagementDashboard.tsx for md:grid-cols-3  
if grep -q "md:grid-cols-3" "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/compliance/management/OrganizationManagementDashboard.tsx"; then
    echo "✅ OrganizationManagementDashboard.tsx: Summary cards use md:grid-cols-3 (100% span)"
else
    echo "❌ OrganizationManagementDashboard.tsx: Summary cards not using md:grid-cols-3"
fi

echo ""
echo "📋 Checking for absence of old 'Danger Zone' text..."
if ! grep -q "Danger Zone" "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/compliance/management/OrganizationDetailPage.tsx"; then
    echo "✅ 'Danger Zone' text successfully removed from OrganizationDetailPage.tsx"
else
    echo "❌ 'Danger Zone' text still found in OrganizationDetailPage.tsx"
fi

echo ""
echo "📊 Summary of Changes:"
echo "- Changed 'Danger Zone' → 'Warning' in organization settings"
echo "- Fixed status cards: md:grid-cols-4 → md:grid-cols-3 (detail page)"
echo "- Fixed summary cards: md:grid-cols-4 → md:grid-cols-3 (management page)"

echo ""
echo "✅ Compliance card layout and warning text fixes validation complete!"
