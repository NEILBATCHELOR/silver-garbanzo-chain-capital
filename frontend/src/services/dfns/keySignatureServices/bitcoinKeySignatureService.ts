/**
 * DFNS Bitcoin Key Signature Service
 * 
 * Specialized service for Bitcoin blockchain signature generation using DFNS keys
 * Supports Bitcoin, Litecoin, and other Bitcoin-compatible networks
 * 
 * Features:
 * - PSBT (Partially Signed Bitcoin Transaction) signing
 * - BIP-322 message signing
 * - Multi-network support (Bitcoin, Litecoin, Testnet)
 * - UTXO analysis helpers
 * - Transaction fee estimation
 * - Network-specific address validation
 * 
 * Reference: https://docs.dfns.co/d/api-docs/keys/generate-signature/bitcoin
 */

import type { WorkingDfnsClient } from '../../../infrastructure/dfns/working-client';
import { DfnsKeySignatureGenerationService } from './keySignatureGenerationService';
import type { DfnsKeySignatureResponse } from './keySignatureGenerationService';
import { DfnsError, DfnsValidationError } from '../../../types/dfns/errors';

// ==============================================
// BITCOIN-SPECIFIC TYPES
// ==============================================

export interface BitcoinPsbtInput {
  psbt: string; // Hex-encoded PSBT
  network?: BitcoinNetworkName;
  externalId?: string;
}

export interface BitcoinBip322Input {
  message: string; // Message to sign
  network: BitcoinNetworkName;
  format?: 'Simple' | 'Full';
  externalId?: string;
}

export interface BitcoinSignatureOptions {
  userActionToken?: string;
  syncToDatabase?: boolean;
  externalId?: string;
}

export interface BitcoinUtxo {
  txid: string;
  vout: number;
  value: number; // satoshis
  scriptPubKey: string;
  address?: string;
  confirmations?: number;
}

export interface BitcoinTransactionInput {
  from: string; // Source address
  to: string; // Destination address
  amount: number; // satoshis
  feeRate?: number; // satoshis per byte
  utxos?: BitcoinUtxo[];
  changeAddress?: string;
}

// ==============================================
// SUPPORTED BITCOIN NETWORKS
// ==============================================

export const BITCOIN_NETWORKS = {
  // Mainnet Networks
  Bitcoin: { 
    name: 'Bitcoin',
    isTestnet: false,
    addressPrefixes: ['1', '3', 'bc1'],
    bech32Prefix: 'bc'
  },
  Litecoin: { 
    name: 'Litecoin',
    isTestnet: false,
    addressPrefixes: ['L', 'M', '3', 'ltc1'],
    bech32Prefix: 'ltc'
  },
  
  // Testnet Networks
  BitcoinTestnet3: { 
    name: 'Bitcoin Testnet3',
    isTestnet: true,
    addressPrefixes: ['m', 'n', '2', 'tb1'],
    bech32Prefix: 'tb'
  },
  LitecoinTestnet: { 
    name: 'Litecoin Testnet',
    isTestnet: true,
    addressPrefixes: ['m', 'n', '2', 'tltc1'],
    bech32Prefix: 'tltc'
  }
} as const;

export type BitcoinNetworkName = keyof typeof BITCOIN_NETWORKS;

// ==============================================
// SERVICE IMPLEMENTATION
// ==============================================

export class DfnsBitcoinKeySignatureService {
  private keySignatureService: DfnsKeySignatureGenerationService;

  constructor(private client: WorkingDfnsClient) {
    this.keySignatureService = new DfnsKeySignatureGenerationService(client);
  }

  // ==============================================
  // PSBT SIGNING
  // ==============================================

