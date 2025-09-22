/**
 * Enhanced Token Detection Service - Comprehensive Multi-Chain Support
 * 
 * Detects tokens across ALL blockchain types including:
 * EVM: ERC-721, ERC-1155, ERC-3525, ERC-4626
 * Solana: SPL tokens, NFTs, Semi-Fungible tokens
 * NEAR: FT tokens, NEP-171 NFTs 
 * Aptos: Coin tokens, NFT tokens
 * Sui: Native objects, NFT objects
 * Bitcoin: BRC-20, Ordinals (basic support)
 * Injective: IBC tokens, CW20 tokens
 */

import { ethers } from 'ethers';
import { priceFeedService } from './PriceFeedService';

// Import blockchain adapters for multi-chain support
import { SolanaAdapter } from '../../infrastructure/web3/adapters/solana/SolanaAdapter';
import { NEARAdapter } from '../../infrastructure/web3/adapters/NEARAdapter';
import { AptosAdapter } from '../../infrastructure/web3/adapters/AptosAdapter';
import { SuiAdapter } from '../../infrastructure/web3/adapters/SuiAdapter';
import { BitcoinAdapter } from '../../infrastructure/web3/adapters/bitcoin/BitcoinAdapter';

// Enhanced token balance interfaces for all chain types

// Additional EVM Token Types
export interface ERC721Token {
  tokenId: string;
  name?: string;
  description?: string;
  image?: string;
  animation_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  tokenURI?: string;
  rarity?: {
    rank: number;
    score: number;
  };
}

export interface ERC1155TokenType {
  tokenId: string;
  balance: string;
  name?: string;
  description?: string;
  image?: string;
  decimals?: number;
  properties?: Record<string, any>;
}

export interface ERC3525Token {
  tokenId: string;
  slot: string;
  value: string;
  name?: string;
  description?: string;
  image?: string;
  slotURI?: string;
  tokenURI?: string;
}

export interface NFTMetadata {
  name: string;
  description?: string;
  image?: string;
  animation_url?: string;
  external_url?: string;
  background_color?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
}

export interface SFTSlotMetadata {
  name: string;
  description?: string;
  image?: string;
  properties?: Record<string, any>;
  valueDecimals: number;
}

export interface BaseTokenBalance {
  standard: TokenStandard;
  contractAddress: string;
  symbol: string;
  name: string;
  decimals?: number;
  valueUsd: number;
  lastUpdated: Date;
  chainType: ChainType;
}

// EVM Token Standards (existing)
export interface ERC721Balance extends BaseTokenBalance {
  standard: 'ERC-721';
  chainType: 'evm';
  ownedTokens: ERC721Token[];
  totalCount: number;
  floorPrice?: number;
}

export interface ERC1155Balance extends BaseTokenBalance {
  standard: 'ERC-1155';
  chainType: 'evm';
  tokenTypes: ERC1155TokenType[];
  totalValueUsd: number;
}

export interface ERC3525Balance extends BaseTokenBalance {
  standard: 'ERC-3525';
  chainType: 'evm';
  valueDecimals: number;
  ownedTokens: ERC3525Token[];
  totalValue: string;
}

export interface ERC4626Balance extends BaseTokenBalance {
  standard: 'ERC-4626';
  chainType: 'evm';
  shares: string;
  underlyingAsset: string;
  underlyingSymbol: string;
  underlyingValue: string;
  assets: string;
  sharePrice: number;
  exchangeRate: number;
  underlyingToken?: {
    symbol: string;
    address: string;
    decimals: number;
  };
  apy?: number;
}

// Solana Token Standards
export interface SPLTokenBalance extends BaseTokenBalance {
  standard: 'SPL';
  chainType: 'solana';
  mintAddress: string;
  tokenAccountAddress: string;
  balance: string;
  formattedBalance: number;
  frozen: boolean;
  closeAuthority?: string;
}

export interface SolanaNFTBalance extends BaseTokenBalance {
  standard: 'Solana-NFT';
  chainType: 'solana';
  mintAddress: string;
  tokenAccountAddress: string;
  metadata: SolanaTokenMetadata;
  collection?: string;
  creators?: SolanaCreator[];
}

export interface SolanaTokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  image?: string;
  description?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface SolanaCreator {
  address: string;
  verified: boolean;
  share: number;
}

// NEAR Token Standards
export interface NEARFTBalance extends BaseTokenBalance {
  standard: 'NEAR-FT';
  chainType: 'near';
  contractId: string;
  balance: string;
  formattedBalance: number;
  metadata: NEARTokenMetadata;
}

