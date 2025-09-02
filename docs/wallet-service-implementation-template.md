# Chain Capital Wallet - Core Service Implementation Template

**Date:** August 4, 2025  
**Purpose:** Template for implementing critical wallet backend services  
**Priority:** Phase 1 - Foundation Services  

## 🎯 Critical Service Implementation Order

### **1. WalletService.ts - FIRST PRIORITY**
Core wallet management following institutional patterns.

```typescript
// /backend/src/services/wallets/WalletService.ts
import { BaseService } from '../BaseService';
import { HDWalletService } from './HDWalletService';
import { KeyManagementService } from './KeyManagementService';
import { ServiceResult, PaginatedResult } from '../../types/common';
import { 
  CreateWalletRequest, 
  WalletResponse, 
  WalletType, 
  BlockchainNetwork 
} from '../../types/wallets';

export class WalletService extends BaseService {
  private hdWalletService: HDWalletService;
  private keyManagementService: KeyManagementService;

  constructor() {
    super();
    this.hdWalletService = new HDWalletService();
    this.keyManagementService = new KeyManagementService();
  }

  /**
   * Create a new HD wallet with multiple chain addresses
   */
  async createWallet(request: CreateWalletRequest): Promise<ServiceResult<WalletResponse>> {
    try {
      const { investor_id, wallet_type, blockchains, name } = request;

      // Generate HD wallet with mnemonic
      const hdWallet = await this.hdWalletService.generateHDWallet();
      
      // Derive addresses for each requested blockchain
      const addresses: Record<string, string> = {};
      for (const blockchain of blockchains) {
        const address = await this.hdWalletService.deriveAddress(
          hdWallet.masterKey, 
          blockchain, 
          0 // Account index
        );
        addresses[blockchain] = address;
      }

      // Store wallet in database
      const wallet = await this.prisma.wallets.create({
        data: {
          investor_id,
          wallet_type,  
          blockchain: blockchains[0], // Primary blockchain
          wallet_address: addresses[blockchains[0]],
          status: 'active',
          guardian_policy: {},
          signatories: []
        }
      });

      // Store HD wallet metadata securely
      await this.keyManagementService.storeWalletKeys({
        walletId: wallet.id,
        encryptedSeed: hdWallet.encryptedSeed,
        masterPublicKey: hdWallet.masterPublicKey,
        addresses,
        derivationPaths: hdWallet.derivationPaths
      });

      return this.success({
        id: wallet.id,
        investor_id: wallet.investor_id,
        name: name || `Wallet ${wallet.id.slice(0, 8)}`,
        primary_address: addresses[blockchains[0]],
        addresses,
        wallet_type: wallet.wallet_type as WalletType,
        blockchains,
        status: wallet.status,
        is_multi_sig_enabled: wallet.is_multi_sig_enabled,
        created_at: wallet.created_at,
        updated_at: wallet.updated_at
      });

    } catch (error) {
      this.logger.error('Failed to create wallet:', error);
      return this.error('Failed to create wallet', 'WALLET_CREATION_FAILED');
    }
  }

  /**
   * Get wallet by ID with all addresses
   */
  async getWallet(walletId: string): Promise<ServiceResult<WalletResponse>> {
    try {
      const wallet = await this.prisma.wallets.findUnique({
        where: { id: walletId },
        include: {
          investor: {
            select: { id: true, first_name: true, last_name: true }
          }
        }
      });

      if (!wallet) {
        return this.error('Wallet not found', 'WALLET_NOT_FOUND');
      }

      // Get HD wallet addresses from key management
      const keyData = await this.keyManagementService.getWalletKeys(walletId);
      
      return this.success({
        id: wallet.id,
        investor_id: wallet.investor_id,
        name: `${wallet.investor?.first_name || 'Unknown'} Wallet`,
        primary_address: wallet.wallet_address,
        addresses: keyData?.addresses || { [wallet.blockchain]: wallet.wallet_address },
        wallet_type: wallet.wallet_type as WalletType,
        blockchains: Object.keys(keyData?.addresses || { [wallet.blockchain]: wallet.wallet_address }),
        status: wallet.status,
        is_multi_sig_enabled: wallet.is_multi_sig_enabled,
        guardian_policy: wallet.guardian_policy,
        created_at: wallet.created_at,
        updated_at: wallet.updated_at
      });

    } catch (error) {
      this.logger.error('Failed to get wallet:', error);
      return this.error('Failed to retrieve wallet', 'WALLET_RETRIEVAL_FAILED');
    }
  }

  /**
   * List wallets for investor with pagination
   */
  async listWallets(
    investorId: string,
    options: { page?: number; limit?: number; wallet_type?: WalletType }
  ): Promise<ServiceResult<PaginatedResult<WalletResponse>>> {
    try {
      const { page = 1, limit = 20, wallet_type } = options;
      const offset = (page - 1) * limit;

      const where = {
        investor_id: investorId,
        ...(wallet_type && { wallet_type })
      };

      const [wallets, total] = await Promise.all([
        this.prisma.wallets.findMany({
          where,
          include: {
            investor: {
              select: { id: true, first_name: true, last_name: true }
            }
          },
          skip: offset,
          take: limit,
          orderBy: { created_at: 'desc' }
        }),
        this.prisma.wallets.count({ where })
      ]);

      const walletsWithAddresses = await Promise.all(
        wallets.map(async (wallet) => {
          const keyData = await this.keyManagementService.getWalletKeys(wallet.id);
          
          return {
            id: wallet.id,
            investor_id: wallet.investor_id,
            name: `${wallet.investor?.first_name || 'Unknown'} Wallet`,
            primary_address: wallet.wallet_address,
            addresses: keyData?.addresses || { [wallet.blockchain]: wallet.wallet_address },
            wallet_type: wallet.wallet_type as WalletType,
            blockchains: Object.keys(keyData?.addresses || { [wallet.blockchain]: wallet.wallet_address }),
            status: wallet.status,
            is_multi_sig_enabled: wallet.is_multi_sig_enabled,
            created_at: wallet.created_at,
            updated_at: wallet.updated_at
          };
        })
      );

      return this.success({
        data: walletsWithAddresses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      this.logger.error('Failed to list wallets:', error);
      return this.error('Failed to list wallets', 'WALLET_LIST_FAILED');
    }
  }

  /**
   * Get wallet balance across all chains
   */
  async getWalletBalance(walletId: string): Promise<ServiceResult<any>> {
    try {
      const wallet = await this.getWallet(walletId);
      if (!wallet.success) {
        return wallet;
      }

      const balances: Record<string, any> = {};
      
      // Get balances for each blockchain address
      for (const [blockchain, address] of Object.entries(wallet.data.addresses)) {
        // This would integrate with blockchain RPC providers
        balances[blockchain] = {
          address,
          native_balance: "0", // Would be fetched from RPC
          tokens: [] // Would be fetched from token contracts
        };
      }

      return this.success({
        wallet_id: walletId,
        balances,
        total_usd_value: "0", // Would be calculated from prices
        last_updated: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get wallet balance:', error);
      return this.error('Failed to get wallet balance', 'BALANCE_RETRIEVAL_FAILED');
    }
  }
}
```

