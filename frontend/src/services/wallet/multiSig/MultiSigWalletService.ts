import { supabase } from '@/infrastructure/database/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MultiSigWallet {
  id: string;
  name: string;
  blockchain: string;
  address: string;
  threshold: number;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  status: string | null;
  project_id: string | null;
  investor_id: string | null;
  contract_type: string | null;
  ownership_type: string | null;
}

export interface MultiSigWalletOwner {
  id: string;
  wallet_id: string;
  role_id: string;
  user_id: string | null;
  added_at: string;
  added_by: string | null;
}

export interface MultiSigWalletWithOwners extends MultiSigWallet {
  owners: MultiSigWalletOwner[];
  owner_count: number;
}

export interface MultiSigConfirmation {
  id: string;
  transaction_id: string;
  owner: string;
  signature: string;
  created_at: string;
  confirmed: boolean | null;
  signer: string | null;
  timestamp: string | null;
}

export interface MultiSigTransaction {
  id: string;
  wallet_id: string;
  destination_wallet_address: string;
  value: string;
  data: string;
  nonce: number;
  hash: string;
  executed: boolean;
  confirmations: number;
  blockchain: string;
  token_address: string | null;
  token_symbol: string | null;
  created_at: string;
  updated_at: string | null;
  blockchain_specific_data: any | null;
  description: string | null;
  required: number | null;
  to: string | null;
  // Optional relation - populated when querying with confirmations
  multi_sig_confirmations?: MultiSigConfirmation[];
}

// ============================================================================
// BLOCKCHAIN NAME MAPPING
// ============================================================================

const BLOCKCHAIN_NAMES: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  bsc: 'Binance Smart Chain',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  avalanche: 'Avalanche',
  fantom: 'Fantom',
  base: 'Base',
  // Add more as needed
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

class MultiSigWalletServiceClass {
  /**
   * Format blockchain address for display (e.g., 0x1234...5678)
   */
  formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
    if (!address || address.length < startChars + endChars) {
      return address;
    }
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  }

  /**
   * Get blockchain display name from code
   */
  getBlockchainName(blockchain: string): string {
    return BLOCKCHAIN_NAMES[blockchain?.toLowerCase()] || blockchain;
  }

  /**
   * Get all multi-sig wallets (without user filtering)
   */
  async getMultiSigWallets(): Promise<MultiSigWalletWithOwners[]> {
    try {
      const { data, error } = await supabase
        .from('multi_sig_wallets')
        .select(`
          *,
          owners:multi_sig_wallet_owners(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(wallet => ({
        ...wallet,
        owners: wallet.owners || [],
        owner_count: (wallet.owners || []).length
      }));
    } catch (error) {
      console.error('Error fetching multi-sig wallets:', error);
      throw error;
    }
  }

  /**
   * Get all multi-sig wallets for a specific user
   */
  async getMultiSigWalletsForUser(userId: string): Promise<MultiSigWalletWithOwners[]> {
    try {
      // Validate userId
      if (!userId || userId.trim() === '') {
        console.warn('getMultiSigWalletsForUser called with empty userId, returning empty array');
        return [];
      }

      // Query 1: Wallets created by the user
      const { data: createdWallets, error: createdError } = await supabase
        .from('multi_sig_wallets')
        .select(`
          *,
          owners:multi_sig_wallet_owners(*)
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (createdError) throw createdError;

      // Query 2: Wallets where user is an owner
      const { data: ownedWallets, error: ownedError } = await supabase
        .from('multi_sig_wallets')
        .select(`
          *,
          owners:multi_sig_wallet_owners!inner(*)
        `)
        .eq('owners.user_id', userId)
        .order('created_at', { ascending: false });

      if (ownedError) throw ownedError;

      // Combine and deduplicate by wallet ID
      const walletMap = new Map<string, MultiSigWalletWithOwners>();
      
      const processWallets = (wallets: any[]) => {
        wallets?.forEach(wallet => {
          if (!walletMap.has(wallet.id)) {
            walletMap.set(wallet.id, {
              ...wallet,
              owners: wallet.owners || [],
              owner_count: (wallet.owners || []).length
            });
          }
        });
      };

      processWallets(createdWallets || []);
      processWallets(ownedWallets || []);

      // Convert back to array and sort by created_at
      return Array.from(walletMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      console.error('Error fetching multi-sig wallets:', error);
      throw error;
    }
  }

  /**
   * Propose a new transaction for a multi-sig wallet
   */
  async proposeTransaction(
    walletId: string,
    toAddress: string,
    value: string,
    data?: string
  ): Promise<string> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get wallet to verify threshold
      const { data: wallet, error: walletError } = await supabase
        .from('multi_sig_wallets')
        .select('threshold')
        .eq('id', walletId)
        .single();

      if (walletError) throw walletError;
      if (!wallet) throw new Error('Wallet not found');

      // Create transaction
      const { data: transaction, error: txError } = await supabase
        .from('multi_sig_transactions')
        .insert({
          wallet_id: walletId,
          destination_wallet_address: toAddress,
          value,
          data: data || '',
          nonce: 0, // TODO: Get proper nonce
          hash: '', // Will be set when executed
          executed: false,
          confirmations: 0,
          blockchain: '', // TODO: Get from wallet
          required: wallet.threshold
        })
        .select()
        .single();

      if (txError) throw txError;
      if (!transaction) throw new Error('Failed to create transaction');

      return transaction.id;
    } catch (error) {
      console.error('Error proposing transaction:', error);
      throw error;
    }
  }

  /**
   * Get a transaction by ID with confirmations
   */
  async getTransactionById(transactionId: string): Promise<MultiSigTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('multi_sig_transactions')
        .select(`
          *,
          multi_sig_confirmations(*)
        `)
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  /**
   * Confirm a transaction (add signature)
   */
  async confirmTransaction(
    transactionId: string,
    ownerAddress: string,
    signature?: string
  ): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Add confirmation
      const { error } = await supabase
        .from('multi_sig_confirmations')
        .insert({
          transaction_id: transactionId,
          owner: ownerAddress,
          signature: signature || '',
          confirmed: true,
          signer: user.id
        });

      if (error) throw error;

      // Update confirmation count
      const { data: confirmations } = await supabase
        .from('multi_sig_confirmations')
        .select('id')
        .eq('transaction_id', transactionId);

      if (confirmations) {
        await supabase
          .from('multi_sig_transactions')
          .update({ confirmations: confirmations.length })
          .eq('id', transactionId);
      }
    } catch (error) {
      console.error('Error confirming transaction:', error);
      throw error;
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const MultiSigWalletService = new MultiSigWalletServiceClass();
