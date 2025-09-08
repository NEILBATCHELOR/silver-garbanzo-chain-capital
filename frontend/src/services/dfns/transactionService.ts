/**
 * DFNS Transaction Service
 * 
 * High-level service for DFNS transaction broadcasting operations
 * Handles low-level blockchain transaction construction and broadcasting
 * Includes network-specific transaction builders and User Action Signing
 */

import type {
  DfnsBroadcastTransactionRequest,
  DfnsTransactionRequestResponse,
  DfnsGetTransactionRequestResponse,
  DfnsListTransactionRequestsResponse,
  DfnsListTransactionRequestsParams,
  DfnsGenericTransactionRequest,
  DfnsEvmTransactionRequest,
  DfnsEip1559TransactionRequest,
  DfnsUserOperationRequest,
  DfnsBitcoinTransactionRequest,
  DfnsSolanaTransactionRequest,
  DfnsAptosTransactionRequest,
  DfnsXrpTransactionRequest,
  DfnsCantonTransactionRequest,
  DfnsNetwork,
  DfnsTransactionStatus,
  DfnsTransactionBuilderOptions,
  DfnsNetworkTransactionSupport,
} from '../../types/dfns';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsUserActionService } from './userActionService';
import { DfnsTransactionError } from '../../types/dfns/errors';

// Service Options
export interface DfnsTransactionServiceOptions {
  syncToDatabase?: boolean;
  validateBalance?: boolean;
  estimateGas?: boolean;
  autoRetry?: boolean;
  retryAttempts?: number;
  waitForConfirmation?: boolean;
}

// Transaction Builder Result
export interface DfnsTransactionBuilderResult {
  transaction: string; // Hex-encoded transaction
  estimatedGas?: string;
  estimatedFee?: string;
  nonce?: number;
}

// Transaction Summary for Dashboard
export interface DfnsTransactionSummary {
  transactionId: string;
  walletId: string;
  network: DfnsNetwork;
  kind: string;
  status: DfnsTransactionStatus;
  txHash?: string;
  fee?: string;
  dateRequested: string;
  dateBroadcasted?: string;
  dateConfirmed?: string;
  isCompleted: boolean;
  isPending: boolean;
  isFailed: boolean;
}

