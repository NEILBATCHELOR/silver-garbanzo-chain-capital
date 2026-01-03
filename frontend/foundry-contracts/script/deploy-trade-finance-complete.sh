#!/bin/bash
# Trade Finance Complete Deployment Orchestrator
# Deploys ALL components: Infrastructure, Phases 1-5, Token Templates, Configuration

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check required environment variables
check_env() {
    print_header "Checking Environment Variables"
    
    required_vars=("DEPLOYER_ADDRESS" "PRIVATE_KEY" "HOODI_RPC_URL")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "$var is not set"
            exit 1
        fi
        print_success "$var is set"
    done
    
    # Optional variables with defaults
    export SUPER_ADMIN_ADDRESS=${SUPER_ADMIN_ADDRESS:-$DEPLOYER_ADDRESS}
    export MARKET_ID=${MARKET_ID:-"ChainCapital-Commodities"}
    export TRADE_FINANCE_VERSION=${TRADE_FINANCE_VERSION:-"v1.0.0"}
    
    print_info "Super Admin: $SUPER_ADMIN_ADDRESS"
    print_info "Market ID: $MARKET_ID"
    print_info "Version: $TRADE_FINANCE_VERSION"
    
    echo ""
}

# Deploy infrastructure (TradeFinanceRegistry)
deploy_infrastructure() {
    print_header "INFRASTRUCTURE: TradeFinanceRegistry (UUPS)"
    
    print_warning "This requires a separate deployment script for TradeFinanceRegistry"
    print_warning "For now, using the complete Solidity script is recommended"
    
    # Option 1: Use forge create directly
    print_info "Deploying TradeFinanceRegistry implementation..."
    
    # Deploy implementation
    REGISTRY_IMPL=$(forge create \
        src/trade-finance/deployment/TradeFinanceRegistry.sol:TradeFinanceRegistry \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY \
        --json | jq -r '.deployedTo')
    
    if [ -z "$REGISTRY_IMPL" ]; then
        print_error "Failed to deploy TradeFinanceRegistry implementation"
        exit 1
    fi
    
    print_success "Implementation: $REGISTRY_IMPL"
    
    # Deploy proxy
    print_info "Deploying ERC1967Proxy for TradeFinanceRegistry..."
    
    # Create initialization data
    INIT_DATA=$(cast calldata "initialize(address)" $SUPER_ADMIN_ADDRESS)
    
    REGISTRY_PROXY=$(forge create \
        lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy \
        --constructor-args $REGISTRY_IMPL $INIT_DATA \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY \
        --json | jq -r '.deployedTo')
    
    if [ -z "$REGISTRY_PROXY" ]; then
        print_error "Failed to deploy TradeFinanceRegistry proxy"
        exit 1
    fi
    
    export TRADE_FINANCE_REGISTRY=$REGISTRY_PROXY
    print_success "Proxy: $REGISTRY_PROXY"
    
    echo ""
}

# Deploy Phase 1: Governance
deploy_phase1() {
    print_header "PHASE 1: Governance"
    
    forge script script/trade-finance/DeployPhase1Governance.s.sol \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY \
        --broadcast \
        --verify \
        -vvv
    
    if [ $? -eq 0 ]; then
        print_success "Phase 1 deployed successfully"
    else
        print_error "Phase 1 deployment failed"
        exit 1
    fi
    
    # Prompt for addresses
    echo ""
    print_info "Please enter the deployed addresses from the output above:"
    read -p "Enter PoolAddressesProvider proxy address: " POOL_ADDRESSES_PROVIDER
    read -p "Enter ACLManager proxy address: " ACL_MANAGER
    read -p "Enter PoolConfigurator proxy address: " POOL_CONFIGURATOR
    
    export POOL_ADDRESSES_PROVIDER
    export ACL_MANAGER
    export POOL_CONFIGURATOR
    
    echo ""
}

# Deploy Phase 2: Core Protocol
deploy_phase2() {
    print_header "PHASE 2: Core Protocol"
    
    if [ -z "$POOL_ADDRESSES_PROVIDER" ] || [ -z "$ACL_MANAGER" ]; then
        print_error "Phase 1 addresses not set"
        exit 1
    fi
    
    forge script script/trade-finance/DeployPhase2CoreProtocol.s.sol \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY \
        --broadcast \
        --verify \
        -vvv \
        --sig "run(address,address)" \
        $POOL_ADDRESSES_PROVIDER \
        $ACL_MANAGER
    
    if [ $? -eq 0 ]; then
        print_success "Phase 2 deployed successfully"
    else
        print_error "Phase 2 deployment failed"
        exit 1
    fi
    
    # Prompt for addresses
    echo ""
    print_info "Please enter the deployed addresses from the output above:"
    read -p "Enter CommodityLendingPool proxy address: " COMMODITY_LENDING_POOL
    read -p "Enter CommodityOracle proxy address: " COMMODITY_ORACLE
    
    export COMMODITY_LENDING_POOL
    export COMMODITY_ORACLE
    
    echo ""
}

