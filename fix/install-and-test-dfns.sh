#!/bin/bash
# DFNS SDK Fix Installation and Verification Script

echo "🔧 Installing missing DFNS SDK keysigner package..."
cd frontend
pnpm add @dfns/sdk-keysigner@^0.7.2

echo "✅ Package installed. Running TypeScript compilation check..."
pnpm type-check

if [ $? -eq 0 ]; then
    echo "🎉 TypeScript compilation successful! DFNS SDK integration fixed."
else
    echo "❌ TypeScript compilation failed. Check remaining errors."
fi

echo "📋 Next steps:"
echo "1. Test DFNS authentication functionality"
echo "2. Verify service account authentication"
echo "3. Test WebAuthn flows"
echo "4. Check wallet operations"
