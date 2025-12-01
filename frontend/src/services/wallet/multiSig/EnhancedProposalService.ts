/**
 * Enhanced Multi-Sig Proposal Service
 * Provides comprehensive proposal data with wallet names, user names, and detailed transaction info
 */

import { supabase } from '@/infrastructure/database/client';
import { ethers } from 'ethers';
import type { MultiSigProposal } from '@/types/domain/wallet';

// ============================================================================
// ENHANCED TYPES
// ============================================================================

export interface EnhancedProposalSigner {
  address: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  signedAt?: Date;
  onChainConfirmed: boolean;
  onChainConfirmationTx?: string;
}

export interface EnhancedProposalDetails {
  // Basic proposal info
  id: string;
  status: 'pending' | 'submitted' | 'signed' | 'executed' | 'expired' | 'rejected';
  createdAt: Date;
  expiresAt: Date;
  executedAt?: Date;
  
  // Transaction details
  fromAddress: string;
  fromWalletName?: string;
  toAddress: string;
  toWalletName?: string;
  blockchain: string;
  chainId?: number;
  
  // Amount and asset
  value: string; // in wei
  valueFormatted: string; // human readable (e.g., "0.5 ETH")
  isTokenTransfer: boolean;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  
  // Transaction data
  data?: string;
  isContractCall: boolean;
  
  // Hashes
  proposalHash: string; // Internal proposal hash
  onChainTxHash?: string; // Actual blockchain transaction hash (when submitted)
  executionHash?: string; // Transaction hash when executed
  onChainTxId?: number; // On-chain transaction ID from contract
  
  // Signatures
  signaturesRequired: number;
  signaturesCollected: number;
  signers: EnhancedProposalSigner[];
  
  // Created by
  createdBy?: {
    userId: string;
    userName?: string;
    userEmail?: string;
  };
  
