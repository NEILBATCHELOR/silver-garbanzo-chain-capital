/**
 * Enhanced Live RPC Status Service
 * Monitors both public RPC endpoints AND user-configured premium endpoints from .env
 */

export interface RPCEndpoint {
  id: string;
  name: string;
  network: string;
  url: string;
  status: 'operational' | 'degraded' | 'outage';
  responseTime: number;
  blockHeight?: number;
  lastChecked: Date;
  error?: string;
  isPrivate?: boolean; // Indicates if this is a premium/private endpoint
  provider?: string;   // e.g. 'Alchemy', 'QuickNode', 'Public'
}

interface RPCRequest {
  jsonrpc: string;
  method: string;
  params: any[];
  id: number;
}

interface RPCResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  id: number;
}

interface SolanaRPCRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any[];
}

class EnhancedLiveRPCStatusService {
  private static instance: EnhancedLiveRPCStatusService;
  
  private constructor() {}

  static getInstance(): EnhancedLiveRPCStatusService {
    if (!EnhancedLiveRPCStatusService.instance) {
      EnhancedLiveRPCStatusService.instance = new EnhancedLiveRPCStatusService();
    }
    return EnhancedLiveRPCStatusService.instance;
  }

  /**
   * Get all configured RPC endpoints from environment variables and public endpoints
   */
  private getAllConfiguredEndpoints(): Omit<RPCEndpoint, 'status' | 'responseTime' | 'lastChecked'>[] {
    const endpoints: Omit<RPCEndpoint, 'status' | 'responseTime' | 'lastChecked'>[] = [];

    // Add public endpoints
    const publicEndpoints = [
      {
        id: 'ethereum-public',
        name: 'Ethereum (Public)',
        network: 'ethereum',
        url: 'https://eth.llamarpc.com',
        isPrivate: false,
        provider: 'Public'
      },
      {
        id: 'polygon-public',
        name: 'Polygon (Public)',
        network: 'polygon',
        url: 'https://polygon-rpc.com',
        isPrivate: false,
        provider: 'Public'
      }
    ];

    endpoints.push(...publicEndpoints);

    // Add private/premium endpoints from environment variables
    const envEndpoints = [
      // Mainnet Endpoints
      {
        envVar: 'VITE_MAINNET_RPC_URL',
        id: 'ethereum-alchemy',
        name: 'Ethereum (Alchemy)',
        network: 'ethereum',
        provider: 'Alchemy'
      },
      {
        envVar: 'VITE_POLYGON_RPC_URL',
        id: 'polygon-alchemy',
        name: 'Polygon (Alchemy)',
        network: 'polygon',
        provider: 'Alchemy'
      },
      {
        envVar: 'VITE_OPTIMISM_RPC_URL',
        id: 'optimism-alchemy',
        name: 'Optimism (Alchemy)',
        network: 'optimism',
        provider: 'Alchemy'
      },
      {
        envVar: 'VITE_ARBITRUM_RPC_URL',
        id: 'arbitrum-alchemy',
        name: 'Arbitrum (Alchemy)',
        network: 'arbitrum',
        provider: 'Alchemy'
      },
      {
        envVar: 'VITE_BASE_RPC_URL',
        id: 'base-alchemy',
        name: 'Base (Alchemy)',
        network: 'base',
        provider: 'Alchemy'
      },
      {
        envVar: 'VITE_AVALANCHE_RPC_URL',
        id: 'avalanche-quicknode',
        name: 'Avalanche (QuickNode)',
        network: 'avalanche',
        provider: 'QuickNode'
      },
      {
        envVar: 'VITE_SOLANA_RPC_URL',
        id: 'solana-alchemy',
        name: 'Solana (Alchemy)',
        network: 'solana',
        provider: 'Alchemy'
      },
      {
        envVar: 'VITE_NEAR_RPC_URL',
        id: 'near-quicknode',
        name: 'NEAR (QuickNode)',
        network: 'near',
        provider: 'QuickNode'
      },
      {
        envVar: 'VITE_APTOS_RPC_URL',
        id: 'aptos-quicknode',
        name: 'Aptos (QuickNode)',
        network: 'aptos',
        provider: 'QuickNode'
      },
      {
        envVar: 'VITE_SUI_RPC_URL',
        id: 'sui-quicknode',
        name: 'Sui (QuickNode)',
        network: 'sui',
        provider: 'QuickNode'
      },
      // Testnet Endpoints (optional - uncomment to monitor testnets)
      // {
      //   envVar: 'VITE_SEPOLIA_RPC_URL',
      //   id: 'sepolia-alchemy',
      //   name: 'Sepolia (Alchemy)',
      //   network: 'sepolia',
      //   provider: 'Alchemy'
      // },
      // {
      //   envVar: 'VITE_AMOY_RPC_URL',
      //   id: 'amoy-alchemy',
      //   name: 'Polygon Amoy (Alchemy)',
      //   network: 'amoy',
      //   provider: 'Alchemy'
      // }
    ];

    // Add configured endpoints from environment
    for (const config of envEndpoints) {
      const url = import.meta.env[config.envVar];
      if (url && url.trim() !== '') {
        endpoints.push({
          id: config.id,
          name: config.name,
          network: config.network,
          url: url.trim(),
          isPrivate: true,
          provider: config.provider
        });
      }
    }

    return endpoints;
  }

