/**
 * Ripple Multi-Signature Service
 * Implements multi-signature support for XRP Ledger
 * Supports SignerListSet, multi-signing, and quorum validation
 */

import { ChainType, addressUtils } from '../AddressUtils';
import { supabase } from '@/infrastructure/database/client';
import { RippleTransactionBuilder } from '../builders/RippleTransactionBuilder';
import { generateSecureHash } from '@/infrastructure/web3/utils/CryptoUtils';

export interface RippleSigner {
  account: string;
  weight: number;
  publicKey?: string;
}

export interface RippleSignerList {
  signerQuorum: number;
  signers: RippleSigner[];
  signerListID?: number;
}

export interface RippleMultiSigAccount {
  address: string;
  signerList: RippleSignerList;
  regularKey?: string;
  masterKeyDisabled: boolean;
  sequence: number;
}

export interface RippleMultiSigSignature {
  signer: string;
  signature: string;
  publicKey: string;
}

export interface RippleMultiSigTransaction {
  transaction: any;
  signatures: RippleMultiSigSignature[];
  requiredSignatures: number;
  currentWeight: number;
  isReady: boolean;
}

/**
 * Ripple Multi-Sig Service
 * Manages multi-signature accounts and transactions on XRP Ledger
 */
export class RippleMultiSigService {
  private builder: RippleTransactionBuilder;
  private readonly networkType: 'mainnet' | 'testnet';
  
  constructor(networkType: 'mainnet' | 'testnet' = 'mainnet') {
    this.networkType = networkType;
    this.builder = networkType === 'mainnet' 
      ? new RippleTransactionBuilder({
          chainId: 0,
          chainName: 'Ripple',
          networkType: 'mainnet',
          symbol: 'XRP',
          decimals: 6
        })
      : new RippleTransactionBuilder({
          chainId: 1,
          chainName: 'Ripple Testnet',
          networkType: 'testnet',
          symbol: 'XRP',
          decimals: 6
        });
  }
  
