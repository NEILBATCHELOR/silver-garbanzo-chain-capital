/**
 * Enhanced Token Manager
 * 
 * Comprehensive token management supporting all major token standards:
 * ERC-20, ERC-721, ERC-1155, ERC-1400, ERC-3525, ERC-4626
 * Plus native tokens for non-EVM chains (SPL, NEAR, Stellar assets, etc.)
 * 
 * UPDATED: Integrated with PolicyEngine for policy-compliant operations
 */

import type { IBlockchainAdapter, SupportedChain, NetworkType } from '../adapters/IBlockchainAdapter';
import { multiChainWalletManager } from '../managers/MultiChainWalletManager';
import { PolicyEngine } from '@/infrastructure/policy/PolicyEngine';
import type { 
  CryptoOperation, 
  PolicyContext, 
  PolicyEvaluationResult,
  UserContext,
  TokenContext,
  EnvironmentContext 
} from '@/infrastructure/policy/types';
import { supabase } from '@/infrastructure/database/client';
import { generateUUID } from '@/utils/shared/formatting/uuidUtils';
// BigNumber replaced with native bigint in ethers v6

// Token standard definitions
export type TokenStandard = 
  | 'ERC-20' | 'ERC-721' | 'ERC-1155' | 'ERC-1400' | 'ERC-3525' | 'ERC-4626'
  | 'SPL' | 'NEAR-FT' | 'NEAR-NFT' | 'STELLAR-ASSET' | 'SUI-COIN' | 'APTOS-COIN'
  | 'NATIVE';

export type TokenType = 'fungible' | 'non-fungible' | 'semi-fungible' | 'security' | 'yield-bearing';

// Base token interface
export interface BaseToken {
  id: string;
  contractAddress: string;
  chain: SupportedChain;
  networkType: NetworkType;
  standard: TokenStandard;
  type: TokenType;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: bigint;
  description?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Union type for all token types
export type AnyToken = 
  | ERC20Token 
  | ERC721Token 
  | ERC1155Token 
  | ERC1400Token 
  | ERC3525Token 
  | ERC4626Token 
  | SPLToken 
  | NEARToken;

// Transaction result from blockchain adapter
export interface TransactionResult {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: string;
  fee?: string;
  blockNumber?: number;
  blockHash?: string;
}

// ERC-20 Token
export interface ERC20Token extends BaseToken {
  standard: 'ERC-20';
  type: 'fungible';
  // ERC-20 specific properties
  allowances?: Record<string, bigint>; // owner -> spender -> amount
}

// ERC-721 NFT
export interface ERC721Token extends BaseToken {
  standard: 'ERC-721';
  type: 'non-fungible';
  // ERC-721 specific properties
  tokenURI?: string;
  owner?: string;
  approved?: string;
  tokenId: string;
}

// ERC-1155 Multi-token
export interface ERC1155Token extends BaseToken {
  standard: 'ERC-1155';
  type: 'semi-fungible';
  // ERC-1155 specific properties
  tokenIds: string[];
  balances: Record<string, bigint>; // tokenId -> balance
  uri?: string;
}

// ERC-1400 Security Token
export interface ERC1400Token extends BaseToken {
  standard: 'ERC-1400';
  type: 'security';
  // ERC-1400 specific properties
  partitions: string[];
  controllers: string[];
  defaultPartition: string;
  issuableByPartition: Record<string, boolean>;
  granularity: bigint;
  complianceRules?: {
    kycRequired: boolean;
    accreditationRequired: boolean;
    jurisdictionRestrictions: string[];
    transferRestrictions?: string[];
  };
}

// ERC-3525 Semi-Fungible Token
export interface ERC3525Token extends BaseToken {
  standard: 'ERC-3525';
  type: 'semi-fungible';
  // ERC-3525 specific properties
  slots: Array<{
    slotId: string;
    tokenIds: string[];
    metadata?: Record<string, any>;
  }>;
  valueDecimals: number;
  slotURI?: (slotId: string) => string;
}

// ERC-4626 Yield Vault Token
export interface ERC4626Token extends BaseToken {
  standard: 'ERC-4626';
  type: 'yield-bearing';
  // ERC-4626 specific properties
  asset: string; // Underlying asset
  totalAssets: bigint;
  exchangeRate: bigint;
  vaultMetadata?: {
    strategy: string;
    performanceFee: number;
    managementFee: number;
  };
}

// Native token types for non-EVM chains
export interface SPLToken extends BaseToken {
  standard: 'SPL';
  type: 'fungible';
  mintAuthority: string;
  freezeAuthority?: string;
  supply: bigint;
}

export interface NEARToken extends BaseToken {
  standard: 'NEAR-FT' | 'NEAR-NFT';
  type: 'fungible' | 'non-fungible';
  ownerId: string;
  spec: string; // e.g., 'ft-1.0.0' or 'nft-1.0.0'
  metadata?: Record<string, any>;
}

// Token deployment parameters
export interface TokenDeploymentParams {
  chain: SupportedChain;
  networkType: NetworkType;
  standard: TokenStandard;
  name: string;
  symbol: string;
  decimals?: number;
  totalSupply?: string;
  mintable?: boolean;
  burnable?: boolean;
  pausable?: boolean;
  ownerAddress: string;
  // Standard-specific parameters
  additionalParams?: Record<string, any>;
}

export interface TokenTransferParams {
  from: string;
  to: string;
  amount: string;
  tokenId?: string; // For NFTs
  data?: string;
}

export interface TokenMintParams {
  to: string;
  amount: string;
  tokenId?: string; // For NFTs
  metadata?: Record<string, any>;
}

export interface TokenBurnParams {
  from: string;
  amount: string;
  tokenId?: string; // For NFTs
}

export interface TokenLockParams {
  from: string;
  amount: string;
  duration: number; // seconds
  reason?: string;
}

export interface TokenOperationResult {
  txHash: string;
  tokenAddress?: string;
  tokenId?: string;
  operationId?: string;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: string;
  fee?: string;
  policyValidation?: PolicyEvaluationResult;
}

// Policy violation error
export class PolicyViolationError extends Error {
  constructor(
    public violations: any[],
    public operation: CryptoOperation
  ) {
    super(`Policy violation: ${violations[0]?.description || 'Operation not allowed'}`);
    this.name = 'PolicyViolationError';
  }
}

/**
 * Enhanced Token Manager class with Policy Integration
 */
export class EnhancedTokenManager {
  private tokenRegistry = new Map<string, AnyToken>();
  private policyEngine: PolicyEngine;
  
