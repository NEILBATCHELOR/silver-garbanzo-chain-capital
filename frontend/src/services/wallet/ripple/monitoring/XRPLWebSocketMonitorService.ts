/**
 * XRPL WebSocket Monitoring Service
 * Based on official XRPL code sample: monitor-payments-websocket
 * 
 * Monitors XRPL ledger for transactions and events in real-time
 * Reference: https://xrpl.org/monitor-incoming-payments-with-websocket.html
 */

import {
  WebSocketMessageType,
  TransactionStreamMessage,
  LedgerClosedMessage,
  SubscriptionParams,
  ConnectionState,
  WebSocketHandlers,
  MonitoredTransaction
} from './types'

interface PendingRequest {
  resolve: (data: any) => void
  reject: (error: Error) => void
}

export class XRPLWebSocketMonitorService {
  private ws: WebSocket | null = null
  private awaiting: Map<string, PendingRequest> = new Map()
  private handlers: WebSocketHandlers = {}
  private autoIdCounter: number = 0
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 1000 // 1 second
  private subscriptions: SubscriptionParams = {}

  constructor(
    private wsUrl: string,
    handlers?: WebSocketHandlers
  ) {
    if (handlers) {
      this.handlers = handlers
    }
  }

  /**
   * Connect to XRPL WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl)
        this.updateConnectionState('connecting')

        this.ws.addEventListener('open', () => {
          console.log('WebSocket connected to XRPL')
          this.updateConnectionState('connected')
          this.reconnectAttempts = 0
          resolve()
        })

        this.ws.addEventListener('message', (event) => {
          this.handleMessage(event)
        })

        this.ws.addEventListener('close', () => {
          console.log('WebSocket disconnected')
          this.updateConnectionState('disconnected')
          this.attemptReconnect()
        })

        this.ws.addEventListener('error', (event) => {
          console.error('WebSocket error:', event)
          this.updateConnectionState('error')
          if (this.handlers.onError) {
            this.handlers.onError(new Error('WebSocket connection error'))
          }
          reject(new Error('WebSocket connection failed'))
        })
      } catch (error) {
        this.updateConnectionState('error')
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.updateConnectionState('disconnecting')
      this.ws.close()
      this.ws = null
      this.awaiting.clear()
    }
  }

  /**
   * Subscribe to accounts and streams
   */
  async subscribe(params: SubscriptionParams): Promise<any> {
    this.subscriptions = { ...this.subscriptions, ...params }
    
    return this.request({
      command: 'subscribe',
      ...params
    })
  }

  /**
   * Unsubscribe from accounts and streams
   */
  async unsubscribe(params: SubscriptionParams): Promise<any> {
    return this.request({
      command: 'unsubscribe',
      ...params
    })
  }

  /**
   * Send API request over WebSocket
   */
  async request(options: any): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    if (!options.id) {
      options.id = `autoid_${this.autoIdCounter++}`
    }

    return new Promise((resolve, reject) => {
      this.awaiting.set(options.id, { resolve, reject })
      
      try {
        this.ws!.send(JSON.stringify(options))
      } catch (error) {
        this.awaiting.delete(options.id)
        reject(error)
      }
    })
  }

  /**
   * Ping server to check connection
   */
  async ping(): Promise<any> {
    return this.request({ command: 'ping' })
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      const messageType: WebSocketMessageType = data.type

      switch (messageType) {
        case 'response':
          this.handleResponse(data)
          break
        case 'transaction':
          this.handleTransaction(data as TransactionStreamMessage)
          break
        case 'ledgerClosed':
          this.handleLedgerClosed(data as LedgerClosedMessage)
          break
        case 'validation':
          if (this.handlers.onValidation) {
            this.handlers.onValidation(data)
          }
          break
        case 'path_find':
          // Handle path finding updates
          break
        case 'peerStatusChange':
          if (this.handlers.onPeerStatusChange) {
            this.handlers.onPeerStatusChange(data)
          }
          break
        default:
          console.log('Unhandled message type:', messageType, data)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
      if (this.handlers.onError) {
        this.handlers.onError(error as Error)
      }
    }
  }

  /**
   * Handle response to API request
   */
  private handleResponse(data: any): void {
    if (!data.id) {
      console.error('Response without ID:', data)
      return
    }

    const pending = this.awaiting.get(data.id)
    if (pending) {
      if (data.status === 'success') {
        pending.resolve(data)
      } else {
        pending.reject(new Error(data.error || 'Request failed'))
      }
      this.awaiting.delete(data.id)
    } else {
      console.warn('Response to unknown request:', data.id)
    }
  }

  /**
   * Handle transaction stream message
   */
  private handleTransaction(data: TransactionStreamMessage): void {
    if (this.handlers.onTransaction) {
      this.handlers.onTransaction(data)
    }
  }

  /**
   * Handle ledger closed message
   */
  private handleLedgerClosed(data: LedgerClosedMessage): void {
    if (this.handlers.onLedgerClosed) {
      this.handlers.onLedgerClosed(data)
    }
  }

  /**
   * Update connection state and notify handlers
   */
  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state
    if (this.handlers.onConnectionChange) {
      this.handlers.onConnectionChange(state)
    }
  }

  /**
   * Attempt to reconnect after disconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect()
        .then(() => {
          // Re-subscribe to previous subscriptions
          if (Object.keys(this.subscriptions).length > 0) {
            this.subscribe(this.subscriptions)
          }
        })
        .catch(error => {
          console.error('Reconnection failed:', error)
        })
    }, delay)
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers: WebSocketHandlers): void {
    this.handlers = { ...this.handlers, ...handlers }
  }

  /**
   * Extract transaction details
   */
  extractTransactionDetails(tx: TransactionStreamMessage): MonitoredTransaction {
    const amount = tx.transaction.Amount
    const amountString = typeof amount === 'string' 
      ? amount 
      : amount?.value || '0'

    return {
      hash: tx.transaction.hash || '',
      type: tx.transaction.TransactionType,
      account: tx.transaction.Account,
      destination: tx.transaction.Destination,
      amount: amountString,
      status: tx.meta.TransactionResult,
      validated: tx.validated,
      ledgerIndex: tx.ledger_index,
      timestamp: new Date()
    }
  }
}

export const createWebSocketMonitor = (
  wsUrl: string,
  handlers?: WebSocketHandlers
) => new XRPLWebSocketMonitorService(wsUrl, handlers)
