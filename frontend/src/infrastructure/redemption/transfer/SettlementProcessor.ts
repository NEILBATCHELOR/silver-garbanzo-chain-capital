/**
 * Stage 11: Settlement Processor
 * Manages USDC/USDT settlement payments back to investors
 */

import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/audit';
import type {
  SettlementOperation,
  SettlementResult,
  ApprovedRedemption,
  TransferOperation,
  SettlementCurrency,
  SettlementConfig
} from './types';

const STABLECOIN_ADDRESSES: Record<SettlementCurrency, Record<number, string>> = {
  'USDC': {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum Mainnet
    11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia
    137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' // Polygon
  },
  'USDT': {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum Mainnet
    11155111: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia (example)
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' // Polygon
  }
};

export class SettlementProcessor {
  private config: SettlementConfig;

  constructor(config?: Partial<SettlementConfig>) {
    this.config = {
      mode: config?.mode || 'manual',
      delay: config?.delay || 0,
      batchingEnabled: config?.batchingEnabled || false,
      maxBatchSize: config?.maxBatchSize || 10,
      priorityFee: config?.priorityFee || '2',
      slippageTolerance: config?.slippageTolerance || 0.001
    };
  }

  /**
   * Process settlement for an approved redemption
   */
  async processSettlement(
    redemption: ApprovedRedemption,
    tokenTransfer: TransferOperation
  ): Promise<SettlementResult> {
    const settlementId = crypto.randomUUID();

    try {
      // 1. Calculate settlement amount
      const settlementAmount = this.calculateSettlementAmount(
        redemption.amount,
        redemption.exchangeRate
      );

      // 2. Check project wallet balance
      await this.checkProjectBalance(
        redemption.projectWallet,
        settlementAmount,
        redemption.targetCurrency,
        redemption.chainId
      );

      // 3. Create settlement operation
      const settlement = await this.createSettlementOperation(
        settlementId,
        redemption,
        tokenTransfer.id,
        settlementAmount
      );

      // 4. Optional delay
      if (this.config.delay && this.config.delay > 0) {
        await this.sleep(this.config.delay * 1000);
      }

      // 5. Execute settlement transfer
      const transferResult = await this.executeSettlementTransfer(settlement, redemption);

      if (!transferResult.success) {
        throw new Error(transferResult.error || 'Settlement transfer failed');
      }

      // 6. Update settlement record
      await this.updateSettlementOperation(settlement.id, {
        transactionHash: transferResult.transactionHash,
        status: 'confirming'
      });

      // 7. Log successful settlement initiation
      await logActivity({
        action: 'redemption_settlement_initiated',
        entity_id: settlementId,
        entity_type: 'settlement_operation',
        status: 'success',
        details: {
          redemptionId: redemption.id,
          transactionHash: transferResult.transactionHash,
          amount: settlementAmount,
          currency: redemption.targetCurrency,
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        settlementId,
        transactionHash: transferResult.transactionHash,
        amount: settlementAmount,
        currency: redemption.targetCurrency,
        status: 'confirming'
      };
    } catch (error) {
      const err = error as Error;
      await this.handleSettlementError(settlementId, err.message);

      return {
        success: false,
        settlementId,
        amount: '0',
        currency: redemption.targetCurrency,
        error: {
          code: 'SETTLEMENT_FAILED',
          message: err.message
        }
      };
    }
  }

  /**
   * Calculate settlement amount based on exchange rate
   */
  private calculateSettlementAmount(tokenAmount: string, exchangeRate: string): string {
    const tokens = parseFloat(tokenAmount);
    const rate = parseFloat(exchangeRate);
    return (tokens * rate).toFixed(6);
  }

  /**
   * Check if project wallet has sufficient balance
   */
  private async checkProjectBalance(
    projectWallet: string,
    requiredAmount: string,
    currency: SettlementCurrency,
    chainId: number
  ): Promise<void> {
    const { ethers } = await import('ethers');
    const { rpcManager } = await import('@/infrastructure/web3/rpc/RPCConnectionManager');
    const { getChainInfo } = await import('@/infrastructure/web3/utils/chainIds');
    
    const stablecoinAddress = STABLECOIN_ADDRESSES[currency][chainId];
    
    if (!stablecoinAddress) {
      throw new Error(`${currency} not supported on chain ${chainId}`);
    }

    // Get RPC URL with fallback support
    const chainInfo = getChainInfo(chainId);
    const networkType = chainInfo?.type === 'testnet' ? 'testnet' : 'mainnet';
    const rpcUrl = await rpcManager.getRPCUrlWithFallback(chainId, networkType);
    
    if (!rpcUrl) {
      throw new Error(`No RPC available for chain ${chainId}`);
    }

    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl, {
      chainId,
      name: chainInfo?.name || `Chain ${chainId}`
    });

    // Create contract instance
    const erc20ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ];
    
    const contract = new ethers.Contract(stablecoinAddress, erc20ABI, provider);
    
    // Check balance
    const balance = await contract.balanceOf(projectWallet);
    const decimals = currency === 'USDC' || currency === 'USDT' ? 6 : 18;
    const requiredWei = ethers.parseUnits(requiredAmount, decimals);
    
    if (balance < requiredWei) {
      const balanceFormatted = ethers.formatUnits(balance, decimals);
      throw new Error(
        `Insufficient ${currency} balance. Required: ${requiredAmount}, Available: ${balanceFormatted}`
      );
    }
  }