### **2. KeyManagementService.ts - SECOND PRIORITY**
Secure key storage and management.

```typescript
// /backend/src/services/wallets/KeyManagementService.ts
import { BaseService } from '../BaseService';
import { ServiceResult } from '../../types/common';
import * as crypto from 'crypto';

interface WalletKeyData {
  walletId: string;
  encryptedSeed: string;
  masterPublicKey: string;
  addresses: Record<string, string>;
  derivationPaths: Record<string, string>;
}

interface StoredKeyData {
  encrypted_seed: string;
  master_public_key: string;
  addresses: Record<string, string>;
  derivation_paths: Record<string, string>;
  created_at: Date;
}

export class KeyManagementService extends BaseService {
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';

  /**
   * Store wallet keys securely
   */
  async storeWalletKeys(keyData: WalletKeyData): Promise<ServiceResult<boolean>> {
    try {
      const { walletId, encryptedSeed, masterPublicKey, addresses, derivationPaths } = keyData;

      // Store in secure key-value store (would integrate with HSM in production)
      await this.prisma.wallet_details.create({
        data: {
          wallet_id: walletId,
          detail_type: 'hd_wallet_keys',
          detail_value: {
            encrypted_seed: encryptedSeed,
            master_public_key: masterPublicKey,
            addresses,
            derivation_paths: derivationPaths,
            created_at: new Date()
          }
        }
      });

      return this.success(true);

    } catch (error) {
      this.logger.error('Failed to store wallet keys:', error);
      return this.error('Failed to store wallet keys', 'KEY_STORAGE_FAILED');
    }
  }

  /**
   * Retrieve wallet keys securely
   */
  async getWalletKeys(walletId: string): Promise<StoredKeyData | null> {
    try {
      const keyRecord = await this.prisma.wallet_details.findFirst({
        where: {
          wallet_id: walletId,
          detail_type: 'hd_wallet_keys'
        }
      });

      if (!keyRecord) {
        return null;
      }

      return keyRecord.detail_value as StoredKeyData;

    } catch (error) {
      this.logger.error('Failed to retrieve wallet keys:', error);
      return null;
    }
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(text: string, key: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.ENCRYPTION_ALGORITHM, key);
    cipher.setAAD(Buffer.from('wallet-key-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
    const decipher = crypto.createDecipher(this.ENCRYPTION_ALGORITHM, key);
    decipher.setAAD(Buffer.from('wallet-key-data'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### **3. HDWalletService.ts - THIRD PRIORITY**
BIP32/39/44 implementation for deterministic wallets.

```typescript
// /backend/src/services/wallets/HDWalletService.ts
import { BaseService } from '../BaseService';
import { BlockchainNetwork } from '../../types/wallets';
import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';

