/**
 * XRPL WebSocket Service
 * 
 * Provides real-time updates for all XRPL features
 * Handles subscriptions, event broadcasting, and connection management
 * 
 * NOTE: This service requires socket.io to be installed:
 * pnpm add socket.io @types/socket.io
 */

// Temporarily disable type checking for socket.io import until package is installed
// @ts-ignore - socket.io not yet installed in dependencies
import { Server as SocketIOServer, Socket } from 'socket.io'
import { Client as XRPLClient } from 'xrpl'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'

export enum XRPLEventType {
  // Transaction events
  TRANSACTION_SUBMITTED = 'transaction:submitted',
  TRANSACTION_VALIDATED = 'transaction:validated',
  TRANSACTION_FAILED = 'transaction:failed',
  
  // AMM events
  AMM_POOL_CREATED = 'amm:pool_created',
  AMM_LIQUIDITY_ADDED = 'amm:liquidity_added',
  AMM_LIQUIDITY_REMOVED = 'amm:liquidity_removed',
  AMM_PRICE_UPDATED = 'amm:price_updated',
  
  // DEX events
  DEX_ORDER_PLACED = 'dex:order_placed',
  DEX_ORDER_FILLED = 'dex:order_filled',
  DEX_ORDER_CANCELLED = 'dex:order_cancelled',
  DEX_TRADE_EXECUTED = 'dex:trade_executed',
  DEX_OFFER_CREATED = 'dex:offer_created',
  DEX_OFFER_CANCELLED = 'dex:offer_cancelled',
  DEX_SWAP_EXECUTED = 'dex:swap_executed',
  
  // Multi-sig events
  MULTISIG_SIGNER_LIST_CREATED = 'multisig:signer_list_created',
  MULTISIG_SIGNER_LIST_REMOVED = 'multisig:signer_list_removed',
  MULTISIG_PROPOSAL_CREATED = 'multisig:proposal_created',
  MULTISIG_PROPOSAL_SIGNED = 'multisig:proposal_signed',
  MULTISIG_SIGNATURE_ADDED = 'multisig:signature_added',
  MULTISIG_PROPOSAL_EXECUTED = 'multisig:proposal_executed',
  
  // Identity events
  IDENTITY_DID_CREATED = 'identity:did_created',
  IDENTITY_DID_UPDATED = 'identity:did_updated',
  IDENTITY_DID_DELETED = 'identity:did_deleted',
  IDENTITY_CREDENTIAL_ISSUED = 'identity:credential_issued',
  IDENTITY_CREDENTIAL_ACCEPTED = 'identity:credential_accepted',
  IDENTITY_CREDENTIAL_REVOKED = 'identity:credential_revoked',
  
  // Account events
  ACCOUNT_BALANCE_CHANGED = 'account:balance_changed',
  ACCOUNT_FROZEN = 'account:frozen',
  ACCOUNT_UNFROZEN = 'account:unfrozen',
  
  // Payment events
  PAYMENT_RECEIVED = 'payment:received',
  PAYMENT_SENT = 'payment:sent',
  
  // NFT events
  NFT_MINTED = 'nft:minted',
  NFT_TRANSFERRED = 'nft:transferred',
  NFT_BURNED = 'nft:burned',
  
  // Credential events (legacy - use IDENTITY_ events)
  CREDENTIAL_ISSUED = 'credential:issued',
  CREDENTIAL_REVOKED = 'credential:revoked',
  
  // Compliance events
  COMPLIANCE_GLOBAL_FREEZE_ENABLED = 'compliance:global_freeze_enabled',
  COMPLIANCE_GLOBAL_FREEZE_DISABLED = 'compliance:global_freeze_disabled',
  COMPLIANCE_TRUSTLINE_FROZEN = 'compliance:trustline_frozen',
  COMPLIANCE_TRUSTLINE_UNFROZEN = 'compliance:trustline_unfrozen',
  COMPLIANCE_NO_FREEZE_ENABLED = 'compliance:no_freeze_enabled',
  COMPLIANCE_DEPOSIT_AUTH_ENABLED = 'compliance:deposit_auth_enabled',
  COMPLIANCE_DEPOSITOR_AUTHORIZED = 'compliance:depositor_authorized',
  COMPLIANCE_DEPOSITOR_UNAUTHORIZED = 'compliance:depositor_unauthorized',
  
