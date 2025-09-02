#!/bin/bash

# Foundry Smart Contract Setup Script
# This script installs dependencies and tests compilation

echo "Setting up Foundry project dependencies..."

# Change to the foundry-contracts directory
cd "$(dirname "$0")"

# Install OpenZeppelin contracts
echo "Installing OpenZeppelin contracts..."
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Update remappings in foundry.toml if needed
echo "Updating remappings..."

# Build contracts
echo "Building contracts..."
forge build

# Run tests
echo "Running tests..."
forge test

echo "Setup complete!"
echo ""
echo "To deploy contracts to a testnet:"
echo "1. Copy .env.example to .env and fill in your values"
echo "2. Run: forge script script/DeployTokens.s.sol --rpc-url \$SEPOLIA_RPC_URL --broadcast --verify"
echo ""
echo "To run tests: forge test"
echo "To build: forge build"
echo "To format code: forge fmt"
