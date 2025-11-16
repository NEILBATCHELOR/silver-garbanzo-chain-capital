/**
 * Stage 11: Automated Transfer Service
 * Handles automatic token transfers for approved redemptions
 * Learns from proven patterns in TransferTab and BlockchainTransfer
 */

import { transferService, type TransferParams } from '@/services/wallet/TransferService';
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/audit';
import type {
  TransferOperation,
  TransferResult,
  ApprovedRedemption,
  SimulationResult,
  TransferServiceConfig,
  TransferError,
  TransferStatus
} from './types';

const REQUIRED_CONFIRMATIONS = 12; // Standard confirmation requirement
const TRANSFER_TIMEOUT_MS = 600000; // 10 minutes timeout

export class AutomatedTransferService {
  private config: TransferServiceConfig;

  constructor(config?: TransferServiceConfig) {
    this.config = config || {};
  }

  /**
   * Execute redemption transfer - Main entry point
   * Based on BlockchainTransfer.tsx pattern
   */
  async executeRedemptionTransfer(
    redemption: ApprovedRedemption
  ): Promise<TransferResult> {
    const transferId = crypto.randomUUID();

    try {
      // 1. Create transfer operation record
      const operation = await this.createTransferOperation(transferId, redemption);

      // 2. Simulate transfer (optional but recommended)
      await this.updateTransferStatus(operation.id, 'simulating');
      const simulation = await this.simulateTransfer(operation);

      if (!simulation.success) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      // 3. Execute transfer via proven TransferService
      await this.updateTransferStatus(operation.id, 'broadcasting');
      const transferParams: TransferParams = {
        from: redemption.investorWallet,
        to: redemption.projectWallet,
        amount: redemption.amount,
        chainId: redemption.chainId,
        walletId: transferId, // Use operation ID as wallet ID
        walletType: 'user' // Investor wallet
      };

      const result = await transferService.executeTransfer(transferParams);

      if (!result.success) {
        throw new Error(result.error || 'Transfer failed');
      }

      // 4. Update operation with transaction hash
      await this.updateTransferOperation(operation.id, {
        transactionHash: result.transactionHash,
        status: 'confirming',
        updatedAt: new Date()
      });

      // 5. Monitor confirmations (async)
      this.monitorConfirmations(operation.id, result.transactionHash!, redemption.chainId)
        .catch(error => console.error('Confirmation monitoring error:', error));

      return {
        success: true,
        transferId,
        transactionHash: result.transactionHash,
        status: 'confirming'
      };
    } catch (error) {
      const err = error as Error;
      await this.handleTransferError(transferId, {
        code: 'TRANSFER_FAILED',
        message: err.message,
        details: error
      });

      return {
        success: false,
        transferId,
        status: 'failed',
        error: {
          code: 'TRANSFER_FAILED',
          message: err.message
        }
      };
    }
  }

