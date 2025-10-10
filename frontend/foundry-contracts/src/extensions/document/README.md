# Universal Document Module (ERC-1643)
## Multi-Standard Document Management System

**Implementation Date**: October 7, 2025  
**Status**: ✅ Complete & Ready for Integration  
**Location**: `/frontend/foundry-contracts/src/extensions/document/`

---

## 📋 Overview

A **universal document management system** implementing **ERC-1643** that works across multiple token standards:
- ✅ **ERC-20** (Physical Commodities)
- ✅ **ERC-3525** (Structured Products)
- ✅ **ERC-4626** (Investment Funds)
- ✅ **ERC-1400** (Securities) - Compatible
- ✅ **Future Standards** - Extensible design

### Key Innovation: Scope-Based Architecture

Instead of separate modules per standard, **ONE universal module** uses a **scope parameter** for different contexts:

```solidity
// Global documents (ERC-20, ERC-4626)
setDocument("global", "ASSAY_CERT", uri, hash);

// Slot-specific documents (ERC-3525)
setScopedDocument("slot:1", "PROSPECTUS", uri, hash);

// Partition documents (ERC-1400)
setScopedDocument("partition:0x...", "BYLAWS", uri, hash);
```

---

## 🎯 Features

- ✅ **ERC-1643 Compliant**: Standard document management interface
- ✅ **Multi-Standard Support**: Works with ERC-20, ERC-3525, ERC-4626, etc.
- ✅ **Scope-Based Organization**: Global, slot-specific, partition-specific
- ✅ **Version Tracking**: Automatic versioning (v1, v2, v3...)
- ✅ **Hash Verification**: Document integrity checks
- ✅ **Timestamp Tracking**: When documents were modified
- ✅ **UUPS Upgradeable**: Safe upgrades with role protection
- ✅ **Event History**: Full audit trail

---

## 🏗️ Architecture

### Scope System

| Scope Format | Use Case | Example |
|--------------|----------|---------|
| `"global"` | Entire token/vault | ERC-20 commodities, ERC-4626 funds |
| `"slot:123"` | ERC-3525 slot | Structured products, derivatives |
| `"partition:0x..."` | ERC-1400 partition | Share classes, bond series |
| Custom | Future standards | Extensible design |

### ERC-3525 Integration

**SlotManager vs. DocumentModule** - Perfect Complement:

| Feature | SlotManager | DocumentModule |
|---------|-------------|----------------|
| **Purpose** | Product metadata | Legal documents |
| **Data Type** | JSON, key-value | Formal docs with versioning |
| **Formality** | Informal, flexible | Formal, regulated |
| **Examples** | "strike=1800", "expiry=2024" | Prospectus, term sheets |
| **Audit Trail** | Basic events | Full version history |

**They work together**:
```solidity
// SlotManager: What IS this slot?
slotManager.setSlotMetadata(1, '{"strike":4500,"underlying":"SPX"}');

// DocumentModule: What are the LEGAL DOCS?
documentModule.setScopedDocument("slot:1", "PROSPECTUS", "ipfs://...", hash);
documentModule.setScopedDocument("slot:1", "TERM_SHEET", "ipfs://...", hash);
```

---

## 📦 File Structure

```
/extensions/document/
├── UniversalDocumentModule.sol          # Main implementation
├── interfaces/
│   ├── IERC1643.sol                    # Standard ERC-1643 interface
│   └── IUniversalDocumentModule.sol    # Enhanced with scoping
└── storage/
    └── UniversalDocumentStorage.sol    # Storage layout
```

---

## 🚀 Usage by Token Standard

### 1. ERC-20 (Physical Commodities)

**Use Case**: Gold tokens, oil, agricultural products

**Documents Needed**:
- Quality certificates
- Assay certificates
- Storage receipts
- Insurance policies
- Redemption terms

