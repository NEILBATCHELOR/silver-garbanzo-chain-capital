/**
 * AlertManager.ts
 * Manages compliance alerts and notifications
 */

import { supabase } from '@/infrastructure/database/client';
import { generateUUID } from '@/utils/shared/formatting/uuidUtils';

export interface ComplianceAlert {
  id?: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  details?: any;
  timestamp?: string;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  retryCount?: number;
}

export interface CriticalAlert extends ComplianceAlert {
  severity: 'critical';
  escalated?: boolean;
  escalationLevel?: number;
  notificationChannels?: string[];
}

export interface AlertConfig {
  channels?: AlertChannel[];
  escalationEnabled?: boolean;
  escalationTimeout?: number;
  retryAttempts?: number;
  webhookUrl?: string;
  emailEnabled?: boolean;
  slackEnabled?: boolean;
}

export interface AlertChannel {
  type: 'webhook' | 'email' | 'slack' | 'sms' | 'in-app';
  config: any;
  enabled: boolean;
  severityFilter?: ('critical' | 'high' | 'medium' | 'low')[];
}

export class AlertManager {
  private config: AlertConfig;
  private alertQueue: ComplianceAlert[];
  private processing: boolean;
  private channels: Map<string, AlertChannel>;

  constructor(config: AlertConfig = {}) {
    this.config = {
      escalationEnabled: config.escalationEnabled ?? true,
      escalationTimeout: config.escalationTimeout ?? 15 * 60 * 1000, // 15 minutes
      retryAttempts: config.retryAttempts ?? 3,
      ...config
    };

    this.alertQueue = [];
    this.processing = false;
    this.channels = new Map();

    // Initialize channels
    this.initializeChannels(config.channels || this.getDefaultChannels());

    // Start processing queue
    this.startQueueProcessor();
  }

  /**
   * Send alert
   */
  async sendAlert(alert: ComplianceAlert): Promise<void> {
    try {
      // Add to queue
      this.alertQueue.push({
        ...alert,
        id: alert.id || generateUUID(),
        timestamp: alert.timestamp || new Date().toISOString()
      });

      // Process queue
      await this.processQueue();
    } catch (error: any) {
      console.error('Failed to send alert:', error);
      throw error;
    }
  }

  /**
   * Send critical alert
   */
  async sendCriticalAlert(alert: Partial<CriticalAlert> & { message: string }): Promise<void> {
    const criticalAlert: CriticalAlert = {
      id: generateUUID(),
      type: alert.type || 'CRITICAL_ALERT',
      severity: 'critical',
      message: alert.message,
      details: alert.details,
      timestamp: new Date().toISOString(),
      escalated: false,
      escalationLevel: 0,
      notificationChannels: ['webhook', 'email', 'slack'],
      ...alert
    };

    // Store critical alert immediately
    await this.storeCriticalAlert(criticalAlert);

    // Send through all channels
    await this.sendToAllChannels(criticalAlert);

    // Start escalation if enabled
    if (this.config.escalationEnabled) {
      this.startEscalation(criticalAlert);
    }
  }

  /**
   * Process alert queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.alertQueue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.alertQueue.length > 0) {
        const alert = this.alertQueue.shift()!;
        await this.processAlert(alert);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process individual alert
   */
  private async processAlert(alert: ComplianceAlert): Promise<void> {
    try {
      // Store alert
      await this.storeAlert(alert);

      // Send to appropriate channels
      const channels = this.getChannelsForAlert(alert);
      
      for (const channel of channels) {
        await this.sendToChannel(channel, alert);
      }
    } catch (error: any) {
      console.error('Failed to process alert:', error);
      
      // Retry logic
      if (alert.retryCount === undefined) {
        alert.retryCount = 0;
      }

      if (alert.retryCount < this.config.retryAttempts!) {
        alert.retryCount++;
        this.alertQueue.push(alert);
      }
    }
  }

