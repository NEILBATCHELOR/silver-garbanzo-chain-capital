/**
 * Enhanced Token Detection Service
 * 
 * Comprehensive token balance detection for ERC-721, ERC-1155, ERC-3525, and ERC-4626
 * Supports multi-chain detection with metadata fetching and USD valuations
 */

import { ethers } from 'ethers';
import { priceFeedService } from './PriceFeedService';
import { providerManager } from '@/infrastructure/web3/ProviderManager';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

// Enhanced token balance interfaces
export interface BaseTokenBalance {
  standard: TokenStandard;
  contractAddress: string;
  symbol: string;
  name: string;
  decimals?: number;
  valueUsd: number;
  lastUpdated: Date;
}

export interface ERC721Balance extends BaseTokenBalance {
  standard: 'ERC-721';
  ownedTokens: ERC721Token[];
  totalCount: number;
  floorPrice?: number;
}

export interface ERC721Token {
  tokenId: string;
  tokenURI: string;
  metadata?: NFTMetadata;
  estimatedValueUsd?: number;
}

export interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface ERC1155Balance extends BaseTokenBalance {
  standard: 'ERC-1155';
  tokenTypes: ERC1155TokenType[];
  totalValueUsd: number;
}

export interface ERC1155TokenType {
  tokenId: string;
  balance: string;
  uri: string;
  metadata?: NFTMetadata;
  valueUsd: number;
}

export interface ERC3525Balance extends BaseTokenBalance {
  standard: 'ERC-3525';
  valueDecimals: number;
  ownedTokens: ERC3525Token[];
  totalValue: string;
}

export interface ERC3525Token {
  tokenId: string;
  slot: string;
  value: string;
  formattedValue: string;
  slotMetadata?: SFTSlotMetadata;
}

export interface SFTSlotMetadata {
  name?: string;
  description?: string;
  image?: string;
  properties?: { [key: string]: any };
}

export interface ERC4626Balance extends BaseTokenBalance {
  standard: 'ERC-4626';
  shares: string;
  underlyingAsset: string;
  underlyingSymbol: string;
  underlyingValue: string;
  sharePrice: number;
  apy?: number;
}

export type TokenStandard = 'ERC-721' | 'ERC-1155' | 'ERC-3525' | 'ERC-4626';
export type EnhancedTokenBalance = ERC721Balance | ERC1155Balance | ERC3525Balance | ERC4626Balance;

export interface ChainTokenBalances {
  chainId: number;
  chainName: string;
  address: string;
  tokens: EnhancedTokenBalance[];
  totalValueUsd: number;
}

/**
 * Enhanced Token Detection Service
 * Detects and fetches balances for advanced token standards
 */
export class EnhancedTokenDetectionService {
  private static instance: EnhancedTokenDetectionService;
  
  // ABI definitions for different token standards
  private readonly erc165ABI = [
    'function supportsInterface(bytes4 interfaceId) view returns (bool)'
  ];

  private readonly erc721ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function balanceOf(address owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function supportsInterface(bytes4 interfaceId) view returns (bool)'
  ];

  private readonly erc1155ABI = [
    'function name() view returns (string)',
    'function balanceOf(address owner, uint256 tokenId) view returns (uint256)',
    'function balanceOfBatch(address[] owners, uint256[] tokenIds) view returns (uint256[])',
    'function uri(uint256 tokenId) view returns (string)',
    'function supportsInterface(bytes4 interfaceId) view returns (bool)'
  ];