  constructor() {
    this.policyEngine = new PolicyEngine({
      cacheEnabled: true,
      cacheTTL: 300,
      evaluationTimeout: 5000
    });
  }

  /**
   * Mint new tokens (with policy validation)
   */
  async mint(
    tokenAddress: string,
    params: TokenMintParams,
    chain: SupportedChain,
    networkType: NetworkType = 'mainnet'
  ): Promise<TokenOperationResult> {
    const operationId = generateUUID();
    
    // Build policy context
    const context = await this.buildPolicyContext(
      'mint',
      tokenAddress,
      chain,
      networkType,
      {
        to: params.to,
        amount: params.amount,
        tokenId: params.tokenId,
        metadata: params.metadata
      }
    );

    // Evaluate policies
    const policyResult = await this.policyEngine.evaluateOperation(
      context.operation,
      context
    );

    if (!policyResult.allowed) {
      throw new PolicyViolationError(policyResult.violations, context.operation);
    }

    // Get wallet connection
    const connection = await this.getWalletConnection(chain, networkType);
    
    // Execute mint operation
    const result = await this.executeMintOperation(
      connection.adapter,
      tokenAddress,
      params
    );

    // Log operation
    await this.logOperation(operationId, 'mint', tokenAddress, params, result, policyResult);

    return {
      ...result,
      operationId,
      policyValidation: policyResult
    };
  }

  /**
   * Burn tokens (with policy validation)
   */
  async burn(
    tokenAddress: string,
    params: TokenBurnParams,
    chain: SupportedChain,
    networkType: NetworkType = 'mainnet'
  ): Promise<TokenOperationResult> {
    const operationId = generateUUID();
    
    // Build policy context
    const context = await this.buildPolicyContext(
      'burn',
      tokenAddress,
      chain,
      networkType,
      {
        from: params.from,
        amount: params.amount,
        tokenId: params.tokenId
      }
    );

    // Evaluate policies
    const policyResult = await this.policyEngine.evaluateOperation(
      context.operation,
      context
    );

    if (!policyResult.allowed) {
      throw new PolicyViolationError(policyResult.violations, context.operation);
    }

    // Get wallet connection
    const connection = await this.getWalletConnection(chain, networkType);
    
    // Execute burn operation
    const result = await this.executeBurnOperation(
      connection.adapter,
      tokenAddress,
      params
    );

    // Log operation
    await this.logOperation(operationId, 'burn', tokenAddress, params, result, policyResult);

    return {
      ...result,
      operationId,
      policyValidation: policyResult
    };
  }

