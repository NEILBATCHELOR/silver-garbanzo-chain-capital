#!/bin/bash

# Radix UI Select Empty Value Checker and Fixer
# Created: August 26, 2025
# Purpose: Identify and help fix SelectItem components with empty string values

echo "🔍 Radix UI Select Empty Value Checker"
echo "======================================"
echo ""

# Check if we're in the frontend directory
if [ ! -d "src" ]; then
    echo "❌ Error: Please run this script from the frontend directory"
    exit 1
fi

echo "📍 Searching for SelectItem components with empty string values..."
echo ""

# Search for problematic SelectItem patterns
RESULTS=$(grep -r "SelectItem.*value=\"\"" src/ || true)

if [ -z "$RESULTS" ]; then
    echo "✅ No SelectItem components with empty string values found!"
    echo "   All Radix UI Select components are properly configured."
    exit 0
fi

echo "⚠️  Found SelectItem components with empty string values:"
echo ""

# Display results with line numbers
grep -n "SelectItem.*value=\"\"" src/ | while read line; do
    echo "  📄 $line"
done

echo ""
echo "🛠️  Automated Fix Recommendations:"
echo ""

# Provide fix suggestions
echo "1. For disabled placeholder items (loading, empty states):"
echo "   Replace: <SelectItem value=\"\" disabled>Loading...</SelectItem>"
echo "   With:    <SelectItem value=\"loading\" disabled>Loading...</SelectItem>"
echo ""

echo "2. For 'None' or 'Any' options:"
echo "   Replace: <SelectItem value=\"\">None</SelectItem>"
echo "   With:    <SelectItem value=\"none\">None</SelectItem>"
echo ""

echo "3. For 'Any' filter options:"
echo "   Replace: <SelectItem value=\"\">Any status</SelectItem>"
echo "   With:    <SelectItem value=\"any-status\">Any status</SelectItem>"
echo ""

echo "🔧 Quick Fix Commands:"
echo ""

# Generate specific fix commands for common patterns
echo "# Fix loading states:"
echo "find src/ -name '*.tsx' -type f -exec sed -i '' 's/value=\"\" disabled>Loading/value=\"loading\" disabled>Loading/g' {} +"
echo ""

echo "# Fix 'None' options:"
echo "find src/ -name '*.tsx' -type f -exec sed -i '' 's/value=\"\">None/value=\"none\">None/g' {} +"
echo ""

echo "# Fix 'Any' options:"
echo "find src/ -name '*.tsx' -type f -exec sed -i '' 's/value=\"\">Any /value=\"any-/g' {} +"
echo ""

echo "⚠️  WARNING: Review all changes before committing!"
echo "   Some components may need custom logic updates to handle new values."
echo ""

echo "📚 For more details, see: /fix/radix-select-empty-value-fix-2025-08-26.md"
