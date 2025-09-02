# Chain Capital Smart Contract Wallet Research & Design

**Date:** August 4, 2025  
**Status:** Research & Planning Complete  
**Priority:** Phase 3A - Smart Contract Wallet Foundation  

## 📊 Research Summary

After comprehensive analysis of Barz Smart Contract Wallet and Trust Wallet Core, I've identified key architectural patterns and features we can integrate into Chain Capital's wallet infrastructure.

## 🔍 Key Findings from Barz Smart Contract Wallet

### **Diamond Proxy Pattern (EIP-2535)**

#### **Core Architecture**
- **Modular Facet System**: Each feature is a separate smart contract (facet)
- **Function Selector Routing**: Diamond proxy routes function calls to appropriate facets
- **Upgradeable Architecture**: Add, replace, or remove facets without changing proxy address
- **Gas-Efficient Storage**: Bit manipulation for function selector storage optimization

#### **Diamond Storage Structure**
```solidity
struct DiamondStorage {
    // Function selector → facet address mapping
    mapping(bytes4 => bytes32) facets;
    // Packed selector storage for gas efficiency  
    mapping(uint256 => bytes32) selectorSlots;
    uint16 selectorCount;
    // ERC-165 interface support
    mapping(bytes4 => bool) supportedInterfaces;
    // Default fallback handler
    IDiamondLoupe defaultFallbackHandler;
}
```

#### **Diamond Cut Operations**
- **Add**: Install new facets with function selectors
- **Replace**: Upgrade existing facets with new implementations
- **Remove**: Uninstall facets and remove function selectors

### **Multiple Signature Schemes**

#### **Secp256k1 (Traditional ECDSA)**
- Standard Ethereum wallet signatures
- Hardware wallet compatibility
- Metamask/WalletConnect support

#### **Secp256r1 (WebAuthn/Passkey)**
- **P-256 curve** for WebAuthn compatibility
- **Passkey Integration**: iCloud Keychain, Google Password Manager
- **Biometric Authentication**: TouchID, FaceID, Windows Hello
- **Cross-Platform**: iOS, Android, Desktop browsers

```solidity
function _validateSignature(
    uint256[2] memory q,      // P-256 public key coordinates
    bytes32 _hash,            // Message hash
    bytes memory _signature   // WebAuthn signature data
) internal view returns (bool) {
    (
        uint256 rValue,           // ECDSA r value
        uint256 sValue,           // ECDSA s value  
        bytes memory authenticatorData,     // WebAuthn authenticator data
        string memory clientDataJSONPre,    // Client data prefix
        string memory clientDataJSONPost    // Client data suffix
    ) = abi.decode(_signature, (uint256, uint256, bytes, string, string));

    // Reconstruct clientDataJSON with challenge
    string memory opHashBase64 = Base64.encode(bytes.concat(_hash));
    string memory clientDataJSON = string.concat(
        clientDataJSONPre, opHashBase64, clientDataJSONPost
    );
    
    // Compute WebAuthn signature hash
    bytes32 clientHash = sha256(bytes(clientDataJSON));
    bytes32 sigHash = sha256(bytes.concat(authenticatorData, clientHash));
    
    // Verify P-256 signature
    return LibSecp256r1.Verify(q, rValue, sValue, uint256(sigHash));
}
```

### **Guardian Recovery System**

#### **Time-Delayed Security Model**
- **Pending Periods**: Guardian additions/removals have security delays
- **Security Windows**: Limited time windows for confirming operations
- **Majority Voting**: Multiple guardians must approve recovery
- **Social Recovery**: Guardian-based wallet recovery without seed phrases

#### **Guardian Management Flow**
1. **Request Addition**: Owner initiates guardian addition
2. **Security Period**: Configurable delay (e.g., 24-48 hours)
3. **Confirmation Window**: Limited window to confirm (e.g., 7 days)
4. **Active Guardian**: Guardian becomes active and can participate in recovery

### **Account Abstraction (EIP-4337)**

#### **UserOperation Structure**
```solidity
struct UserOperation {
    address sender;           // Smart contract wallet address
    uint256 nonce;           // Anti-replay nonce
    bytes initCode;          // Wallet creation code (if not deployed)
    bytes callData;          // Function call data
    uint256 callGasLimit;    // Gas limit for execution
    uint256 verificationGasLimit;  // Gas limit for verification
    uint256 preVerificationGas;    // Gas for pre-verification
    uint256 maxFeePerGas;          // EIP-1559 fee cap
    uint256 maxPriorityFeePerGas;  // EIP-1559 priority fee
    bytes paymasterAndData;        // Paymaster info (for gasless txns)
    bytes signature;               // Signature data
}
```

