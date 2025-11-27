/**
 * Wallet Key Derivation Utilities
 * 
 * Handles derivation of EVM private keys from mnemonics for deployment operations.
 * Specifically handles Injective wallets which store native keys but need EVM keys for deployment.
 */

import { ethers } from 'ethers';
import WalletEncryptionService from '../services/security/walletEncryptionService';

export interface EVMKeyDerivationResult {
  evmPrivateKey: string;
  evmAddress: string;
}

/**
 * Derive EVM private key from encrypted mnemonic
 * 
 * This is essential for Injective wallets which store native (Cosmos SDK) keys
 * but need EVM private keys for smart contract deployment on Injective EVM.
 * 
 * @param encryptedMnemonic The encrypted mnemonic from database
 * @param derivationPath Optional custom derivation path (defaults to m/44'/60'/0'/0/0)
 * @returns Object containing EVM private key and address
 */
export async function deriveEVMPrivateKeyFromMnemonic(
  encryptedMnemonic: string,
  derivationPath: string = "m/44'/60'/0'/0/0"
): Promise<EVMKeyDerivationResult> {
  try {
    // Decrypt the mnemonic
    const mnemonic = await WalletEncryptionService.decrypt(encryptedMnemonic);
    
    if (!mnemonic) {
      throw new Error('Failed to decrypt mnemonic');
    }

    // Create HD wallet from mnemonic
    const hdWallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, derivationPath);
    
    // Get the EVM private key (with 0x prefix)
    const evmPrivateKey = hdWallet.privateKey;
    const evmAddress = hdWallet.address;

    console.log('🔐 Derived EVM key for deployment:', {
      derivationPath,
      evmAddress,
      hasPrefix: evmPrivateKey.startsWith('0x')
    });

    return {
      evmPrivateKey,
      evmAddress
    };

  } catch (error) {
    console.error('❌ Failed to derive EVM private key:', error);
    throw new Error(
      `Failed to derive EVM private key: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate that a derived EVM address matches the expected address
 * 
 * @param derivedAddress The address derived from mnemonic
 * @param expectedAddress The address stored in database
 * @returns True if addresses match
 */
export function validateDerivedAddress(
  derivedAddress: string,
  expectedAddress: string
): boolean {
  const normalized1 = derivedAddress.toLowerCase();
  const normalized2 = expectedAddress.toLowerCase();
  
  const match = normalized1 === normalized2;
  
  if (!match) {
    console.warn('⚠️ Address mismatch detected:', {
      derived: normalized1,
      expected: normalized2
    });
  }
  
  return match;
}
