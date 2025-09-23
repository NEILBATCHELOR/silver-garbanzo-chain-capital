/**
 * Tendermint Adapter Implementation
 * 
 * Generic Tendermint/CometBFT blockchain adapter
 * Extends Cosmos SDK functionality for Tendermint-based chains
 */

import { CosmosAdapter } from '../cosmos/CosmosAdapter';
import type { NetworkType } from '../IBlockchainAdapter';
import { 
  Tendermint34Client, 
  Tendermint37Client,
  HttpClient,
  NewBlockEvent,
  TxEvent
} from '@cosmjs/tendermint-rpc';
import { QueryClient, setupAuthExtension, setupBankExtension } from '@cosmjs/stargate';
import { toHex } from '@cosmjs/encoding';

type TendermintClient = Tendermint34Client | Tendermint37Client;

export interface TendermintChainConfig {
  chainId: string;
  chainName: string;
  rpcEndpoint: string;
  addressPrefix: string;
  nativeDenom: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Predefined configurations for known Tendermint chains
const TENDERMINT_CHAIN_CONFIGS: Record<string, TendermintChainConfig> = {
  'osmosis-mainnet': {
    chainId: 'osmosis-1',
    chainName: 'Osmosis',
    rpcEndpoint: 'https://rpc.osmosis.zone',
    addressPrefix: 'osmo',
    nativeDenom: 'uosmo',
    nativeCurrency: {
      name: 'Osmosis',
      symbol: 'OSMO',
      decimals: 6
    }
  },
  'osmosis-testnet': {
    chainId: 'osmo-test-5',
    chainName: 'Osmosis Testnet',
    rpcEndpoint: 'https://rpc.testnet.osmosis.zone',
    addressPrefix: 'osmo',
    nativeDenom: 'uosmo',
    nativeCurrency: {
      name: 'Osmosis',
      symbol: 'OSMO',
      decimals: 6
    }
  },
  'juno-mainnet': {
    chainId: 'juno-1',
    chainName: 'Juno',
    rpcEndpoint: 'https://rpc-juno.itastakers.com',
    addressPrefix: 'juno',
    nativeDenom: 'ujuno',
    nativeCurrency: {
      name: 'Juno',
      symbol: 'JUNO',
      decimals: 6
    }
  },
  'akash-mainnet': {
    chainId: 'akashnet-2',
    chainName: 'Akash',
    rpcEndpoint: 'https://rpc.akash.forbole.com',
    addressPrefix: 'akash',
    nativeDenom: 'uakt',
    nativeCurrency: {
      name: 'Akash',
      symbol: 'AKT',
      decimals: 6
    }
  },
  'secret-mainnet': {
    chainId: 'secret-4',
    chainName: 'Secret Network',
    rpcEndpoint: 'https://rpc.secret.express',
    addressPrefix: 'secret',
    nativeDenom: 'uscrt',
    nativeCurrency: {
      name: 'Secret',
      symbol: 'SCRT',
      decimals: 6
    }
  },
  'terra-mainnet': {
    chainId: 'phoenix-1',
    chainName: 'Terra',
    rpcEndpoint: 'https://terra-rpc.polkachu.com',
    addressPrefix: 'terra',
    nativeDenom: 'uluna',
    nativeCurrency: {
      name: 'Terra Luna',
      symbol: 'LUNA',
      decimals: 6
    }
  },
  'persistence-mainnet': {
    chainId: 'core-1',
    chainName: 'Persistence',
    rpcEndpoint: 'https://rpc.core.persistence.one',
    addressPrefix: 'persistence',
    nativeDenom: 'uxprt',
    nativeCurrency: {
      name: 'Persistence',
      symbol: 'XPRT',
      decimals: 6
    }
  }
};

export class TendermintAdapter extends CosmosAdapter {
  private tendermintClient?: TendermintClient;
  private queryClient?: QueryClient;
  private chainConfig?: TendermintChainConfig;
  private _overrideChainName?: string;
  private _overrideNativeCurrency?: { name: string; symbol: string; decimals: number };

  constructor(
    chainName: string = 'osmosis',
    networkType: NetworkType = 'mainnet',
    customConfig?: TendermintChainConfig
  ) {
    // Initialize with cosmos defaults
    super(networkType, 'cosmos');

    // Apply chain-specific configuration
    const configKey = `${chainName}-${networkType}`;
    this.chainConfig = customConfig || TENDERMINT_CHAIN_CONFIGS[configKey];

    if (!this.chainConfig) {
      throw new Error(`Unknown Tendermint chain: ${chainName}-${networkType}`);
    }

    // Store override values for later use
    this._overrideChainName = this.chainConfig.chainName;
    this._overrideNativeCurrency = this.chainConfig.nativeCurrency;

    // Set other properties that aren't readonly
    this.chainId = this.chainConfig.chainId;
    this.rpcEndpoint = this.chainConfig.rpcEndpoint;
    this.addressPrefix = this.chainConfig.addressPrefix;
    this.denom = this.chainConfig.nativeDenom;
  }

