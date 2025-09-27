/**
 * AlertManager.ts
 * Manages alerts and notifications for validation events
 */

import { supabase } from '@/infrastructure/supabaseClient';
import type { MonitorAlert } from './RealTimeMonitor';

export interface AlertConfig {
  channels?: AlertChannel[];
  thresholds?: AlertThresholds;
  emailConfig?: EmailConfig;
  slackConfig?: SlackConfig;
}

export type AlertChannel = 'email' | 'slack' | 'pagerduty' | 'database';

export interface AlertThresholds {
  criticalCount?: number;
  highCount?: number;
  timeWindow?: number; // in milliseconds
}

export interface EmailConfig {
  from?: string;
  recipients?: string[];
  smtpConfig?: any;
}

export interface SlackConfig {
  webhookUrl?: string;
  channel?: string;
}

export class AlertManager {
  private config: AlertConfig;
  private alertHistory: MonitorAlert[] = [];
  private alertCounts: Map<string, number> = new Map();
  
  constructor(config: AlertConfig = {}) {
    this.config = {
      channels: config.channels || ['database'],
      thresholds: config.thresholds || {
        criticalCount: 1,
        highCount: 5,
        timeWindow: 60 * 60 * 1000 // 1 hour
      },
      emailConfig: config.emailConfig,
      slackConfig: config.slackConfig
    };
  }
  
  /**
   * Send alert through configured channels
   */
  async sendAlert(alert: MonitorAlert): Promise<void> {
    // Add to history
    this.alertHistory.push(alert);
    this.updateAlertCounts(alert);
    
    // Check if alert should be suppressed
    if (this.shouldSuppress(alert)) {
      console.log('Alert suppressed due to rate limiting:', alert.type);
      return;
    }
    
    // Send through each channel
    for (const channel of this.config.channels!) {
      try {
        await this.sendToChannel(channel, alert);
      } catch (error) {
        console.error(`Failed to send alert to ${channel}:`, error);
      }
    }
    
    // Check for escalation
    await this.checkEscalation();
  }
  
  /**
   * Send critical alert (always sent, never suppressed)
   */
  async sendCriticalAlert(alert: MonitorAlert): Promise<void> {
    alert.severity = 'critical';
    
    // Critical alerts are never suppressed
    for (const channel of this.config.channels!) {
      try {
        await this.sendToChannel(channel, alert);
      } catch (error) {
        console.error(`Failed to send critical alert to ${channel}:`, error);
      }
    }
    
    // Log critical alert
    await this.logCriticalAlert(alert);
  }
  
  /**
   * Send alert to specific channel
   */
  private async sendToChannel(channel: AlertChannel, alert: MonitorAlert): Promise<void> {
    switch (channel) {
      case 'database':
        await this.sendToDatabase(alert);
        break;
      case 'email':
        await this.sendToEmail(alert);
        break;
      case 'slack':
        await this.sendToSlack(alert);
        break;
      case 'pagerduty':
        await this.sendToPagerDuty(alert);
        break;
      default:
        console.warn('Unknown alert channel:', channel);
    }
  }
  
  /**
   * Send alert to database
   */
  private async sendToDatabase(alert: MonitorAlert): Promise<void> {
    const { error } = await supabase
      .from('validation_alerts')
      .insert({
        alert_type: alert.type,
        severity: alert.severity,
        transaction_data: alert.transaction,
        validation_data: alert.validation,
        message: alert.message,
        resolved: false,
        created_at: new Date(alert.timestamp).toISOString()
      });
    
    if (error) {
      console.error('Failed to save alert to database:', error);
    }
  }
  
  /**
   * Send alert via email (placeholder)
   */
  private async sendToEmail(alert: MonitorAlert): Promise<void> {
    if (!this.config.emailConfig?.recipients) {
      console.warn('Email recipients not configured');
      return;
    }
    
    // In a real implementation, this would use an email service
    console.log('Email alert:', {
      to: this.config.emailConfig.recipients,
      subject: `[${alert.severity.toUpperCase()}] ${alert.type}`,
      body: alert.message
    });
  }
  
