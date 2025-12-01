import { supabase } from '@/infrastructure/database/client';
import { ethers } from 'ethers';
import {
  getProjectWallet,
  getProjectWalletById,
  getProjectWalletPrivateKey,
  getSigner,
  getRpcUrl,
  getFactoryAddress,
  normalizeBlockchainName
} from './MultiSigHelpers';
import { validateBlockchain, isEVMChain } from '@/infrastructure/web3/utils/BlockchainValidator';
import type {
  MultiSigWallet,
  WalletDeploymentResult,
  MultiSigDeploymentOptions
} from '@/types/domain/wallet';

// Import ABIs from foundry-contracts
import MultiSigWalletFactoryABI from '@/../foundry-contracts/out/MultiSigWalletFactory.sol/MultiSigWalletFactory.json';

// ============================================================================
// TYPE DEFINITIONS (Database Layer)
// ============================================================================

export interface MultiSigWalletOwner {
  id: string;
  wallet_id: string;
  role_id: string;
  user_id: string | null;
  added_at: string;
  added_by: string | null;
}

export interface MultiSigWalletWithOwners extends Omit<MultiSigWallet, 'owners'> {
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
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

class MultiSigWalletServiceClass {
  /**
   * Format blockchain address for display
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

  // ========================================================================
  // WALLET DEPLOYMENT
  // ========================================================================

  /**
   * Deploy a new multi-sig wallet contract
   * Service provider selects which project wallet funds deployment
   * Populates both multi_sig_wallets and multi_sig_wallet_owners tables
   */
  async deployMultiSigWallet(
    options: MultiSigDeploymentOptions
  ): Promise<WalletDeploymentResult> {
    const {
      name,
      owners,
      threshold,
      blockchain = 'ethereum',
      projectId,
      fundingWalletId,
      ownerUsers
    } = options;

    try {
      // Validate inputs
      if (!name || name.trim() === '') {
        throw new Error('Wallet name is required');
      }

      if (!projectId) {
        throw new Error('Project ID is required to fund deployment');
      }

      // Validate blockchain is EVM-compatible
      const validatedChain = validateBlockchain(blockchain);
      if (!isEVMChain(validatedChain)) {
        throw new Error(
          `Multi-sig wallets only supported on EVM chains. ${validatedChain} is not EVM-compatible.`
        );
      }

      const validOwners = owners.filter(o => o.trim() !== '');
      if (validOwners.length < 2) {
        throw new Error('At least 2 owners required');
      }

      if (threshold < 1 || threshold > validOwners.length) {
        throw new Error('Invalid threshold: must be between 1 and number of owners');
      }

      // Get factory address
      const factoryAddress = getFactoryAddress(blockchain);
      if (!factoryAddress) {
        throw new Error(`No factory address configured for ${blockchain}`);
      }

      // Get project wallet to fund deployment
      const deployerWallet = fundingWalletId
        ? await getProjectWalletById(fundingWalletId)
        : await getProjectWallet(projectId, blockchain);
      
      console.log(`Using project wallet ${deployerWallet.walletAddress} to fund deployment`);

      // Get provider
      const provider = new ethers.JsonRpcProvider(getRpcUrl(blockchain));
      
      // Get signer from deployer wallet
      const signer = await getSigner(provider, {
        projectId,
        blockchain
      });
      
      // Load factory contract
      const factory = new ethers.Contract(
        factoryAddress,
        MultiSigWalletFactoryABI.abi,
        signer
      );
      
      // Create wallet (gas paid by project wallet)
      console.log(`Deploying multi-sig wallet from project wallet ${deployerWallet.walletAddress}`);
      const tx = await factory.createWallet(name, validOwners, threshold);
      const receipt = await tx.wait();
      
      // Extract wallet address from WalletCreated event
      const walletCreatedEvent = receipt.logs.find(
        (log: any) => {
          try {
            const parsed = factory.interface.parseLog(log);
            return parsed?.name === 'WalletCreated';
          } catch {
            return false;
          }
        }
      );
      
      if (!walletCreatedEvent) {
        throw new Error('WalletCreated event not found in transaction receipt');
      }
      
      const parsedEvent = factory.interface.parseLog(walletCreatedEvent);
      const walletAddress = parsedEvent?.args?.wallet;
      
      if (!walletAddress) {
        throw new Error('Could not extract wallet address from event');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Normalize blockchain name
      const normalizedBlockchain = normalizeBlockchainName(
        blockchain,
        deployerWallet.chainId
      );
      
      console.log(`Normalizing blockchain name: "${blockchain}" → "${normalizedBlockchain}"`);
      
      // Store in database
      const { data: insertedWallet, error: insertError } = await supabase
        .from('multi_sig_wallets')
        .insert({
          name,
          blockchain: normalizedBlockchain,
          address: walletAddress,
          threshold,
          status: 'active',
          contract_type: 'custom',
          deployment_tx: receipt.hash,
          factory_address: factoryAddress,
          project_id: projectId,
          funded_by_wallet_id: deployerWallet.id,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ CRITICAL: Multi-sig wallet deployed on-chain but failed to save to database:', insertError);
        console.error('Deployment details:', {
          walletAddress,
          transactionHash: receipt.hash,
          blockchain,
          normalizedBlockchain,
          projectId,
          deployerWalletId: deployerWallet.id
        });
        throw new Error(
          `Wallet deployed on-chain at ${walletAddress} but failed to save to database: ${insertError.message}. ` +
          `Transaction hash: ${receipt.hash}. Please contact support to manually record this wallet.`
        );
      }

      console.log(`✅ Multi-sig wallet deployed and saved to database:`, {
        id: insertedWallet.id,
        address: walletAddress,
        blockchain: normalizedBlockchain,
        transactionHash: receipt.hash,
        fundedBy: deployerWallet.walletAddress
      });
      
      // Insert owner records
      if (ownerUsers && ownerUsers.length > 0) {
        console.log(`Inserting ${ownerUsers.length} owner records...`);
        
        const ownerRecords = ownerUsers.map(owner => ({
          wallet_id: insertedWallet.id,
          user_id: owner.userId,
          role_id: owner.roleId,
          added_by: user?.id
        }));
        
        const { error: ownersError } = await supabase
          .from('multi_sig_wallet_owners')
          .insert(ownerRecords);
        
        if (ownersError) {
          console.error('⚠️ WARNING: Wallet deployed but failed to insert owner records:', ownersError);
          console.error('Owner records that failed:', ownerRecords);
        } else {
          console.log(`✅ Successfully inserted ${ownerUsers.length} owner records`);
        }
      } else {
        console.log('ℹ️ No owner user info provided, skipping multi_sig_wallet_owners insertion');
      }
      
      return {
        id: insertedWallet.id,
        address: walletAddress,
        transactionHash: receipt.hash,
        factoryAddress
      };
      
    } catch (error: any) {
      console.error('Failed to deploy multi-sig wallet:', error);
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  // ========================================================================
  // WALLET QUERIES (EXISTING)
  // ========================================================================

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

      return Array.from(walletMap.values())
        .sort((a, b) => {
          const aDate = new Date((a as any).created_at || a.createdAt).getTime();
          const bDate = new Date((b as any).created_at || b.createdAt).getTime();
          return bDate - aDate;
        });
    } catch (error) {
      console.error('Error fetching multi-sig wallets:', error);
      throw error;
    }
  }

  // ========================================================================
  // TRANSACTION PROPOSALS (EXISTING - Basic Operations)
  // ========================================================================

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: wallet, error: walletError } = await supabase
        .from('multi_sig_wallets')
        .select('threshold')
        .eq('id', walletId)
        .single();

      if (walletError) throw walletError;
      if (!wallet) throw new Error('Wallet not found');

      const { data: transaction, error: txError } = await supabase
        .from('multi_sig_transactions')
        .insert({
          wallet_id: walletId,
          destination_wallet_address: toAddress,
          value,
          data: data || '',
          nonce: 0,
          hash: '',
          executed: false,
          confirmations: 0,
          blockchain: '',
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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
