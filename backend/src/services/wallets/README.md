# Chain Capital Wallet Services

## Overview

The Chain Capital Wallet Services provide comprehensive HD (Hierarchical Deterministic) wallet functionality with multi-chain support, following BIP32/39/44 standards. The implementation includes secure key management, transaction orchestration, and multi-signature capabilities.

## 🏗️ Architecture

### Service Structure
```
backend/src/services/wallets/
├── WalletService.ts              # Main wallet CRUD operations
├── HDWalletService.ts           # BIP32/39/44 HD wallet implementation
├── KeyManagementService.ts      # Secure key storage and retrieval
├── WalletValidationService.ts   # Validation and business rules
├── types.ts                     # TypeScript interfaces and types
├── index.ts                     # Service exports
└── README.md                    # This documentation
```

## 🔑 Core Features

### ✅ Implemented (Phase 1 - Foundation)

#### HD Wallet Management
- **BIP39 Mnemonic Generation**: 12/24 word mnemonic phrases
- **BIP32 HD Wallet**: Hierarchical deterministic wallet trees
- **BIP44 Multi-Account**: Standard derivation paths `m/44'/coin_type'/account'/change/address_index`
- **Multi-Chain Support**: Bitcoin, Ethereum family, Solana, NEAR

#### Secure Key Management
- **Encrypted Storage**: Secure key storage in database (development encryption)
- **Key Derivation**: Address derivation for multiple blockchains
- **Backup/Restore**: Encrypted backup and restore functionality
- **Address Management**: Track addresses across multiple chains

#### Wallet Operations
- **Create HD Wallets**: Generate new wallets with multi-chain addresses
- **Restore from Mnemonic**: Recover wallets from mnemonic phrases
- **Add Chain Support**: Add blockchain support to existing wallets  
- **Wallet Management**: Update status, configuration, metadata

#### Validation & Security
- **Input Validation**: Comprehensive validation for all operations
- **Business Rules**: Investor limits, jurisdiction restrictions
- **Address Validation**: Blockchain-specific address format validation
- **Mnemonic Validation**: BIP39 compliance and security checks

## 🌐 Supported Blockchains

| Blockchain | Coin Type | Derivation Path | Address Format |
|------------|-----------|----------------|----------------|
| Bitcoin | 0 | `m/44'/0'/0'/0/0` | P2PKH (1...), P2SH (3...), Bech32 (bc1...) |
| Ethereum | 60 | `m/44'/60'/0'/0/0` | 0x... (40 hex chars) |
| Polygon | 60 | `m/44'/60'/0'/0/0` | 0x... (40 hex chars) |
| Arbitrum | 60 | `m/44'/60'/0'/0/0` | 0x... (40 hex chars) |
| Optimism | 60 | `m/44'/60'/0'/0/0` | 0x... (40 hex chars) |
| Avalanche | 60 | `m/44'/60'/0'/0/0` | 0x... (40 hex chars) |
| Solana | 501 | `m/44'/501'/0'/0'` | Base58 (32-44 chars) |
| NEAR | 397 | `m/44'/397'/0'/0/0` | .near or 64 char hex |

## 📚 API Usage Examples

### Create HD Wallet

```typescript
import { WalletService } from '@/services/wallets'

const walletService = new WalletService()

const result = await walletService.createWallet({
  investor_id: "123e4567-e89b-12d3-a456-426614174000",
  wallet_type: "hd_wallet",
  blockchains: ["ethereum", "bitcoin", "solana"],
  name: "My Multi-Chain Wallet"
})

if (result.success) {
  console.log('Wallet created:', result.data)
  // {
  //   id: "wallet-uuid",
  //   investor_id: "investor-uuid", 
  //   name: "My Multi-Chain Wallet",
  //   addresses: {
  //     ethereum: "0x...",
  //     bitcoin: "1...",
  //     solana: "..."
  //   },
  //   status: "active"
  // }
}
```

### Restore from Mnemonic

```typescript
import { HDWalletService } from '@/services/wallets'

const hdWalletService = new HDWalletService()

const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

const result = await hdWalletService.restoreFromMnemonic(mnemonic)

if (result.success) {
  console.log('Wallet restored:', result.data.derivationPaths)
}
```

### Add Blockchain Support

```typescript
const result = await walletService.addBlockchainSupport(
  "wallet-uuid",
  "polygon"
)

if (result.success) {
  console.log('Polygon support added:', result.data.addresses.polygon)
}
```

## 🔒 Security Implementation

### Current Security (Development)
- **Basic Encryption**: AES-256-GCM with derived keys
- **Database Storage**: Encrypted keys in `wallet_details` table
- **Input Validation**: Comprehensive validation for all inputs
- **Access Control**: Investor-based access restrictions

### Production Security Requirements ⚠️

**CRITICAL**: The current implementation uses development-grade security. For production deployment, implement:

1. **Hardware Security Module (HSM)**
   - Replace in-memory key operations with HSM calls
   - Secure key generation and storage
   - Tamper-resistant operations

2. **Key Management Service (KMS)**
   - AWS KMS, Azure Key Vault, or Google Cloud KMS
   - Secure key derivation and encryption
   - Audit logging and access controls

3. **Enhanced Authentication**
   - Multi-factor authentication for sensitive operations
   - Biometric authentication integration
   - Hardware token support

4. **Audit & Compliance**
   - Comprehensive audit logging
   - Real-time security monitoring  
   - Compliance reporting

## 📦 Database Schema

### Core Tables

