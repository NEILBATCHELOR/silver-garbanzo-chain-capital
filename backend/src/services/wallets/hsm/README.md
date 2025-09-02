# HSM Integration - Hardware Security Module Support

**Enterprise-Grade Tamper-Resistant Key Management**

## 🎯 Overview

Chain Capital's HSM integration provides enterprise-grade hardware security module support with seamless fallback to existing memory operations. This implementation supports multiple HSM providers and maintains 100% backward compatibility.

## ✅ Features

- **🔒 Hardware Security Modules** - AWS CloudHSM, Azure Key Vault, Google Cloud KMS
- **🔄 Dual Operations** - HSM operations with memory fallback
- **📊 FIPS 140-2 Compliance** - Level 2/3 compliance for enterprise clients
- **🛡️ Tamper-Resistant Hardware** - Physical security for key materials
- **📝 Comprehensive Audit Logging** - Complete operation audit trails
- **⚡ Seamless Integration** - No disruption to existing wallet operations

## 🏗️ Architecture

```
HSMKeyManagementService (Main Interface)
├── KeyManagementService (Legacy/Fallback)
├── AWSCloudHSMService (FIPS 140-2 Level 3)
├── AzureKeyVaultService (FIPS 140-2 Level 2)
├── GoogleCloudKMSService (FIPS 140-2 Level 3)
└── Memory Operations (Development)
```

## 🚀 Quick Start

### 1. Setup HSM Integration
```bash
# Run setup script
cd scripts
./setup-hsm-integration.sh

# Or manually install dependencies
cd backend
npm install --save-dev tsx
```

### 2. Configure HSM Provider
```bash
# Copy configuration template
cp backend/.env.hsm.example backend/.env.hsm

# Edit configuration
nano backend/.env.hsm
```

### 3. Test Integration
```bash
# Run HSM integration tests
cd backend
npm run test:hsm

# Check HSM health
npm run hsm:health

# Validate configuration
npm run hsm:config
```

## 🔧 Configuration

### Environment Variables

#### Development (Memory Operations)
```bash
HSM_PROVIDER=memory
NODE_ENV=development
```

#### AWS CloudHSM (FIPS 140-2 Level 3)
```bash
HSM_PROVIDER=aws-cloudhsm
AWS_CLOUDHSM_CLUSTER_ENDPOINT=cluster-xyz.cloudhsm.us-east-1.amazonaws.com
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

#### Azure Key Vault (FIPS 140-2 Level 2)
```bash
HSM_PROVIDER=azure-keyvault
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
```

#### Google Cloud KMS (FIPS 140-2 Level 3)
```bash
HSM_PROVIDER=google-cloud-kms
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## 💻 Usage Examples

### Basic HSM Operations
```typescript
import { createHSMService, getEnvConfig } from './services/wallets/hsm'

// Create HSM service with environment configuration
const hsmService = createHSMService(getEnvConfig())

// Store wallet keys (uses HSM if available, memory fallback)
const result = await hsmService.storeWalletKeys({
  walletId: 'wallet-123',
  encryptedSeed: 'encrypted-seed-data',
  masterPublicKey: 'master-public-key-hex',
  addresses: { ethereum: '0x...', bitcoin: '1...' },
  derivationPaths: { ethereum: "m/44'/60'/0'/0/0" }
})

console.log(`Stored with HSM: ${result.success}`)
```

### Generate Secure Keys
```typescript
// Generate hardware-backed cryptographic keys
const keyResult = await hsmService.generateSecureKeys('wallet-123', 'secp256k1')

if (keyResult.success) {
  console.log(`HSM Generated: ${keyResult.data.hsmGenerated}`)
  console.log(`Key ID: ${keyResult.data.keyId}`)
}
```

### Sign with Hardware Security
```typescript
// Sign data using HSM
const signature = await hsmService.signWithSecureKey(
  'key-id',
  Buffer.from('data to sign'),
  'ECDSA_SHA_256'
)

if (signature.success) {
  console.log(`HSM Signed: ${signature.data.hsmSigned}`)
  console.log(`Signature: ${signature.data.signature}`)
}
```

## 🧪 Testing

### Run Test Suite
```bash
# Run comprehensive HSM tests
npm run test:hsm

# Expected output:
# ✅ HSM Service Factory - Working
# ✅ Configuration Validation - Working
# ✅ Memory HSM Operations - Working
# ✅ Secure Key Generation - Working
# ✅ Cryptographic Signing - Working
# 🎉 HSM Integration: FULLY FUNCTIONAL
```

