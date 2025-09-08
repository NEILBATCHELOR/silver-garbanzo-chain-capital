/**
 * DFNS Webhooks Types
 * 
 * Types for DFNS webhook management and event handling
 */

// =============================================================================
// DFNS WEBHOOKS API TYPES (for DFNS SDK integration)
// =============================================================================

// Webhook Event Types - 30+ supported event types from DFNS
export type DfnsWebhookEvent = 
  // Wallet events
  | 'wallet.created' | 'wallet.exported' | 'wallet.delegated' | 'wallet.imported'
  | 'wallet.event.onchain' // Chain events detected by indexer (Tier-1 chains only)
  
  // Transfer events
  | 'wallet.transfer.initiated' | 'wallet.transfer.broadcasted' | 'wallet.transfer.confirmed'
  | 'wallet.transfer.failed' | 'wallet.transfer.executed'
  
  // Transaction events  
  | 'wallet.transaction.initiated' | 'wallet.transaction.broadcasted' | 'wallet.transaction.confirmed'
  | 'wallet.transaction.failed' | 'wallet.transaction.executed'
  
  // Signature events
  | 'wallet.signature.initiated' | 'wallet.signature.signed' | 'wallet.signature.failed'
  | 'wallet.signature.rejected' // Policy approval rejected
  
  // Policy events
  | 'policy.triggered' | 'policy.approval.pending' | 'policy.approval.approved' 
  | 'policy.approval.rejected' | 'policy.approval.expired'
  
  // User events
  | 'user.registered' | 'user.activated' | 'user.deactivated' | 'user.deleted'
  
  // Key events
  | 'key.created' | 'key.delegated' | 'key.exported' | 'key.imported'
  
  // Service Account events
  | 'service_account.created' | 'service_account.activated' | 'service_account.deactivated'
  
  // Credential events
  | 'credential.created' | 'credential.activated' | 'credential.deactivated'
  
  // Organization events  
  | 'organization.updated'
  
  // Generic catch-all for new events
  | string;

// Webhook Status
export type DfnsWebhookStatus = 'Enabled' | 'Disabled';

// Core Webhook Management APIs

// POST /webhooks - Create Webhook
export interface DfnsCreateWebhookRequest {
  url: string;
  description?: string;
  status?: DfnsWebhookStatus;
  events: DfnsWebhookEvent[] | ['*']; // ['*'] subscribes to all events
}

export interface DfnsCreateWebhookResponse {
  id: string;
  url: string;
  events: DfnsWebhookEvent[];
  description?: string;
  status: DfnsWebhookStatus;
  dateCreated: string;
  dateUpdated: string;
  secret: string; // Only included once in creation response - save securely!
}

// GET /webhooks/:webhookId - Get Webhook
export interface DfnsGetWebhookResponse {
  id: string;
  url: string;
  events: DfnsWebhookEvent[];
  description?: string;
  status: DfnsWebhookStatus;
  dateCreated: string;
  dateUpdated: string;
  // Note: secret is never returned in get operations for security
}

// GET /webhooks - List Webhooks
export interface DfnsListWebhooksRequest {
  limit?: number;
  paginationToken?: string;
}

export interface DfnsListWebhooksResponse {
  items: DfnsGetWebhookResponse[];
  nextPageToken?: string;
}

// PUT /webhooks/:webhookId - Update Webhook
export interface DfnsUpdateWebhookRequest {
  url?: string;
  description?: string;
  status?: DfnsWebhookStatus;
  events?: DfnsWebhookEvent[] | ['*'];
}

export interface DfnsUpdateWebhookResponse {
  id: string;
  url: string;
  events: DfnsWebhookEvent[];
  description?: string;
  status: DfnsWebhookStatus;
  dateCreated: string;
  dateUpdated: string;
}

// DELETE /webhooks/:webhookId - Delete Webhook
export interface DfnsDeleteWebhookResponse {
  deleted: boolean;
}

// POST /webhooks/:webhookId/ping - Ping Webhook
export interface DfnsPingWebhookResponse {
  status: string; // HTTP status code (e.g., "200", "500") or error code
  error?: string; // Optional error message if status is not "200"
}

// Webhook Events Management APIs

