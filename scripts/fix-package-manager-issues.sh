#!/bin/bash
# Fix npm cache and package manager issues

echo "🧹 Cleaning up npm cache and package manager conflicts..."

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Remove any npm-related lock files if they exist
if [ -f "package-lock.json" ]; then
    echo "Removing conflicting package-lock.json..."
    rm package-lock.json
fi

# Clear pnpm cache and store
echo "Clearing pnpm cache..."
pnpm store prune

echo "✅ Cache cleanup complete!"
echo ""
echo "📋 Ready to install dependencies with:"
echo "   bash scripts/install-wallet-dependencies-pnpm.sh"
