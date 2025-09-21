/**
 * Sui Transaction Builder
 * Real Sui transaction building using @mysten/sui
 * Supports Sui mainnet and testnet with real transaction creation
 */

import {
  SuiClient,
  getFullnodeUrl,
  SuiTransactionBlockResponse,
  DryRunTransactionBlockResponse,
  ExecuteTransactionRequestType,
  SuiTransactionBlockResponseOptions,
  PaginatedObjectsResponse,
  SuiObjectData,
  SuiObjectResponse,
  SuiGasData,
} from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromB64, toB64 } from '@mysten/sui/utils';
import { normalizeStructTag } from '@mysten/sui/utils';
import { SUI_CLOCK_OBJECT_ID, SUI_TYPE_ARG } from '@mysten/sui/utils';
import { bcs } from '@mysten/sui/bcs';
import { fromHEX, toHEX } from '@mysten/sui/utils';
import { rpcManager } from '../../../infrastructure/web3/rpc/RPCConnectionManager';
import type { SupportedChain, NetworkType } from '../../../infrastructure/web3/adapters/IBlockchainAdapter';
import { ChainType } from '../AddressUtils';
import { addressUtils } from '../AddressUtils';

// ============================================================================
// SUI-SPECIFIC INTERFACES
// ============================================================================

export interface SuiCoinReference {
  objectId: string;
  version: string | number;
  digest: string;
}

export interface SuiTransactionRequest {
  from: string;
  to: string;
  value: number; // in MIST (1 SUI = 1e9 MIST)
  gasPrice?: number; // MIST per gas unit
  gasBudget?: number; // maximum gas in MIST
  coinType?: string; // default is SUI
  memo?: string;
}

export interface SuiGasEstimate {
  gasPrice: number; // MIST per gas unit
  gasBudget: number; // total gas budget in MIST
  computationCost: number; // MIST
  storageCost: number; // MIST
  storageRebate: number; // MIST
  totalCost: number; // MIST
  totalCostSUI: string; // SUI format
  totalCostUsd?: number;
}

export interface SuiSignedTransaction {
  transaction: Transaction;
  signature: string;
  transactionBytes: string;
  hash: string;
  sender: string;
  gasData: {
    price: number;
    budget: number;
    payment: SuiCoinReference[];
  };
}

export interface SuiBroadcastResult {
  success: boolean;
  digest?: string;
  confirmedLocalExecution?: boolean;
  timestamp?: string;
  checkpoint?: string;
  balanceChanges?: any[];
  objectChanges?: any[];
  events?: any[];
  error?: string;
}

export interface SuiTransactionBuilderConfig {
  chainId: number;
  chainName: string;
  networkType: 'mainnet' | 'testnet';
  rpcUrl?: string;
  symbol: string;
  decimals: number;
  defaultGasPrice?: number;
  defaultGasBudget?: number;
  timeout?: number;
}

// ============================================================================
// SUI TRANSACTION BUILDER
// ============================================================================

export class SuiTransactionBuilder {
  private client: SuiClient | null = null;
  private readonly config: SuiTransactionBuilderConfig;

  constructor(config: SuiTransactionBuilderConfig) {
    this.config = config;
    this.initializeClient();
  }

  private initializeClient(): void {
    const rpcUrl = this.getRpcUrl();
    
    this.client = new SuiClient({
      url: rpcUrl || getFullnodeUrl(this.config.networkType === 'mainnet' ? 'mainnet' : 'testnet'),
    });
  }

