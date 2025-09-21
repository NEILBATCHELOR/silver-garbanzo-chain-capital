/**
 * Bitcoin Transaction Builder
 * Real Bitcoin transaction building using bitcoinjs-lib
 * Supports Bitcoin mainnet and testnet with real UTXO management
 */

import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { rpcManager } from '../../../infrastructure/web3/rpc/RPCConnectionManager';
import type { SupportedChain, NetworkType } from '../../../infrastructure/web3/adapters/IBlockchainAdapter';
import { ChainType } from '../AddressUtils';
import { addressUtils } from '../AddressUtils';

// Initialize ECPair with secp256k1
const ECPair = ECPairFactory(ecc);

// Type for ECPair instance
type ECPairInstance = ReturnType<typeof ECPair.fromPrivateKey>;

// ============================================================================
// BITCOIN-SPECIFIC INTERFACES
// ============================================================================

export interface BitcoinUTXO {
  txid: string;
  vout: number;
  value: number; // in satoshis
  scriptPubKey: string;
  confirmations: number;
  address?: string;
  blockHeight?: number;
}

export interface BitcoinTransactionRequest {
  from: string;
  to: string;
  value: number; // in satoshis
  feeRate?: number; // satoshis per byte
  utxos?: BitcoinUTXO[];
  changeAddress?: string;
  rbf?: boolean; // Replace-by-fee
}

export interface BitcoinGasEstimate {
  estimatedSize: number; // bytes
  feeRate: number; // satoshis per byte
  estimatedFee: number; // satoshis
  estimatedFeeBTC: string; // BTC format
  estimatedFeeUsd?: number;
  utxosUsed: number;
}

export interface BitcoinSignedTransaction {
  rawTransaction: string;
  transactionHash: string;
  size: number;
  vsize: number; // virtual size for SegWit
  fee: number;
  chainId: number;
  inputs: BitcoinUTXO[];
  outputs: { address: string; value: number }[];
}

export interface BitcoinBroadcastResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  size?: number;
  fee?: number;
}

export interface BitcoinTransactionBuilderConfig {
  chainId: number;
  chainName: string;
  networkType: 'mainnet' | 'testnet';
  rpcUrl?: string;
  network: any;
  symbol: string;
  decimals: number;
  dustThreshold?: number; // minimum UTXO value in satoshis
  defaultFeeRate?: number; // satoshis per byte
  timeout?: number;
}

// ============================================================================
// BITCOIN TRANSACTION BUILDER
// ============================================================================

export class BitcoinTransactionBuilder {
  private readonly config: BitcoinTransactionBuilderConfig;
  private readonly network: any;

  constructor(config: BitcoinTransactionBuilderConfig) {
    this.config = config;
    this.network = config.network;
  }

  /**
   * Validate Bitcoin transaction parameters
   */
  async validateTransaction(tx: BitcoinTransactionRequest): Promise<boolean> {
    // Validate addresses
    const fromValid = addressUtils.validateAddress(tx.from, ChainType.BITCOIN, this.config.networkType);
    const toValid = addressUtils.validateAddress(tx.to, ChainType.BITCOIN, this.config.networkType);
    
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

    if (tx.value > 21000000 * 100000000) {
      throw new Error('Transaction value exceeds maximum Bitcoin supply');
    }

    // Check dust threshold
    const dustThreshold = this.config.dustThreshold || 546;
    if (tx.value < dustThreshold) {
      throw new Error(`Transaction value below dust threshold: ${dustThreshold} satoshis`);
    }

    return true;
  }