  /**
   * Lock tokens (with policy validation)
   */
  async lock(
    tokenAddress: string,
    params: TokenLockParams,
    chain: SupportedChain,
    networkType: NetworkType = 'mainnet'
  ): Promise<TokenOperationResult> {
    const operationId = generateUUID();
    
    // Build policy context
    const context = await this.buildPolicyContext(
      'lock',
      tokenAddress,
      chain,
      networkType,
      {
        from: params.from,
        amount: params.amount,
        lockDuration: params.duration,
        lockReason: params.reason
      }
    );

    // Evaluate policies
    const policyResult = await this.policyEngine.evaluateOperation(
      context.operation,
      context
    );

    if (!policyResult.allowed) {
      throw new PolicyViolationError(policyResult.violations, context.operation);
    }

    // Get wallet connection
    const connection = await this.getWalletConnection(chain, networkType);
    
    // Execute lock operation
    const result = await this.executeLockOperation(
      connection.adapter,
      tokenAddress,
      params
    );

    // Log operation with unlock time
    const unlockTime = new Date(Date.now() + params.duration * 1000).toISOString();
    await this.logOperation(
      operationId, 
      'lock', 
      tokenAddress, 
      { ...params, unlockTime }, 
      result, 
      policyResult
    );

    return {
      ...result,
      operationId,
      policyValidation: policyResult
    };
  }

  /**
   * Unlock tokens (with policy validation)
   */
  async unlock(
    tokenAddress: string,
    lockId: string,
    amount: string,
    chain: SupportedChain,
    networkType: NetworkType = 'mainnet'
  ): Promise<TokenOperationResult> {
    const operationId = generateUUID();
    
    // Get lock details
    const lockDetails = await this.getLockDetails(lockId);
    if (!lockDetails) {
      throw new Error(`Lock not found: ${lockId}`);
    }

    // Build policy context
    const context = await this.buildPolicyContext(
      'unlock',
      tokenAddress,
      chain,
      networkType,
      {
        from: lockDetails.operator,
        amount,
        tokenId: lockId,
        metadata: { lockId }
      }
    );

    // Evaluate policies
    const policyResult = await this.policyEngine.evaluateOperation(
      context.operation,
      context
    );

    if (!policyResult.allowed) {
      throw new PolicyViolationError(policyResult.violations, context.operation);
    }

    // Get wallet connection
    const connection = await this.getWalletConnection(chain, networkType);
    
    // Execute unlock operation
    const result = await this.executeUnlockOperation(
      connection.adapter,
      tokenAddress,
      lockId,
      amount
    );

    // Log operation
    await this.logOperation(operationId, 'unlock', tokenAddress, { lockId, amount }, result, policyResult);

    return {
      ...result,
      operationId,
      policyValidation: policyResult
    };
  }

  /**
   * Block account (freeze assets) with policy validation
   */
  async blockAccount(
    tokenAddress: string,
    account: string,
    reason: string,
    chain: SupportedChain,
    networkType: NetworkType = 'mainnet',
    duration?: number
  ): Promise<TokenOperationResult> {
    const operationId = generateUUID();
    
    // Build policy context
    const context = await this.buildPolicyContext(
      'block',
      tokenAddress,
      chain,
      networkType,
      {
        from: account,
        lockReason: reason,
        lockDuration: duration
      }
    );

    // Evaluate policies
    const policyResult = await this.policyEngine.evaluateOperation(
      context.operation,
      context
    );

    if (!policyResult.allowed) {
      throw new PolicyViolationError(policyResult.violations, context.operation);
    }

    // Get wallet connection
    const connection = await this.getWalletConnection(chain, networkType);
    
    // Execute block operation
    const result = await this.executeBlockOperation(
      connection.adapter,
      tokenAddress,
      account,
      reason,
      duration
    );

    // Log operation
    await this.logOperation(
      operationId, 
      'block', 
      tokenAddress, 
      { account, reason, duration }, 
      result, 
      policyResult
    );

    return {
      ...result,
      operationId,
      policyValidation: policyResult
    };
  }

