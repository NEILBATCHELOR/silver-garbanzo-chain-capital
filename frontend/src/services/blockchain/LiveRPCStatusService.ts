/**
 * LIVE RPC Status Service for monitoring real blockchain network RPC endpoints
 * This service makes actual HTTP requests to blockchain RPC endpoints
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

class LiveRPCStatusService {
  private static instance: LiveRPCStatusService;
  
  // Public RPC endpoints - these are real endpoints we can ping
  private rpcEndpoints: Omit<RPCEndpoint, 'status' | 'responseTime' | 'lastChecked'>[] = [
    {
      id: 'ethereum-public',
      name: 'Ethereum (Public)',
      network: 'ethereum',
      url: 'https://eth.llamarpc.com'
    },
    {
      id: 'ethereum-cloudflare',
      name: 'Ethereum (Cloudflare)',
      network: 'ethereum',
      url: 'https://cloudflare-eth.com'
    },
    {
      id: 'polygon-public',
      name: 'Polygon (Public)',
      network: 'polygon',
      url: 'https://polygon-rpc.com'
    },
    {
      id: 'arbitrum-public',
      name: 'Arbitrum One (Public)',
      network: 'arbitrum',
      url: 'https://arb1.arbitrum.io/rpc'
    },
    {
      id: 'optimism-public',
      name: 'Optimism (Public)',
      network: 'optimism', 
      url: 'https://mainnet.optimism.io'
    },
    {
      id: 'avalanche-public',
      name: 'Avalanche (Public)',
      network: 'avalanche',
      url: 'https://api.avax.network/ext/bc/C/rpc'
    },
    {
      id: 'bsc-public',
      name: 'BSC (Public)',
      network: 'bsc',
      url: 'https://bsc-dataseed.binance.org'
    }
  ];

  private constructor() {}

  static getInstance(): LiveRPCStatusService {
    if (!LiveRPCStatusService.instance) {
      LiveRPCStatusService.instance = new LiveRPCStatusService();
    }
    return LiveRPCStatusService.instance;
  }

  /**
   * Get all RPC endpoint statuses by actually pinging them
   */
  async getAllRPCStatus(): Promise<RPCEndpoint[]> {
    const statusChecks = this.rpcEndpoints.map(endpoint => 
      this.checkRPCEndpoint(endpoint.id)
    );

    const results = await Promise.allSettled(statusChecks);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        return result.value;
      } else {
        // Return failed endpoint
        return {
          ...this.rpcEndpoints[index],
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
    const endpoint = this.rpcEndpoints.find(e => e.id === endpointId);
    if (!endpoint) return null;

    const startTime = Date.now();
    
    try {
      // Make actual JSON-RPC request to get latest block number
      const rpcRequest: RPCRequest = {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      };

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

      // Convert hex block number to decimal
      const blockHeight = rpcResponse.result ? parseInt(rpcResponse.result, 16) : undefined;

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
   * Batch check multiple endpoints concurrently
   */
  async batchCheckEndpoints(endpointIds: string[]): Promise<RPCEndpoint[]> {
    const checks = endpointIds.map(id => this.checkRPCEndpoint(id));
    const results = await Promise.allSettled(checks);
    
    return results
      .map(result => result.status === 'fulfilled' ? result.value : null)
      .filter((endpoint): endpoint is RPCEndpoint => endpoint !== null);
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
  }> {
    const endpoints = await this.getAllRPCStatus();
    
    const operational = endpoints.filter(e => e.status === 'operational').length;
    const degraded = endpoints.filter(e => e.status === 'degraded').length;
    const outage = endpoints.filter(e => e.status === 'outage').length;
    
    const totalResponseTime = endpoints.reduce((sum, e) => sum + e.responseTime, 0);
    const averageResponseTime = endpoints.length > 0 ? totalResponseTime / endpoints.length : 0;

    return {
      total: endpoints.length,
      operational,
      degraded,
      outage,
      averageResponseTime: Math.round(averageResponseTime)
    };
  }
}

export default LiveRPCStatusService;