  /**
   * Create a multi-signature account configuration
   */
  async createMultiSigAccount(
    address: string,
    signers: RippleSigner[],
    quorum: number
  ): Promise<RippleMultiSigAccount> {
    // Validate address
    const validation = addressUtils.validateAddress(address, ChainType.RIPPLE, this.networkType);
    if (!validation.isValid) {
      throw new Error(`Invalid account address: ${validation.error}`);
    }
    
    // Validate signers
    for (const signer of signers) {
      const signerValidation = addressUtils.validateAddress(
        signer.account,
        ChainType.RIPPLE,
        this.networkType
      );
      if (!signerValidation.isValid) {
        throw new Error(`Invalid signer address ${signer.account}: ${signerValidation.error}`);
      }
      
      if (signer.weight < 0 || signer.weight > 65535) {
        throw new Error(`Invalid weight for signer ${signer.account}: must be 0-65535`);
      }
    }
    
    // Validate quorum
    const totalWeight = signers.reduce((sum, s) => sum + s.weight, 0);
    if (quorum > totalWeight) {
      throw new Error(`Quorum (${quorum}) cannot exceed total weight (${totalWeight})`);
    }
    
    // Create signer list configuration
    const signerList: RippleSignerList = {
      signerQuorum: quorum,
      signers: signers,
      signerListID: 0 // Will be set by the ledger
    };
    
    // Store in database
    const { error } = await supabase
      .from('ripple_multisig_accounts')
      .upsert({
        address,
        signer_list: signerList,
        quorum,
        signers: signers.map(s => s.account),
        network_type: this.networkType,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      throw new Error(`Failed to store multi-sig configuration: ${error.message}`);
    }
    
    return {
      address,
      signerList,
      regularKey: undefined,
      masterKeyDisabled: false,
      sequence: 0
    };
  }
  
  /**
   * Build SignerListSet transaction to configure multi-sig on-chain
   */
  async buildSignerListSetTransaction(
    account: string,
    signers: RippleSigner[],
    quorum: number
  ): Promise<any> {
    // Format signers for XRPL
    const signerEntries = signers.map(signer => ({
      SignerEntry: {
        Account: signer.account,
        SignerWeight: signer.weight
      }
    }));
    
    const tx = {
      TransactionType: 'SignerListSet',
      Account: account,
      SignerQuorum: quorum,
      SignerEntries: signerEntries,
      Flags: 0
    };
    
    return tx;
  }
  
  /**
   * Disable master key (recommended after setting up multi-sig)
   */
  async buildDisableMasterKeyTransaction(account: string): Promise<any> {
    return {
      TransactionType: 'AccountSet',
      Account: account,
      SetFlag: 4, // asfDisableMaster
      Flags: 0
    };
  }  
  /**
   * Create a multi-signed transaction
   */
  async createMultiSigTransaction(
    transaction: any,
    signerAccount: string,
    signerPrivateKey: string
  ): Promise<RippleMultiSigSignature> {
    // Hash the transaction for signing
    const txToSign = { ...transaction };
    txToSign.SigningPubKey = ''; // Must be empty for multi-signing
    
    // Sign with the signer's key
    const signedTx = await this.builder.signTransaction(txToSign, signerPrivateKey);
    
    return {
      signer: signerAccount,
      signature: signedTx.tx_blob,
      publicKey: '' // Would derive from private key
    };
  }
  
  /**
   * Collect and validate signatures for a multi-sig transaction
   */
  async collectSignatures(
    transaction: any,
    signatures: RippleMultiSigSignature[]
  ): Promise<RippleMultiSigTransaction> {
    // Get account's signer list from database
    const { data: accountData, error } = await supabase
      .from('ripple_multisig_accounts')
      .select('*')
      .eq('address', transaction.Account)
      .eq('network_type', this.networkType)
      .single();
    
    if (error || !accountData) {
      throw new Error('Multi-sig account not found');
    }
    
    const signerList = accountData.signer_list as RippleSignerList;
    
    // Calculate current weight from signatures
    let currentWeight = 0;
    const validSignatures: RippleMultiSigSignature[] = [];
    
    for (const sig of signatures) {
      const signer = signerList.signers.find(s => s.account === sig.signer);
      if (signer) {
        currentWeight += signer.weight;
        validSignatures.push(sig);
      }
    }
    
    // Check if we have enough signatures
    const isReady = currentWeight >= signerList.signerQuorum;
    
    return {
      transaction,
      signatures: validSignatures,
      requiredSignatures: signerList.signerQuorum,
      currentWeight,
      isReady
    };
  }
  
  /**
   * Combine signatures into a fully-signed multi-sig transaction
   */
  async combineSignatures(
    transaction: any,
    signatures: RippleMultiSigSignature[]
  ): Promise<any> {
    const multiSigTx = await this.collectSignatures(transaction, signatures);
    
    if (!multiSigTx.isReady) {
      throw new Error(
        `Insufficient signatures: ${multiSigTx.currentWeight}/${multiSigTx.requiredSignatures} weight`
      );
    }
    
    // Format transaction with all signatures
    const finalTx = {
      ...transaction,
      SigningPubKey: '', // Must be empty for multi-signed transactions
      Signers: signatures.map(sig => ({
        Signer: {
          Account: sig.signer,
          SigningPubKey: sig.publicKey,
          TxnSignature: sig.signature
        }
      }))
    };
    
    return finalTx;
  }
  
  /**
   * Get multi-sig account information
   */
  async getMultiSigAccount(address: string): Promise<RippleMultiSigAccount | null> {
    const { data, error } = await supabase
      .from('ripple_multisig_accounts')
      .select('*')
      .eq('address', address)
      .eq('network_type', this.networkType)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      address: data.address,
      signerList: data.signer_list,
      regularKey: data.regular_key,
      masterKeyDisabled: data.master_key_disabled || false,
      sequence: data.sequence || 0
    };
  }
  
  /**
   * List all multi-sig accounts for a user
   */
  async listMultiSigAccounts(userAddresses: string[]): Promise<RippleMultiSigAccount[]> {
    const { data, error } = await supabase
      .from('ripple_multisig_accounts')
      .select('*')
      .contains('signers', userAddresses)
      .eq('network_type', this.networkType);
    
    if (error || !data) {
      return [];
    }
    
    return data.map(account => ({
      address: account.address,
      signerList: account.signer_list,
      regularKey: account.regular_key,
      masterKeyDisabled: account.master_key_disabled || false,
      sequence: account.sequence || 0
    }));
  }
  