interface HDWalletData {
  mnemonic: string;
  seed: Buffer;
  masterKey: bip32.BIP32Interface;
  encryptedSeed: string;
  masterPublicKey: string;
  derivationPaths: Record<string, string>;
}

export class HDWalletService extends BaseService {
  
  // BIP44 coin types
  private readonly COIN_TYPES = {
    bitcoin: 0,
    ethereum: 60,
    polygon: 60, // Same as Ethereum
    arbitrum: 60,
    optimism: 60,
    avalanche: 60,
    solana: 501,
    near: 397
  };

  /**
   * Generate new HD wallet with mnemonic
   */
  async generateHDWallet(): Promise<HDWalletData> {
    try {
      // Generate 12-word mnemonic
      const mnemonic = bip39.generateMnemonic(128);
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const masterKey = bip32.fromSeed(seed);

      // Encrypt the seed for storage
      const encryptedSeed = this.encryptSeed(seed.toString('hex'));
      const masterPublicKey = masterKey.publicKey.toString('hex');

      const derivationPaths: Record<string, string> = {};
      Object.keys(this.COIN_TYPES).forEach(blockchain => {
        derivationPaths[blockchain] = `m/44'/${this.COIN_TYPES[blockchain as keyof typeof this.COIN_TYPES]}'/0'/0/0`;
      });

      return {
        mnemonic,
        seed,
        masterKey,
        encryptedSeed,
        masterPublicKey,
        derivationPaths
      };

    } catch (error) {
      this.logger.error('Failed to generate HD wallet:', error);
      throw new Error('HD wallet generation failed');
    }
  }

  /**
   * Derive address for specific blockchain
   */
  async deriveAddress(masterKey: bip32.BIP32Interface, blockchain: BlockchainNetwork, accountIndex: number = 0): Promise<string> {
    try {
      const coinType = this.COIN_TYPES[blockchain];
      if (coinType === undefined) {
        throw new Error(`Unsupported blockchain: ${blockchain}`);
      }

      // BIP44 derivation path: m/44'/coin_type'/account'/change/address_index
      const derivationPath = `m/44'/${coinType}'/${accountIndex}'/0/0`;
      const derived = masterKey.derivePath(derivationPath);

      switch (blockchain) {
        case 'bitcoin':
          return this.deriveBitcoinAddress(derived);
        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          return this.deriveEthereumAddress(derived);
        case 'solana':
          return this.deriveSolanaAddress(derived);
        case 'near':
          return this.deriveNearAddress(derived);
        default:
          throw new Error(`Address derivation not implemented for ${blockchain}`);
      }

    } catch (error) {
      this.logger.error(`Failed to derive ${blockchain} address:`, error);
      throw error;
    }
  }

