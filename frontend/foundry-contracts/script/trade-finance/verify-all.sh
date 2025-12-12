#!/bin/bash

# Verify all Trade Finance contracts on Etherscan

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  $1${NC}"
    echo -e "${GREEN}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Source .env
if [ ! -f .env ]; then
    print_error ".env file not found"
    exit 1
fi
source .env

# Get network
if [ -z "$1" ]; then
    echo "Usage: ./verify-all.sh <network>"
    echo "Example: ./verify-all.sh sepolia"
    exit 1
fi

NETWORK=$1

print_header "Verifying Trade Finance Contracts on $NETWORK"

# Load deployment files
CORE_FILE="deployments/trade-finance-core-*.json"
TOKENS_FILE="deployments/trade-finance-tokens-*.json"

if [ ! -f $CORE_FILE ]; then
    print_error "Core deployment file not found: $CORE_FILE"
    exit 1
fi

# Extract addresses
POOL=$(cat $CORE_FILE | jq -r '.commodityLendingPool')
ORACLE=$(cat $CORE_FILE | jq -r '.commodityOracle')
ACL=$(cat $CORE_FILE | jq -r '.aclManager')
PROVIDER=$(cat $CORE_FILE | jq -r '.poolAddressesProvider')
CONFIGURATOR=$(cat $CORE_FILE | jq -r '.poolConfigurator')
HAIRCUT=$(cat $CORE_FILE | jq -r '.haircutEngine')
EMERGENCY=$(cat $CORE_FILE | jq -r '.emergencyModule')

echo "Loaded addresses from deployment files"
echo ""

# Verify function
verify_contract() {
    local NAME=$1
    local ADDRESS=$2
    local CONTRACT_PATH=$3
    local CONSTRUCTOR_ARGS=$4
    
    echo -e "${YELLOW}Verifying $NAME...${NC}"
    
    if [ "$ADDRESS" == "null" ] || [ "$ADDRESS" == "0x0000000000000000000000000000000000000000" ]; then
        echo "  Skipping (not deployed)"
        return
    fi
    
    CMD="forge verify-contract \
        --chain-id $(cast chain-id --rpc-url $NETWORK) \
        --num-of-optimizations 200 \
        --etherscan-api-key $VITE_ETHERSCAN_API_KEY \
        $ADDRESS \
        $CONTRACT_PATH"
    
    if [ ! -z "$CONSTRUCTOR_ARGS" ]; then
        CMD="$CMD --constructor-args $CONSTRUCTOR_ARGS"
    fi
    
    if eval $CMD 2>&1 | grep -q "Contract successfully verified"; then
        print_success "$NAME verified"
    else
        echo "  May already be verified or verification failed"
    fi
    
    sleep 2 # Rate limiting
}

# Verify core contracts
print_header "Verifying Core Contracts"

verify_contract \
    "PoolAddressesProvider" \
    "$PROVIDER" \
    "src/trade-finance/governance/PoolAddressesProvider.sol:PoolAddressesProvider"

verify_contract \
    "ACLManager" \
    "$ACL" \
    "src/trade-finance/governance/ACLManager.sol:ACLManager" \
    "$(cast abi-encode 'constructor(address)' $PROVIDER)"

verify_contract \
    "CommodityLendingPool" \
    "$POOL" \
    "src/trade-finance/core/CommodityLendingPool.sol:CommodityLendingPool"

verify_contract \
    "CommodityOracle" \
    "$ORACLE" \
    "src/trade-finance/oracles/CommodityOracle.sol:CommodityOracle" \
    "$(cast abi-encode 'constructor(address)' $PROVIDER)"

verify_contract \
    "PoolConfigurator" \
    "$CONFIGURATOR" \
    "src/trade-finance/governance/PoolConfigurator.sol:PoolConfigurator"

verify_contract \
    "HaircutEngine" \
    "$HAIRCUT" \
    "src/trade-finance/risk/HaircutEngine.sol:HaircutEngine" \
    "$(cast abi-encode 'constructor(address)' $PROVIDER)"

verify_contract \
    "EmergencyModule" \
    "$EMERGENCY" \
    "src/trade-finance/security/EmergencyModule.sol:EmergencyModule" \
    "$(cast abi-encode 'constructor(address)' $PROVIDER)"

# Verify tokens
if [ -f $TOKENS_FILE ]; then
    print_header "Verifying Token Contracts"
    
    C_GOLD=$(cat $TOKENS_FILE | jq -r '.cGold')
    D_GOLD=$(cat $TOKENS_FILE | jq -r '.dGold')
    C_SILVER=$(cat $TOKENS_FILE | jq -r '.cSilver')
    D_SILVER=$(cat $TOKENS_FILE | jq -r '.dSilver')
    C_OIL=$(cat $TOKENS_FILE | jq -r '.cOil')
    D_OIL=$(cat $TOKENS_FILE | jq -r '.dOil')
    C_SOY=$(cat $TOKENS_FILE | jq -r '.cSoybeans')
    D_SOY=$(cat $TOKENS_FILE | jq -r '.dSoybeans')
    
    # Receipt Tokens
    verify_contract \
        "cGOLD" \
        "$C_GOLD" \
        "src/trade-finance/tokens/CommodityReceiptToken.sol:CommodityReceiptToken"
    
    verify_contract \
        "cSILVER" \
        "$C_SILVER" \
        "src/trade-finance/tokens/CommodityReceiptToken.sol:CommodityReceiptToken"
    
    verify_contract \
        "cOIL" \
        "$C_OIL" \
        "src/trade-finance/tokens/CommodityReceiptToken.sol:CommodityReceiptToken"
    
    verify_contract \
        "cSOY" \
        "$C_SOY" \
        "src/trade-finance/tokens/CommodityReceiptToken.sol:CommodityReceiptToken"
    
    # Debt Tokens
    verify_contract \
        "dGOLD" \
        "$D_GOLD" \
        "src/trade-finance/tokens/CommodityDebtToken.sol:CommodityDebtToken"
    
    verify_contract \
        "dSILVER" \
        "$D_SILVER" \
        "src/trade-finance/tokens/CommodityDebtToken.sol:CommodityDebtToken"
    
    verify_contract \
        "dOIL" \
        "$D_OIL" \
        "src/trade-finance/tokens/CommodityDebtToken.sol:CommodityDebtToken"
    
    verify_contract \
        "dSOY" \
        "$D_SOY" \
        "src/trade-finance/tokens/CommodityDebtToken.sol:CommodityDebtToken"
fi

print_header "Verification Complete!"

echo "View verified contracts on Etherscan:"
case $NETWORK in
    "sepolia")
        echo "https://sepolia.etherscan.io/address/$POOL"
        ;;
    "base_sepolia")
        echo "https://sepolia.basescan.org/address/$POOL"
        ;;
    "arbitrum_sepolia")
        echo "https://sepolia.arbiscan.io/address/$POOL"
        ;;
    "optimism_sepolia")
        echo "https://sepolia-optimism.etherscan.io/address/$POOL"
        ;;
    *)
        echo "https://etherscan.io/address/$POOL"
        ;;
esac
