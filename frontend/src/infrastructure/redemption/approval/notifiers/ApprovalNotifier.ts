/**
 * Stage 10: Approval Notification Service
 * Sends notifications to approvers for pending approvals
 */

import { supabase } from '@/infrastructure/supabaseClient';
import type { ApprovalProcess, Approver } from '../types';

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'in_app';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  sentAt: string;
  error?: string;
}

export class ApprovalNotifier {
  private channels: NotificationChannel[];
  private templates: Map<string, NotificationTemplate>;

  constructor(channels?: NotificationChannel[]) {
    this.channels = channels || this.getDefaultChannels();
    this.templates = this.loadTemplates();
  }

  /**
   * Notify approvers of new approval request
   */
  async notifyApprovers(
    approvers: Approver[],
    requestId: string,
    process: ApprovalProcess
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const approver of approvers) {
      const approverResults = await this.notifyApprover(
        approver,
        requestId,
        process
      );
      results.push(...approverResults);
    }

    // Store notification records
    await this.storeNotifications(results, requestId);

    return results;
  }

  /**
   * Notify single approver
   */
  private async notifyApprover(
    approver: Approver,
    requestId: string,
    process: ApprovalProcess
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Get approver's notification preferences
    const preferences = await this.getApproverPreferences(approver.userId);

    // Send through enabled channels
    for (const channel of this.channels) {
      if (!channel.enabled) continue;
      
      if (!preferences || preferences[channel.type] !== false) {
        const result = await this.sendNotification(
          channel,
          approver,
          requestId,
          process
        );
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Send notification through specific channel
   */
  private async sendNotification(
    channel: NotificationChannel,
    approver: Approver,
    requestId: string,
    process: ApprovalProcess
  ): Promise<NotificationResult> {
    try {
      const template = this.templates.get('approval_request');
      if (!template) {
        throw new Error('Template not found');
      }

      const message = this.renderTemplate(template, {
        approverName: 'Approver', // Will be fetched from user profile if needed
        requestId,
        requiredApprovals: process.requiredApprovals,
        deadline: process.deadline
      });

      switch (channel.type) {
        case 'email':
          await this.sendEmail(approver, message);
          break;
        case 'in_app':
          await this.sendInAppNotification(approver, message, requestId);
          break;
        case 'push':
          await this.sendPushNotification(approver, message);
          break;
        case 'sms':
          await this.sendSMS(approver, message);
          break;
      }

      return {
        success: true,
        channel: channel.type,
        sentAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        channel: channel.type,
        sentAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    approver: Approver,
    message: { subject: string; body: string },
    requestId: string
  ): Promise<void> {
    await supabase.from('notifications').insert({
      user_id: approver.userId,
      type: 'approval_request',
      title: message.subject,
      message: message.body,
      data: {
        requestId,
        approverRole: approver.role
      },
      read: false,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Send email notification (placeholder - integrate with email service)
   */
  private async sendEmail(
    approver: Approver,
    message: { subject: string; body: string }
  ): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`Email to ${approver.userId}: ${message.subject}`);
    
    // For now, log to database
    await this.logEmailNotification(approver.userId, message);
  }

  /**
   * Send push notification (placeholder)
   */
  private async sendPushNotification(
    approver: Approver,
    message: { subject: string; body: string }
  ): Promise<void> {
    // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
    console.log(`Push to ${approver.userId}: ${message.subject}`);
  }

  /**
   * Send SMS notification (placeholder)
   */
  private async sendSMS(
    approver: Approver,
    message: { subject: string; body: string }
  ): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`SMS to ${approver.userId}: ${message.body}`);
  }

  /**
   * Notify approval completion
   */
  async notifyApprovalComplete(
    requestId: string,
    approved: boolean,
    notifyUsers: string[]
  ): Promise<NotificationResult[]> {
    const template = this.templates.get(
      approved ? 'approval_complete' : 'approval_rejected'
    );

    if (!template) {
      return [];
    }

    const results: NotificationResult[] = [];

    for (const userId of notifyUsers) {
      const message = this.renderTemplate(template, { requestId });
      
      // Send in-app notification
      await this.sendInAppNotification(
        { id: userId, userId, name: '', role: '', weight: 0, required: false, alternates: [] },
        message,
        requestId
      );

      results.push({
        success: true,
        channel: 'in_app',
        sentAt: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Send deadline reminder
   */
  async sendDeadlineReminder(
    process: ApprovalProcess,
    hoursRemaining: number
  ): Promise<NotificationResult[]> {
    const pendingApprovers = process.pendingApprovers || [];
    const results: NotificationResult[] = [];

    for (const approverId of pendingApprovers) {
      const message = this.renderTemplate(
        this.templates.get('deadline_reminder')!,
        {
          requestId: process.requestId,
          hoursRemaining
        }
      );

      await this.sendInAppNotification(
        { id: approverId, userId: approverId, name: '', role: '', weight: 0, required: false, alternates: [] },
        message,
        process.requestId
      );

      results.push({
        success: true,
        channel: 'in_app',
        sentAt: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Get approver notification preferences
   */
  private async getApproverPreferences(
    userId: string
  ): Promise<Record<string, boolean> | null> {
    const { data } = await supabase
      .from('user_preferences')
      .select('notification_preferences')
      .eq('user_id', userId)
      .single();

    return data?.notification_preferences || null;
  }

  /**
   * Store notification records
   */
  private async storeNotifications(
    results: NotificationResult[],
    requestId: string
  ): Promise<void> {
    const records = results.map(r => ({
      request_id: requestId,
      channel: r.channel,
      success: r.success,
      sent_at: r.sentAt,
      error: r.error
    }));

    await supabase.from('approval_notifications').insert(records);
  }

  /**
   * Log email notification
   */
  private async logEmailNotification(
    userId: string,
    message: { subject: string; body: string }
  ): Promise<void> {
    await supabase.from('email_log').insert({
      user_id: userId,
      subject: message.subject,
      body: message.body,
      sent_at: new Date().toISOString()
    });
  }

  /**
   * Render notification template
   */
  private renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>
  ): { subject: string; body: string } {
    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      body = body.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return { subject, body };
  }

  /**
   * Load notification templates
   */
  private loadTemplates(): Map<string, NotificationTemplate> {
    const templates = new Map<string, NotificationTemplate>();

    templates.set('approval_request', {
      subject: 'Approval Required: Redemption Request',
      body: `Hello {{approverName}},

A redemption request ({{requestId}}) requires your approval.

Required Approvals: {{requiredApprovals}}
Deadline: {{deadline}}

Please review and approve at your earliest convenience.`,
      priority: 'high'
    });

    templates.set('approval_complete', {
      subject: 'Redemption Request Approved',
      body: `The redemption request ({{requestId}}) has been approved and is being processed.`,
      priority: 'normal'
    });

    templates.set('approval_rejected', {
      subject: 'Redemption Request Rejected',
      body: `The redemption request ({{requestId}}) has been rejected.`,
      priority: 'normal'
    });

    templates.set('deadline_reminder', {
      subject: 'Approval Deadline Reminder',
      body: `Reminder: The redemption request ({{requestId}}) requires your approval within {{hoursRemaining}} hours.`,
      priority: 'urgent'
    });

    return templates;
  }

  /**
   * Get default notification channels
   */
  private getDefaultChannels(): NotificationChannel[] {
    return [
      { type: 'in_app', enabled: true },
      { type: 'email', enabled: false },
      { type: 'push', enabled: false },
      { type: 'sms', enabled: false }
    ];
  }
}

// Export singleton instance
export const approvalNotifier = new ApprovalNotifier();
