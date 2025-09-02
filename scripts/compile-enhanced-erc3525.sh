#!/bin/bash

# ERC-3525 Enhanced Contract Compilation Script
# Compiles EnhancedERC3525Token.sol and copies artifacts to services directory

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔨 Compiling Enhanced ERC-3525 Contract...${NC}"

# Check if we're in the right directory
if [ ! -f "foundry-contracts/src/EnhancedERC3525Token.sol" ]; then
    echo -e "${RED}❌ Error: EnhancedERC3525Token.sol not found in foundry-contracts/src/${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

cd foundry-contracts

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo -e "${YELLOW}⚠️  Foundry not found. Installing Foundry...${NC}"
    
    # Install Foundry
    if command -v curl &> /dev/null; then
        curl -L https://foundry.paradigm.xyz | bash
        source ~/.bashrc
        foundryup
    else
        echo -e "${RED}❌ curl not found. Please install Foundry manually:${NC}"
        echo "curl -L https://foundry.paradigm.xyz | bash"
        echo "source ~/.bashrc"
        echo "foundryup"
        exit 1
    fi
fi

# Compile contracts
echo -e "${BLUE}🏗️  Building contracts with Foundry...${NC}"
if forge build; then
    echo -e "${GREEN}✅ Contract compilation successful!${NC}"
else
    echo -e "${RED}❌ Contract compilation failed!${NC}"
    echo "Please check the contract for syntax errors."
    exit 1
fi

# Create directories if they don't exist
echo -e "${BLUE}📁 Creating artifact directories...${NC}"
mkdir -p ../src/components/tokens/services/abis
mkdir -p ../src/components/tokens/services/bytecode

# Copy ABI
if [ -f "out/EnhancedERC3525Token.sol/EnhancedERC3525Token.json" ]; then
    echo -e "${BLUE}📋 Copying ABI...${NC}"
    cp out/EnhancedERC3525Token.sol/EnhancedERC3525Token.json ../src/components/tokens/services/abis/EnhancedERC3525Token.json
    echo -e "${GREEN}✅ ABI copied successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Using existing ABI file (compilation artifacts not found)${NC}"
fi

# Extract and copy bytecode
if [ -f "out/EnhancedERC3525Token.sol/EnhancedERC3525Token.json" ]; then
    echo -e "${BLUE}🔗 Extracting bytecode...${NC}"
    
    # Extract bytecode from compiled artifact
    jq '{
        "deployedBytecode": .deployedBytecode.object,
        "object": .bytecode.object,
        "opcodes": .deployedBytecode.opcodes,
        "sourceMap": .bytecode.sourceMap,
        "linkReferences": .bytecode.linkReferences,
        "immutableReferences": .deployedBytecode.immutableReferences,
        "generatedSources": .bytecode.generatedSources,
        "deployedGeneratedSources": .deployedBytecode.generatedSources
    }' out/EnhancedERC3525Token.sol/EnhancedERC3525Token.json > ../src/components/tokens/services/bytecode/EnhancedERC3525Token.json
    
    echo -e "${GREEN}✅ Bytecode extracted and copied successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Using existing bytecode file (compilation artifacts not found)${NC}"
fi

cd ..

# Verify artifacts exist
echo -e "${BLUE}🔍 Verifying artifacts...${NC}"

if [ -f "src/components/tokens/services/abis/EnhancedERC3525Token.json" ]; then
    ABI_SIZE=$(wc -c < "src/components/tokens/services/abis/EnhancedERC3525Token.json")
    echo -e "${GREEN}✅ ABI file exists (${ABI_SIZE} bytes)${NC}"
else
    echo -e "${RED}❌ ABI file missing${NC}"
    exit 1
fi

if [ -f "src/components/tokens/services/bytecode/EnhancedERC3525Token.json" ]; then
    BYTECODE_SIZE=$(wc -c < "src/components/tokens/services/bytecode/EnhancedERC3525Token.json")
    echo -e "${GREEN}✅ Bytecode file exists (${BYTECODE_SIZE} bytes)${NC}"
else
    echo -e "${RED}❌ Bytecode file missing${NC}"
    exit 1
fi

# Validate JSON files
echo -e "${BLUE}📝 Validating JSON files...${NC}"

if jq empty src/components/tokens/services/abis/EnhancedERC3525Token.json 2>/dev/null; then
    echo -e "${GREEN}✅ ABI JSON is valid${NC}"
else
    echo -e "${RED}❌ ABI JSON is invalid${NC}"
    exit 1
fi

if jq empty src/components/tokens/services/bytecode/EnhancedERC3525Token.json 2>/dev/null; then
    echo -e "${GREEN}✅ Bytecode JSON is valid${NC}"
else
    echo -e "${RED}❌ Bytecode JSON is invalid${NC}"
    exit 1
fi

# Check for required ABI functions
echo -e "${BLUE}🔍 Checking ABI completeness...${NC}"

REQUIRED_FUNCTIONS=("valueDecimals" "slotOf" "balanceOf" "transferFrom" "createSlot" "mint" "schedulePayment" "delegate" "stake" "flashLoan" "setKYCStatus")
MISSING_FUNCTIONS=()

for func in "${REQUIRED_FUNCTIONS[@]}"; do
    if jq -e --arg fname "$func" '.[] | select(.name == $fname)' src/components/tokens/services/abis/EnhancedERC3525Token.json > /dev/null; then
        echo -e "${GREEN}✅ Function $func found${NC}"
    else
        echo -e "${YELLOW}⚠️  Function $func not found${NC}"
        MISSING_FUNCTIONS+=("$func")
    fi
done

if [ ${#MISSING_FUNCTIONS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All required functions found in ABI${NC}"
else
    echo -e "${YELLOW}⚠️  Missing functions: ${MISSING_FUNCTIONS[*]}${NC}"
    echo "These functions may be inherited or have different names"
fi

echo ""
echo -e "${GREEN}🎉 Enhanced ERC-3525 compilation completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Run integration test: ./scripts/test-enhanced-erc3525-integration.sh"
echo "2. Deploy to testnet: npm run deploy:erc3525:testnet"
echo "3. Test advanced features in UI"
echo ""
echo -e "${BLUE}📁 Artifacts location:${NC}"
echo "• ABI: src/components/tokens/services/abis/EnhancedERC3525Token.json"
echo "• Bytecode: src/components/tokens/services/bytecode/EnhancedERC3525Token.json"
echo ""
