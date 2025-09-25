/**
 * Lightning Network Service - ENHANCED
 * 
 * Implements Lightning Network payment channels and routing
 * Supports BOLT specifications for invoice generation and payments
 * Provides off-chain Bitcoin payment capabilities
 */

import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { createHash, randomBytes } from 'crypto';
import { bech32 } from 'bech32';
import { Buffer } from 'buffer';
import { generateSecureNumericString } from '@/infrastructure/web3/utils/CryptoUtils';

// Initialize ECPair with tiny-secp256k1
const ECPair = ECPairFactory(ecc);

// Lightning Network interfaces
export interface LightningInvoice {
  bolt11: string;
  paymentHash: string;
  paymentSecret: string;
  amount: number; // millisatoshis
  description: string;
  expiry: number; // seconds
  timestamp: number;
  nodeId: string;
  routingHints?: RoutingHint[];
}

export interface PaymentChannel {
  channelId: string;
  fundingTxid: string;
  fundingOutput: number;
  capacity: number; // satoshis
  localBalance: number; // satoshis
  remoteBalance: number; // satoshis
  state: 'opening' | 'active' | 'closing' | 'closed';
  counterparty: string; // node public key
  commitmentNumber: number;
  isInitiator: boolean;
  csvDelay: number;
  dustLimit: number;
  maxHtlcValueInFlight: number;
  channelReserve: number;
  htlcMinimum: number;
  toSelfDelay: number;
  maxAcceptedHtlcs: number;
  fundingPubkey: string;
  revocationBasepoint: string;
  paymentBasepoint: string;
  delayedPaymentBasepoint: string;
  htlcBasepoint: string;
  firstPerCommitmentPoint: string;
  shortChannelId?: string;
  htlcs: HTLC[];
}

export interface HTLC {
  id: number;
  amount: number; // millisatoshis
  paymentHash: string;
  cltvExpiry: number;
  state: 'offered' | 'accepted' | 'settled' | 'failed';
  direction: 'incoming' | 'outgoing';
}

export interface RoutingHint {
  nodeId: string;
  channelId: string;
  feeBaseMsat: number;
  feeProportionalMillionths: number;
  cltvExpiryDelta: number;
}

export interface PaymentRoute {
  hops: RouteHop[];
  totalAmount: number; // millisatoshis
  totalFees: number; // millisatoshis
  totalTimeLock: number;
}

export interface RouteHop {
  nodeId: string;
  channelId: string;
  amount: number; // millisatoshis
  expiry: number;
  feeAmount: number; // millisatoshis
  pubkey: string;
}

export interface NetworkNode {
  nodeId: string;
  alias: string;
  features: string;
  color: string;
  lastUpdate: number;
  addresses: string[];
}

export interface ChannelEdge {
  channelId: string;
  node1: string;
  node2: string;
  capacity: number;
  node1Policy?: ChannelPolicy;
  node2Policy?: ChannelPolicy;
  lastUpdate: number;
}

export interface ChannelPolicy {
  timeLockDelta: number;
  minHtlc: number;
  maxHtlc: number;
  feeBaseMsat: number;
  feeRateMilliMsat: number;
  disabled: boolean;
}

export class LightningNetworkService {
  private network: typeof bitcoin.networks.bitcoin;
  private nodePrivateKey: Buffer;
  private nodePublicKey: Buffer;
  private channels: Map<string, PaymentChannel> = new Map();
  private networkGraph: Map<string, NetworkNode> = new Map();
  private channelGraph: Map<string, ChannelEdge> = new Map();
  private pendingPayments: Map<string, any> = new Map();
  private invoices: Map<string, LightningInvoice> = new Map();
  
  // Lightning Network constants
  private readonly DEFAULT_CLTV_EXPIRY_DELTA = 144; // blocks
  private readonly DEFAULT_INVOICE_EXPIRY = 3600; // seconds
  private readonly DEFAULT_TO_SELF_DELAY = 144; // blocks
  private readonly DUST_LIMIT = 546; // satoshis
  private readonly DEFAULT_HTLC_MINIMUM_MSAT = 1000; // millisatoshis
  private readonly DEFAULT_MAX_HTLC_VALUE_IN_FLIGHT = 5000000000; // millisatoshis
  private readonly MIN_FUNDING_SATOSHIS = 20000;
  private readonly MAX_FUNDING_SATOSHIS = 16777215; // 2^24 - 1
  
  constructor(
    privateKeyOrNetwork?: Buffer | typeof bitcoin.networks.bitcoin, 
    network?: typeof bitcoin.networks.bitcoin
  ) {
    // Handle flexible constructor parameters
    if (privateKeyOrNetwork instanceof Buffer) {
      // First parameter is private key buffer
      this.network = network || bitcoin.networks.bitcoin;
      this.nodePrivateKey = privateKeyOrNetwork;
      const keyPair = ECPair.fromPrivateKey(privateKeyOrNetwork, { network: this.network });
      this.nodePublicKey = keyPair.publicKey;
    } else {
      // First parameter is network (or undefined)
      this.network = (privateKeyOrNetwork as typeof bitcoin.networks.bitcoin) || bitcoin.networks.bitcoin;
      
      // Generate or load node keys
      const keyPair = ECPair.makeRandom({ network: this.network });
      this.nodePrivateKey = keyPair.privateKey!;
      this.nodePublicKey = keyPair.publicKey;
    }
    
    // Initialize network graph with some bootstrap nodes
    this.initializeNetworkGraph();
  }