### Health Checks
```bash
# Check HSM provider health
npm run hsm:health

# Validate current configuration
npm run hsm:config
```

## 💰 Cost Considerations

| Provider | Setup Cost | Monthly Cost | Per Operation | FIPS Level |
|----------|------------|--------------|---------------|------------|
| **Memory** | $0 | $0 | $0 | N/A (Dev only) |
| **AWS CloudHSM** | $3K-5K | $1,800+ | $0.05-0.10 | Level 3 |
| **Azure Key Vault** | $500-1K | $1,000+ | $0.03-0.05 | Level 2 |
| **Google Cloud KMS** | $200-500 | $1-6/key | $0.03-0.06 | Level 3 |

## 🛡️ Security Benefits

- **🔐 Tamper-Resistant Hardware** - Keys protected by hardware security
- **🔑 Hardware Key Generation** - True random number generation
- **📊 FIPS 140-2 Compliance** - Government and enterprise security standards
- **📝 Complete Audit Trails** - All operations logged for compliance
- **🏢 Multi-Tenant Security** - Secure isolation between clients
- **🔄 Automatic Key Rotation** - Scheduled key rotation capabilities

## 📊 Provider Comparison

### AWS CloudHSM
- **Security:** FIPS 140-2 Level 3 (Highest)
- **Deployment:** Dedicated HSM clusters
- **Best For:** Maximum security requirements
- **Integration:** AWS-native deployments

### Azure Key Vault HSM
- **Security:** FIPS 140-2 Level 2
- **Deployment:** Managed HSM service
- **Best For:** Balanced cost/security
- **Integration:** Azure-native deployments

### Google Cloud KMS
- **Security:** FIPS 140-2 Level 3
- **Deployment:** Managed key service
- **Best For:** Google Cloud deployments
- **Integration:** GCP-native services

## 🚀 Production Deployment

### Prerequisites
1. **HSM Provider Account** - AWS, Azure, or Google Cloud
2. **HSM Service Setup** - Create HSM instance/vault/keyring
3. **Credentials Configuration** - Service account or access keys
4. **Network Configuration** - Firewall rules and VPC setup

### Deployment Steps
1. **Install Provider Dependencies**
   ```bash
   ./install-aws-cloudhsm.sh      # For AWS CloudHSM
   ./install-azure-keyvault.sh    # For Azure Key Vault
   ./install-google-cloud-kms.sh  # For Google Cloud KMS
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.hsm.example .env.production.hsm
   # Edit with production credentials
   ```

3. **Test HSM Connectivity**
   ```bash
   HSM_PROVIDER=aws-cloudhsm npm run hsm:health
   ```

4. **Deploy with HSM Enabled**
   ```bash
   NODE_ENV=production HSM_PROVIDER=aws-cloudhsm npm start
   ```

## 📞 Support & Troubleshooting

### Common Issues

#### HSM Connectivity Issues
```bash
# Test network connectivity
npm run hsm:health

# Check credentials
npm run hsm:config
```

#### Performance Issues
```bash
# Monitor HSM latency
npm run hsm:health | grep latency

# Check HSM operation logs
tail -f logs/hsm-operations.log
```

#### Configuration Problems
```typescript
import { validateConfig } from './services/wallets/hsm'

const validation = validateConfig(config)
if (!validation.valid) {
  console.log('Errors:', validation.errors)
}
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm run test:hsm
```

## 🔗 Related Documentation

- **[Complete HSM Documentation](../docs/hsm-integration-complete.md)** - Comprehensive implementation guide
- **[Wallet Service Overview](./README.md)** - Main wallet service documentation
- **[Security Architecture](../docs/security-architecture.md)** - Overall security design

## 📈 Roadmap

### Current Status ✅
- [x] HSM Service Implementation
- [x] Multi-Provider Support
- [x] Comprehensive Testing
- [x] Documentation Complete

### Future Enhancements 🔮
- [ ] HSM Performance Optimization
- [ ] Additional HSM Providers
- [ ] Advanced Key Lifecycle Management
- [ ] HSM Monitoring Dashboard

---

**Status:** ✅ **Production Ready**  
**Security:** 🏆 **Enterprise Grade**  
**Compliance:** ✅ **FIPS 140-2 Level 2/3**

*Chain Capital HSM Integration provides institutional-grade hardware security for enterprise wallet operations.*
