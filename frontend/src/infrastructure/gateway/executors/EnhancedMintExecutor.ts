/**
 * Enhanced Mint Executor
 * Combines Gateway policy validation + Foundry on-chain validation + Service nonce management
 * 
 * Architecture:
 * 1. Gateway validates policies off-chain (already done before this executes)
 * 2. NonceManager prevents nonce conflicts
 * 3. Foundry validates on-chain via PolicyEngine.sol (optional)
 * 4. TokenMintingService executes with full diagnostics
 */

import type { OperationExecutor, OperationRequest, TransactionResult, GasEstimate } from '../types';
import { tokenMintingService } from '@/services/wallet/TokenMintingService';
import { nonceManager } from '@/services/wallet/NonceManager';
import { FoundryOperationExecutor, type FoundryExecutorConfig } from '@/infrastructure/foundry/FoundryOperationExecutor';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { getChainId } from '@/infrastructure/web3/utils/chainIds';
import { ethers } from 'ethers';

export interface EnhancedMintExecutorConfig {
  /**
   * Enable Foundry on-chain policy validation
   * If true, validates via PolicyEngine.sol before execution
   */
  enableFoundryValidation?: boolean;
  
  /**
   * Foundry executor configuration (required if enableFoundryValidation is true)
   */
  foundryConfig?: FoundryExecutorConfig;
  
  /**
   * Wallet service configuration
   */
  walletConfig?: {
    walletId: string;
    walletType: 'project' | 'user';
  };
}

export class EnhancedMintExecutor implements OperationExecutor {
  private config: EnhancedMintExecutorConfig;
  private foundryExecutor?: FoundryOperationExecutor;

  constructor(config: EnhancedMintExecutorConfig = {}) {
    this.config = config;
    
    // Initialize Foundry executor if enabled
    if (config.enableFoundryValidation && config.foundryConfig) {
      this.foundryExecutor = new FoundryOperationExecutor(config.foundryConfig);
    }
  }

  /**
   * Execute mint with triple-layer security:
   * Layer 1: Off-chain policy validation (Gateway - already done)
   * Layer 2: On-chain policy validation (Foundry - optional)
   * Layer 3: Nonce management (Service - always active)
   */
  async execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    try {
      // 1. Validate request parameters
      if (!request.parameters.to) {
        throw new Error('Recipient address required for mint operation');
      }

      // 2. Get chain ID
      const chainId = getChainId(request.chain);

      // 3. Get wallet info (use from request or config)
      const walletId = request.parameters.from || this.config.walletConfig?.walletId;
      const walletType = this.config.walletConfig?.walletType || 'project';

      if (!walletId) {
        throw new Error('Wallet ID required for mint operation');
      }

      // 4. Check for nonce gaps
      const rpcConfig = rpcManager.getProviderConfig(request.chain, 'testnet');
      if (rpcConfig) {
        const provider = new ethers.JsonRpcProvider(rpcConfig.url);
        const nonceStatus = await nonceManager.getNonceStatus(walletId, provider);
        
        if (nonceStatus.hasGap) {
          console.warn(`⚠️ Nonce gap detected: ${nonceStatus.gapSize} pending transactions`);
          // Don't throw - let operation proceed but log warning
        }
      }

      // 5. OPTIONAL: Foundry on-chain policy pre-check
      if (this.config.enableFoundryValidation && this.foundryExecutor) {
        console.log('🔒 Performing Foundry on-chain policy validation...');
        
        const operator = walletId; // Assuming walletId is address or can be resolved
        const preCheck = await this.foundryExecutor.getPolicyAdapter().canOperate(
          request.tokenAddress,
          operator,
          {
            type: 'mint',
            amount: request.parameters.amount,
            to: request.parameters.to,
            metadata: request.metadata
          }
        );

        if (!preCheck.approved) {
          throw new Error(`Foundry on-chain policy check failed: ${preCheck.reason}`);
        }
        
        console.log('✅ Foundry on-chain policy check passed');
      }

      // 6. Execute mint with TokenMintingService (full nonce management)
      console.log('🚀 Executing mint with nonce management...');
      
      const result = await tokenMintingService.executeMint({
        contractAddress: request.tokenAddress,
        toAddress: request.parameters.to,
        amount: request.parameters.amount?.toString() || '0',
        decimals: 18, // TODO: Get from token metadata
        chainId,
        walletId,
        walletType,
        maxFeePerGas: gasEstimate.price?.toString(),
        maxPriorityFeePerGas: gasEstimate.price?.toString()
      });

      if (!result.success) {
        throw new Error(result.error || 'Mint failed');
      }

      console.log('✅ Mint successful:', result.transactionHash);

      // 7. Map to TransactionResult format for Gateway
      return {
        hash: result.transactionHash!,
        blockNumber: result.diagnostics?.rpcVerification?.blockNumber || 0,
        status: 'success',
        timestamp: Date.now(),
        gasUsed: result.diagnostics?.gasEstimate?.gasLimit 
          ? BigInt(result.diagnostics.gasEstimate.gasLimit) 
          : undefined,
        confirmations: 1,
        metadata: {
          operation: 'mint',
          recipient: request.parameters.to,
          amount: request.parameters.amount,
          tokenAddress: request.tokenAddress,
          nonce: result.diagnostics?.nonce, // CRITICAL: Track nonce
          foundryValidated: this.config.enableFoundryValidation || false
        }
      };

    } catch (error: any) {
      console.error('❌ Enhanced mint executor failed:', error);
      
      return {
        hash: '',
        blockNumber: 0,
        status: 'failed',
        timestamp: Date.now(),
        metadata: {
          error: error.message,
          foundryValidated: this.config.enableFoundryValidation || false
        }
      };
    }
  }
}