  // System events
  LEDGER_CLOSED = 'ledger:closed',
  CONNECTION_STATUS = 'connection:status'
}

export interface XRPLEvent {
  type: XRPLEventType
  data: any
  timestamp: string
  ledgerIndex?: number
  transactionHash?: string
}

export class XRPLWebSocketService {
  private io: SocketIOServer
  private xrplClient: XRPLClient
  private subscriptions: Map<string, Set<Socket>> = new Map()
  private isConnected: boolean = false

  constructor(io: SocketIOServer) {
    this.io = io
    this.xrplClient = xrplClientManager.getClient('mainnet')
    this.setupSocketHandlers()
  }

  /**
   * Initialize WebSocket service
   */
  async initialize(): Promise<void> {
    try {
      await this.xrplClient.connect()
      this.isConnected = true
      this.setupXRPLSubscriptions()
      console.log('[XRPL WebSocket] Service initialized')
    } catch (error) {
      console.error('[XRPL WebSocket] Initialization failed:', error)
      this.isConnected = false
    }
  }

  /**
   * Setup Socket.IO handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('[XRPL WebSocket] Client connected:', socket.id)

      // Subscribe to events
      socket.on('subscribe', (data: {
        events: XRPLEventType[]
        filters?: any
      }) => {
        this.handleSubscribe(socket, data)
      })

      // Unsubscribe from events
      socket.on('unsubscribe', (data: {
        events: XRPLEventType[]
      }) => {
        this.handleUnsubscribe(socket, data)
      })

      // Subscribe to account
      socket.on('subscribe:account', (address: string) => {
        this.subscribeToAccount(socket, address)
      })

      // Subscribe to AMM pool
      socket.on('subscribe:amm', (poolId: string) => {
        this.subscribeToAMMPool(socket, poolId)
      })

      // Subscribe to DEX pair
      socket.on('subscribe:dex', (data: {
        baseCurrency: string
        quoteCurrency: string
      }) => {
        this.subscribeToDEXPair(socket, data)
      })

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket)
      })

      // Send connection status
      this.emitToSocket(socket, XRPLEventType.CONNECTION_STATUS, {
        connected: this.isConnected
      })
    })
  }

  /**
   * Setup XRPL ledger subscriptions
   */
  private setupXRPLSubscriptions(): void {
    // Subscribe to ledger closes
    this.xrplClient.on('ledgerClosed', (ledger) => {
      this.broadcastEvent({
        type: XRPLEventType.LEDGER_CLOSED,
        data: {
          ledgerIndex: ledger.ledger_index,
          ledgerHash: ledger.ledger_hash,
          ledgerTime: ledger.ledger_time
        },
        timestamp: new Date().toISOString(),
        ledgerIndex: ledger.ledger_index
      })
    })

    // Subscribe to validated transactions
    this.xrplClient.on('transaction', (tx) => {
      this.handleValidatedTransaction(tx)
    })

    // Handle disconnections
    this.xrplClient.on('disconnected', () => {
      this.isConnected = false
      this.broadcastEvent({
        type: XRPLEventType.CONNECTION_STATUS,
        data: { connected: false },
        timestamp: new Date().toISOString()
      })
    })

    this.xrplClient.on('connected', () => {
      this.isConnected = true
      this.broadcastEvent({
        type: XRPLEventType.CONNECTION_STATUS,
        data: { connected: true },
        timestamp: new Date().toISOString()
      })
    })
  }