#### **Benefits**
- **Gasless Transactions**: Paymasters can sponsor gas fees
- **Batch Operations**: Multiple transactions in single UserOperation
- **Custom Logic**: Smart contract validation rules
- **Better UX**: No need to hold ETH for gas fees

## 🔍 Key Findings from Trust Wallet Core

### **Multi-Chain Architecture**

#### **CoinInfo Structure**
```cpp
struct CoinInfo {
    const char* id;                    // Chain identifier
    const char* name;                  // Human readable name
    TWBlockchain blockchain;           // Blockchain family
    TWCurve curve;                     // Cryptographic curve
    std::vector<Derivation> derivation; // Supported derivation paths
    TWPublicKeyType publicKeyType;     // Public key format
    Hash::Hasher addressHasher;        // Address hash function
    uint32_t slip44;                   // SLIP-44 coin type
    // ... chain-specific parameters
};
```

#### **Universal Interfaces**
- **anyCoinSign()**: Universal signing across all chains
- **anyCoinPlan()**: Transaction planning and fee estimation
- **deriveAddress()**: Universal address derivation
- **validateAddress()**: Universal address validation

#### **Supported Blockchains (130+)**
- **Bitcoin Family**: BTC, BCH, LTC, DOGE, ZEC
- **Ethereum Family**: ETH, BSC, MATIC, AVAX, FTM
- **Cosmos Ecosystem**: ATOM, OSMO, JUNO, SCRT
- **Solana Ecosystem**: SOL, SRM, RAY
- **Other L1s**: ADA, DOT, NEAR, ALGO, XLM

### **HD Wallet Implementation**

#### **BIP Standards Support**
- **BIP32**: Hierarchical Deterministic Wallets
- **BIP39**: Mnemonic code for generating seeds
- **BIP44**: Multi-account hierarchy for deterministic wallets

#### **Advanced Features**
- **Multiple Curves**: secp256k1, ed25519, P-256, Curve25519
- **Chain-Specific Derivation**: Different paths per blockchain
- **Extended Keys**: Support for xpub/xprv key formats
- **Entropy Management**: Secure seed generation and storage

## 🏗️ Chain Capital Smart Contract Wallet Architecture

### **Hybrid Architecture Design**

We will implement a **hybrid approach** that combines:

1. **Traditional HD Wallets** (Phase 1 ✅ Complete)
2. **Smart Contract Wallets** (Phase 3A - Planned)
3. **Multi-Chain Support** (Enhanced with Trust Wallet patterns)

### **Architecture Overview**

```
Chain Capital Wallet Ecosystem
├── Traditional HD Wallets (✅ Complete)
│   ├── WalletService.ts
│   ├── HDWalletService.ts  
│   ├── SigningService.ts
│   └── 8 blockchain support
├── Smart Contract Wallets (🔄 Phase 3A)
│   ├── SmartContractWalletService.ts     # Diamond proxy management
│   ├── FacetRegistryService.ts           # Trusted facet registry
│   ├── WebAuthnService.ts                # Passkey authentication
│   ├── GuardianRecoveryService.ts        # Social recovery
│   ├── AccountAbstractionService.ts      # EIP-4337 UserOps
│   └── Multi-signature coordination
└── Enhanced Multi-Chain (🔄 Phase 3B)
    ├── Extended blockchain support (130+)
    ├── Chain-specific parameters
    ├── Universal signing interfaces
    └── Advanced derivation paths
```

### **Database Schema Extensions**

