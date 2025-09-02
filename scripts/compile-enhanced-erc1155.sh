#!/bin/bash

# Enhanced ERC1155 Contract Compilation Script
# This script compiles the EnhancedERC1155Token contract and copies artifacts

set -e

echo "🔧 Compiling Enhanced ERC1155 Token Contract..."

# Check if we're in the correct directory
if [ ! -f "foundry-contracts/src/EnhancedERC1155Token.sol" ]; then
    echo "❌ Error: EnhancedERC1155Token.sol not found. Are you in the project root?"
    exit 1
fi

# Create output directories
mkdir -p src/components/tokens/services/abis
mkdir -p src/components/tokens/services/bytecode

# Navigate to foundry directory
cd foundry-contracts

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo "⚠️  Warning: Foundry not installed. Using existing artifacts..."
    cd ..
    
    # Verify existing artifacts exist and are valid
    if [ -f "src/components/tokens/services/abis/EnhancedERC1155Token.json" ] && \
       [ -f "src/components/tokens/services/bytecode/EnhancedERC1155Token.json" ]; then
        echo "✅ Using existing contract artifacts"
        echo "📝 Note: Install Foundry for fresh compilation:"
        echo "   curl -L https://foundry.paradigm.xyz | bash"
        echo "   foundryup"
        exit 0
    else
        echo "❌ Error: No valid artifacts found and Foundry not installed"
        exit 1
    fi
fi

echo "🏗️  Building contract with Foundry..."

# Clean and build
forge clean
forge build

# Check if build was successful
if [ ! -d "out/EnhancedERC1155Token.sol" ]; then
    echo "❌ Error: Contract compilation failed"
    exit 1
fi

echo "📁 Copying artifacts to services directory..."

# Copy ABI
if [ -f "out/EnhancedERC1155Token.sol/EnhancedERC1155Token.json" ]; then
    # Extract ABI from the compiled artifact
    jq '.abi' out/EnhancedERC1155Token.sol/EnhancedERC1155Token.json > ../src/components/tokens/services/abis/EnhancedERC1155Token.json
    
    # Extract bytecode
    jq '{
        object: .bytecode.object,
        sourceMap: .bytecode.sourceMap,
        linkReferences: .bytecode.linkReferences,
        immutableReferences: (.deployedBytecode.immutableReferences // {})
    }' out/EnhancedERC1155Token.sol/EnhancedERC1155Token.json > ../src/components/tokens/services/bytecode/EnhancedERC1155Token.json
    
    echo "✅ ABI and bytecode copied successfully"
else
    echo "❌ Error: Compiled artifact not found"
    exit 1
fi

# Return to project root
cd ..

# Validate JSON files
echo "🔍 Validating JSON files..."

if jq empty src/components/tokens/services/abis/EnhancedERC1155Token.json 2>/dev/null; then
    echo "✅ ABI JSON is valid"
else
    echo "❌ Error: ABI JSON is invalid"
    exit 1
fi

if jq empty src/components/tokens/services/bytecode/EnhancedERC1155Token.json 2>/dev/null; then
    echo "✅ Bytecode JSON is valid"
else
    echo "❌ Error: Bytecode JSON is invalid"
    exit 1
fi

echo "🎉 Enhanced ERC1155 Token compilation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the deployment integration: npm run test:erc1155-enhanced"
echo "   2. Deploy to testnet: npm run deploy:erc1155-testnet"
echo "   3. Update foundryDeploymentService.ts with EnhancedERC1155 support"