// GET /webhooks/:webhookId/events - List Webhook Events
export interface DfnsListWebhookEventsRequest {
  limit?: number;
  paginationToken?: string;
  deliveryFailed?: boolean; // Filter by delivery status
}

export interface DfnsListWebhookEventsResponse {
  items: DfnsWebhookEventResponse[];
  nextPageToken?: string;
}

// GET /webhooks/:webhookId/events/:webhookEventId - Get Webhook Event
export interface DfnsWebhookEventResponse {
  id: string;
  kind: DfnsWebhookEvent;
  date: string; // ISO-8601 date when the actual event happened
  deliveryFailed: boolean;
  deliveryAttempt: number; // 1 for first attempt, increments for retries
  timestampSent: number; // Unix timestamp when webhook was signed and sent
  status: string; // HTTP status code or error code
  error?: string; // Error detail if delivery failed
  retryOf?: string; // ID of previous failed event if this is a retry
  nextAttemptDate?: string; // ISO-8601 date of next retry attempt if applicable
  data: Record<string, any>; // Event-specific data payload
}

// =============================================================================
// INTERNAL CHAIN CAPITAL WEBHOOK TYPES
// =============================================================================

// Webhook Configuration for local storage/management
export interface WebhookConfig {
  id: string;
  url: string;
  events: DfnsWebhookEvent[];
  description?: string;
  status: DfnsWebhookStatus;
  secret?: string; // Store locally if available (creation response only)
  organization_id?: string;
  created_at: string;
  updated_at: string;
  dfns_webhook_id: string;
  is_active: boolean;
}

// Webhook Event for local storage/tracking
export interface WebhookEvent {
  id: string;
  webhook_id: string;
  event_type: DfnsWebhookEvent;
  event_data: Record<string, any>;
  delivery_status: 'pending' | 'delivered' | 'failed' | 'retrying';
  delivery_attempts: number;
  last_attempt_at?: string;
  next_attempt_at?: string;
  response_status?: string;
  response_error?: string;
  created_at: string;
  updated_at: string;
  dfns_event_id: string;
  retry_of?: string;
}

// Webhook Event Processing Status
export type WebhookEventProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Webhook Service Options
export interface WebhookServiceOptions {
  enableDatabaseSync?: boolean;
  enableEventLogging?: boolean;
  validateWebhookUrls?: boolean;
  autoRetryFailedDeliveries?: boolean;
}

// Webhook Creation Options
export interface WebhookCreationOptions {
  syncToDatabase?: boolean;
  validateUrl?: boolean;
  testWebhook?: boolean; // Send ping after creation
}

// Webhook Event Filtering Options
export interface WebhookEventFilterOptions {
  deliveryFailed?: boolean;
  eventType?: DfnsWebhookEvent;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  paginationToken?: string;
}

// Webhook Analytics/Summary Types
export interface WebhookSummary {
  webhookId: string;
  url: string;
  status: DfnsWebhookStatus;
  isActive: boolean;
  eventCount: number;
  eventTypes: DfnsWebhookEvent[];
  successfulDeliveries: number;
  failedDeliveries: number;
  lastEventAt?: string;
  lastSuccessfulDeliveryAt?: string;
  description?: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface WebhookEventSummary {
  eventId: string;
  webhookId: string;
  eventType: DfnsWebhookEvent;
  deliveryStatus: 'delivered' | 'failed' | 'pending' | 'retrying';
  deliveryAttempts: number;
  responseStatus?: string;
  lastAttemptAt: string;
  nextAttemptAt?: string;
  eventDate: string;
  hasError: boolean;
  error?: string;
}

// Webhook Validation Types
export interface WebhookUrlValidation {
  url: string;
  isValid: boolean;
  isReachable: boolean;
  responseTime?: number;
  error?: string;
}

// Webhook Event Data Types (based on DFNS documentation)
export interface WebhookEventData {
  // Wallet events
  wallet?: {
    id: string;
    network: string;
    address: string;
    name?: string;
    status: string;
    tags?: string[];
  };
  
  // Transfer/Transaction events
  transfer?: {
    id: string;
    walletId: string;
    kind: string;
    to: string;
    amount: string;
    status: string;
    txHash?: string;
    blockNumber?: number;
    fee?: string;
  };
  
  // Signature events
  signature?: {
    id: string;
    keyId?: string;
    walletId?: string;
    kind: string;
    status: string;
    signature?: string;
    hash?: string;
  };
  
