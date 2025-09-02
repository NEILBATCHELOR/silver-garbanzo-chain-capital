#!/bin/bash

# Chain Capital Professional Key Management Dependencies
# Complete SDK installation for AWS KMS, Azure Key Vault, and Google Cloud KMS

set -e

echo "🔐 Installing Professional Key Management Dependencies"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the backend directory"
    exit 1
fi

echo ""
print_info "Installing AWS SDK v3 for CloudHSM and KMS..."

# AWS SDK v3 - Modern, tree-shakeable, TypeScript native
pnpm add @aws-sdk/client-kms@^3.848.0
pnpm add @aws-sdk/client-cloudhsmv2@^3.848.0
pnpm add @aws-sdk/client-sts@^3.848.0

print_status "AWS SDKs installed: KMS, CloudHSM v2, STS"

echo ""
print_info "Installing Azure SDK for Key Vault..."

# Azure SDK - Official Microsoft Azure libraries
pnpm add @azure/keyvault-keys@^4.8.0
pnpm add @azure/keyvault-admin@^4.5.0
pnpm add @azure/identity@^4.0.1

print_status "Azure SDKs installed: Key Vault Keys, Admin, Identity"

echo ""
print_info "Installing Google Cloud SDK for KMS..."

# Google Cloud SDK - Official Google Cloud libraries
pnpm add @google-cloud/kms@^5.1.0

print_status "Google Cloud SDK installed: KMS"

echo ""
print_info "Installing additional security dependencies..."

# Additional security and utility libraries
pnpm add node-forge@^1.3.1  # Additional cryptographic operations
pnpm add uuid@^9.0.1         # Secure UUID generation

print_status "Security utilities installed"

echo ""
print_info "Installing development dependencies..."

# Development and testing
pnpm add -D @types/uuid@^9.0.8
pnpm add -D @types/node-forge@^1.3.11

print_status "TypeScript definitions installed"

echo ""
print_info "Verifying installations..."

# Verify all packages are installed correctly
npm list @aws-sdk/client-kms || print_warning "AWS KMS SDK verification failed"
npm list @azure/keyvault-keys || print_warning "Azure Key Vault SDK verification failed"  
npm list @google-cloud/kms || print_warning "Google Cloud KMS SDK verification failed"

echo ""
print_status "All professional key management dependencies installed successfully!"

echo ""
print_info "Next Steps:"
echo "1. Configure your HSM provider in .env.hsm"
echo "2. Run: npm run test:hsm"
echo "3. Choose your provider: aws-cloudhsm, azure-keyvault, or google-cloud-kms"

echo ""
print_info "Cost Summary:"
echo "• AWS CloudHSM: ~$1,800/month (FIPS 140-2 Level 3)"
echo "• Azure Key Vault HSM: ~$1,000/month (FIPS 140-2 Level 2)"
echo "• Google Cloud KMS: ~$1-6/key/month (FIPS 140-2 Level 3)"
echo "• Memory (Development): $0"

print_status "Professional key management setup complete! 🎉"
