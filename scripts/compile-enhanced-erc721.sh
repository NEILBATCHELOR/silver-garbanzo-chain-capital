#!/bin/bash

# Compile Enhanced ERC721 Contract and Generate Artifacts
# Usage: ./scripts/compile-enhanced-erc721.sh

set -e

echo "🔨 Compiling Enhanced ERC721 Contract..."

# Check if we have foundry available
if ! command -v forge &> /dev/null; then
    echo "⚠️ Forge not found, skipping compilation"
    echo "Using existing compiled artifacts..."
    
    # Check if artifacts already exist
    if [ -f "foundry-contracts/out/EnhancedERC721Token.sol/EnhancedERC721Token.json" ]; then
        echo "✅ Found existing compiled contract"
    else
        echo "❌ No compiled artifacts found. Please install Foundry and run 'forge build' in foundry-contracts/"
        exit 1
    fi
else
    # Navigate to foundry contracts directory
    cd foundry-contracts
    
    # Compile the enhanced contract
    echo "Compiling EnhancedERC721Token.sol..."
    forge build
    
    # Check if compilation was successful
    if [ ! -d "out/EnhancedERC721Token.sol" ]; then
        echo "❌ Compilation failed - out/EnhancedERC721Token.sol not found"
        exit 1
    fi
    
    echo "✅ Compilation successful!"
    cd ..
fi

# Create target directories
echo "Creating target directories..."
mkdir -p src/components/tokens/services/abis
mkdir -p src/components/tokens/services/bytecode

# Copy ABI
echo "Copying ABI..."
cp foundry-contracts/out/EnhancedERC721Token.sol/EnhancedERC721Token.json src/components/tokens/services/abis/

# Extract and copy bytecode
echo "Extracting bytecode..."
jq '.bytecode.object' foundry-contracts/out/EnhancedERC721Token.sol/EnhancedERC721Token.json > src/components/tokens/services/bytecode/EnhancedERC721Token.json

# Verify files were created
if [ -f "src/components/tokens/services/abis/EnhancedERC721Token.json" ]; then
    echo "✅ ABI copied successfully"
else
    echo "❌ Failed to copy ABI"
    exit 1
fi

if [ -f "src/components/tokens/services/bytecode/EnhancedERC721Token.json" ]; then
    echo "✅ Bytecode extracted successfully"
else
    echo "❌ Failed to extract bytecode"
    exit 1
fi

echo ""
echo "🎉 Enhanced ERC721 compilation complete!"
echo ""
echo "Files generated:"
echo "  📄 src/components/tokens/services/abis/EnhancedERC721Token.json"
echo "  📄 src/components/tokens/services/bytecode/EnhancedERC721Token.json"
echo ""
echo "Next steps:"
echo "  1. Test deployment: npm run test:erc721-enhanced"
echo "  2. Deploy to testnet: npm run deploy:erc721-testnet"
echo ""