  /**
   * Store alert to database
   */
  private async storeAlert(alert: ComplianceAlert): Promise<void> {
    const { error } = await supabase
      .from('compliance_alerts')
      .insert({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        details: alert.details,
        timestamp: alert.timestamp,
        acknowledged: alert.acknowledged || false,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store alert: ${error.message}`);
    }
  }

  /**
   * Store critical alert
   */
  private async storeCriticalAlert(alert: CriticalAlert): Promise<void> {
    const { error } = await supabase
      .from('critical_alerts')
      .insert({
        id: alert.id,
        type: alert.type,
        severity: 'critical',
        message: alert.message,
        details: alert.details,
        timestamp: alert.timestamp,
        escalated: alert.escalated,
        escalation_level: alert.escalationLevel,
        notification_channels: alert.notificationChannels,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to store critical alert:', error);
    }
  }

  /**
   * Get channels for alert based on severity
   */
  private getChannelsForAlert(alert: ComplianceAlert): AlertChannel[] {
    const channels: AlertChannel[] = [];

    for (const [_, channel] of this.channels) {
      if (!channel.enabled) continue;

      if (!channel.severityFilter || channel.severityFilter.includes(alert.severity)) {
        channels.push(channel);
      }
    }

    return channels;
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(channel: AlertChannel, alert: ComplianceAlert): Promise<void> {
    switch (channel.type) {
      case 'webhook':
        await this.sendWebhook(alert, channel);
        break;
      case 'email':
        await this.sendEmail(alert, channel);
        break;
      case 'slack':
        await this.sendSlack(alert, channel);
        break;
      case 'in-app':
        await this.sendInApp(alert, channel);
        break;
      case 'sms':
        await this.sendSMS(alert, channel);
        break;
    }
  }

  /**
   * Send alert to all channels
   */
  private async sendToAllChannels(alert: ComplianceAlert): Promise<void> {
    const promises = [];

    for (const [_, channel] of this.channels) {
      if (channel.enabled) {
        promises.push(this.sendToChannel(channel, alert));
      }
    }

    await Promise.allSettled(promises);
  }

  /**
   * Send webhook
   */
  private async sendWebhook(alert: ComplianceAlert, channel: AlertChannel): Promise<void> {
    const url = channel.config.url || this.config.webhookUrl;
    if (!url) return;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        alert,
        timestamp: new Date().toISOString(),
        source: 'compliance-system'
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
  }

  /**
   * Send email
   */
  private async sendEmail(alert: ComplianceAlert, channel: AlertChannel): Promise<void> {
    // TODO: Implement email sending via service
    console.log('Sending email alert:', {
      to: channel.config.recipients,
      subject: `[${alert.severity.toUpperCase()}] ${alert.message}`,
      body: JSON.stringify(alert.details, null, 2)
    });
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(alert: ComplianceAlert, channel: AlertChannel): Promise<void> {
    const webhookUrl = channel.config.webhookUrl;
    if (!webhookUrl) return;

    const color = this.getSlackColor(alert.severity);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attachments: [{
          color,
          title: `${alert.severity.toUpperCase()}: ${alert.type}`,
          text: alert.message,
          fields: alert.details ? Object.entries(alert.details).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          })) : [],
          footer: 'Compliance System',
          ts: Math.floor(Date.now() / 1000)
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`);
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(alert: ComplianceAlert, channel: AlertChannel): Promise<void> {
    // Use Supabase realtime to send notification
    await supabase
      .from('notifications')
      .insert({
        id: generateUUID(),
        type: 'compliance_alert',
        severity: alert.severity,
        title: alert.type,
        message: alert.message,
        data: alert.details,
        read: false,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Send SMS
   */
  private async sendSMS(alert: ComplianceAlert, channel: AlertChannel): Promise<void> {
    // TODO: Implement SMS sending via service (Twilio, etc.)
    console.log('Sending SMS alert:', {
      to: channel.config.phoneNumbers,
      message: `[${alert.severity.toUpperCase()}] ${alert.message}`
    });
  }

  /**
   * Start escalation for critical alert
   */
  private startEscalation(alert: CriticalAlert): void {
    setTimeout(async () => {
      // Check if alert was acknowledged
      const { data: storedAlert } = await supabase
        .from('critical_alerts')
        .select('acknowledged')
        .eq('id', alert.id)
        .single();

      if (!storedAlert?.acknowledged) {
        await this.escalateAlert(alert);
      }
    }, this.config.escalationTimeout);
  }

  /**
   * Escalate alert
   */
  private async escalateAlert(alert: CriticalAlert): Promise<void> {
    alert.escalated = true;
    alert.escalationLevel = (alert.escalationLevel || 0) + 1;

    // Update in database
    await supabase
      .from('critical_alerts')
      .update({
        escalated: true,
        escalation_level: alert.escalationLevel
      })
      .eq('id', alert.id);

    // Send escalation notification
    await this.sendAlert({
      type: 'ESCALATION',
      severity: 'critical',
      message: `Alert escalated: ${alert.message}`,
      details: {
        originalAlert: alert.id,
        escalationLevel: alert.escalationLevel
      }
    });

    // Continue escalation chain if needed
    if (alert.escalationLevel < 3) {
      this.startEscalation(alert);
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const now = new Date().toISOString();

    // Update regular alerts
    await supabase
      .from('compliance_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: now
      })
      .eq('id', alertId);

    // Update critical alerts
    await supabase
      .from('critical_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: now
      })
      .eq('id', alertId);
  }

  /**
   * Get Slack color for severity
   */
  private getSlackColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#FF0000';
      case 'high': return '#FF6600';
      case 'medium': return '#FFCC00';
      case 'low': return '#00CC00';
      default: return '#808080';
    }
  }

  /**
   * Initialize channels
   */
  private initializeChannels(channels: AlertChannel[]): void {
    for (const channel of channels) {
      this.channels.set(`${channel.type}-${Date.now()}`, channel);
    }
  }

  /**
   * Get default channels
   */
  private getDefaultChannels(): AlertChannel[] {
    const channels: AlertChannel[] = [
      {
        type: 'in-app',
        config: {},
        enabled: true
      }
    ];

    if (this.config.webhookUrl) {
      channels.push({
        type: 'webhook',
        config: { url: this.config.webhookUrl },
        enabled: true,
        severityFilter: ['critical', 'high']
      });
    }

    if (this.config.emailEnabled) {
      channels.push({
        type: 'email',
        config: {},
        enabled: true,
        severityFilter: ['critical']
      });
    }

    if (this.config.slackEnabled) {
      channels.push({
        type: 'slack',
        config: {},
        enabled: true,
        severityFilter: ['critical', 'high']
      });
    }

    return channels;
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(
    severity?: string,
    unacknowledgedOnly: boolean = false
  ): Promise<ComplianceAlert[]> {
    let query = supabase
      .from('compliance_alerts')
      .select('*');

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (unacknowledgedOnly) {
      query = query.eq('acknowledged', false);
    }

    const { data } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    return data || [];
  }
}
