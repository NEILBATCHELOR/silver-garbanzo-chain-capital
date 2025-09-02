#!/bin/bash
# Install wallet service dependencies

echo "Installing wallet service dependencies..."

cd backend

# Install BIP libraries for HD wallet functionality
npm install bip39 bip32 bitcoinjs-lib

# Install types
npm install --save-dev @types/bip39 @types/bip32

echo "Dependencies installed successfully!"
echo "Please run this script: npm run scripts/install-wallet-dependencies.sh"