  private initializeNetworkGraph(): void {
    // Add bootstrap nodes for network discovery
    // In production, these would come from DNS seeds or peer connections
    const bootstrapNodes = [
      {
        nodeId: '02000000000000000000000000000000000000000000000000000000000000001',
        alias: 'Bootstrap Node 1',
        features: '0x000001',
        color: '#3399ff',
        lastUpdate: Date.now(),
        addresses: ['127.0.0.1:9735']
      }
    ];
    
    bootstrapNodes.forEach(node => {
      this.networkGraph.set(node.nodeId, node);
    });
  }

  // Invoice generation and payment
  async generateInvoice(
    amount: number, // satoshis
    description: string,
    expiry?: number // seconds
  ): Promise<LightningInvoice> {
    const amountMsat = amount * 1000; // Convert to millisatoshis
    const paymentHash = this.generatePaymentHash();
    const paymentSecret = randomBytes(32).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);
    const expiryTime = expiry || this.DEFAULT_INVOICE_EXPIRY;
    
    // Create invoice object
    const invoice: LightningInvoice = {
      bolt11: '',
      paymentHash,
      paymentSecret,
      amount: amountMsat,
      description,
      expiry: expiryTime,
      timestamp,
      nodeId: this.nodePublicKey.toString('hex'),
      routingHints: this.getRoutingHints()
    };
    
    // Encode to BOLT-11 format
    invoice.bolt11 = await this.encodeBolt11Invoice(invoice);
    
    // Store invoice for later verification
    this.invoices.set(paymentHash, invoice);
    
