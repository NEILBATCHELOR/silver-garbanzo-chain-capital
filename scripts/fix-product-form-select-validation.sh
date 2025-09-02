#!/bin/bash

# Script to fix React Hook Form Select component validation issues
# Replaces defaultValue={field.value} with value={field.value || ""} 
# across all product form components

echo "🔧 Fixing Select component validation issues in product forms..."

# Define the product forms directory
FORMS_DIR="/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms"

# Array of form files to fix
declare -a forms=(
  "AssetBackedProductForm.tsx"
  "BondProductForm.tsx" 
  "CollectiblesProductForm.tsx"
  "CommoditiesProductForm.tsx"
  "DigitalTokenizedFundProductForm.tsx"
  "EnergyProductForm.tsx"
  "EquityProductForm.tsx"
  "FundProductForm.tsx"
  "InfrastructureProductForm.tsx"
  "PrivateDebtProductForm.tsx"
  "PrivateEquityProductForm.tsx"
  "QuantitativeInvestmentStrategyProductForm.tsx"
  "StructuredProductForm.tsx"
)

# Counter for total fixes
total_fixes=0

# Fix each form
for form in "${forms[@]}"; do
  file_path="$FORMS_DIR/$form"
  
  if [[ -f "$file_path" ]]; then
    echo "📝 Processing $form..."
    
    # Count occurrences before fix
    before_count=$(grep -c "defaultValue={field.value}" "$file_path" 2>/dev/null || echo "0")
    
    # Apply the fix using sed
    sed -i '' 's/defaultValue={field\.value}/value={field.value || ""}/g' "$file_path"
    
    # Count occurrences after fix
    after_count=$(grep -c "defaultValue={field.value}" "$file_path" 2>/dev/null || echo "0")
    
    # Calculate fixes applied
    fixes_applied=$((before_count - after_count))
    total_fixes=$((total_fixes + fixes_applied))
    
    if [[ $fixes_applied -gt 0 ]]; then
      echo "   ✅ Fixed $fixes_applied Select components in $form"
    else
      echo "   ⚠️  No fixes needed in $form"
    fi
  else
    echo "   ❌ File not found: $file_path"
  fi
done

echo ""
echo "🎉 Product form Select component fix completed!"
echo "📊 Total Select components fixed: $total_fixes"
echo "📁 Forms processed: ${#forms[@]}"
echo ""
echo "✅ All product forms now use proper controlled component pattern:"
echo "   value={field.value || \"\"} instead of defaultValue={field.value}"
echo ""
echo "🔍 Validation: Run 'npm run type-check' to verify no TypeScript errors"
echo "🧪 Testing: Test form submissions to verify validation works correctly"
