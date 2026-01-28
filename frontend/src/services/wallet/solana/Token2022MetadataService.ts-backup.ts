/**
 * Token-2022 Metadata Service
 * 
 * Handles fetching and updating on-chain metadata for Token-2022 tokens
 * Uses @solana-program/token-2022 metadata extension
 * 
 * MIGRATION STATUS: ✅ FULLY MODERN
 * Uses: @solana/kit + @solana-program/token-2022
 */

import {
  createSolanaRpc,
  address,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  type Address,
  type Instruction
} from '@solana/kit';

import {
  TOKEN_2022_PROGRAM_ADDRESS,
  getUpdateTokenMetadataFieldInstruction,
  tokenMetadataField,
  fetchMint
} from '@solana-program/token-2022';

import { createModernRpc } from '@/infrastructure/web3/solana/ModernSolanaRpc';
import { createSignerFromPrivateKey, normalizeSolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaUtils';
import { logActivity } from '@/infrastructure/activityLogger';

// ============================================================================
// TYPES
// ============================================================================

export interface Token2022MetadataInfo {
  name: string;
  symbol: string;
  uri: string;
  updateAuthority: string;
  mint: string;
  additionalMetadata?: Record<string, string>;
}

export interface Token2022MetadataUpdate {
  name?: string;
  symbol?: string;
  uri?: string;
  additionalMetadata?: Map<string, string>;
}

export interface Token2022MetadataOptions {
  network: string; // Accept any string, will normalize internally
  mintAddress: string;
  updateAuthorityPrivateKey: string;
}

export interface Token2022MetadataResult {
  success: boolean;
  metadata?: Token2022MetadataInfo;
  signature?: string;
  error?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class Token2022MetadataService {
  /**
   * Fetch Token-2022 on-chain metadata
   * Handles both standard network formats (devnet) and database formats (solana-devnet)
   */
  async fetchMetadata(
    mintAddress: string,
    network: string
  ): Promise<Token2022MetadataResult> {
    try {
      // Normalize network format
      const normalizedNetwork = normalizeSolanaNetwork(network);
      
      const rpc = createModernRpc(normalizedNetwork);
      const mintAddr = address(mintAddress);

      // Fetch mint account
      const mintAccount = await fetchMint(rpc.getRpc(), mintAddr, {
        commitment: 'confirmed'
      });

      // Check if metadata extension exists
      // Extensions is an Option type, check if it's Some
      if (!mintAccount.data.extensions || mintAccount.data.extensions.__option === 'None') {
        return {
          success: false,
          error: 'Token does not have metadata extension'
        };
      }

      // Unwrap the Option to get the extensions array
      const extensions = mintAccount.data.extensions.value;
      
      // Find metadata extension using discriminated union __kind
      const metadataExt = extensions.find(
        ext => ext.__kind === 'TokenMetadata'
      );

      if (!metadataExt || metadataExt.__kind !== 'TokenMetadata') {
        return {
          success: false,
          error: 'No TokenMetadata extension found'
        };
      }

      // Extract metadata (metadataExt has all fields when __kind is 'TokenMetadata')
      // Handle Option type for updateAuthority
      const updateAuthorityValue = metadataExt.updateAuthority.__option === 'Some' 
        ? metadataExt.updateAuthority.value 
        : '';
      
      const metadata: Token2022MetadataInfo = {
        name: metadataExt.name,
        symbol: metadataExt.symbol,
        uri: metadataExt.uri,
        updateAuthority: updateAuthorityValue,
        mint: mintAddress,
        additionalMetadata: metadataExt.additionalMetadata 
          ? Object.fromEntries(metadataExt.additionalMetadata)
          : undefined
      };

      await logActivity({
        action: 'token2022_metadata_fetched',
        entity_type: 'token',
        entity_id: mintAddress,
        details: {
          network: normalizedNetwork,
          metadata
        }
      });

      return {
        success: true,
        metadata
      };

    } catch (error) {
      console.error('Token-2022 metadata fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a "not found" error
      if (errorMessage.includes('was not found') || errorMessage.includes('Account does not exist')) {
        return {
          success: false,
          error: 'Token account not found or does not have Token-2022 metadata extension'
        };
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Update Token-2022 on-chain metadata
   * 
   * Can update: name, symbol, uri, and additional metadata fields
   * Handles both standard network formats (devnet) and database formats (solana-devnet)
   */
  async updateMetadata(
    updates: Token2022MetadataUpdate,
    options: Token2022MetadataOptions
  ): Promise<Token2022MetadataResult> {
    try {
      // Normalize network format
      const normalizedNetwork = normalizeSolanaNetwork(options.network);
      
      const rpc = createModernRpc(normalizedNetwork);
      const mintAddr = address(options.mintAddress);
      const updateAuthority = await createSignerFromPrivateKey(options.updateAuthorityPrivateKey);

      // Build update instructions
      const instructions: Instruction[] = [];

      // Update name
      if (updates.name) {
        instructions.push(
          getUpdateTokenMetadataFieldInstruction({
            metadata: mintAddr,
            updateAuthority,
            field: tokenMetadataField('Key', ['name']),
            value: updates.name
          })
        );
      }

      // Update symbol
      if (updates.symbol) {
        instructions.push(
          getUpdateTokenMetadataFieldInstruction({
            metadata: mintAddr,
            updateAuthority,
            field: tokenMetadataField('Key', ['symbol']),
            value: updates.symbol
          })
        );
      }

      // Update URI
      if (updates.uri) {
        instructions.push(
          getUpdateTokenMetadataFieldInstruction({
            metadata: mintAddr,
            updateAuthority,
            field: tokenMetadataField('Key', ['uri']),
            value: updates.uri
          })
        );
      }

      // Update additional metadata fields
      if (updates.additionalMetadata) {
        for (const [key, value] of updates.additionalMetadata.entries()) {
          instructions.push(
            getUpdateTokenMetadataFieldInstruction({
              metadata: mintAddr,
              updateAuthority,
              field: tokenMetadataField('Key', [key]),
              value: value
            })
          );
        }
      }

      if (instructions.length === 0) {
        return {
          success: false,
          error: 'No updates provided'
        };
      }

      // Get latest blockhash
      const { value: latestBlockhash } = await rpc.getRpc()
        .getLatestBlockhash()
        .send();

      // Build transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(updateAuthority, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      );

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
      const signature = getSignatureFromTransaction(signedTransaction);
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);

      // Send transaction
      await rpc.sendRawTransaction(encodedTransaction, { skipPreflight: false });

      // Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed', 60);

      if (!confirmed) {
        throw new Error('Metadata update failed to confirm');
      }

      await logActivity({
        action: 'token2022_metadata_updated',
        entity_type: 'token',
        entity_id: options.mintAddress,
        details: {
          network: normalizedNetwork,
          signature,
          updates
        }
      });

      // Fetch updated metadata
      const updatedMetadata = await this.fetchMetadata(
        options.mintAddress,
        normalizedNetwork
      );

      return {
        success: true,
        signature,
        metadata: updatedMetadata.metadata
      };

    } catch (error) {
      console.error('Token-2022 metadata update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const token2022MetadataService = new Token2022MetadataService();