  /**
   * Unblock account (unfreeze assets) with policy validation
   */
  async unblockAccount(
    tokenAddress: string,
    account: string,
    reason: string,
    chain: SupportedChain,
    networkType: NetworkType = 'mainnet'
  ): Promise<TokenOperationResult> {
    const operationId = generateUUID();
    
    // Build policy context
    const context = await this.buildPolicyContext(
      'unblock',
      tokenAddress,
      chain,
      networkType,
      {
        from: account,
        lockReason: reason
      }
    );

    // Evaluate policies
    const policyResult = await this.policyEngine.evaluateOperation(
      context.operation,
      context
    );

    if (!policyResult.allowed) {
      throw new PolicyViolationError(policyResult.violations, context.operation);
    }

    // Get wallet connection
    const connection = await this.getWalletConnection(chain, networkType);
    
    // Execute unblock operation
    const result = await this.executeUnblockOperation(
      connection.adapter,
      tokenAddress,
      account,
      reason
    );

    // Log operation
    await this.logOperation(
      operationId, 
      'unblock', 
      tokenAddress, 
      { account, reason }, 
      result, 
      policyResult
    );

    return {
      ...result,
      operationId,
      policyValidation: policyResult
    };
  }

  /**
   * Transfer tokens (existing method - updated with policy validation)
   */
  async transferTokens(
    tokenAddress: string,
    params: TokenTransferParams,
    chain: SupportedChain,
    networkType: NetworkType = 'mainnet'
  ): Promise<TokenOperationResult> {
    const operationId = generateUUID();
    
    // Build policy context
    const context = await this.buildPolicyContext(
      'transfer',
      tokenAddress,
      chain,
      networkType,
      {
        from: params.from,
        to: params.to,
        amount: params.amount,
        tokenId: params.tokenId,
        metadata: { data: params.data }
      }
    );

    // Evaluate policies
    const policyResult = await this.policyEngine.evaluateOperation(
      context.operation,
      context
    );

    if (!policyResult.allowed) {
      throw new PolicyViolationError(policyResult.violations, context.operation);
    }

    const token = this.tokenRegistry.get(`${chain}-${networkType}-${tokenAddress}`);
    if (!token) {
      throw new Error(`Token not found: ${tokenAddress} on ${chain}`);
    }

    // Get wallet connection
    const connection = await this.getWalletConnection(chain, networkType);
    
    // Handle transfer based on token standard
    const result = await this.executeTokenTransfer(connection.adapter, token, params);

    // Log operation
    await this.logOperation(operationId, 'transfer', tokenAddress, params, result, policyResult);

    return {
      ...result,
      operationId,
      policyValidation: policyResult
    };
  }

  /**
   * Execute token transfer based on token standard
   * @private
   */
  private async executeTokenTransfer(
    adapter: IBlockchainAdapter,
    token: AnyToken,
    params: TokenTransferParams
  ): Promise<TransactionResult> {
    // Handle based on token standard
    switch (token.standard) {
      case 'ERC-20':
      case 'SPL':
      case 'NEAR-FT':
        // Fungible token transfer
        return await adapter.sendTransaction({
          to: token.contractAddress,
          amount: '0', // Gas only, actual transfer is in data
          data: this.encodeTransferData(token.standard, params)
        });

      case 'ERC-721':
      case 'NEAR-NFT':
        // NFT transfer
        if (!params.tokenId) {
          throw new Error('Token ID required for NFT transfer');
        }
        return await adapter.sendTransaction({
          to: token.contractAddress,
          amount: '0',
          data: this.encodeNFTTransferData(token.standard, params)
        });

      case 'ERC-1155':
        // Multi-token transfer
        return await adapter.sendTransaction({
          to: token.contractAddress,
          amount: '0',
          data: this.encodeMultiTokenTransferData(params)
        });

      case 'ERC-1400':
        // Security token transfer (with compliance)
        return await adapter.sendTransaction({
          to: token.contractAddress,
          amount: '0',
          data: this.encodeSecurityTokenTransferData(params)
        });

      default:
        throw new Error(`Unsupported token standard: ${token.standard}`);
    }
  }

