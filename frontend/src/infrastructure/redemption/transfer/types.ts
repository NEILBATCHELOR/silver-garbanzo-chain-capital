/**
 * Stage 11: Automated Transfer Types
 * Type definitions for redemption transfer operations
 */

import type { GasEstimate } from '@/services/wallet/TransferService';

export type TransferStatus =
  | 'pending'
  | 'simulating'
  | 'approved'
  | 'broadcasting'
  | 'confirming'
  | 'confirmed'
  | 'failed'
  | 'reversed';

export type SettlementCurrency = 'USDC' | 'USDT';

export type SettlementMode = 'manual' | 'automatic';

export interface TransferOperation {
  id: string;
  redemptionId: string;
  type: 'token_collection' | 'settlement_payment';
  status: TransferStatus;
  fromWallet: string;
  toWallet: string;
  tokenAddress: string;
  amount: string;
  gasEstimate?: GasEstimate;
  transactionHash?: string;
  confirmations: number;
  blockNumber?: number;
  chainId: number;
  error?: TransferError;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
}

export interface TransferError {
  code: string;
  message: string;
  details?: any;
}

export interface SettlementOperation {
  id: string;
  redemptionId: string;
  tokenTransferId: string;
  type: 'stablecoin_settlement';
  currency: SettlementCurrency;
  amount: string;
  fromWallet: string;
  toWallet: string;
  status: TransferStatus;
  transactionHash?: string;
  blockNumber?: number;
  confirmations: number;
  chainId: number;
  error?: TransferError;
  createdAt: Date;
  settledAt?: Date;
}

export interface SettlementConfig {
  mode: SettlementMode;
  delay?: number; // Delay in seconds before settlement
  batchingEnabled: boolean;
  maxBatchSize: number;
  priorityFee: string;
  slippageTolerance: number;
}

export interface TransferBatch {
  id: string;
  transfers: TransferOperation[];
  status: 'preparing' | 'executing' | 'completed' | 'failed';
  gasOptimization?: GasOptimization;
  totalGasSaved?: string;
  executedAt?: Date;
  createdAt: Date;
}

export interface GasOptimization {
  method: 'single' | 'multi-send' | 'batch';
  estimatedSavings: string;
  originalCost: string;
  optimizedCost: string;
}

export interface TransferServiceConfig {
  gatewayConfig?: any;
  walletConfig?: any;
  gasConfig?: GasConfig;
  monitorConfig?: MonitorConfig;
}

export interface GasConfig {
  maxGasPrice?: string;
  gasLimitMultiplier?: number;
  priorityFee?: string;
}

export interface MonitorConfig {
  pollingInterval?: number;
  maxRetries?: number;
  confirmationsRequired?: number;
}

export interface TransferResult {
  success: boolean;
  transferId: string;
  transactionHash?: string;
  status: TransferStatus;
  confirmations?: number;
  error?: TransferError;
}

export interface SettlementResult {
  success: boolean;
  settlementId: string;
  transactionHash?: string;
  amount: string;
  currency: SettlementCurrency;
  status?: TransferStatus;
  batchId?: string;
  estimatedExecution?: Date;
  error?: TransferError;
}

export interface OrchestrationStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: TransferError;
  startedAt?: Date;
  completedAt?: Date;
}

export interface OrchestrationResult {
  success: boolean;
  orchestrationId: string;
  steps: OrchestrationStep[];
  tokenTransferHash?: string;
  settlementHash?: string;
  completedAt?: Date;
  error?: TransferError;
}

export interface ApprovedRedemption {
  id: string;
  investorWallet: string;
  projectWallet: string;
  tokenAddress: string;
  amount: string;
  exchangeRate: string;
  targetCurrency: SettlementCurrency;
  chain: string;
  chainId: number;
  settlementConfig: SettlementConfig;
  approvedAt: Date;
  approvedBy: string;
}

export interface SimulationResult {
  success: boolean;
  gasUsed: string;
  error?: string;
  revertReason?: string;
}