  /**
   * Create a proposal for multi-sig signing
   */
  async createProposal(
    multiSigAccount: string,
    transaction: any,
    expiresIn: number = 24 // hours
  ): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresIn);
    
    const { data, error } = await supabase
      .from('ripple_multisig_proposals')
      .insert({
        account: multiSigAccount,
        transaction,
        network_type: this.networkType,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        signatures: [],
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create proposal: ${error?.message}`);
    }
    
    return data.id;
  }
  
  /**
   * Add signature to a proposal
   */
  async addSignatureToProposal(
    proposalId: string,
    signature: RippleMultiSigSignature
  ): Promise<boolean> {
    // Get current proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('ripple_multisig_proposals')
      .select('*')
      .eq('id', proposalId)
      .single();
    
    if (fetchError || !proposal) {
      throw new Error('Proposal not found');
    }
    
    // Check if expired
    if (new Date(proposal.expires_at) < new Date()) {
      throw new Error('Proposal has expired');
    }
    
    // Add signature if not already present
    const signatures = proposal.signatures || [];
    const existingSig = signatures.find((s: any) => s.signer === signature.signer);
    
    if (existingSig) {
      throw new Error('Signer has already signed this proposal');
    }
    
    signatures.push(signature);
    
    // Update proposal
    const { error: updateError } = await supabase
      .from('ripple_multisig_proposals')
      .update({
        signatures,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId);
    
    if (updateError) {
      throw new Error(`Failed to add signature: ${updateError.message}`);
    }
    
    // Check if proposal is ready
    const multiSigTx = await this.collectSignatures(proposal.transaction, signatures);
    
    if (multiSigTx.isReady) {
      // Update status to ready
      await supabase
        .from('ripple_multisig_proposals')
        .update({ status: 'ready' })
        .eq('id', proposalId);
    }
    
    return multiSigTx.isReady;
  }
  
  /**
   * Execute a fully-signed proposal
   */
  async executeProposal(proposalId: string): Promise<string> {
    // Get proposal
    const { data: proposal, error } = await supabase
      .from('ripple_multisig_proposals')
      .select('*')
      .eq('id', proposalId)
      .single();
    
    if (error || !proposal) {
      throw new Error('Proposal not found');
    }
    
    if (proposal.status !== 'ready') {
      throw new Error('Proposal is not ready for execution');
    }
    
    // Combine signatures
    const signedTx = await this.combineSignatures(
      proposal.transaction,
      proposal.signatures
    );
    
    // Broadcast transaction (would use RippleTransactionBuilder.broadcastTransaction)
    const result = await this.builder.broadcastTransaction({
      tx_blob: JSON.stringify(signedTx),
      hash: this.generateTransactionHash(signedTx),
      tx_json: signedTx
    });
    
    if (result.success) {
      // Update proposal status
      await supabase
        .from('ripple_multisig_proposals')
        .update({
          status: 'executed',
          execution_hash: result.hash,
          executed_at: new Date().toISOString()
        })
        .eq('id', proposalId);
      
      return result.hash!;
    } else {
      throw new Error(result.error || 'Transaction broadcast failed');
    }
  }
  
  /**
   * Cancel an expired or unwanted proposal
   */
  async cancelProposal(proposalId: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('ripple_multisig_proposals')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', proposalId);
    
    if (error) {
      throw new Error(`Failed to cancel proposal: ${error.message}`);
    }
  }
  
  /**
   * Get pending proposals for a signer
   */
  async getPendingProposals(signerAccount: string): Promise<any[]> {
    // Get all multi-sig accounts where user is a signer
    const accounts = await this.listMultiSigAccounts([signerAccount]);
    const accountAddresses = accounts.map(a => a.address);
    
    if (accountAddresses.length === 0) {
      return [];
    }
    
    // Get pending proposals for these accounts
    const { data, error } = await supabase
      .from('ripple_multisig_proposals')
      .select('*')
      .in('account', accountAddresses)
      .eq('status', 'pending')
      .eq('network_type', this.networkType)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (error || !data) {
      return [];
    }
    
    // Add signing status for the signer
    return data.map(proposal => ({
      ...proposal,
      hasSigned: (proposal.signatures || []).some(
        (sig: any) => sig.signer === signerAccount
      )
    }));
  }
  
  /**
   * Validate signer weight configuration
   */
  validateSignerConfiguration(
    signers: RippleSigner[],
    quorum: number
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check minimum signers
    if (signers.length < 1) {
      issues.push('At least one signer is required');
    }
    
    // Check maximum signers (XRPL limit)
    if (signers.length > 8) {
      issues.push('Maximum 8 signers allowed on XRP Ledger');
    }
    
    // Check for duplicate signers
    const uniqueSigners = new Set(signers.map(s => s.account));
    if (uniqueSigners.size < signers.length) {
      issues.push('Duplicate signer addresses detected');
    }
    
    // Check weights
    const totalWeight = signers.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight === 0) {
      issues.push('Total signer weight must be greater than 0');
    }
    
    // Check quorum
    if (quorum <= 0) {
      issues.push('Quorum must be greater than 0');
    }
    
    if (quorum > totalWeight) {
      issues.push(`Quorum (${quorum}) cannot exceed total weight (${totalWeight})`);
    }
    
    // Check if any single signer can meet quorum
    const maxWeight = Math.max(...signers.map(s => s.weight));
    if (maxWeight >= quorum) {
      issues.push('Warning: Single signer can meet quorum threshold');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  // Helper method
  private generateTransactionHash(tx: any): string {
    // Use secure random generation for transaction hash
    return generateSecureHash().slice(2).toUpperCase(); // Remove 0x prefix and uppercase for Ripple format
  }
}

// Export singleton instances
export const rippleMultiSigService = new RippleMultiSigService('mainnet');
export const rippleTestnetMultiSigService = new RippleMultiSigService('testnet');

// Default export
export default rippleMultiSigService;