  /**
   * Send alert to Slack
   */
  private async sendToSlack(alert: MonitorAlert): Promise<void> {
    if (!this.config.slackConfig?.webhookUrl) {
      console.warn('Slack webhook URL not configured');
      return;
    }
    
    const color = this.getAlertColor(alert.severity);
    
    try {
      const response = await fetch(this.config.slackConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: this.config.slackConfig.channel,
          attachments: [{
            color,
            title: `${alert.severity.toUpperCase()}: ${alert.type}`,
            text: alert.message,
            timestamp: Math.floor(alert.timestamp / 1000),
            fields: alert.transaction ? [
              {
                title: 'Transaction',
                value: alert.transaction.txHash || 'N/A',
                short: true
              },
              {
                title: 'From',
                value: alert.transaction.from || 'N/A',
                short: true
              },
              {
                title: 'To',
                value: alert.transaction.to || 'N/A',
                short: true
              },
              {
                title: 'Value',
                value: alert.transaction.value || '0',
                short: true
              }
            ] : []
          }]
        })
      });
      
      if (!response.ok) {
        console.error('Failed to send Slack alert:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }
  
  /**
   * Send alert to PagerDuty (placeholder)
   */
  private async sendToPagerDuty(alert: MonitorAlert): Promise<void> {
    // In a real implementation, this would use PagerDuty API
    console.log('PagerDuty alert:', alert);
  }
  
  /**
   * Check if alert should be suppressed due to rate limiting
   */
  private shouldSuppress(alert: MonitorAlert): boolean {
    if (alert.severity === 'critical') return false; // Never suppress critical
    
    const key = `${alert.type}:${alert.severity}`;
    const count = this.alertCounts.get(key) || 0;
    const threshold = alert.severity === 'high' 
      ? this.config.thresholds!.highCount!
      : 10; // Default for medium/low
    
    return count >= threshold;
  }
  
  /**
   * Update alert counts for rate limiting
   */
  private updateAlertCounts(alert: MonitorAlert): void {
    const key = `${alert.type}:${alert.severity}`;
    const count = this.alertCounts.get(key) || 0;
    this.alertCounts.set(key, count + 1);
    
    // Reset counts after time window
    setTimeout(() => {
      const currentCount = this.alertCounts.get(key) || 0;
      this.alertCounts.set(key, Math.max(0, currentCount - 1));
    }, this.config.thresholds!.timeWindow!);
  }
  
  /**
   * Check for alert escalation
   */
  private async checkEscalation(): Promise<void> {
    const recentCritical = this.alertHistory.filter(
      a => a.severity === 'critical' && 
      Date.now() - a.timestamp < this.config.thresholds!.timeWindow!
    ).length;
    
    if (recentCritical >= this.config.thresholds!.criticalCount!) {
      // Escalate
      await this.escalate();
    }
  }
  
  /**
   * Escalate alerts (e.g., notify management)
   */
  private async escalate(): Promise<void> {
    const escalationAlert: MonitorAlert = {
      type: 'ESCALATION',
      severity: 'critical',
      timestamp: Date.now(),
      message: 'Multiple critical alerts detected. Escalating to management.'
    };
    
    // Send escalation through all channels
    for (const channel of this.config.channels!) {
      await this.sendToChannel(channel, escalationAlert);
    }
  }
  
  /**
   * Log critical alert for audit
   */
  private async logCriticalAlert(alert: MonitorAlert): Promise<void> {
    const { error } = await supabase
      .from('critical_alerts_audit')
      .insert({
        alert_type: alert.type,
        message: alert.message,
        transaction_data: alert.transaction,
        validation_data: alert.validation,
        timestamp: new Date(alert.timestamp).toISOString(),
        handled_by: 'system'
      });
    
    if (error) {
      console.error('Failed to log critical alert:', error);
    }
  }
  
  /**
   * Get alert color for Slack
   */
  private getAlertColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return '#FFA500';
      case 'low': return 'good';
      default: return '#808080';
    }
  }
  
  /**
   * Get alert statistics
   */
  getStatistics(): AlertStatistics {
    const now = Date.now();
    const timeWindow = this.config.thresholds!.timeWindow!;
    
    const recentAlerts = this.alertHistory.filter(
      a => now - a.timestamp < timeWindow
    );
    
    return {
      totalAlerts: this.alertHistory.length,
      recentAlerts: recentAlerts.length,
      criticalAlerts: recentAlerts.filter(a => a.severity === 'critical').length,
      highAlerts: recentAlerts.filter(a => a.severity === 'high').length,
      mediumAlerts: recentAlerts.filter(a => a.severity === 'medium').length,
      lowAlerts: recentAlerts.filter(a => a.severity === 'low').length,
      suppressedAlerts: Array.from(this.alertCounts.values()).reduce((a, b) => a + b, 0)
    };
  }
  
  /**
   * Clear alert history
   */
  clearHistory(): void {
    this.alertHistory = [];
    this.alertCounts.clear();
  }
  
  /**
   * Destroy alert manager
   */
  destroy(): void {
    this.clearHistory();
  }
}

export interface AlertStatistics {
  totalAlerts: number;
  recentAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  suppressedAlerts: number;
}
