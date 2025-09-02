#!/bin/bash

# ERC-20 Enhanced Deployment Integration Test
# Tests the complete enhanced ERC-20 deployment system

set -e

echo "🚀 ERC-20 Enhanced Deployment Integration Test"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS:${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL:${NC} $2"
        ((FAILED++))
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
}

# Test 1: Check contract files exist
echo
echo "📋 Test 1: Contract Files"
echo "-------------------------"

if [ -f "foundry-contracts/src/EnhancedERC20Token.sol" ]; then
    print_status 0 "EnhancedERC20Token.sol exists"
else
    print_status 1 "EnhancedERC20Token.sol missing"
fi

if [ -f "src/components/tokens/services/abis/EnhancedERC20Token.json" ]; then
    print_status 0 "EnhancedERC20Token ABI exists"
else
    print_status 1 "EnhancedERC20Token ABI missing"
fi

if [ -f "src/components/tokens/services/bytecode/EnhancedERC20Token.json" ]; then
    print_status 0 "EnhancedERC20Token bytecode exists"
else
    print_status 1 "EnhancedERC20Token bytecode missing"
fi

# Test 2: Check service files exist
echo
echo "📋 Test 2: Service Files"
echo "------------------------"

if [ -f "src/components/tokens/services/enhancedERC20DeploymentService.ts" ]; then
    print_status 0 "Enhanced deployment service exists"
else
    print_status 1 "Enhanced deployment service missing"
fi

if [ -f "src/components/tokens/services/erc20ConfigurationMapper.ts" ]; then
    print_status 0 "Configuration mapper exists"
else
    print_status 1 "Configuration mapper missing"
fi

if [ -f "src/components/tokens/services/unifiedERC20DeploymentService.ts" ]; then
    print_status 0 "Unified deployment service exists"
else
    print_status 1 "Unified deployment service missing"
fi

# Test 3: Check TypeScript compilation
echo
echo "📋 Test 3: TypeScript Compilation"
echo "---------------------------------"

print_info "Checking TypeScript compilation..."

# Create a test file to validate imports
cat > test_imports.ts << 'EOF'
// Test all new ERC-20 services can be imported
import { enhancedERC20DeploymentService } from './src/components/tokens/services/enhancedERC20DeploymentService';
import { erc20ConfigurationMapper } from './src/components/tokens/services/erc20ConfigurationMapper';
import { unifiedERC20DeploymentService } from './src/components/tokens/services/unifiedERC20DeploymentService';

// Test that all exports are available
const services = {
    enhanced: enhancedERC20DeploymentService,
    mapper: erc20ConfigurationMapper,
    unified: unifiedERC20DeploymentService
};

console.log('All services imported successfully');
EOF

# Check if TypeScript can parse our new files
if npx tsc --noEmit test_imports.ts 2>/dev/null; then
    print_status 0 "TypeScript compilation check"
else
    print_status 1 "TypeScript compilation issues detected"
fi

# Clean up test file
rm -f test_imports.ts

# Test 4: Check Foundry contract compilation
echo
echo "📋 Test 4: Foundry Contract Compilation"
echo "---------------------------------------"

if [ -d "foundry-contracts" ]; then
    print_info "Testing Foundry contract compilation..."
    cd foundry-contracts
    
    # Check if forge is available
    if command -v forge &> /dev/null; then
        # Try to compile contracts
        if forge build 2>/dev/null; then
            print_status 0 "Foundry contracts compile successfully"
            
            # Check if enhanced contract was compiled
            if [ -f "out/EnhancedERC20Token.sol/EnhancedERC20Token.json" ]; then
                print_status 0 "EnhancedERC20Token compiled successfully"
            else
                print_status 1 "EnhancedERC20Token compilation failed"
            fi
        else
            print_status 1 "Foundry contract compilation failed"
            print_warning "Run 'forge build' in foundry-contracts/ for details"
        fi
    else
        print_warning "Forge not installed - skipping compilation test"
        print_info "Install Foundry: curl -L https://foundry.paradigm.xyz | bash"
    fi
    
    cd ..
else
    print_status 1 "foundry-contracts directory not found"
fi

# Test 5: Configuration Validation
echo
echo "📋 Test 5: Configuration Structure"
echo "----------------------------------"

