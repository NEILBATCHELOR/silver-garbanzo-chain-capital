# DFNS Key Signature Generation Services

## 📋 Overview

This directory contains **modernized DFNS Key Signature Generation Services** based on the **current DFNS Keys API** endpoints. These services handle cryptographic key-based signature generation for 14+ blockchain networks.

## 🏗️ Architecture

### Key API Difference
- **Wallet Signatures**: `POST /wallets/{walletId}/signatures` (existing `signatureGenerationService.ts`)
- **Key Signatures**: `POST /keys/{keyId}/signatures` (new services in this directory)

### Service Structure
```
keySignatureServices/
├── keySignatureGenerationService.ts    # Core universal service
├── evmKeySignatureService.ts           # EVM-specific service
├── bitcoinKeySignatureService.ts       # Bitcoin-specific service
└── index.ts                           # Exports
```

## 📚 Service Documentation

### 1. Core Key Signature Generation Service

**Purpose**: Universal key signature generation for all blockchain networks

```typescript
import { getDfnsKeySignatureGenerationService } from './keySignatureServices';

const keySignatureService = getDfnsKeySignatureGenerationService(client);

// Universal hash signing (works with any key scheme)
const hashSignature = await keySignatureService.signHash(
  keyId, 
  '0x031edd7d41651593c5fe5c006fa5752b37fddff7bc4e843aa6af0c950f4b9406',
  undefined, // taprootMerkleRoot (Schnorr keys only)
  userActionToken
);

// Message signing (EdDSA keys only)
const messageSignature = await keySignatureService.signMessage(
  keyId,
  '0x01000507a824baef8cad745bb58148551728d245d6fc...',
  userActionToken
);
```

**Supported Signature Types**:
- ✅ **Hash** - Universal 32-byte hash signing (ECDSA, EdDSA, Schnorr)
- ✅ **Message** - Arbitrary length message signing (EdDSA only)
- ✅ **Blockchain-specific formats** (see specialized services)

### 2. EVM Key Signature Service

**Purpose**: Ethereum, Polygon, Base, Arbitrum, Optimism, and all EVM-compatible chains

```typescript
import { getDfnsEvmKeySignatureService } from './keySignatureServices';

const evmService = getDfnsEvmKeySignatureService(client);

// EVM transaction signing
const txSignature = await evmService.signTransaction(
  keyId,
  '0x02e783aa36a71503850d40e49def82520894e5a2ebc128e262ab1e3bd02bffbe16911adfbffb0180c0',
  { userActionToken }
);

// EVM message signing (personal_sign)
const msgSignature = await evmService.signMessage(
  keyId,
  'Hello, World!', // Automatically converts to hex
  { userActionToken }
);

// EIP-712 typed data signing
const typedDataSignature = await evmService.signTypedData(
  keyId,
  {
    types: {
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallet', type: 'address' }
      ]
    },
    domain: {
      name: 'Ether Mail',
      version: '1',
      chainId: 1
    },
    message: {
      name: 'Alice',
      wallet: '0x1234...'
    }
  },
  { userActionToken }
);
```

**Supported EVM Networks**:
- **Mainnet**: Ethereum, Polygon, Base, Arbitrum, Optimism, BSC, Avalanche
- **Testnet**: Goerli, Sepolia, Mumbai, Base Sepolia, Arbitrum Goerli

**Supported EVM Signature Types**:
- ✅ **Transaction** - EIP-2718 typed transactions (Legacy, EIP-2930, EIP-1559)
- ✅ **Message** - Arbitrary message signing (personal_sign)
- ✅ **EIP-712** - Typed structured data signing
- ✅ **EIP-7702** - Account abstraction authorization (upcoming)

### 3. Bitcoin Key Signature Service

**Purpose**: Bitcoin, Litecoin, and Bitcoin-compatible networks