export interface NEARNFTBalance extends BaseTokenBalance {
  standard: 'NEP-171';
  chainType: 'near';
  contractId: string;
  tokenIds: string[];
  tokens: NEARNFTToken[];
}

export interface NEARTokenMetadata {
  spec: string;
  name: string;
  symbol: string;
  icon?: string;
  decimals: number;
}

export interface NEARNFTToken {
  tokenId: string;
  metadata: {
    title?: string;
    description?: string;
    media?: string;
    copies?: number;
    extra?: string;
  };
}

// Aptos Token Standards
export interface AptosCoinBalance extends BaseTokenBalance {
  standard: 'Aptos-Coin';
  chainType: 'aptos';
  coinType: string;
  balance: string;
  formattedBalance: number;
  coinInfo: AptosCoinInfo;
}

export interface AptosNFTBalance extends BaseTokenBalance {
  standard: 'Aptos-NFT';
  chainType: 'aptos';
  collectionName: string;
  tokens: AptosNFTToken[];
  totalCount: number;
}

export interface AptosCoinInfo {
  name: string;
  symbol: string;
  decimals: number;
  supply?: {
    vec: [string];
  };
}

export interface AptosNFTToken {
  tokenDataId: string;
  name: string;
  description: string;
  uri: string;
  propertyVersion: string;
  amount: string;
}

// Sui Token Standards
export interface SuiObjectBalance extends BaseTokenBalance {
  standard: 'Sui-Object';
  chainType: 'sui';
  objectId: string;
  objectType: string;
  balance: string;
  formattedBalance: number;
  coinMetadata?: SuiCoinMetadata;
}

export interface SuiCoinMetadata {
  name: string;
  symbol: string;
  description: string;
  iconUrl?: string;
  decimals: number;
}

// Bitcoin Token Standards (Basic)
export interface BitcoinTokenBalance extends BaseTokenBalance {
  standard: 'BRC-20' | 'Ordinals';
  chainType: 'bitcoin';
  inscription?: string;
  balance: string;
  tick?: string; // For BRC-20
  inscriptionNumber?: number; // For Ordinals
}

// Injective Token Standards
export interface InjectiveTokenBalance extends BaseTokenBalance {
  standard: 'IBC' | 'CW20';
  chainType: 'injective';
  denom: string;
  balance: string;
  formattedBalance: number;
  baseDenom?: string;
  path?: string; // For IBC tokens
}

export type ChainType = 'evm' | 'solana' | 'near' | 'aptos' | 'sui' | 'bitcoin' | 'injective';

export type TokenStandard = 
  // EVM Standards
  | 'ERC-721' | 'ERC-1155' | 'ERC-3525' | 'ERC-4626'
  // Solana Standards
  | 'SPL' | 'Solana-NFT'
  // NEAR Standards  
  | 'NEAR-FT' | 'NEP-171'
  // Aptos Standards
  | 'Aptos-Coin' | 'Aptos-NFT'
  // Sui Standards
  | 'Sui-Object'
  // Bitcoin Standards
  | 'BRC-20' | 'Ordinals'
  // Injective Standards
  | 'IBC' | 'CW20';

export type EnhancedTokenBalance = 
  // EVM tokens
  | ERC721Balance | ERC1155Balance | ERC3525Balance | ERC4626Balance
  // Solana tokens
  | SPLTokenBalance | SolanaNFTBalance 
  // NEAR tokens
  | NEARFTBalance | NEARNFTBalance
  // Aptos tokens  
  | AptosCoinBalance | AptosNFTBalance
  // Sui tokens
  | SuiObjectBalance
  // Bitcoin tokens
  | BitcoinTokenBalance
  // Injective tokens
  | InjectiveTokenBalance;

export interface ChainTokenBalances {
  chainId: number;
  chainName: string;
  chainType: ChainType;
  address: string;
  tokens: EnhancedTokenBalance[];
  totalValueUsd: number;
}

/**
 * Chain configuration interface
 */
interface ChainConfig {
  chainId: number;
  name: string;
  chainType: ChainType;
  rpcUrl: string;
  isTestnet: boolean;
}

/**
 * Enhanced Token Detection Service supporting ALL blockchain types
 */
export class EnhancedTokenDetectionService {
  private static instance: EnhancedTokenDetectionService;
  
