#!/bin/bash

# Chain Capital Backend - Environment Variable Migration Script
# This script helps migrate from old VITE_* environment variables to new backend variables

echo "🔧 Chain Capital Backend Environment Migration"
echo "=============================================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ No .env file found in backend directory"
    echo "📋 Creating .env file from .env.example..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "📝 Please update the values in .env file with your actual configuration"
    else
        echo "❌ No .env.example file found. Please create .env file manually."
        exit 1
    fi
else
    echo "📁 Found existing .env file"
    echo "🔄 Checking for old environment variables..."
    
    # Create backup
    cp .env .env.backup
    echo "💾 Created backup: .env.backup"
    
    # Variables to migrate
    declare -A migration_map=(
        ["VITE_MAINNET_RPC_URL"]="ETHEREUM_RPC_URL"
        ["VITE_POLYGON_RPC_URL"]="POLYGON_RPC_URL" 
        ["VITE_ARBITRUM_RPC_URL"]="ARBITRUM_RPC_URL"
        ["VITE_OPTIMISM_RPC_URL"]="OPTIMISM_RPC_URL"
        ["VITE_AVALANCHE_RPC_URL"]="AVALANCHE_RPC_URL"
        ["VITE_SOLANA_RPC_URL"]="SOLANA_RPC_URL"
        ["VITE_BITCOIN_RPC_URL"]="BITCOIN_RPC_URL"
        ["VITE_BITCOIN_TESTNET_RPC_URL"]="BITCOIN_TESTNET_RPC_URL"
        ["VITE_NEAR_RPC_URL"]="NEAR_RPC_URL"
    )
    
    # Check and migrate variables
    migrations_made=0
    
    for old_var in "${!migration_map[@]}"; do
        new_var="${migration_map[$old_var]}"
        
        # Check if old variable exists in .env
        if grep -q "^${old_var}=" .env; then
            old_value=$(grep "^${old_var}=" .env | cut -d'=' -f2-)
            
            # Check if new variable already exists
            if grep -q "^${new_var}=" .env; then
                echo "⚠️  ${new_var} already exists, skipping migration of ${old_var}"
            else
                # Add new variable
                echo "${new_var}=${old_value}" >> .env
                echo "✅ Migrated: ${old_var} → ${new_var}"
                migrations_made=$((migrations_made + 1))
            fi
            
            # Comment out old variable
            sed -i.tmp "s/^${old_var}=/#OLD_${old_var}=/" .env
            rm -f .env.tmp
        fi
    done
    
    echo ""
    echo "📊 Migration Summary:"
    echo "   - Variables migrated: ${migrations_made}"
    echo "   - Old variables commented out with #OLD_ prefix"
    echo "   - Backup created: .env.backup"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Review your .env file and update any missing values"
echo "2. Add your actual Bitcoin QuickNode RPC URLs:"
echo "   BITCOIN_RPC_URL=https://proud-skilled-fog.blast-mainnet.quiknode.pro/..."
echo "   BITCOIN_TESTNET_RPC_URL=https://proud-skilled-fog.btc-testnet.quiknode.pro/..."
echo "3. Set BITCOIN_NETWORK=mainnet (or testnet for testing)"
echo "4. Restart your backend service: npm run dev"
echo ""
echo "✅ Migration script completed!"