  /**
   * Get all RPC endpoint statuses by actually pinging them
   */
  async getAllRPCStatus(): Promise<RPCEndpoint[]> {
    const allEndpoints = this.getAllConfiguredEndpoints();
    
    console.log(`🔍 Monitoring ${allEndpoints.length} RPC endpoints (${allEndpoints.filter(e => e.isPrivate).length} premium, ${allEndpoints.filter(e => !e.isPrivate).length} public)`);
    
    const statusChecks = allEndpoints.map(endpoint => 
      this.checkRPCEndpoint(endpoint.id)
    );

    const results = await Promise.allSettled(statusChecks);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        return result.value;
      } else {
        // Return failed endpoint
        return {
          ...allEndpoints[index],
          status: 'outage' as const,
          responseTime: 0,
          lastChecked: new Date(),
          error: result.status === 'rejected' ? String(result.reason) : 'Unknown error'
        };
      }
    });
  }

  /**
   * Get RPC status for a specific network
   */
  async getNetworkRPCStatus(network: string): Promise<RPCEndpoint[]> {
    const allStatus = await this.getAllRPCStatus();
    return allStatus.filter(endpoint => endpoint.network === network);
  }

  /**
   * Actually ping a specific RPC endpoint and get real data
   */
  async checkRPCEndpoint(endpointId: string): Promise<RPCEndpoint | null> {
    const allEndpoints = this.getAllConfiguredEndpoints();
    const endpoint = allEndpoints.find(e => e.id === endpointId);
    if (!endpoint) return null;

    const startTime = Date.now();
    
    try {
      let rpcRequest: any;
      
      // Different RPC methods for different networks
      switch (endpoint.network) {
        case 'solana':
          rpcRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getSlot'
          };
          break;
          
        case 'near':
          rpcRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'status',
            params: []
          };
          break;
          
        case 'aptos':
          // Aptos uses REST API, not JSON-RPC for block height
          return await this.checkAptosEndpoint(endpoint, startTime);
          
        case 'sui':
          rpcRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'sui_getLatestCheckpointSequenceNumber'
          };
          break;
          
        default:
          // EVM-compatible networks (Ethereum, Polygon, etc.)
          rpcRequest = {
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1
          };
          break;
      }

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rpcRequest),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rpcResponse: RPCResponse = await response.json();
      
      if (rpcResponse.error) {
        throw new Error(`RPC Error ${rpcResponse.error.code}: ${rpcResponse.error.message}`);
      }

      // Parse block height based on network
      let blockHeight: number | undefined;
      
      switch (endpoint.network) {
        case 'solana':
          blockHeight = rpcResponse.result; // Slot number
          break;
          
        case 'near':
          blockHeight = rpcResponse.result?.sync_info?.latest_block_height;
          break;
          
        case 'sui':
          blockHeight = parseInt(rpcResponse.result);
          break;
          
        default:
          // EVM-compatible: convert hex to decimal
          blockHeight = rpcResponse.result ? parseInt(rpcResponse.result, 16) : undefined;
          break;
      }

      // Determine status based on response time
      let status: 'operational' | 'degraded' | 'outage';
      if (responseTime < 1000) {
        status = 'operational';
      } else if (responseTime < 3000) {
        status = 'degraded';
      } else {
        status = 'outage';
      }

      return {
        ...endpoint,
        status,
        responseTime,
        blockHeight,
        lastChecked: new Date()
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        ...endpoint,
        status: 'outage',
        responseTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Special handler for Aptos REST API
   */
  private async checkAptosEndpoint(endpoint: any, startTime: number): Promise<RPCEndpoint> {
    try {
      const response = await fetch(`${endpoint.url}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const blockHeight = data.block_height ? parseInt(data.block_height) : undefined;

      let status: 'operational' | 'degraded' | 'outage';
      if (responseTime < 1000) {
        status = 'operational';
      } else if (responseTime < 3000) {
        status = 'degraded';
      } else {
        status = 'outage';
      }

      return {
        ...endpoint,
        status,
        responseTime,
        blockHeight,
        lastChecked: new Date()
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        ...endpoint,
        status: 'outage',
        responseTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get a quick health summary of all endpoints
   */
  async getHealthSummary(): Promise<{
    total: number;
    operational: number;
    degraded: number;
    outage: number;
    averageResponseTime: number;
    premiumEndpoints: number;
    publicEndpoints: number;
  }> {
    const endpoints = await this.getAllRPCStatus();
    
    const operational = endpoints.filter(e => e.status === 'operational').length;
    const degraded = endpoints.filter(e => e.status === 'degraded').length;
    const outage = endpoints.filter(e => e.status === 'outage').length;
    const premiumEndpoints = endpoints.filter(e => e.isPrivate).length;
    const publicEndpoints = endpoints.filter(e => !e.isPrivate).length;
    
    const totalResponseTime = endpoints.reduce((sum, e) => sum + e.responseTime, 0);
    const averageResponseTime = endpoints.length > 0 ? totalResponseTime / endpoints.length : 0;

    return {
      total: endpoints.length,
      operational,
      degraded,
      outage,
      averageResponseTime: Math.round(averageResponseTime),
      premiumEndpoints,
      publicEndpoints
    };
  }

  /**
   * Get endpoints grouped by provider
   */
  async getEndpointsByProvider(): Promise<Record<string, RPCEndpoint[]>> {
    const endpoints = await this.getAllRPCStatus();
    const grouped: Record<string, RPCEndpoint[]> = {};
    
    for (const endpoint of endpoints) {
      const provider = endpoint.provider || 'Unknown';
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push(endpoint);
    }
    
    return grouped;
  }
}

export default EnhancedLiveRPCStatusService;