  private readonly erc3525ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function valueDecimals() view returns (uint8)',
    'function balanceOf(uint256 tokenId) view returns (uint256)',
    'function slotOf(uint256 tokenId) view returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function slotURI(uint256 slot) view returns (string)',
    'function supportsInterface(bytes4 interfaceId) view returns (bool)'
  ];

  private readonly erc4626ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function asset() view returns (address)',
    'function balanceOf(address owner) view returns (uint256)',
    'function convertToAssets(uint256 shares) view returns (uint256)',
    'function totalAssets() view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function supportsInterface(bytes4 interfaceId) view returns (bool)'
  ];

  // Interface IDs for ERC-165 detection
  private readonly interfaceIds = {
    ERC721: '0x80ac58cd',
    ERC1155: '0xd9b67a26',
    ERC3525: '0xd5358140',
    ERC4626: '0x00000000' // ERC-4626 doesn't have a standard interface ID, use function signature detection
  };

  // Common token contracts per chain (examples - expand as needed)
  private readonly knownTokenContracts: Map<number, Array<{
    address: string;
    standard: TokenStandard;
    symbol: string;
  }>> = new Map([
    [1, [ // Ethereum mainnet
      { address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', standard: 'ERC-721', symbol: 'BAYC' }, // Bored Ape Yacht Club
      { address: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6', standard: 'ERC-721', symbol: 'MAYC' }, // Mutant Ape Yacht Club
      { address: '0x495f947276749Ce646f68AC8c248420045cb7b5e', standard: 'ERC-1155', symbol: 'OPENSEA' }, // OpenSea Shared Storefront
      // Add more known contracts here
    ]],
    [137, [ // Polygon
      { address: '0x9df8Aa7C681f33E442A0d57B838555da863504f0', standard: 'ERC-721', symbol: 'SANDBOX' },
      // Add more Polygon contracts
    ]]
  ]);

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
    console.log(`Detecting enhanced token balances for ${address} on ${chainName}`);
    
    try {
      // Get provider for the chain
      const provider = this.getProvider(chainName);
      const tokens: EnhancedTokenBalance[] = [];
      
      // Check known token contracts for this chain
      const knownContracts = this.knownTokenContracts.get(chainId) || [];
      
      for (const tokenContract of knownContracts) {
        try {
          const balance = await this.detectTokenBalance(
            address,
            tokenContract.address,
            provider,
            tokenContract.standard
          );
          
          if (balance && this.hasBalance(balance)) {
            tokens.push(balance);
          }
        } catch (error) {
          console.error(`Error detecting ${tokenContract.symbol} balance:`, error);
        }
      }
      
      // Calculate total USD value
      const totalValueUsd = tokens.reduce((sum, token) => sum + token.valueUsd, 0);
      
      return {
        chainId,
        chainName,
        address,
        tokens,
        totalValueUsd
      };
      
    } catch (error) {
      console.error(`Error detecting token balances on ${chainName}:`, error);
      return {
        chainId,
        chainName,
        address,
        tokens: [],
        totalValueUsd: 0
      };
    }
  }

  /**
   * Detect token balance for a specific contract
   */
  async detectTokenBalance(
    address: string,
    contractAddress: string,
    provider: ethers.JsonRpcProvider,
    expectedStandard?: TokenStandard
  ): Promise<EnhancedTokenBalance | null> {
    try {
      // First, detect the token standard if not provided
      const standard = expectedStandard || await this.detectTokenStandard(contractAddress, provider);
      
      if (!standard) {
        return null;
      }
      
      // Fetch balance based on detected standard
      switch (standard) {
        case 'ERC-721':
          return await this.fetchERC721Balance(address, contractAddress, provider);
        case 'ERC-1155':
          return await this.fetchERC1155Balance(address, contractAddress, provider);
        case 'ERC-3525':
          return await this.fetchERC3525Balance(address, contractAddress, provider);
        case 'ERC-4626':
          return await this.fetchERC4626Balance(address, contractAddress, provider);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error detecting token balance for ${contractAddress}:`, error);
      return null;
    }
  }

  /**
   * Detect token standard using ERC-165 interface detection
   */
  private async detectTokenStandard(
    contractAddress: string,
    provider: ethers.JsonRpcProvider
  ): Promise<TokenStandard | null> {
    try {
      const contract = new ethers.Contract(contractAddress, this.erc165ABI, provider);
      
      // Check ERC-165 support first
      try {
        const supportsERC165 = await contract.supportsInterface('0x01ffc9a7');
        if (!supportsERC165) {
          // Try function signature detection for ERC-4626
          return await this.detectERC4626BySignature(contractAddress, provider);
        }
      } catch {
        // ERC-165 not supported, try function signature detection
        return await this.detectERC4626BySignature(contractAddress, provider);
      }
      
      // Check each interface in order of priority
      const checks = [
        { id: this.interfaceIds.ERC3525, standard: 'ERC-3525' as TokenStandard },
        { id: this.interfaceIds.ERC1155, standard: 'ERC-1155' as TokenStandard },
        { id: this.interfaceIds.ERC721, standard: 'ERC-721' as TokenStandard }
      ];
      
      for (const check of checks) {
        try {
          const supported = await contract.supportsInterface(check.id);
          if (supported) {
            return check.standard;
          }
        } catch (error) {
          console.warn(`Error checking interface ${check.id}:`, error);
        }
      }
      
      // Fallback to function signature detection
      return await this.detectByFunctionSignature(contractAddress, provider);
      
    } catch (error) {
      console.error('Error detecting token standard:', error);
      return null;
    }
  }

  /**
   * Detect ERC-4626 by checking function signatures
   */
  private async detectERC4626BySignature(
    contractAddress: string,
    provider: ethers.JsonRpcProvider
  ): Promise<TokenStandard | null> {
    try {
      const contract = new ethers.Contract(contractAddress, this.erc4626ABI, provider);
      
      // Check for ERC-4626 specific functions
      await contract.asset();
      await contract.totalAssets();
      
      return 'ERC-4626';
    } catch {
      return null;
    }
  }

  /**
   * Detect token standard by function signature
   */
  private async detectByFunctionSignature(
    contractAddress: string,
    provider: ethers.JsonRpcProvider
  ): Promise<TokenStandard | null> {
    try {
      // Try ERC-721 functions
      const erc721Contract = new ethers.Contract(contractAddress, this.erc721ABI, provider);
      try {
        await erc721Contract.name();
        await erc721Contract.symbol();
        return 'ERC-721';
      } catch {}
      
      // Try ERC-1155 functions
      const erc1155Contract = new ethers.Contract(contractAddress, this.erc1155ABI, provider);
      try {
        await erc1155Contract.balanceOf(ethers.ZeroAddress, 1);
        return 'ERC-1155';
      } catch {}
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch ERC-721 NFT balance
   */
  private async fetchERC721Balance(
    address: string,
    contractAddress: string,
    provider: ethers.JsonRpcProvider
  ): Promise<ERC721Balance | null> {
    try {
      const contract = new ethers.Contract(contractAddress, this.erc721ABI, provider);
      
      // Get basic token info
      const [name, symbol, balance] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.balanceOf(address)
      ]);
      
      const tokenCount = Number(balance);
      if (tokenCount === 0) {
        return null;
      }
      
      // Fetch owned tokens (limit to prevent timeout)
      const maxTokens = Math.min(tokenCount, 50);
      const ownedTokens: ERC721Token[] = [];
      
      for (let i = 0; i < maxTokens; i++) {
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(address, i);
          const tokenURI = await contract.tokenURI(tokenId);
          
          // Fetch metadata (with timeout)
          const metadata = await this.fetchNFTMetadata(tokenURI, 3000);
          
          ownedTokens.push({
            tokenId: tokenId.toString(),
            tokenURI,
            metadata,
            estimatedValueUsd: 0 // TODO: Integrate with NFT pricing APIs
          });
        } catch (error) {
          console.warn(`Error fetching token ${i}:`, error);
        }
      }
      
      return {
        standard: 'ERC-721',
        contractAddress,
        symbol,
        name,
        ownedTokens,
        totalCount: tokenCount,
        valueUsd: 0, // TODO: Calculate based on floor price
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error fetching ERC-721 balance:', error);
      return null;
    }
  }

  /**
   * Fetch ERC-1155 multi-token balance
   */
  private async fetchERC1155Balance(
    address: string,
    contractAddress: string,
    provider: ethers.JsonRpcProvider
  ): Promise<ERC1155Balance | null> {
    try {
      const contract = new ethers.Contract(contractAddress, this.erc1155ABI, provider);
      
      // Get basic info
      const name = await contract.name().catch(() => 'Unknown ERC-1155');
      
      // For ERC-1155, we need to know which token IDs to check
      // This is a limitation - in practice, you'd track this via events or APIs
      const tokenIds = ['1', '2', '3']; // Example token IDs
      const tokenTypes: ERC1155TokenType[] = [];
      let totalValueUsd = 0;
      
      for (const tokenId of tokenIds) {
        try {
          const balance = await contract.balanceOf(address, tokenId);
          if (balance > 0) {
            const uri = await contract.uri(tokenId);
            const metadata = await this.fetchNFTMetadata(uri, 3000);
            
            const tokenType: ERC1155TokenType = {
              tokenId,
              balance: balance.toString(),
              uri,
              metadata,
              valueUsd: 0 // TODO: Implement pricing
            };
            
            tokenTypes.push(tokenType);
            totalValueUsd += tokenType.valueUsd;
          }
        } catch (error) {
          console.warn(`Error checking ERC-1155 token ${tokenId}:`, error);
        }
      }
      
      if (tokenTypes.length === 0) {
        return null;
      }
      
      return {
        standard: 'ERC-1155',
        contractAddress,
        symbol: 'ERC1155',
        name,
        tokenTypes,
        totalValueUsd,
        valueUsd: totalValueUsd,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error fetching ERC-1155 balance:', error);
      return null;
    }
  }

  /**
   * Fetch ERC-3525 semi-fungible token balance
   */
  private async fetchERC3525Balance(
    address: string,
    contractAddress: string,
    provider: ethers.JsonRpcProvider
  ): Promise<ERC3525Balance | null> {
    try {
      const contract = new ethers.Contract(contractAddress, this.erc3525ABI, provider);
      
      // Get basic token info
      const [name, symbol, valueDecimals, balance] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.valueDecimals(),
        contract.balanceOf(address) // Number of tokens owned
      ]);
      
      const tokenCount = Number(balance);
      if (tokenCount === 0) {
        return null;
      }
      
      // Fetch owned tokens and their values
      const ownedTokens: ERC3525Token[] = [];
      let totalValue = 0n;
      
      for (let i = 0; i < Math.min(tokenCount, 20); i++) { // Limit to prevent timeout
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(address, i);
          const [slot, value] = await Promise.all([
            contract.slotOf(tokenId),
            contract.balanceOf(tokenId) // Value of the token
          ]);
          
          const formattedValue = ethers.formatUnits(value, valueDecimals);
          totalValue += value;
          
          // Fetch slot metadata if available
          let slotMetadata: SFTSlotMetadata | undefined;
          try {
            const slotURI = await contract.slotURI(slot);
            slotMetadata = await this.fetchSFTSlotMetadata(slotURI, 3000);
          } catch {}
          
          ownedTokens.push({
            tokenId: tokenId.toString(),
            slot: slot.toString(),
            value: value.toString(),
            formattedValue,
            slotMetadata
          });
        } catch (error) {
          console.warn(`Error fetching ERC-3525 token ${i}:`, error);
        }
      }
      
      return {
        standard: 'ERC-3525',
        contractAddress,
        symbol,
        name,
        decimals: valueDecimals,
        valueDecimals,
        ownedTokens,
        totalValue: totalValue.toString(),
        valueUsd: 0, // TODO: Implement pricing for SFTs
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error fetching ERC-3525 balance:', error);
      return null;
    }
  }

  /**
   * Fetch ERC-4626 tokenized vault balance
   */
  private async fetchERC4626Balance(
    address: string,
    contractAddress: string,
    provider: ethers.JsonRpcProvider
  ): Promise<ERC4626Balance | null> {
    try {
      const contract = new ethers.Contract(contractAddress, this.erc4626ABI, provider);
      
      // Get vault info
      const [name, symbol, decimals, assetAddress, shares] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.asset(),
        contract.balanceOf(address)
      ]);
      
      const sharesAmount = Number(ethers.formatUnits(shares, decimals));
      if (sharesAmount === 0) {
        return null;
      }
      
      // Get underlying asset value
      const underlyingValue = await contract.convertToAssets(shares);
      const formattedShares = ethers.formatUnits(shares, decimals);
      
      // Get underlying asset info
      const assetContract = new ethers.Contract(assetAddress, [
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)'
      ], provider);
      
      const [underlyingSymbol, underlyingDecimals] = await Promise.all([
        assetContract.symbol(),
        assetContract.decimals()
      ]);
      
      const formattedUnderlyingValue = ethers.formatUnits(underlyingValue, underlyingDecimals);
      
      // Calculate share price
      const sharePrice = Number(formattedUnderlyingValue) / sharesAmount;
      
      // Get underlying asset USD price
      const underlyingPriceData = await priceFeedService.getTokenPrice(underlyingSymbol);
      const valueUsd = Number(formattedUnderlyingValue) * (underlyingPriceData?.priceUsd || 0);
      
      return {
        standard: 'ERC-4626',
        contractAddress,
        symbol,
        name,
        decimals,
        shares: formattedShares,
        underlyingAsset: assetAddress,
        underlyingSymbol,
        underlyingValue: formattedUnderlyingValue,
        sharePrice,
        valueUsd,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error fetching ERC-4626 balance:', error);
      return null;
    }
  }

  /**
   * Fetch NFT metadata from URI
   */
  private async fetchNFTMetadata(uri: string, timeout: number = 5000): Promise<NFTMetadata | undefined> {
    try {
      // Handle IPFS URIs
      const metadataUrl = uri.startsWith('ipfs://') 
        ? `https://ipfs.io/ipfs/${uri.slice(7)}`
        : uri;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(metadataUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const metadata = await response.json();
      return metadata as NFTMetadata;
    } catch (error) {
      console.warn('Error fetching NFT metadata:', error);
      return undefined;
    }
  }

  /**
   * Fetch SFT slot metadata
   */
  private async fetchSFTSlotMetadata(uri: string, timeout: number = 5000): Promise<SFTSlotMetadata | undefined> {
    try {
      const metadataUrl = uri.startsWith('ipfs://') 
        ? `https://ipfs.io/ipfs/${uri.slice(7)}`
        : uri;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(metadataUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const metadata = await response.json();
      return metadata as SFTSlotMetadata;
    } catch (error) {
      console.warn('Error fetching SFT slot metadata:', error);
      return undefined;
    }
  }

  /**
   * Check if token balance has meaningful value
   */
  private hasBalance(balance: EnhancedTokenBalance): boolean {
    switch (balance.standard) {
      case 'ERC-721':
        return balance.totalCount > 0;
      case 'ERC-1155':
        return balance.tokenTypes.length > 0;
      case 'ERC-3525':
        return balance.ownedTokens.length > 0;
      case 'ERC-4626':
        return Number(balance.shares) > 0;
      default:
        return false;
    }
  }

  /**
   * Get provider for chain
   */
  private getProvider(chainName: string): ethers.JsonRpcProvider {
    try {
      return providerManager.getProvider(chainName as SupportedChain);
    } catch (error) {
      throw new Error(`Provider not available for chain: ${chainName}`);
    }
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
   * Get supported token standards
   */
  getSupportedStandards(): TokenStandard[] {
    return ['ERC-721', 'ERC-1155', 'ERC-3525', 'ERC-4626'];
  }

  /**
   * Format token balance for display
   */
  formatTokenBalance(balance: EnhancedTokenBalance): string {
    switch (balance.standard) {
      case 'ERC-721':
        return `${balance.totalCount} NFT${balance.totalCount !== 1 ? 's' : ''}`;
      case 'ERC-1155':
        return `${balance.tokenTypes.length} token type${balance.tokenTypes.length !== 1 ? 's' : ''}`;
      case 'ERC-3525':
        return `${balance.ownedTokens.length} SFT${balance.ownedTokens.length !== 1 ? 's' : ''}`;
      case 'ERC-4626':
        return `${Number(balance.shares).toFixed(4)} shares`;
      default:
        return '0';
    }
  }
}

export const enhancedTokenDetectionService = EnhancedTokenDetectionService.getInstance();