  /**
   * Estimate Bitcoin transaction fees
   */
  async estimateGas(tx: BitcoinTransactionRequest): Promise<BitcoinGasEstimate> {
    await this.validateTransaction(tx);

    try {
      // Get UTXOs if not provided
      const utxos = tx.utxos || await this.fetchUTXOs(tx.from);
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available for transaction');
      }

      // Select UTXOs for the transaction
      const selectedUTXOs = this.selectUTXOs(utxos, tx.value);
      
      if (!selectedUTXOs.utxos || selectedUTXOs.totalValue < tx.value) {
        throw new Error('Insufficient funds in UTXOs');
      }

      // Calculate transaction size
      const estimatedSize = this.estimateTransactionSize(selectedUTXOs.utxos, 1, selectedUTXOs.needsChange ? 1 : 0);
      
      // Get fee rate
      const feeRate = tx.feeRate || await this.fetchFeeRate();
      const estimatedFee = estimatedSize * feeRate;

      // Verify we have enough funds including fee
      if (selectedUTXOs.totalValue < tx.value + estimatedFee) {
        throw new Error('Insufficient funds to cover transaction and fees');
      }

      const estimatedFeeBTC = (estimatedFee / 100000000).toFixed(8);

      // Get USD estimate (optional)
      let estimatedFeeUsd: number | undefined;
      try {
        // In production, use your price feed service
        const btcPrice = await this.getBTCPriceUSD();
        if (btcPrice) {
          estimatedFeeUsd = parseFloat(estimatedFeeBTC) * btcPrice;
        }
      } catch (error) {
        console.warn('Failed to get BTC price for USD estimation:', error);
      }

      return {
        estimatedSize,
        feeRate,
        estimatedFee,
        estimatedFeeBTC,
        estimatedFeeUsd,
        utxosUsed: selectedUTXOs.utxos.length
      };

    } catch (error) {
      throw new Error(`Bitcoin gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Sign Bitcoin transaction using bitcoinjs-lib
   */
  async signTransaction(tx: BitcoinTransactionRequest, privateKey: string): Promise<BitcoinSignedTransaction> {
    await this.validateTransaction(tx);

    try {
      // Create key pair from private key
      const keyPair = this.createKeyPair(privateKey);
      
      // Verify the key pair matches the from address
      const address = this.getAddressFromKeyPair(keyPair);
      if (address !== tx.from) {
        throw new Error('Private key does not match from address');
      }

      // Get UTXOs
      const utxos = tx.utxos || await this.fetchUTXOs(tx.from);
      const selectedUTXOs = this.selectUTXOs(utxos, tx.value);
      
      if (!selectedUTXOs.utxos || selectedUTXOs.totalValue < tx.value) {
        throw new Error('Insufficient funds in UTXOs');
      }

      // Create transaction builder
      const psbt = new bitcoin.Psbt({ network: this.network });

      // Add inputs
      for (const utxo of selectedUTXOs.utxos) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: Buffer.from(utxo.scriptPubKey, 'hex'),
            value: utxo.value,
          },
        });
      }

      // Add output to recipient
      psbt.addOutput({
        address: tx.to,
        value: tx.value,
      });

      // Add change output if needed
      const feeRate = tx.feeRate || await this.fetchFeeRate();
      const estimatedSize = this.estimateTransactionSize(selectedUTXOs.utxos, 1, selectedUTXOs.needsChange ? 1 : 0);
      const fee = estimatedSize * feeRate;
      const change = selectedUTXOs.totalValue - tx.value - fee;
      
      const dustThreshold = this.config.dustThreshold || 546;
      if (change > dustThreshold) {
        const changeAddress = tx.changeAddress || tx.from;
        psbt.addOutput({
          address: changeAddress,
          value: change,
        });
      }

      // Sign all inputs
      for (let i = 0; i < selectedUTXOs.utxos.length; i++) {
        psbt.signInput(i, keyPair);
      }

      // Validate signatures
      psbt.validateSignaturesOfAllInputs(bitcoin.script.signature.hashType.SIGHASH_ALL);
      
      // Finalize transaction
      psbt.finalizeAllInputs();

      const transaction = psbt.extractTransaction();
      const rawTransaction = transaction.toHex();
      const transactionHash = transaction.getId();

      // Prepare outputs for response
      const outputs = transaction.outs.map((output, index) => ({
        address: index === 0 ? tx.to : (tx.changeAddress || tx.from),
        value: output.value
      }));

      return {
        rawTransaction,
        transactionHash,
        size: transaction.byteLength(),
        vsize: transaction.virtualSize(),
        fee,
        chainId: this.config.chainId,
        inputs: selectedUTXOs.utxos,
        outputs
      };

    } catch (error) {
      throw new Error(`Bitcoin transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Broadcast Bitcoin transaction
   */
  async broadcastTransaction(signedTx: BitcoinSignedTransaction): Promise<BitcoinBroadcastResult> {
    const rpcUrl = this.getRpcUrl();
    if (!rpcUrl) {
      throw new Error(`${this.config.chainName} RPC URL not configured`);
    }

    try {
      const response = await this.sendBitcoinRPC(rpcUrl, 'sendrawtransaction', [signedTx.rawTransaction]);
      
      if (response.error) {
        return {
          success: false,
          error: response.error.message
        };
      }

      return {
        success: true,
        transactionHash: response.result,
        size: signedTx.size,
        fee: signedTx.fee
      };

    } catch (error) {
      return {
        success: false,
        error: `Bitcoin broadcast failed: ${error.message}`
      };
    }
  }

  /**
   * Get transaction confirmation status
   */
  async getTransactionStatus(txHash: string): Promise<{ confirmed: boolean; confirmations: number; blockHeight?: number }> {
    const rpcUrl = this.getRpcUrl();
    if (!rpcUrl) {
      throw new Error('RPC URL not configured');
    }

    try {
      const response = await this.sendBitcoinRPC(rpcUrl, 'gettransaction', [txHash]);
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      const confirmations = response.result.confirmations || 0;
      
      return {
        confirmed: confirmations > 0,
        confirmations,
        blockHeight: response.result.blockheight
      };

    } catch (error) {
      console.error(`Failed to get transaction status for ${txHash}:`, error);
      return { confirmed: false, confirmations: 0 };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private createKeyPair(privateKey: string): ECPairInstance {
    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const keyBuffer = Buffer.from(cleanKey, 'hex');
    
    if (keyBuffer.length !== 32) {
      throw new Error('Invalid private key length');
    }

    return ECPair.fromPrivateKey(keyBuffer, { network: this.network });
  }

  private getAddressFromKeyPair(keyPair: ECPairInstance): string {
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: this.network });
    if (!address) {
      throw new Error('Unable to derive address from key pair');
    }
    return address;
  }

  private async fetchUTXOs(address: string): Promise<BitcoinUTXO[]> {
    const rpcUrl = this.getRpcUrl();
    if (!rpcUrl) {
      throw new Error('RPC URL not configured');
    }

    try {
      // In production, you might use a different API like Blockstream or BlockCypher
      // This is a simplified version using Bitcoin Core RPC
      const response = await this.sendBitcoinRPC(rpcUrl, 'listunspent', [0, 9999999, [address]]);
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.result.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: Math.round(utxo.amount * 100000000), // Convert BTC to satoshis
        scriptPubKey: utxo.scriptPubKey,
        confirmations: utxo.confirmations,
        address: utxo.address
      }));

    } catch (error) {
      console.error(`Failed to fetch UTXOs for ${address}:`, error);
      return [];
    }
  }

  private selectUTXOs(utxos: BitcoinUTXO[], targetValue: number): {
    utxos: BitcoinUTXO[];
    totalValue: number;
    needsChange: boolean;
  } {
    // Sort UTXOs by value (descending) for efficient selection
    const sortedUTXOs = [...utxos].sort((a, b) => b.value - a.value);
    
    let selectedUTXOs: BitcoinUTXO[] = [];
    let totalValue = 0;

    // Simple greedy selection algorithm
    for (const utxo of sortedUTXOs) {
      selectedUTXOs.push(utxo);
      totalValue += utxo.value;
      
      // Check if we have enough (including estimated fee)
      const estimatedSize = this.estimateTransactionSize(selectedUTXOs, 1, 1);
      const estimatedFee = estimatedSize * (this.config.defaultFeeRate || 10);
      
      if (totalValue >= targetValue + estimatedFee) {
        break;
      }
    }

    const needsChange = totalValue > targetValue + (this.config.dustThreshold || 546);

    return {
      utxos: selectedUTXOs,
      totalValue,
      needsChange
    };
  }

  private estimateTransactionSize(inputs: BitcoinUTXO[], outputs: number, changeOutputs: number): number {
    // Rough estimation for P2PKH transactions
    const inputSize = 148; // bytes per input (including signature)
    const outputSize = 34; // bytes per output
    const overhead = 10; // transaction overhead
    
    return (inputs.length * inputSize) + ((outputs + changeOutputs) * outputSize) + overhead;
  }

  private async fetchFeeRate(): Promise<number> {
    const rpcUrl = this.getRpcUrl();
    if (!rpcUrl) {
      return this.config.defaultFeeRate || 10; // fallback to 10 sat/byte
    }

    try {
      // Try to get fee estimate from Bitcoin Core
      const response = await this.sendBitcoinRPC(rpcUrl, 'estimatesmartfee', [6]); // 6 blocks = ~1 hour
      
      if (response.result && response.result.feerate) {
        // Convert BTC/KB to sat/byte
        const feeRateBTCPerKB = response.result.feerate;
        const feeRateSatPerByte = Math.ceil((feeRateBTCPerKB * 100000000) / 1000);
        return Math.max(feeRateSatPerByte, 1); // Minimum 1 sat/byte
      }
    } catch (error) {
      console.warn('Failed to fetch dynamic fee rate, using default:', error);
    }

    return this.config.defaultFeeRate || 10;
  }

  private async getBTCPriceUSD(): Promise<number | null> {
    // Placeholder - integrate with your price feed service
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      const data = await response.json();
      return data.bitcoin?.usd || null;
    } catch {
      return null;
    }
  }

  private getRpcUrl(): string | null {
    try {
      const provider = rpcManager.getOptimalProvider(
        'bitcoin' as SupportedChain,
        this.config.networkType as NetworkType
      );
      return provider?.config.url || this.config.rpcUrl || null;
    } catch {
      return this.config.rpcUrl || null;
    }
  }

  private async sendBitcoinRPC(url: string, method: string, params: any[] = []): Promise<any> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '1.0',
        id: Date.now(),
        method,
        params
      })
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status}`);
    }

    return response.json();
  }
}

// ============================================================================
// CHAIN-SPECIFIC BITCOIN BUILDERS
// ============================================================================

export const BitcoinMainnetTransactionBuilder = () => {
  return new BitcoinTransactionBuilder({
    chainId: 0,
    chainName: 'Bitcoin',
    networkType: 'mainnet',
    rpcUrl: import.meta.env.VITE_BITCOIN_RPC_URL,
    network: bitcoin.networks.bitcoin,
    symbol: 'BTC',
    decimals: 8,
    dustThreshold: 546,
    defaultFeeRate: 10,
    timeout: 30000
  });
};

export const BitcoinTestnetTransactionBuilder = () => {
  return new BitcoinTransactionBuilder({
    chainId: 1,
    chainName: 'Bitcoin Testnet',
    networkType: 'testnet',
    rpcUrl: import.meta.env.VITE_BITCOIN_TESTNET_RPC_URL,
    network: bitcoin.networks.testnet,
    symbol: 'tBTC',
    decimals: 8,
    dustThreshold: 546,
    defaultFeeRate: 10,
    timeout: 30000
  });
};

// Export convenience functions
export const getBitcoinTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  return networkType === 'mainnet' ? BitcoinMainnetTransactionBuilder() : BitcoinTestnetTransactionBuilder();
};