  /**
   * Handle subscription request
   */
  private handleSubscribe(socket: Socket, data: {
    events: XRPLEventType[]
    filters?: any
  }): void {
    data.events.forEach(event => {
      if (!this.subscriptions.has(event)) {
        this.subscriptions.set(event, new Set())
      }
      this.subscriptions.get(event)!.add(socket)
    })

    console.log(`[XRPL WebSocket] Client ${socket.id} subscribed to:`, data.events)
  }

  /**
   * Handle unsubscribe request
   */
  private handleUnsubscribe(socket: Socket, data: {
    events: XRPLEventType[]
  }): void {
    data.events.forEach(event => {
      const subscribers = this.subscriptions.get(event)
      if (subscribers) {
        subscribers.delete(socket)
      }
    })

    console.log(`[XRPL WebSocket] Client ${socket.id} unsubscribed from:`, data.events)
  }

  /**
   * Subscribe to account updates
   */
  private async subscribeToAccount(socket: Socket, address: string): Promise<void> {
    try {
      await this.xrplClient.request({
        command: 'subscribe',
        accounts: [address]
      })

      // Store subscription
      socket.data.accountSubscriptions = socket.data.accountSubscriptions || new Set()
      socket.data.accountSubscriptions.add(address)

      console.log(`[XRPL WebSocket] Client ${socket.id} subscribed to account:`, address)
    } catch (error) {
      console.error('[XRPL WebSocket] Account subscription failed:', error)
      socket.emit('error', {
        message: 'Failed to subscribe to account updates',
        address
      })
    }
  }

  /**
   * Subscribe to AMM pool updates
   */
  private subscribeToAMMPool(socket: Socket, poolId: string): void {
    // Store subscription for AMM pool events
    socket.data.ammSubscriptions = socket.data.ammSubscriptions || new Set()
    socket.data.ammSubscriptions.add(poolId)

    console.log(`[XRPL WebSocket] Client ${socket.id} subscribed to AMM pool:`, poolId)
  }

  /**
   * Subscribe to DEX pair updates
   */
  private subscribeToDEXPair(socket: Socket, data: {
    baseCurrency: string
    quoteCurrency: string
  }): void {
    const pairKey = `${data.baseCurrency}/${data.quoteCurrency}`
    
    socket.data.dexSubscriptions = socket.data.dexSubscriptions || new Set()
    socket.data.dexSubscriptions.add(pairKey)

    console.log(`[XRPL WebSocket] Client ${socket.id} subscribed to DEX pair:`, pairKey)
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: Socket): void {
    // Remove from all subscriptions
    this.subscriptions.forEach((subscribers) => {
      subscribers.delete(socket)
    })

    console.log(`[XRPL WebSocket] Client ${socket.id} disconnected`)
  }

  /**
   * Handle validated transaction
   */
  private handleValidatedTransaction(tx: any): void {
    const transactionType = tx.transaction.TransactionType

    // Emit general transaction event
    this.broadcastEvent({
      type: XRPLEventType.TRANSACTION_VALIDATED,
      data: tx,
      timestamp: new Date().toISOString(),
      ledgerIndex: tx.ledger_index,
      transactionHash: tx.transaction.hash
    })

    // Emit specific events based on transaction type
    switch (transactionType) {
      case 'Payment':
        this.handlePaymentTransaction(tx)
        break
      case 'AMMCreate':
      case 'AMMDeposit':
      case 'AMMWithdraw':
        this.handleAMMTransaction(tx)
        break
      case 'OfferCreate':
      case 'OfferCancel':
        this.handleDEXTransaction(tx)
        break
      case 'NFTokenMint':
      case 'NFTokenBurn':
      case 'NFTokenCreateOffer':
      case 'NFTokenAcceptOffer':
        this.handleNFTTransaction(tx)
        break
    }
  }

  /**
   * Handle payment transaction
   */
  private handlePaymentTransaction(tx: any): void {
    const { Account, Destination, Amount } = tx.transaction

    this.broadcastEvent({
      type: XRPLEventType.PAYMENT_SENT,
      data: {
        from: Account,
        to: Destination,
        amount: Amount,
        hash: tx.transaction.hash
      },
      timestamp: new Date().toISOString(),
      transactionHash: tx.transaction.hash
    })
  }

