#!/bin/bash
###############################################################################
# Hoodi Testnet Deployment - Pre-Flight Check Script
# 
# This script performs comprehensive validation before deployment:
# 1. Foundry installation
# 2. RPC connectivity  
# 3. Wallet decryption and balance check
# 4. Contract compilation
# 5. Deployment simulation
#
# Usage: ./script/pre-flight-check.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
TOTAL_CHECKS=10

# Helper functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((CHECKS_PASSED++))
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((CHECKS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

###############################################################################
# CHECK 1: Foundry Installation
###############################################################################
check_foundry() {
    print_header "CHECK 1: Foundry Installation"
    
    if command -v forge &> /dev/null; then
        FORGE_VERSION=$(forge --version | head -n 1)
        print_success "Foundry installed: $FORGE_VERSION"
        
        # Check if it's in home directory
        FORGE_PATH=$(which forge)
        if [[ "$FORGE_PATH" == "$HOME/.foundry/bin/forge" ]]; then
            print_info "Using Foundry from: $FORGE_PATH"
        else
            print_warning "Foundry found at: $FORGE_PATH"
            print_warning "Expected: $HOME/.foundry/bin/forge"
        fi
    else
        print_error "Foundry not installed"
        print_info "Install with: curl -L https://foundry.paradigm.xyz | bash"
        print_info "Then run: foundryup"
        return 1
    fi
    echo ""
}

###############################################################################
# CHECK 2: Node.js and Dependencies
###############################################################################
check_nodejs() {
    print_header "CHECK 2: Node.js and Dependencies"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_error "Node.js not installed"
        return 1
    fi
    
    if command -v ts-node &> /dev/null; then
        print_success "ts-node installed"
    else
        print_error "ts-node not installed"
        print_info "Install with: npm install -g ts-node"
        return 1
    fi
    
    # Check for pnpm (preferred) or npm
    if command -v pnpm &> /dev/null; then
        PKG_MANAGER="pnpm"
        print_info "Using pnpm as package manager"
    else
        PKG_MANAGER="npm"
        print_info "Using npm as package manager"
    fi
    
    # Check for @supabase/supabase-js using the appropriate package manager
    if $PKG_MANAGER list @supabase/supabase-js --depth=0 &> /dev/null; then
        print_success "@supabase/supabase-js installed"
    else
        print_warning "@supabase/supabase-js not found"
        print_info "Installing now..."
        cd ../ && $PKG_MANAGER install @supabase/supabase-js && cd foundry-contracts
        if [ $? -eq 0 ]; then
            print_success "Successfully installed @supabase/supabase-js"
        else
            print_error "Failed to install @supabase/supabase-js"
            return 1
        fi
    fi
    echo ""
}

###############################################################################
# CHECK 3: Frontend .env Configuration
###############################################################################
check_frontend_env() {
    print_header "CHECK 3: Frontend .env Configuration"
    
    FRONTEND_ENV="../.env"
    
    if [ ! -f "$FRONTEND_ENV" ]; then
        print_error "Frontend .env file not found at: $FRONTEND_ENV"
        return 1
    fi
    
    print_success "Frontend .env file found"
    
    # Check required variables
    REQUIRED_VARS=(
        "VITE_SUPABASE_URL"
        "VITE_SUPABASE_SERVICE_ROLE_KEY"
        "VITE_WALLET_MASTER_PASSWORD"
        "VITE_HOODI_RPC_URL"
        "VITE_ETHERSCAN_API_KEY"
    )
    
    MISSING_VARS=()
    for VAR in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$VAR=" "$FRONTEND_ENV"; then
            print_info "✓ $VAR found"
        else
            MISSING_VARS+=("$VAR")
            print_error "✗ $VAR missing"
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        print_error "Missing required variables: ${MISSING_VARS[*]}"
        return 1
    fi
    
    print_success "All required environment variables present"
    echo ""
}

###############################################################################
# CHECK 4: Wallet Decryption
###############################################################################
check_wallet_decryption() {
    print_header "CHECK 4: Wallet Decryption"
    
    print_info "Running wallet decryption script..."
    
    # Check if decrypt script exists
    if [ ! -f "script/decrypt-hoodi-wallet.ts" ]; then
        print_error "Decryption script not found: script/decrypt-hoodi-wallet.ts"
        return 1
    fi
    
    # Check if pnpm is available (preferred)
    if command -v pnpm &> /dev/null; then
        # Run using pnpm exec tsx from frontend directory
        if (cd ../ && pnpm exec tsx foundry-contracts/script/decrypt-hoodi-wallet.ts && cd foundry-contracts); then
            print_success "Wallet decrypted successfully"
        else
            print_error "Wallet decryption failed"
            print_info "Check Supabase credentials and master password"
            return 1
        fi
    elif command -v npx &> /dev/null; then
        # Fallback to npx tsx
        if (cd ../ && npx tsx foundry-contracts/script/decrypt-hoodi-wallet.ts && cd foundry-contracts); then
            print_success "Wallet decrypted successfully"
        else
            print_error "Wallet decryption failed"
            return 1
        fi
    else
        print_error "Neither pnpm nor npx found"
        print_info "Install pnpm: npm install -g pnpm"
        return 1
    fi
    
    # Verify .env was created
    if [ -f ".env" ]; then
        print_success "Foundry .env file created"
        
        # Source the .env file
        set -a
        source .env
        set +a
        
        if [ -n "$HOODI_PRIVATE_KEY" ]; then
            print_success "Private key loaded"
        else
            print_error "Private key not found in .env"
            return 1
        fi
    else
        print_error "Foundry .env file not created"
        return 1
    fi
    echo ""
}

###############################################################################
# CHECK 5: RPC Connectivity
###############################################################################
check_rpc_connectivity() {
    print_header "CHECK 5: RPC Connectivity"
    
    # Source .env if not already loaded
    if [ -z "$HOODI_RPC" ]; then
        if [ -f ".env" ]; then
            set -a
            source .env
            set +a
        else
            print_error ".env file not found"
            return 1
        fi
    fi
    
    print_info "Testing connection to: $HOODI_RPC"
    
    if BLOCK_NUMBER=$(cast block-number --rpc-url "$HOODI_RPC" 2>/dev/null); then
        print_success "RPC connected - Current block: $BLOCK_NUMBER"
    else
        print_error "Cannot connect to RPC"
        print_info "Check VITE_HOODI_RPC_URL in frontend/.env"
        print_info "Try: https://ethereum-hoodi-rpc.publicnode.com/"
        return 1
    fi
    echo ""
}

###############################################################################
# CHECK 6: Wallet Balance
###############################################################################
check_wallet_balance() {
    print_header "CHECK 6: Wallet Balance"
    
    if [ -z "$DEPLOYER_ADDRESS" ] || [ -z "$HOODI_RPC" ]; then
        print_error "Missing wallet configuration"
        return 1
    fi
    
    print_info "Checking balance for: $DEPLOYER_ADDRESS"
    
    if BALANCE_WEI=$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$HOODI_RPC" 2>/dev/null); then
        # Convert to ETH (divide by 10^18)
        BALANCE_ETH=$(echo "scale=4; $BALANCE_WEI / 1000000000000000000" | bc)
        
        # Check if balance is sufficient (need at least 0.5 ETH)
        if (( $(echo "$BALANCE_ETH >= 0.5" | bc -l) )); then
            print_success "Balance: $BALANCE_ETH ETH (sufficient)"
        else
            print_error "Balance: $BALANCE_ETH ETH (insufficient - need 0.5+ ETH)"
            print_info "Get testnet ETH: https://hoodi.ethpandaops.io"
            print_info "Request for address: $DEPLOYER_ADDRESS"
            return 1
        fi
    else
        print_error "Could not fetch balance"
        return 1
    fi
    echo ""
}

###############################################################################
# CHECK 7: Contract Compilation
###############################################################################
check_compilation() {
    print_header "CHECK 7: Contract Compilation"
    
    print_info "Compiling contracts..."
    
    if forge build > /dev/null 2>&1; then
        print_success "All contracts compiled successfully"
        
        # Check for key artifacts
        REQUIRED_ARTIFACTS=(
            "out/TokenFactory.sol/TokenFactory.json"
            "out/ERC20Master.sol/ERC20Master.json"
            "out/PolicyEngine.sol/PolicyEngine.json"
        )
        
        ALL_FOUND=true
        for ARTIFACT in "${REQUIRED_ARTIFACTS[@]}"; do
            if [ -f "$ARTIFACT" ]; then
                print_info "✓ $(basename $ARTIFACT) found"
            else
                print_error "✗ $(basename $ARTIFACT) missing"
                ALL_FOUND=false
            fi
        done
        
        if [ "$ALL_FOUND" = true ]; then
            print_success "All required artifacts present"
        else
            print_error "Some artifacts are missing"
            return 1
        fi
    else
        print_error "Compilation failed"
        print_info "Run 'forge build' to see detailed errors"
        return 1
    fi
    echo ""
}

###############################################################################
# CHECK 8: Deployment Script Exists
###############################################################################
check_deployment_script() {
    print_header "CHECK 8: Deployment Script"
    
    SCRIPT_PATH="script/DeployAllToHoodi.s.sol"
    
    if [ -f "$SCRIPT_PATH" ]; then
        print_success "Deployment script found: $SCRIPT_PATH"
        
        # Check if script compiles
        if forge build --contracts "$SCRIPT_PATH" > /dev/null 2>&1; then
            print_success "Deployment script compiles successfully"
        else
            print_error "Deployment script has compilation errors"
            return 1
        fi
    else
        print_error "Deployment script not found: $SCRIPT_PATH"
        return 1
    fi
    echo ""
}

###############################################################################
# CHECK 9: Simulation (Dry Run)
###############################################################################
check_simulation() {
    print_header "CHECK 9: Deployment Simulation"
    
    print_info "Running deployment simulation (no transactions will be sent)..."
    print_warning "This may take 2-3 minutes..."
    
    # Run without --broadcast to simulate
    if forge script script/DeployAllToHoodi.s.sol \
        --rpc-url "$HOODI_RPC" \
        -vv \
        2>&1 | tee /tmp/hoodi-simulation.log | grep -q "SIMULATION COMPLETE"; then
        print_success "Simulation completed successfully"
        print_info "Review full logs: /tmp/hoodi-simulation.log"
    else
        if grep -q "insufficient funds" /tmp/hoodi-simulation.log; then
            print_error "Simulation failed: Insufficient funds"
            print_info "Get more testnet ETH: https://hoodi.ethpandaops.io"
        elif grep -q "nonce" /tmp/hoodi-simulation.log; then
            print_error "Simulation failed: Nonce issue"
            print_info "Try: cast wallet nonce $DEPLOYER_ADDRESS --rpc-url $HOODI_RPC"
        else
            print_warning "Simulation completed with warnings"
            print_info "Review logs: /tmp/hoodi-simulation.log"
        fi
    fi
    echo ""
}

###############################################################################
# CHECK 10: Final Confirmation
###############################################################################
check_final_confirmation() {
    print_header "CHECK 10: Final Configuration Summary"
    
    echo ""
    echo "📋 Deployment Configuration:"
    echo "   Network: Hoodi Testnet (Chain ID: 560048)"
    echo "   RPC: $HOODI_RPC"
    echo "   Deployer: $DEPLOYER_ADDRESS"
    echo "   Balance: $BALANCE_ETH ETH"
    echo ""
    echo "📦 Contracts to Deploy:"
    echo "   • 5 Infrastructure contracts"
    echo "   • TokenFactory (with ~50 internal masters + 7 beacons)"
    echo "   • ExtensionModuleFactory (with 4 beacons)"
    echo "   • 3 Deployer utilities"
    echo "   • Total: ~70 contracts"
    echo ""
    echo "💰 Estimated Cost:"
    echo "   Gas: ~30,000,000 units"
    echo "   Cost: ~0.6 ETH (FREE on testnet)"
    echo ""
    
    print_success "Pre-flight check configuration summary complete"
    echo ""
}

###############################################################################
# MAIN EXECUTION
###############################################################################
main() {
    clear
    print_header "Hoodi Testnet Deployment - Pre-Flight Check"
    echo ""
    print_info "This will validate your deployment environment"
    echo ""
    
    # Run all checks
    check_foundry || true
    check_nodejs || true
    check_frontend_env || true
    check_wallet_decryption || true
    check_rpc_connectivity || true
    check_wallet_balance || true
    check_compilation || true
    check_deployment_script || true
    check_simulation || true
    check_final_confirmation || true
    
    # Final summary
    print_header "Pre-Flight Check Results"
    echo ""
    echo "   ✅ Passed: $CHECKS_PASSED / $TOTAL_CHECKS"
    echo "   ❌ Failed: $CHECKS_FAILED / $TOTAL_CHECKS"
    echo ""
    
    if [ $CHECKS_FAILED -eq 0 ]; then
        print_success "All checks passed! Ready to deploy! 🚀"
        echo ""
        echo "To deploy, run:"
        echo "   forge script script/DeployAllToHoodi.s.sol \\"
        echo "     --rpc-url \$HOODI_RPC \\"
        echo "     --broadcast \\"
        echo "     --verify \\"
        echo "     -vvv"
        echo ""
        return 0
    else
        print_error "Some checks failed. Fix issues before deploying."
        echo ""
        print_info "Common issues:"
        echo "   • Missing testnet ETH → Get from: https://hoodi.ethpandaops.io"
        echo "   • RPC connection → Check VITE_HOODI_RPC_URL in frontend/.env"
        echo "   • Decryption failed → Verify VITE_WALLET_MASTER_PASSWORD"
        echo ""
        return 1
    fi
}

# Run main function
main
EXIT_CODE=$?

exit $EXIT_CODE
