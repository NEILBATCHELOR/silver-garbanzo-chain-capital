/**
 * Contract Configuration Service
 * 
 * Loads deployed Foundry contract addresses from the database dynamically.
 * This service replaces hardcoded factory addresses and enables flexible
 * multi-network deployment tracking.
 * 
 * Key Features:
 * - Database-driven configuration (no hardcoded addresses)
 * - Caching for performance
 * - Support for multiple networks and environments
 * - Version-aware contract address resolution
 * 
 * Database Tables Used:
 * - contract_masters: Stores all deployed master contracts and factory addresses
 * - contract_master_versions: Tracks version history
 */

import { supabase } from '@/infrastructure/database/client';

/**
 * Network environments supported
 */
export type NetworkEnvironment = 'mainnet' | 'testnet';

/**
 * Blockchain networks supported
 */
export type Blockchain = 
  | 'ethereum' 
  | 'polygon' 
  | 'arbitrum' 
  | 'optimism' 
  | 'base' 
  | 'avalanche' 
  | 'bsc';

/**
 * Normalize blockchain names to database format
 * Maps testnet-specific names (sepolia, holesky, goerli) to their base chain
 */
function normalizeBlockchainName(blockchain: string): Blockchain {
  const normalized = blockchain.toLowerCase().trim();
  
  // Map testnet names to their base chains
  const testnetMappings: Record<string, Blockchain> = {
    'sepolia': 'ethereum',
    'holesky': 'ethereum',
    'goerli': 'ethereum',
    'ethereum-sepolia': 'ethereum',
    'ethereum-holesky': 'ethereum',
    'ethereum-goerli': 'ethereum',
    'mumbai': 'polygon',
    'polygon-mumbai': 'polygon',
    'amoy': 'polygon',
    'polygon-amoy': 'polygon',
    'fuji': 'avalanche',
    'avalanche-fuji': 'avalanche',
    'bsc-testnet': 'bsc',
    'arbitrum-goerli': 'arbitrum',
    'arbitrum-sepolia': 'arbitrum',
    'optimism-goerli': 'optimism',
    'optimism-sepolia': 'optimism',
    'base-goerli': 'base',
    'base-sepolia': 'base'
  };
  
  // Check if it's a testnet name that needs mapping
  if (testnetMappings[normalized]) {
    return testnetMappings[normalized];
  }
  
  // Return as-is if it's already a valid base chain
  const validChains: Blockchain[] = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc'];
  if (validChains.includes(normalized as Blockchain)) {
    return normalized as Blockchain;
  }
  
  // Default to ethereum if unrecognized
  console.warn(`Unrecognized blockchain '${blockchain}', defaulting to 'ethereum'`);
  return 'ethereum';
}

/**
 * Contract types stored in database
 */
export type ContractType =
  | 'factory'
  | 'erc20_master'
  | 'erc721_master'
  | 'erc1155_master'
  | 'erc3525_master'
  | 'erc4626_master'
  | 'erc1400_master'
  | 'erc20_rebasing_master'
  | 'compliance_module'
  | 'vesting_module'
  | 'royalty_module'
  | 'fee_module';

/**
 * Master contract information
 */
export interface MasterContractInfo {
  id: string;
  network: Blockchain;
  environment: NetworkEnvironment;
  contractType: ContractType;
  contractAddress: string;
  version: string;
  abiVersion: string;
  abi: any[];
  deployedAt: string;
  isActive: boolean;
}

/**
 * Error thrown when contract configuration is not found
 */
export class ContractConfigurationError extends Error {
  constructor(
    message: string,
    public readonly network: Blockchain,
    public readonly environment: NetworkEnvironment,
    public readonly contractType: ContractType
  ) {
    super(message);
    this.name = 'ContractConfigurationError';
  }
}

/**
 * Contract Configuration Service
 * 
 * Provides centralized access to deployed Foundry contract addresses.
 * Uses database as source of truth with intelligent caching.
 * 
 * Usage:
 * ```typescript
 * const config = new ContractConfigurationService();
 * const factoryAddress = await config.getFactoryAddress('ethereum', 'testnet');
 * const erc20Master = await config.getMasterAddress('ethereum', 'testnet', 'erc20_master');
 * const addresses = await config.getAllMasterAddresses('ethereum', 'testnet');
 * ```
 */
export class ContractConfigurationService {
  private cache = new Map<string, string>();
  private infoCache = new Map<string, MasterContractInfo>();
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private cacheTimestamps = new Map<string, number>();