# Deploy Phase 3: Risk & Security
deploy_phase3() {
    print_header "PHASE 3: Risk & Security"
    
    if [ -z "$COMMODITY_LENDING_POOL" ] || [ -z "$COMMODITY_ORACLE" ]; then
        print_error "Phase 2 addresses not set"
        exit 1
    fi
    
    forge script script/trade-finance/DeployPhase3RiskSecurity.s.sol \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY \
        --broadcast \
        --verify \
        -vvv \
        --sig "run(address,address,address,address)" \
        $POOL_ADDRESSES_PROVIDER \
        $COMMODITY_LENDING_POOL \
        $ACL_MANAGER \
        $COMMODITY_ORACLE
    
    if [ $? -eq 0 ]; then
        print_success "Phase 3 deployed successfully"
    else
        print_error "Phase 3 deployment failed"
        exit 1
    fi
    
    echo ""
}

# Deploy Phase 4: Rewards & Treasury
deploy_phase4() {
    print_header "PHASE 4: Rewards & Treasury"
    
    forge script script/trade-finance/DeployPhase4RewardsTreasury.s.sol \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY \
        --broadcast \
        --verify \
        -vvv \
        --sig "run(address,address,address)" \
        $POOL_ADDRESSES_PROVIDER \
        $COMMODITY_LENDING_POOL \
        $ACL_MANAGER
    
    if [ $? -eq 0 ]; then
        print_success "Phase 4 deployed successfully"
    else
        print_error "Phase 4 deployment failed"
        exit 1
    fi
    
    echo ""
}

# Deploy Phase 5: Liquidation
deploy_phase5() {
    print_header "PHASE 5: Liquidation"
    
    forge script script/trade-finance/DeployPhase5Liquidation.s.sol \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY \
        --broadcast \
        --verify \
        -vvv \
        --sig "run(address,address,address,address)" \
        $POOL_ADDRESSES_PROVIDER \
        $COMMODITY_LENDING_POOL \
        $ACL_MANAGER \
        $COMMODITY_ORACLE
    
    if [ $? -eq 0 ]; then
        print_success "Phase 5 deployed successfully"
    else
        print_error "Phase 5 deployment failed"
        exit 1
    fi
    
    echo ""
}

# Deploy Token Templates
deploy_token_templates() {
    print_header "TOKEN TEMPLATES"
    
    if [ -z "$COMMODITY_LENDING_POOL" ]; then
        print_error "CommodityLendingPool address not set"
        exit 1
    fi
    
    print_info "Deploying CommodityReceiptToken template..."
    
    RECEIPT_TOKEN=$(forge create \
        src/trade-finance/tokens/CommodityReceiptToken.sol:CommodityReceiptToken \
        --constructor-args $COMMODITY_LENDING_POOL \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY \
        --verify \
        --json | jq -r '.deployedTo')
    
    if [ -z "$RECEIPT_TOKEN" ]; then
        print_error "Failed to deploy CommodityReceiptToken"
        exit 1
    fi
    
    export RECEIPT_TOKEN_IMPL=$RECEIPT_TOKEN
    print_success "ReceiptToken Implementation: $RECEIPT_TOKEN"
    
    print_info "Deploying CommodityDebtToken template..."
    
    DEBT_TOKEN=$(forge create \
        src/trade-finance/tokens/CommodityDebtToken.sol:CommodityDebtToken \
        --constructor-args $COMMODITY_LENDING_POOL \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY \
        --verify \
        --json | jq -r '.deployedTo')
    
    if [ -z "$DEBT_TOKEN" ]; then
        print_error "Failed to deploy CommodityDebtToken"
        exit 1
    fi
    
    export DEBT_TOKEN_IMPL=$DEBT_TOKEN
    print_success "DebtToken Implementation: $DEBT_TOKEN"
    
    echo ""
}