// Network Support Matrix
const NETWORK_TRANSACTION_SUPPORT: Record<DfnsNetwork, DfnsNetworkTransactionSupport> = {
  'Ethereum': {
    network: 'Ethereum',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559', 'UserOperation'],
    requiresUserAction: true,
    feeTokenSymbol: 'ETH',
    confirmationBlocks: 12,
  },
  'Bitcoin': {
    network: 'Bitcoin',
    supportedKinds: ['Transaction', 'Psbt'],
    requiresUserAction: true,
    feeTokenSymbol: 'BTC',
    confirmationBlocks: 6,
  },
  'Solana': {
    network: 'Solana',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'SOL',
    confirmationBlocks: 32,
  },
  'Polygon': {
    network: 'Polygon',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559', 'UserOperation'],
    requiresUserAction: true,
    feeTokenSymbol: 'MATIC',
    confirmationBlocks: 20,
  },
  'Arbitrum': {
    network: 'Arbitrum',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'ETH',
    confirmationBlocks: 1,
  },
  'Optimism': {
    network: 'Optimism',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'ETH',
    confirmationBlocks: 1,
  },
  'Base': {
    network: 'Base',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'ETH',
    confirmationBlocks: 1,
  },
  'Avalanche': {
    network: 'Avalanche',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'AVAX',
    confirmationBlocks: 1,
  },
  'Binance': {
    network: 'Binance',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'BNB',
    confirmationBlocks: 15,
  },
  'Cosmos': {
    network: 'Cosmos',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'ATOM',
    confirmationBlocks: 1,
  },
  'Near': {
    network: 'Near',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'NEAR',
    confirmationBlocks: 1,
  },
  'Stellar': {
    network: 'Stellar',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'XLM',
    confirmationBlocks: 1,
  },
  'Algorand': {
    network: 'Algorand',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'ALGO',
    confirmationBlocks: 1,
  },
  'Cardano': {
    network: 'Cardano',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'ADA',
    confirmationBlocks: 10,
  },
  'Polkadot': {
    network: 'Polkadot',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'DOT',
    confirmationBlocks: 2,
  },
  'Kusama': {
    network: 'Kusama',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'KSM',
    confirmationBlocks: 2,
  },
  'Osmosis': {
    network: 'Osmosis',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'OSMO',
    confirmationBlocks: 1,
  },
  'Juno': {
    network: 'Juno',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'JUNO',
    confirmationBlocks: 1,
  },
  'Stargaze': {
    network: 'Stargaze',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'STARS',
    confirmationBlocks: 1,
  },
  'Aptos': {
    network: 'Aptos',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'APT',
    confirmationBlocks: 1,
  },
  'Sui': {
    network: 'Sui',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'SUI',
    confirmationBlocks: 1,
  },
  // Testnet Networks
  'EthereumSepolia': {
    network: 'EthereumSepolia',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559', 'UserOperation'],
    requiresUserAction: true,
    feeTokenSymbol: 'ETH',
    confirmationBlocks: 12,
  },
  'EthereumHolesky': {
    network: 'EthereumHolesky',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559', 'UserOperation'],
    requiresUserAction: true,
    feeTokenSymbol: 'ETH',
    confirmationBlocks: 12,
  },
  'ArbitrumSepolia': {
    network: 'ArbitrumSepolia',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'ETH',
    confirmationBlocks: 1,
  },
  'BaseSepolia': {
    network: 'BaseSepolia',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'ETH',
    confirmationBlocks: 1,
  },
  'OptimismSepolia': {
    network: 'OptimismSepolia',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'ETH',
    confirmationBlocks: 1,
  },
  'AvalancheFuji': {
    network: 'AvalancheFuji',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'AVAX',
    confirmationBlocks: 1,
  },
  'PolygonAmoy': {
    network: 'PolygonAmoy',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'MATIC',
    confirmationBlocks: 5,
  },
  'BscTestnet': {
    network: 'BscTestnet',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'BNB',
    confirmationBlocks: 3,
  },
  'SolanaDevnet': {
    network: 'SolanaDevnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'SOL',
    confirmationBlocks: 1,
  },
  'StellarTestnet': {
    network: 'StellarTestnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'XLM',
    confirmationBlocks: 1,
  },
  'Berachain': {
    network: 'Berachain',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'BERA',
    confirmationBlocks: 1,
  },
  'BerachainBepolia': {
    network: 'BerachainBepolia',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'BERA',
    confirmationBlocks: 1,
  },
} as const;

/**
 * DFNS Transaction Service
 * 
 * Provides high-level business logic for transaction broadcasting
 */
export class DfnsTransactionService {
  constructor(
    private authClient: DfnsAuthClient,
    private userActionService: DfnsUserActionService
  ) {}

  // Get network transaction support information
  getNetworkSupport(network: DfnsNetwork): DfnsNetworkTransactionSupport | undefined {
    return NETWORK_TRANSACTION_SUPPORT[network];
  }

  // Check if a network supports EIP-1559
  static supportsEip1559(network: DfnsNetwork): boolean {
    const support = NETWORK_TRANSACTION_SUPPORT[network];
    return support?.supportedKinds.includes('Eip1559') ?? false;
  }

  // Get fee token symbol for a network
  static getFeeTokenSymbol(network: DfnsNetwork): string {
    const support = NETWORK_TRANSACTION_SUPPORT[network];
    return support?.feeTokenSymbol ?? 'Unknown';
  }

  // Get required confirmation blocks for a network
  static getConfirmationBlocks(network: DfnsNetwork): number {
    const support = NETWORK_TRANSACTION_SUPPORT[network];
    return support?.confirmationBlocks ?? 1;
  }
}