  /**
   * Get token information
   * @private
   */
  private async getTokenInfo(
    tokenAddress: string,
    chain: SupportedChain,
    networkType: NetworkType
  ): Promise<AnyToken | null> {
    // Check registry first
    const registryKey = `${chain}-${networkType}-${tokenAddress}`;
    const cachedToken = this.tokenRegistry.get(registryKey);
    
    if (cachedToken) {
      return cachedToken;
    }

    // Query database for token info
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('address', tokenAddress)
        .eq('chain_id', chain)
        .eq('network_type', networkType)
        .single();

      if (error || !data) {
        return null;
      }

      // Convert to token object based on standard
      const baseTokenData = {
        id: data.id,
        contractAddress: tokenAddress,
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        standard: data.standard as TokenStandard,
        type: data.token_type as TokenType,
        chain,
        networkType,
        totalSupply: BigInt(data.total_supply || 0),
        metadata: data.metadata as Record<string, any>,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      // Build specific token type based on standard
      let token: AnyToken;
      
      switch (data.standard as TokenStandard) {
        case 'ERC-20':
          token = {
            ...baseTokenData,
            standard: 'ERC-20',
            type: 'fungible',
            allowances: data.allowances || {}
          } as ERC20Token;
          break;
          
        case 'ERC-721':
          token = {
            ...baseTokenData,
            standard: 'ERC-721',
            type: 'non-fungible',
            tokenId: data.token_id || '',
            tokenURI: data.token_uri,
            owner: data.owner,
            approved: data.approved
          } as ERC721Token;
          break;
          
        case 'ERC-1155':
          token = {
            ...baseTokenData,
            standard: 'ERC-1155',
            type: 'semi-fungible',
            tokenIds: data.token_ids || [],
            balances: data.balances || {},
            uri: data.uri
          } as ERC1155Token;
          break;
          
        case 'ERC-1400':
          token = {
            ...baseTokenData,
            standard: 'ERC-1400',
            type: 'security',
            partitions: data.partitions || [],
            controllers: data.controllers || [],
            defaultPartition: data.default_partition || '',
            issuableByPartition: data.issuable_by_partition || {},
            granularity: BigInt(data.granularity || 1),
            complianceRules: data.compliance_rules
          } as ERC1400Token;
          break;
          
        case 'ERC-3525':
          token = {
            ...baseTokenData,
            standard: 'ERC-3525',
            type: 'semi-fungible',
            slots: data.slots || [],
            valueDecimals: data.value_decimals || 0,
            slotURI: data.slot_uri
          } as ERC3525Token;
          break;
          
        case 'ERC-4626':
          token = {
            ...baseTokenData,
            standard: 'ERC-4626',
            type: 'yield-bearing',
            asset: data.asset || '',
            totalAssets: BigInt(data.total_assets || 0),
            exchangeRate: BigInt(data.exchange_rate || 0),
            vaultMetadata: data.vault_metadata
          } as ERC4626Token;
          break;
          
        case 'SPL':
          token = {
            ...baseTokenData,
            standard: 'SPL',
            type: 'fungible',
            mintAuthority: data.mint_authority || '',
            freezeAuthority: data.freeze_authority,
            supply: BigInt(data.supply || 0)
          } as SPLToken;
          break;
          
        case 'NEAR-FT':
        case 'NEAR-NFT':
          token = {
            ...baseTokenData,
            standard: data.standard as 'NEAR-FT' | 'NEAR-NFT',
            type: data.standard === 'NEAR-FT' ? 'fungible' : 'non-fungible',
            ownerId: data.owner_id || '',
            spec: data.spec || ''
          } as NEARToken;
          break;
          
        default:
          // Fallback to ERC-20 structure for unknown standards
          token = {
            ...baseTokenData,
            standard: 'ERC-20',
            type: 'fungible'
          } as ERC20Token;
      }

      // Cache it
      this.tokenRegistry.set(registryKey, token);

      return token;
    } catch (error) {
      console.error('Error fetching token info:', error);
      return null;
    }
  }

  /**
   * Encode transfer data for different token standards
   * @private
   */
  private encodeTransferData(standard: string, params: TokenTransferParams): string {
    // This would use web3 ABI encoding in a real implementation
    // Simplified for now
    return `transfer(${params.to},${params.amount})`;
  }

  private encodeNFTTransferData(standard: string, params: TokenTransferParams): string {
    return `transferFrom(${params.from},${params.to},${params.tokenId})`;
  }

