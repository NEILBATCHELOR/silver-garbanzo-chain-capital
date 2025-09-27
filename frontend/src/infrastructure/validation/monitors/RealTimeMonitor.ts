/**
 * RealTimeMonitor.ts
 * Real-time monitoring of transactions and policy compliance
 */

import { TransactionValidator } from '../TransactionValidator';
import { AlertManager } from './AlertManager';
import type { Transaction } from '@/types/core/centralModels';
import type { ValidationResponse } from '../TransactionValidator';
import { supabase } from '@/infrastructure/supabaseClient';

export interface MonitorConfig {
  wsUrl?: string;
  alertConfig?: any;
  validatorConfig?: any;
}

export interface TransactionEvent {
  type: 'TRANSACTION_PENDING' | 'POLICY_UPDATE' | 'RULE_CHANGE';
  transaction?: Transaction;
  data?: any;
  timestamp: number;
}

export interface MonitorAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  transaction?: Transaction;
  validation?: ValidationResponse;
  timestamp: number;
  message: string;
}

export type MonitorCallback = (event: TransactionEvent) => void;

export class RealTimeMonitor {
  private alertManager: AlertManager;
  private validator: TransactionValidator;
  private ws: WebSocket | null = null;
  private callbacks: Map<string, MonitorCallback>;
  private config: MonitorConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  
  constructor(config: MonitorConfig = {}) {
    this.config = config;
    this.alertManager = new AlertManager(config.alertConfig);
    this.validator = new TransactionValidator(config.validatorConfig);
    this.callbacks = new Map();
    
    if (config.wsUrl) {
      this.connect();
    }
  }
  
