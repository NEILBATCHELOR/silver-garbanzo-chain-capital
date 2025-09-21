/**
 * Multi-Chain Address Validation Utilities
 * Per-Chain Address validation utilities following balances service pattern
 * 
 * Supports ALL chains from .env file:
 * EVM: Ethereum, Polygon, Optimism, Arbitrum, Base, BSC, ZKSync, Avalanche + testnets
 * Non-EVM: Bitcoin, Solana, Aptos, Sui, NEAR, Injective + testnets
 * Cosmos: Cosmos Hub, Osmosis, Juno, Secret Network + testnets
 */

import { rpcManager } from '../../infrastructure/web3/rpc/RPCConnectionManager';
import type { SupportedChain, NetworkType } from '../../infrastructure/web3/adapters/IBlockchainAdapter';

// Chain type enumeration
export enum ChainType {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon', 
  OPTIMISM = 'optimism',
  ARBITRUM = 'arbitrum',
  BASE = 'base',
  BSC = 'bsc',
  ZKSYNC = 'zksync',
  AVALANCHE = 'avalanche',
  BITCOIN = 'bitcoin',
  SOLANA = 'solana',
  APTOS = 'aptos',
  SUI = 'sui',
  NEAR = 'near',
  INJECTIVE = 'injective',
  COSMOS = 'cosmos',
  OSMOSIS = 'osmosis',
  JUNO = 'juno',
  SECRET = 'secret',
  AKASH = 'akash',
  EVMOS = 'evmos',
  STRIDE = 'stride',
  PERSISTENCE = 'persistence',
  QUICKSILVER = 'quicksilver',
  STARGAZE = 'stargaze',
  REGEN = 'regen',
  KAVA = 'kava',
  TERRA = 'terra',
  RIPPLE = 'ripple'
}

// Chain configuration interface
export interface ChainAddressConfig {
  chainId: number;
  chainName: string;
  chainType: ChainType;
  networkType: 'mainnet' | 'testnet' | 'devnet';
  addressFormat: 'evm' | 'bitcoin' | 'solana' | 'aptos' | 'sui' | 'near' | 'cosmos' | 'ripple';
  addressLength: number | number[]; // Single length or array of valid lengths
  prefix?: string;
  checksum?: boolean;
}

// Address validation result interface
export interface AddressValidationResult {
  isValid: boolean;
  chainType?: ChainType;
  addressFormat?: string;
  normalizedAddress?: string;
  error?: string;
}