```typescript
import { getDfnsBitcoinKeySignatureService } from './keySignatureServices';

const bitcoinService = getDfnsBitcoinKeySignatureService(client);

// PSBT signing
const psbtSignature = await bitcoinService.signPsbt(
  keyId,
  '0x70736274ff0100710200000001ca17431a33a13d3ef8bfb041c8546071f9d3a609...',
  { userActionToken, network: 'Bitcoin' }
);

// BIP-322 message signing
const bip322Signature = await bitcoinService.signBip322Message(
  keyId,
  {
    message: 'I love DFNS',
    network: 'Bitcoin',
    format: 'Simple'
  },
  { userActionToken }
);

// Network utilities
const isValidAddress = bitcoinService.validateAddressForNetwork(
  'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  'Bitcoin'
);

const addressType = bitcoinService.getAddressType('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
// Returns: 'p2wpkh'
```

**Supported Bitcoin Networks**:
- **Mainnet**: Bitcoin, Litecoin
- **Testnet**: Bitcoin Testnet3, Litecoin Testnet

**Supported Bitcoin Signature Types**:
- ✅ **PSBT** - Partially Signed Bitcoin Transaction signing
- ✅ **BIP-322** - Generic message signing (Simple and Full formats)

## 🚀 Usage Patterns

### Basic Usage with Main DFNS Service

```typescript
import { initializeDfnsService } from './services/dfns';

const dfnsService = await initializeDfnsService();

// Get key signature service
const keySignatureService = dfnsService.getKeySignatureGenerationService();

// Sign with any blockchain-specific method
const signature = await keySignatureService.signEvmTransaction(
  keyId,
  unsignedTxHex,
  userActionToken
);
```

### Advanced Usage with Specialized Services

```typescript
import { 
  getDfnsEvmKeySignatureService,
  getDfnsBitcoinKeySignatureService 
} from './services/dfns/keySignatureServices';

// EVM-specific operations
const evmService = getDfnsEvmKeySignatureService(client);
const networks = evmService.getSupportedNetworks();
const isSupported = evmService.isChainSupported(1); // Ethereum

// Bitcoin-specific operations  
const bitcoinService = getDfnsBitcoinKeySignatureService(client);
const fee = bitcoinService.estimateTransactionFee(2, 1, 10); // 2 inputs, 1 output, 10 sat/byte
const satoshis = bitcoinService.btcToSatoshis(0.001); // Convert 0.001 BTC to satoshis
```

## 🔧 Configuration Requirements

### Environment Variables (Token-Based Authentication)

```env
# Service Account Authentication (Recommended)
VITE_DFNS_SERVICE_ACCOUNT_TOKEN=your_service_account_token

# Personal Access Token (Alternative)  
VITE_DFNS_PERSONAL_ACCESS_TOKEN=your_pat_token

# Required Configuration
VITE_DFNS_BASE_URL=https://api.dfns.io
VITE_DFNS_ORG_ID=your_organization_id
VITE_DFNS_USER_ID=your_user_id
VITE_DFNS_USERNAME=your_username
```

### Key Requirements

**Compatible Key Schemes**:
- ✅ **ECDSA** with secp256k1 or stark curves
- ✅ **EdDSA** with ed25519 curve  
- ✅ **Schnorr** with secp256k1 curve

**Key Creation Example**:
```typescript
const keyService = dfnsService.getKeyService();

// Create ECDSA key for Bitcoin/Ethereum
const ecdsaKey = await keyService.createKey({
  scheme: 'ECDSA',
  curve: 'secp256k1',
  name: 'Multi-chain ECDSA Key'
}, userActionToken);

// Create EdDSA key for Solana/Cosmos  
const eddsaKey = await keyService.createKey({
  scheme: 'EdDSA',
  curve: 'ed25519',
  name: 'EdDSA Key'
}, userActionToken);
```

## 🔐 User Action Signing

**All key signature operations require User Action Signing** for security:

