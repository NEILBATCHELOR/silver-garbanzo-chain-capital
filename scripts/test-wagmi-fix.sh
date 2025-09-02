#!/bin/bash

# Quick test script to verify wagmi provider fix
echo "🧪 Testing Wagmi Provider Fix..."

# Check if the files exist
echo "📁 Checking created files..."
if [ -f "src/infrastructure/web3/minimal/MinimalWagmiProvider.tsx" ]; then
    echo "✅ MinimalWagmiProvider.tsx exists"
else
    echo "❌ MinimalWagmiProvider.tsx missing"
fi

if [ -f "src/infrastructure/web3/minimal/index.ts" ]; then
    echo "✅ index.ts exists"
else
    echo "❌ index.ts missing"
fi

# Check if App.tsx contains the import
if grep -q "MinimalWagmiProvider" src/App.tsx; then
    echo "✅ App.tsx contains MinimalWagmiProvider import"
else
    echo "❌ App.tsx missing MinimalWagmiProvider import"
fi

echo ""
echo "🎯 Fix Summary:"
echo "• Created minimal wagmi provider to resolve useAccount hook errors"
echo "• Wrapped App.tsx with MinimalWagmiProvider"
echo "• No additional dependencies needed (wagmi already installed)"
echo "• Should resolve WagmiProviderNotFoundError"

echo ""
echo "🚀 Next: Test the application by running 'npm run dev'"