  private getCacheKey(
    network: Blockchain,
    environment: NetworkEnvironment,
    contractType: ContractType
  ): string {
    return `${network}-${environment}-${contractType}`;
  }

  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return false;
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  /**
   * Get master contract address from database
   * Normalizes blockchain names (e.g., 'holesky' -> 'ethereum') before lookup
   * @throws ContractConfigurationError if contract not found
   */
  async getMasterAddress(
    network: Blockchain | string,
    environment: NetworkEnvironment,
    contractType: ContractType
  ): Promise<string> {
    // Normalize blockchain name to handle testnet-specific names
    const normalizedNetwork = normalizeBlockchainName(network);
    
    const key = this.getCacheKey(normalizedNetwork, environment, contractType);
    
    if (this.isCacheValid(key) && this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    try {
      const { data, error } = await supabase
        .from('contract_masters')
        .select('contract_address')
        .eq('network', normalizedNetwork)
        .eq('environment', environment)
        .eq('contract_type', contractType)
        .eq('is_active', true)
        .order('deployed_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        throw new ContractConfigurationError(
          `Database error: ${error.message}`,
          normalizedNetwork,
          environment,
          contractType
        );
      }
      
      if (!data) {
        throw new ContractConfigurationError(
          `Master contract not found: ${contractType} on ${normalizedNetwork}-${environment}. ` +
          `Original input: ${network}. ` +
          `Please ensure contracts are deployed and addresses are loaded into the database.`,
          normalizedNetwork,
          environment,
          contractType
        );
      }
      
      this.cache.set(key, data.contract_address);
      this.cacheTimestamps.set(key, Date.now());
      
      return data.contract_address;
    } catch (error) {
      if (error instanceof ContractConfigurationError) {
        throw error;
      }
      
      throw new ContractConfigurationError(
        `Failed to retrieve contract address: ${error instanceof Error ? error.message : String(error)}`,
        normalizedNetwork,
        environment,
        contractType
      );
    }
  }

  /**
   * Get factory address for a network
   * Accepts both normalized and testnet-specific blockchain names
   */
  async getFactoryAddress(
    network: Blockchain | string,
    environment: NetworkEnvironment
  ): Promise<string> {
    return this.getMasterAddress(network, environment, 'factory');
  }

  /**
   * Get all master contract addresses for a network
   * Accepts both normalized and testnet-specific blockchain names
   */
  async getAllMasterAddresses(
    network: Blockchain | string,
    environment: NetworkEnvironment
  ): Promise<Record<string, string>> {
    // Normalize blockchain name to handle testnet-specific names
    const normalizedNetwork = normalizeBlockchainName(network);
    
    try {
      const { data, error } = await supabase
        .from('contract_masters')
        .select('contract_type, contract_address')
        .eq('network', normalizedNetwork)
        .eq('environment', environment)
        .eq('is_active', true);
      
      if (error) {
        throw new Error(`Failed to load master addresses: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        throw new Error(
          `No master contracts found for ${normalizedNetwork}-${environment} (original: ${network}). ` +
          `Please ensure contracts are deployed and addresses are loaded into the database.`
        );
      }
      
      const addresses: Record<string, string> = {};
      for (const row of data) {
        addresses[row.contract_type] = row.contract_address;
        
        const key = this.getCacheKey(normalizedNetwork, environment, row.contract_type);
        this.cache.set(key, row.contract_address);
        this.cacheTimestamps.set(key, Date.now());
      }
      
      return addresses;
    } catch (error) {
      throw new Error(
        `Failed to load all master addresses for ${network}-${environment}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Clear the cache - useful for testing or after contract upgrades
   */
  clearCache(): void {
    this.cache.clear();
    this.infoCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Check if contracts are deployed for a network
   */
  async isNetworkConfigured(
    network: Blockchain,
    environment: NetworkEnvironment
  ): Promise<boolean> {
    try {
      await this.getFactoryAddress(network, environment);
      return true;
    } catch (error) {
      if (error instanceof ContractConfigurationError) {
        return false;
      }
      throw error;
    }
  }
}

/**
 * Singleton instance for application-wide use
 */
export const contractConfigurationService = new ContractConfigurationService();

/**
 * Helper function to map token standard to contract type
 */
export function getContractTypeFromStandard(standard: string): ContractType {
  const standardMap: Record<string, ContractType> = {
    'ERC-20': 'erc20_master',
    'ERC-721': 'erc721_master',
    'ERC-1155': 'erc1155_master',
    'ERC-3525': 'erc3525_master',
    'ERC-4626': 'erc4626_master',
    'ERC-1400': 'erc1400_master',
  };
  
  const contractType = standardMap[standard];
  if (!contractType) {
    throw new Error(`Unknown token standard: ${standard}`);
  }
  
  return contractType;
}