  /**
   * Create transfer operation in database
   */
  private async createTransferOperation(
    id: string,
    redemption: ApprovedRedemption
  ): Promise<TransferOperation> {
    const operation: TransferOperation = {
      id,
      redemptionId: redemption.id,
      type: 'token_collection',
      status: 'pending',
      fromWallet: redemption.investorWallet,
      toWallet: redemption.projectWallet,
      tokenAddress: redemption.tokenAddress,
      amount: redemption.amount,
      confirmations: 0,
      chainId: redemption.chainId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store in database
    const { error } = await supabase
      .from('transfer_operations')
      .insert({
        id: operation.id,
        redemption_id: operation.redemptionId,
        type: operation.type,
        status: operation.status,
        from_wallet: operation.fromWallet,
        to_wallet: operation.toWallet,
        token_address: operation.tokenAddress,
        amount: operation.amount,
        confirmations: operation.confirmations,
        chain_id: operation.chainId
      });

    if (error) {
      throw new Error(`Failed to create transfer operation: ${error.message}`);
    }

    return operation;
  }

  /**
   * Simulate transfer before execution
   */
  private async simulateTransfer(
    operation: TransferOperation
  ): Promise<SimulationResult> {
    try {
      // Use TransferService's gas estimation as simulation
      const params: TransferParams = {
        from: operation.fromWallet,
        to: operation.toWallet,
        amount: operation.amount,
        chainId: operation.chainId,
        walletId: operation.id,
        walletType: 'user'
      };

      const gasEstimate = await transferService.estimateGas(params);

      return {
        success: true,
        gasUsed: gasEstimate.gasLimit
      };
    } catch (error) {
      return {
        success: false,
        gasUsed: '0',
        error: error instanceof Error ? error.message : 'Simulation failed'
      };
    }
  }

  /**
   * Monitor transaction confirmations
   * Based on TransactionConfirmation.tsx pattern
   */
  private async monitorConfirmations(
    operationId: string,
    txHash: string,
    chainId: number
  ): Promise<void> {
    let confirmations = 0;
    const maxAttempts = 60; // 10 minutes with 10-second intervals
    let attempts = 0;

    while (confirmations < REQUIRED_CONFIRMATIONS && attempts < maxAttempts) {
      try {
        // Check transaction status
        const receipt = await this.getTransactionReceipt(txHash, chainId);

        if (receipt) {
          confirmations = receipt.confirmations || 0;

          // Update operation
          await this.updateTransferOperation(operationId, {
            confirmations,
            blockNumber: receipt.blockNumber,
            status: confirmations >= REQUIRED_CONFIRMATIONS ? 'confirmed' : 'confirming',
            confirmedAt: confirmations >= REQUIRED_CONFIRMATIONS ? new Date() : undefined,
            updatedAt: new Date()
          });

          if (confirmations >= REQUIRED_CONFIRMATIONS) {
            // Log successful transfer confirmation
            await logActivity({
              action: 'redemption_transfer_confirmed',
              entity_id: operationId,
              entity_type: 'transfer_operation',
              status: 'success',
              details: {
                transactionHash: txHash,
                confirmations,
                blockNumber: receipt.blockNumber,
                timestamp: new Date().toISOString()
              }
            });
            break;
          }
        }

        // Wait before next check
        await this.sleep(10000); // 10 seconds
        attempts++;
      } catch (error) {
        console.error('Confirmation check error:', error);
        attempts++;
      }
    }

    if (confirmations < REQUIRED_CONFIRMATIONS) {
      await this.handleTransferError(operationId, {
        code: 'CONFIRMATION_TIMEOUT',
        message: 'Transaction confirmation timeout'
      });
    }
  }

  /**
   * Get transaction receipt
   */
  private async getTransactionReceipt(
    txHash: string,
    chainId: number
  ): Promise<any> {
    try {
      // Use TransferService's built-in method
      const status = await transferService.getTransactionStatus(txHash, chainId);
      
      if (!status.found) {
        return null;
      }

      // If we have a receipt, return it with confirmations calculated
      if (status.receipt) {
        const { ethers } = await import('ethers');
        const { rpcManager } = await import('@/infrastructure/web3/rpc/RPCConnectionManager');
        const { getChainInfo } = await import('@/infrastructure/web3/utils/chainIds');

        // Get current block number to calculate confirmations
        const chainInfo = getChainInfo(chainId);
        const networkType = chainInfo?.type === 'testnet' ? 'testnet' : 'mainnet';
        const rpcUrl = await rpcManager.getRPCUrlWithFallback(chainId, networkType);
        
        if (rpcUrl) {
          const provider = new ethers.JsonRpcProvider(rpcUrl, {
            chainId,
            name: chainInfo?.name || `Chain ${chainId}`
          });
          
          const currentBlock = await provider.getBlockNumber();
          const confirmations = currentBlock - status.receipt.blockNumber + 1;
          
          return {
            ...status.receipt,
            confirmations,
            status: status.confirmed ? 1 : (status.reverted ? 0 : null)
          };
        }
      }

      // Transaction found but no receipt yet (still pending)
      return null;
    } catch (error) {
      console.error('Error fetching transaction receipt:', error);
      return null;
    }
  }

  /**
   * Update transfer operation status
   */
  private async updateTransferStatus(
    operationId: string,
    status: TransferStatus
  ): Promise<void> {
    const { error } = await supabase
      .from('transfer_operations')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', operationId);

    if (error) {
      console.error('Failed to update transfer status:', error);
    }
  }

  /**
   * Update transfer operation
   */
  private async updateTransferOperation(
    operationId: string,
    updates: Partial<TransferOperation>
  ): Promise<void> {
    const updateData: any = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.transactionHash) updateData.transaction_hash = updates.transactionHash;
    if (updates.confirmations !== undefined) updateData.confirmations = updates.confirmations;
    if (updates.blockNumber) updateData.block_number = updates.blockNumber;
    if (updates.confirmedAt) updateData.confirmed_at = updates.confirmedAt.toISOString();
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('transfer_operations')
      .update(updateData)
      .eq('id', operationId);

    if (error) {
      console.error('Failed to update transfer operation:', error);
    }
  }

  /**
   * Handle transfer error
   */
  private async handleTransferError(
    operationId: string,
    error: TransferError
  ): Promise<void> {
    await supabase
      .from('transfer_operations')
      .update({
        status: 'failed',
        error: error,
        updated_at: new Date().toISOString()
      })
      .eq('id', operationId);

    // Log error to audit trail
    await logActivity({
      action: 'redemption_transfer_failed',
      entity_id: operationId,
      entity_type: 'transfer_operation',
      status: 'error',
      details: {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
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
   * Get transfer operation by ID
   */
  async getTransferOperation(operationId: string): Promise<TransferOperation | null> {
    const { data, error } = await supabase
      .from('transfer_operations')
      .select('*')
      .eq('id', operationId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDbToTransferOperation(data);
  }

  /**
   * Map database record to TransferOperation
   */
  private mapDbToTransferOperation(data: any): TransferOperation {
    return {
      id: data.id,
      redemptionId: data.redemption_id,
      type: data.type,
      status: data.status,
      fromWallet: data.from_wallet,
      toWallet: data.to_wallet,
      tokenAddress: data.token_address,
      amount: data.amount,
      transactionHash: data.transaction_hash,
      confirmations: data.confirmations || 0,
      blockNumber: data.block_number,
      chainId: data.chain_id,
      error: data.error,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      confirmedAt: data.confirmed_at ? new Date(data.confirmed_at) : undefined
    };
  }
}
