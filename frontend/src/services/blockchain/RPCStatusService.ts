/**
 * RPC Status Service for monitoring blockchain network RPC endpoints
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
}

class RPCStatusService {
  private static instance: RPCStatusService;
  private rpcEndpoints: RPCEndpoint[] = [
    {
      id: 'ethereum-infura',
      name: 'Ethereum (Infura)',
      network: 'ethereum',
      url: 'https://mainnet.infura.io/v3/',
      status: 'operational',
      responseTime: 150,
      lastChecked: new Date()
    },
    {
      id: 'ethereum-alchemy',
      name: 'Ethereum (Alchemy)',
      network: 'ethereum', 
      url: 'https://eth-mainnet.alchemyapi.io/v2/',
      status: 'operational',
      responseTime: 120,
      lastChecked: new Date()
    },
    {
      id: 'polygon-matic',
      name: 'Polygon (Matic Network)',
      network: 'polygon',
      url: 'https://polygon-rpc.com/',
      status: 'operational',
      responseTime: 200,
      lastChecked: new Date()
    },
    {
      id: 'arbitrum-one',
      name: 'Arbitrum One',
      network: 'arbitrum',
      url: 'https://arb1.arbitrum.io/rpc',
      status: 'operational',
      responseTime: 100,
      lastChecked: new Date()
    },
    {
      id: 'optimism-mainnet',
      name: 'Optimism Mainnet',
      network: 'optimism',
      url: 'https://mainnet.optimism.io/',
      status: 'operational',
      responseTime: 110,
      lastChecked: new Date()
    },
    {
      id: 'avalanche-c-chain',
      name: 'Avalanche C-Chain',
      network: 'avalanche',
      url: 'https://api.avax.network/ext/bc/C/rpc',
      status: 'operational',
      responseTime: 180,
      lastChecked: new Date()
    },
    {
      id: 'bsc-mainnet',
      name: 'Binance Smart Chain',
      network: 'bsc',
      url: 'https://bsc-dataseed.binance.org/',
      status: 'operational',
      responseTime: 220,
      lastChecked: new Date()
    }
  ];

  private constructor() {}

  static getInstance(): RPCStatusService {
    if (!RPCStatusService.instance) {
      RPCStatusService.instance = new RPCStatusService();
    }
    return RPCStatusService.instance;
  }

  /**
   * Get all RPC endpoint statuses
   */
  async getAllRPCStatus(): Promise<RPCEndpoint[]> {
    // In production, this would actually ping the RPC endpoints
    // For now, simulate with some random variations
    return this.rpcEndpoints.map(endpoint => ({
      ...endpoint,
      status: this.simulateStatus(),
      responseTime: this.simulateResponseTime(endpoint.responseTime),
      blockHeight: this.simulateBlockHeight(endpoint.network),
      lastChecked: new Date()
    }));
  }

  /**
   * Get RPC status for a specific network
   */
  async getNetworkRPCStatus(network: string): Promise<RPCEndpoint[]> {
    const allStatus = await this.getAllRPCStatus();
    return allStatus.filter(endpoint => endpoint.network === network);
  }

  /**
   * Check a specific RPC endpoint
   */
  async checkRPCEndpoint(endpointId: string): Promise<RPCEndpoint | null> {
    const endpoint = this.rpcEndpoints.find(e => e.id === endpointId);
    if (!endpoint) return null;

    // In production, this would make an actual HTTP request to the RPC
    // For now, simulate the check
    return {
      ...endpoint,
      status: this.simulateStatus(),
      responseTime: this.simulateResponseTime(endpoint.responseTime),
      blockHeight: this.simulateBlockHeight(endpoint.network),
      lastChecked: new Date()
    };
  }

  /**
   * Simulate endpoint status (for demo purposes)
   */
  private simulateStatus(): 'operational' | 'degraded' | 'outage' {
    const rand = Math.random();
    if (rand > 0.95) return 'outage';
    if (rand > 0.85) return 'degraded';
    return 'operational';
  }

  /**
   * Simulate response time with some variation
   */
  private simulateResponseTime(baseTime: number): number {
    const variation = (Math.random() - 0.5) * 0.4; // ±20% variation
    return Math.round(baseTime * (1 + variation));
  }

  /**
   * Simulate block height for different networks
   */
  private simulateBlockHeight(network: string): number {
    const baseHeights: Record<string, number> = {
      ethereum: 18500000,
      polygon: 49000000,
      arbitrum: 150000000,
      optimism: 112000000,
      avalanche: 35000000,
      bsc: 33000000
    };

    const base = baseHeights[network] || 18500000;
    return base + Math.floor(Math.random() * 1000); // Add some random blocks
  }
}

export default RPCStatusService;
