/**
 * XRPL Client Manager
 * Manages WebSocket connections to XRP Ledger nodes
 * Provides connection pooling, automatic reconnection, and retry logic
 */

import { Client } from 'xrpl'
import { 
  XRPL_NETWORKS, 
  XRPL_CONFIG, 
  type XRPLNetwork,
  type XRPLNetworkConfig 
} from '../config/XRPLConfig'

interface ClientState {
  client: Client
  isConnecting: boolean
  lastError?: Error
  connectionAttempts: number
}

/**
 * Singleton manager for XRPL client connections
 */
class XRPLClientManager {
  private clients: Map<XRPLNetwork, ClientState> = new Map()
  private connectionPromises: Map<XRPLNetwork, Promise<void>> = new Map()

  /**
   * Get or create a client for the specified network
   * Automatically connects if not already connected
   */
  async getClient(network: XRPLNetwork = XRPL_CONFIG.defaultNetwork): Promise<Client> {
    const networkConfig = XRPL_NETWORKS[network]
    
    if (!networkConfig) {
      throw new Error(`Invalid XRPL network: ${network}`)
    }

    // Initialize client state if not exists
    if (!this.clients.has(network)) {
      const client = new Client(networkConfig.url, {
        timeout: XRPL_CONFIG.connectionTimeout,
        connectionTimeout: XRPL_CONFIG.requestTimeout
      })
      
      this.clients.set(network, {
        client,
        isConnecting: false,
        connectionAttempts: 0
      })
    }

    const state = this.clients.get(network)!
    const client = state.client

    // Ensure client is connected
    if (!client.isConnected()) {
      await this.connect(network)
    }

    return client
  }

  /**
   * Connect to XRPL network with retry logic
   */
  private async connect(network: XRPLNetwork): Promise<void> {
    // Return existing connection promise if already connecting
    if (this.connectionPromises.has(network)) {
      return this.connectionPromises.get(network)!
    }

    const state = this.clients.get(network)
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`)
    }

    // Mark as connecting
    state.isConnecting = true

    // Create and store connection promise
    const connectionPromise = this.connectWithRetry(network, state)
    this.connectionPromises.set(network, connectionPromise)

    try {
      await connectionPromise
    } finally {
      state.isConnecting = false
      this.connectionPromises.delete(network)
    }
  }

  /**
   * Connect with exponential backoff retry
   */
  private async connectWithRetry(
    network: XRPLNetwork,
    state: ClientState,
    attempt: number = 0
  ): Promise<void> {
    try {
      console.log(`[XRPL] Connecting to ${network}... (attempt ${attempt + 1}/${XRPL_CONFIG.retryAttempts})`)
      
      await state.client.connect()
      
      console.log(`✅ [XRPL] Connected to ${network}`)
      state.connectionAttempts = 0
      state.lastError = undefined
      
    } catch (error) {
      const err = error as Error
      state.lastError = err
      state.connectionAttempts++

      console.error(`❌ [XRPL] Connection failed for ${network}:`, err.message)

      if (attempt < XRPL_CONFIG.retryAttempts - 1) {
        const delay = XRPL_CONFIG.retryDelay * Math.pow(2, attempt)
        console.log(`⏳ [XRPL] Retrying in ${delay}ms...`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.connectWithRetry(network, state, attempt + 1)
      }

      throw new Error(
        `Failed to connect to XRPL ${network} after ${XRPL_CONFIG.retryAttempts} attempts: ${err.message}`
      )
    }
  }

  /**
   * Reconnect to a network
   * Useful for handling disconnections
   */
  async reconnect(network: XRPLNetwork): Promise<void> {
    const state = this.clients.get(network)
    
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`)
    }

    // Disconnect if connected
    if (state.client.isConnected()) {
      await state.client.disconnect()
    }

    // Reset connection state
    state.connectionAttempts = 0
    state.lastError = undefined

    // Reconnect
    await this.connect(network)
  }

  /**
   * Disconnect from a specific network
   */
  async disconnect(network: XRPLNetwork): Promise<void> {
    const state = this.clients.get(network)
    
    if (state && state.client.isConnected()) {
      await state.client.disconnect()
      console.log(`🔌 [XRPL] Disconnected from ${network}`)
    }

    this.clients.delete(network)
    this.connectionPromises.delete(network)
  }

  /**
   * Disconnect from all networks
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.entries()).map(
      async ([network, state]) => {
        if (state.client.isConnected()) {
          try {
            await state.client.disconnect()
            console.log(`🔌 [XRPL] Disconnected from ${network}`)
          } catch (error) {
            console.error(`Error disconnecting from ${network}:`, error)
          }
        }
      }
    )

    await Promise.allSettled(disconnectPromises)
    
    this.clients.clear()
    this.connectionPromises.clear()
  }

  /**
   * Get connection status for a network
   */
  getConnectionStatus(network: XRPLNetwork): {
    isConnected: boolean
    isConnecting: boolean
    connectionAttempts: number
    lastError?: string
  } {
    const state = this.clients.get(network)
    
    if (!state) {
      return {
        isConnected: false,
        isConnecting: false,
        connectionAttempts: 0
      }
    }

    return {
      isConnected: state.client.isConnected(),
      isConnecting: state.isConnecting,
      connectionAttempts: state.connectionAttempts,
      lastError: state.lastError?.message
    }
  }

  /**
   * Get status of all networks
   */
  getAllConnectionStatuses(): Record<XRPLNetwork, ReturnType<typeof this.getConnectionStatus>> {
    return {
      MAINNET: this.getConnectionStatus('MAINNET'),
      TESTNET: this.getConnectionStatus('TESTNET'),
      DEVNET: this.getConnectionStatus('DEVNET')
    }
  }

  /**
   * Check if manager has any active connections
   */
  hasActiveConnections(): boolean {
    return Array.from(this.clients.values()).some(
      state => state.client.isConnected()
    )
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(network: XRPLNetwork): XRPLNetworkConfig {
    return XRPL_NETWORKS[network]
  }
}

// Export singleton instance
export const xrplClientManager = new XRPLClientManager()
