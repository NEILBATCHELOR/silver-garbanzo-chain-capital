#!/bin/bash

# Policy Engine Deployment Script
# This script automates the deployment of PolicyEngine and PolicyProtectedToken contracts

set -e  # Exit on error

echo "🚀 Chain Capital Policy Engine Deployment Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Step 1: Check Foundry installation
echo -e "\n📋 Checking prerequisites..."
if command_exists forge; then
    print_success "Foundry is installed"
    forge --version
else
    print_error "Foundry is not installed"
    echo "Please install Foundry first:"
    echo "curl -L https://foundry.paradigm.xyz | bash"
    echo "foundryup"
    exit 1
fi

# Step 2: Check for .env file
if [ ! -f .env ]; then
    print_warning ".env file not found"
    
    if [ -f .env.deployment ]; then
        echo "Creating .env from template..."
        cp .env.deployment .env
        print_success ".env file created from template"
        print_warning "Please edit .env with your values before continuing"
        exit 1
    else
        print_error ".env.deployment template not found"
        exit 1
    fi
fi

# Step 3: Source environment variables
source .env

# Check required environment variables
required_vars=(
    "DEPLOYER_PRIVATE_KEY"
    "ADMIN_ADDRESS"
    "MINTER_ADDRESS"
    "BURNER_ADDRESS"
    "BLOCKER_ADDRESS"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

# Step 4: Select network
echo -e "\n🌐 Select deployment network:"
echo "1) Local (Anvil)"
echo "2) Sepolia Testnet"
echo "3) Mainnet"
read -p "Enter choice (1-3): " network_choice

case $network_choice in
    1)
        NETWORK="local"
        RPC_URL="http://localhost:8545"
        CHAIN_ID="31337"
        echo "Selected: Local network"
        
        # Check if anvil is running
        if ! nc -z localhost 8545 2>/dev/null; then
            print_warning "Anvil not running. Starting anvil..."
            anvil &
            ANVIL_PID=$!
            sleep 3
        fi
        ;;
    2)
        NETWORK="sepolia"
        RPC_URL="${SEPOLIA_RPC_URL}"
        CHAIN_ID="11155111"
        echo "Selected: Sepolia testnet"
        
        if [ -z "$RPC_URL" ]; then
            print_error "SEPOLIA_RPC_URL not set in .env"
            exit 1
        fi
        ;;
    3)
        NETWORK="mainnet"
        RPC_URL="${MAINNET_RPC_URL}"
        CHAIN_ID="1"
        echo "Selected: Mainnet"
        
        if [ -z "$RPC_URL" ]; then
            print_error "MAINNET_RPC_URL not set in .env"
            exit 1
        fi
        
        print_warning "⚠️  MAINNET DEPLOYMENT - This will use REAL ETH!"
        read -p "Type 'DEPLOY TO MAINNET' to confirm: " confirmation
        if [ "$confirmation" != "DEPLOY TO MAINNET" ]; then
            echo "Deployment cancelled"
            exit 0
        fi
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Step 5: Compile contracts
echo -e "\n🔨 Compiling contracts..."
forge build

if [ $? -eq 0 ]; then
    print_success "Contracts compiled successfully"
else
    print_error "Compilation failed"
    exit 1
fi

# Step 6: Run tests (optional)
read -p "Run tests before deployment? (y/n): " run_tests
if [ "$run_tests" = "y" ]; then
    echo -e "\n🧪 Running tests..."
    forge test
    
    if [ $? -eq 0 ]; then
        print_success "All tests passed"
    else
        print_error "Tests failed"
        read -p "Continue with deployment anyway? (y/n): " continue_deploy
        if [ "$continue_deploy" != "y" ]; then
            exit 1
        fi
    fi
fi

# Step 7: Deploy contracts
echo -e "\n🚀 Deploying contracts to $NETWORK..."

# Prepare deployment command
DEPLOY_CMD="forge script script/DeployPolicyEngine.s.sol --rpc-url $RPC_URL --broadcast"

# Add verification for non-local networks
if [ "$NETWORK" != "local" ]; then
    if [ ! -z "$ETHERSCAN_API_KEY" ]; then
        DEPLOY_CMD="$DEPLOY_CMD --verify"
    else
        print_warning "ETHERSCAN_API_KEY not set - contracts won't be verified"
    fi
fi

# Execute deployment
echo "Executing: $DEPLOY_CMD"
eval $DEPLOY_CMD

if [ $? -eq 0 ]; then
    print_success "Contracts deployed successfully!"
else
    print_error "Deployment failed"
    exit 1
fi

# Step 8: Extract deployed addresses from broadcast files
BROADCAST_FILE="broadcast/DeployPolicyEngine.s.sol/$CHAIN_ID/run-latest.json"

