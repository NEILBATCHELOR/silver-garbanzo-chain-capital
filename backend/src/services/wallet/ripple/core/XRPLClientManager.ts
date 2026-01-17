/**
 * XRPL Client Manager - Backend Version
 * Manages WebSocket connections to XRP Ledger nodes
 */

import { Client } from 'xrpl'

export type XRPLNetwork = 'mainnet' | 'testnet' | 'devnet'

interface NetworkConfig {
  url: string
  name: string
}

const XRPL_NETWORKS: Record<XRPLNetwork, NetworkConfig> = {
  mainnet: {
    url: 'wss://xrplcluster.com',
    name: 'Mainnet'
  },
  testnet: {
    url: 'wss://s.altnet.rippletest.net:51233',
    name: 'Testnet'
  },
  devnet: {
    url: 'wss://s.devnet.rippletest.net:51233',
    name: 'Devnet'
  }
}

/**
 * Singleton manager for XRPL client connections
 */
class XRPLClientManager {
  private clients: Map<XRPLNetwork, Client> = new Map()

  /**
   * Get or create a client for the specified network
   */
  getClient(network: XRPLNetwork = 'mainnet'): Client {
    if (!this.clients.has(network)) {
      const config = XRPL_NETWORKS[network]
      const client = new Client(config.url)
      this.clients.set(network, client)
    }
    return this.clients.get(network)!
  }

  /**
   * Disconnect from a specific network
   */
  async disconnect(network: XRPLNetwork): Promise<void> {
    const client = this.clients.get(network)
    if (client?.isConnected()) {
      await client.disconnect()
    }
    this.clients.delete(network)
  }

  /**
   * Disconnect from all networks
   */
  async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.clients.values()).map(client =>
        client.isConnected() ? client.disconnect() : Promise.resolve()
      )
    )
    this.clients.clear()
  }
}

// Export singleton instance
export const xrplClientManager = new XRPLClientManager()