// Chain configurations
const CHAIN_CONFIGS: ChainAddressConfig[] = [
  // Ethereum Mainnet & Testnets
  { chainId: 1, chainName: 'Ethereum', chainType: ChainType.ETHEREUM, networkType: 'mainnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  { chainId: 11155111, chainName: 'Sepolia', chainType: ChainType.ETHEREUM, networkType: 'testnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  { chainId: 17000, chainName: 'Holesky', chainType: ChainType.ETHEREUM, networkType: 'testnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  
  // Polygon Mainnet & Testnet  
  { chainId: 137, chainName: 'Polygon', chainType: ChainType.POLYGON, networkType: 'mainnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  { chainId: 80002, chainName: 'Amoy', chainType: ChainType.POLYGON, networkType: 'testnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  
  // Optimism Mainnet & Testnet
  { chainId: 10, chainName: 'Optimism', chainType: ChainType.OPTIMISM, networkType: 'mainnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  { chainId: 11155420, chainName: 'Optimism Sepolia', chainType: ChainType.OPTIMISM, networkType: 'testnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  
  // Arbitrum Mainnet & Testnet
  { chainId: 42161, chainName: 'Arbitrum', chainType: ChainType.ARBITRUM, networkType: 'mainnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  { chainId: 421614, chainName: 'Arbitrum Sepolia', chainType: ChainType.ARBITRUM, networkType: 'testnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  
  // Base Mainnet & Testnet
  { chainId: 8453, chainName: 'Base', chainType: ChainType.BASE, networkType: 'mainnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  { chainId: 84532, chainName: 'Base Sepolia', chainType: ChainType.BASE, networkType: 'testnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  
  // BSC Mainnet & Testnet
  { chainId: 56, chainName: 'BSC', chainType: ChainType.BSC, networkType: 'mainnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  { chainId: 97, chainName: 'BSC Testnet', chainType: ChainType.BSC, networkType: 'testnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  
  // ZkSync Mainnet & Testnet
  { chainId: 324, chainName: 'zkSync Era', chainType: ChainType.ZKSYNC, networkType: 'mainnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  { chainId: 300, chainName: 'zkSync Sepolia', chainType: ChainType.ZKSYNC, networkType: 'testnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  
  // Avalanche Mainnet & Testnet
  { chainId: 43114, chainName: 'Avalanche', chainType: ChainType.AVALANCHE, networkType: 'mainnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  { chainId: 43113, chainName: 'Avalanche Testnet', chainType: ChainType.AVALANCHE, networkType: 'testnet', addressFormat: 'evm', addressLength: 42, prefix: '0x', checksum: true },
  
  // Bitcoin Mainnet & Testnet
  { chainId: 0, chainName: 'Bitcoin', chainType: ChainType.BITCOIN, networkType: 'mainnet', addressFormat: 'bitcoin', addressLength: [26, 27, 34, 35, 42, 62], prefix: undefined },
  { chainId: 1, chainName: 'Bitcoin Testnet', chainType: ChainType.BITCOIN, networkType: 'testnet', addressFormat: 'bitcoin', addressLength: [26, 27, 34, 35, 42, 62], prefix: undefined },
  
  // Solana Mainnet & Devnet
  { chainId: 101, chainName: 'Solana', chainType: ChainType.SOLANA, networkType: 'mainnet', addressFormat: 'solana', addressLength: [32, 44], prefix: undefined },
  { chainId: 103, chainName: 'Solana Devnet', chainType: ChainType.SOLANA, networkType: 'devnet', addressFormat: 'solana', addressLength: [32, 44], prefix: undefined },
  
  // Aptos Mainnet & Testnet
  { chainId: 1, chainName: 'Aptos', chainType: ChainType.APTOS, networkType: 'mainnet', addressFormat: 'aptos', addressLength: 66, prefix: '0x' },
  { chainId: 2, chainName: 'Aptos Testnet', chainType: ChainType.APTOS, networkType: 'testnet', addressFormat: 'aptos', addressLength: 66, prefix: '0x' },
  
  // Sui Mainnet & Testnet
  { chainId: 1, chainName: 'Sui', chainType: ChainType.SUI, networkType: 'mainnet', addressFormat: 'sui', addressLength: 66, prefix: '0x' },
  { chainId: 2, chainName: 'Sui Testnet', chainType: ChainType.SUI, networkType: 'testnet', addressFormat: 'sui', addressLength: 66, prefix: '0x' },
  
  // NEAR Mainnet & Testnet
  { chainId: 1, chainName: 'NEAR', chainType: ChainType.NEAR, networkType: 'mainnet', addressFormat: 'near', addressLength: [2, 64], prefix: undefined },
  { chainId: 2, chainName: 'NEAR Testnet', chainType: ChainType.NEAR, networkType: 'testnet', addressFormat: 'near', addressLength: [2, 64], prefix: undefined },
  
  // Injective Mainnet & Testnet
  { chainId: 1, chainName: 'Injective', chainType: ChainType.INJECTIVE, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: 45, prefix: 'inj' },
  { chainId: 2, chainName: 'Injective Testnet', chainType: ChainType.INJECTIVE, networkType: 'testnet', addressFormat: 'cosmos', addressLength: 45, prefix: 'inj' },
  
  // Cosmos Hub Mainnet & Testnet
  { chainId: 1, chainName: 'Cosmos Hub', chainType: ChainType.COSMOS, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [45, 63], prefix: 'cosmos' },
  { chainId: 2, chainName: 'Cosmos Testnet', chainType: ChainType.COSMOS, networkType: 'testnet', addressFormat: 'cosmos', addressLength: [45, 63], prefix: 'cosmos' },
  
  // Osmosis Mainnet & Testnet
  { chainId: 1, chainName: 'Osmosis', chainType: ChainType.OSMOSIS, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [43, 63], prefix: 'osmo' },
  { chainId: 2, chainName: 'Osmosis Testnet', chainType: ChainType.OSMOSIS, networkType: 'testnet', addressFormat: 'cosmos', addressLength: [43, 63], prefix: 'osmo' },
  
  // Juno Mainnet & Testnet
  { chainId: 1, chainName: 'Juno', chainType: ChainType.JUNO, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [43, 63], prefix: 'juno' },
  { chainId: 2, chainName: 'Juno Testnet', chainType: ChainType.JUNO, networkType: 'testnet', addressFormat: 'cosmos', addressLength: [43, 63], prefix: 'juno' },
  
  // Secret Network Mainnet & Testnet
  { chainId: 1, chainName: 'Secret Network', chainType: ChainType.SECRET, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [45, 63], prefix: 'secret' },
  { chainId: 2, chainName: 'Secret Testnet', chainType: ChainType.SECRET, networkType: 'testnet', addressFormat: 'cosmos', addressLength: [45, 63], prefix: 'secret' },
  
  // Akash Network
  { chainId: 1, chainName: 'Akash', chainType: ChainType.AKASH, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [44, 63], prefix: 'akash' },
  
  // Evmos
  { chainId: 1, chainName: 'Evmos', chainType: ChainType.EVMOS, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [44, 63], prefix: 'evmos' },
  
  // Stride
  { chainId: 1, chainName: 'Stride', chainType: ChainType.STRIDE, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [45, 63], prefix: 'stride' },
  
  // Persistence
  { chainId: 1, chainName: 'Persistence', chainType: ChainType.PERSISTENCE, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [50, 63], prefix: 'persistence' },
  
  // Quicksilver
  { chainId: 1, chainName: 'Quicksilver', chainType: ChainType.QUICKSILVER, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [44, 63], prefix: 'quick' },
  
  // Stargaze
  { chainId: 1, chainName: 'Stargaze', chainType: ChainType.STARGAZE, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [44, 63], prefix: 'stars' },
  
  // Regen Network
  { chainId: 1, chainName: 'Regen', chainType: ChainType.REGEN, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [44, 63], prefix: 'regen' },
  
  // Kava
  { chainId: 1, chainName: 'Kava', chainType: ChainType.KAVA, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [43, 63], prefix: 'kava' },
  
  // Terra
  { chainId: 1, chainName: 'Terra', chainType: ChainType.TERRA, networkType: 'mainnet', addressFormat: 'cosmos', addressLength: [44, 63], prefix: 'terra' },
  
  // Ripple Mainnet & Testnet
  { chainId: 0, chainName: 'Ripple', chainType: ChainType.RIPPLE, networkType: 'mainnet', addressFormat: 'ripple', addressLength: [25, 34], prefix: 'r' },
  { chainId: 1, chainName: 'Ripple Testnet', chainType: ChainType.RIPPLE, networkType: 'testnet', addressFormat: 'ripple', addressLength: [25, 34], prefix: 'r' }
];

/**
 * Address Utilities Service
 * Main class for multi-chain address validation and utilities
 */
export class AddressUtilsService {
  private static instance: AddressUtilsService;
  private chainConfigs: Map<string, ChainAddressConfig[]>;

  constructor() {
    this.chainConfigs = new Map();
    this.initializeChainConfigs();
  }

  static getInstance(): AddressUtilsService {
    if (!AddressUtilsService.instance) {
      AddressUtilsService.instance = new AddressUtilsService();
    }
    return AddressUtilsService.instance;
  }

  private initializeChainConfigs(): void {
    CHAIN_CONFIGS.forEach(config => {
      const key = `${config.chainType}_${config.networkType}`;
      if (!this.chainConfigs.has(key)) {
        this.chainConfigs.set(key, []);
      }
      this.chainConfigs.get(key)!.push(config);
    });
  }

  /**
   * Validate address format for specific chain type
   */
  validateAddress(address: string, chainType: ChainType, networkType: 'mainnet' | 'testnet' | 'devnet' = 'mainnet'): AddressValidationResult {
    if (!address || typeof address !== 'string') {
      return { isValid: false, error: 'Address is required and must be a string' };
    }

    const key = `${chainType}_${networkType}`;
    const configs = this.chainConfigs.get(key) || [];
    
    if (configs.length === 0) {
      return { isValid: false, error: `Unsupported chain: ${chainType} on ${networkType}` };
    }

    // Try validating against each config for this chain type
    for (const config of configs) {
      const result = this.validateAddressFormat(address, config);
      if (result.isValid) {
        return {
          ...result,
          chainType,
          addressFormat: config.addressFormat
        };
      }
    }

    return { isValid: false, error: `Invalid ${chainType} address format on ${networkType}` };
  }

  /**
   * Detect chain type from address format
   */
  detectChainType(address: string): ChainType[] {
    const matchingChains: ChainType[] = [];

    for (const config of CHAIN_CONFIGS) {
      const result = this.validateAddressFormat(address, config);
      if (result.isValid) {
        matchingChains.push(config.chainType);
      }
    }

    return [...new Set(matchingChains)]; // Remove duplicates
  }

  /**
   * Format and display address for UI
   */
  formatAddressForDisplay(address: string, chainType?: ChainType, maxLength = 16): string {
    if (!address || address.length <= maxLength) {
      return address;
    }

    // For EVM chains, show checksum version if available
    if (chainType && this.isEVMChain(chainType)) {
      const normalized = this.normalizeEVMAddress(address);
      if (normalized) {
        address = normalized;
      }
    }

    const start = address.slice(0, 6);
    const end = address.slice(-4);
    return `${start}...${end}`;
  }

  /**
   * Check if chain type is EVM-based
   */
  isEVMChain(chainType: ChainType): boolean {
    const evmChains = [
      ChainType.ETHEREUM,
      ChainType.POLYGON,
      ChainType.OPTIMISM,
      ChainType.ARBITRUM,
      ChainType.BASE,
      ChainType.BSC,
      ChainType.ZKSYNC,
      ChainType.AVALANCHE
    ];
    return evmChains.includes(chainType);
  }

  /**
   * Check if chain type is Cosmos-based
   */
  isCosmosChain(chainType: ChainType): boolean {
    const cosmosChains = [
      ChainType.COSMOS,
      ChainType.OSMOSIS,
      ChainType.JUNO,
      ChainType.SECRET,
      ChainType.INJECTIVE,
      ChainType.AKASH,
      ChainType.EVMOS,
      ChainType.STRIDE,
      ChainType.PERSISTENCE,
      ChainType.QUICKSILVER,
      ChainType.STARGAZE,
      ChainType.REGEN,
      ChainType.KAVA,
      ChainType.TERRA
    ];
    return cosmosChains.includes(chainType);
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS
  // ============================================================================

  private validateAddressFormat(address: string, config: ChainAddressConfig): AddressValidationResult {
    switch (config.addressFormat) {
      case 'evm':
        return this.validateEVMAddress(address, config);
      case 'bitcoin':
        return this.validateBitcoinAddress(address, config);
      case 'solana':
        return this.validateSolanaAddress(address, config);
      case 'aptos':
        return this.validateAptosAddress(address, config);
      case 'sui':
        return this.validateSuiAddress(address, config);
      case 'near':
        return this.validateNearAddress(address, config);
      case 'cosmos':
        return this.validateCosmosAddress(address, config);
      case 'ripple':
        return this.validateRippleAddress(address, config);
      default:
        return { isValid: false, error: 'Unknown address format' };
    }
  }

  /**
   * Validate EVM address (Ethereum, Polygon, etc.)
   */
  private validateEVMAddress(address: string, config: ChainAddressConfig): AddressValidationResult {
    if (!config.prefix || !address.startsWith(config.prefix)) {
      return { isValid: false, error: 'EVM address must start with 0x' };
    }

    if (address.length !== config.addressLength) {
      return { isValid: false, error: `EVM address must be ${config.addressLength} characters long` };
    }

    const hexPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!hexPattern.test(address)) {
      return { isValid: false, error: 'Invalid EVM address format' };
    }

    // Validate checksum if required
    if (config.checksum && this.hasMixedCase(address)) {
      const isValidChecksum = this.validateEVMChecksum(address);
      if (!isValidChecksum) {
        return { isValid: false, error: 'Invalid EVM address checksum' };
      }
    }

    return { 
      isValid: true, 
      normalizedAddress: this.normalizeEVMAddress(address)
    };
  }

  /**
   * Validate Bitcoin address (P2PKH, P2SH, Bech32)
   */
  private validateBitcoinAddress(address: string, config: ChainAddressConfig): AddressValidationResult {
    const lengths = Array.isArray(config.addressLength) ? config.addressLength : [config.addressLength];
    
    if (!lengths.includes(address.length)) {
      return { isValid: false, error: `Bitcoin address length must be one of: ${lengths.join(', ')}` };
    }

    // Legacy P2PKH addresses (1...)
    if (address.startsWith('1')) {
      return this.validateBase58Address(address) 
        ? { isValid: true, normalizedAddress: address }
        : { isValid: false, error: 'Invalid P2PKH address' };
    }

    // P2SH addresses (3...)
    if (address.startsWith('3')) {
      return this.validateBase58Address(address)
        ? { isValid: true, normalizedAddress: address }
        : { isValid: false, error: 'Invalid P2SH address' };
    }

    // Bech32 addresses (bc1... or tb1...)
    if (address.startsWith('bc1') || address.startsWith('tb1')) {
      return this.validateBech32Address(address)
        ? { isValid: true, normalizedAddress: address.toLowerCase() }
        : { isValid: false, error: 'Invalid Bech32 address' };
    }

    return { isValid: false, error: 'Unknown Bitcoin address format' };
  }

  /**
   * Validate Solana address (Base58)
   */
  private validateSolanaAddress(address: string, config: ChainAddressConfig): AddressValidationResult {
    const lengths = Array.isArray(config.addressLength) ? config.addressLength : [config.addressLength];
    
    if (!lengths.includes(address.length)) {
      return { isValid: false, error: `Solana address length must be one of: ${lengths.join(', ')}` };
    }

    // Base58 validation
    const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Pattern.test(address)) {
      return { isValid: false, error: 'Invalid Solana address format' };
    }

    return { isValid: true, normalizedAddress: address };
  }

  /**
   * Validate Aptos address
   */
  private validateAptosAddress(address: string, config: ChainAddressConfig): AddressValidationResult {
    if (!config.prefix || !address.startsWith(config.prefix)) {
      return { isValid: false, error: 'Aptos address must start with 0x' };
    }

    // Allow both short (0x1) and long (0x000...1) format
    const hexPattern = /^0x[a-fA-F0-9]{1,64}$/;
    if (!hexPattern.test(address)) {
      return { isValid: false, error: 'Invalid Aptos address format' };
    }

    // Normalize to 66 characters (0x + 64 hex chars)
    let normalized = address;
    if (address.length < 66) {
      const padding = '0'.repeat(66 - address.length);
      normalized = '0x' + padding + address.slice(2);
    }

    return { isValid: true, normalizedAddress: normalized.toLowerCase() };
  }

  /**
   * Validate Sui address
   */
  private validateSuiAddress(address: string, config: ChainAddressConfig): AddressValidationResult {
    if (!config.prefix || !address.startsWith(config.prefix)) {
      return { isValid: false, error: 'Sui address must start with 0x' };
    }

    if (address.length !== config.addressLength) {
      return { isValid: false, error: `Sui address must be ${config.addressLength} characters long` };
    }

    const hexPattern = /^0x[a-fA-F0-9]{64}$/;
    if (!hexPattern.test(address)) {
      return { isValid: false, error: 'Invalid Sui address format' };
    }

    return { isValid: true, normalizedAddress: address.toLowerCase() };
  }

  /**
   * Validate NEAR address
   */
  private validateNearAddress(address: string, config: ChainAddressConfig): AddressValidationResult {
    const lengths = Array.isArray(config.addressLength) ? config.addressLength : [config.addressLength];
    
    // Implicit accounts (64 chars hex)
    if (address.length === 64) {
      const hexPattern = /^[0-9a-fA-F]{64}$/;
      if (!hexPattern.test(address)) {
        return { isValid: false, error: 'Invalid NEAR implicit account format' };
      }
      return { isValid: true, normalizedAddress: address.toLowerCase() };
    }

    // Named accounts (2-64 chars)
    if (address.length >= 2 && address.length <= 64) {
      const namedPattern = /^[a-z0-9._-]+$/;
      if (!namedPattern.test(address)) {
        return { isValid: false, error: 'Invalid NEAR named account format' };
      }
      return { isValid: true, normalizedAddress: address.toLowerCase() };
    }

    return { isValid: false, error: 'Invalid NEAR address format' };
  }

  /**
   * Validate Cosmos-based address (Cosmos Hub, Osmosis, Injective, etc.)
   */
  private validateCosmosAddress(address: string, config: ChainAddressConfig): AddressValidationResult {
    if (!config.prefix) {
      return { isValid: false, error: 'Cosmos address prefix not configured' };
    }

    if (!address.startsWith(config.prefix)) {
      return { isValid: false, error: `Address must start with ${config.prefix}` };
    }

    const lengths = Array.isArray(config.addressLength) ? config.addressLength : [config.addressLength];
    if (!lengths.includes(address.length)) {
      return { isValid: false, error: `Address must be one of these lengths: ${lengths.join(', ')} characters` };
    }

    // Validate Bech32 format
    if (!this.validateBech32Address(address)) {
      return { isValid: false, error: 'Invalid Bech32 format for Cosmos address' };
    }

    return { isValid: true, normalizedAddress: address };
  }

  /**
   * Validate Ripple address (X-Address and classic format)
   */
  private validateRippleAddress(address: string, config: ChainAddressConfig): AddressValidationResult {
    const lengths = Array.isArray(config.addressLength) ? config.addressLength : [config.addressLength];
    
    // Classic address format (starts with 'r')
    if (address.startsWith('r')) {
      if (!lengths.includes(address.length)) {
        return { isValid: false, error: `Ripple address must be one of these lengths: ${lengths.join(', ')} characters` };
      }
      
      // Validate Base58 format for classic addresses
      if (!this.validateBase58Address(address)) {
        return { isValid: false, error: 'Invalid Ripple classic address format' };
      }
      
      return { isValid: true, normalizedAddress: address };
    }
    
    // X-Address format (starts with 'X' for mainnet, 'T' for testnet)
    if (address.startsWith('X') || address.startsWith('T')) {
      // X-Addresses are typically 46-48 characters
      if (address.length < 46 || address.length > 48) {
        return { isValid: false, error: 'Invalid X-Address length' };
      }
      
      // Validate Base58 format
      if (!this.validateBase58Address(address)) {
        return { isValid: false, error: 'Invalid X-Address format' };
      }
      
      // Validate network consistency
      if (config.networkType === 'mainnet' && !address.startsWith('X')) {
        return { isValid: false, error: 'Mainnet X-Address must start with X' };
      }
      if (config.networkType === 'testnet' && !address.startsWith('T')) {
        return { isValid: false, error: 'Testnet X-Address must start with T' };
      }
      
      return { isValid: true, normalizedAddress: address };
    }
    
    return { isValid: false, error: 'Ripple address must start with r (classic) or X/T (X-Address)' };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private hasMixedCase(address: string): boolean {
    const withoutPrefix = address.slice(2);
    return withoutPrefix !== withoutPrefix.toLowerCase() && withoutPrefix !== withoutPrefix.toUpperCase();
  }

  private validateEVMChecksum(address: string): boolean {
    // Basic checksum validation
    // In production, use proper EIP-55 checksum validation
    return true;
  }

  private normalizeEVMAddress(address: string): string {
    // In production, implement proper checksum normalization
    return address.toLowerCase();
  }

  private validateBase58Address(address: string): boolean {
    const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Pattern.test(address);
  }

  private validateBech32Address(address: string): boolean {
    // Basic Bech32 validation
    const bech32Pattern = /^[a-z0-9]+1[a-z0-9]{38,}$/;
    return bech32Pattern.test(address.toLowerCase());
  }
}

// Export singleton instance
export const addressUtils = AddressUtilsService.getInstance();

// Export for backward compatibility
export default addressUtils;
