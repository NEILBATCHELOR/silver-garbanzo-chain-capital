/**
 * XRPL WebSocket Monitoring Types
 * Based on official XRPL WebSocket monitoring implementation
 */

/**
 * WebSocket message types from XRPL
 */
export type WebSocketMessageType = 
  | 'response'
  | 'transaction'
  | 'validation'
  | 'ledgerClosed'
  | 'path_find'
  | 'peerStatusChange'

/**
 * Transaction stream message
 */
export interface TransactionStreamMessage {
  type: 'transaction'
  validated: boolean
  status: string
  transaction: {
    TransactionType: string
    Account: string
    Destination?: string
    Amount?: any
    Fee?: string
    Sequence?: number
    hash?: string
    [key: string]: any
  }
  meta: {
    TransactionResult: string
    TransactionIndex?: number
    delivered_amount?: any
    [key: string]: any
  }
  ledger_index?: number
  ledger_hash?: string
  engine_result?: string
  engine_result_code?: number
  engine_result_message?: string
}

/**
 * Ledger closed message
 */
export interface LedgerClosedMessage {
  type: 'ledgerClosed'
  ledger_index: number
  ledger_hash: string
  ledger_time: number
  fee_base: number
  fee_ref: number
  reserve_base: number
  reserve_inc: number
  validated_ledgers?: string
  txn_count?: number
}

/**
 * Subscription parameters
 */
export interface SubscriptionParams {
  accounts?: string[]
  accounts_proposed?: string[]
  streams?: ('ledger' | 'transactions' | 'transactions_proposed' | 'validations' | 'manifests' | 'peer_status')[]
  books?: Array<{
    taker_gets: { currency: string; issuer?: string }
    taker_pays: { currency: string; issuer?: string }
    taker?: string
    snapshot?: boolean
    both?: boolean
  }>
}

/**
 * WebSocket connection state
 */
export type ConnectionState = 
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'error'

/**
 * WebSocket event handlers
 */
export interface WebSocketHandlers {
  onTransaction?: (tx: TransactionStreamMessage) => void
  onLedgerClosed?: (ledger: LedgerClosedMessage) => void
  onValidation?: (validation: any) => void
  onPeerStatusChange?: (change: any) => void
  onConnectionChange?: (state: ConnectionState) => void
  onError?: (error: Error) => void
}

/**
 * Monitored transaction record
 */
export interface MonitoredTransaction {
  hash: string
  type: string
  account: string
  destination?: string
  amount?: string
  status: string
  validated: boolean
  ledgerIndex?: number
  timestamp: Date
}

/**
 * Database record for monitored transactions
 */
export interface DBMonitoredTransaction {
  id: string
  project_id: string
  account_address: string
  transaction_hash: string
  transaction_type: string
  destination_address: string | null
  amount: string | null
  currency: string | null
  status: string
  validated: boolean
  ledger_index: number | null
  detected_at: Date
  created_at: Date
}

/**
 * Monitoring statistics
 */
export interface MonitoringStats {
  totalTransactions: number
  validatedTransactions: number
  failedTransactions: number
  averageConfirmationTime: number
  mostActiveAccount: string
}