  /**
   * Validate Sui transaction parameters
   */
  async validateTransaction(tx: SuiTransactionRequest): Promise<boolean> {
    // Validate addresses using AddressUtils
    const fromValid = addressUtils.validateAddress(tx.from, ChainType.SUI, this.config.networkType);
    const toValid = addressUtils.validateAddress(tx.to, ChainType.SUI, this.config.networkType);
    
    if (!fromValid.isValid) {
      throw new Error(`Invalid from address: ${fromValid.error}`);
    }
    
    if (!toValid.isValid) {
      throw new Error(`Invalid to address: ${toValid.error}`);
    }

    // Validate value
    if (tx.value <= 0) {
      throw new Error('Transaction value must be greater than 0');
    }

    if (tx.value > 1000000 * 1000000000) { // 1M SUI in MIST
      throw new Error('Transaction value exceeds reasonable limit');
    }

    // Validate addresses format
    if (!tx.from.startsWith('0x') || tx.from.length !== 66) {
      throw new Error('Invalid Sui from address format');
    }

    if (!tx.to.startsWith('0x') || tx.to.length !== 66) {
      throw new Error('Invalid Sui to address format');
    }

    return true;
  }

  /**
   * Estimate Sui transaction gas
   */
  async estimateGas(tx: SuiTransactionRequest): Promise<SuiGasEstimate> {
    if (!this.client) {
      throw new Error(`${this.config.chainName} client not initialized`);
    }

    await this.validateTransaction(tx);

    try {
      // Build transaction for estimation
      const tx_obj = await this.buildTransaction(tx);

      // Get gas coins for the sender
      const gasCoins = await this.getGasCoins(tx.from);
      if (gasCoins.length === 0) {
        throw new Error('No gas coins available for transaction');
      }

      // Set gas payment
      tx_obj.setGasPayment(gasCoins.slice(0, 1)); // Use first gas coin

      // Dry run transaction to estimate gas
      const dryRunResult = await this.client.dryRunTransactionBlock({
        transactionBlock: await tx_obj.build({ client: this.client }),
      });

      if (dryRunResult.effects.status.status !== 'success') {
        throw new Error(`Transaction simulation failed: ${dryRunResult.effects.status.error}`);
      }

      const gasUsed = dryRunResult.effects.gasUsed;
      const gasPrice = tx.gasPrice || parseInt(gasUsed.computationCost) || this.config.defaultGasPrice || 1000;
      
      const computationCost = parseInt(gasUsed.computationCost);
      const storageCost = parseInt(gasUsed.storageCost);
      const storageRebate = parseInt(gasUsed.storageRebate);
      const totalCost = computationCost + storageCost - storageRebate;
      
      const gasBudget = Math.max(totalCost * 1.2, tx.gasBudget || this.config.defaultGasBudget || 10000000); // 20% buffer
      const totalCostSUI = (totalCost / 1000000000).toFixed(9);

      // Get USD estimate
      let totalCostUsd: number | undefined;
      try {
        const suiPrice = await this.getSUIPriceUSD();
        if (suiPrice) {
          totalCostUsd = parseFloat(totalCostSUI) * suiPrice;
        }
      } catch (error) {
        console.warn('Failed to get SUI price for USD estimation:', error);
      }

      return {
        gasPrice,
        gasBudget: Math.round(gasBudget),
        computationCost,
        storageCost,
        storageRebate,
        totalCost,
        totalCostSUI,
        totalCostUsd,
      };

    } catch (error) {
      throw new Error(`Sui gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Sign Sui transaction using private key
   */
  async signTransaction(tx: SuiTransactionRequest, privateKey: string): Promise<SuiSignedTransaction> {
    if (!this.client) {
      throw new Error(`${this.config.chainName} client not initialized`);
    }

    await this.validateTransaction(tx);

    try {
      // Create keypair from private key
      const keypair = this.createKeypair(privateKey);
      
      // Verify keypair address matches from address
      if (keypair.getPublicKey().toSuiAddress() !== tx.from) {
        throw new Error('Private key does not match from address');
      }

      // Build transaction
      const tx_obj = await this.buildTransaction(tx);

      // Get gas coins and set gas payment
      const gasCoins = await this.getGasCoins(tx.from);
      if (gasCoins.length === 0) {
        throw new Error('No gas coins available for transaction');
      }

      tx_obj.setGasPayment(gasCoins.slice(0, 5)); // Use up to 5 coins for gas

      // Set gas price and budget
      const gasPrice = tx.gasPrice || this.config.defaultGasPrice || 1000;
      const gasBudget = tx.gasBudget || this.config.defaultGasBudget || 10000000;
      
      tx_obj.setGasBudget(gasBudget);

      // Build and sign transaction
      const transactionBytes = await tx_obj.build({ client: this.client });
      const signature = (await keypair.signTransaction(transactionBytes)).signature;

      return {
        transaction: tx_obj,
        signature,
        transactionBytes: toB64(transactionBytes),
        hash: '', // Will be set after broadcast
        sender: tx.from,
        gasData: {
          price: gasPrice,
          budget: gasBudget,
          payment: gasCoins.slice(0, 5),
        },
      };

    } catch (error) {
      throw new Error(`Sui transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Broadcast Sui transaction
   */
  async broadcastTransaction(signedTx: SuiSignedTransaction): Promise<SuiBroadcastResult> {
    if (!this.client) {
      throw new Error(`${this.config.chainName} client not initialized`);
    }

    try {
      const options: SuiTransactionBlockResponseOptions = {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
        showBalanceChanges: true,
      };

      const result = await this.client.executeTransactionBlock({
        transactionBlock: signedTx.transactionBytes,
        signature: signedTx.signature,
        options,
        requestType: 'WaitForLocalExecution',
      });

      const success = result.effects?.status?.status === 'success';

      return {
        success,
        digest: result.digest,
        confirmedLocalExecution: result.confirmedLocalExecution,
        timestamp: result.timestampMs,
        checkpoint: result.checkpoint,
        balanceChanges: result.balanceChanges,
        objectChanges: result.objectChanges,
        events: result.events,
      };

    } catch (error) {
      return {
        success: false,
        error: `Sui broadcast failed: ${error.message}`,
      };
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(digest: string): Promise<{
    success: boolean;
    executed: boolean;
    confirmed: boolean;
    timestamp?: string;
    checkpoint?: string;
    gasUsed?: any;
  }> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const result = await this.client.getTransactionBlock({
        digest,
        options: {
          showInput: true,
          showEffects: true,
        },
      });

      const success = result.effects?.status?.status === 'success';
      const executed = !!result.effects;
      const confirmed = !!result.checkpoint;

      return {
        success,
        executed,
        confirmed,
        timestamp: result.timestampMs,
        checkpoint: result.checkpoint,
        gasUsed: result.effects?.gasUsed,
      };

    } catch (error) {
      console.error(`Failed to get transaction status for ${digest}:`, error);
      return {
        success: false,
        executed: false,
        confirmed: false,
      };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string, coinType: string = SUI_TYPE_ARG): Promise<number> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const balance = await this.client.getBalance({
        owner: address,
        coinType,
      });

      return parseInt(balance.totalBalance);
    } catch (error) {
      console.error(`Failed to get balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Get all coin balances for address
   */
  async getAllBalances(address: string): Promise<any[]> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const balances = await this.client.getAllBalances({
        owner: address,
      });

      return balances;
    } catch (error) {
      console.error(`Failed to get all balances for ${address}:`, error);
      return [];
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private createKeypair(privateKey: string): Ed25519Keypair {
    try {
      // Remove 0x prefix if present
      const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
      
      if (cleanKey.length !== 64) {
        throw new Error('Invalid private key length. Expected 32 bytes (64 hex characters).');
      }

      const privateKeyBytes = fromHEX(cleanKey);
      return Ed25519Keypair.fromSecretKey(privateKeyBytes);

    } catch (error) {
      throw new Error(`Invalid Sui private key: ${error.message}`);
    }
  }

  private async buildTransaction(tx: SuiTransactionRequest): Promise<Transaction> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const tx_obj = new Transaction();
    tx_obj.setSender(tx.from);

    // Get coins to use for payment
    const coins = await this.getPaymentCoins(tx.from, tx.value, tx.coinType || SUI_TYPE_ARG);
    if (coins.length === 0) {
      throw new Error('Insufficient funds for transaction');
    }

    // If we need to merge coins
    let paymentCoin;
    if (coins.length === 1) {
      paymentCoin = tx_obj.object(coins[0].objectId);
    } else {
      // Merge multiple coins
      const [primaryCoin, ...otherCoins] = coins;
      paymentCoin = tx_obj.object(primaryCoin.objectId);
      if (otherCoins.length > 0) {
        tx_obj.mergeCoins(paymentCoin, otherCoins.map(coin => tx_obj.object(coin.objectId)));
      }
    }

    // Split coin for exact payment
    const [splitCoin] = tx_obj.splitCoins(paymentCoin, [tx.value]);

    // Transfer to recipient
    tx_obj.transferObjects([splitCoin], tx.to);

    return tx_obj;
  }

  private async getPaymentCoins(address: string, amount: number, coinType: string): Promise<SuiCoinReference[]> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const coins = await this.client.getCoins({
        owner: address,
        coinType,
      });

      // Sort coins by balance (descending)
      const sortedCoins = coins.data
        .filter(coin => parseInt(coin.balance) > 0)
        .sort((a, b) => parseInt(b.balance) - parseInt(a.balance));

      // Select coins to cover the amount
      const selectedCoins: SuiCoinReference[] = [];
      let totalBalance = 0;

      for (const coin of sortedCoins) {
        selectedCoins.push({
          objectId: coin.coinObjectId,
          version: coin.version,
          digest: coin.digest,
        });
        totalBalance += parseInt(coin.balance);
        
        if (totalBalance >= amount) {
          break;
        }
      }

      if (totalBalance < amount) {
        throw new Error(`Insufficient funds: need ${amount}, have ${totalBalance}`);
      }

      return selectedCoins;

    } catch (error) {
      console.error(`Failed to get payment coins for ${address}:`, error);
      return [];
    }
  }

  private async getGasCoins(address: string): Promise<SuiCoinReference[]> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const coins = await this.client.getCoins({
        owner: address,
        coinType: SUI_TYPE_ARG, // Gas must be paid in SUI
      });

      return coins.data
        .filter(coin => parseInt(coin.balance) > 10000) // Minimum balance for gas
        .map(coin => ({
          objectId: coin.coinObjectId,
          version: coin.version,
          digest: coin.digest,
        }))
        .slice(0, 10); // Max 10 gas coins

    } catch (error) {
      console.error(`Failed to get gas coins for ${address}:`, error);
      return [];
    }
  }

  private async getSUIPriceUSD(): Promise<number | null> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
      const data = await response.json();
      return data.sui?.usd || null;
    } catch {
      return null;
    }
  }

  private getRpcUrl(): string | null {
    try {
      const provider = rpcManager.getOptimalProvider(
        'sui' as SupportedChain,
        this.config.networkType as NetworkType
      );
      return provider?.config.url || this.config.rpcUrl || null;
    } catch {
      return this.config.rpcUrl || null;
    }
  }
}

// ============================================================================
// CHAIN-SPECIFIC SUI BUILDERS
// ============================================================================

export const SuiMainnetTransactionBuilder = () => {
  return new SuiTransactionBuilder({
    chainId: 1,
    chainName: 'Sui',
    networkType: 'mainnet',
    rpcUrl: import.meta.env.VITE_SUI_RPC_URL,
    symbol: 'SUI',
    decimals: 9,
    defaultGasPrice: 1000, // MIST per gas unit
    defaultGasBudget: 10000000, // 0.01 SUI in MIST
    timeout: 30000,
  });
};

export const SuiTestnetTransactionBuilder = () => {
  return new SuiTransactionBuilder({
    chainId: 2,
    chainName: 'Sui Testnet',
    networkType: 'testnet',
    rpcUrl: import.meta.env.VITE_SUI_TESTNET_RPC_URL || 'https://fullnode.testnet.sui.io:443',
    symbol: 'SUI',
    decimals: 9,
    defaultGasPrice: 1000,
    defaultGasBudget: 10000000,
    timeout: 30000,
  });
};

// Export convenience function
export const getSuiTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  return networkType === 'mainnet' ? SuiMainnetTransactionBuilder() : SuiTestnetTransactionBuilder();
};