**Implementation**:
```solidity
// Deploy document module
UniversalDocumentModule docModule = new UniversalDocumentModule();
docModule.initialize(admin);

// Set gold token documents (global scope)
bytes32 GLOBAL = keccak256("global");

docModule.setDocument(
    "ASSAY_CERT_2024",
    "ipfs://QmAssayCertificate...",
    keccak256("99.99% pure gold, 400 oz bar")
);

docModule.setDocument(
    "STORAGE_RECEIPT",
    "ipfs://QmStorageReceipt...",
    keccak256("Vault: Brinks London, Bay A-123")
);

docModule.setDocument(
    "INSURANCE_POLICY",
    "ipfs://QmInsurancePolicy...",
    keccak256("Lloyd's Policy #12345, $50M coverage")
);

// Query documents
(string memory uri, bytes32 hash, uint256 timestamp) = 
    docModule.getDocument("ASSAY_CERT_2024");

// Get all documents
bytes32[] memory allDocs = docModule.getAllDocuments();
```

**Benefits for Commodities**:
- ✅ Proves authenticity (assay certificates)
- ✅ Verifies storage (warehouse receipts)
- ✅ Shows insurance coverage
- ✅ Enables physical redemption

---

### 2. ERC-3525 (Structured Products)

**Use Case**: Structured notes, autocallables, CLOs

**Documents Needed**:
- Prospectus (per slot)
- Term sheets (per slot)
- Offering memorandum
- Risk disclosures
**Implementation**:
```solidity
// Create structured product slots
slotManager.createSlot(1, "Autocallable Note on S&P 500", "8% coupon");
slotManager.createSlot(2, "Reverse Convertible", "15% coupon if barrier not breached");

// Set slot metadata (product specs - SlotManager)
slotManager.setSlotMetadata(1, '{"underlying":"SPX","strike":4500,"barrier":3600}');

// Set legal documents (regulatory compliance - DocumentModule)
bytes32 slot1Scope = keccak256(abi.encodePacked("slot:", uint256(1)));

docModule.setScopedDocument(
    slot1Scope,
    "PROSPECTUS",
    "ipfs://QmProspectusSlot1...",
    keccak256("Final Prospectus Supplement dated Oct 7, 2025")
);

docModule.setScopedDocument(
    slot1Scope,
    "TERM_SHEET",
    "ipfs://QmTermSheetSlot1...",
    keccak256("Preliminary Terms dated Oct 1, 2025")
);

docModule.setScopedDocument(
    slot1Scope,
    "RISK_DISCLOSURE",
    "ipfs://QmRiskDisclosure...",
    keccak256("Complete risk factors as of Oct 2025")
);

// Set documents for slot 2
bytes32 slot2Scope = keccak256(abi.encodePacked("slot:", uint256(2)));

docModule.setScopedDocument(
    slot2Scope,
    "PROSPECTUS",
    "ipfs://QmProspectusSlot2...",
    keccak256("Reverse Convertible Prospectus")
);

// Query slot-specific documents
(string memory uri, bytes32 hash, uint256 timestamp, uint256 version) = 
    docModule.getScopedDocument(slot1Scope, "PROSPECTUS");

// Get all documents for a slot
bytes32[] memory slot1Docs = docModule.getAllScopedDocuments(slot1Scope);
```

**SlotManager vs. DocumentModule Example**:
```solidity
// ❌ WRONG: Putting legal docs in SlotManager
slotManager.setSlotProperty(1, "prospectusURI", "ipfs://...");  // Informal, no versioning

// ✅ CORRECT: Separation of concerns
// SlotManager: Product specifications
slotManager.setSlotProperty(1, "strike", "4500");
slotManager.setSlotProperty(1, "maturity", "2026-10-07");

// DocumentModule: Legal compliance
docModule.setScopedDocument("slot:1", "PROSPECTUS", "ipfs://...", hash);  // Formal, versioned
```

**Benefits for Structured Products**:
- ✅ Slot-specific documentation
- ✅ Version tracking for regulatory updates
- ✅ Clear separation: specs vs. legal docs
- ✅ Audit trail for compliance

---

### 3. ERC-4626 (Investment Funds)

**Use Case**: Hedge funds, ETFs, money market funds

**Documents Needed**:
- Offering memorandum
- Private placement memorandum (PPM)
- Prospectus
- Financial statements
- Compliance certifications