  /**
   * Connect to WebSocket for real-time monitoring
   */
  private connect(): void {
    if (!this.config.wsUrl) return;
    
    try {
      this.ws = new WebSocket(this.config.wsUrl);
      
      this.ws.onopen = () => {
        console.log('Real-time monitor connected');
        this.isConnected = true;
        
        // Clear reconnect timer
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };
      
      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          await this.handleEvent(data);
        } catch (error) {
          console.error('Failed to handle WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.scheduleReconnect();
    }
  }
  
  /**
   * Schedule WebSocket reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect();
    }, 5000); // Reconnect after 5 seconds
  }
  
  /**
   * Handle incoming WebSocket event
   */
  private async handleEvent(data: TransactionEvent): Promise<void> {
    switch (data.type) {
      case 'TRANSACTION_PENDING':
        await this.handlePendingTransaction(data);
        break;
      case 'POLICY_UPDATE':
        await this.handlePolicyUpdate(data);
        break;
      case 'RULE_CHANGE':
        await this.handleRuleChange(data);
        break;
      default:
        console.warn('Unknown event type:', data.type);
    }
    
    // Notify callbacks
    for (const callback of this.callbacks.values()) {
      try {
        callback(data);
      } catch (error) {
        console.error('Callback error:', error);
      }
    }
  }
  
  /**
   * Handle pending transaction
   */
  async handlePendingTransaction(event: TransactionEvent): Promise<void> {
    if (!event.transaction) return;
    
    // Validate transaction in real-time
    const validation = await this.validator.validateTransaction({
      transaction: event.transaction,
      urgency: 'immediate',
      simulateExecution: false
    });
    
    if (!validation.valid) {
      // Send alert
      await this.alertManager.sendAlert({
        type: 'INVALID_TRANSACTION',
        severity: 'high',
        transaction: event.transaction,
        validation,
        timestamp: Date.now(),
        message: `Invalid transaction detected: ${validation.errors[0]?.message}`
      });
      
      // Optionally block transaction
      if (validation.errors.some(e => e.code === 'CRITICAL_VIOLATION')) {
        await this.blockTransaction(event.transaction);
      }
    }
    
    // Log to database
    await this.logMonitoringEvent('TRANSACTION_PENDING', event, validation);
  }
  
  /**
   * Handle policy update
   */
  async handlePolicyUpdate(event: TransactionEvent): Promise<void> {
    // Clear validation cache when policies change
    await this.validator['cache'].clear();
    
    // Send notification
    await this.alertManager.sendAlert({
      type: 'POLICY_UPDATE',
      severity: 'low',
      timestamp: Date.now(),
      message: 'Policy configuration has been updated'
    });
    
    // Log to database
    await this.logMonitoringEvent('POLICY_UPDATE', event);
  }
  
  /**
   * Handle rule change
   */
  async handleRuleChange(event: TransactionEvent): Promise<void> {
    // Clear validation cache when rules change
    await this.validator['cache'].clear();
    
    // Send notification
    await this.alertManager.sendAlert({
      type: 'RULE_CHANGE',
      severity: 'low',
      timestamp: Date.now(),
      message: 'Rule configuration has been updated'
    });
    
    // Log to database
    await this.logMonitoringEvent('RULE_CHANGE', event);
  }
  
  /**
   * Monitor specific address
   */
  async monitorAddress(address: string, callback: MonitorCallback): Promise<void> {
    // Subscribe to address events
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        address,
        events: ['transaction', 'balance', 'approval']
      }));
    }
    
    // Register callback
    this.callbacks.set(address, callback);
    
    // Start monitoring via Supabase realtime if available
    const subscription = supabase
      .channel(`monitor:${address}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `from_address=eq.${address},to_address=eq.${address}`
        },
        async (payload) => {
          const event: TransactionEvent = {
            type: 'TRANSACTION_PENDING',
            transaction: payload.new as any,
            timestamp: Date.now()
          };
          
          await this.handleEvent(event);
        }
      )
      .subscribe();
  }
  
  /**
   * Stop monitoring address
   */
  stopMonitoring(address: string): void {
    // Unsubscribe from address events
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        address
      }));
    }
    
    // Remove callback
    this.callbacks.delete(address);
    
    // Unsubscribe from Supabase channel
    supabase.removeChannel(`monitor:${address}`);
  }
  
  /**
   * Block transaction (placeholder for actual implementation)
   */
  private async blockTransaction(transaction: Transaction): Promise<void> {
    console.warn('Transaction blocking requested:', transaction);
    
    // In a real implementation, this would:
    // 1. Contact the wallet or blockchain node
    // 2. Attempt to cancel or replace the transaction
    // 3. Notify relevant parties
    
    await this.alertManager.sendAlert({
      type: 'TRANSACTION_BLOCKED',
      severity: 'critical',
      transaction,
      timestamp: Date.now(),
      message: `Transaction blocked due to policy violation`
    });
  }
  
  /**
   * Log monitoring event to database
   */
  private async logMonitoringEvent(
    type: string,
    event: TransactionEvent,
    validation?: ValidationResponse
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('validation_alerts')
        .insert({
          alert_type: type,
          severity: validation?.valid === false ? 'high' : 'low',
          transaction_data: event.transaction,
          validation_data: validation,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Failed to log monitoring event:', error);
      }
    } catch (error) {
      console.error('Failed to log monitoring event:', error);
    }
  }
  
  /**
   * Get monitoring statistics
   */
  async getStatistics(): Promise<MonitoringStats> {
    const { data: alerts } = await supabase
      .from('validation_alerts')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    const stats: MonitoringStats = {
      totalAlerts: alerts?.length || 0,
      criticalAlerts: alerts?.filter(a => a.severity === 'critical').length || 0,
      highAlerts: alerts?.filter(a => a.severity === 'high').length || 0,
      resolvedAlerts: alerts?.filter(a => a.resolved).length || 0,
      activeMonitors: this.callbacks.size,
      isConnected: this.isConnected
    };
    
    return stats;
  }
  
  /**
   * Destroy monitor and cleanup
   */
  destroy(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.callbacks.clear();
    this.alertManager.destroy();
  }
}

export interface MonitoringStats {
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  resolvedAlerts: number;
  activeMonitors: number;
  isConnected: boolean;
}
