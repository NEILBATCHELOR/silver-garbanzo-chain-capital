/**
 * Trade Finance WebSocket Server
 * 
 * Provides real-time updates for:
 * - Price updates
 * - Health factor changes
 * - Liquidation alerts
 * - Position changes
 */

import { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws';

// ============================================================================
// TYPES
// ============================================================================

interface SocketClient {
  id: string;
  socket: WebSocket;
  projectId: string;
  subscriptions: Set<string>; // What this client is subscribed to
}

interface PriceUpdate {
  type: 'PRICE_UPDATE';
  commodity: string;
  price: number;
  timestamp: string;
}

interface HealthFactorUpdate {
  type: 'HEALTH_FACTOR_UPDATE';
  userAddress: string;
  healthFactor: number;
  status: 'healthy' | 'warning' | 'danger' | 'liquidatable';
  timestamp: string;
}

interface LiquidationAlert {
  type: 'LIQUIDATION_ALERT';
  userAddress: string;
  healthFactor: number;
  totalCollateralValue: number;
  totalDebt: number;
  timestamp: string;
}

interface PositionUpdate {
  type: 'POSITION_UPDATE';
  userAddress: string;
  action: 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY' | 'LIQUIDATE';
  details: any;
  timestamp: string;
}

type WebSocketMessage =
  | PriceUpdate
  | HealthFactorUpdate
  | LiquidationAlert
  | PositionUpdate;

// ============================================================================
// WEBSOCKET MANAGER
// ============================================================================

export class TradeFinanceWebSocketManager {
  private clients: Map<string, SocketClient> = new Map();
  private subscriptionIndex: Map<string, Set<string>> = new Map(); // subscription => clientIds

  /**
   * Register a new client connection
   */
  registerClient(
    clientId: string,
    socket: WebSocket,
    projectId: string
  ): void {
    const client: SocketClient = {
      id: clientId,
      socket,
      projectId,
      subscriptions: new Set(),
    };

    this.clients.set(clientId, client);
    console.log(`[WebSocket] Client ${clientId} connected (project: ${projectId})`);

    // Handle client messages
    socket.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(clientId, message);
      } catch (error) {
        console.error('[WebSocket] Invalid message:', error);
      }
    });

    // Handle disconnection
    socket.on('close', () => {
      this.removeClient(clientId);
    });

    socket.on('error', (error) => {
      console.error(`[WebSocket] Error for client ${clientId}:`, error);
      this.removeClient(clientId);
    });
  }

  /**
   * Handle client subscription requests
   */
  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'SUBSCRIBE':
        this.addSubscription(clientId, message.channel);
        break;
      case 'UNSUBSCRIBE':
        this.removeSubscription(clientId, message.channel);
        break;
      case 'PING':
        client.socket.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        break;
    }
  }

  /**
   * Add subscription for a client
   */
  private addSubscription(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(channel);

    // Update subscription index
    if (!this.subscriptionIndex.has(channel)) {
      this.subscriptionIndex.set(channel, new Set());
    }
    this.subscriptionIndex.get(channel)!.add(clientId);

    console.log(`[WebSocket] Client ${clientId} subscribed to ${channel}`);
  }

  /**
   * Remove subscription for a client
   */
  private removeSubscription(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(channel);

    // Update subscription index
    const subscribers = this.subscriptionIndex.get(channel);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.subscriptionIndex.delete(channel);
      }
    }

    console.log(`[WebSocket] Client ${clientId} unsubscribed from ${channel}`);
  }

  /**
   * Remove a client
   */
  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove all subscriptions
    client.subscriptions.forEach((channel) => {
      const subscribers = this.subscriptionIndex.get(channel);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.subscriptionIndex.delete(channel);
        }
      }
    });

    this.clients.delete(clientId);
    console.log(`[WebSocket] Client ${clientId} disconnected`);
  }

  /**
   * Broadcast message to all clients subscribed to a channel
   */
  broadcast(channel: string, message: WebSocketMessage): void {
    const subscribers = this.subscriptionIndex.get(channel);
    if (!subscribers) return;

    const messageStr = JSON.stringify(message);
    let sent = 0;

    subscribers.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && client.socket.readyState === WebSocket.OPEN) {
        try {
          client.socket.send(messageStr);
          sent++;
        } catch (error) {
          console.error(`[WebSocket] Failed to send to client ${clientId}:`, error);
        }
      }
    });

    if (sent > 0) {
      console.log(`[WebSocket] Broadcasted ${message.type} to ${sent} clients on ${channel}`);
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) return;

    try {
      client.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`[WebSocket] Failed to send to client ${clientId}:`, error);
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalClients: number;
    totalSubscriptions: number;
    channels: string[];
  } {
    return {
      totalClients: this.clients.size,
      totalSubscriptions: this.subscriptionIndex.size,
      channels: Array.from(this.subscriptionIndex.keys()),
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const wsManager = new TradeFinanceWebSocketManager();

// ============================================================================
// FASTIFY PLUGIN
// ============================================================================

export async function registerTradeFinanceWebSocket(fastify: FastifyInstance) {
  // Register WebSocket support
  await fastify.register(fastifyWebsocket);

  // WebSocket endpoint
  fastify.get('/api/trade-finance/ws', { websocket: true }, (connection, request) => {
    const socket = connection;

    // Extract project_id from query params
    const url = new URL(request.url, 'http://localhost');
    const projectId = url.searchParams.get('project_id');

    if (!projectId) {
      socket.close(1008, 'project_id required');
      return;
    }

    // Generate unique client ID
    const clientId = `${projectId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Register client
    wsManager.registerClient(clientId, socket, projectId);

    // Send welcome message
    socket.send(
      JSON.stringify({
        type: 'CONNECTED',
        clientId,
        timestamp: new Date().toISOString(),
      })
    );
  });

  // Expose manager for broadcasting
  (fastify as any).tradeFinanceWS = wsManager;

  console.log('[WebSocket] Trade Finance WebSocket registered at /api/trade-finance/ws');
}

// ============================================================================
// HELPER FUNCTIONS FOR BROADCASTING
// ============================================================================

/**
 * Broadcast price update
 */
export function broadcastPriceUpdate(
  wsManager: TradeFinanceWebSocketManager,
  commodity: string,
  price: number
): void {
  wsManager.broadcast(`price:${commodity}`, {
    type: 'PRICE_UPDATE',
    commodity,
    price,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast health factor update
 */
export function broadcastHealthFactorUpdate(
  wsManager: TradeFinanceWebSocketManager,
  userAddress: string,
  healthFactor: number,
  status: 'healthy' | 'warning' | 'danger' | 'liquidatable'
): void {
  wsManager.broadcast(`health-factor:${userAddress}`, {
    type: 'HEALTH_FACTOR_UPDATE',
    userAddress,
    healthFactor,
    status,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast liquidation alert
 */
export function broadcastLiquidationAlert(
  wsManager: TradeFinanceWebSocketManager,
  userAddress: string,
  healthFactor: number,
  totalCollateralValue: number,
  totalDebt: number
): void {
  wsManager.broadcast('liquidation-alerts', {
    type: 'LIQUIDATION_ALERT',
    userAddress,
    healthFactor,
    totalCollateralValue,
    totalDebt,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast position update
 */
export function broadcastPositionUpdate(
  wsManager: TradeFinanceWebSocketManager,
  userAddress: string,
  action: 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY' | 'LIQUIDATE',
  details: any
): void {
  wsManager.broadcast(`position:${userAddress}`, {
    type: 'POSITION_UPDATE',
    userAddress,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default wsManager;