#### `wallets`
```sql
id              UUID PRIMARY KEY
investor_id     UUID NOT NULL REFERENCES investors(id)
wallet_address  TEXT
wallet_type     TEXT NOT NULL DEFAULT 'hd_wallet'
blockchain      TEXT NOT NULL DEFAULT 'ethereum'
status          TEXT NOT NULL DEFAULT 'pending'
guardian_policy JSONB NOT NULL DEFAULT '{}'
signatories     JSONB NOT NULL DEFAULT '[]'
created_at      TIMESTAMP NOT NULL
updated_at      TIMESTAMP NOT NULL
```

#### `wallet_details`
```sql
id                        UUID PRIMARY KEY
wallet_id                 UUID REFERENCES wallets(id)
blockchain_specific_data  JSONB NOT NULL
created_at               TIMESTAMP
updated_at               TIMESTAMP
```

### HD Wallet Metadata Storage

The `wallet_details.blockchain_specific_data` stores HD wallet keys:

```json
{
  "detail_type": "hd_wallet_keys",
  "encrypted_seed": "base64-encoded-encrypted-seed",
  "master_public_key": "hex-encoded-master-public-key",
  "addresses": {
    "ethereum": "0x...",
    "bitcoin": "1...",
    "solana": "..."
  },
  "derivation_paths": {
    "ethereum": "m/44'/60'/0'/0/0",
    "bitcoin": "m/44'/0'/0'/0/0",
    "solana": "m/44'/501'/0'/0'"
  }
}
```

## 🧪 Testing

### Run Wallet Service Tests

```bash
# Install dependencies first
chmod +x scripts/install-wallet-dependencies.sh
./scripts/install-wallet-dependencies.sh

# Test HD wallet functionality
npm run test:wallets
```

### Manual Testing Examples

```typescript
// test-wallet-service.ts
import { WalletService, HDWalletService } from './src/services/wallets'

async function testWalletServices() {
  const walletService = new WalletService()
  const hdWalletService = new HDWalletService()
  
  // Test HD wallet generation
  const hdWallet = await hdWalletService.generateHDWallet()
  console.log('Generated mnemonic:', hdWallet.data?.mnemonic)
  
  // Test wallet creation
  const wallet = await walletService.createWallet({
    investor_id: "test-investor-id",
    wallet_type: "hd_wallet", 
    blockchains: ["ethereum", "bitcoin"]
  })
  
  console.log('Created wallet:', wallet.data?.id)
}

testWalletServices()
```

## 🚀 Deployment Requirements

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...

# Security (Production)
HSM_ENDPOINT=https://...
KMS_KEY_ID=...
ENCRYPTION_KEY=...

# Blockchain RPC Endpoints
ETHEREUM_RPC_URL=https://...
BITCOIN_RPC_URL=https://...
SOLANA_RPC_URL=https://...
```

### Required Dependencies

```json
{
  "dependencies": {
    "bip39": "^3.1.0",
    "bip32": "^4.0.0", 
    "bitcoinjs-lib": "^6.1.5",
    "ethers": "^6.8.0",
    "@solana/web3.js": "^1.87.6",
    "near-api-js": "^2.1.4"
  }
}
```

## 📈 Performance Considerations

### Database Optimization
- **Indexes**: Create indexes on frequently queried fields
- **Connection Pooling**: Use Prisma connection pooling
- **Query Optimization**: Selective loading of related data

### Caching Strategy
- **Address Caching**: Cache derived addresses to avoid re-computation
- **Key Caching**: Cache master keys in secure memory (production)
- **Balance Caching**: Cache blockchain balances with TTL

### Scalability
- **Horizontal Scaling**: Services can be horizontally scaled
- **Database Sharding**: Consider sharding by investor_id for large scale
- **Background Processing**: Move heavy operations to background queues

## 🔮 Next Steps (Phase 2-3)

### Phase 2: Transaction Infrastructure ⏳
- **TransactionService**: Multi-chain transaction building
- **SigningService**: Cryptographic signing for all chains
- **FeeEstimationService**: Dynamic fee calculation
- **NonceManagerService**: Prevent double-spending

### Phase 3: Multi-Signature & Advanced Features ⏳
- **MultiSigService**: Gnosis Safe integration
- **GuardianService**: Recovery mechanisms
- **ComplianceService**: AML/KYC transaction screening
- **AnalyticsService**: Wallet usage and performance analytics

### Phase 4: Production Hardening ⏳
- **HSM Integration**: Hardware security modules
- **Professional Custody**: DFNS, Fireblocks integration
- **Regulatory Compliance**: Full compliance reporting
- **Advanced Security**: Biometric auth, hardware tokens

## ⚠️ Important Notes

### Security Warnings
1. **Development Only**: Current encryption is for development use
2. **Production HSM Required**: Must integrate with HSM for production
3. **Key Rotation**: Implement regular key rotation procedures
4. **Audit Logging**: Enable comprehensive audit trails

### Regulatory Considerations
1. **MSB Licensing**: May require Money Service Business licensing
2. **State Regulations**: Check state-specific requirements
3. **International Compliance**: Consider international regulations
4. **KYC/AML**: Integrate with compliance screening services

### Backup & Recovery
1. **Key Backup**: Implement secure key backup procedures
2. **Disaster Recovery**: Plan for HSM failures and recovery
3. **Multi-Region**: Consider multi-region key distribution
4. **Testing**: Regularly test backup and recovery procedures

## 📞 Support

For technical support or questions about the wallet services:

1. **Documentation**: Review this README and code comments
2. **Testing**: Run the test suite to verify functionality
3. **Security**: Consult security experts for production deployment
4. **Compliance**: Engage legal counsel for regulatory compliance

---

**Status**: ✅ Phase 1 Complete - Foundation Services Implemented  
**Next**: Install dependencies and implement Phase 2 (Transaction Infrastructure)  
**Security**: ⚠️ Development-grade - Requires HSM integration for production
