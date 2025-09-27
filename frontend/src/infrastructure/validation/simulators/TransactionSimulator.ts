/**
 * TransactionSimulator.ts
 * Simulates transaction execution to predict outcomes
 * Uses blockchain state forking for accurate simulation
 */

import type { Transaction } from '@/types/core/centralModels';
import type { SimulationResult, StateChange, SimulatedEvent } from '../TransactionValidator';
import { StatePredictor } from './StatePredictor';
import { ethers } from 'ethers';

export interface SimulatorConfig {
  provider?: ethers.Provider;
  forkUrl?: string;
  timeout?: number;
}

export interface ForkedState {
  provider: ethers.Provider;
  blockNumber: number;
  timestamp: number;
}

export interface ExecutionResult {
  success: boolean;
  gasUsed?: bigint;
  events?: SimulatedEvent[];
  revertReason?: string;
  returnData?: string;
}

export class TransactionSimulator {
  private statePredictor: StatePredictor;
  private provider?: ethers.Provider;
  private config: SimulatorConfig;
  
  constructor(config: SimulatorConfig = {}) {
    this.config = config;
    this.statePredictor = new StatePredictor();
    
    if (config.provider) {
      this.provider = config.provider;
    }
  }
  
  /**
   * Simulate transaction execution
   */
  async simulate(transaction: Transaction): Promise<SimulationResult> {
    try {
      // Fork current state
      const forkedState = await this.forkState();
      
      // Apply transaction to forked state
      const result = await this.applyTransaction(transaction, forkedState);
      
      // Predict state changes
      const stateChanges = await this.statePredictor.predict(
        transaction,
        forkedState,
        result
      );
      
      return {
        success: result.success,
        stateChanges,
        gasUsed: result.gasUsed,
        events: result.events,
        revertReason: result.revertReason,
        warnings: this.detectWarnings(result, stateChanges)
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Simulation failed',
        revertReason: this.extractRevertReason(error)
      };
    }
  }
  
  /**
   * Fork blockchain state for simulation
   */
  private async forkState(): Promise<ForkedState> {
    if (!this.provider) {
      // Create a default provider if none provided
      const rpcUrl = this.config.forkUrl || process.env.VITE_ETHEREUM_RPC_URL || '';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
    }
    
    const blockNumber = await this.provider.getBlockNumber();
    const block = await this.provider.getBlock(blockNumber);
    
    return {
      provider: this.provider,
      blockNumber,
      timestamp: block?.timestamp || Math.floor(Date.now() / 1000)
    };
  }
  
  /**
   * Apply transaction to forked state
   */
  private async applyTransaction(
    transaction: Transaction,
    state: ForkedState
  ): Promise<ExecutionResult> {
    const provider = state.provider;
    
    // Prepare transaction for simulation
    const tx = {
      to: transaction.to,
      from: transaction.from,
      data: transaction.data || '0x',
      value: transaction.value ? ethers.parseEther(transaction.value) : 0n,
      gasLimit: transaction.gasLimit ? BigInt(transaction.gasLimit) : undefined
    };
    
    try {
      // Use eth_call to simulate without sending
      const result = await provider.call(tx);
      
      // Estimate gas if not provided
      const gasUsed = tx.gasLimit || await provider.estimateGas(tx);
      
      // Parse events from simulation
      const events = await this.parseSimulatedEvents(result, transaction);
      
      return {
        success: true,
        gasUsed: BigInt(gasUsed.toString()),
        events,
        returnData: result
      };
    } catch (error) {
      // Extract revert reason
      const revertReason = this.extractRevertReason(error);
      
      return {
        success: false,
        revertReason,
        gasUsed: 0n
      };
    }
  }
  
  /**
   * Parse events from simulation result
   */
  private async parseSimulatedEvents(
    result: string,
    transaction: Transaction
  ): Promise<SimulatedEvent[]> {
    const events: SimulatedEvent[] = [];
    
    // If we have contract ABI, we can decode events
    // For now, return basic event structure
    if (result && result !== '0x') {
      events.push({
        name: 'SimulatedTransaction',
        address: transaction.to || '',
        args: {
          from: transaction.from,
          to: transaction.to,
          value: transaction.value,
          data: transaction.data
        }
      });
    }
    
    return events;
  }
  
  /**
   * Detect potential warnings from simulation
   */
  private detectWarnings(
    result: ExecutionResult,
    stateChanges: StateChange[]
  ): string[] {
    const warnings: string[] = [];
    
    // Check for high gas usage
    if (result.gasUsed && result.gasUsed > 1000000n) {
      warnings.push('Transaction requires high gas usage');
    }
    
    // Check for significant state changes
    if (stateChanges.length > 10) {
      warnings.push('Transaction causes multiple state changes');
    }
    
    // Check for contract interactions
    if (result.returnData && result.returnData.length > 2) {
      warnings.push('Transaction involves contract interaction');
    }
    
    return warnings;
  }
  
  /**
   * Extract revert reason from error
   */
  private extractRevertReason(error: any): string {
    if (!error) return 'Unknown error';
    
    // Check for standard revert message
    if (error.reason) return error.reason;
    
    // Check for custom error
    if (error.data) {
      try {
        // Try to decode custom error
        const errorData = error.data;
        if (typeof errorData === 'string' && errorData.startsWith('0x08c379a0')) {
          // Standard revert string
          const reason = ethers.AbiCoder.defaultAbiCoder().decode(
            ['string'],
            '0x' + errorData.slice(10)
          );
          return reason[0];
        }
      } catch {
        // Failed to decode
      }
    }
    
    // Check error message
    if (error.message) {
      // Extract revert reason from message
      const match = error.message.match(/reason="([^"]+)"/);
      if (match) return match[1];
      
      return error.message;
    }
    
    return 'Transaction reverted';
  }
  
  /**
   * Simulate batch of transactions
   */
  async simulateBatch(transactions: Transaction[]): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];
    
    for (const tx of transactions) {
      const result = await this.simulate(tx);
      results.push(result);
      
      // If a transaction fails, subsequent ones might fail too
      if (!result.success) {
        console.warn('Transaction simulation failed, subsequent transactions may be affected');
      }
    }
    
    return results;
  }
  
  /**
   * Test transaction with different gas prices
   */
  async testGasPrices(
    transaction: Transaction,
    gasPrices: string[]
  ): Promise<Map<string, SimulationResult>> {
    const results = new Map<string, SimulationResult>();
    
    for (const gasPrice of gasPrices) {
      const txWithGas = {
        ...transaction,
        gasPrice
      };
      
      const result = await this.simulate(txWithGas);
      results.set(gasPrice, result);
    }
    
    return results;
  }
}