  // Submitted by (who submitted to contract)
  submittedBy?: string;
  submittedOnChain: boolean;
}
// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class EnhancedProposalService {
  private static instance: EnhancedProposalService;
  
  static getInstance(): EnhancedProposalService {
    if (!EnhancedProposalService.instance) {
      EnhancedProposalService.instance = new EnhancedProposalService();
    }
    return EnhancedProposalService.instance;
  }

  /**
   * Get enhanced proposal details with comprehensive information
   */
  async getEnhancedProposal(proposalId: string): Promise<EnhancedProposalDetails | null> {
    try {
      // Fetch proposal
      const { data: proposal, error: proposalError } = await supabase
        .from('multi_sig_proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (proposalError || !proposal) {
        console.error('Failed to fetch proposal:', proposalError);
        return null;
      }

      // Fetch wallet info
      const { data: wallet } = await supabase
        .from('multi_sig_wallets')
        .select('address, name, blockchain')
        .eq('id', proposal.wallet_id)
        .single();

      // Fetch destination wallet name (if it's another multi-sig wallet)
      let toWalletName: string | undefined;
      if (proposal.to_address) {
        const { data: toWallet } = await supabase
          .from('multi_sig_wallets')
          .select('name')
          .eq('address', proposal.to_address.toLowerCase())
          .single();
        toWalletName = toWallet?.name;
      }

      // Fetch creator info
      let createdByInfo: { userId: string; userName?: string; userEmail?: string } | undefined;
      if (proposal.created_by) {
        const { data: creator, error: creatorError } = await supabase
          .from('users')
          .select('id, email, name')
          .eq('id', proposal.created_by)
          .maybeSingle();
          
        if (!creatorError && creator) {
          createdByInfo = {
            userId: creator.id,
            userName: creator.name || undefined,
            userEmail: creator.email || undefined
          };
        }
      }

      // Fetch signatures with user info
      const signers = await this.getEnhancedSigners(proposalId);

      // Parse transaction details
      const rawTx = proposal.raw_transaction;
      const value = rawTx.value || '0';
      const data = rawTx.data || '0x';
      
      // Detect token transfer
      const isTokenTransfer = this.detectTokenTransfer(data);
      let tokenInfo: { address?: string; symbol?: string; decimals?: number } | undefined;
      
      if (isTokenTransfer && proposal.token_address) {
        tokenInfo = await this.getTokenInfo(proposal.token_address, wallet?.blockchain);
      }

      // Format value
      const valueFormatted = await this.formatValue(
        value,
        isTokenTransfer,
        tokenInfo?.symbol || 'ETH',
        tokenInfo?.decimals || 18
      );

      // Determine if it's a contract call
      const isContractCall = data !== '0x' && data.length > 10;

      return {
        id: proposal.id,
        status: proposal.status || 'pending',
        createdAt: new Date(proposal.created_at),
        expiresAt: new Date(proposal.expires_at),
        executedAt: proposal.executed_at ? new Date(proposal.executed_at) : undefined,
        
        fromAddress: wallet?.address || '',
        fromWalletName: wallet?.name,
        toAddress: proposal.to_address || rawTx.to,
        toWalletName,
        blockchain: proposal.blockchain || wallet?.blockchain || 'ethereum',
        chainId: undefined, // Could be fetched from chain config
        
        value,
        valueFormatted,
        isTokenTransfer,
        tokenAddress: proposal.token_address,
        tokenSymbol: tokenInfo?.symbol,
        tokenDecimals: tokenInfo?.decimals,
        
        data: data !== '0x' ? data : undefined,
        isContractCall,
        
        proposalHash: proposal.transaction_hash,
        onChainTxHash: proposal.on_chain_tx_hash,
        executionHash: proposal.execution_hash,
        onChainTxId: proposal.on_chain_tx_id,
        
        signaturesRequired: proposal.signatures_required,
        signaturesCollected: proposal.signatures_collected || 0,
        signers,
        
        createdBy: createdByInfo,
        submittedBy: proposal.submitted_by,
        submittedOnChain: proposal.submitted_on_chain || false,
      };

    } catch (error) {
      console.error('Failed to get enhanced proposal:', error);
      return null;
    }
  }

  /**
   * Get enhanced signers with user information
   */
  private async getEnhancedSigners(proposalId: string): Promise<EnhancedProposalSigner[]> {
    try {
      // Fetch signatures from proposal_signatures table
      const { data: signatures, error: signaturesError } = await supabase
        .from('proposal_signatures')
        .select('*')
        .eq('proposal_id', proposalId);

      if (signaturesError) {
        console.error('Failed to fetch proposal signatures:', signaturesError);
        return [];
      }

      if (!signatures || signatures.length === 0) {
        return [];
      }

      // Enrich with user information - fetch separately since no FK exists
      const enriched = await Promise.all(
        signatures.map(async (sig) => {
          const address = sig.signer_address.toLowerCase();
          
          // Find user by address (case-insensitive)
          const { data: userAddress } = await supabase
            .from('user_addresses')
            .select('user_id, address')
            .ilike('address', address)
            .eq('is_active', true)
            .maybeSingle();

          let userName: string | undefined;
          let userEmail: string | undefined;
          let userRole: string | undefined;

          // If user address found, fetch user details and role
          if (userAddress?.user_id) {
            // Fetch user details
            const { data: user } = await supabase
              .from('users')
              .select('id, email, name')
              .eq('id', userAddress.user_id)
              .single();

            if (user) {
              userName = user.name || undefined;
              userEmail = user.email || undefined;
            }

            // Fetch user role
            const { data: userRoleData } = await supabase
              .from('user_roles')
              .select('role_id')
              .eq('user_id', userAddress.user_id)
              .maybeSingle();

            if (userRoleData?.role_id) {
              const { data: role } = await supabase
                .from('roles')
                .select('name')
                .eq('id', userRoleData.role_id)
                .single();
              
              userRole = role?.name || undefined;
            }
          }

          return {
            address: sig.signer_address, // Use original case from signature
            userName,
            userEmail,
            userRole,
            signedAt: new Date(sig.signed_at),
            onChainConfirmed: sig.confirmed_on_chain || false,
            onChainConfirmationTx: sig.on_chain_confirmation_tx || undefined,
          };
        })
      );

      return enriched;

    } catch (error) {
      console.error('Failed to get enhanced signers:', error);
      return [];
    }
  }

  /**
   * Detect if transaction is a token transfer
   */
  private detectTokenTransfer(data: string): boolean {
    if (!data || data === '0x' || data.length < 10) return false;
    
    // ERC20 transfer signature: 0xa9059cbb
    const transferSelector = '0xa9059cbb';
    return data.toLowerCase().startsWith(transferSelector);
  }

  /**
   * Get token information
   */
  private async getTokenInfo(
    tokenAddress: string, 
    blockchain?: string
  ): Promise<{ symbol?: string; decimals?: number } | undefined> {
    try {
      // Try to fetch from database first
      const { data: token } = await supabase
        .from('tokens')
        .select('symbol, decimals')
        .eq('address', tokenAddress.toLowerCase())
        .single();

      if (token) {
        return {
          symbol: token.symbol,
          decimals: token.decimals
        };
      }

      // Could also try to fetch from blockchain, but for now return undefined
      return undefined;

    } catch (error) {
      console.error('Failed to get token info:', error);
      return undefined;
    }
  }

  /**
   * Format value for display
   */
  private async formatValue(
    value: string,
    isTokenTransfer: boolean,
    symbol: string,
    decimals: number
  ): Promise<string> {
    try {
      if (value === '0' && !isTokenTransfer) {
        return '0 ETH';
      }

      const formatted = ethers.formatUnits(value, decimals);
      return `${parseFloat(formatted).toFixed(6)} ${symbol}`;

    } catch (error) {
      console.error('Failed to format value:', error);
      return `${value} wei`;
    }
  }

  /**
   * Get all enhanced proposals for a wallet
   */
  async getEnhancedProposalsForWallet(walletId: string): Promise<EnhancedProposalDetails[]> {
    try {
      const { data: proposals } = await supabase
        .from('multi_sig_proposals')
        .select('id')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false });

      if (!proposals || proposals.length === 0) {
        return [];
      }

      const enhanced = await Promise.all(
        proposals.map(p => this.getEnhancedProposal(p.id))
      );

      return enhanced.filter((p): p is EnhancedProposalDetails => p !== null);

    } catch (error) {
      console.error('Failed to get enhanced proposals:', error);
      return [];
    }
  }
}

// Export singleton instance
export const enhancedProposalService = EnhancedProposalService.getInstance();