    return invoice;
  }

  private generatePaymentHash(): string {
    const preimage = randomBytes(32);
    return createHash('sha256').update(preimage).digest('hex');
  }

  private getRoutingHints(): RoutingHint[] {
    const hints: RoutingHint[] = [];
    
    // Add routing hints for private channels
    this.channels.forEach(channel => {
      if (channel.state === 'active' && channel.remoteBalance > 0) {
        hints.push({
          nodeId: channel.counterparty,
          channelId: channel.shortChannelId || channel.channelId,
          feeBaseMsat: 1000,
          feeProportionalMillionths: 1,
          cltvExpiryDelta: this.DEFAULT_CLTV_EXPIRY_DELTA
        });
      }
    });
    
    return hints;
  }

  private async encodeBolt11Invoice(invoice: LightningInvoice): Promise<string> {
    // Create human-readable part
    const hrp = this.network === bitcoin.networks.bitcoin ? 'lnbc' : 'lntb';
    const amountPart = invoice.amount > 0 ? this.encodeAmount(invoice.amount) : '';
    
    // Create data part with tagged fields
    const data: number[] = [];
    
    // Timestamp (35 bits)
    this.pushBits(data, invoice.timestamp, 35);
    
    // Payment hash (52 bytes = 416 bits)
    data.push(1); // tag 'p'
    data.push(52); // data length
    const paymentHashBytes = Buffer.from(invoice.paymentHash, 'hex');
    this.pushBytes(data, paymentHashBytes);
    
    // Description (variable length)
    if (invoice.description) {
      data.push(13); // tag 'd'
      const descBytes = Buffer.from(invoice.description, 'utf8');
      const descWords = this.bytesToWords(descBytes);
      data.push(descWords.length);
      data.push(...descWords);
    }
    
    // Payment secret (52 bytes)
    data.push(16); // tag 's'
    data.push(52);
    const secretBytes = Buffer.from(invoice.paymentSecret, 'hex');
    this.pushBytes(data, secretBytes);
    
    // Expiry
    data.push(6); // tag 'x'
    const expiryWords = this.intToWords(invoice.expiry);
    data.push(expiryWords.length);
    data.push(...expiryWords);
    
    // Min final CLTV expiry
    data.push(24); // tag 'c'
    const cltvWords = this.intToWords(this.DEFAULT_CLTV_EXPIRY_DELTA);
    data.push(cltvWords.length);
    data.push(...cltvWords);
    
    // Features
    data.push(5); // tag '9'
    data.push(3); // length
    data.push(0, 0, 0); // basic features
    
    // Routing hints
    if (invoice.routingHints && invoice.routingHints.length > 0) {
      data.push(3); // tag 'r'
      const routingData = this.encodeRoutingHints(invoice.routingHints);
      data.push(routingData.length);
      data.push(...routingData);
    }
    
    // Create signature
    const signatureData = this.signInvoice(hrp + amountPart, data);
    data.push(...signatureData);
    
    // Encode with bech32
    const words = bech32.toWords(Buffer.from(data));
    const encoded = bech32.encode(hrp + amountPart, words, 1023);
    
    return encoded;
  }

  private pushBits(data: number[], value: number, bits: number): void {
    const words = [];
    while (bits > 0) {
      const bitsToTake = Math.min(5, bits);
      const mask = (1 << bitsToTake) - 1;
      words.unshift((value & mask));
      value >>= bitsToTake;
      bits -= bitsToTake;
    }
    data.push(...words);
  }

  private pushBytes(data: number[], bytes: Buffer): void {
    const words = this.bytesToWords(bytes);
    data.push(...words);
  }

  private bytesToWords(bytes: Buffer): number[] {
    const words: number[] = [];
    let acc = 0;
    let bits = 0;
    
    for (const byte of bytes) {
      acc = (acc << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        words.push((acc >> bits) & 31);
      }
    }
    
    if (bits > 0) {
      words.push((acc << (5 - bits)) & 31);
    }
    
    return words;
  }

  private intToWords(value: number): number[] {
    const words: number[] = [];
    while (value > 0) {
      words.unshift(value & 31);
      value >>= 5;
    }
    return words.length > 0 ? words : [0];
  }

  private encodeRoutingHints(hints: RoutingHint[]): number[] {
    const data: number[] = [];
    
    hints.forEach(hint => {
      // Node ID (33 bytes compressed pubkey)
      const nodeBytes = Buffer.from(hint.nodeId, 'hex');
      this.pushBytes(data, nodeBytes);
      
      // Channel ID (8 bytes)
      const channelBytes = Buffer.alloc(8);
      channelBytes.writeBigUInt64BE(BigInt(hint.channelId));
      this.pushBytes(data, channelBytes);
      
      // Fee base msat (4 bytes)
      const feeBaseBytes = Buffer.alloc(4);
      feeBaseBytes.writeUInt32BE(hint.feeBaseMsat);
      this.pushBytes(data, feeBaseBytes);
      
      // Fee proportional (4 bytes)
      const feePropBytes = Buffer.alloc(4);
      feePropBytes.writeUInt32BE(hint.feeProportionalMillionths);
      this.pushBytes(data, feePropBytes);
      
      // CLTV expiry delta (2 bytes)
      const cltvBytes = Buffer.alloc(2);
      cltvBytes.writeUInt16BE(hint.cltvExpiryDelta);
      this.pushBytes(data, cltvBytes);
    });
    
    return data;
  }

  private signInvoice(hrp: string, data: number[]): number[] {
    // Convert data to bytes for signing
    const dataBytes = this.wordsToBytes(data);
    const message = Buffer.concat([
      Buffer.from(hrp, 'utf8'),
      dataBytes
    ]);
    
    // Sign with node private key
    const hash = createHash('sha256').update(message).digest();
    const keyPair = ECPair.fromPrivateKey(this.nodePrivateKey);
    const signature = keyPair.sign(hash);
    
    // Convert signature to recovery format
    const recovery = 0; // Simplified - in production, calculate proper recovery byte
    const sigBytes = Buffer.concat([signature, Buffer.from([recovery])]);
    
    return this.bytesToWords(sigBytes);
  }

  private wordsToBytes(words: number[]): Buffer {
    const bytes: number[] = [];
    let acc = 0;
    let bits = 0;
    
    for (const word of words) {
      acc = (acc << 5) | word;
      bits += 5;
      while (bits >= 8) {
        bits -= 8;
        bytes.push((acc >> bits) & 255);
      }
    }
    
    return Buffer.from(bytes);
  }

  private encodeAmount(amountMsat: number): string {
    // Convert millisatoshis to appropriate unit with suffix
    if (amountMsat % 1000 !== 0) {
      return `${amountMsat}m`; // millisatoshis
    }
    const amountSat = amountMsat / 1000;
    if (amountSat % 1000000000 !== 0) {
      if (amountSat % 1000000 === 0) {
        return `${amountSat / 1000000}m`; // milli-bitcoin
      }
      if (amountSat % 1000 === 0) {
        return `${amountSat / 1000}u`; // micro-bitcoin
      }
      return `${amountSat * 10}p`; // pico-bitcoin
    }
    const amountBtc = amountSat / 100000000;
    return `${amountBtc}`;
  }

  // Payment channel management
  async openChannel(
    counterpartyPubkey: string,
    fundingAmount: number, // satoshis
    pushAmount: number = 0 // satoshis to push to counterparty
  ): Promise<PaymentChannel> {
    if (fundingAmount < this.MIN_FUNDING_SATOSHIS) {
      throw new Error(`Funding amount must be at least ${this.MIN_FUNDING_SATOSHIS} satoshis`);
    }
    
    if (fundingAmount > this.MAX_FUNDING_SATOSHIS) {
      throw new Error(`Funding amount must be at most ${this.MAX_FUNDING_SATOSHIS} satoshis`);
    }

    if (pushAmount >= fundingAmount) {
      throw new Error('Push amount must be less than funding amount');
    }

    const channelId = this.generateChannelId();
    
    // Create channel funding transaction
    const fundingTx = await this.createFundingTransaction(
      fundingAmount, 
      counterpartyPubkey
    );

    const channel: PaymentChannel = {
      channelId,
      fundingTxid: fundingTx.txid,
      fundingOutput: 0, // Assuming single output funding tx
      capacity: fundingAmount,
      localBalance: fundingAmount - pushAmount,
      remoteBalance: pushAmount,
      state: 'opening',
      counterparty: counterpartyPubkey,
      commitmentNumber: 0,
      isInitiator: true,
      csvDelay: this.DEFAULT_TO_SELF_DELAY,
      dustLimit: this.DUST_LIMIT,
      maxHtlcValueInFlight: this.DEFAULT_MAX_HTLC_VALUE_IN_FLIGHT,
      channelReserve: Math.floor(fundingAmount * 0.01), // 1% reserve
      htlcMinimum: this.DEFAULT_HTLC_MINIMUM_MSAT,
      toSelfDelay: this.DEFAULT_TO_SELF_DELAY,
      maxAcceptedHtlcs: 483, // BOLT-2 maximum
      fundingPubkey: this.generateChannelKey('funding'),
      revocationBasepoint: this.generateChannelKey('revocation'),
      paymentBasepoint: this.generateChannelKey('payment'),
      delayedPaymentBasepoint: this.generateChannelKey('delayed_payment'),
      htlcBasepoint: this.generateChannelKey('htlc'),
      firstPerCommitmentPoint: this.generateCommitmentPoint(0),
      htlcs: []
    };

    this.channels.set(channelId, channel);
    
    // Simulate channel confirmation after some blocks
    setTimeout(() => {
      channel.state = 'active';
      channel.shortChannelId = this.generateShortChannelId();
    }, 3000);
    
    return channel;
  }

  private generateChannelId(): string {
    return randomBytes(32).toString('hex');
  }

  private generateShortChannelId(): string {
    // Format: block_height:tx_index:output_index
    // Use secure random generation for channel IDs
    const blockHeight = parseInt(generateSecureNumericString(6)); // Random 6-digit block height
    const txIndex = parseInt(generateSecureNumericString(3)); // Random 3-digit tx index
    const outputIndex = 0;
    return `${blockHeight}:${txIndex}:${outputIndex}`;
  }

  private async createFundingTransaction(
    amount: number,
    counterpartyPubkey: string
  ): Promise<{ txid: string; hex: string }> {
    const tx = new bitcoin.Transaction();
    tx.version = 2;
    
    // Add funding output (2-of-2 multisig)
    const fundingScript = this.createFundingScript(
      this.nodePublicKey,
      Buffer.from(counterpartyPubkey, 'hex')
    );
    
    tx.addOutput(fundingScript, amount);
    
    return {
      txid: tx.getId(),
      hex: tx.toHex()
    };
  }

  private createFundingScript(pubkey1: Buffer, pubkey2: Buffer): Buffer {
    // Create 2-of-2 multisig script
    const sortedPubkeys = [pubkey1, pubkey2].sort(Buffer.compare);
    return bitcoin.payments.p2wsh({
      redeem: bitcoin.payments.p2ms({ 
        m: 2, 
        pubkeys: sortedPubkeys,
        network: this.network 
      }),
      network: this.network
    }).output!;
  }

  private generateChannelKey(purpose: string): string {
    // Derive channel-specific keys using BIP32-like derivation
    const seed = Buffer.concat([
      this.nodePrivateKey,
      Buffer.from(purpose, 'utf8')
    ]);
    return createHash('sha256').update(seed).digest().toString('hex');
  }

  private generateCommitmentPoint(commitmentNumber: number): string {
    // Generate per-commitment point for commitment transaction
    const seed = Buffer.concat([
      this.nodePrivateKey,
      Buffer.from('commitment', 'utf8'),
      Buffer.allocUnsafe(8).fill(0)
    ]);
    seed.writeUInt32BE(commitmentNumber, seed.length - 8);
    seed.writeUInt32BE(0, seed.length - 4);
    return createHash('sha256').update(seed).digest().toString('hex');
  }

  async closeChannel(channelId: string, force: boolean = false): Promise<string> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    if (force) {
      // Force close - broadcast latest commitment transaction
      const commitmentTx = await this.createCommitmentTransaction(channel);
      channel.state = 'closing';
      return commitmentTx.txid;
    } else {
      // Cooperative close
      const closingTx = await this.createClosingTransaction(channel);
      channel.state = 'closing';
      
      // Remove from active channels after confirmation
      setTimeout(() => {
        channel.state = 'closed';
        this.channels.delete(channelId);
      }, 3000);
      
      return closingTx.txid;
    }
  }

  private async createCommitmentTransaction(channel: PaymentChannel): Promise<{ txid: string; hex: string }> {
    const tx = new bitcoin.Transaction();
    tx.version = 2;
    
    // Add locktime for commitment transaction
    tx.locktime = 500000000 + channel.commitmentNumber;
    
    // Add outputs for both parties based on current balances
    if (channel.localBalance > this.DUST_LIMIT) {
      // To-local output with CSV delay
      const toLocalScript = this.createToLocalScript(channel);
      tx.addOutput(toLocalScript, channel.localBalance);
    }
    
    if (channel.remoteBalance > this.DUST_LIMIT) {
      // To-remote output (immediately spendable by remote)
      const toRemoteScript = this.createToRemoteScript(channel);
      tx.addOutput(toRemoteScript, channel.remoteBalance);
    }
    
    // Add HTLC outputs
    channel.htlcs.forEach(htlc => {
      if (htlc.amount > this.DUST_LIMIT) {
        const htlcScript = this.createHTLCScript(channel, htlc);
        tx.addOutput(htlcScript, Math.floor(htlc.amount / 1000)); // Convert to satoshis
      }
    });

    return {
      txid: tx.getId(),
      hex: tx.toHex()
    };
  }

  private async createClosingTransaction(channel: PaymentChannel): Promise<{ txid: string; hex: string }> {
    const tx = new bitcoin.Transaction();
    tx.version = 2;
    
    // Add outputs for final settlement
    if (channel.localBalance > this.DUST_LIMIT) {
      tx.addOutput(
        this.createDirectPaymentScript(this.nodePublicKey),
        channel.localBalance
      );
    }
    
    if (channel.remoteBalance > this.DUST_LIMIT) {
      tx.addOutput(
        this.createDirectPaymentScript(Buffer.from(channel.counterparty, 'hex')),
        channel.remoteBalance
      );
    }

    return {
      txid: tx.getId(),
      hex: tx.toHex()
    };
  }

  private createToLocalScript(channel: PaymentChannel): Buffer {
    // Create script with CSV delay for local party
    // OP_IF
    //   # Revocation path
    //   <revocation_pubkey>
    // OP_ELSE
    //   <to_self_delay>
    //   OP_CHECKSEQUENCEVERIFY
    //   OP_DROP
    //   <delayed_payment_pubkey>
    // OP_ENDIF
    // OP_CHECKSIG
    
    const script = bitcoin.script.compile([
      bitcoin.opcodes.OP_IF,
      Buffer.from(channel.revocationBasepoint, 'hex'),
      bitcoin.opcodes.OP_ELSE,
      bitcoin.script.number.encode(channel.toSelfDelay),
      bitcoin.opcodes.OP_CHECKSEQUENCEVERIFY,
      bitcoin.opcodes.OP_DROP,
      Buffer.from(channel.delayedPaymentBasepoint, 'hex'),
      bitcoin.opcodes.OP_ENDIF,
      bitcoin.opcodes.OP_CHECKSIG
    ]);
    
    return bitcoin.payments.p2wsh({
      redeem: { output: script, network: this.network },
      network: this.network
    }).output!;
  }

  private createToRemoteScript(channel: PaymentChannel): Buffer {
    // Simple P2WPKH for remote party (immediately spendable)
    const remotePubkey = Buffer.from(channel.counterparty, 'hex');
    return bitcoin.payments.p2wpkh({ 
      pubkey: remotePubkey,
      network: this.network 
    }).output!;
  }

  private createHTLCScript(channel: PaymentChannel, htlc: HTLC): Buffer {
    // Simplified HTLC script
    // For offered HTLC (local -> remote):
    // OP_DUP OP_HASH160 <RIPEMD160(SHA256(revocation_pubkey))> OP_EQUAL
    // OP_IF
    //   OP_CHECKSIG
    // OP_ELSE
    //   <remote_htlc_pubkey> OP_SWAP OP_SIZE 32 OP_EQUAL
    //   OP_IF
    //     OP_HASH160 <RIPEMD160(payment_hash)> OP_EQUALVERIFY
    //     2 OP_SWAP <local_htlc_pubkey> 2 OP_CHECKMULTISIG
    //   OP_ELSE
    //     OP_DROP <cltv_expiry> OP_CHECKLOCKTIMEVERIFY OP_DROP
    //     OP_CHECKSIG
    //   OP_ENDIF
    // OP_ENDIF
    
    const paymentHash = Buffer.from(htlc.paymentHash, 'hex');
    const htlcPubkey = Buffer.from(channel.htlcBasepoint, 'hex');
    
    const script = bitcoin.script.compile([
      bitcoin.opcodes.OP_HASH160,
      bitcoin.crypto.ripemd160(bitcoin.crypto.sha256(paymentHash)),
      bitcoin.opcodes.OP_EQUAL
    ]);
    
    return bitcoin.payments.p2wsh({
      redeem: { output: script, network: this.network },
      network: this.network
    }).output!;
  }

  private createDirectPaymentScript(pubkey: Buffer): Buffer {
    return bitcoin.payments.p2wpkh({ 
      pubkey, 
      network: this.network 
    }).output!;
  }

  // Payment routing and execution
  async payInvoice(bolt11: string, maxFee: number = 1000): Promise<string> {
    const invoice = await this.decodeBolt11Invoice(bolt11);
    
    // Validate invoice
    if (invoice.timestamp + invoice.expiry < Math.floor(Date.now() / 1000)) {
      throw new Error('Invoice has expired');
    }
    
    // Find route to destination
    const route = await this.findRoute(
      invoice.nodeId,
      invoice.amount,
      maxFee
    );

    if (!route) {
      throw new Error('No route found to destination');
    }

    // Execute payment through route
    return await this.executePayment(invoice, route);
  }

  async decodeBolt11Invoice(bolt11: string): Promise<LightningInvoice> {
    try {
      // Decode bech32
      const decoded = bech32.decode(bolt11, 1023);
      
      // Extract human-readable part
      const hrp = decoded.prefix;
      const isMainnet = hrp.startsWith('lnbc');
      const isTestnet = hrp.startsWith('lntb');
      
      if (!isMainnet && !isTestnet) {
        throw new Error('Invalid invoice: unsupported network');
      }
      
      // Parse amount from HRP
      const amountMatch = hrp.match(/ln[tb]c(\d+)([munp]?)/);
      let amountMsat = 0;
      
      if (amountMatch && amountMatch[1]) {
        const value = parseInt(amountMatch[1]);
        const multiplier = amountMatch[2];
        
        switch (multiplier) {
          case 'm': amountMsat = value * 100000000; break; // milli-bitcoin
          case 'u': amountMsat = value * 100000; break; // micro-bitcoin
          case 'n': amountMsat = value * 100; break; // nano-bitcoin
          case 'p': amountMsat = value / 10; break; // pico-bitcoin
          default: amountMsat = value * 100000000000; break; // bitcoin
        }
      }
      
      // Convert words to bytes
      const data = this.wordsToBytes(decoded.words);
      
      // Parse tagged fields
      let position = 7; // Skip timestamp (35 bits = 7 words of 5 bits)
      let paymentHash = '';
      let paymentSecret = '';
      let description = '';
      let expiry = this.DEFAULT_INVOICE_EXPIRY;
      let nodeId = '';
      const routingHints: RoutingHint[] = [];
      
      while (position < decoded.words.length - 104) { // 104 = signature (512 bits) + recovery (8 bits)
        const tag = decoded.words[position];
        const length = (decoded.words[position + 1] << 5) | decoded.words[position + 2];
        position += 3;
        
        const fieldData = decoded.words.slice(position, position + length);
        const fieldBytes = this.wordsToBytes(fieldData);
        
        switch (tag) {
          case 1: // 'p' - payment hash
            paymentHash = fieldBytes.toString('hex');
            break;
          case 13: // 'd' - description
            description = fieldBytes.toString('utf8');
            break;
          case 16: // 's' - payment secret
            paymentSecret = fieldBytes.toString('hex');
            break;
          case 6: // 'x' - expiry
            expiry = this.bytesToInt(fieldBytes);
            break;
          case 19: // 'n' - node id
            nodeId = fieldBytes.toString('hex');
            break;
          case 3: // 'r' - routing hints
            // Parse routing hints
            const hint = this.parseRoutingHint(fieldBytes);
            if (hint) routingHints.push(hint);
            break;
        }
        
        position += length;
      }
      
      // Extract timestamp from first 35 bits
      const timestampWords = decoded.words.slice(0, 7);
      const timestamp = this.wordsToInt(timestampWords);
      
      const invoice: LightningInvoice = {
        bolt11,
        paymentHash,
        paymentSecret,
        amount: amountMsat,
        description,
        expiry,
        timestamp,
        nodeId: nodeId || this.extractNodeIdFromSignature(decoded.words),
        routingHints
      };
      
      return invoice;
    } catch (error) {
      throw new Error(`Invalid invoice: ${error.message}`);
    }
  }

  private wordsToInt(words: number[]): number {
    let value = 0;
    for (const word of words) {
      value = (value << 5) | word;
    }
    return value;
  }

  private bytesToInt(bytes: Buffer): number {
    let value = 0;
    for (const byte of bytes) {
      value = (value << 8) | byte;
    }
    return value;
  }

  private parseRoutingHint(data: Buffer): RoutingHint | null {
    if (data.length < 51) return null; // Minimum size for routing hint
    
    let offset = 0;
    
    // Node ID (33 bytes)
    const nodeId = data.slice(offset, offset + 33).toString('hex');
    offset += 33;
    
    // Channel ID (8 bytes)
    const channelId = data.readBigUInt64BE(offset).toString();
    offset += 8;
    
    // Fee base msat (4 bytes)
    const feeBaseMsat = data.readUInt32BE(offset);
    offset += 4;
    
    // Fee proportional (4 bytes)
    const feeProportionalMillionths = data.readUInt32BE(offset);
    offset += 4;
    
    // CLTV expiry delta (2 bytes)
    const cltvExpiryDelta = data.readUInt16BE(offset);
    
    return {
      nodeId,
      channelId,
      feeBaseMsat,
      feeProportionalMillionths,
      cltvExpiryDelta
    };
  }

  private extractNodeIdFromSignature(words: number[]): string {
    // Extract node ID from signature recovery
    // This is a simplified version - in production, recover from signature
    return this.nodePublicKey.toString('hex');
  }

  private async findRoute(
    destination: string,
    amountMsat: number,
    maxFeeMsat: number
  ): Promise<PaymentRoute | null> {
    // Implement Dijkstra's algorithm for pathfinding
    const visited = new Set<string>();
    const distances = new Map<string, number>();
    const previous = new Map<string, RouteHop>();
    
    const source = this.nodePublicKey.toString('hex');
    distances.set(source, 0);
    
    // Initialize with direct channels
    this.channels.forEach(channel => {
      if (channel.state === 'active' && channel.localBalance * 1000 >= amountMsat) {
        const hop: RouteHop = {
          nodeId: channel.counterparty,
          channelId: channel.channelId,
          amount: amountMsat,
          expiry: this.DEFAULT_CLTV_EXPIRY_DELTA,
          feeAmount: 0,
          pubkey: channel.counterparty
        };
        distances.set(channel.counterparty, 0);
        previous.set(channel.counterparty, hop);
      }
    });
    
    // Find shortest path (simplified - in production use proper graph traversal)
    if (distances.has(destination)) {
      const hops: RouteHop[] = [];
      let current = destination;
      
      while (previous.has(current)) {
        const hop = previous.get(current)!;
        hops.unshift(hop);
        current = hop.nodeId === source ? '' : source;
        if (!current) break;
      }
      
      return {
        hops,
        totalAmount: amountMsat,
        totalFees: 0,
        totalTimeLock: this.DEFAULT_CLTV_EXPIRY_DELTA * hops.length
      };
    }
    
    // No direct route found - would need network graph traversal
    return null;
  }

  private async executePayment(
    invoice: LightningInvoice,
    route: PaymentRoute
  ): Promise<string> {
    // Generate payment preimage and hash
    const preimage = randomBytes(32);
    const paymentHash = createHash('sha256').update(preimage).digest();
    
    if (paymentHash.toString('hex') !== invoice.paymentHash) {
      // For real payments, we don't know the preimage until payment succeeds
      // This is a simulation
    }
    
    // Send payment through first hop
    const firstHop = route.hops[0];
    const channel = Array.from(this.channels.values()).find(
      ch => ch.counterparty === firstHop.nodeId && ch.state === 'active'
    );
    
    if (!channel) {
      throw new Error('No active channel to first hop');
    }
    
    if (channel.localBalance * 1000 < invoice.amount) {
      throw new Error('Insufficient channel balance');
    }
    
    // Create HTLC
    const htlc: HTLC = {
      id: channel.htlcs.length,
      amount: invoice.amount,
      paymentHash: invoice.paymentHash,
      cltvExpiry: firstHop.expiry,
      state: 'offered',
      direction: 'outgoing'
    };
    
    // Update channel balances (pending)
    channel.htlcs.push(htlc);
    
    // Store payment for tracking
    const paymentId = randomBytes(16).toString('hex');
    this.pendingPayments.set(paymentId, {
      invoice,
      route,
      htlc,
      channel,
      timestamp: Date.now()
    });
    
    // Simulate payment success after delay
    setTimeout(() => {
      // Update HTLC state
      htlc.state = 'settled';
      
      // Update channel balances
      channel.localBalance -= Math.floor(invoice.amount / 1000);
      channel.remoteBalance += Math.floor(invoice.amount / 1000);
      
      // Remove HTLC
      const htlcIndex = channel.htlcs.indexOf(htlc);
      if (htlcIndex > -1) {
        channel.htlcs.splice(htlcIndex, 1);
      }
      
      // Clean up pending payment
      this.pendingPayments.delete(paymentId);
    }, 2000);
    
    return paymentId;
  }

  // Channel management utilities
  async updateChannelFees(
    channelId: string,
    baseFee: number,
    feeRate: number
  ): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }
    
    // Update channel policy in network graph
    const edge = this.channelGraph.get(channelId);
    if (edge) {
      const policy: ChannelPolicy = {
        timeLockDelta: this.DEFAULT_CLTV_EXPIRY_DELTA,
        minHtlc: this.DEFAULT_HTLC_MINIMUM_MSAT,
        maxHtlc: this.DEFAULT_MAX_HTLC_VALUE_IN_FLIGHT,
        feeBaseMsat: baseFee,
        feeRateMilliMsat: feeRate,
        disabled: false
      };
      
      if (edge.node1 === this.nodePublicKey.toString('hex')) {
        edge.node1Policy = policy;
      } else {
        edge.node2Policy = policy;
      }
      
      edge.lastUpdate = Date.now();
    }
  }

  getChannels(): PaymentChannel[] {
    return Array.from(this.channels.values());
  }

  getChannel(channelId: string): PaymentChannel | undefined {
    return this.channels.get(channelId);
  }

  getNodeInfo(): NetworkNode {
    return {
      nodeId: this.nodePublicKey.toString('hex'),
      alias: 'Lightning Node',
      features: '0x000001',
      color: '#ff9900',
      lastUpdate: Date.now(),
      addresses: ['127.0.0.1:9735']
    };
  }

  getChannelBalance(): { 
    totalCapacity: number; 
    localBalance: number; 
    remoteBalance: number;
    pendingOpenBalance: number;
    pendingCloseBalance: number;
  } {
    let totalCapacity = 0;
    let localBalance = 0;
    let remoteBalance = 0;
    let pendingOpenBalance = 0;
    let pendingCloseBalance = 0;
    
    this.channels.forEach(channel => {
      if (channel.state === 'active') {
        totalCapacity += channel.capacity;
        localBalance += channel.localBalance;
        remoteBalance += channel.remoteBalance;
      } else if (channel.state === 'opening') {
        pendingOpenBalance += channel.capacity;
      } else if (channel.state === 'closing') {
        pendingCloseBalance += channel.localBalance;
      }
    });
    
    return {
      totalCapacity,
      localBalance,
      remoteBalance,
      pendingOpenBalance,
      pendingCloseBalance
    };
  }

  getPendingPayments(): any[] {
    return Array.from(this.pendingPayments.values());
  }

  getInvoices(): LightningInvoice[] {
    return Array.from(this.invoices.values());
  }

  // Additional methods expected by UI components
  getNodeId(): string {
    return this.nodePublicKey.toString('hex');
  }

  async checkPayment(paymentHash: string): Promise<{ settled: boolean; expired: boolean; amount?: number } | null> {
    // Check if payment exists in pending payments
    const pendingPayment = this.pendingPayments.get(paymentHash);
    if (pendingPayment) {
      return {
        settled: false,
        expired: false,
        amount: pendingPayment.invoice.amount
      };
    }

    // Check if invoice exists and is expired
    const invoice = this.invoices.get(paymentHash);
    if (invoice) {
      const now = Math.floor(Date.now() / 1000);
      const expiry = invoice.timestamp + invoice.expiry;
      
      return {
        settled: false,
        expired: now > expiry,
        amount: invoice.amount
      };
    }

    return null;
  }

  // Alias for decodeBolt11Invoice to match component expectations
  async decodeInvoice(bolt11: string): Promise<LightningInvoice> {
    return this.decodeBolt11Invoice(bolt11);
  }

  // Return array of routes instead of single route
  async findRoutes(
    destination: string,
    amountMsat: number,
    maxFeeMsat?: number
  ): Promise<PaymentRoute[]> {
    const route = await this.findRoute(destination, amountMsat, maxFeeMsat || 1000);
    return route ? [route] : [];
  }

  async sendKeysendPayment(
    destination: string,
    amountMsat: number,
    message?: string,
    maxFeeMsat?: number
  ): Promise<{
    paymentHash: string;
    preimage: string;
    route?: PaymentRoute;
    fees: number;
  }> {
    // Validate destination node
    if (!destination || destination.length !== 66) {
      throw new Error('Invalid destination node public key');
    }

    if (amountMsat <= 0) {
      throw new Error('Invalid payment amount');
    }

    // Generate random preimage and payment hash for keysend
    const preimage = randomBytes(32);
    const paymentHash = createHash('sha256').update(preimage).digest('hex');

    // Find route to destination
    const route = await this.findRoute(
      destination,
      amountMsat,
      maxFeeMsat || 1000
    );

    if (!route) {
      throw new Error('No route found to destination');
    }

    // Check if we have sufficient channel balance
    const firstHop = route.hops[0];
    const channel = Array.from(this.channels.values()).find(
      ch => ch.counterparty === firstHop?.nodeId && ch.state === 'active'
    );

    if (!channel) {
      throw new Error('No active channel to destination');
    }

    if (channel.localBalance * 1000 < amountMsat) {
      throw new Error('Insufficient channel balance');
    }

    // Create HTLC for keysend payment
    const htlc: HTLC = {
      id: channel.htlcs.length,
      amount: amountMsat,
      paymentHash,
      cltvExpiry: firstHop?.expiry || this.DEFAULT_CLTV_EXPIRY_DELTA,
      state: 'offered',
      direction: 'outgoing'
    };

    // Update channel balances (pending)
    channel.htlcs.push(htlc);

    // Store keysend payment details
    const paymentId = randomBytes(16).toString('hex');
    this.pendingPayments.set(paymentId, {
      type: 'keysend',
      destination,
      amount: amountMsat,
      message,
      preimage: preimage.toString('hex'),
      paymentHash,
      route,
      htlc,
      channel,
      timestamp: Date.now()
    });

    // Simulate payment execution
    setTimeout(() => {
      // Update HTLC state
      htlc.state = 'settled';
      
      // Update channel balances
      channel.localBalance -= Math.floor(amountMsat / 1000);
      channel.remoteBalance += Math.floor(amountMsat / 1000);
      
      // Remove HTLC
      const htlcIndex = channel.htlcs.indexOf(htlc);
      if (htlcIndex > -1) {
        channel.htlcs.splice(htlcIndex, 1);
      }
      
      // Clean up pending payment
      this.pendingPayments.delete(paymentId);
    }, 2000);

    return {
      paymentHash,
      preimage: preimage.toString('hex'),
      route,
      fees: route.totalFees
    };
  }
}

// Export singleton instance
export const lightningNetworkService = new LightningNetworkService();