  private encodeMultiTokenTransferData(params: TokenTransferParams): string {
    return `safeTransferFrom(${params.from},${params.to},${params.tokenId},${params.amount},${params.data || '0x'})`;
  }

  private encodeSecurityTokenTransferData(params: TokenTransferParams): string {
    return `transferWithData(${params.to},${params.amount},${params.data || '0x'})`;
  }

  /**
   * Build policy context for an operation
   */
  private async buildPolicyContext(
    operationType: string,
    tokenAddress: string,
    chain: SupportedChain,
    networkType: NetworkType,
    operationData: any
  ): Promise<PolicyContext> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get token info
    const token = await this.getTokenInfo(tokenAddress, chain, networkType);
    if (!token) {
      throw new Error(`Token not found: ${tokenAddress}`);
    }

    // Build contexts
    const userContext: UserContext = {
      id: user?.id || '',
      address: operationData.from || operationData.to || '',
      role: user?.user_metadata?.role,
      permissions: user?.user_metadata?.permissions || [],
      kycStatus: user?.user_metadata?.kycStatus,
      jurisdiction: user?.user_metadata?.jurisdiction
    };

    const tokenContext: TokenContext = {
      id: token.id,
      address: token.contractAddress,
      name: token.name,
      symbol: token.symbol,
      standard: token.standard,
      chainId: chain,
      totalSupply: token.totalSupply?.toString(),
      decimals: token.decimals
    };

    const environmentContext: EnvironmentContext = {
      chainId: chain,
      network: networkType,
      timestamp: Date.now()
    };

    const operation: CryptoOperation = {
      type: operationType as any,
      ...operationData,
      tokenAddress,
      chainId: chain
    };

    return {
      operation,
      user: userContext,
      token: tokenContext,
      environment: environmentContext
    };
  }

  /**
   * Get wallet connection for a chain
   */
  private async getWalletConnection(
    chain: SupportedChain,
    networkType: NetworkType
  ): Promise<any> {
    const walletConnections = multiChainWalletManager.getWalletConnections('default'); // TODO: Use actual wallet ID
    const connection = walletConnections.find(
      conn => conn.chain === chain && conn.networkType === networkType
    );
    
    if (!connection) {
      throw new Error(`No wallet connection found for ${chain} ${networkType}`);
    }

    return connection;
  }

  /**
   * Get lock details from database
   */
  private async getLockDetails(lockId: string): Promise<any> {
    const { data } = await supabase
      .from('token_operations')
      .select('*')
      .eq('id', lockId)
      .eq('operation_type', 'lock')
      .single();

    return data;
  }

  /**
   * Log operation to database
   */
  private async logOperation(
    operationId: string,
    operationType: string,
    tokenAddress: string,
    params: any,
    result: TokenOperationResult,
    policyResult: PolicyEvaluationResult
  ): Promise<void> {
    const { error } = await supabase
      .from('token_operations')
      .insert({
        id: operationId,
        token_id: tokenAddress,
        operation_type: operationType,
        operator: params.from || params.to || params.account,
        amount: params.amount?.toString(),
        recipient: params.to,
        sender: params.from,
        lock_duration: params.duration,
        lock_reason: params.reason,
        unlock_time: params.unlockTime,
        transaction_hash: result.txHash,
        status: result.status,
        timestamp: new Date().toISOString(),
        blocks: {
          gasUsed: result.gasUsed,
          fee: result.fee
        }
      });

    if (error) {
      console.error('Failed to log operation:', error);
    }

    // Log policy validation
    const { error: validationError } = await supabase
      .from('operation_validations')
      .insert({
        operation_id: operationId,
        policy_id: policyResult.policies[0]?.policyId,
        rule_evaluations: policyResult.policies,
        validation_status: policyResult.allowed ? 'approved' : 'rejected',
        rejection_reasons: policyResult.violations.map(v => v.description),
        validated_by: (await supabase.auth.getUser()).data.user?.id,
        validated_at: new Date().toISOString()
      });

    if (validationError) {
      console.error('Failed to log validation:', validationError);
    }
  }

  // Execution methods (stubs for now - would implement actual blockchain calls)
  private async executeMintOperation(
    adapter: IBlockchainAdapter,
    tokenAddress: string,
    params: TokenMintParams
  ): Promise<TokenOperationResult> {
    // Implementation would vary by token standard
    throw new Error(`Mint operation not yet implemented`);
  }

