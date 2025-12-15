/**
 * Trade Finance WebSocket Client
 * 
 * Connects to backend WebSocket for real-time updates:
 * - Price updates
 * - Health factor changes
 * - Liquidation alerts
 * - Position updates
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PriceUpdate {
  type: 'PRICE_UPDATE';
  commodity: string;
  price: number;
  timestamp: string;
}

export interface HealthFactorUpdate {
  type: 'HEALTH_FACTOR_UPDATE';
  userAddress: string;
  healthFactor: number;
  status: 'healthy' | 'warning' | 'danger' | 'liquidatable';
  timestamp: string;
}

export interface LiquidationAlert {
  type: 'LIQUIDATION_ALERT';
  userAddress: string;
  healthFactor: number;
  totalCollateralValue: number;
  totalDebt: number;
  timestamp: string;
}

export interface PositionUpdate {
  type: 'POSITION_UPDATE';
  userAddress: string;
  action: 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY' | 'LIQUIDATE';
  details: any;
  timestamp: string;
}

export type WebSocketMessage =
  | PriceUpdate
  | HealthFactorUpdate
  | LiquidationAlert
  | PositionUpdate
  | { type: 'CONNECTED'; clientId: string; timestamp: string }
  | { type: 'PONG'; timestamp: number };

type MessageHandler = (message: WebSocketMessage) => void;

// ============================================================================
// WEBSOCKET CLIENT
// ============================================================================

export class TradeFinanceWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds

  constructor(
    private projectId: string,
    private wsURL: string = 'ws://localhost:3001/api/trade-finance/ws'
  ) {}

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.wsURL}?project_id=${this.projectId}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('[WS] Connected to Trade Finance WebSocket');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;

          // Start ping interval
          this.startPing();

          // Re-subscribe to previous subscriptions
          this.subscriptions.forEach((channel) => {
            this.subscribe(channel);
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[WS] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WS] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WS] WebSocket closed');
          this.stopPing();
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('[WS] Failed to connect:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPing();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log('[WS] Disconnected');
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'SUBSCRIBE', channel }));
      console.log(`[WS] Subscribed to ${channel}`);
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'UNSUBSCRIBE', channel }));
      console.log(`[WS] Unsubscribed from ${channel}`);
    }
  }

  /**
   * Subscribe to price updates for a commodity
   */
  subscribeToPriceUpdates(commodity: string, handler: (update: PriceUpdate) => void): void {
    const channel = `price:${commodity}`;
    this.subscribe(channel);
    this.onMessage(channel, handler as MessageHandler);
  }

  /**
   * Subscribe to health factor updates for a user
   */
  subscribeToHealthFactor(userAddress: string, handler: (update: HealthFactorUpdate) => void): void {
    const channel = `health-factor:${userAddress}`;
    this.subscribe(channel);
    this.onMessage(channel, handler as MessageHandler);
  }

  /**
   * Subscribe to liquidation alerts
   */
  subscribeToLiquidationAlerts(handler: (alert: LiquidationAlert) => void): void {
    const channel = 'liquidation-alerts';
    this.subscribe(channel);
    this.onMessage(channel, handler as MessageHandler);
  }

  /**
   * Subscribe to position updates for a user
   */
  subscribeToPositionUpdates(userAddress: string, handler: (update: PositionUpdate) => void): void {
    const channel = `position:${userAddress}`;
    this.subscribe(channel);
    this.onMessage(channel, handler as MessageHandler);
  }

  /**
   * Register a message handler
   */
  onMessage(channel: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, new Set());
    }
    this.messageHandlers.get(channel)!.add(handler);
  }

  /**
   * Remove a message handler
   */
  offMessage(channel: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(channel);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(channel);
      }
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    // Handle special message types
    if (message.type === 'CONNECTED') {
      console.log('[WS] Connection confirmed:', message);
      return;
    }

    if (message.type === 'PONG') {
      return; // Heartbeat response
    }

    // Determine channel based on message type
    let channel = '';
    if (message.type === 'PRICE_UPDATE') {
      channel = `price:${message.commodity}`;
    } else if (message.type === 'HEALTH_FACTOR_UPDATE') {
      channel = `health-factor:${message.userAddress}`;
    } else if (message.type === 'LIQUIDATION_ALERT') {
      channel = 'liquidation-alerts';
    } else if (message.type === 'POSITION_UPDATE') {
      channel = `position:${message.userAddress}`;
    }

    // Call handlers
    const handlers = this.messageHandlers.get(channel);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('[WS] Handler error:', error);
        }
      });
    }
  }

  /**
   * Start ping interval (heartbeat)
   */
  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[WS] Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status
   */
  getStatus(): 'connected' | 'connecting' | 'disconnected' | 'reconnecting' {
    if (!this.ws) return 'disconnected';
    if (this.ws.readyState === WebSocket.CONNECTING) return 'connecting';
    if (this.ws.readyState === WebSocket.OPEN) return 'connected';
    if (this.reconnectTimer) return 'reconnecting';
    return 'disconnected';
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a WebSocket client instance
 */
export function createTradeFinanceWebSocketClient(
  projectId: string,
  wsURL?: string
): TradeFinanceWebSocketClient {
  return new TradeFinanceWebSocketClient(projectId, wsURL);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TradeFinanceWebSocketClient;
