#!/bin/bash
# Install wallet service dependencies using pnpm

echo "🔧 Installing wallet service dependencies with pnpm..."

cd backend

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

echo "📦 Installing BIP libraries for HD wallet functionality..."

# Install BIP libraries for HD wallet functionality
pnpm add bip39 bip32 bitcoinjs-lib

echo "📝 Installing TypeScript type definitions..."

# Install types
pnpm add -D @types/bip39 @types/bip32

echo "✅ Dependencies installed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Verify TypeScript compilation: pnpm run type-check"
echo "2. Test wallet services: pnpm run test:wallets"
echo ""
echo "📚 Installed packages:"
echo "  - bip39: BIP39 mnemonic phrase generation/validation"
echo "  - bip32: BIP32 hierarchical deterministic wallets"
echo "  - bitcoinjs-lib: Bitcoin address generation"
echo "  - @types/bip39: TypeScript definitions for bip39"
echo "  - @types/bip32: TypeScript definitions for bip32"
