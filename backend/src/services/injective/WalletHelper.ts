/**
 * Wallet Helper for Injective Services
 * 
 * Simple wrapper around existing backend services:
 * - SigningService (backend/src/services/wallets/SigningService.ts)
 * - WalletEncryptionService (backend/src/services/security/walletEncryptionService.ts)
 * - Database key vault integration
 * 
 * NO RPC URLs hardcoded - all configuration from .env
 * NO contract loading - ABIs stored in database
 */

import { ethers } from 'ethers';
import WalletEncryptionService from '../security/walletEncryptionService';
import { getSupabaseClient } from '../../infrastructure/database/supabase';

/**
 * Get private key from database or decrypt encrypted key
 * 
 * @param keyIdOrPrivateKey - Vault key ID or raw private key
 * @param useHSM - Whether to retrieve from key vault
 * @returns Private key (hex with 0x prefix)
 */
export async function getPrivateKey(keyIdOrPrivateKey: string, useHSM: boolean): Promise<string> {
  try {
    if (useHSM) {
      // Retrieve from database key vault
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('key_vault_keys')
        .select('encrypted_key')
        .eq('id', keyIdOrPrivateKey)
        .single();

      if (error || !data) {
        throw new Error(`Failed to retrieve key from vault: ${error?.message || 'Key not found'}`);
      }

      // Decrypt using WalletEncryptionService
      const decrypted = await WalletEncryptionService.decrypt(data.encrypted_key);
      
      // Normalize to 0x-prefixed hex
      return normalizePrivateKey(decrypted);
    }

    // Direct private key (development/testing)
    return normalizePrivateKey(keyIdOrPrivateKey);

  } catch (error) {
    throw new Error(`Failed to get private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get ethers.js Wallet instance
 * 
 * @param keyIdOrPrivateKey - Vault key ID or raw private key
 * @param useHSM - Whether to retrieve from key vault
 * @param rpcUrl - RPC endpoint (from .env)
 * @returns Connected ethers.Wallet
 */
export async function getWallet(
  keyIdOrPrivateKey: string,
  useHSM: boolean,
  rpcUrl: string
): Promise<ethers.Wallet> {
  try {
    const privateKey = await getPrivateKey(keyIdOrPrivateKey, useHSM);
    const wallet = new ethers.Wallet(privateKey);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return wallet.connect(provider);
  } catch (error) {
    throw new Error(`Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get contract ABI from database
 * 
 * @param contractAddress - Contract address
 * @returns Contract ABI array
 */
export async function getContractABI(contractAddress: string): Promise<any[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('exchange_contracts')
      .select('abi_json')
      .eq('contract_address', contractAddress)
      .single();

    if (error || !data || !data.abi_json) {
      throw new Error(`Contract ABI not found in database for ${contractAddress}`);
    }

    return data.abi_json;
  } catch (error) {
    throw new Error(`Failed to get contract ABI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Normalize private key to standard hex format (with 0x prefix)
 */
function normalizePrivateKey(privateKey: string): string {
  let key = privateKey.trim();
  
  // Handle mnemonic (contains spaces)
  if (key.includes(' ')) {
    const hdNode = ethers.HDNodeWallet.fromPhrase(key);
    return hdNode.privateKey;
  }
  
  // Remove 0x prefix if present
  if (key.startsWith('0x')) {
    key = key.substring(2);
  }
  
  // Validate hex format
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('Invalid private key format: must be 64 hex characters');
  }
  
  return '0x' + key;
}

export const WalletHelper = {
  getPrivateKey,
  getWallet,
  getContractABI
};

export default WalletHelper;
