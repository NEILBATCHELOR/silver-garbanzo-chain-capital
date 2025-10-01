#!/bin/bash
# Foundry Environment Setup
# Source this before running forge commands: source ./setup-foundry.sh

# Add Foundry to PATH
export PATH="$HOME/.foundry/bin:$PATH"

# Verify installation
if command -v forge &> /dev/null; then
    echo "✅ Foundry is now available in PATH"
    echo "📦 Forge version: $(forge --version | head -n 1)"
else
    echo "❌ Foundry not found. Please reinstall with: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
fi
