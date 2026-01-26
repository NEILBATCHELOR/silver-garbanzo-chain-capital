/**
 * Metaplex Token Metadata Service - ENHANCED
 * Adds on-chain metadata (name, symbol, URI) to SPL tokens
 * 
 * Features:
 * - Create metadata accounts (PDA) for SPL tokens
 * - Fetch metadata by mint, owner, or update authority
 * - Update existing metadata (if mutable)
 * 
 * This creates a separate metadata account (PDA) linked to the SPL mint
 * using the Metaplex Token Metadata program
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
  createMetadataAccountV3,
  updateV1,
  fetchMetadataFromSeeds,
  fetchDigitalAsset,
  fetchAllDigitalAssetByOwner,
  fetchAllDigitalAssetByUpdateAuthority,
  mplTokenMetadata,
  findMetadataPda,
  type Metadata,
  type DigitalAsset,
  type DigitalAssetWithToken
} from '@metaplex-foundation/mpl-token-metadata';
import { 
  createSignerFromKeypair,
  keypairIdentity,
  publicKey,
  unwrapOption,
  type PublicKey as UmiPublicKey
} from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { logActivity } from '@/infrastructure/activityLogger';
import { getRpcUrl } from '@/infrastructure/web3/rpc/rpc-config';
import { normalizeSolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaUtils';

// ============================================================================
// INTERFACES
// ============================================================================

export interface MetaplexMetadataConfig {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints?: number; // Royalty percentage (e.g., 500 = 5%)
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number; // Must total 100
  }>;
  collection?: {
    verified: boolean;
    key: string; // Collection mint address
  };
}

export interface AddMetadataOptions {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  mintAddress: string;
  payerPrivateKey: string; // Base58 encoded private key
  updateAuthority?: string; // Defaults to payer
  isMutable?: boolean; // Can metadata be updated later?
}

export interface UpdateMetadataOptions {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  mintAddress: string;
  updateAuthorityPrivateKey: string; // Base58 encoded private key
}

export interface FetchMetadataOptions {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  mintAddress: string;
}

export interface AddMetadataResult {
  success: boolean;
  signature?: string;
  metadataPDA?: string;
  error?: string;
}

export interface UpdateMetadataResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface FetchMetadataResult {
  success: boolean;
  metadata?: MetadataInfo;
  error?: string;
}

export interface MetadataInfo {
  mint: string;
  updateAuthority: string;
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  isMutable: boolean;
  primarySaleHappened: boolean;
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
  collection?: {
    verified: boolean;
    key: string;
  };
  metadataPDA: string;
}

export interface TokenWithMetadata {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  updateAuthority: string;
  isMutable: boolean;
  metadataPDA: string;
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Metaplex Token Metadata Service
 * Handles creating, fetching, and updating metadata accounts for SPL tokens
 */
class MetaplexTokenMetadataService {
  
  /**
   * Get RPC endpoint for network
   * Normalizes network format (handles both "devnet" and "solana-devnet")
   */
  private getRpcEndpoint(network: string): string {
    // Normalize network format first
    const normalizedNetwork = normalizeSolanaNetwork(network);
    
    // Map Solana network names to getRpcUrl network parameter
    const networkMap: Record<string, 'mainnet' | 'devnet' | 'testnet'> = {
      'mainnet-beta': 'mainnet',
      'devnet': 'devnet',
      'testnet': 'testnet'
    };

    const rpcNetwork = networkMap[normalizedNetwork];
    const url = getRpcUrl('solana', rpcNetwork);
    
    if (!url) {
      throw new Error(
        `Solana ${normalizedNetwork} RPC URL not configured. ` +
        `Add VITE_SOLANA_${rpcNetwork.toUpperCase()}_RPC_URL to your .env file.`
      );
    }
    
    return url;
  }

  /**
   * Convert Umi Metadata to our MetadataInfo format
   */
  private convertMetadataToInfo(
    metadata: Metadata,
    mint: UmiPublicKey,
    metadataPDA: UmiPublicKey
  ): MetadataInfo {
    // Unwrap optional fields
    const creatorsOption = unwrapOption(metadata.creators);
    const collectionOption = unwrapOption(metadata.collection);

    return {
      mint: mint.toString(),
      updateAuthority: metadata.updateAuthority.toString(),
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      isMutable: metadata.isMutable,
      primarySaleHappened: metadata.primarySaleHappened,
      creators: creatorsOption?.map(c => ({
        address: c.address.toString(),
        verified: c.verified,
        share: c.share
      })),
      collection: collectionOption ? {
        verified: collectionOption.verified,
        key: collectionOption.key.toString()
      } : undefined,
      metadataPDA: metadataPDA.toString()
    };
  }