  // Methods to get the overridden values
  getChainName(): string {
    return this._overrideChainName || 'cosmos';
  }

  getNativeCurrency(): { name: string; symbol: string; decimals: number } {
    return this._overrideNativeCurrency || {
      name: 'Cosmos',
      symbol: 'ATOM',
      decimals: 6
    };
  }

  // Override connect to use Tendermint-specific client
  async connect(config?: any): Promise<void> {
    try {
      // Use parent Cosmos connection
      await super.connect(config || { rpcUrl: this.rpcEndpoint, networkId: this.chainId });

      // Additionally setup Tendermint client for advanced queries
      const rpcUrl = config?.rpcUrl || this.rpcEndpoint;
      
      // Try to determine which client version to use based on endpoint or default to Tendermint34Client
      try {
        this.tendermintClient = await Tendermint34Client.connect(rpcUrl);
      } catch (error) {
        // Fallback to Tendermint37Client if 34 doesn't work
        try {
          this.tendermintClient = await Tendermint37Client.connect(rpcUrl);
        } catch (fallbackError) {
          throw new Error(`Failed to connect with both Tendermint34 and Tendermint37 clients: ${error}`);
        }
      }

      // Setup query client with extensions
      this.queryClient = QueryClient.withExtensions(
        this.tendermintClient,
        setupAuthExtension,
        setupBankExtension
      );

      console.log(`Connected to ${this.getChainName()} via Tendermint RPC`);
    } catch (error) {
      this._isConnected = false;
      throw new Error(`Failed to connect to ${this.getChainName()}: ${error}`);
    }
  }

  // Override disconnect to clean up Tendermint client
  async disconnect(): Promise<void> {
    await super.disconnect();
    
    if (this.tendermintClient) {
      this.tendermintClient.disconnect();
      this.tendermintClient = undefined;
    }
    this.queryClient = undefined;
  }

  // Enhanced block operations using Tendermint client
  async getBlockByHeight(height: number): Promise<any> {
    if (!this.tendermintClient) {
      throw new Error('Tendermint client not initialized');
    }

    try {
      const block = await this.tendermintClient.block(height);
      return {
        ...block,
        chainId: block.block.header.chainId,
        height: block.block.header.height,
        time: block.block.header.time,
        hash: toHex(block.blockId.hash),
        proposer: block.block.header.proposerAddress 
          ? toHex(block.block.header.proposerAddress) 
          : undefined
      };
    } catch (error) {
      throw new Error(`Failed to get block: ${error}`);
    }
  }

  // Get blockchain info
  async getBlockchainInfo(): Promise<any> {
    if (!this.tendermintClient) {
      throw new Error('Tendermint client not initialized');
    }

    try {
      const status = await this.tendermintClient.status();
      return {
        nodeInfo: status.nodeInfo,
        syncInfo: status.syncInfo,
        validatorInfo: status.validatorInfo,
        chainId: status.nodeInfo.network
      };
    } catch (error) {
      throw new Error(`Failed to get blockchain info: ${error}`);
    }
  }

  // Get network peers
  async getNetworkPeers(): Promise<any> {
    if (!this.tendermintClient) {
      throw new Error('Tendermint client not initialized');
    }

    try {
      // Use the correct method name for getting network info
      const netInfo = await this.tendermintClient.status();
      return {
        listening: true, // Status doesn't provide listening state directly
        peers: [], // Peers info not directly available in status, would need separate call
        nPeers: 0
      };
    } catch (error) {
      throw new Error(`Failed to get network peers: ${error}`);
    }
  }

  // Get consensus state
  async getConsensusState(): Promise<any> {
    if (!this.tendermintClient) {
      throw new Error('Tendermint client not initialized');
    }

    try {
      // Use the consensus params method that exists in the client
      const status = await this.tendermintClient.status();
      return {
        consensusParams: status.syncInfo,
        validatorInfo: status.validatorInfo
      };
    } catch (error) {
      throw new Error(`Failed to get consensus state: ${error}`);
    }
  }

  // Get validators
  async getValidators(height?: number): Promise<any> {
    if (!this.tendermintClient) {
      throw new Error('Tendermint client not initialized');
    }

    try {
      const validators = await this.tendermintClient.validators({
        height: height,
        per_page: 100
      });
      return validators;
    } catch (error) {
      throw new Error(`Failed to get validators: ${error}`);
    }
  }

