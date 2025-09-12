/**
 * Realtime Alert System
 * 
 * Essential monitoring and notification service for climate receivables.
 * Features:
 * - Real-time risk threshold monitoring
 * - Database integration for alerts
 * - Notification mechanisms (email, webhooks, in-app)
 * - Alert prioritization and escalation
 * - WebSocket support for real-time updates
 */

import type {
  ClimateAlert,
  AlertTrigger,
  AlertSeverity,
  AlertCategory,
  ServiceResponse
} from '../../types/domain/climate';

import { supabase } from '../../infrastructure/database/client';

export interface AlertRule {
  id: string;
  name: string;
  category: AlertCategory;
  severity: AlertSeverity;
  trigger: AlertTrigger;
  enabled: boolean;
  description: string;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'database' | 'in_app';
  config: {
    recipients?: string[];
    webhookUrl?: string;
    template?: string;
  };
}

export interface AlertMetrics {
  totalAlerts: number;
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByCategory: Record<AlertCategory, number>;
  recentAlerts: ClimateAlert[];
  resolutionTimes: {
    average: number; // minutes
    median: number;
    fastest: number;
    slowest: number;
  };
}

/**
 * Real-time alert system for climate receivables monitoring
 */
export class RealtimeAlertSystem {

  private static instance: RealtimeAlertSystem;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeWebSockets: Set<WebSocket> = new Set();
  private monitoringInterval?: NodeJS.Timeout;

  // Default alert rules
  private static readonly DEFAULT_RULES: Omit<AlertRule, 'id'>[] = [
    {
      name: 'High Risk Score Alert',
      category: 'risk_threshold',
      severity: 'HIGH',
      trigger: {
        condition: 'risk_score',
        threshold: 80,
        comparisonOperator: 'gte',
        enabled: true
      },
      enabled: true,
      description: 'Alert when receivable risk score exceeds 80%',
      actions: [
        { type: 'database', config: {} },
        { type: 'in_app', config: {} }
      ]
    },
    {
      name: 'Critical Risk Score Alert',
      category: 'risk_threshold',
      severity: 'CRITICAL',
      trigger: {
        condition: 'risk_score',
        threshold: 90,
        comparisonOperator: 'gte',
        enabled: true
      },
      enabled: true,
      description: 'Alert when receivable risk score exceeds 90%',
      actions: [
        { type: 'database', config: {} },
        { type: 'in_app', config: {} },
        { type: 'email', config: { template: 'critical_risk_alert' } }
      ]
    },
    {
      name: 'Payment Overdue Alert',
      category: 'payment_overdue',
      severity: 'MEDIUM',
      trigger: {
        condition: 'days_overdue',
        threshold: 7,
        comparisonOperator: 'gte',
        enabled: true
      },
      enabled: true,
      description: 'Alert when receivable is overdue by 7+ days',
      actions: [
        { type: 'database', config: {} },
        { type: 'in_app', config: {} }
      ]
    }
  ];

  private constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RealtimeAlertSystem {
    if (!RealtimeAlertSystem.instance) {
      RealtimeAlertSystem.instance = new RealtimeAlertSystem();
    }
    return RealtimeAlertSystem.instance;
  }