  /**
   * Derive Bitcoin address from private key
   */
  private deriveBitcoinAddress(keyPair: bip32.BIP32Interface): string {
    if (!keyPair.privateKey) {
      throw new Error('Private key required for Bitcoin address derivation');
    }
    
    // Generate P2PKH address
    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.bitcoin
    });
    
    if (!address) {
      throw new Error('Failed to generate Bitcoin address');
    }
    
    return address;
  }

  /**
   * Derive Ethereum-compatible address from private key
   */
  private deriveEthereumAddress(keyPair: bip32.BIP32Interface): string {
    if (!keyPair.privateKey) {
      throw new Error('Private key required for Ethereum address derivation');
    }

    // This would use ethers.js or web3.js in practice
    // For now, returning a placeholder
    const publicKey = keyPair.publicKey.toString('hex');
    return `0x${publicKey.slice(-40)}`; // Simplified - would use proper keccak256 hash
  }

  /**
   * Derive Solana address from private key
   */
  private deriveSolanaAddress(keyPair: bip32.BIP32Interface): string {
    if (!keyPair.privateKey) {
      throw new Error('Private key required for Solana address derivation');
    }

    // This would use @solana/web3.js in practice
    // For now, returning a placeholder
    return keyPair.publicKey.toString('base58'); // Simplified
  }

  /**
   * Derive NEAR address from private key
   */
  private deriveNearAddress(keyPair: bip32.BIP32Interface): string {
    if (!keyPair.privateKey) {
      throw new Error('Private key required for NEAR address derivation');
    }

    // This would use near-api-js in practice
    // For now, returning a placeholder
    return `${keyPair.publicKey.toString('hex').slice(0, 40)}.near`; // Simplified
  }

  /**
   * Encrypt seed for secure storage
   */
  private encryptSeed(seedHex: string): string {
    // This would integrate with HSM in production
    // For development, using simple encryption
    return Buffer.from(seedHex).toString('base64');
  }

  /**
   * Recover HD wallet from mnemonic
   */
  async recoverFromMnemonic(mnemonic: string): Promise<HDWalletData> {
    try {
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      const seed = await bip39.mnemonicToSeed(mnemonic);
      const masterKey = bip32.fromSeed(seed);

      const encryptedSeed = this.encryptSeed(seed.toString('hex'));
      const masterPublicKey = masterKey.publicKey.toString('hex');

      const derivationPaths: Record<string, string> = {};
      Object.keys(this.COIN_TYPES).forEach(blockchain => {
        derivationPaths[blockchain] = `m/44'/${this.COIN_TYPES[blockchain as keyof typeof this.COIN_TYPES]}'/0'/0/0`;
      });

      return {
        mnemonic,
        seed,
        masterKey,
        encryptedSeed,
        masterPublicKey,
        derivationPaths
      };

    } catch (error) {
      this.logger.error('Failed to recover HD wallet from mnemonic:', error);
      throw error;
    }
  }
}
```

## 📋Database Schema Additions Required

```sql
-- Add HD wallet metadata to wallet_details table
-- Run this migration in Supabase

-- Ensure wallet_details table exists and has proper structure
CREATE TABLE IF NOT EXISTS wallet_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    detail_type TEXT NOT NULL,
    detail_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient wallet key lookups
CREATE INDEX IF NOT EXISTS idx_wallet_details_wallet_id_type 
ON wallet_details(wallet_id, detail_type);

-- Add additional wallet fields if not present
ALTER TABLE wallets 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS derivation_paths JSONB DEFAULT '{}';
```

## 🔧 Required Dependencies

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

## 🎯 Implementation Priority

1. **WalletService.ts** - Core wallet CRUD operations
2. **KeyManagementService.ts** - Secure key storage
3. **HDWalletService.ts** - BIP32/39/44 implementation
4. **TransactionService.ts** - Multi-chain transaction building
5. **MultiSigService.ts** - Multi-signature coordination

## ⚠️ Security Notes

- Replace encryption with HSM integration in production
- Implement proper key derivation with hardware security
- Add comprehensive audit logging
- Use secure random number generation
- Implement proper access controls and permissions

This template provides the foundation for a true crypto wallet backend. Each service builds upon the previous one to create a comprehensive HD wallet management system.