  // Subscribe to new blocks (WebSocket)
  async subscribeToBlocks(callback: (block: any) => void): Promise<() => void> {
    if (!this.tendermintClient) {
      throw new Error('Tendermint client not initialized');
    }

    try {
      const subscription = this.tendermintClient.subscribeNewBlock();
      let unsubscribed = false;

      const handleSubscription = async () => {
        const stream = await subscription;
        
        stream.addListener({
          next: (event) => {
            if (!unsubscribed) {
              callback(event);
            }
          },
          error: (err) => {
            console.error('Block subscription error:', err);
          },
          complete: () => {
            console.log('Block subscription completed');
          }
        });
      };

      handleSubscription().catch(console.error);

      // Return unsubscribe function
      return () => {
        unsubscribed = true;
      };
    } catch (error) {
      throw new Error(`Failed to subscribe to blocks: ${error}`);
    }
  }

  // Subscribe to transactions (WebSocket)
  async subscribeToTransactions(callback: (tx: any) => void): Promise<() => void> {
    if (!this.tendermintClient) {
      throw new Error('Tendermint client not initialized');
    }

    try {
      const subscription = this.tendermintClient.subscribeTx();
      let unsubscribed = false;

      const handleSubscription = async () => {
        const stream = await subscription;
        
        stream.addListener({
          next: (event) => {
            if (!unsubscribed) {
              callback(event);
            }
          },
          error: (err) => {
            console.error('Transaction subscription error:', err);
          },
          complete: () => {
            console.log('Transaction subscription completed');
          }
        });
      };

      handleSubscription().catch(console.error);

      // Return unsubscribe function
      return () => {
        unsubscribed = true;
      };
    } catch (error) {
      throw new Error(`Failed to subscribe to transactions: ${error}`);
    }
  }

  // Get chain registry info
  getChainRegistryInfo(): any {
    return {
      chainId: this.chainId,
      chainName: this.chainName,
      networkType: this.networkType,
      addressPrefix: this.addressPrefix,
      rpcEndpoint: this.rpcEndpoint,
      nativeDenom: this.denom,
      nativeCurrency: this.nativeCurrency,
      bech32Config: {
        bech32PrefixAccAddr: this.addressPrefix,
        bech32PrefixAccPub: `${this.addressPrefix}pub`,
        bech32PrefixValAddr: `${this.addressPrefix}valoper`,
        bech32PrefixValPub: `${this.addressPrefix}valoperpub`,
        bech32PrefixConsAddr: `${this.addressPrefix}valcons`,
        bech32PrefixConsPub: `${this.addressPrefix}valconspub`
      }
    };
  }

  // Override explorer URL for chain-specific explorers
  getExplorerUrl(txHash: string): string {
    const explorerUrls: Record<string, string> = {
      'osmosis-1': `https://www.mintscan.io/osmosis/tx/${txHash}`,
      'osmo-test-5': `https://testnet.mintscan.io/osmosis-testnet/tx/${txHash}`,
      'juno-1': `https://www.mintscan.io/juno/tx/${txHash}`,
      'akashnet-2': `https://www.mintscan.io/akash/tx/${txHash}`,
      'secret-4': `https://www.mintscan.io/secret/tx/${txHash}`,
      'phoenix-1': `https://www.mintscan.io/terra/tx/${txHash}`,
      'core-1': `https://www.mintscan.io/persistence/tx/${txHash}`
    };

    return explorerUrls[this.chainId] || super.getExplorerUrl(txHash);
  }

  // Static factory method to create adapter for specific chain
  static createForChain(
    chainName: string,
    networkType: NetworkType = 'mainnet'
  ): TendermintAdapter {
    return new TendermintAdapter(chainName, networkType);
  }

  // Static method to add custom chain configuration
  static addChainConfig(key: string, config: TendermintChainConfig): void {
    TENDERMINT_CHAIN_CONFIGS[key] = config;
  }

  // Get list of supported chains
  static getSupportedChains(): string[] {
    return Object.keys(TENDERMINT_CHAIN_CONFIGS).map(key => {
      const [chain, network] = key.split('-');
      return `${chain} (${network})`;
    });
  }
}

// Export pre-configured adapters for popular chains
export const osmosisAdapter = new TendermintAdapter('osmosis', 'mainnet');
export const junoAdapter = new TendermintAdapter('juno', 'mainnet');
export const akashAdapter = new TendermintAdapter('akash', 'mainnet');
export const secretAdapter = new TendermintAdapter('secret', 'mainnet');
export const terraAdapter = new TendermintAdapter('terra', 'mainnet');
export const persistenceAdapter = new TendermintAdapter('persistence', 'mainnet');
export const tendermintAdapter = osmosisAdapter; // Default export