  /**
   * Handle AMM transaction
   */
  private handleAMMTransaction(tx: any): void {
    const transactionType = tx.transaction.TransactionType
    
    let eventType: XRPLEventType
    switch (transactionType) {
      case 'AMMCreate':
        eventType = XRPLEventType.AMM_POOL_CREATED
        break
      case 'AMMDeposit':
        eventType = XRPLEventType.AMM_LIQUIDITY_ADDED
        break
      case 'AMMWithdraw':
        eventType = XRPLEventType.AMM_LIQUIDITY_REMOVED
        break
      default:
        return
    }

    this.broadcastEvent({
      type: eventType,
      data: tx,
      timestamp: new Date().toISOString(),
      transactionHash: tx.transaction.hash
    })
  }

  /**
   * Handle DEX transaction
   */
  private handleDEXTransaction(tx: any): void {
    const transactionType = tx.transaction.TransactionType
    
    let eventType: XRPLEventType
    switch (transactionType) {
      case 'OfferCreate':
        eventType = XRPLEventType.DEX_ORDER_PLACED
        break
      case 'OfferCancel':
        eventType = XRPLEventType.DEX_ORDER_CANCELLED
        break
      default:
        return
    }

    this.broadcastEvent({
      type: eventType,
      data: tx,
      timestamp: new Date().toISOString(),
      transactionHash: tx.transaction.hash
    })
  }

  /**
   * Handle NFT transaction
   */
  private handleNFTTransaction(tx: any): void {
    const transactionType = tx.transaction.TransactionType
    
    let eventType: XRPLEventType
    switch (transactionType) {
      case 'NFTokenMint':
        eventType = XRPLEventType.NFT_MINTED
        break
      case 'NFTokenBurn':
        eventType = XRPLEventType.NFT_BURNED
        break
      case 'NFTokenAcceptOffer':
        eventType = XRPLEventType.NFT_TRANSFERRED
        break
      default:
        return
    }

    this.broadcastEvent({
      type: eventType,
      data: tx,
      timestamp: new Date().toISOString(),
      transactionHash: tx.transaction.hash
    })
  }

  /**
   * Broadcast event to all subscribers
   */
  private broadcastEvent(event: XRPLEvent): void {
    const subscribers = this.subscriptions.get(event.type)
    if (subscribers && subscribers.size > 0) {
      subscribers.forEach(socket => {
        this.emitToSocket(socket, event.type, event.data)
      })
    }
  }

  /**
   * Emit event to specific socket
   */
  private emitToSocket(socket: Socket, eventType: XRPLEventType, data: any): void {
    socket.emit(eventType, {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Emit event to all sockets
   */
  public emitToAll(eventType: XRPLEventType, data: any): void {
    this.io.emit(eventType, {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Emit event to specific account subscribers
   */
  public emitToAccount(address: string, eventType: XRPLEventType, data: any): void {
    this.io.sockets.sockets.forEach((socket: any) => {
      if (socket.data.accountSubscriptions?.has(address)) {
        this.emitToSocket(socket, eventType, data)
      }
    })
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    try {
      await this.xrplClient.disconnect()
      this.isConnected = false
      console.log('[XRPL WebSocket] Service shutdown')
    } catch (error) {
      console.error('[XRPL WebSocket] Shutdown error:', error)
    }
  }
}

// Singleton instance
let xrplWebSocketService: XRPLWebSocketService | null = null

export const initializeXRPLWebSocket = (io: SocketIOServer): XRPLWebSocketService => {
  if (!xrplWebSocketService) {
    xrplWebSocketService = new XRPLWebSocketService(io)
  }
  return xrplWebSocketService
}

export const getXRPLWebSocketService = (): XRPLWebSocketService => {
  if (!xrplWebSocketService) {
    throw new Error('XRPL WebSocket service not initialized')
  }
  return xrplWebSocketService
}