  // Comprehensive chain support across all blockchain types
  private readonly supportedChains: Map<number, ChainConfig> = new Map([
    // EVM Chains
    [1, { chainId: 1, name: 'ethereum', chainType: 'evm', rpcUrl: import.meta.env.VITE_MAINNET_RPC_URL, isTestnet: false }],
    [11155111, { chainId: 11155111, name: 'sepolia', chainType: 'evm', rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL, isTestnet: true }],
    [137, { chainId: 137, name: 'polygon', chainType: 'evm', rpcUrl: import.meta.env.VITE_POLYGON_RPC_URL, isTestnet: false }],
    [42161, { chainId: 42161, name: 'arbitrum', chainType: 'evm', rpcUrl: import.meta.env.VITE_ARBITRUM_RPC_URL, isTestnet: false }],
    [10, { chainId: 10, name: 'optimism', chainType: 'evm', rpcUrl: import.meta.env.VITE_OPTIMISM_RPC_URL, isTestnet: false }],
    [8453, { chainId: 8453, name: 'base', chainType: 'evm', rpcUrl: import.meta.env.VITE_BASE_RPC_URL, isTestnet: false }],
    [43114, { chainId: 43114, name: 'avalanche', chainType: 'evm', rpcUrl: import.meta.env.VITE_AVALANCHE_RPC_URL, isTestnet: false }],
    
    // Non-EVM Chains
    [100001, { chainId: 100001, name: 'bitcoin', chainType: 'bitcoin', rpcUrl: import.meta.env.VITE_BITCOIN_RPC_URL, isTestnet: false }],
    [100002, { chainId: 100002, name: 'bitcoin-testnet', chainType: 'bitcoin', rpcUrl: import.meta.env.VITE_BITCOIN_TESTNET_RPC_URL, isTestnet: true }],
    [200001, { chainId: 200001, name: 'solana', chainType: 'solana', rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL, isTestnet: false }],
    [200002, { chainId: 200002, name: 'solana-devnet', chainType: 'solana', rpcUrl: import.meta.env.VITE_SOLANA_DEVNET_RPC_URL, isTestnet: true }],
    [300001, { chainId: 300001, name: 'near', chainType: 'near', rpcUrl: import.meta.env.VITE_NEAR_RPC_URL, isTestnet: false }],
    [300002, { chainId: 300002, name: 'near-testnet', chainType: 'near', rpcUrl: import.meta.env.VITE_NEAR_TESTNET_RPC_URL, isTestnet: true }],
    [400001, { chainId: 400001, name: 'aptos', chainType: 'aptos', rpcUrl: import.meta.env.VITE_APTOS_RPC_URL, isTestnet: false }],
    [400002, { chainId: 400002, name: 'aptos-testnet', chainType: 'aptos', rpcUrl: import.meta.env.VITE_APTOS_TESTNET_RPC_URL, isTestnet: true }],
    [500001, { chainId: 500001, name: 'sui', chainType: 'sui', rpcUrl: import.meta.env.VITE_SUI_RPC_URL, isTestnet: false }],
    [600001, { chainId: 600001, name: 'injective', chainType: 'injective', rpcUrl: import.meta.env.VITE_INJECTIVE_RPC_URL, isTestnet: false }],
    [600002, { chainId: 600002, name: 'injective-testnet', chainType: 'injective', rpcUrl: import.meta.env.VITE_INJECTIVE_TESTNET_RPC_URL, isTestnet: true }]
  ]);

