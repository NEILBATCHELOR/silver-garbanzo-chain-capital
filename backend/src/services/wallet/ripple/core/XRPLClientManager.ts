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
    url: process.env.XRPL_MAINNET_WS_URL || '',
    name: 'Mainnet'
  },
  testnet: {
    url: process.env.XRPL_TESTNET_WS_URL || '',
    name: 'Testnet'
  },
  devnet: {
    url: process.env.XRPL_DEVNET_WS_URL || '',
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
      
      // Validate that URL is configured
      if (!config.url) {
        throw new Error(
          `XRPL WebSocket URL not configured for ${network}. ` +
          `Please set XRPL_${network.toUpperCase()}_WS_URL in backend .env file`
        )
      }
      
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