  /**
   * Sign Bitcoin PSBT (Partially Signed Bitcoin Transaction)
   * 
   * @param keyId - DFNS key ID
   * @param psbtInput - PSBT signing input
   * @param options - Signing options
   * @returns Signature response
   */
  async signPsbt(
    keyId: string,
    psbtInput: BitcoinPsbtInput | string,
    options: BitcoinSignatureOptions = {}
  ): Promise<DfnsKeySignatureResponse> {
    try {
      const psbtHex = typeof psbtInput === 'string' ? psbtInput : psbtInput.psbt;
      
      this.validatePsbtHex(psbtHex);

      const response = await this.keySignatureService.signBitcoinPsbt(
        keyId,
        psbtHex,
        options.userActionToken
      );

      console.log(`✅ Bitcoin PSBT signed with key ${keyId}:`, {
        signatureId: response.id,
        status: response.status,
        network: typeof psbtInput === 'object' ? psbtInput.network : 'Unknown'
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to sign Bitcoin PSBT with key ${keyId}:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }

      throw new DfnsError(
        `Failed to sign Bitcoin PSBT: ${error}`,
        'BITCOIN_PSBT_SIGNING_FAILED',
        { keyId }
      );
    }
  }

  /**
   * Sign Bitcoin message using BIP-322
   * 
   * @param keyId - DFNS key ID
   * @param messageInput - BIP-322 message input
   * @param options - Signing options
   * @returns Signature response
   */
  async signBip322Message(
    keyId: string,
    messageInput: BitcoinBip322Input,
    options: BitcoinSignatureOptions = {}
  ): Promise<DfnsKeySignatureResponse> {
    try {
      this.validateBip322Input(messageInput);

      const messageHex = this.prepareMessageHex(messageInput.message);

      const response = await this.keySignatureService.signBitcoinBip322(
        keyId,
        messageInput.network,
        messageHex,
        messageInput.format || 'Simple',
        options.userActionToken
      );

      console.log(`✅ Bitcoin BIP-322 message signed with key ${keyId}:`, {
        signatureId: response.id,
        network: messageInput.network,
        format: messageInput.format || 'Simple',
        messageLength: messageInput.message.length
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to sign Bitcoin BIP-322 message with key ${keyId}:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }

      throw new DfnsError(
        `Failed to sign Bitcoin BIP-322 message: ${error}`,
        'BITCOIN_BIP322_SIGNING_FAILED',
        { keyId }
      );
    }
  }

  // ==============================================
  // NETWORK-SPECIFIC HELPERS
  // ==============================================

  /**
   * Get network information by name
   * 
   * @param networkName - Bitcoin network name
   * @returns Network information
   */
  getNetworkInfo(networkName: BitcoinNetworkName): typeof BITCOIN_NETWORKS[BitcoinNetworkName] {
    return BITCOIN_NETWORKS[networkName];
  }

  /**
   * Check if network is supported
   * 
   * @param networkName - Network name
   * @returns Whether network is supported
   */
  isNetworkSupported(networkName: string): networkName is BitcoinNetworkName {
    return networkName in BITCOIN_NETWORKS;
  }

  /**
   * Get all supported Bitcoin networks
   * 
   * @returns Array of supported networks
   */
  getSupportedNetworks(): Array<{
    networkName: BitcoinNetworkName;
    name: string;
    isTestnet: boolean;
    addressPrefixes: string[];
  }> {
    return Object.entries(BITCOIN_NETWORKS).map(([networkName, network]) => ({
      networkName: networkName as BitcoinNetworkName,
      ...network,
      addressPrefixes: [...network.addressPrefixes] // Convert readonly array to mutable
    }));
  }

  /**
   * Get mainnet networks only
   * 
   * @returns Mainnet Bitcoin networks
   */
  getMainnetNetworks(): Array<{
    networkName: BitcoinNetworkName;
    name: string;
  }> {
    return this.getSupportedNetworks()
      .filter(n => !n.isTestnet)
      .map(({ networkName, name }) => ({ networkName, name }));
  }

  /**
   * Get testnet networks only
   * 
   * @returns Testnet Bitcoin networks
   */
  getTestnetNetworks(): Array<{
    networkName: BitcoinNetworkName;
    name: string;
  }> {
    return this.getSupportedNetworks()
      .filter(n => n.isTestnet)
      .map(({ networkName, name }) => ({ networkName, name }));
  }

  // ==============================================
  // ADDRESS VALIDATION HELPERS
  // ==============================================

  /**
   * Validate Bitcoin address format for network
   * 
   * @param address - Bitcoin address
   * @param networkName - Network name
   * @returns Whether address is valid for network
   */
  validateAddressForNetwork(address: string, networkName: BitcoinNetworkName): boolean {
    const network = this.getNetworkInfo(networkName);
    
    // Check if address starts with valid prefix for network
    return network.addressPrefixes.some(prefix => address.startsWith(prefix));
  }

  /**
   * Detect network from Bitcoin address
   * 
   * @param address - Bitcoin address
   * @returns Possible networks for address
   */
  detectNetworkFromAddress(address: string): BitcoinNetworkName[] {
    const possibleNetworks: BitcoinNetworkName[] = [];

    for (const [networkName, network] of Object.entries(BITCOIN_NETWORKS)) {
      if (network.addressPrefixes.some(prefix => address.startsWith(prefix))) {
        possibleNetworks.push(networkName as BitcoinNetworkName);
      }
    }

    return possibleNetworks;
  }

  /**
   * Get address type from format
   * 
   * @param address - Bitcoin address
   * @returns Address type
   */
  getAddressType(address: string): 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'unknown' {
    if (address.startsWith('1') || address.startsWith('m') || address.startsWith('n')) {
      return 'p2pkh'; // Pay to Public Key Hash (Legacy)
    }
    
    if (address.startsWith('3') || address.startsWith('2')) {
      return 'p2sh'; // Pay to Script Hash
    }
    
    if (address.startsWith('bc1q') || address.startsWith('tb1q') || 
        address.startsWith('ltc1q') || address.startsWith('tltc1q')) {
      return 'p2wpkh'; // Pay to Witness Public Key Hash (Native SegWit)
    }
    
    if (address.startsWith('bc1p') || address.startsWith('tb1p') ||
        address.startsWith('ltc1p') || address.startsWith('tltc1p')) {
      return 'p2wsh'; // Pay to Witness Script Hash (Taproot)
    }

    return 'unknown';
  }

  // ==============================================
  // TRANSACTION BUILDING HELPERS
  // ==============================================

  /**
   * Estimate transaction fee
   * 
   * @param inputs - Number of inputs
   * @param outputs - Number of outputs
   * @param feeRate - Fee rate in satoshis per byte
   * @returns Estimated fee in satoshis
   */
  estimateTransactionFee(
    inputs: number,
    outputs: number,
    feeRate: number = 10
  ): number {
    // Simplified fee estimation
    // P2WPKH input: ~68 bytes, P2WPKH output: ~31 bytes, overhead: ~10 bytes
    const estimatedSize = (inputs * 68) + (outputs * 31) + 10;
    return estimatedSize * feeRate;
  }

  /**
   * Calculate change amount
   * 
   * @param totalInput - Total input amount in satoshis
   * @param sendAmount - Amount to send in satoshis
   * @param fee - Transaction fee in satoshis
   * @returns Change amount (0 if no change needed)
   */
  calculateChangeAmount(
    totalInput: number,
    sendAmount: number,
    fee: number
  ): number {
    const change = totalInput - sendAmount - fee;
    return change > 0 ? change : 0;
  }

  /**
   * Convert Bitcoin amount from BTC to satoshis
   * 
   * @param btc - Amount in BTC
   * @returns Amount in satoshis
   */
  btcToSatoshis(btc: number): number {
    return Math.round(btc * 100000000);
  }

  /**
   * Convert Bitcoin amount from satoshis to BTC
   * 
   * @param satoshis - Amount in satoshis
   * @returns Amount in BTC
   */
  satoshisToBtc(satoshis: number): number {
    return satoshis / 100000000;
  }

  // ==============================================
  // VALIDATION HELPERS
  // ==============================================

  /**
   * Validate PSBT hex format
   * 
   * @param psbtHex - Hex-encoded PSBT
   */
  private validatePsbtHex(psbtHex: string): void {
    if (!psbtHex.startsWith('0x')) {
      throw new DfnsValidationError('PSBT hex must start with 0x');
    }

    // PSBT magic bytes: 70736274ff (psbt + separator)
    if (!psbtHex.toLowerCase().includes('70736274ff')) {
      throw new DfnsValidationError('Invalid PSBT format - missing magic bytes');
    }

    const hexPattern = /^0x[0-9a-fA-F]+$/;
    if (!hexPattern.test(psbtHex)) {
      throw new DfnsValidationError('PSBT hex contains invalid characters');
    }
  }

  /**
   * Validate BIP-322 input
   * 
   * @param input - BIP-322 message input
   */
  private validateBip322Input(input: BitcoinBip322Input): void {
    if (!input.message || typeof input.message !== 'string') {
      throw new DfnsValidationError('BIP-322 message is required');
    }

    if (!input.network || !this.isNetworkSupported(input.network)) {
      throw new DfnsValidationError(`BIP-322 network must be one of: ${Object.keys(BITCOIN_NETWORKS).join(', ')}`);
    }

    if (input.format && !['Simple', 'Full'].includes(input.format)) {
      throw new DfnsValidationError('BIP-322 format must be "Simple" or "Full"');
    }
  }

  /**
   * Prepare message for signing (convert to hex if needed)
   * 
   * @param message - Message string or hex
   * @returns Hex-encoded message
   */
  private prepareMessageHex(message: string): string {
    if (message.startsWith('0x')) {
      return message;
    }

    // Convert string to hex
    const buffer = Buffer.from(message, 'utf8');
    return `0x${buffer.toString('hex')}`;
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  /**
   * Get Bitcoin signature statistics for key
   * 
   * @param keyId - Key ID
   * @returns Bitcoin-specific signature statistics
   */
  async getBitcoinSignatureStatistics(keyId: string): Promise<{
    total: number;
    psbt: number;
    bip322: number;
    byNetwork: Record<string, number>;
  }> {
    try {
      const allStats = await this.keySignatureService.getKeySignatureStatistics(keyId);
      
      // Filter for Bitcoin signatures only
      const bitcoinStats = {
        total: 0,
        psbt: 0,
        bip322: 0,
        byNetwork: {} as Record<string, number>
      };

      // Count Bitcoin blockchain signatures
      if (allStats.byBlockchain['Bitcoin']) {
        bitcoinStats.total = allStats.byBlockchain['Bitcoin'];
      }

      // Count by signature kind
      bitcoinStats.psbt = allStats.byKind['Psbt'] || 0;
      bitcoinStats.bip322 = allStats.byKind['Bip322'] || 0;

      return bitcoinStats;
    } catch (error) {
      throw new DfnsError(
        `Failed to get Bitcoin signature statistics: ${error}`,
        'BITCOIN_SIGNATURE_STATS_FAILED',
        { keyId }
      );
    }
  }

  /**
   * Get pending Bitcoin signature requests
   * 
   * @param keyId - Key ID
   * @returns Pending Bitcoin signature requests
   */
  async getPendingBitcoinSignatures(keyId: string): Promise<DfnsKeySignatureResponse[]> {
    try {
      const pendingSignatures = await this.keySignatureService.getPendingKeySignatures(keyId);
      
      // Filter for Bitcoin signatures only
      return pendingSignatures.filter(sig => 
        ('blockchainKind' in sig.requestBody && sig.requestBody.blockchainKind === 'Bitcoin') ||
        ('network' in sig.requestBody && this.isNetworkSupported(sig.requestBody.network as string))
      );
    } catch (error) {
      throw new DfnsError(
        `Failed to get pending Bitcoin signatures: ${error}`,
        'PENDING_BITCOIN_SIGNATURES_FAILED',
        { keyId }
      );
    }
  }

  /**
   * Check if key is compatible with Bitcoin networks
   * 
   * @param keyInfo - Key information with scheme and curve
   * @returns Whether key can sign Bitcoin transactions
   */
  isKeyCompatibleWithBitcoin(keyInfo: { scheme: string; curve: string }): boolean {
    // Bitcoin typically uses ECDSA with secp256k1
    return keyInfo.scheme === 'ECDSA' && keyInfo.curve === 'secp256k1';
  }
}

// ==============================================
// FACTORY FUNCTION
// ==============================================

/**
 * Create DFNS Bitcoin Key Signature Service instance
 * 
 * @param client - Working DFNS client
 * @returns Bitcoin key signature service
 */
export function getDfnsBitcoinKeySignatureService(client: WorkingDfnsClient): DfnsBitcoinKeySignatureService {
  return new DfnsBitcoinKeySignatureService(client);
}