  private async executeBurnOperation(
    adapter: IBlockchainAdapter,
    tokenAddress: string,
    params: TokenBurnParams
  ): Promise<TokenOperationResult> {
    throw new Error(`Burn operation not yet implemented`);
  }

  private async executeLockOperation(
    adapter: IBlockchainAdapter,
    tokenAddress: string,
    params: TokenLockParams
  ): Promise<TokenOperationResult> {
    throw new Error(`Lock operation not yet implemented`);
  }

  private async executeUnlockOperation(
    adapter: IBlockchainAdapter,
    tokenAddress: string,
    lockId: string,
    amount: string
  ): Promise<TokenOperationResult> {
    throw new Error(`Unlock operation not yet implemented`);
  }

  private async executeBlockOperation(
    adapter: IBlockchainAdapter,
    tokenAddress: string,
    account: string,
    reason: string,
    duration?: number
  ): Promise<TokenOperationResult> {
    throw new Error(`Block operation not yet implemented`);
  }

  private async executeUnblockOperation(
    adapter: IBlockchainAdapter,
    tokenAddress: string,
    account: string,
    reason: string
  ): Promise<TokenOperationResult> {
    throw new Error(`Unblock operation not yet implemented`);
  }

  /**
   * Pause token operations (with policy validation)
   */
  async pause(
    tokenAddress: string,
    params: { reason?: string; metadata?: Record<string, any> },
    chain: SupportedChain,
    networkType: NetworkType = 'mainnet'
  ): Promise<TokenOperationResult> {
    const operationId = generateUUID();
    
    // Build policy context
    const context = await this.buildPolicyContext(
      'pause',
      tokenAddress,
      chain,
      networkType,
      {
        lockReason: params.reason,
        metadata: params.metadata
      }
    );

    // Evaluate policies
    const policyResult = await this.policyEngine.evaluateOperation(
      context.operation,
      context
    );

    if (!policyResult.allowed) {
      throw new PolicyViolationError(policyResult.violations, context.operation);
    }

    // Get wallet connection
    const connection = await this.getWalletConnection(chain, networkType);
    
    // Execute pause operation
    const result = await this.executePauseOperation(
      connection.adapter,
      tokenAddress,
      params.reason
    );

    // Log operation
    await this.logOperation(
      operationId, 
      'pause', 
      tokenAddress, 
      { reason: params.reason }, 
      result, 
      policyResult
    );

    return {
      ...result,
      operationId,
      policyValidation: policyResult
    };
  }

  /**
   * Unpause token operations (with policy validation)
   */
  async unpause(
    tokenAddress: string,
    params: { reason?: string; metadata?: Record<string, any> },
    chain: SupportedChain,
    networkType: NetworkType = 'mainnet'
  ): Promise<TokenOperationResult> {
    const operationId = generateUUID();
    
    // Build policy context
    const context = await this.buildPolicyContext(
      'unpause',
      tokenAddress,
      chain,
      networkType,
      {
        lockReason: params.reason,
        metadata: params.metadata
      }
    );

    // Evaluate policies
    const policyResult = await this.policyEngine.evaluateOperation(
      context.operation,
      context
    );

    if (!policyResult.allowed) {
      throw new PolicyViolationError(policyResult.violations, context.operation);
    }

    // Get wallet connection
    const connection = await this.getWalletConnection(chain, networkType);
    
    // Execute unpause operation
    const result = await this.executeUnpauseOperation(
      connection.adapter,
      tokenAddress,
      params.reason
    );

    // Log operation
    await this.logOperation(
      operationId, 
      'unpause', 
      tokenAddress, 
      { reason: params.reason }, 
      result, 
      policyResult
    );

    return {
      ...result,
      operationId,
      policyValidation: policyResult
    };
  }

  private async executePauseOperation(
    adapter: IBlockchainAdapter,
    tokenAddress: string,
    reason?: string
  ): Promise<TokenOperationResult> {
    throw new Error(`Pause operation not yet implemented`);
  }

  private async executeUnpauseOperation(
    adapter: IBlockchainAdapter,
    tokenAddress: string,
    reason?: string
  ): Promise<TokenOperationResult> {
    throw new Error(`Unpause operation not yet implemented`);
  }
}