#!/bin/bash

# =====================================================
# Regenerate Prisma for Smart Contract Wallet Tables
# =====================================================

echo "🔄 Regenerating Prisma after smart contract wallet migration..."
echo ""

# Change to backend directory
cd "$(dirname "$0")/../backend" || exit 1

echo "📍 Current directory: $(pwd)"
echo ""

# Step 1: Pull the latest database schema  
echo "🔍 Step 1: Introspecting database to update schema.prisma..."
npx prisma db pull

if [ $? -eq 0 ]; then
    echo "✅ Database introspection completed successfully"
else
    echo "❌ Database introspection failed"
    exit 1
fi

echo ""

# Step 2: Generate Prisma client with new types
echo "🔧 Step 2: Generating Prisma client with new types..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client generation completed successfully"
else
    echo "❌ Prisma client generation failed"
    exit 1
fi

echo ""

# Step 3: Verify the new tables are in the schema
echo "🔍 Step 3: Verifying new smart contract wallet tables..."

if grep -q "model webauthn_credentials" prisma/schema.prisma; then
    echo "✅ webauthn_credentials model found"
else
    echo "⚠️  webauthn_credentials model not found in schema"
fi

if grep -q "model webauthn_challenges" prisma/schema.prisma; then
    echo "✅ webauthn_challenges model found"
else
    echo "⚠️  webauthn_challenges model not found in schema"
fi

if grep -q "model wallet_guardians" prisma/schema.prisma; then
    echo "✅ wallet_guardians model found"
else
    echo "⚠️  wallet_guardians model not found in schema"
fi

if grep -q "model user_operations" prisma/schema.prisma; then
    echo "✅ user_operations model found"
else
    echo "⚠️  user_operations model not found in schema"
fi

echo ""

# Step 4: Check generated client
echo "🔍 Step 4: Verifying Prisma client generation..."

CLIENT_PATH="src/infrastructure/database/generated"
if [ -d "$CLIENT_PATH" ]; then
    echo "✅ Prisma client generated at: $CLIENT_PATH"
    
    # Check if index.d.ts contains the new models
    if [ -f "$CLIENT_PATH/index.d.ts" ]; then
        echo "✅ TypeScript definitions generated successfully"
        
        # Count new model types
        NEW_MODELS=$(grep -c "webauthn_credentials\|webauthn_challenges\|wallet_guardians\|user_operations" "$CLIENT_PATH/index.d.ts" 2>/dev/null || echo "0")
        echo "📊 Found $NEW_MODELS references to new smart contract wallet models in types"
    else
        echo "⚠️  TypeScript definitions file not found"
    fi
else
    echo "⚠️  Prisma client directory not found"
fi

echo ""
echo "🎉 Prisma regeneration completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Check your services for any TypeScript errors"
echo "   2. Update service database placeholders with real Prisma queries"
echo "   3. Test the new smart contract wallet functionality"
echo ""
echo "🔧 Useful commands:"
echo "   npm run type-check    # Check for TypeScript errors"
echo "   npm run db:studio     # Open Prisma Studio to explore data"
echo "   npm run test:wallets  # Test wallet services"
