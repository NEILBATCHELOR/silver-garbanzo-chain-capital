#!/bin/bash

# Multi-Sig TypeScript Compilation Fix Script
# This script fixes all TypeScript compilation errors in the multi-sig services

echo "🔧 Fixing Multi-Sig TypeScript Compilation Errors..."

# Define files to fix
FILES=(
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/wallets/multi-sig/MultiSigSigningService.ts"
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/wallets/multi-sig/MultiSigWalletService.ts"
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/wallets/multi-sig/TransactionProposalService.ts"
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/wallets/multi-sig/GnosisSafeService.ts"
)

# Fix 1: Error method calls with empty arrays
echo "1. Fixing error method calls..."
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Fix error calls with empty arrays and ErrorCodes
    sed -i.bak 's/this\.error(\(.*\), \[\], MultiSigErrorCodes\.\([A-Z_]*\))/this.error(\1, "\2", 400)/g' "$file"
    
    # Fix error calls with just empty arrays
    sed -i.bak 's/this\.error(\(.*\), \[\])/this.error(\1, "ERROR", 400)/g' "$file"
    
    echo "   ✅ Fixed error calls in $(basename "$file")"
  fi
done

# Fix 2: logActivity method calls
echo "2. Fixing logActivity method calls..."
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # This is complex, so we'll need to handle manually
    echo "   ⚠️  logActivity calls need manual fixing in $(basename "$file")"
  fi
done

# Fix 3: Type mismatches (null vs undefined)
echo "3. Fixing type mismatches..."
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Fix wallet_id null checks
    sed -i.bak 's/where: { id: proposal\.wallet_id }/where: { id: proposal.wallet_id || "" }/g' "$file"
    
    echo "   ✅ Fixed type mismatches in $(basename "$file")"
  fi
done

# Fix 4: Add null checks for potentially undefined objects
echo "4. Adding null checks..."
# This requires more complex logic, will be handled manually

echo "✅ Basic automated fixes complete!"
echo "⚠️  Manual fixes still needed for:"
echo "   - logActivity method calls"
echo "   - Complex null/undefined checks"
echo "   - Crypto operations"

echo ""
echo "🔧 Run this script to apply basic fixes, then manual cleanup needed."
