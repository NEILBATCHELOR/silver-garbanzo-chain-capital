/**
 * StatePredictor.ts
 * Predicts state changes from transaction simulation
 */

import type { Transaction } from '@/types/core/centralModels';
import type { StateChange } from '../TransactionValidator';
import type { ForkedState, ExecutionResult } from './TransactionSimulator';
import { ethers } from 'ethers';

export class StatePredictor {
  /**
   * Predict state changes from transaction
   */
  async predict(
    transaction: Transaction,
    forkedState: ForkedState,
    executionResult: ExecutionResult
  ): Promise<StateChange[]> {
    const changes: StateChange[] = [];
    
    // Predict balance changes
    const balanceChanges = await this.predictBalanceChanges(
      transaction,
      forkedState
    );
    changes.push(...balanceChanges);
    
    // Predict nonce changes
    const nonceChanges = await this.predictNonceChanges(
      transaction,
      forkedState
    );
    changes.push(...nonceChanges);
    
    // Predict storage changes if contract interaction
    if (transaction.data && transaction.data !== '0x') {
      const storageChanges = await this.predictStorageChanges(
        transaction,
        forkedState,
        executionResult
      );
      changes.push(...storageChanges);
    }
    
    return changes;
  }
  
  /**
   * Predict balance changes
   */
  private async predictBalanceChanges(
    transaction: Transaction,
    state: ForkedState
  ): Promise<StateChange[]> {
    const changes: StateChange[] = [];
    const provider = state.provider;
    
    if (!transaction.from || !transaction.to) return changes;
    
    try {
      // Get current balances
      const fromBalanceBefore = await provider.getBalance(transaction.from);
      const toBalanceBefore = await provider.getBalance(transaction.to);
      
      // Calculate value transfer
      const value = transaction.value ? ethers.parseEther(transaction.value) : 0n;
      
      // Calculate gas cost
      const gasPrice = transaction.gasPrice ? BigInt(transaction.gasPrice) : 20000000000n; // 20 Gwei
      const gasLimit = transaction.gasLimit ? BigInt(transaction.gasLimit) : 21000n;
      const gasCost = gasPrice * gasLimit;
      
      // Predict new balances
      const fromBalanceAfter = fromBalanceBefore - value - gasCost;
      const toBalanceAfter = toBalanceBefore + value;
      
      // Add balance changes
      changes.push({
        type: 'balance',
        address: transaction.from || '',
        before: ethers.formatEther(fromBalanceBefore),
        after: ethers.formatEther(fromBalanceAfter),
        description: `Balance change for ${transaction.from}`
      });
      
      changes.push({
        type: 'balance',
        address: transaction.to,
        before: ethers.formatEther(toBalanceBefore),
        after: ethers.formatEther(toBalanceAfter),
        description: `Balance change for ${transaction.to}`
      });
    } catch (error) {
      console.error('Failed to predict balance changes:', error);
    }
    
    return changes;
  }
  
  /**
   * Predict nonce changes
   */
  private async predictNonceChanges(
    transaction: Transaction,
    state: ForkedState
  ): Promise<StateChange[]> {
    const changes: StateChange[] = [];
    const provider = state.provider;
    
    if (!transaction.from) return changes;
    
    try {
      // Get current nonce
      const nonceBefore = await provider.getTransactionCount(transaction.from);
      const nonceAfter = nonceBefore + 1;
      
      changes.push({
        type: 'nonce',
        address: transaction.from,
        before: nonceBefore.toString(),
        after: nonceAfter.toString(),
        description: `Nonce increment for ${transaction.from}`
      });
    } catch (error) {
      console.error('Failed to predict nonce changes:', error);
    }
    
    return changes;
  }
  
  /**
   * Predict storage changes for contract interactions
   */
  private async predictStorageChanges(
    transaction: Transaction,
    state: ForkedState,
    executionResult: ExecutionResult
  ): Promise<StateChange[]> {
    const changes: StateChange[] = [];
    
    if (!transaction.to || !executionResult.returnData) return changes;
    
    // For ERC20 transfers, predict balance changes
    if (this.isERC20Transfer(transaction.data)) {
      const tokenChanges = await this.predictERC20Changes(transaction, state);
      changes.push(...tokenChanges);
    }
    
    // For other contract interactions, add generic change
    if (executionResult.success) {
      changes.push({
        type: 'storage',
        address: transaction.to,
        before: 'unchanged',
        after: 'modified',
        description: `Storage modified for contract ${transaction.to}`
      });
    }
    
    return changes;
  }
  
  /**
   * Check if transaction is ERC20 transfer
   */
  private isERC20Transfer(data?: string): boolean {
    if (!data || data === '0x') return false;
    
    // ERC20 transfer function selector: 0xa9059cbb
    return data.startsWith('0xa9059cbb');
  }
  
  /**
   * Predict ERC20 token balance changes
   */
  private async predictERC20Changes(
    transaction: Transaction,
    state: ForkedState
  ): Promise<StateChange[]> {
    const changes: StateChange[] = [];
    
    if (!transaction.data || !transaction.to || !transaction.from) return changes;
    
    try {
      // Decode transfer parameters
      const transferData = transaction.data.slice(10); // Remove function selector
      const [recipient, amount] = ethers.AbiCoder.defaultAbiCoder().decode(
        ['address', 'uint256'],
        '0x' + transferData
      );
      
      // Add token balance changes
      changes.push({
        type: `token_balance_${transaction.to}`,
        address: transaction.from,
        before: 'current',
        after: `current - ${ethers.formatUnits(amount, 18)}`,
        description: `Token balance decrease for ${transaction.from}`
      });
      
      changes.push({
        type: `token_balance_${transaction.to}`,
        address: recipient as string,
        before: 'current',
        after: `current + ${ethers.formatUnits(amount, 18)}`,
        description: `Token balance increase for ${recipient}`
      });
    } catch (error) {
      console.error('Failed to predict ERC20 changes:', error);
    }
    
    return changes;
  }
  
  /**
   * Analyze state changes for risks
   */
  analyzeRisks(changes: StateChange[]): string[] {
    const risks: string[] = [];
    
    // Check for complete balance drainage
    const balanceChanges = changes.filter(c => c.type === 'balance');
    for (const change of balanceChanges) {
      if (change.after === '0.0' || parseFloat(change.after) < 0) {
        risks.push(`Address ${change.address} will have zero or negative balance`);
      }
    }
    
    // Check for high value transfers
    for (const change of balanceChanges) {
      const diff = Math.abs(parseFloat(change.after) - parseFloat(change.before));
      if (diff > 10) { // More than 10 ETH
        risks.push(`Large value transfer detected: ${diff} ETH`);
      }
    }
    
    return risks;
  }
}