# Configure Protocol
configure_protocol() {
    print_header "PROTOCOL CONFIGURATION"
    
    if [ -z "$POOL_ADDRESSES_PROVIDER" ] || [ -z "$COMMODITY_LENDING_POOL" ]; then
        print_error "Required addresses not set"
        exit 1
    fi
    
    print_info "Setting addresses in PoolAddressesProvider..."
    
    # Set Pool
    cast send $POOL_ADDRESSES_PROVIDER \
        "setPool(address)" \
        $COMMODITY_LENDING_POOL \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY
    print_success "Pool address set"
    
    # Set ACLManager
    cast send $POOL_ADDRESSES_PROVIDER \
        "setACLManager(address)" \
        $ACL_MANAGER \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY
    print_success "ACLManager address set"
    
    # Set PriceOracle
    cast send $POOL_ADDRESSES_PROVIDER \
        "setPriceOracle(address)" \
        $COMMODITY_ORACLE \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY
    print_success "PriceOracle address set"
    
    # Set PoolConfigurator
    cast send $POOL_ADDRESSES_PROVIDER \
        "setPoolConfigurator(address)" \
        $POOL_CONFIGURATOR \
        --rpc-url $HOODI_RPC_URL \
        --private-key $PRIVATE_KEY
    print_success "PoolConfigurator address set"
    
    echo ""
}

# Save deployment addresses
save_deployment() {
    print_header "SAVING DEPLOYMENT ADDRESSES"
    
    TIMESTAMP=$(date +%s)
    DEPLOYMENT_FILE="deployments/trade-finance-complete-$(date +%Y%m%d-%H%M%S).json"
    
    mkdir -p deployments
    
    cat > $DEPLOYMENT_FILE << EOF
{
  "metadata": {
    "network": "Hoodi Testnet",
    "chainId": $(cast chain-id --rpc-url $HOODI_RPC_URL),
    "timestamp": $TIMESTAMP,
    "deployer": "$DEPLOYER_ADDRESS",
    "superAdmin": "$SUPER_ADMIN_ADDRESS",
    "marketId": "$MARKET_ID",
    "version": "$TRADE_FINANCE_VERSION"
  },
  "infrastructure": {
    "tradeFinanceRegistry": "$TRADE_FINANCE_REGISTRY"
  },
  "phase1": {
    "poolAddressesProvider": "$POOL_ADDRESSES_PROVIDER",
    "aclManager": "$ACL_MANAGER",
    "poolConfigurator": "$POOL_CONFIGURATOR"
  },
  "phase2": {
    "commodityLendingPool": "$COMMODITY_LENDING_POOL",
    "commodityOracle": "$COMMODITY_ORACLE"
  },
  "tokens": {
    "receiptTokenImpl": "$RECEIPT_TOKEN_IMPL",
    "debtTokenImpl": "$DEBT_TOKEN_IMPL"
  }
}
EOF
    
    print_success "Deployment saved to: $DEPLOYMENT_FILE"
    echo ""
}

# Main deployment flow
main() {
    print_header "Trade Finance Complete Deployment"
    print_info "This will deploy ALL components:"
    print_info "  - Infrastructure (TradeFinanceRegistry)"
    print_info "  - Phase 1 (Governance)"
    print_info "  - Phase 2 (Core Protocol)"
    print_info "  - Phase 3 (Risk & Security)"
    print_info "  - Phase 4 (Rewards & Treasury)"
    print_info "  - Phase 5 (Liquidation)"
    print_info "  - Token Templates"
    print_info "  - Protocol Configuration"
    echo ""
    
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
    
    check_env
    deploy_infrastructure
    deploy_phase1
    deploy_phase2
    deploy_phase3
    deploy_phase4
    deploy_phase5
    deploy_token_templates
    configure_protocol
    save_deployment
    
    print_header "DEPLOYMENT COMPLETE"
    print_success "All components deployed successfully!"
    
    echo ""
    echo "Key Addresses:"
    echo "  TradeFinanceRegistry: $TRADE_FINANCE_REGISTRY"
    echo "  PoolAddressesProvider: $POOL_ADDRESSES_PROVIDER"
    echo "  ACLManager: $ACL_MANAGER"
    echo "  CommodityLendingPool: $COMMODITY_LENDING_POOL"
    echo "  CommodityOracle: $COMMODITY_ORACLE"
    echo "  ReceiptToken Implementation: $RECEIPT_TOKEN_IMPL"
    echo "  DebtToken Implementation: $DEBT_TOKEN_IMPL"
    echo ""
    echo "Deployment file: deployments/trade-finance-complete-*.json"
    echo ""
}

# Run main deployment
main
