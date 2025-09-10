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
  id: string; // Alias for transactionId
  walletId: string;
  network: DfnsNetwork;
  kind: string;
  status: DfnsTransactionStatus;
  txHash?: string;
  fee?: string;
  dateRequested: string;
  dateCreated: string; // Alias for dateRequested
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
  // Additional DFNS SDK Networks
  'ArbitrumOne': {
    network: 'ArbitrumOne',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'ETH',
    confirmationBlocks: 1,
  },
  'Tron': {
    network: 'Tron',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'TRX',
    confirmationBlocks: 19,
  },
  'XrpLedger': {
    network: 'XrpLedger',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'XRP',
    confirmationBlocks: 1,
  },
  'Hedera': {
    network: 'Hedera',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'HBAR',
    confirmationBlocks: 1,
  },
  'KeyECDSA': {
    network: 'KeyECDSA',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'ETH',
    confirmationBlocks: 1,
  },
  'KeyECDSAStark': {
    network: 'KeyECDSAStark',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'ETH',
    confirmationBlocks: 1,
  },
  'KeyEdDSA': {
    network: 'KeyEdDSA',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'SOL',
    confirmationBlocks: 1,
  },
  // Additional Testnet Networks
  'AlgorandTestnet': {
    network: 'AlgorandTestnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'ALGO',
    confirmationBlocks: 1,
  },
  'CardanoTestnet': {
    network: 'CardanoTestnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'ADA',
    confirmationBlocks: 10,
  },
  'TronTestnet': {
    network: 'TronTestnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'TRX',
    confirmationBlocks: 19,
  },
  'XrpLedgerTestnet': {
    network: 'XrpLedgerTestnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'XRP',
    confirmationBlocks: 1,
  },
  'HederaTestnet': {
    network: 'HederaTestnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'HBAR',
    confirmationBlocks: 1,
  },
  'AptosTestnet': {
    network: 'AptosTestnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'APT',
    confirmationBlocks: 1,
  },
  'SuiTestnet': {
    network: 'SuiTestnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'SUI',
    confirmationBlocks: 1,
  },
  'TronShasta': {
    network: 'TronShasta',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'TRX',
    confirmationBlocks: 19,
  },
  'CosmosTestnet': {
    network: 'CosmosTestnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'ATOM',
    confirmationBlocks: 1,
  },
  'NearTestnet': {
    network: 'NearTestnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'NEAR',
    confirmationBlocks: 1,
  },
  'PolkadotTestnet': {
    network: 'PolkadotTestnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'DOT',
    confirmationBlocks: 2,
  },
  'KusamaTestnet': {
    network: 'KusamaTestnet',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'KSM',
    confirmationBlocks: 2,
  },
  'Westend': {
    network: 'Westend',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'WND',
    confirmationBlocks: 2,
  },
  'Rococo': {
    network: 'Rococo',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'ROC',
    confirmationBlocks: 2,
  },
  // Polkadot Ecosystem Networks
  'Moonbeam': {
    network: 'Moonbeam',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'GLMR',
    confirmationBlocks: 2,
  },
  'Moonriver': {
    network: 'Moonriver',
    supportedKinds: ['Transaction', 'Evm', 'Eip1559'],
    requiresUserAction: true,
    feeTokenSymbol: 'MOVR',
    confirmationBlocks: 2,
  },
  'Astar': {
    network: 'Astar',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'ASTR',
    confirmationBlocks: 2,
  },
  'Shiden': {
    network: 'Shiden',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'SDN',
    confirmationBlocks: 2,
  },
  'Acala': {
    network: 'Acala',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'ACA',
    confirmationBlocks: 2,
  },
  'Karura': {
    network: 'Karura',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'KAR',
    confirmationBlocks: 2,
  },
  'Parallel': {
    network: 'Parallel',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'PARA',
    confirmationBlocks: 2,
  },
  'Basilisk': {
    network: 'Basilisk',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'BSX',
    confirmationBlocks: 2,
  },
  'Calamari': {
    network: 'Calamari',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'KMA',
    confirmationBlocks: 2,
  },
  'Subsocial': {
    network: 'Subsocial',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'SUB',
    confirmationBlocks: 2,
  },
  'Zeitgeist': {
    network: 'Zeitgeist',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'ZTG',
    confirmationBlocks: 2,
  },
  'Bifrost': {
    network: 'Bifrost',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'BNC',
    confirmationBlocks: 2,
  },
  'Centrifuge': {
    network: 'Centrifuge',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'CFG',
    confirmationBlocks: 2,
  },
  'Composable': {
    network: 'Composable',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'LAYR',
    confirmationBlocks: 2,
  },
  'Picasso': {
    network: 'Picasso',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'PICA',
    confirmationBlocks: 2,
  },
  'HydraDX': {
    network: 'HydraDX',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'HDX',
    confirmationBlocks: 2,
  },
  'Interlay': {
    network: 'Interlay',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'INTR',
    confirmationBlocks: 2,
  },
  'Kintsugi': {
    network: 'Kintsugi',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'KINT',
    confirmationBlocks: 2,
  },
  'Litentry': {
    network: 'Litentry',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'LIT',
    confirmationBlocks: 2,
  },
  'Manta': {
    network: 'Manta',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'MANTA',
    confirmationBlocks: 2,
  },
  'Nodle': {
    network: 'Nodle',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'NODL',
    confirmationBlocks: 2,
  },
  'Origintrail': {
    network: 'Origintrail',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'TRAC',
    confirmationBlocks: 2,
  },
  'Pendulum': {
    network: 'Pendulum',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'PEN',
    confirmationBlocks: 2,
  },
  'Phala': {
    network: 'Phala',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'PHA',
    confirmationBlocks: 2,
  },
  'Robonomics': {
    network: 'Robonomics',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'XRT',
    confirmationBlocks: 2,
  },
  'Turing': {
    network: 'Turing',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'TUR',
    confirmationBlocks: 2,
  },
  'Unique': {
    network: 'Unique',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'UNQ',
    confirmationBlocks: 2,
  },
  'Unknown': {
    network: 'Unknown',
    supportedKinds: ['Transaction'],
    requiresUserAction: true,
    feeTokenSymbol: 'N/A',
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

  // ==============================================
  // CORE TRANSACTION OPERATIONS
  // ==============================================

  /**
   * Broadcast a generic transaction (raw hex)
   * Most flexible method - accepts any signed transaction hex
   */
  async broadcastGenericTransaction(
    walletId: string,
    transactionHex: string,
    options: DfnsTransactionServiceOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    try {
      const request: DfnsGenericTransactionRequest = {
        kind: 'Transaction',
        transaction: transactionHex,
        externalId: options.validateBalance ? `generic-tx-${Date.now()}` : undefined,
      };

      const userActionToken = await this.userActionService.signUserAction(
        'BroadcastTransaction',
        {
          walletId,
          ...request,
        }
      );

      const response = await this.authClient.makeRequestWithUserAction(
        'POST',
        `/wallets/${walletId}/transactions`,
        request,
        userActionToken
      ) as DfnsTransactionRequestResponse;

      if (options.syncToDatabase) {
        // TODO: Sync to local database
        console.log('Database sync not yet implemented');
      }

      return response;
    } catch (error) {
      throw new DfnsTransactionError(`Failed to broadcast generic transaction: ${error}`, {
        network: 'Unknown',
        walletId,
      });
    }
  }

  /**
   * Broadcast an EVM transaction with gas estimation
   * DFNS handles transaction construction and gas estimation
   */
  async broadcastEvmTransaction(
    walletId: string,
    to: string,
    value: string,
    data?: string,
    options: DfnsTransactionServiceOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    try {
      const request: DfnsEvmTransactionRequest = {
        kind: 'Evm',
        to,
        value,
        data,
        externalId: options.validateBalance ? `evm-tx-${Date.now()}` : undefined,
      };

      const userActionToken = await this.userActionService.signUserAction(
        'BroadcastTransaction',
        {
          walletId,
          ...request,
        }
      );

      const response = await this.authClient.makeRequestWithUserAction(
        'POST',
        `/wallets/${walletId}/transactions`,
        request,
        userActionToken
      ) as DfnsTransactionRequestResponse;

      if (options.syncToDatabase) {
        // TODO: Sync to local database
        console.log('Database sync not yet implemented');
      }

      return response;
    } catch (error) {
      throw new DfnsTransactionError(`Failed to broadcast EVM transaction: ${error}`, {
        walletId,
      });
    }
  }

  /**
   * Broadcast an EIP-1559 transaction with custom gas parameters
   * For precise fee control in DeFi and high-priority transactions
   */
  async broadcastEip1559Transaction(
    walletId: string,
    to: string,
    value: string,
    data: string,
    gasLimit: string,
    maxFeePerGas: string,
    maxPriorityFeePerGas: string,
    nonce?: number,
    options: DfnsTransactionServiceOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    try {
      const request: DfnsEip1559TransactionRequest = {
        kind: 'Eip1559',
        to,
        value,
        data,
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        externalId: options.validateBalance ? `eip1559-tx-${Date.now()}` : undefined,
      };

      const userActionToken = await this.userActionService.signUserAction(
        'BroadcastTransaction',
        {
          walletId,
          ...request,
        }
      );

      const response = await this.authClient.makeRequestWithUserAction(
        'POST',
        `/wallets/${walletId}/transactions`,
        request,
        userActionToken
      ) as DfnsTransactionRequestResponse;

      if (options.syncToDatabase) {
        // TODO: Sync to local database
        console.log('Database sync not yet implemented');
      }

      return response;
    } catch (error) {
      throw new DfnsTransactionError(`Failed to broadcast EIP-1559 transaction: ${error}`, {
        walletId,
      });
    }
  }

  /**
   * Broadcast a Bitcoin PSBT transaction
   */
  async broadcastBitcoinTransaction(
    walletId: string,
    psbtHex: string,
    options: DfnsTransactionServiceOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    try {
      const request: DfnsBitcoinTransactionRequest = {
        kind: 'Psbt',
        psbt: psbtHex,
        externalId: options.validateBalance ? `btc-tx-${Date.now()}` : undefined,
      };

      const userActionToken = await this.userActionService.signUserAction(
        'BroadcastTransaction',
        {
          walletId,
          ...request,
        }
      );

      const response = await this.authClient.makeRequestWithUserAction(
        'POST',
        `/wallets/${walletId}/transactions`,
        request,
        userActionToken
      ) as DfnsTransactionRequestResponse;

      if (options.syncToDatabase) {
        // TODO: Sync to local database
        console.log('Database sync not yet implemented');
      }

      return response;
    } catch (error) {
      throw new DfnsTransactionError(`Failed to broadcast Bitcoin transaction: ${error}`, {
        network: 'Bitcoin',
        walletId,
      });
    }
  }

  /**
   * Broadcast a Solana transaction
   */
  async broadcastSolanaTransaction(
    walletId: string,
    transactionHex: string,
    options: DfnsTransactionServiceOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    try {
      const request: DfnsSolanaTransactionRequest = {
        kind: 'Transaction',
        transaction: transactionHex,
        externalId: options.validateBalance ? `solana-tx-${Date.now()}` : undefined,
      };

      const userActionToken = await this.userActionService.signUserAction(
        'BroadcastTransaction',
        {
          walletId,
          ...request,
        }
      );

      const response = await this.authClient.makeRequestWithUserAction(
        'POST',
        `/wallets/${walletId}/transactions`,
        request,
        userActionToken
      ) as DfnsTransactionRequestResponse;

      if (options.syncToDatabase) {
        // TODO: Sync to local database
        console.log('Database sync not yet implemented');
      }

      return response;
    } catch (error) {
      throw new DfnsTransactionError(`Failed to broadcast Solana transaction: ${error}`, {
        network: 'Solana',
        walletId,
      });
    }
  }

  // ==============================================
  // TRANSACTION MANAGEMENT
  // ==============================================

  /**
   * Get a specific transaction request
   */
  async getTransactionRequest(
    walletId: string,
    transactionId: string
  ): Promise<DfnsGetTransactionRequestResponse> {
    try {
      const response = await this.authClient.makeRequest(
        'GET',
        `/wallets/${walletId}/transactions/${transactionId}`,
        undefined
      ) as DfnsGetTransactionRequestResponse;

      return response;
    } catch (error) {
      throw new DfnsTransactionError(`Failed to get transaction request: ${error}`, {
        walletId,
        transactionId,
      });
    }
  }

  /**
   * List transaction requests for a wallet
   */
  async listTransactionRequests(
    walletId: string,
    limit: number = 100
  ): Promise<DfnsListTransactionRequestsResponse> {
    try {
      // Build query string parameters
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
      });

      const response = await this.authClient.makeRequest(
        'GET',
        `/wallets/${walletId}/transactions?${queryParams.toString()}`
      ) as DfnsListTransactionRequestsResponse;

      return response;
    } catch (error) {
      throw new DfnsTransactionError(`Failed to list transaction requests: ${error}`, {
        walletId,
      });
    }
  }

  /**
   * Get all transaction requests for a wallet (handles pagination)
   */
  async getAllTransactionRequests(walletId: string): Promise<DfnsTransactionRequestResponse[]> {
    try {
      const allTransactions: DfnsTransactionRequestResponse[] = [];
      let nextPageToken: string | undefined = undefined;

      do {
        // Build query string parameters
        const queryParams = new URLSearchParams({
          limit: '1000',
        });
        
        if (nextPageToken) {
          queryParams.append('paginationToken', nextPageToken);
        }

        const response = await this.authClient.makeRequest(
          'GET',
          `/wallets/${walletId}/transactions?${queryParams.toString()}`
        ) as DfnsListTransactionRequestsResponse;

        const data: DfnsListTransactionRequestsResponse = response;
        allTransactions.push(...data.items);
        nextPageToken = data.nextPageToken;
      } while (nextPageToken);

      return allTransactions;
    } catch (error) {
      throw new DfnsTransactionError(`Failed to get all transaction requests: ${error}`, {
        walletId,
      });
    }
  }

  // ==============================================
  // TRANSACTION FILTERING AND ANALYSIS
  // ==============================================

  /**
   * Get pending transactions for a wallet
   */
  async getPendingTransactions(walletId: string): Promise<DfnsTransactionRequestResponse[]> {
    const allTransactions = await this.getAllTransactionRequests(walletId);
    return allTransactions.filter(tx => tx.status === 'Pending');
  }

  /**
   * Get failed transactions for a wallet
   */
  async getFailedTransactions(walletId: string): Promise<DfnsTransactionRequestResponse[]> {
    const allTransactions = await this.getAllTransactionRequests(walletId);
    return allTransactions.filter(tx => tx.status === 'Failed');
  }

  /**
   * Get transaction summaries for dashboard display
   */
  async getTransactionsSummary(walletId: string): Promise<DfnsTransactionSummary[]> {
    try {
      const transactions = await this.getAllTransactionRequests(walletId);
      
      return transactions.map(tx => ({
        transactionId: tx.id,
        id: tx.id, // Alias for transactionId
        walletId: tx.walletId,
        network: tx.network,
        kind: tx.requestBody.kind,
        status: tx.status,
        txHash: tx.txHash,
        fee: tx.fee,
        dateRequested: tx.dateRequested,
        dateCreated: tx.dateRequested, // Alias for dateRequested
        dateBroadcasted: tx.dateBroadcasted,
        dateConfirmed: tx.dateConfirmed,
        isCompleted: tx.status === 'Confirmed', // Fixed: removed invalid comparison
        isPending: tx.status === 'Pending' || tx.status === 'Broadcasted',
        isFailed: tx.status === 'Failed',
      }));
    } catch (error) {
      throw new DfnsTransactionError(`Failed to get transactions summary: ${error}`, {
        walletId,
      });
    }
  }

  // ==============================================
  // NETWORK SUPPORT UTILITIES
  // ==============================================

  // Get network transaction support information
  getNetworkSupport(network: DfnsNetwork): DfnsNetworkTransactionSupport | undefined {
    return NETWORK_TRANSACTION_SUPPORT[network];
  }

  // Get supported transaction kinds for a network
  getSupportedTransactionKinds(network: DfnsNetwork): string[] {
    const support = NETWORK_TRANSACTION_SUPPORT[network];
    return support?.supportedKinds ?? [];
  }

  // Check if User Action Signing is required for transactions
  requiresUserActionSigning(network: DfnsNetwork): boolean {
    const support = NETWORK_TRANSACTION_SUPPORT[network];
    return support?.requiresUserAction ?? true;
  }

  // Check if a network supports EIP-1559
  static supportsEip1559(network: DfnsNetwork): boolean {
    const support = NETWORK_TRANSACTION_SUPPORT[network];
    return support?.supportedKinds.includes('Eip1559') ?? false;
  }

  // Check if a network supports User Operations (Account Abstraction)
  static supportsUserOperations(network: DfnsNetwork): boolean {
    const support = NETWORK_TRANSACTION_SUPPORT[network];
    return support?.supportedKinds.includes('UserOperation') ?? false;
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
