import { supabase } from '@/infrastructure/database/client';
import { keyVaultClient } from '@/infrastructure/keyVault/keyVaultClient';
import { ETHWalletGenerator } from './generators/ETHWalletGenerator';

/**
 * Interface for investor wallet creation result
 */
export interface InvestorWalletResult {
  investorId: string;
  walletId: string;
  address: string;
  blockchain: string;
  success: boolean;
  error?: string;
}

/**
 * Interface for bulk wallet generation progress
 */
export interface BulkGenerationProgress {
  total: number;
  completed: number;
  failed: number;
  results: InvestorWalletResult[];
}

/**
 * InvestorWalletService
 * 
 * Handles wallet generation for investors with proper key storage in:
 * 1. key_vault_keys table (encrypted keys)
 * 2. wallets table (wallet metadata + vault references)
 * 3. investors table (wallet_address reference)
 */
export class InvestorWalletService {
  /**
   * Generate a wallet for a single investor
   * 
   * @param investorId - The investor's UUID
   * @param projectId - The project UUID (required for wallet association)
   * @param blockchain - The blockchain network (default: 'ethereum')
   * @returns InvestorWalletResult with wallet details
   */
  public static async generateWalletForInvestor(
    investorId: string,
    projectId: string,
    blockchain: string = 'ethereum'
  ): Promise<InvestorWalletResult> {
    try {
      // Step 1: Generate wallet with private key and mnemonic
      const generatedWallet = ETHWalletGenerator.generateWallet({
        includePrivateKey: true,
        includeMnemonic: true,
      });

      if (!generatedWallet.privateKey || !generatedWallet.mnemonic) {
        throw new Error('Failed to generate wallet with required keys');
      }

      // Step 2: Store keys in key_vault_keys table
      const privateKeyVaultId = await keyVaultClient.storeKey(generatedWallet.privateKey);
      const mnemonicVaultId = await keyVaultClient.storeKey(generatedWallet.mnemonic);
      const publicKeyVaultId = await keyVaultClient.storeKey(generatedWallet.publicKey);

      // Step 3: Create wallet record in wallets table
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .insert({
          investor_id: investorId,
          project_id: projectId,
          wallet_address: generatedWallet.address,
          wallet_type: 'eoa', // Externally Owned Account
          blockchain: blockchain,
          status: 'active',
          public_key: generatedWallet.publicKey,
          // Store vault IDs for secure key retrieval
          private_key_vault_id: privateKeyVaultId,
          mnemonic_vault_id: mnemonicVaultId,
          public_key_vault_id: publicKeyVaultId,
          // DO NOT store plaintext keys in production!
          // These fields are for legacy support only
          private_key: null,
          mnemonic: null,
        })
        .select('id')
        .single();

      if (walletError) {
        console.error('Error creating wallet record:', walletError);
        throw walletError;
      }

      // Step 4: Link vault keys to wallet_id
      await this.linkVaultKeysToWallet(
        walletData.id,
        privateKeyVaultId,
        mnemonicVaultId,
        publicKeyVaultId
      );

      // Step 5: Update investor record with wallet address
      const { error: investorError } = await supabase
        .from('investors')
        .update({
          wallet_address: generatedWallet.address,
          updated_at: new Date().toISOString(),
        })
        .eq('investor_id', investorId);

      if (investorError) {
        console.error('Error updating investor record:', investorError);
        throw investorError;
      }

      return {
        investorId,
        walletId: walletData.id,
        address: generatedWallet.address,
        blockchain,
        success: true,
      };
    } catch (error) {
      console.error(`Error generating wallet for investor ${investorId}:`, error);
      return {
        investorId,
        walletId: '',
        address: '',
        blockchain,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate wallets for multiple investors in bulk
   * 
   * @param investorIds - Array of investor UUIDs
   * @param projectId - The project UUID
   * @param blockchain - The blockchain network
   * @param onProgress - Optional callback for progress updates
   * @returns BulkGenerationProgress with results
   */
  public static async generateWalletsForInvestors(
    investorIds: string[],
    projectId: string,
    blockchain: string = 'ethereum',
    onProgress?: (progress: BulkGenerationProgress) => void
  ): Promise<BulkGenerationProgress> {
    const progress: BulkGenerationProgress = {
      total: investorIds.length,
      completed: 0,
      failed: 0,
      results: [],
    };

    for (const investorId of investorIds) {
      const result = await this.generateWalletForInvestor(
        investorId,
        projectId,
        blockchain
      );

      progress.results.push(result);
      
      if (result.success) {
        progress.completed++;
      } else {
        progress.failed++;
      }

      // Call progress callback if provided
      if (onProgress) {
        onProgress({ ...progress });
      }
    }

    return progress;
  }

  /**
   * Retrieve wallet details for an investor
   * 
   * @param investorId - The investor's UUID
   * @returns Wallet details without sensitive keys
   */
  public static async getInvestorWallet(investorId: string) {
    const { data, error } = await supabase
      .from('wallets')
      .select(`
        id,
        wallet_address,
        wallet_type,
        blockchain,
        status,
        public_key,
        created_at,
        updated_at,
        private_key_vault_id,
        mnemonic_vault_id,
        public_key_vault_id
      `)
      .eq('investor_id', investorId)
      .eq('status', 'active')
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Retrieve private key for a wallet (use with extreme caution!)
   * 
   * @param walletId - The wallet UUID
   * @returns Decrypted private key
   */
  public static async getWalletPrivateKey(walletId: string): Promise<string> {
    // Step 1: Get vault reference from wallets table
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('private_key_vault_id')
      .eq('id', walletId)
      .single();

    if (walletError || !walletData?.private_key_vault_id) {
      throw new Error('Wallet or private key vault ID not found');
    }

    // Step 2: Retrieve and decrypt key from key vault
    const keyData = await keyVaultClient.getKey(walletData.private_key_vault_id);
    
    if (typeof keyData === 'string') {
      return keyData;
    } else {
      return keyData.privateKey;
    }
  }

  /**
   * Retrieve mnemonic for a wallet (use with extreme caution!)
   * 
   * @param walletId - The wallet UUID
   * @returns Decrypted mnemonic phrase
   */
  public static async getWalletMnemonic(walletId: string): Promise<string> {
    // Step 1: Get vault reference from wallets table
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('mnemonic_vault_id')
      .eq('id', walletId)
      .single();

    if (walletError || !walletData?.mnemonic_vault_id) {
      throw new Error('Wallet or mnemonic vault ID not found');
    }

    // Step 2: Retrieve and decrypt mnemonic from key vault
    const keyData = await keyVaultClient.getKey(walletData.mnemonic_vault_id);
    
    if (typeof keyData === 'string') {
      return keyData;
    } else {
      return keyData.privateKey; // Mnemonic stored as "privateKey" in vault
    }
  }

  /**
   * Delete a wallet (soft delete by setting status to 'deleted')
   * 
   * @param walletId - The wallet UUID
   * @returns Success status
   */
  public static async deleteWallet(walletId: string): Promise<boolean> {
    const { error } = await supabase
      .from('wallets')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', walletId);

    if (error) {
      console.error('Error deleting wallet:', error);
      return false;
    }

    return true;
  }

  /**
   * Link vault keys to wallet record in key_vault_keys table
   * 
   * @private
   * @param walletId - The wallet UUID
   * @param privateKeyVaultId - Private key vault UUID
   * @param mnemonicVaultId - Mnemonic vault UUID
   * @param publicKeyVaultId - Public key vault UUID
   */
  private static async linkVaultKeysToWallet(
    walletId: string,
    privateKeyVaultId: string,
    mnemonicVaultId: string,
    publicKeyVaultId: string
  ): Promise<void> {
    // Update key_vault_keys records to link them to the wallet
    // Note: vault IDs are now UUIDs (the 'id' column), not the TEXT 'key_id' column
    const keyVaultIds = [privateKeyVaultId, mnemonicVaultId, publicKeyVaultId];

    for (const vaultId of keyVaultIds) {
      const { error } = await supabase
        .from('key_vault_keys')
        .update({
          wallet_id: walletId,
        })
        .eq('id', vaultId); // Match on UUID 'id' column, not 'key_id'

      if (error) {
        console.error(`Error linking vault key ${vaultId} to wallet ${walletId}:`, error);
      }
    }
  }

  /**
   * Get all wallets for a project
   * 
   * @param projectId - The project UUID
   * @returns Array of wallet records
   */
  public static async getProjectWallets(projectId: string) {
    const { data, error } = await supabase
      .from('wallets')
      .select(`
        id,
        investor_id,
        wallet_address,
        wallet_type,
        blockchain,
        status,
        public_key,
        created_at,
        investors (
          investor_id,
          name,
          email,
          type
        )
      `)
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Export wallet backup (for emergency recovery)
   * Returns encrypted backup data - NOT plaintext keys
   * 
   * @param walletId - The wallet UUID
   * @param password - Password for backup encryption
   * @returns Encrypted backup JSON string
   */
  public static async exportWalletBackup(
    walletId: string,
    password: string
  ): Promise<string> {
    // Get wallet details
    const walletData = await this.getInvestorWallet(walletId);
    
    // Get private key (securely)
    const privateKey = await this.getWalletPrivateKey(walletId);
    
    // Create ethers wallet for encryption
    const { Wallet } = await import('ethers');
    const wallet = new Wallet(privateKey);
    
    // Encrypt wallet with password
    const encryptedJson = await wallet.encrypt(password);
    
    return encryptedJson;
  }
}
