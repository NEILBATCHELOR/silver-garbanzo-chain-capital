/**
 * Bitcoin Adapter Implementation
 *
 * Bitcoin-specific adapter implementing UTXO model
 * Supports mainnet, testnet, and regtest networks
 */

import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import type {
  NetworkType,
  TransactionParams,
  TransactionResult,
  TransactionStatus,
  AccountInfo,
  ConnectionConfig,
  HealthStatus
} from '../IBlockchainAdapter';
import { BaseBlockchainAdapter } from '../IBlockchainAdapter';

// Initialize ECPair with tiny-secp256k1 (imported as ESM module)
const ECPair = ECPairFactory(ecc);

// Bitcoin network configurations - use bitcoin.networks directly
const BITCOIN_NETWORKS: Record<string, any> = {
  mainnet: bitcoin.networks.bitcoin,
  testnet: bitcoin.networks.testnet,
  regtest: bitcoin.networks.regtest
};

// UTXO interface for Bitcoin transactions
interface UTXO {
  txid: string;
  vout: number;
  value: number; // satoshis
  scriptPubKey: string;
  height?: number;
}

export enum BitcoinAddressType {
  P2PKH = 'p2pkh', // Legacy (1...)
  P2SH = 'p2sh', // Script Hash (3...)
  P2WPKH = 'p2wpkh', // Native SegWit (bc1q...)
  P2WSH = 'p2wsh', // Native SegWit Script Hash (bc1q...)
  P2TR = 'p2tr' // Taproot (bc1p...)
}

export interface BitcoinAddressInfo {
  address: string;
  type: BitcoinAddressType;
  pubkey?: Buffer;
  redeemScript?: Buffer;
  witnessScript?: Buffer;
  tapInternalKey?: Buffer; // x-only 32-byte internal key for taproot
  tapMerkleRoot?: Buffer;
}

export class BitcoinAdapter extends BaseBlockchainAdapter {
  private apiUrl?: string;
  private network: any; // Using any to avoid import type issues across module settings

  readonly chainId: string;
  readonly chainName = 'bitcoin';
  readonly networkType: NetworkType;
  readonly nativeCurrency = {
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8
  };

  constructor(networkType: NetworkType = 'mainnet') {
    super();
    this.networkType = networkType;
    this.network = BITCOIN_NETWORKS[networkType];

    if (!this.network) {
      throw new Error(`Unsupported Bitcoin network: ${networkType}`);
    }

    this.chainId = `bitcoin-${networkType}`;
  }