  /**
   * Create a new alert
   */
  public async createAlert(
    category: AlertCategory,
    severity: AlertSeverity,
    title: string,
    description: string,
    entityId?: string,
    entityType?: string,
    metadata?: Record<string, any>
  ): Promise<ServiceResponse<ClimateAlert>> {
    try {
      const alert: ClimateAlert = {
        id: this.generateAlertId(),
        category,
        severity,
        title,
        description,
        entityId,
        entityType,
        metadata,
        resolved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Insert into database
      const { data: insertedAlert, error } = await supabase
        .from('alerts')
        .insert({
          severity: alert.severity,
          service: 'climate_receivables',
          title: alert.title,
          description: alert.description,
          status: 'OPEN',
          metadata: {
            category: alert.category,
            entityId: alert.entityId,
            entityType: alert.entityType,
            ...alert.metadata
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Update alert with database ID
      alert.id = insertedAlert.id;

      // Execute alert actions
      await this.executeAlertActions(alert);

      // Notify WebSocket subscribers
      this.broadcastAlert(alert);

      return {
        success: true,
        data: alert,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to create alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get active alerts with optional filtering
   */
  public async getActiveAlerts(
    category?: AlertCategory,
    severity?: AlertSeverity,
    limit: number = 50
  ): Promise<ServiceResponse<ClimateAlert[]>> {
    try {
      let query = supabase
        .from('alerts')
        .select('*')
        .eq('status', 'OPEN')
        .eq('service', 'climate_receivables')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data: alertData, error } = await query;

      if (error) throw error;

      const alerts: ClimateAlert[] = alertData.map((row: any) => ({
        id: row.id,
        category: row.metadata?.category || 'system_error',
        severity: row.severity,
        title: row.title,
        description: row.description,
        entityId: row.metadata?.entityId,
        entityType: row.metadata?.entityType,
        metadata: row.metadata,
        resolved: row.status === 'RESOLVED',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      // Filter by category if specified (since we store it in metadata)
      const filteredAlerts = category 
        ? alerts.filter(alert => alert.category === category)
        : alerts;

      return {
        success: true,
        data: filteredAlerts,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to retrieve alerts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Resolve an alert
   */
  public async resolveAlert(
    alertId: string,
    resolution?: string
  ): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'RESOLVED',
          updated_at: new Date().toISOString(),
          metadata: supabase.rpc('jsonb_set', {
            target: supabase.rpc('alerts.metadata'),
            path: '{resolution}',
            new_value: JSON.stringify(resolution || 'Manually resolved')
          })
        })
        .eq('id', alertId);

      if (error) throw error;

      // Broadcast resolution to WebSocket subscribers
      this.broadcastAlertResolution(alertId);

      return {
        success: true,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to resolve alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Add or update an alert rule
   */
  public async addAlertRule(rule: Omit<AlertRule, 'id'>): Promise<ServiceResponse<AlertRule>> {
    try {
      const ruleWithId: AlertRule = {
        ...rule,
        id: this.generateRuleId()
      };

      this.alertRules.set(ruleWithId.id, ruleWithId);

      return {
        success: true,
        data: ruleWithId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to add alert rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get alert metrics and statistics
   */
  public async getAlertMetrics(
    daysBack: number = 30
  ): Promise<ServiceResponse<AlertMetrics>> {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - daysBack);

      const { data: alertData, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('service', 'climate_receivables')
        .gte('created_at', sinceDate.toISOString());

      if (error) throw error;

      const alerts: ClimateAlert[] = alertData.map((row: any) => ({
        id: row.id,
        category: row.metadata?.category || 'system_error',
        severity: row.severity,
        title: row.title,
        description: row.description,
        entityId: row.metadata?.entityId,
        entityType: row.metadata?.entityType,
        metadata: row.metadata,
        resolved: row.status === 'RESOLVED',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      // Calculate metrics
      const alertsBySeverity: Record<AlertSeverity, number> = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0
      };

      const alertsByCategory: Record<AlertCategory, number> = {
        risk_threshold: 0,
        payment_overdue: 0,
        compliance_issue: 0,
        system_error: 0
      };

      const resolutionTimes: number[] = [];

      alerts.forEach(alert => {
        alertsBySeverity[alert.severity]++;
        alertsByCategory[alert.category]++;

        if (alert.resolved) {
          const createdTime = new Date(alert.createdAt).getTime();
          const updatedTime = new Date(alert.updatedAt).getTime();
          const resolutionMinutes = (updatedTime - createdTime) / (1000 * 60);
          resolutionTimes.push(resolutionMinutes);
        }
      });

      // Calculate resolution time statistics
      resolutionTimes.sort((a, b) => a - b);
      const avgResolutionTime = resolutionTimes.length > 0 
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length 
        : 0;
      
      const medianResolutionTime = resolutionTimes.length > 0
        ? resolutionTimes[Math.floor(resolutionTimes.length / 2)]
        : 0;

      const metrics: AlertMetrics = {
        totalAlerts: alerts.length,
        alertsBySeverity,
        alertsByCategory,
        recentAlerts: alerts.slice(0, 10),
        resolutionTimes: {
          average: Math.round(avgResolutionTime),
          median: Math.round(medianResolutionTime),
          fastest: resolutionTimes.length > 0 ? Math.round(resolutionTimes[0]) : 0,
          slowest: resolutionTimes.length > 0 ? Math.round(resolutionTimes[resolutionTimes.length - 1]) : 0
        }
      };

      return {
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to get metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Private helper methods

  private initializeDefaultRules(): void {
    RealtimeAlertSystem.DEFAULT_RULES.forEach(rule => {
      const ruleWithId: AlertRule = {
        ...rule,
        id: this.generateRuleId()
      };
      this.alertRules.set(ruleWithId.id, ruleWithId);
    });
  }

  private startMonitoring(): void {
    // Check for alert conditions every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.checkAlertConditions();
    }, 30000);
  }

  private async checkAlertConditions(): Promise<void> {
    try {
      // Check each enabled alert rule
      for (const [ruleId, rule] of this.alertRules) {
        if (!rule.enabled) continue;

        await this.evaluateAlertRule(rule);
      }
    } catch (error) {
      console.error('Error checking alert conditions:', error);
    }
  }

  private async evaluateAlertRule(rule: AlertRule): Promise<void> {
    try {
      let query = supabase.from('climate_receivables').select('*');

      // Add condition based on rule trigger
      switch (rule.trigger.condition) {
        case 'risk_score':
          if (rule.trigger.comparisonOperator === 'gte') {
            query = query.gte('risk_score', rule.trigger.threshold);
          } else if (rule.trigger.comparisonOperator === 'lte') {
            query = query.lte('risk_score', rule.trigger.threshold);
          }
          break;
        
        case 'days_overdue':
          const currentDate = new Date();
          currentDate.setDate(currentDate.getDate() - rule.trigger.threshold);
          query = query.lt('due_date', currentDate.toISOString());
          break;
      }

      const { data: triggeredReceivables, error } = await query;
      if (error) throw error;

      // Create alerts for triggered receivables
      for (const receivable of triggeredReceivables || []) {
        await this.createAlert(
          rule.category,
          rule.severity,
          rule.name,
          `${rule.description} - Receivable ID: ${receivable.receivable_id}`,
          receivable.receivable_id,
          'climate_receivable',
          {
            ruleId: rule.id,
            ruleName: rule.name,
            threshold: rule.trigger.threshold,
            actualValue: receivable[rule.trigger.condition.replace('days_', '')]
          }
        );
      }

    } catch (error) {
      console.error(`Error evaluating rule ${rule.name}:`, error);
    }
  }

  private async executeAlertActions(alert: ClimateAlert): Promise<void> {
    const rule = Array.from(this.alertRules.values())
      .find(r => r.category === alert.category && r.severity === alert.severity);

    if (!rule) return;

    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'email':
            await this.sendEmailNotification(alert, action.config);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert, action.config);
            break;
          case 'database':
            // Already handled in createAlert
            break;
          case 'in_app':
            // Handled via WebSocket broadcast
            break;
        }
      } catch (error) {
        console.error(`Failed to execute ${action.type} action:`, error);
      }
    }
  }

  private async sendEmailNotification(
    alert: ClimateAlert, 
    config: AlertAction['config']
  ): Promise<void> {
    // In a real implementation, this would integrate with an email service
    console.log('Email notification:', { alert, config });
  }

  private async sendWebhookNotification(
    alert: ClimateAlert,
    config: AlertAction['config']
  ): Promise<void> {
    if (!config.webhookUrl) return;

    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
          service: 'climate_receivables'
        })
      });
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  }

  private broadcastAlert(alert: ClimateAlert): void {
    const message = JSON.stringify({
      type: 'alert_created',
      data: alert,
      timestamp: new Date().toISOString()
    });

    this.activeWebSockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  private broadcastAlertResolution(alertId: string): void {
    const message = JSON.stringify({
      type: 'alert_resolved',
      data: { alertId },
      timestamp: new Date().toISOString()
    });

    this.activeWebSockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register WebSocket for real-time updates
   */
  public addWebSocket(ws: WebSocket): void {
    this.activeWebSockets.add(ws);
    
    ws.onclose = () => {
      this.activeWebSockets.delete(ws);
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.activeWebSockets.clear();
  }
}

// Export singleton instance
export const realtimeAlertSystem = RealtimeAlertSystem.getInstance();
