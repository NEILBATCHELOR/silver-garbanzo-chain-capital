# Missing Dependencies for Wallet Services

## Required NPM Packages

The following npm packages need to be installed to resolve TypeScript compilation errors:

### 1. ed25519-hd-key
**Usage**: HD key derivation for ed25519-based blockchains
**Required by**:
- AptosWalletService.ts
- NEARWalletService.ts  
- SolanaWalletService.ts
- SuiWalletService.ts

**Install command**:
```bash
npm install ed25519-hd-key
```

### 2. bip32
**Usage**: Bitcoin HD wallet derivation (BIP32 standard)
**Required by**:
- BitcoinWalletService.ts

**Install command**:
```bash
npm install bip32
```

## Installation Commands

Run these commands in the frontend directory:

```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend
npm install ed25519-hd-key bip32
```

## Error Summary

- **24 total TypeScript errors** across wallet services
- **5 files** require ed25519-hd-key package
- **1 file** requires bip32 package  
- Additional import/export fixes needed after package installation

## Next Steps

1. Install missing packages
2. Fix import paths for Sui SDK (@mysten/sui.js/* → @mysten/sui/*)
3. Fix Aptos SDK API usage (authKey property)
4. Fix Bitcoin SDK imports (Network, ECPairInterface)
5. Fix export/import mismatches in index files