**Implementation**:
```solidity
// Deploy vault and document module
ERC4626Master vault = new ERC4626Master();
vault.initialize(USDC, "Chain Capital Hedge Fund", "CCHF", ...);

docModule.initialize(admin);

// Set fund documents (global scope)
docModule.setDocument(
    "OFFERING_MEMO",
    "ipfs://QmOfferingMemo...",
    keccak256("Private Placement Memorandum dated Oct 2025")
);

docModule.setDocument(
    "PPM",
    "ipfs://QmPPM...",
    keccak256("Confidential Private Placement Memorandum")
);

docModule.setDocument(
    "AUDITED_FINANCIALS_2024",
    "ipfs://QmFinancials...",
    keccak256("Audited by Deloitte, Sept 30, 2024")
);

docModule.setDocument(
    "SEC_FORM_D",
    "ipfs://QmFormD...",
    keccak256("SEC Form D filing - Oct 1, 2025")
);

docModule.setDocument(
    "COMPLIANCE_CERT",
    "ipfs://QmCompliance...",
    keccak256("Q3 2025 Compliance Certification")
);

// Update document (automatically increments version)
docModule.setDocument(
    "AUDITED_FINANCIALS_2024",
    "ipfs://QmFinancialsAmended...",
    keccak256("Amended financials - Oct 15, 2025")
);
// Now version = 2, old version = 1

// Query with version info
(string memory uri, bytes32 hash, uint256 timestamp, uint256 version) = 
    docModule.getScopedDocument(keccak256("global"), "AUDITED_FINANCIALS_2024");
// version = 2
```

**Benefits for Funds**:
- ✅ Regulatory compliance (SEC, FINRA)
- ✅ Investor transparency
- ✅ Version tracking for amendments
- ✅ Audit trail for compliance officers

---

## 🔄 Version Management

### Automatic Versioning

Documents automatically version when updated:

```solidity
// First version (v1)
docModule.setDocument("PROSPECTUS", "ipfs://v1...", hash1);
// Document created: version = 1

// Update (v2)
docModule.setDocument("PROSPECTUS", "ipfs://v2...", hash2);
// DocumentVersionUpdated event: oldVersion=1, newVersion=2

// Update (v3)
docModule.setDocument("PROSPECTUS", "ipfs://v3...", hash3);
// DocumentVersionUpdated event: oldVersion=2, newVersion=3

// Query current version
(, , , uint256 version) = docModule.getScopedDocument(scope, "PROSPECTUS");
// version = 3
```

### Version History via Events

Track document history by listening to events:

```typescript
// Listen for version updates
documentModule.on("DocumentVersionUpdated", (scope, name, oldVersion, newVersion) => {
  console.log(`${name} updated: v${oldVersion} → v${newVersion}`);
});

// Listen for new documents
documentModule.on("ScopedDocumentSet", (scope, name, uri, hash, version) => {
  console.log(`Document ${name} set: ${uri} (v${version})`);
});
```

---

## 🔒 Access Control

### Roles

| Role | Permissions | Typical Holders |
|------|-------------|-----------------|
| `DEFAULT_ADMIN_ROLE` | Grant/revoke roles | Multi-sig, DAO |
| `DOCUMENT_MANAGER_ROLE` | Set/remove documents | Compliance officer, Legal team |
| `UPGRADER_ROLE` | Upgrade implementation | Technical admin |

### Example Setup

```solidity
// Grant document manager role to compliance officer
docModule.grantRole(
    docModule.DOCUMENT_MANAGER_ROLE(),
    complianceOfficer
);

// Grant upgrader role to multi-sig
docModule.grantRole(
    docModule.UPGRADER_ROLE(),
    multiSigWallet
);

// Revoke role
docModule.revokeRole(
    docModule.DOCUMENT_MANAGER_ROLE(),
    formerEmployee
);
```

---

## 📊 Comparison with Alternatives

### vs. SlotManager (ERC-3525)

| Feature | SlotManager | DocumentModule |
|---------|-------------|----------------|
| Purpose | Product metadata | Legal documents |
| Versioning | ❌ No | ✅ Automatic |
| Hash Verification | ❌ No | ✅ Yes |
| Event History | Basic | Comprehensive |
| Audit Trail | Limited | Complete |
| Formality | Informal | Formal/Regulated |

**Use Both**: SlotManager for product specs, DocumentModule for legal compliance.

### vs. Off-Chain Storage

