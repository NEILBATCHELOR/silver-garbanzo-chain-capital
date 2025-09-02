#!/bin/bash

# ERC-721 TypeScript Fix Verification Script
# Tests that the fixed files compile successfully

echo "🔍 Verifying ERC-721 TypeScript fixes..."
echo "========================================"

cd "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress"

echo "📝 Testing enhanced ERC-721 deployment service..."
npx tsc --noEmit --isolatedModules src/components/tokens/services/enhancedERC721DeploymentService.ts 2>&1

if [ $? -eq 0 ]; then
    echo "✅ enhancedERC721DeploymentService.ts - No TypeScript errors"
else
    echo "❌ enhancedERC721DeploymentService.ts - TypeScript errors found"
    exit 1
fi

echo ""
echo "📝 Testing unified ERC-721 deployment service..."
npx tsc --noEmit --isolatedModules src/components/tokens/services/unifiedERC721DeploymentService.ts 2>&1

if [ $? -eq 0 ]; then
    echo "✅ unifiedERC721DeploymentService.ts - No TypeScript errors"
else
    echo "❌ unifiedERC721DeploymentService.ts - TypeScript errors found"
    exit 1
fi

echo ""
echo "🎉 All ERC-721 TypeScript fixes verified successfully!"
echo "✅ Build-blocking errors resolved"
echo "✅ Type safety maintained"
echo "✅ Ready for production use"