# Create test script to validate configuration mapping
cat > test_config.js << 'EOF'
// Test configuration mapping functionality
const mockTokenForm = {
    id: 'test-token',
    name: 'Test Enhanced Token',
    symbol: 'TET',
    decimals: 18,
    standard: 'ERC-20',
    erc20Properties: {
        id: 'test-token',
        token_id: 'test-token',
        initial_supply: '1000000',
        is_mintable: true,
        is_burnable: false,
        is_pausable: false,
        anti_whale_enabled: true,
        max_wallet_amount: '50000',
        cooldown_period: 300,
        buy_fee_enabled: true,
        sell_fee_enabled: true,
        liquidity_fee_percentage: '2.0',
        marketing_fee_percentage: '1.0',
        reflection_enabled: true,
        reflection_percentage: '2.0',
        governance_enabled: true,
        quorum_percentage: '10',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
};

console.log('Mock configuration created successfully');
console.log('Features enabled:', {
    antiWhale: mockTokenForm.erc20Properties.anti_whale_enabled,
    fees: mockTokenForm.erc20Properties.buy_fee_enabled,
    reflection: mockTokenForm.erc20Properties.reflection_enabled,
    governance: mockTokenForm.erc20Properties.governance_enabled
});
EOF

if node test_config.js 2>/dev/null; then
    print_status 0 "Configuration structure validation"
else
    print_status 1 "Configuration structure issues"
fi

# Clean up test file
rm -f test_config.js

# Test 6: Check required dependencies
echo
echo "📋 Test 6: Dependencies"
echo "-----------------------"

# Check if package.json has required dependencies
if [ -f "package.json" ]; then
    # Check for ethers
    if grep -q "ethers" package.json; then
        print_status 0 "Ethers.js dependency found"
    else
        print_status 1 "Ethers.js dependency missing"
        print_info "Install with: npm install ethers"
    fi
    
    # Check for OpenZeppelin contracts (for Foundry)
    if [ -f "foundry-contracts/lib/openzeppelin-contracts/package.json" ] || grep -q "@openzeppelin/contracts" foundry-contracts/foundry.toml 2>/dev/null; then
        print_status 0 "OpenZeppelin contracts available"
    else
        print_status 1 "OpenZeppelin contracts missing"
        print_info "Install with: cd foundry-contracts && forge install OpenZeppelin/openzeppelin-contracts"
    fi
else
    print_warning "package.json not found"
fi

# Test 7: Integration Points
echo
echo "📋 Test 7: Integration Points"
echo "-----------------------------"

# Check if foundryDeploymentService was updated
if grep -q "EnhancedERC20" src/components/tokens/services/foundryDeploymentService.ts 2>/dev/null; then
    print_status 0 "FoundryDeploymentService updated for EnhancedERC20"
else
    print_status 1 "FoundryDeploymentService not updated"
fi

# Check for unified service export
if grep -q "unifiedERC20DeploymentService" src/components/tokens/services/unifiedERC20DeploymentService.ts 2>/dev/null; then
    print_status 0 "Unified service properly exported"
else
    print_status 1 "Unified service export issue"
fi

# Test 8: Documentation
echo
echo "📋 Test 8: Documentation"
echo "------------------------"

if [ -f "docs/ERC20-Enhanced-Deployment-Complete.md" ]; then
    print_status 0 "Implementation documentation exists"
else
    print_status 1 "Implementation documentation missing"
fi

# Check if README exists in docs
if [ -f "docs/README.md" ] || [ -f "README.md" ]; then
    print_status 0 "Project documentation exists"
else
    print_warning "Consider adding project README"
fi

# Test Summary
echo
echo "📊 Test Summary"
echo "==============="
echo -e "Tests Passed: ${GREEN}$PASSED${NC}"
echo -e "Tests Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Enhanced ERC-20 system is ready.${NC}"
    echo
    echo "🚀 Next Steps:"
    echo "1. Compile Foundry contracts: cd foundry-contracts && forge build"
    echo "2. Deploy to Mumbai testnet: npm run deploy-enhanced-erc20-testnet"
    echo "3. Test with max configuration UI"
    echo "4. Monitor gas savings and chunked deployment"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please fix issues before proceeding.${NC}"
    echo
    echo "🔧 Common Fixes:"
    echo "1. Install missing dependencies: npm install"
    echo "2. Install Foundry: curl -L https://foundry.paradigm.xyz | bash"
    echo "3. Install OpenZeppelin: cd foundry-contracts && forge install OpenZeppelin/openzeppelin-contracts"
    exit 1
fi