```sql
-- Smart Contract Wallets
CREATE TABLE smart_contract_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    diamond_proxy_address TEXT NOT NULL,
    implementation_version TEXT NOT NULL,
    facet_registry_address TEXT NOT NULL,
    is_deployed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wallet Facets
CREATE TABLE wallet_facets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    facet_name TEXT NOT NULL,
    facet_address TEXT NOT NULL,
    function_selectors TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- WebAuthn Credentials
CREATE TABLE webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL,
    public_key_x TEXT NOT NULL, -- P-256 x coordinate
    public_key_y TEXT NOT NULL, -- P-256 y coordinate
    authenticator_data TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Guardian System
CREATE TABLE wallet_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    guardian_address TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending_add', 'active', 'pending_remove')) DEFAULT 'pending_add',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    security_period_ends TIMESTAMP WITH TIME ZONE
);

-- Account Abstraction
CREATE TABLE user_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id),
    user_op_hash TEXT NOT NULL UNIQUE,
    sender_address TEXT NOT NULL,
    nonce BIGINT NOT NULL,
    call_data TEXT NOT NULL,
    signature_data TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'included', 'failed')) DEFAULT 'pending',
    transaction_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 📋 Implementation Roadmap

### **Phase 3A: Diamond Proxy Foundation (4-6 weeks)**

#### **Week 1-2: Core Infrastructure**
1. **SmartContractWalletService.ts**
   - Diamond proxy deployment
   - Facet management (add/remove/replace)
   - Function selector routing

2. **FacetRegistryService.ts**
   - Trusted facet registry
   - Security validation
   - Version management

#### **Week 3-4: WebAuthn Integration**
3. **WebAuthnService.ts**
   - P-256 key generation
   - WebAuthn ceremony handling
   - Cross-platform passkey support

4. **Secp256r1SigningService.ts**
   - P-256 signature verification
   - WebAuthn signature parsing
   - Integration with existing signing service

#### **Week 5-6: Guardian System**
5. **GuardianRecoveryService.ts**
   - Guardian management
   - Social recovery workflows
   - Time-delayed security

6. **Database Integration**
   - Schema migrations
   - Service integration
   - Testing and validation

### **Phase 3B: Account Abstraction (4-6 weeks)**

#### **Week 7-8: EIP-4337 Support**
1. **AccountAbstractionService.ts**
   - UserOperation handling
   - EntryPoint integration
   - Paymaster support

2. **UserOperationBuilder.ts**
   - Transaction planning
   - Gas estimation
   - Batch operations

#### **Week 9-10: Advanced Features**  
3. **MultiSigCoordinationService.ts**
   - Multi-signature workflows
   - Threshold management
   - Proposal/approval system

4. **WalletUpgradeService.ts**
   - Facet upgrade management
   - Signature scheme migration
   - Backwards compatibility

### **Phase 3C: Extended Multi-Chain (6-8 weeks)**

#### **Enhanced Blockchain Support**
1. **ExtendedBlockchainService.ts**
   - 130+ blockchain support
   - Chain-specific parameters
   - Universal interfaces

2. **AdvancedDerivationService.ts**
   - Multiple derivation paths
   - Chain-specific formats
   - Extended key support

## 🎯 Next Steps: Immediate Implementation

### **This Week: Foundation Setup**

1. **Create Service Structure**
```bash
mkdir -p backend/src/services/wallets/smart-contract
mkdir -p backend/src/services/wallets/webauthn
mkdir -p backend/src/services/wallets/guardian
```

2. **Database Migration**
```sql
-- Add smart contract wallet tables
-- See schema above
```

3. **Core Service Implementation**
   - SmartContractWalletService.ts
   - FacetRegistryService.ts
   - WebAuthnService.ts (basic structure)

### **Next Week: WebAuthn MVP**

1. **Implement P-256 Key Generation**
2. **Basic WebAuthn Ceremony Support** 
3. **Integration with existing WalletService**

### **Success Metrics**

#### **Phase 3A Completion**
- ✅ Deploy Diamond proxy wallets
- ✅ Add/remove facets dynamically  
- ✅ WebAuthn passkey authentication
- ✅ Guardian recovery system
- ✅ Zero TypeScript compilation errors

#### **Business Impact**
- **Advanced Security**: Guardian recovery + passkeys
- **Superior UX**: Gasless transactions + biometric auth
- **Market Differentiation**: Smart contract wallet capabilities
- **Enterprise Features**: Modular upgrades + compliance

## 🔧 Technical Considerations

### **Security Requirements**
- **Facet Registry**: Only trusted, audited facets
- **Time Delays**: Guardian operations have security periods
- **Multi-Signature**: Threshold-based approvals
- **Audit Logging**: Comprehensive operation tracking

### **Performance Optimization**
- **Gas Efficiency**: Optimized Diamond storage patterns
- **Batch Operations**: Multiple transactions per UserOperation
- **Caching**: Function selector caching
- **Connection Pooling**: Blockchain RPC optimization

### **Compatibility**
- **Backwards Compatible**: Traditional HD wallets remain supported
- **Progressive Enhancement**: Users can upgrade to smart contracts
- **Cross-Platform**: WebAuthn works on all devices
- **Standard Compliance**: EIP-2535, EIP-4337, EIP-1271

---

**Status:** ✅ **RESEARCH COMPLETE - READY FOR IMPLEMENTATION**  
**Next Phase:** Phase 3A Implementation (4-6 weeks)  
**Investment Required:** $80K-120K development + infrastructure  
**Business Impact:** Market-leading smart contract wallet capabilities