if [ -f "$BROADCAST_FILE" ]; then
    echo -e "\n📝 Extracting deployed addresses..."
    
    # Extract addresses using jq if available, otherwise use grep
    if command_exists jq; then
        POLICY_ENGINE_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "PolicyEngine") | .contractAddress' $BROADCAST_FILE)
        TOKEN_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "EnhancedERC20Token") | .contractAddress' $BROADCAST_FILE)
    else
        print_warning "jq not installed - using grep to extract addresses"
        POLICY_ENGINE_ADDRESS=$(grep -A 1 "PolicyEngine" $BROADCAST_FILE | grep "contractAddress" | cut -d'"' -f4 | head -1)
        TOKEN_ADDRESS=$(grep -A 1 "EnhancedERC20Token" $BROADCAST_FILE | grep "contractAddress" | cut -d'"' -f4 | head -1)
    fi
    
    # Save addresses to file
    ADDRESSES_FILE="deployed_addresses_${NETWORK}.txt"
    echo "Network: $NETWORK" > $ADDRESSES_FILE
    echo "Chain ID: $CHAIN_ID" >> $ADDRESSES_FILE
    echo "Deployment Date: $(date)" >> $ADDRESSES_FILE
    echo "PolicyEngine: $POLICY_ENGINE_ADDRESS" >> $ADDRESSES_FILE
    echo "Token: $TOKEN_ADDRESS" >> $ADDRESSES_FILE
    
    print_success "Addresses saved to $ADDRESSES_FILE"
    
    # Display addresses
    echo -e "\n🎉 Deployment Summary:"
    echo "========================"
    echo "PolicyEngine Address: $POLICY_ENGINE_ADDRESS"
    echo "Token Address: $TOKEN_ADDRESS"
    echo "========================"
    
    # Create TypeScript config update
    echo -e "\n📄 Update your frontend config with these addresses:"
    echo "----------------------------------------"
    cat << EOF
// frontend/src/config/contracts.ts
export const CONTRACT_ADDRESSES = {
  ${NETWORK}: {
    policyEngine: "$POLICY_ENGINE_ADDRESS",
    token: "$TOKEN_ADDRESS"
  }
};
EOF
    echo "----------------------------------------"
    
else
    print_warning "Could not find broadcast file to extract addresses"
    echo "Please check the deployment output above for contract addresses"
fi

# Step 9: Verify contracts on Etherscan (if not done during deployment)
if [ "$NETWORK" != "local" ] && [ ! -z "$ETHERSCAN_API_KEY" ]; then
    read -p "Manually verify contracts on Etherscan? (y/n): " verify_contracts
    if [ "$verify_contracts" = "y" ]; then
        echo "Verifying PolicyEngine..."
        forge verify-contract \
            --chain-id $CHAIN_ID \
            --compiler-version v0.8.20 \
            $POLICY_ENGINE_ADDRESS \
            src/PolicyEngine.sol:PolicyEngine
            
        echo "Verifying Token..."
        forge verify-contract \
            --chain-id $CHAIN_ID \
            --compiler-version v0.8.20 \
            $TOKEN_ADDRESS \
            src/EnhancedERC20Token.sol:EnhancedERC20Token
    fi
fi

# Step 10: Test deployed contracts
echo -e "\n🔍 Testing deployed contracts..."
if [ "$NETWORK" != "local" ]; then
    # Test PolicyEngine
    echo "Checking PolicyEngine..."
    cast call $POLICY_ENGINE_ADDRESS "DEFAULT_ADMIN_ROLE()" --rpc-url $RPC_URL
    
    # Test Token
    echo "Checking Token..."
    cast call $TOKEN_ADDRESS "name()" --rpc-url $RPC_URL
    cast call $TOKEN_ADDRESS "symbol()" --rpc-url $RPC_URL
    cast call $TOKEN_ADDRESS "totalSupply()" --rpc-url $RPC_URL
fi

# Cleanup
if [ ! -z "$ANVIL_PID" ]; then
    echo -e "\n🧹 Stopping local anvil..."
    kill $ANVIL_PID
fi

echo -e "\n✨ Deployment script completed!"
echo "Next steps:"
echo "1. Update frontend configuration with contract addresses"
echo "2. Configure policies using cast commands"
echo "3. Test all operations on the deployed contracts"
echo "4. Set up monitoring and alerts"

# Display useful commands
echo -e "\n📚 Useful commands:"
echo "----------------------------------------"
echo "# Check balance:"
echo "cast call $TOKEN_ADDRESS \"balanceOf(address)\" 0xYOUR_ADDRESS --rpc-url $RPC_URL"
echo ""
echo "# Mint tokens (requires MINTER_ROLE):"
echo "cast send $TOKEN_ADDRESS \"mint(address,uint256)\" 0xRECIPIENT 1000000000000000000000 --rpc-url $RPC_URL --private-key \$MINTER_KEY"
echo ""
echo "# Check policy:"
echo "cast call $POLICY_ENGINE_ADDRESS \"getPolicy(address,string)\" $TOKEN_ADDRESS \"mint\" --rpc-url $RPC_URL"
echo "----------------------------------------"