  // Policy events
  policy?: {
    id: string;
    name: string;
    activityKind: string;
    triggered: boolean;
    approvalId?: string;
    approvalStatus?: string;
  };
  
  // User events
  user?: {
    id: string;
    email: string;
    kind: 'CustomerEmployee' | 'EndUser';
    status: string;
    orgId: string;
  };
  
  // Key events
  key?: {
    id: string;
    scheme: string;
    curve: string;
    status: string;
    delegatedTo?: string;
  };
  
  // Service Account events
  serviceAccount?: {
    id: string;
    name: string;
    status: string;
    orgId: string;
  };
  
  // Generic event data
  [key: string]: any;
}

// Webhook Security/Verification Types
export interface WebhookSignatureVerification {
  isValid: boolean;
  timestamp: number;
  signature: string;
  payload: string;
  secret: string;
}

// Webhook Retry Configuration
export interface WebhookRetryConfig {
  maxAttempts: number; // DFNS default: 5
  retryIntervals: number[]; // DFNS default: [1m, 12m, 2h, 1d]
  timeoutMs: number;
}

// Webhook Error Types
export interface WebhookError {
  code: string;
  message: string;
  webhookId?: string;
  eventId?: string;
  url?: string;
  timestamp: string;
  details?: Record<string, any>;
}

// Default webhook retry configuration matching DFNS behavior
export const DEFAULT_WEBHOOK_RETRY_CONFIG: WebhookRetryConfig = {
  maxAttempts: 5,
  retryIntervals: [
    60 * 1000,        // 1 minute
    12 * 60 * 1000,   // 12 minutes  
    2 * 60 * 60 * 1000, // 2 hours
    24 * 60 * 60 * 1000 // 1 day
  ],
  timeoutMs: 30000 // 30 seconds
};

// Webhook event retention period (DFNS keeps events for 31 days)
export const WEBHOOK_EVENT_RETENTION_DAYS = 31;

// Network tier support for webhooks
export type WebhookSupportedNetwork = 
  | 'Ethereum' | 'Bitcoin' | 'Polygon' | 'Arbitrum' | 'Optimism' 
  | 'Avalanche' | 'Binance' | 'Fantom' | 'Solana' | 'Near'
  | 'Algorand' | 'Stellar' | 'Cardano' | 'Polkadot' | 'Kusama'
  | 'Cosmos' | 'Osmosis' | 'Juno' | 'Stargaze' | 'Aptos' | 'Sui'
  // Tier-1 networks support all webhook events including on-chain detection
  // Tier-2 networks have limited webhook support
  ;

// Helper function to check if network supports webhooks
export function isWebhookSupportedNetwork(network: string): boolean {
  const tier1Networks: WebhookSupportedNetwork[] = [
    'Ethereum', 'Bitcoin', 'Polygon', 'Arbitrum', 'Optimism',
    'Avalanche', 'Binance', 'Solana', 'Algorand', 'Stellar'
  ];
  return tier1Networks.includes(network as WebhookSupportedNetwork);
}

// Helper function to get supported event types for network
export function getSupportedWebhookEvents(network: string): DfnsWebhookEvent[] {
  if (!isWebhookSupportedNetwork(network)) {
    return []; // Tier-2 networks don't support webhooks
  }
  
  // Tier-1 networks support all event types
  return [
    'wallet.created', 'wallet.exported', 'wallet.delegated', 'wallet.event.onchain',
    'wallet.transfer.initiated', 'wallet.transfer.broadcasted', 'wallet.transfer.confirmed',
    'wallet.transaction.initiated', 'wallet.transaction.broadcasted', 'wallet.transaction.confirmed',
    'wallet.signature.initiated', 'wallet.signature.signed', 'policy.triggered',
    'user.registered', 'key.created', 'service_account.created', 'credential.created'
  ];
}

// Helper function to validate webhook URL format
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Helper function to validate webhook events array
export function validateWebhookEvents(events: (DfnsWebhookEvent | '*')[]): boolean {
  if (!Array.isArray(events) || events.length === 0) {
    return false;
  }
  
  // If contains '*', it should be the only element
  if (events.includes('*')) {
    return events.length === 1;
  }
  
  return true;
}
