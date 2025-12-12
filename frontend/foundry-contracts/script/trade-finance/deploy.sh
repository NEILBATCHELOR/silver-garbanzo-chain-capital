#!/bin/bash

# Trade Finance Deployment Script
# Universal deployment to any supported network

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  $1${NC}"
    echo -e "${GREEN}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check forge
    if ! command -v forge &> /dev/null; then
        print_error "Foundry not installed. Install from https://book.getfoundry.sh/"
        exit 1
    fi
    print_success "Foundry installed"
    
    # Check .env
    if [ ! -f .env ]; then
        print_error ".env file not found. Copy .env.example and fill in values"
        exit 1
    fi
    print_success ".env file found"
    
    # Source .env
    source .env
    
    # Check required vars
    if [ -z "$DEPLOYER_ADDRESS" ]; then
        print_error "DEPLOYER_ADDRESS not set in .env"
        exit 1
    fi
    print_success "DEPLOYER_ADDRESS: $DEPLOYER_ADDRESS"
    
    if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
        print_error "DEPLOYER_PRIVATE_KEY not set in .env"
        exit 1
    fi
    print_success "DEPLOYER_PRIVATE_KEY configured"
}

# Select network
select_network() {
    print_header "Select Network"
    
    echo "Mainnet:"
    echo "  1) Ethereum Mainnet"
    echo ""
    echo "Testnet:"
    echo "  2) Sepolia"
    echo "  3) Base Sepolia"
    echo "  4) Arbitrum Sepolia"
    echo "  5) Optimism Sepolia"
    echo "  6) Amoy (Polygon)"
    echo ""
    echo "L2 Mainnet:"
    echo "  7) Base"
    echo "  8) Arbitrum One"
    echo "  9) Optimism"
    echo "  10) Polygon"
    echo ""
    
    read -p "Enter choice [1-10]: " network_choice
    
    case $network_choice in
        1) NETWORK="mainnet"; NETWORK_NAME="Ethereum Mainnet" ;;
        2) NETWORK="sepolia"; NETWORK_NAME="Sepolia" ;;
        3) NETWORK="base_sepolia"; NETWORK_NAME="Base Sepolia" ;;
        4) NETWORK="arbitrum_sepolia"; NETWORK_NAME="Arbitrum Sepolia" ;;
        5) NETWORK="optimism_sepolia"; NETWORK_NAME="Optimism Sepolia" ;;
        6) NETWORK="amoy"; NETWORK_NAME="Amoy" ;;
        7) NETWORK="base"; NETWORK_NAME="Base" ;;
        8) NETWORK="arbitrum"; NETWORK_NAME="Arbitrum One" ;;
        9) NETWORK="optimism"; NETWORK_NAME="Optimism" ;;
        10) NETWORK="polygon"; NETWORK_NAME="Polygon" ;;
        *) print_error "Invalid choice"; exit 1 ;;
    esac
    
    print_success "Selected network: $NETWORK_NAME"
    
    # Confirm mainnet deployment
    if [[ $network_choice -eq 1 || $network_choice -ge 7 ]]; then
        print_warning "You are deploying to MAINNET!"
        read -p "Type 'DEPLOY' to confirm: " confirm
        if [ "$confirm" != "DEPLOY" ]; then
            print_error "Deployment cancelled"
            exit 0
        fi
    fi
}

# Check balance
check_balance() {
    print_header "Checking Deployer Balance"
    
    BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $NETWORK | awk '{print $1}')
    BALANCE_ETH=$(echo "scale=4; $BALANCE / 1000000000000000000" | bc)
    
    print_success "Balance: $BALANCE_ETH ETH"
    
    # Warn if low
    if (( $(echo "$BALANCE_ETH < 0.1" | bc -l) )); then
        print_warning "Balance is low. Recommended: 0.5 ETH for mainnet, 0.1 ETH for L2/testnet"
        read -p "Continue anyway? [y/N]: " continue
        if [ "$continue" != "y" ]; then
            exit 0
        fi
    fi
}

# Deploy
deploy() {
    print_header "Deploying Trade Finance"
    
    # Deploy command
    DEPLOY_CMD="forge script script/trade-finance/DeployTradeFinanceComplete.s.sol:DeployTradeFinanceComplete \
        --rpc-url $NETWORK \
        --broadcast"
    
    # Add verification if not mainnet
    read -p "Verify contracts on Etherscan? [Y/n]: " verify
    if [ "$verify" != "n" ]; then
        DEPLOY_CMD="$DEPLOY_CMD --verify --etherscan-api-key $VITE_ETHERSCAN_API_KEY"
    fi
    
    # Add slow flag for mainnet
    if [[ $network_choice -eq 1 ]]; then
        DEPLOY_CMD="$DEPLOY_CMD --slow"
    fi
    
    # Execute
    print_success "Executing deployment..."
    echo "$DEPLOY_CMD"
    eval $DEPLOY_CMD
    
    if [ $? -eq 0 ]; then
        print_success "Deployment successful!"
    else
        print_error "Deployment failed!"
        exit 1
    fi
}

# Save deployment info
save_deployment_info() {
    print_header "Saving Deployment Info"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    INFO_FILE="deployments/deployment_${NETWORK}_${TIMESTAMP}.txt"
    
    cat > $INFO_FILE << EOF
Trade Finance Deployment
========================

Network: $NETWORK_NAME
Timestamp: $(date)
Deployer: $DEPLOYER_ADDRESS

Core Deployment:
$(cat deployments/trade-finance-core-*.json | grep chainId -A 20)

Tokens Deployment:
$(cat deployments/trade-finance-tokens-*.json | grep chainId -A 10)

To view full deployment:
cat deployments/trade-finance-core-*.json
cat deployments/trade-finance-tokens-*.json
EOF
    
    print_success "Deployment info saved to: $INFO_FILE"
}

# Print next steps
print_next_steps() {
    print_header "Next Steps"
    
    echo "1. Verify deployment:"
    echo "   cat deployments/trade-finance-core-*.json"
    echo ""
    echo "2. Configure protocol:"
    echo "   forge script script/trade-finance/ConfigureTradeFinance.s.sol --rpc-url $NETWORK --broadcast"
    echo ""
    echo "3. Test the deployment:"
    echo "   forge test --match-contract TradeFinanceIntegration"
    echo ""
    echo "4. Set up monitoring:"
    echo "   # Add contract addresses to monitoring service"
    echo ""
    
    if [[ $network_choice -eq 1 || $network_choice -ge 7 ]]; then
        echo "5. ⚠️  CRITICAL: Security audit required before enabling"
        echo ""
    fi
}

# Main execution
main() {
    print_header "Trade Finance Universal Deployment"
    
    check_prerequisites
    select_network
    check_balance
    deploy
    save_deployment_info
    print_next_steps
    
    print_header "Deployment Complete!"
}

# Run
main