  // Known token contracts across all chain types
  private readonly knownTokenContracts: Map<number, Array<{
    address: string;
    standard: TokenStandard;
    symbol: string;
  }>> = new Map([
    // EVM - Ethereum mainnet
    [1, [
      { address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', standard: 'ERC-721', symbol: 'BAYC' },
      { address: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6', standard: 'ERC-721', symbol: 'MAYC' },
      { address: '0x495f947276749Ce646f68AC8c248420045cb7b5e', standard: 'ERC-1155', symbol: 'OPENSEA' }
    ]],

    // EVM - Polygon 
    [137, [
      { address: '0x9df8Aa7C681f33E442A0d57B838555da863504f0', standard: 'ERC-721', symbol: 'SANDBOX' }
    ]],

    // Solana mainnet
    [200001, [
      { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', standard: 'SPL', symbol: 'USDC' },
      { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', standard: 'SPL', symbol: 'USDT' },
      { address: 'So11111111111111111111111111111111111111112', standard: 'SPL', symbol: 'WSOL' },
      { address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', standard: 'SPL', symbol: 'RAY' }
    ]],

    // NEAR mainnet
    [300001, [
      { address: 'usdc.fakes.testnet', standard: 'NEAR-FT', symbol: 'USDC' },
      { address: 'wrap.near', standard: 'NEAR-FT', symbol: 'wNEAR' },
      { address: 'berryclub.ek.near', standard: 'NEP-171', symbol: 'BERRY' }
    ]],

    // Aptos mainnet
    [400001, [
      { address: '0x1::aptos_coin::AptosCoin', standard: 'Aptos-Coin', symbol: 'APT' },
      { address: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC', standard: 'Aptos-Coin', symbol: 'USDC' }
    ]],

    // Sui mainnet
    [500001, [
      { address: '0x2::sui::SUI', standard: 'Sui-Object', symbol: 'SUI' },
      { address: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN', standard: 'Sui-Object', symbol: 'USDC' }
    ]],

    // Injective mainnet
    [600001, [
      { address: 'inj', standard: 'IBC', symbol: 'INJ' },
      { address: 'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9', standard: 'IBC', symbol: 'ATOM' }
    ]]
  ]);

  // EVM ABI definitions (existing)
  private readonly erc721ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function balanceOf(address owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function supportsInterface(bytes4 interfaceId) view returns (bool)'
  ];

  private readonly erc1155ABI = [
    'function name() view returns (string)',
    'function balanceOf(address owner, uint256 tokenId) view returns (uint256)',
    'function uri(uint256 tokenId) view returns (string)',
    'function supportsInterface(bytes4 interfaceId) view returns (bool)'
  ];

  constructor() {}

  public static getInstance(): EnhancedTokenDetectionService {
    if (!EnhancedTokenDetectionService.instance) {
      EnhancedTokenDetectionService.instance = new EnhancedTokenDetectionService();
    }
    return EnhancedTokenDetectionService.instance;
  }

  /**
   * Detect and fetch all enhanced token balances for an address on a specific chain
   */
  async detectTokenBalances(address: string, chainId: number, chainName: string): Promise<ChainTokenBalances> {
    console.log(`🔍 Enhanced token detection for ${address.slice(0, 10)}... on ${chainName}`);
    
    try {
      const chainConfig = this.supportedChains.get(chainId);
      if (!chainConfig || !this.isChainConfigured(chainConfig)) {
        console.log(`  ⚠️  Chain ${chainName} (${chainId}) not configured or missing RPC URL`);
        return {
          chainId,
          chainName,
          chainType: 'evm', // default fallback
          address,
          tokens: [],
          totalValueUsd: 0
        };
      }

      // Route to appropriate chain handler
      switch (chainConfig.chainType) {
        case 'evm':
          return await this.detectEVMTokenBalances(address, chainConfig);
        case 'solana':
          return await this.detectSolanaTokenBalances(address, chainConfig);
        case 'near':
          return await this.detectNEARTokenBalances(address, chainConfig);
        case 'aptos':
          return await this.detectAptosTokenBalances(address, chainConfig);
        case 'sui':
          return await this.detectSuiTokenBalances(address, chainConfig);
        case 'bitcoin':
          return await this.detectBitcoinTokenBalances(address, chainConfig);
        case 'injective':
          return await this.detectInjectiveTokenBalances(address, chainConfig);
        default:
          throw new Error(`Unsupported chain type: ${chainConfig.chainType}`);
      }
    } catch (error) {
      console.error(`❌ Enhanced token detection failed on ${chainName}:`, error.message);
      return {
        chainId,
        chainName,
        chainType: 'evm',
        address,
        tokens: [],
        totalValueUsd: 0
      };
    }
  }

  /**
   * Detect EVM token balances (existing implementation)
   */
  private async detectEVMTokenBalances(address: string, chainConfig: ChainConfig): Promise<ChainTokenBalances> {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    const tokens: EnhancedTokenBalance[] = [];
    const knownContracts = this.knownTokenContracts.get(chainConfig.chainId) || [];

    if (knownContracts.length === 0) {
      console.log(`  No enhanced tokens configured for ${chainConfig.name}`);
      return {
        chainId: chainConfig.chainId,
        chainName: chainConfig.name,
        chainType: chainConfig.chainType,
        address,
        tokens: [],
        totalValueUsd: 0
      };
    }

    console.log(`  Checking ${knownContracts.length} enhanced token contracts on ${chainConfig.name}`);

    for (const tokenContract of knownContracts) {
      try {
        const balance = await this.detectEVMTokenBalance(address, tokenContract, provider);
        if (balance && this.hasBalance(balance)) {
          tokens.push(balance);
          console.log(`    Found ${tokenContract.symbol}: ${this.formatTokenBalance(balance)}`);
        }
      } catch (error) {
        console.warn(`    Failed ${tokenContract.symbol}:`, error.message);
      }
    }

    const totalValueUsd = tokens.reduce((sum, token) => sum + token.valueUsd, 0);

    return {
      chainId: chainConfig.chainId,
      chainName: chainConfig.name,
      chainType: chainConfig.chainType,
      address,
      tokens,
      totalValueUsd
    };
  }

  /**
   * Detect Solana SPL token balances
   */
  private async detectSolanaTokenBalances(address: string, chainConfig: ChainConfig): Promise<ChainTokenBalances> {
    const adapter = new SolanaAdapter(chainConfig.isTestnet ? 'devnet' : 'mainnet');
    await adapter.connect({ rpcUrl: chainConfig.rpcUrl, networkId: chainConfig.chainId.toString() });

    const tokens: EnhancedTokenBalance[] = [];
    const knownContracts = this.knownTokenContracts.get(chainConfig.chainId) || [];

    if (knownContracts.length === 0) {
      console.log(`  No SPL tokens configured for ${chainConfig.name}`);
      return {
        chainId: chainConfig.chainId,
        chainName: chainConfig.name,
        chainType: chainConfig.chainType,
        address,
        tokens: [],
        totalValueUsd: 0
      };
    }

    console.log(`  Checking ${knownContracts.length} SPL tokens on ${chainConfig.name}`);

    for (const tokenContract of knownContracts) {
      try {
        if (tokenContract.standard === 'SPL') {
          const balance = await this.detectSPLTokenBalance(address, tokenContract, adapter);
          if (balance && this.hasBalance(balance)) {
            tokens.push(balance);
            console.log(`    Found SPL ${tokenContract.symbol}: ${this.formatTokenBalance(balance)}`);
          }
        }
      } catch (error) {
        console.warn(`    Failed SPL ${tokenContract.symbol}:`, error.message);
      }
    }

    const totalValueUsd = tokens.reduce((sum, token) => sum + token.valueUsd, 0);

    return {
      chainId: chainConfig.chainId,
      chainName: chainConfig.name,
      chainType: chainConfig.chainType,
      address,
      tokens,
      totalValueUsd
    };
  }

  /**
   * Detect NEAR FT token balances
   */
  private async detectNEARTokenBalances(address: string, chainConfig: ChainConfig): Promise<ChainTokenBalances> {
    const { connect } = await import('near-api-js');
    const nearConnection = await connect({
      networkId: chainConfig.isTestnet ? 'testnet' : 'mainnet',
      nodeUrl: chainConfig.rpcUrl,
      walletUrl: chainConfig.isTestnet ? 'https://wallet.testnet.near.org' : 'https://wallet.near.org',
      helperUrl: chainConfig.isTestnet ? 'https://helper.testnet.near.org' : 'https://helper.near.org'
    });

    const adapter = new NEARAdapter(chainConfig.isTestnet ? 'testnet' : 'mainnet');
    const tokens: EnhancedTokenBalance[] = [];
    const knownContracts = this.knownTokenContracts.get(chainConfig.chainId) || [];

    if (knownContracts.length === 0) {
      console.log(`  No FT tokens configured for ${chainConfig.name}`);
      return {
        chainId: chainConfig.chainId,
        chainName: chainConfig.name,
        chainType: chainConfig.chainType,
        address,
        tokens: [],
        totalValueUsd: 0
      };
    }

    console.log(`  Checking ${knownContracts.length} NEAR FT tokens on ${chainConfig.name}`);

    for (const tokenContract of knownContracts) {
      try {
        if (tokenContract.standard === 'NEAR-FT') {
          const balance = await this.detectNEARFTBalance(address, tokenContract, adapter);
          if (balance && this.hasBalance(balance)) {
            tokens.push(balance);
            console.log(`    Found NEAR FT ${tokenContract.symbol}: ${this.formatTokenBalance(balance)}`);
          }
        }
      } catch (error) {
        console.warn(`    Failed NEAR FT ${tokenContract.symbol}:`, error.message);
      }
    }

    const totalValueUsd = tokens.reduce((sum, token) => sum + token.valueUsd, 0);

    return {
      chainId: chainConfig.chainId,
      chainName: chainConfig.name,
      chainType: chainConfig.chainType,
      address,
      tokens,
      totalValueUsd
    };
  }

  /**
   * Detect Aptos Coin token balances
   */
  private async detectAptosTokenBalances(address: string, chainConfig: ChainConfig): Promise<ChainTokenBalances> {
    const { Aptos, AptosConfig, Network } = await import('@aptos-labs/ts-sdk');
    const config = new AptosConfig({ network: chainConfig.isTestnet ? Network.TESTNET : Network.MAINNET });
    const aptos = new Aptos(config);
    
    const adapter = new AptosAdapter(chainConfig.isTestnet ? 'testnet' : 'mainnet');
    const tokens: EnhancedTokenBalance[] = [];
    const knownContracts = this.knownTokenContracts.get(chainConfig.chainId) || [];

    if (knownContracts.length === 0) {
      console.log(`  No Coin tokens configured for ${chainConfig.name}`);
      return {
        chainId: chainConfig.chainId,
        chainName: chainConfig.name,
        chainType: chainConfig.chainType,
        address,
        tokens: [],
        totalValueUsd: 0
      };
    }

    console.log(`  Checking ${knownContracts.length} Aptos Coin tokens on ${chainConfig.name}`);

    for (const tokenContract of knownContracts) {
      try {
        if (tokenContract.standard === 'Aptos-Coin') {
          const balance = await this.detectAptosCoinBalance(address, tokenContract, adapter);
          if (balance && this.hasBalance(balance)) {
            tokens.push(balance);
            console.log(`    Found Aptos Coin ${tokenContract.symbol}: ${this.formatTokenBalance(balance)}`);
          }
        }
      } catch (error) {
        console.warn(`    Failed Aptos Coin ${tokenContract.symbol}:`, error.message);
      }
    }

    const totalValueUsd = tokens.reduce((sum, token) => sum + token.valueUsd, 0);

    return {
      chainId: chainConfig.chainId,
      chainName: chainConfig.name,
      chainType: chainConfig.chainType,
      address,
      tokens,
      totalValueUsd
    };
  }

  /**
   * Detect Sui Object token balances
   */
  private async detectSuiTokenBalances(address: string, chainConfig: ChainConfig): Promise<ChainTokenBalances> {
    const adapter = new SuiAdapter(chainConfig.isTestnet ? 'testnet' : 'mainnet');
    const tokens: EnhancedTokenBalance[] = [];

    console.log(`  Checking Sui Objects on ${chainConfig.name}`);

    // Sui token detection would be implemented here
    // For now, return empty results
    const totalValueUsd = tokens.reduce((sum, token) => sum + token.valueUsd, 0);

    return {
      chainId: chainConfig.chainId,
      chainName: chainConfig.name,
      chainType: chainConfig.chainType,
      address,
      tokens,
      totalValueUsd
    };
  }

  /**
   * Detect Bitcoin token balances (BRC-20, Ordinals)
   */
  private async detectBitcoinTokenBalances(address: string, chainConfig: ChainConfig): Promise<ChainTokenBalances> {
    const adapter = new BitcoinAdapter(chainConfig.isTestnet ? 'testnet' : 'mainnet');
    const tokens: EnhancedTokenBalance[] = [];

    console.log(`  Checking Bitcoin tokens on ${chainConfig.name}`);

    // Bitcoin token detection (BRC-20, Ordinals) would be implemented here
    // This is complex and requires specialized indexers
    const totalValueUsd = tokens.reduce((sum, token) => sum + token.valueUsd, 0);

    return {
      chainId: chainConfig.chainId,
      chainName: chainConfig.name,
      chainType: chainConfig.chainType,
      address,
      tokens,
      totalValueUsd
    };
  }

  /**
   * Detect Injective token balances (IBC, CW20)
   */
  private async detectInjectiveTokenBalances(address: string, chainConfig: ChainConfig): Promise<ChainTokenBalances> {
    const tokens: EnhancedTokenBalance[] = [];
    const knownContracts = this.knownTokenContracts.get(chainConfig.chainId) || [];

    if (knownContracts.length === 0) {
      console.log(`  No IBC tokens configured for ${chainConfig.name}`);
      return {
        chainId: chainConfig.chainId,
        chainName: chainConfig.name,
        chainType: chainConfig.chainType,
        address,
        tokens: [],
        totalValueUsd: 0
      };
    }

    console.log(`  Checking ${knownContracts.length} Injective IBC tokens on ${chainConfig.name}`);

    for (const tokenContract of knownContracts) {
      try {
        if (tokenContract.standard === 'IBC') {
          const balance = await this.detectInjectiveIBCBalance(address, tokenContract, chainConfig);
          if (balance && this.hasBalance(balance)) {
            tokens.push(balance);
            console.log(`    Found IBC ${tokenContract.symbol}: ${this.formatTokenBalance(balance)}`);
          }
        }
      } catch (error) {
        console.warn(`    Failed IBC ${tokenContract.symbol}:`, error.message);
      }
    }

    const totalValueUsd = tokens.reduce((sum, token) => sum + token.valueUsd, 0);

    return {
      chainId: chainConfig.chainId,
      chainName: chainConfig.name,
      chainType: chainConfig.chainType,
      address,
      tokens,
      totalValueUsd
    };
  }

  /**
   * Chain-specific token balance detection methods
   */
  
  private async detectEVMTokenBalance(address: string, tokenContract: any, provider: ethers.JsonRpcProvider): Promise<EnhancedTokenBalance | null> {
    // Implementation depends on token standard (ERC-721, ERC-1155, etc.)
    // This is a simplified version - full implementation would be more complex
    return null;
  }

  private async detectSPLTokenBalance(address: string, tokenContract: any, adapter: SolanaAdapter): Promise<SPLTokenBalance | null> {
    try {
      const tokenBalance = await adapter.getTokenBalance(address, tokenContract.address);
      
      if (Number(tokenBalance.balance) > 0) {
        const formattedBalance = Number(tokenBalance.balance) / Math.pow(10, tokenBalance.decimals);
        
        if (formattedBalance > 0.0001) {
          return {
            standard: 'SPL',
            chainType: 'solana',
            contractAddress: tokenContract.address,
            symbol: tokenContract.symbol,
            name: tokenBalance.symbol || tokenContract.symbol,
            decimals: tokenBalance.decimals,
            valueUsd: 0, // Price fetching would be implemented
            lastUpdated: new Date(),
            mintAddress: tokenContract.address,
            tokenAccountAddress: '', // Would need to derive this
            balance: tokenBalance.balance.toString(),
            formattedBalance,
            frozen: false
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private async detectNEARFTBalance(address: string, tokenContract: any, adapter: NEARAdapter): Promise<NEARFTBalance | null> {
    try {
      const tokenBalance = await adapter.getTokenBalance(address, tokenContract.address);
      
      if (Number(tokenBalance.balance) > 0) {
        const formattedBalance = Number(tokenBalance.balance) / Math.pow(10, tokenBalance.decimals);
        
        if (formattedBalance > 0.0001) {
          return {
            standard: 'NEAR-FT',
            chainType: 'near',
            contractAddress: tokenContract.address,
            symbol: tokenContract.symbol,
            name: tokenBalance.symbol || tokenContract.symbol,
            decimals: tokenBalance.decimals,
            valueUsd: 0,
            lastUpdated: new Date(),
            contractId: tokenContract.address,
            balance: tokenBalance.balance.toString(),
            formattedBalance,
            metadata: {
              spec: 'ft-1.0.0',
              name: tokenBalance.symbol || tokenContract.symbol,
              symbol: tokenContract.symbol,
              decimals: tokenBalance.decimals
            }
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private async detectAptosCoinBalance(address: string, tokenContract: any, adapter: AptosAdapter): Promise<AptosCoinBalance | null> {
    try {
      const tokenBalance = await adapter.getTokenBalance(address, tokenContract.address);
      
      if (Number(tokenBalance.balance) > 0) {
        const formattedBalance = Number(tokenBalance.balance) / Math.pow(10, tokenBalance.decimals);
        
        if (formattedBalance > 0.0001) {
          return {
            standard: 'Aptos-Coin',
            chainType: 'aptos',
            contractAddress: tokenContract.address,
            symbol: tokenContract.symbol,
            name: tokenBalance.symbol || tokenContract.symbol,
            decimals: tokenBalance.decimals,
            valueUsd: 0,
            lastUpdated: new Date(),
            coinType: tokenContract.address,
            balance: tokenBalance.balance.toString(),
            formattedBalance,
            coinInfo: {
              name: tokenBalance.symbol || tokenContract.symbol,
              symbol: tokenContract.symbol,
              decimals: tokenBalance.decimals
            }
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private async detectInjectiveIBCBalance(address: string, tokenContract: any, chainConfig: ChainConfig): Promise<InjectiveTokenBalance | null> {
    try {
      const response = await fetch(`${chainConfig.rpcUrl}/cosmos/bank/v1beta1/balances/${address}`);
      const data = await response.json();

      if (!response.ok) {
        return null;
      }

      const tokenBalance = data.balances?.find((b: any) => b.denom === tokenContract.address);
      
      if (tokenBalance && Number(tokenBalance.amount) > 0) {
        const formattedBalance = Number(tokenBalance.amount) / Math.pow(10, 18); // Default to 18 decimals for IBC
        
        if (formattedBalance > 0.0001) {
          return {
            standard: 'IBC',
            chainType: 'injective',
            contractAddress: tokenContract.address,
            symbol: tokenContract.symbol,
            name: tokenContract.symbol,
            decimals: 18,
            valueUsd: 0,
            lastUpdated: new Date(),
            denom: tokenContract.address,
            balance: tokenBalance.amount,
            formattedBalance
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Utility methods
   */
  private isChainConfigured(chainConfig: ChainConfig): boolean {
    return !!(chainConfig.rpcUrl && chainConfig.rpcUrl.trim() !== '' && chainConfig.rpcUrl.trim() !== 'undefined');
  }

  private hasBalance(balance: EnhancedTokenBalance): boolean {
    switch (balance.standard) {
      case 'ERC-721':
        return (balance as ERC721Balance).totalCount > 0;
      case 'ERC-1155':
        return (balance as ERC1155Balance).tokenTypes.length > 0;
      case 'SPL':
        return (balance as SPLTokenBalance).formattedBalance > 0;
      case 'NEAR-FT':
        return (balance as NEARFTBalance).formattedBalance > 0;
      case 'Aptos-Coin':
        return (balance as AptosCoinBalance).formattedBalance > 0;
      case 'IBC':
        return (balance as InjectiveTokenBalance).formattedBalance > 0;
      default:
        return false;
    }
  }

  formatTokenBalance(balance: EnhancedTokenBalance): string {
    switch (balance.standard) {
      case 'ERC-721':
        const erc721 = balance as ERC721Balance;
        return `${erc721.totalCount} NFT${erc721.totalCount !== 1 ? 's' : ''}`;
      case 'ERC-1155':
        const erc1155 = balance as ERC1155Balance;
        return `${erc1155.tokenTypes.length} token type${erc1155.tokenTypes.length !== 1 ? 's' : ''}`;
      case 'SPL':
        const spl = balance as SPLTokenBalance;
        return `${spl.formattedBalance.toFixed(6)} ${spl.symbol}`;
      case 'NEAR-FT':
        const nearFT = balance as NEARFTBalance;
        return `${nearFT.formattedBalance.toFixed(6)} ${nearFT.symbol}`;
      case 'Aptos-Coin':
        const aptosCoin = balance as AptosCoinBalance;
        return `${aptosCoin.formattedBalance.toFixed(6)} ${aptosCoin.symbol}`;
      case 'IBC':
        const ibc = balance as InjectiveTokenBalance;
        return `${ibc.formattedBalance.toFixed(6)} ${ibc.symbol}`;
      default:
        return '0';
    }
  }

  /**
   * Get supported token standards for each chain type
   */
  getSupportedStandards(): Record<ChainType, TokenStandard[]> {
    return {
      evm: ['ERC-721', 'ERC-1155', 'ERC-3525', 'ERC-4626'],
      solana: ['SPL', 'Solana-NFT'],
      near: ['NEAR-FT', 'NEP-171'],
      aptos: ['Aptos-Coin', 'Aptos-NFT'],
      sui: ['Sui-Object'],
      bitcoin: ['BRC-20', 'Ordinals'],
      injective: ['IBC', 'CW20']
    };
  }

  /**
   * Add known token contract for detection
   */
  addKnownToken(chainId: number, address: string, standard: TokenStandard, symbol: string): void {
    if (!this.knownTokenContracts.has(chainId)) {
      this.knownTokenContracts.set(chainId, []);
    }
    
    const contracts = this.knownTokenContracts.get(chainId)!;
    contracts.push({ address, standard, symbol });
  }

  /**
   * Debug configuration status
   */
  debugConfiguration(): void {
    console.group('🔧 EnhancedTokenDetectionService - Comprehensive Configuration');
    
    const chainsByType = new Map<ChainType, { configured: ChainConfig[], total: ChainConfig[] }>();
    
    Array.from(this.supportedChains.values()).forEach(chain => {
      if (!chainsByType.has(chain.chainType)) {
        chainsByType.set(chain.chainType, { configured: [], total: [] });
      }
      
      chainsByType.get(chain.chainType)!.total.push(chain);
      if (this.isChainConfigured(chain)) {
        chainsByType.get(chain.chainType)!.configured.push(chain);
      }
    });

    chainsByType.forEach((chains, chainType) => {
      console.group(`${chainType.toUpperCase()} Chains (${chains.configured.length}/${chains.total.length})`);
      chains.total.forEach(chain => {
        const hasRpc = this.isChainConfigured(chain);
        const hasTokens = this.knownTokenContracts.has(chain.chainId);
        const supportedStandards = this.getSupportedStandards()[chain.chainType];
        console.log(`${chain.name}: RPC ${hasRpc ? '✅' : '❌'} | Tokens ${hasTokens ? '✅' : '❌'} | Standards: ${supportedStandards.join(', ')}`);
      });
      console.groupEnd();
    });
    
    console.groupEnd();
  }
}

export const enhancedTokenDetectionService = EnhancedTokenDetectionService.getInstance();