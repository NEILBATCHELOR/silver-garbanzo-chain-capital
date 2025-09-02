#!/bin/bash

# TypeScript Compilation Verification Script
# Checks that the deployment services now compile without errors

echo "🔍 Verifying TypeScript compilation after fixes..."
echo ""

# Function to check TypeScript for specific files
check_file() {
    local file="$1"
    echo "Checking: $file"
    
    if npx tsc --noEmit --skipLibCheck "$file" 2>/dev/null; then
        echo "✅ $file - No errors"
    else
        echo "❌ $file - Still has errors"
        npx tsc --noEmit --skipLibCheck "$file"
        return 1
    fi
    echo ""
}

# Files that were fixed
files=(
    "src/components/tokens/interfaces/TokenInterfaces.ts"
    "src/components/tokens/services/foundryDeploymentService.ts"
    "src/components/tokens/services/erc1400ConfigurationMapper.ts"
    "src/components/tokens/services/unifiedERC1400DeploymentService.ts"
    "src/components/tokens/services/enhancedERC3525DeploymentService.ts"
    "src/components/tokens/services/unifiedERC3525DeploymentService.ts"
    "src/components/tokens/services/index.ts"
    "src/components/tokens/services/enhancedERC1400DeploymentService.ts"
)

error_count=0

echo "📋 Checking individual files that were fixed..."
echo ""

for file in "${files[@]}"; do
    if ! check_file "$file"; then
        ((error_count++))
    fi
done

echo "📊 Summary:"
echo "Files checked: ${#files[@]}"
echo "Files with errors: $error_count"

if [ $error_count -eq 0 ]; then
    echo "🎉 All fixes successful! No TypeScript errors found."
    exit 0
else
    echo "⚠️  $error_count files still have TypeScript errors."
    exit 1
fi