| Feature | Off-Chain | DocumentModule |
|---------|-----------|----------------|
| On-Chain Verification | ❌ No | ✅ Yes (hash) |
| Immutable History | ❌ No | ✅ Yes (events) |
| Version Tracking | Manual | Automatic |
| Regulatory Compliance | Harder | Easier |
| Gas Cost | Free | ~80K gas per doc |

**Hybrid Approach**: Store docs off-chain (IPFS), reference on-chain (DocumentModule).

---

## 🧪 Testing

### Run Tests

```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts

# Test document module
forge test --match-path test/extensions/UniversalDocumentModule.t.sol -vvv
```

### Test Coverage

- ✅ Document creation
- ✅ Document updates (versioning)
- ✅ Document removal
- ✅ Scope management
- ✅ Hash verification
- ✅ Access control
- ✅ Event emission
- ✅ Error cases

---

## 🚢 Deployment

### Prerequisites

```bash
export PRIVATE_KEY="your_private_key"
export RPC_URL="https://sepolia.infura.io/v3/..."
```

### Deploy Script

```solidity
// script/DeployUniversalDocumentModule.s.sol
contract DeployUniversalDocumentModule is Script {
    function run() external {
        vm.startBroadcast();
        
        // Deploy implementation
        UniversalDocumentModule implementation = new UniversalDocumentModule();
        
        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            abi.encodeCall(implementation.initialize, (msg.sender))
        );
        
        UniversalDocumentModule docModule = UniversalDocumentModule(address(proxy));
        
        console.log("Implementation:", address(implementation));
        console.log("Proxy:", address(proxy));
        
        vm.stopBroadcast();
    }
}
```

### Deploy Command

```bash
forge script script/DeployUniversalDocumentModule.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify
```

---

## 📚 Integration Examples

### With ERC-20 Token

```solidity
contract GoldToken is ERC20Master {
    UniversalDocumentModule public documentModule;
    
    function setDocumentModule(address _docModule) external onlyOwner {
        documentModule = UniversalDocumentModule(_docModule);
    }
    
    function getAssayCertificate() external view returns (string memory) {
        (string memory uri,,,) = documentModule.getDocument("ASSAY_CERT");
        return uri;
    }
}
```

### With ERC-3525 Token

```solidity
contract StructuredProduct is ERC3525Master {
    UniversalDocumentModule public documentModule;
    ERC3525SlotManagerModule public slotManager;
    
    function getSlotProspectus(uint256 slotId) 
        external 
        view 
        returns (string memory) 
    {
        bytes32 scope = keccak256(abi.encodePacked("slot:", slotId));
        (string memory uri,,,) = documentModule.getScopedDocument(scope, "PROSPECTUS");
        return uri;
    }
}
```

### With ERC-4626 Vault

```solidity
contract HedgeFund is ERC4626Master {
    UniversalDocumentModule public documentModule;
    
    function getOfferingMemo() external view returns (string memory) {
        (string memory uri,,,) = documentModule.getDocument("OFFERING_MEMO");
        return uri;
    }
}
```

---

## ✅ Summary

### What You Get

- ✅ **Universal Solution**: One module for all token standards
- ✅ **ERC-1643 Compliant**: Industry standard interface
- ✅ **Scope-Based**: Flexible organization (global, slot, partition)
- ✅ **Version Tracking**: Automatic versioning with history
- ✅ **Hash Verification**: Document integrity checks
- ✅ **Upgradeable**: UUPS pattern with role protection
- ✅ **Production Ready**: Complete, tested, documented

### When to Use

| Token Standard | Use DocumentModule For |
|----------------|------------------------|
| **ERC-20** | Commodity certificates, storage receipts |
| **ERC-3525** | Slot-specific prospectuses, term sheets |
| **ERC-4626** | Fund offering memos, financial statements |
| **ERC-1400** | Security token legal documents |

### Key Benefit

**Single implementation** that works across **all token standards**, providing:
- Regulatory compliance
- Investor transparency
- Audit trails
- Version control
- Document verification

---

**Status**: ✅ Complete & Ready for Integration  
**Date**: October 7, 2025  
**Version**: 1.0.0

Built with ❤️ by Chain Capital Development Team