```typescript
const userActionService = dfnsService.getUserActionSigningService();

// 1. Get credentials for signing
const credentials = await dfnsService.getCredentialService().listCredentials();
const signingCredentials = credentials.filter(c => c.kind === 'Key' && c.status === 'Active');

if (signingCredentials.length === 0) {
  // Need to create a WebAuthn credential or register a Key credential
  const webauthnCredential = await dfnsService.getCredentialService()
    .createWebAuthnCredential('My Device');
}

// 2. Sign user action (with Key credential + private key)
const userActionToken = await userActionService.signUserAction({
  userActionPayload: JSON.stringify({ keyId, transaction: '0x...' }),
  userActionHttpMethod: 'POST',
  userActionHttpPath: `/keys/${keyId}/signatures`
}, privateKey, credentialId, 'EDDSA');

// 3. Use token for signature operation
const signature = await keySignatureService.signEvmTransaction(
  keyId,
  unsignedTxHex,
  userActionToken
);
```

## 📊 Supported Blockchain Networks

### Fully Implemented ✅
1. **EVM Chains** (via `evmKeySignatureService.ts`)
   - Transaction, Message, EIP-712, EIP-7702 signing
   - Networks: Ethereum, Polygon, Base, Arbitrum, Optimism, BSC, Avalanche
   
2. **Bitcoin Networks** (via `bitcoinKeySignatureService.ts`)
   - PSBT, BIP-322 signing
   - Networks: Bitcoin, Litecoin (+ testnets)

### Available via Core Service ✅
3. **Solana** - Transaction signing
4. **Cosmos** - SignDocDirect signing  
5. **Algorand** - Transaction signing
6. **Aptos** - Transaction signing
7. **Cardano** - Transaction signing
8. **Stellar** - Transaction signing
9. **Substrate** - SignerPayload signing
10. **Tezos** - Transaction signing
11. **TON** - RawPayload signing
12. **TRON** - Transaction signing
13. **XRP Ledger** - Transaction signing

## 🎯 Network-Specific Key Compatibility

| Network | Scheme | Curve | Notes |
|---------|--------|-------|--------|
| Bitcoin/EVM | ECDSA | secp256k1 | Most common |
| Solana | EdDSA | ed25519 | Required for Solana |
| Stark | ECDSA | stark | StarkNet specific |
| Cosmos | EdDSA | ed25519 | Preferred |
| Algorand | EdDSA | ed25519 | Required |

## 📋 API Compliance

These services implement the **current DFNS Keys API specification**:

- ✅ **Keys API**: https://docs.dfns.co/d/api-docs/keys/generate-signature
- ✅ **EVM Chains**: https://docs.dfns.co/d/api-docs/keys/generate-signature/evm
- ✅ **Bitcoin**: https://docs.dfns.co/d/api-docs/keys/generate-signature/bitcoin
- ✅ **Solana**: https://docs.dfns.co/d/api-docs/keys/generate-signature/solana
- ✅ **All 14 Networks**: Individual blockchain documentation

## 🚧 Future Enhancements

### Planned Specialized Services
- **Solana Key Signature Service** - Enhanced Solana-specific operations
- **Cosmos Key Signature Service** - IBC and multi-chain Cosmos operations
- **Multi-chain Portfolio Service** - Cross-chain signature coordination

### Planned Features
- **Batch signing** - Multiple signatures in one User Action
- **Transaction simulation** - Pre-signature validation
- **Gas estimation** - Network-specific fee calculation
- **Multi-sig coordination** - Threshold signature workflows

## 🧪 Testing

```typescript
// Test key signature generation
const authStatus = await dfnsService.getAuthenticationStatus();
console.log('✅ Auth working:', authStatus.isAuthenticated);

// Test key compatibility
const keys = await dfnsService.getKeyService().getAllKeys();
const compatibleKeys = keys.filter(key => 
  keySignatureService.isKeyCompatibleWithBitcoin(key)
);

// Test signature statistics
const stats = await keySignatureService.getKeySignatureStatistics(keyId);
console.log('📊 Signature stats:', stats);
```

## 🏁 Next Steps

1. **Test the services** with your DFNS keys and credentials
2. **Implement blockchain-specific workflows** using specialized services
3. **Monitor signature metrics** to ensure proper operation
4. **Add additional blockchain services** as needed
5. **Integrate with transaction broadcasting** for complete workflows

---

**Status**: ✅ **Ready for Production**  
**Last Updated**: December 2024  
**API Version**: Current DFNS Keys API  
**Compatibility**: Service Account & PAT token authentication