  /**
   * Create settlement operation in database
   */
  private async createSettlementOperation(
    id: string,
    redemption: ApprovedRedemption,
    tokenTransferId: string,
    amount: string
  ): Promise<SettlementOperation> {
    const operation: SettlementOperation = {
      id,
      redemptionId: redemption.id,
      tokenTransferId,
      type: 'stablecoin_settlement',
      currency: redemption.targetCurrency,
      amount,
      fromWallet: redemption.projectWallet,
      toWallet: redemption.investorWallet,
      status: 'pending',
      confirmations: 0,
      chainId: redemption.chainId,
      createdAt: new Date()
    };

    const { error } = await supabase
      .from('settlement_operations')
      .insert({
        id: operation.id,
        redemption_id: operation.redemptionId,
        token_transfer_id: operation.tokenTransferId,
        type: operation.type,
        currency: operation.currency,
        amount: operation.amount,
        from_wallet: operation.fromWallet,
        to_wallet: operation.toWallet,
        status: operation.status,
        confirmations: operation.confirmations,
        chain_id: operation.chainId
      });

    if (error) {
      throw new Error(`Failed to create settlement operation: ${error.message}`);
    }

    return operation;
  }

  /**
   * Execute settlement transfer
   */
  private async executeSettlementTransfer(
    settlement: SettlementOperation,
    redemption: ApprovedRedemption
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      const { ethers } = await import('ethers');
      const { rpcManager } = await import('@/infrastructure/web3/rpc/RPCConnectionManager');
      const { getChainInfo } = await import('@/infrastructure/web3/utils/chainIds');
      const { internalWalletService } = await import('@/services/wallet/InternalWalletService');
      
      const stablecoinAddress = STABLECOIN_ADDRESSES[settlement.currency][settlement.chainId];

      if (!stablecoinAddress) {
        throw new Error(`${settlement.currency} not supported on chain ${settlement.chainId}`);
      }

      // Get RPC provider
      const chainInfo = getChainInfo(settlement.chainId);
      const networkType = chainInfo?.type === 'testnet' ? 'testnet' : 'mainnet';
      const rpcUrl = await rpcManager.getRPCUrlWithFallback(settlement.chainId, networkType);
      
      if (!rpcUrl) {
        throw new Error(`No RPC available for chain ${settlement.chainId}`);
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl, {
        chainId: settlement.chainId,
        name: chainInfo?.name || `Chain ${settlement.chainId}`
      });

      // Get private key for project wallet
      const privateKey = await internalWalletService.getProjectWalletPrivateKey(settlement.id);
      
      if (!privateKey || privateKey.length < 64) {
        throw new Error('Invalid private key retrieved from storage');
      }

      // Create wallet instance
      const wallet = new ethers.Wallet(privateKey, provider);

      // Create ERC20 contract instance
      const erc20ABI = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)'
      ];
      
      const contract = new ethers.Contract(stablecoinAddress, erc20ABI, wallet);
      
      // Parse amount with correct decimals
      const decimals = settlement.currency === 'USDC' || settlement.currency === 'USDT' ? 6 : 18;
      const amountWei = ethers.parseUnits(settlement.amount, decimals);

      // Execute transfer
      const tx = await contract.transfer(settlement.toWallet, amountWei);
      
      console.log(`📡 Stablecoin transfer broadcast: ${tx.hash}`);

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Settlement transfer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed'
      };
    }
  }

  /**
   * Update settlement operation
   */
  private async updateSettlementOperation(
    operationId: string,
    updates: Partial<SettlementOperation>
  ): Promise<void> {
    const updateData: any = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.transactionHash) updateData.transaction_hash = updates.transactionHash;
    if (updates.confirmations !== undefined) updateData.confirmations = updates.confirmations;
    if (updates.blockNumber) updateData.block_number = updates.blockNumber;
    if (updates.settledAt) updateData.settled_at = updates.settledAt.toISOString();
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('settlement_operations')
      .update(updateData)
      .eq('id', operationId);

    if (error) {
      console.error('Failed to update settlement operation:', error);
    }
  }

  /**
   * Handle settlement error
   */
  private async handleSettlementError(
    operationId: string,
    errorMessage: string
  ): Promise<void> {
    await supabase
      .from('settlement_operations')
      .update({
        status: 'failed',
        error: {
          code: 'SETTLEMENT_FAILED',
          message: errorMessage
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', operationId);

    // Log error to audit trail
    await logActivity({
      action: 'redemption_settlement_failed',
      entity_id: operationId,
      entity_type: 'settlement_operation',
      status: 'error',
      details: {
        errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get settlement operation by ID
   */
  async getSettlementOperation(operationId: string): Promise<SettlementOperation | null> {
    const { data, error } = await supabase
      .from('settlement_operations')
      .select('*')
      .eq('id', operationId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDbToSettlementOperation(data);
  }

  /**
   * Map database record to SettlementOperation
   */
  private mapDbToSettlementOperation(data: any): SettlementOperation {
    return {
      id: data.id,
      redemptionId: data.redemption_id,
      tokenTransferId: data.token_transfer_id,
      type: data.type,
      currency: data.currency,
      amount: data.amount,
      fromWallet: data.from_wallet,
      toWallet: data.to_wallet,
      status: data.status,
      transactionHash: data.transaction_hash,
      confirmations: data.confirmations || 0,
      blockNumber: data.block_number,
      chainId: data.chain_id,
      error: data.error,
      createdAt: new Date(data.created_at),
      settledAt: data.settled_at ? new Date(data.settled_at) : undefined
    };
  }
}