  // ============================================================================
  // CREATE METADATA
  // ============================================================================

  /**
   * Add Metaplex metadata to an SPL token
   * Creates a metadata PDA (Program Derived Address) linked to the mint
   */
  async addMetadata(
    config: MetaplexMetadataConfig,
    options: AddMetadataOptions
  ): Promise<AddMetadataResult> {
    try {
      await logActivity({
        action: 'metaplex_metadata_creation_started',
        entity_type: 'token',
        details: {
          mintAddress: options.mintAddress,
          network: options.network,
          name: config.name,
          symbol: config.symbol
        }
      });

      // Step 1: Initialize Umi with the RPC endpoint
      const endpoint = this.getRpcEndpoint(options.network);
      const umi = createUmi(endpoint).use(mplTokenMetadata());

      // Step 2: Convert payer keypair from base58 to Umi format
      const payerSecretKey = bs58.decode(options.payerPrivateKey);
      const payerKeypair = Keypair.fromSecretKey(payerSecretKey);
      const umiKeypair = fromWeb3JsKeypair(payerKeypair);
      const umiSigner = createSignerFromKeypair(umi, umiKeypair);
      
      // Set the payer as the transaction signer
      umi.use(keypairIdentity(umiSigner));

      // Step 3: Convert mint address to Umi public key
      const mint = publicKey(options.mintAddress);

      // Step 4: Build metadata account instruction
      const updateAuthority = options.updateAuthority 
        ? publicKey(options.updateAuthority)
        : umiSigner.publicKey;

      const metadataBuilder = createMetadataAccountV3(umi, {
        mint,
        mintAuthority: umiSigner,
        payer: umiSigner,
        updateAuthority,
        data: {
          name: config.name,
          symbol: config.symbol,
          uri: config.uri,
          sellerFeeBasisPoints: config.sellerFeeBasisPoints || 0,
          creators: config.creators?.map(c => ({
            address: publicKey(c.address),
            verified: c.verified,
            share: c.share
          })) || null,
          collection: config.collection ? {
            verified: config.collection.verified,
            key: publicKey(config.collection.key)
          } : null,
          uses: null // Metaplex expects null for standard tokens
        },
        isMutable: options.isMutable !== false, // Default to true
        collectionDetails: null
      });

      // Step 5: Send transaction with retry logic for blockhash expiration
      let result;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          result = await metadataBuilder.sendAndConfirm(umi, {
            confirm: { commitment: 'confirmed' },
            send: { skipPreflight: false }
          });
          break; // Success - exit retry loop
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Check if blockhash expired
          if (errorMessage.includes('block height exceeded') || errorMessage.includes('has expired')) {
            retries++;
            if (retries < maxRetries) {
              console.log(`⚠️ Blockhash expired, retrying (${retries}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
              continue;
            }
          }
          
          // If not a blockhash error or max retries reached, throw
          throw error;
        }
      }
      
      if (!result) {
        throw new Error('Transaction failed after maximum retries');
      }
      
      // Extract signature (Umi signatures are Uint8Arrays)
      const signature = bs58.encode(result.signature);

      // Step 6: Derive metadata PDA for logging using Umi helper
      const metadataPDA = findMetadataPda(umi, { mint });

      await logActivity({
        action: 'metaplex_metadata_created',
        entity_type: 'token',
        details: {
          mintAddress: options.mintAddress,
          signature,
          metadataPDA: metadataPDA[0].toString(),
          network: options.network
        }
      });

      return {
        success: true,
        signature,
        metadataPDA: metadataPDA[0].toString()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await logActivity({
        action: 'metaplex_metadata_creation_failed',
        entity_type: 'token',
        details: {
          mintAddress: options.mintAddress,
          error: errorMessage,
          network: options.network
        }
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // ============================================================================
  // FETCH METADATA
  // ============================================================================

  /**
   * Fetch metadata for a specific mint
   * Returns null if metadata doesn't exist
   */
  async fetchMetadata(
    mintAddress: string,
    network: 'mainnet-beta' | 'devnet' | 'testnet'
  ): Promise<FetchMetadataResult> {
    try {
      await logActivity({
        action: 'metaplex_metadata_fetch_started',
        entity_type: 'token',
        details: { mintAddress, network }
      });

      // Initialize Umi
      const endpoint = this.getRpcEndpoint(network);
      const umi = createUmi(endpoint).use(mplTokenMetadata());

      // Convert mint address
      const mint = publicKey(mintAddress);

      // Fetch digital asset (includes metadata)
      const asset = await fetchDigitalAsset(umi, mint);

      // Derive metadata PDA
      const metadataPDA = findMetadataPda(umi, { mint });

      // Convert to our format
      const metadataInfo = this.convertMetadataToInfo(
        asset.metadata,
        mint,
        metadataPDA[0]
      );

      await logActivity({
        action: 'metaplex_metadata_fetched',
        entity_type: 'token',
        details: {
          mintAddress,
          network,
          name: metadataInfo.name,
          symbol: metadataInfo.symbol
        }
      });

      return {
        success: true,
        metadata: metadataInfo
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // If metadata doesn't exist, this is not necessarily an error
      if (errorMessage.includes('Account does not exist')) {
        return {
          success: true,
          metadata: undefined
        };
      }

      await logActivity({
        action: 'metaplex_metadata_fetch_failed',
        entity_type: 'token',
        details: { mintAddress, network, error: errorMessage }
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Fetch all tokens owned by an address
   */
  async fetchAllByOwner(
    ownerAddress: string,
    network: 'mainnet-beta' | 'devnet' | 'testnet'
  ): Promise<TokenWithMetadata[]> {
    try {
      await logActivity({
        action: 'metaplex_fetch_by_owner_started',
        entity_type: 'token',
        details: { ownerAddress, network }
      });

      // Initialize Umi
      const endpoint = this.getRpcEndpoint(network);
      const umi = createUmi(endpoint).use(mplTokenMetadata());

      // Convert owner address
      const owner = publicKey(ownerAddress);

      // Fetch all digital assets owned by this address
      const assets = await fetchAllDigitalAssetByOwner(umi, owner);

      // Convert to our simplified format
      const tokens: TokenWithMetadata[] = assets.map(asset => ({
        mint: asset.publicKey.toString(),
        name: asset.metadata.name,
        symbol: asset.metadata.symbol,
        uri: asset.metadata.uri,
        updateAuthority: asset.metadata.updateAuthority.toString(),
        isMutable: asset.metadata.isMutable,
        metadataPDA: findMetadataPda(umi, { mint: asset.publicKey })[0].toString()
      }));

      await logActivity({
        action: 'metaplex_fetched_by_owner',
        entity_type: 'token',
        details: {
          ownerAddress,
          network,
          tokensFound: tokens.length
        }
      });

      return tokens;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await logActivity({
        action: 'metaplex_fetch_by_owner_failed',
        entity_type: 'token',
        details: { ownerAddress, network, error: errorMessage }
      });

      return [];
    }
  }

  /**
   * Fetch all tokens by update authority
   */
  async fetchAllByUpdateAuthority(
    updateAuthorityAddress: string,
    network: 'mainnet-beta' | 'devnet' | 'testnet'
  ): Promise<TokenWithMetadata[]> {
    try {
      await logActivity({
        action: 'metaplex_fetch_by_authority_started',
        entity_type: 'token',
        details: { updateAuthorityAddress, network }
      });

      // Initialize Umi
      const endpoint = this.getRpcEndpoint(network);
      const umi = createUmi(endpoint).use(mplTokenMetadata());

      // Convert authority address
      const authority = publicKey(updateAuthorityAddress);

      // Fetch all digital assets with this update authority
      const assets = await fetchAllDigitalAssetByUpdateAuthority(umi, authority);

      // Convert to our simplified format
      const tokens: TokenWithMetadata[] = assets.map(asset => ({
        mint: asset.publicKey.toString(),
        name: asset.metadata.name,
        symbol: asset.metadata.symbol,
        uri: asset.metadata.uri,
        updateAuthority: asset.metadata.updateAuthority.toString(),
        isMutable: asset.metadata.isMutable,
        metadataPDA: findMetadataPda(umi, { mint: asset.publicKey })[0].toString()
      }));

      await logActivity({
        action: 'metaplex_fetched_by_authority',
        entity_type: 'token',
        details: {
          updateAuthorityAddress,
          network,
          tokensFound: tokens.length
        }
      });

      return tokens;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await logActivity({
        action: 'metaplex_fetch_by_authority_failed',
        entity_type: 'token',
        details: { updateAuthorityAddress, network, error: errorMessage }
      });

      return [];
    }
  }

  // ============================================================================
  // UPDATE METADATA
  // ============================================================================

  /**
   * Update existing metadata
   * Only works if isMutable was set to true during creation
   * 
   * @param config - Partial metadata config (only update specified fields)
   * @param options - Update options including network, mint, and authority
   */
  async updateMetadata(
    config: Partial<MetaplexMetadataConfig> & {
      primarySaleHappened?: boolean;
      isMutable?: boolean;
      newUpdateAuthority?: string;
    },
    options: UpdateMetadataOptions
  ): Promise<UpdateMetadataResult> {
    try {
      await logActivity({
        action: 'metaplex_metadata_update_started',
        entity_type: 'token',
        details: {
          mintAddress: options.mintAddress,
          network: options.network,
          fieldsToUpdate: Object.keys(config)
        }
      });

      // Initialize Umi
      const endpoint = this.getRpcEndpoint(options.network);
      const umi = createUmi(endpoint).use(mplTokenMetadata());

      // Convert update authority keypair
      const authSecretKey = bs58.decode(options.updateAuthorityPrivateKey);
      const authKeypair = Keypair.fromSecretKey(authSecretKey);
      const umiKeypair = fromWeb3JsKeypair(authKeypair);
      const umiSigner = createSignerFromKeypair(umi, umiKeypair);
      umi.use(keypairIdentity(umiSigner));

      // Convert mint address
      const mint = publicKey(options.mintAddress);

      // Fetch current metadata
      const currentMetadata = await fetchMetadataFromSeeds(umi, { mint });

      // Check if metadata is mutable
      if (!currentMetadata.isMutable && config.isMutable === undefined) {
        throw new Error('Cannot update immutable metadata. Set isMutable: true when creating metadata.');
      }

      // Build update instruction with merged data
      const updateData = {
        name: config.name ?? currentMetadata.name,
        symbol: config.symbol ?? currentMetadata.symbol,
        uri: config.uri ?? currentMetadata.uri,
        sellerFeeBasisPoints: config.sellerFeeBasisPoints ?? currentMetadata.sellerFeeBasisPoints,
        creators: config.creators?.map(c => ({
          address: publicKey(c.address),
          verified: c.verified,
          share: c.share
        })) ?? currentMetadata.creators ?? null,
        collection: config.collection ? {
          verified: config.collection.verified,
          key: publicKey(config.collection.key)
        } : currentMetadata.collection ?? null,
        uses: null
      };

      const updateBuilder = updateV1(umi, {
        mint,
        authority: umiSigner,
        data: updateData,
        primarySaleHappened: config.primarySaleHappened,
        isMutable: config.isMutable,
        newUpdateAuthority: config.newUpdateAuthority 
          ? publicKey(config.newUpdateAuthority)
          : undefined
      });

      // Send transaction with retry logic for blockhash expiration
      let result;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          result = await updateBuilder.sendAndConfirm(umi, {
            confirm: { commitment: 'confirmed' },
            send: { skipPreflight: false }
          });
          break; // Success - exit retry loop
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Check if blockhash expired
          if (errorMessage.includes('block height exceeded') || errorMessage.includes('has expired')) {
            retries++;
            if (retries < maxRetries) {
              console.log(`⚠️ Blockhash expired, retrying (${retries}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
              continue;
            }
          }
          
          // If not a blockhash error or max retries reached, throw
          throw error;
        }
      }
      
      if (!result) {
        throw new Error('Transaction failed after maximum retries');
      }
      
      const signature = bs58.encode(result.signature);

      await logActivity({
        action: 'metaplex_metadata_updated',
        entity_type: 'token',
        details: {
          mintAddress: options.mintAddress,
          signature,
          network: options.network,
          updatedFields: Object.keys(config)
        }
      });

      return {
        success: true,
        signature
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await logActivity({
        action: 'metaplex_metadata_update_failed',
        entity_type: 'token',
        details: {
          mintAddress: options.mintAddress,
          error: errorMessage,
          network: options.network
        }
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if metadata exists for a mint
   */
  async hasMetadata(
    mintAddress: string,
    network: 'mainnet-beta' | 'devnet' | 'testnet'
  ): Promise<boolean> {
    const result = await this.fetchMetadata(mintAddress, network);
    return result.success && result.metadata !== undefined;
  }

  /**
   * Get metadata PDA address for a mint (without fetching)
   */
  getMetadataPDA(
    mintAddress: string,
    network: 'mainnet-beta' | 'devnet' | 'testnet'
  ): string {
    const endpoint = this.getRpcEndpoint(network);
    const umi = createUmi(endpoint).use(mplTokenMetadata());
    const mint = publicKey(mintAddress);
    const metadataPDA = findMetadataPda(umi, { mint });
    return metadataPDA[0].toString();
  }
}

export const metaplexTokenMetadataService = new MetaplexTokenMetadataService();