  // Connection management
  async connect(config: ConnectionConfig): Promise<void> {
    try {
      this.config = config;
      this.apiUrl = config.rpcUrl;

      // Test connection by getting latest block
      await this.getCurrentBlockNumber();

      this._isConnected = true;
      console.log(`Connected to Bitcoin ${this.networkType}`);
    } catch (error) {
      this._isConnected = false;
      throw new Error(`Failed to connect to Bitcoin: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.apiUrl = undefined;
    this._isConnected = false;
    console.log('Disconnected from Bitcoin');
  }

  async getHealth(): Promise<HealthStatus> {
    if (!this.apiUrl) {
      return {
        isHealthy: false,
        latency: -1,
        lastChecked: Date.now()
      };
    }

    const startTime = Date.now();
    try {
      const blockHeight = await this.getCurrentBlockNumber();
      const latency = Date.now() - startTime;

      return {
        isHealthy: true,
        latency,
        blockHeight,
        lastChecked: Date.now()
      };
    } catch {
      return {
        isHealthy: false,
        latency: Date.now() - startTime,
        lastChecked: Date.now()
      };
    }
  }

  // Enhanced account operations with multiple address types
  async generateAccount(addressType: BitcoinAddressType = BitcoinAddressType.P2WPKH): Promise<AccountInfo> {
    this.validateConnection();

    const keyPair = ECPair.makeRandom({ network: this.network });
    const publicKey = Buffer.from(keyPair.publicKey);
    const addressInfo = this.generateAddress(publicKey, addressType);

    const balance = await this.getBalance(addressInfo.address);

    return {
      address: addressInfo.address,
      balance,
      publicKey: publicKey.toString('hex')
    };
  }

  generateAddress(publicKey: Buffer, addressType: BitcoinAddressType): BitcoinAddressInfo {
    switch (addressType) {
      case BitcoinAddressType.P2PKH:
        return this.generateP2PKHAddress(publicKey);

      case BitcoinAddressType.P2SH:
        // For demo, create 2-of-3 multisig P2SH
        return this.generateP2SHAddress([publicKey]);

      case BitcoinAddressType.P2WPKH:
        return this.generateP2WPKHAddress(publicKey);

      case BitcoinAddressType.P2WSH:
        // For demo, create SegWit script hash
        return this.generateP2WSHAddress(publicKey);

      case BitcoinAddressType.P2TR:
        return this.generateP2TRAddress(publicKey);

      default:
        throw new Error(`Unsupported address type: ${addressType}`);
    }
  }

  private generateP2PKHAddress(publicKey: Buffer): BitcoinAddressInfo {
    const payment = bitcoin.payments.p2pkh({
      pubkey: publicKey,
      network: this.network
    });

    if (!payment.address) {
      throw new Error('Failed to generate P2PKH address');
    }

    return {
      address: payment.address,
      type: BitcoinAddressType.P2PKH,
      pubkey: publicKey
    };
  }

  private generateP2SHAddress(pubkeys: Buffer[]): BitcoinAddressInfo {
    // Create 2-of-3 multisig for demonstration
    const additionalKeys = [
      Buffer.from('0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798', 'hex'),
      Buffer.from('02F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9', 'hex')
    ];

    const allPubkeys = [...pubkeys, ...additionalKeys.slice(0, 2)];
    const sortedPubkeys = allPubkeys.sort(Buffer.compare);

    const redeemScript = bitcoin.payments.p2ms({
      m: 2,
      pubkeys: sortedPubkeys,
      network: this.network
    });

    const payment = bitcoin.payments.p2sh({
      redeem: redeemScript,
      network: this.network
    });

    if (!payment.address) {
      throw new Error('Failed to generate P2SH address');
    }

    return {
      address: payment.address,
      type: BitcoinAddressType.P2SH,
      pubkey: pubkeys[0],
      redeemScript: redeemScript.output
    };
  }

  private generateP2WPKHAddress(publicKey: Buffer): BitcoinAddressInfo {
    const payment = bitcoin.payments.p2wpkh({
      pubkey: publicKey,
      network: this.network
    });

    if (!payment.address) {
      throw new Error('Failed to generate P2WPKH address');
    }

    return {
      address: payment.address,
      type: BitcoinAddressType.P2WPKH,
      pubkey: publicKey
    };
  }

  private generateP2WSHAddress(publicKey: Buffer): BitcoinAddressInfo {
    // Create simple single-sig witness script for demonstration
    const witnessScript = bitcoin.script.compile([publicKey, bitcoin.opcodes.OP_CHECKSIG]);

    const payment = bitcoin.payments.p2wsh({
      redeem: { output: witnessScript, network: this.network },
      network: this.network
    });

    if (!payment.address) {
      throw new Error('Failed to generate P2WSH address');
    }

    return {
      address: payment.address,
      type: BitcoinAddressType.P2WSH,
      pubkey: publicKey,
      witnessScript
    };
  }

  private generateP2TRAddress(publicKey: Buffer): BitcoinAddressInfo {
    try {
      // Taproot address generation
      // For simplicity, use the public key as internal key (in production, derive properly)
      const internalKey = publicKey.length === 33 ? publicKey.subarray(1) : publicKey;

      const payment = bitcoin.payments.p2tr({
        internalPubkey: internalKey,
        network: this.network
      });

      if (!payment.address) {
        throw new Error('Failed to generate P2TR address');
      }

      return {
        address: payment.address,
        type: BitcoinAddressType.P2TR,
        pubkey: publicKey,
        tapInternalKey: internalKey
      };
    } catch (error) {
      throw new Error(`Failed to generate Taproot address: ${error}`);
    }
  }

  // Address type detection and validation
  detectAddressType(address: string): BitcoinAddressType | null {
    try {
      // Legacy addresses (P2PKH and P2SH)
      if (/^[13]/.test(address)) {
        const decoded = bitcoin.address.fromBase58Check(address);
        if (decoded.version === this.network.pubKeyHash) {
          return BitcoinAddressType.P2PKH;
        } else if (decoded.version === this.network.scriptHash) {
          return BitcoinAddressType.P2SH;
        }
      }

      // Bech32 addresses (SegWit and Taproot)
      if (/^(bc1|tb1|bcrt1)/.test(address)) {
        try {
          const decoded = bitcoin.address.fromBech32(address);
          if (decoded.version === 0) {
            return decoded.data.length === 20 ? BitcoinAddressType.P2WPKH : BitcoinAddressType.P2WSH;
          } else if (decoded.version === 1) {
            return BitcoinAddressType.P2TR;
          }
        } catch {
          return null;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  isValidAddress(address: string): boolean {
    return this.detectAddressType(address) !== null;
  }

  // Enhanced transaction creation with address type support
  async createTransactionWithAddressType(
    fromAddressInfo: BitcoinAddressInfo,
    toAddress: string,
    amount: number, // in satoshis
    privateKey: string,
    feeRate?: number
  ): Promise<string> {
    this.validateConnection();

    if (!this.isValidAddress(fromAddressInfo.address) || !this.isValidAddress(toAddress)) {
      throw new Error('Invalid Bitcoin address');
    }

    try {
      const utxos = await this.getUTXOs(fromAddressInfo.address);
      const fee = feeRate || (await this.getFeeRate());

      // UTXO selection
      let totalInput = 0;
      const selectedUtxos: UTXO[] = [];
      const estimatedSize = this.estimateTransactionSize(fromAddressInfo.type, utxos.length, 2);
      const totalNeeded = amount + estimatedSize * fee;

      for (const utxo of utxos) {
        selectedUtxos.push(utxo);
        totalInput += utxo.value;
        if (totalInput >= totalNeeded) break;
      }

      if (totalInput < totalNeeded) {
        throw new Error('Insufficient funds');
      }

      // Create transaction based on address type
      return await this.buildTypedTransaction(
        selectedUtxos,
        fromAddressInfo,
        toAddress,
        amount,
        totalInput,
        fee,
        privateKey
      );
    } catch (error) {
      throw new Error(`Failed to create Bitcoin transaction: ${error}`);
    }
  }

  private estimateTransactionSize(addressType: BitcoinAddressType, inputCount: number, outputCount: number): number {
    const baseSize = 10; // version + locktime + input/output counts
    let inputSize = 0;
    const outputSize = outputCount * 34; // simplified avg output size

    switch (addressType) {
      case BitcoinAddressType.P2PKH:
        inputSize = inputCount * 148; // P2PKH input size
        break;
      case BitcoinAddressType.P2SH:
        inputSize = inputCount * 298; // P2SH multisig input (estimated)
        break;
      case BitcoinAddressType.P2WPKH:
        inputSize = inputCount * 68; // P2WPKH input size (witness discount)
        break;
      case BitcoinAddressType.P2WSH:
        inputSize = inputCount * 104; // P2WSH input size (estimated, witness discount)
        break;
      case BitcoinAddressType.P2TR:
        inputSize = inputCount * 57; // P2TR input size (witness discount)
        break;
    }

    return baseSize + inputSize + outputSize;
  }

  private async buildTypedTransaction(
    utxos: UTXO[],
    fromAddressInfo: BitcoinAddressInfo,
    toAddress: string,
    amount: number,
    totalInput: number,
    feeRate: number,
    privateKey: string
  ): Promise<string> {
    const keyPair = ECPair.fromWIF(privateKey, this.network);
    const psbt = new bitcoin.Psbt({ network: this.network });

    // Add inputs based on address type
    for (const utxo of utxos) {
      await this.addInputToPsbt(psbt, utxo, fromAddressInfo, keyPair);
    }

    // Add output to recipient
    psbt.addOutput({
      address: toAddress,
      value: amount
    });

    // Add change output if needed
    const estimatedSize = this.estimateTransactionSize(fromAddressInfo.type, utxos.length, 2);
    const fee = Math.ceil(estimatedSize * feeRate);
    const change = totalInput - amount - fee;

    if (change > 546) {
      // Dust threshold
      psbt.addOutput({
        address: fromAddressInfo.address,
        value: change
      });
    }

    // Sign inputs based on address type
    for (let i = 0; i < utxos.length; i++) {
      await this.signInputByType(psbt, i, fromAddressInfo, keyPair);
    }

    psbt.finalizeAllInputs();
    return psbt.extractTransaction().toHex();
  }

  private async addInputToPsbt(
    psbt: bitcoin.Psbt,
    utxo: UTXO,
    addressInfo: BitcoinAddressInfo,
    keyPair: any
  ): Promise<void> {
    const input: any = {
      hash: utxo.txid,
      index: utxo.vout
    };

    switch (addressInfo.type) {
      case BitcoinAddressType.P2PKH: {
        // P2PKH requires full previous transaction
        const prevTx = await this.getTransactionHex(utxo.txid);
        input.nonWitnessUtxo = Buffer.from(prevTx, 'hex');
        break;
      }

      case BitcoinAddressType.P2SH: {
        if (addressInfo.redeemScript) {
          input.redeemScript = addressInfo.redeemScript;
        }
        const prevTxP2SH = await this.getTransactionHex(utxo.txid);
        input.nonWitnessUtxo = Buffer.from(prevTxP2SH, 'hex');
        break;
      }

      case BitcoinAddressType.P2WPKH: {
        input.witnessUtxo = {
          script: bitcoin.payments.p2wpkh({
            pubkey: Buffer.from(keyPair.publicKey),
            network: this.network
          }).output!,
          value: utxo.value
        };
        break;
      }

      case BitcoinAddressType.P2WSH: {
        if (addressInfo.witnessScript) {
          input.witnessScript = addressInfo.witnessScript;
        }
        input.witnessUtxo = {
          script: bitcoin.payments.p2wsh({
            redeem: { output: addressInfo.witnessScript!, network: this.network },
            network: this.network
          }).output!,
          value: utxo.value
        };
        break;
      }

      case BitcoinAddressType.P2TR: {
        input.witnessUtxo = {
          script: bitcoin.payments.p2tr({
            internalPubkey: addressInfo.tapInternalKey!,
            network: this.network
          }).output!,
          value: utxo.value
        };
        if (addressInfo.tapInternalKey) {
          input.tapInternalKey = addressInfo.tapInternalKey;
        }
        break;
      }
    }

    psbt.addInput(input);
  }

  private async signInputByType(
    psbt: bitcoin.Psbt,
    inputIndex: number,
    addressInfo: BitcoinAddressInfo,
    keyPair: any
  ): Promise<void> {
    try {
      switch (addressInfo.type) {
        case BitcoinAddressType.P2PKH:
        case BitcoinAddressType.P2SH:
        case BitcoinAddressType.P2WPKH:
        case BitcoinAddressType.P2WSH:
          psbt.signInput(inputIndex, keyPair);
          break;

        case BitcoinAddressType.P2TR:
          // Taproot signing (key spend)
          psbt.signInput(inputIndex, keyPair);
          break;
      }
    } catch (error) {
      throw new Error(`Failed to sign input ${inputIndex}: ${error}`);
    }
  }

  private async getTransactionHex(txid: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/tx/${txid}/hex`);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction');
      }
      return await response.text();
    } catch (error) {
      throw new Error(`Failed to get transaction hex: ${error}`);
    }
  }

  async importAccount(privateKey: string): Promise<AccountInfo> {
    this.validateConnection();

    try {
      const keyPair = ECPair.fromWIF(privateKey, this.network);
      const { address } = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(keyPair.publicKey),
        network: this.network
      });

      if (!address) {
        throw new Error('Failed to derive address from private key');
      }

      const balance = await this.getBalance(address);

      return {
        address,
        balance,
        publicKey: Buffer.from(keyPair.publicKey).toString('hex')
      };
    } catch (error) {
      throw new Error(`Invalid Bitcoin private key: ${error}`);
    }
  }

  async getAccount(address: string): Promise<AccountInfo> {
    this.validateConnection();

    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid Bitcoin address: ${address}`);
    }

    const balance = await this.getBalance(address);

    return {
      address,
      balance
    };
  }

  async getBalance(address: string): Promise<bigint> {
    this.validateConnection();

    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid Bitcoin address: ${address}`);
    }

    try {
      const response = await fetch(`${this.apiUrl}/address/${address}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch balance');
      }

      // Balance is returned in satoshis, convert to bigint
      const balanceInSatoshis = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
      return BigInt(balanceInSatoshis);
    } catch (error) {
      throw new Error(`Failed to get Bitcoin balance: ${error}`);
    }
  }

  // Transaction operations
  async estimateGas(_params: TransactionParams): Promise<string> {
    this.validateConnection();

    // Bitcoin uses fees per byte, not gas
    // This is a simplified estimation
    const estimatedSize = 250; // Average transaction size in bytes
    const feeRate = await this.getFeeRate();
    const estimatedFee = estimatedSize * feeRate;

    return estimatedFee.toString();
  }

  async sendTransaction(_params: TransactionParams): Promise<TransactionResult> {
    this.validateConnection();

    // Note: This is a simplified implementation
    // In production, you'd need proper UTXO selection and signing
    throw new Error('Bitcoin transaction sending requires UTXO management - implement with BitcoinWalletManager');
  }

  async getTransaction(txHash: string): Promise<TransactionStatus> {
    this.validateConnection();

    try {
      const response = await fetch(`${this.apiUrl}/tx/${txHash}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transaction not found');
      }

      const currentBlock = await this.getCurrentBlockNumber();
      const confirmations = data.status.confirmed ? currentBlock - data.status.block_height + 1 : 0;

      return {
        status: data.status.confirmed ? 'confirmed' : 'pending',
        confirmations,
        blockNumber: data.status.block_height,
        timestamp: data.status.block_time
      };
    } catch (error) {
      throw new Error(`Failed to get Bitcoin transaction: ${error}`);
    }
  }

  async signMessage(message: string, privateKey: string): Promise<string> {
    try {
      const keyPair = ECPair.fromWIF(privateKey, this.network);
      const signature = keyPair.sign(Buffer.from(message, 'utf8'));
      return Buffer.from(signature).toString('hex');
    } catch (error) {
      throw new Error(`Bitcoin message signing failed: ${error}`);
    }
  }

  // Block operations
  async getCurrentBlockNumber(): Promise<number> {
    this.validateConnection();

    try {
      const response = await fetch(`${this.apiUrl}/blocks/tip/height`);
      const height = await response.text();

      if (!response.ok) {
        throw new Error('Failed to get block height');
      }

      return parseInt(height, 10);
    } catch (error) {
      throw new Error(`Failed to get Bitcoin block height: ${error}`);
    }
  }

  async getBlock(blockNumber: number): Promise<{
    number: number;
    timestamp: number;
    hash: string;
    transactions: string[];
  }> {
    this.validateConnection();

    try {
      // Get block hash first
      const hashResponse = await fetch(`${this.apiUrl}/block-height/${blockNumber}`);
      const blockHash = await hashResponse.text();

      if (!hashResponse.ok) {
        throw new Error('Block not found');
      }

      // Get block details
      const response = await fetch(`${this.apiUrl}/block/${blockHash}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get block');
      }

      return {
        number: blockNumber,
        timestamp: data.timestamp,
        hash: blockHash,
        transactions: data.tx || []
      };
    } catch (error) {
      throw new Error(`Failed to get Bitcoin block: ${error}`);
    }
  }

  // Utility methods
  formatAddress(address: string): string {
    // Bitcoin addresses are already in their canonical format
    return address;
  }

  getExplorerUrl(txHash: string): string {
    const baseUrls = {
      mainnet: 'https://blockstream.info',
      testnet: 'https://blockstream.info/testnet',
      regtest: 'http://localhost:3000' // Local explorer for regtest
    };

    const baseUrl = baseUrls[this.networkType as keyof typeof baseUrls];
    return `${baseUrl}/tx/${txHash}`;
  }

  // Bitcoin-specific methods
  async getUTXOs(address: string): Promise<UTXO[]> {
    this.validateConnection();

    try {
      const response = await fetch(`${this.apiUrl}/address/${address}/utxo`);
      const utxos = await response.json();

      if (!response.ok) {
        throw new Error('Failed to get UTXOs');
      }

      return utxos.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
        scriptPubKey: utxo.scriptpubkey,
        height: utxo.status.block_height
      }));
    } catch (error) {
      throw new Error(`Failed to get UTXOs: ${error}`);
    }
  }

  async getFeeRate(): Promise<number> {
    this.validateConnection();

    try {
      const response = await fetch(`${this.apiUrl}/fee-estimates`);
      const feeData = await response.json();

      if (!response.ok) {
        throw new Error('Failed to get fee estimates');
      }

      // Return fee rate for 6 block confirmation (sat/vB)
      return feeData['6'] || 10; // fallback to 10 sat/vB
    } catch (error) {
      console.warn('Failed to get fee rate, using default:', error);
      return 10; // Default fee rate
    }
  }

  async broadcastTransaction(rawTx: string): Promise<string> {
    this.validateConnection();

    try {
      const response = await fetch(`${this.apiUrl}/tx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: rawTx
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return await response.text(); // Returns transaction ID
    } catch (error) {
      throw new Error(`Failed to broadcast Bitcoin transaction: ${error}`);
    }
  }

  // Create a simple Bitcoin transaction (legacy-style; for production use PSBT flow above)
  async createTransaction(
    fromAddress: string,
    toAddress: string,
    amount: number, // in satoshis
    privateKey: string,
    feeRate?: number
  ): Promise<string> {
    this.validateConnection();

    if (!this.isValidAddress(fromAddress) || !this.isValidAddress(toAddress)) {
      throw new Error('Invalid Bitcoin address');
    }

    try {
      const utxos = await this.getUTXOs(fromAddress);
      const fee = feeRate || (await this.getFeeRate());

      // Simple UTXO selection (first-fit)
      let totalInput = 0;
      const selectedUtxos: UTXO[] = [];
      const estimatedSize = 250; // bytes
      const totalNeeded = amount + estimatedSize * fee;

      for (const utxo of utxos) {
        selectedUtxos.push(utxo);
        totalInput += utxo.value;
        if (totalInput >= totalNeeded) break;
      }

      if (totalInput < totalNeeded) {
        throw new Error('Insufficient funds');
      }

      // Use PSBT for signing instead of TransactionBuilder/Transaction
      const keyPair = ECPair.fromWIF(privateKey, this.network);
      const psbt = new bitcoin.Psbt({ network: this.network });

      // Inputs (assume P2PKH for this simple path)
      for (const utxo of selectedUtxos) {
        const prevTx = await this.getTransactionHex(utxo.txid);
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(prevTx, 'hex')
        });
      }

      // Outputs
      psbt.addOutput({
        address: toAddress,
        value: amount
      });

      const change = totalInput - amount - Math.ceil(estimatedSize * fee);
      if (change > 546) {
        psbt.addOutput({
          address: fromAddress,
          value: change
        });
      }

      // Sign all inputs
      for (let i = 0; i < selectedUtxos.length; i++) {
        psbt.signInput(i, keyPair);
      }

      psbt.finalizeAllInputs();
      return psbt.extractTransaction().toHex();
    } catch (error) {
      throw new Error(`Failed to create Bitcoin transaction: ${error}`);
    }
  }
}
