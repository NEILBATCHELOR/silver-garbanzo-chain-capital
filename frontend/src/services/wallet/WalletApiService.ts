/**
 * Wallet API Service - Connects frontend to backend wallet services
 * Replaces localStorage-based WalletContext with real API calls
 */

import { supabase } from '@/infrastructure/database/client';

export interface CreateWalletApiRequest {
  name: string;
  wallet_type: 'eoa' | 'smart_contract' | 'multisig';
  blockchains: string[];
  investor_id?: string;
}

export interface WalletApiResponse {
  id: string;
  name: string;
  primary_address: string;
  addresses: Record<string, string>;
  wallet_type: string;
  blockchain: string;
  status: string;
  created_at: string;
}

import { generateSecureRandom, generateSecureInt, generateSecureTxHash, generateSecureAddress } from '@/utils/wallet/crypto';

export class WalletApiService {
  private static instance: WalletApiService;

  private constructor() {}

  static getInstance(): WalletApiService {
    if (!WalletApiService.instance) {
      WalletApiService.instance = new WalletApiService();
    }
    return WalletApiService.instance;
  }

  /**
   * Create a new wallet via backend API
   */
  async createWallet(request: CreateWalletApiRequest): Promise<WalletApiResponse> {
    try {
      // For now, create directly in Supabase until backend API is connected
      // In production, this would call: POST /api/wallets
      
      // Get or create a default investor_id for wallet creation
      const investorId = request.investor_id || await this.getOrCreateDefaultInvestor();
      
      const { data, error } = await supabase
        .from('wallets')
        .insert({
          investor_id: investorId,
          wallet_type: request.wallet_type,
          blockchain: request.blockchains[0] || 'ethereum',
          wallet_address: this.generateAddress(),
          status: 'active',
          guardian_policy: {},
          signatories: []
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating wallet:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        id: data.id,
        name: request.name,
        primary_address: data.wallet_address,
        addresses: { [request.blockchains[0] || 'ethereum']: data.wallet_address },
        wallet_type: data.wallet_type,
        blockchain: data.blockchain,
        status: data.status,
        created_at: data.created_at
      };

    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw new Error(`Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List user's wallets
   */
  async getUserWallets(userId?: string): Promise<WalletApiResponse[]> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(wallet => ({
        id: wallet.id,
        name: `Wallet ${wallet.id.slice(0, 8)}`,
        primary_address: wallet.wallet_address,
        addresses: { [wallet.blockchain]: wallet.wallet_address },
        wallet_type: wallet.wallet_type,
        blockchain: wallet.blockchain,
        status: wallet.status,
        created_at: wallet.created_at
      }));

    } catch (error) {
      console.error('Failed to fetch wallets:', error);
      return [];
    }
  }

  /**
   * Generate a sample address for testing
   * In production, this would be handled by the backend HDWalletService
   */
  private generateAddress(): string {
    // Use proper cryptographic wallet generation
    // Import ethers at top of file for real address generation
    const { Wallet } = require('ethers');
    const wallet = Wallet.createRandom();
    return wallet.address;
  }

  /**
   * Create sample transaction data for testing
   */
  async createSampleTransaction(walletAddress: string): Promise<void> {
    try {
      const sampleTx = {
        chain_id: '1',
        from_address: '0x742d35Cc6642C4532C0532C08D23e59AC52b08F4',
        to_address: walletAddress,
        value: (generateSecureRandom() * 10).toFixed(4),
        tx_hash: generateSecureTxHash(),
        status: 'confirmed',
        token_symbol: 'ETH',
        confirmation_count: generateSecureInt(1, 20),
        gas_limit: '21000',
        gas_price: '20000000000',
        nonce: generateSecureInt(0, 100)
      };

      const { error } = await supabase
        .from('wallet_transactions')
        .insert(sampleTx);

      if (error) {
        console.warn('Failed to create sample transaction:', error);
      }
    } catch (error) {
      console.warn('Sample transaction creation failed:', error);
    }
  }

  /**
   * Get or create a default investor for wallet creation
   * This is a temporary solution - in production, this should use the authenticated user's investor ID
   */
  private async getOrCreateDefaultInvestor(): Promise<string> {
    try {
      // First, try to find an existing investor
      const { data: existingInvestor, error: findError } = await supabase
        .from('investors')
        .select('id')
        .limit(1)
        .single();

      if (!findError && existingInvestor) {
        return existingInvestor.id;
      }

      // If no investor exists, create a default one for testing
      const { data: newInvestor, error: createError } = await supabase
        .from('investors')
        .insert({
          name: 'Default Investor',
          email: `default-${Date.now()}@example.com`,
          organization_name: 'Test Organization'
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Failed to create default investor:', createError);
        // Fallback to a known investor ID from the database
        return '09251c54-705b-4e2e-8585-e9cb43c1b9fd';
      }

      return newInvestor.id;
    } catch (error) {
      console.error('Error getting/creating investor:', error);
      // Fallback to a known investor ID from the database  
      return '09251c54-705b-4e2e-8585-e9cb43c1b9fd';
    }
  }
}

export const walletApiService = WalletApiService.getInstance();
