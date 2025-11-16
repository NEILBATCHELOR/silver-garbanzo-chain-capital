/**
 * Stage 10: Escalation Notification Service
 * Handles notifications for approval escalations
 */

import { supabase } from '@/infrastructure/supabaseClient';
import type { ApprovalProcess, EscalationRule, Approver } from '../types';
import { approvalNotifier, type NotificationResult } from './ApprovalNotifier';

export interface EscalationNotification {
  processId: string;
  level: number;
  reason: string;
  escalatedTo: Approver[];
  escalatedFrom?: string[];
  timestamp: string;
}

export interface EscalationConfig {
  enableAutoEscalation: boolean;
  escalationIntervalHours: number;
  maxEscalationLevels: number;
  notifyOriginalApprovers: boolean;
  notifyManagement: boolean;
}

export class EscalationNotifier {
  private config: EscalationConfig;

  constructor(config?: Partial<EscalationConfig>) {
    this.config = {
      enableAutoEscalation: true,
      escalationIntervalHours: 24,
      maxEscalationLevels: 3,
      notifyOriginalApprovers: true,
      notifyManagement: true,
      ...config
    };
  }

  /**
   * Notify about approval escalation
   */
  async notifyEscalation(
    process: ApprovalProcess,
    escalation: EscalationNotification
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // 1. Notify escalated approvers
    const escalatedResults = await this.notifyEscalatedApprovers(
      escalation.escalatedTo,
      process,
      escalation
    );
    results.push(...escalatedResults);

    // 2. Notify original approvers if configured
    if (this.config.notifyOriginalApprovers && escalation.escalatedFrom) {
      const originalResults = await this.notifyOriginalApprovers(
        escalation.escalatedFrom,
        process,
        escalation
      );
      results.push(...originalResults);
    }

    // 3. Notify management if configured
    if (this.config.notifyManagement) {
      const managementResults = await this.notifyManagement(
        process,
        escalation
      );
      results.push(...managementResults);
    }

    // 4. Store escalation notification record
    await this.storeEscalationNotification(escalation);

    return results;
  }

  /**
   * Notify escalated approvers
   */
  private async notifyEscalatedApprovers(
    approvers: Approver[],
    process: ApprovalProcess,
    escalation: EscalationNotification
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const approver of approvers) {
      const message = {
        subject: `Escalated Approval Required - Level ${escalation.level}`,
        body: this.buildEscalationMessage(process, escalation, approver)
      };

      // Send in-app notification
      await supabase.from('notifications').insert({
        user_id: approver.userId,
        type: 'approval_escalation',
        title: message.subject,
        message: message.body,
        data: {
          processId: process.id,
          requestId: process.requestId,
          escalationLevel: escalation.level,
          reason: escalation.reason
        },
        priority: 'urgent',
        read: false,
        created_at: new Date().toISOString()
      });

      results.push({
        success: true,
        channel: 'in_app',
        sentAt: new Date().toISOString()
      });

      // Send email for urgent escalations
      if (escalation.level >= 2) {
        await this.sendEscalationEmail(approver, message);
        results.push({
          success: true,
          channel: 'email',
          sentAt: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Notify original approvers about escalation
   */
  private async notifyOriginalApprovers(
    originalApproverIds: string[],
    process: ApprovalProcess,
    escalation: EscalationNotification
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const approverId of originalApproverIds) {
      const message = {
        subject: `Approval Escalated to Higher Authority`,
        body: `The redemption request (${process.requestId}) has been escalated to level ${escalation.level} due to: ${escalation.reason}`
      };

      await supabase.from('notifications').insert({
        user_id: approverId,
        type: 'approval_escalation_notice',
        title: message.subject,
        message: message.body,
        data: {
          processId: process.id,
          requestId: process.requestId,
          escalationLevel: escalation.level
        },
        priority: 'normal',
        read: false,
        created_at: new Date().toISOString()
      });

      results.push({
        success: true,
        channel: 'in_app',
        sentAt: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Notify management about escalation
   */
  private async notifyManagement(
    process: ApprovalProcess,
    escalation: EscalationNotification
  ): Promise<NotificationResult[]> {
    // Get management users
    const { data: managers } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'operations_manager'])
      .eq('active', true);

    if (!managers || managers.length === 0) {
      return [];
    }

    const results: NotificationResult[] = [];

    for (const manager of managers) {
      const message = {
        subject: `Approval Escalation Alert - Level ${escalation.level}`,
        body: `Request ${process.requestId} has been escalated.\n\nLevel: ${escalation.level}\nReason: ${escalation.reason}\nApprovers: ${escalation.escalatedTo.length}`
      };

      await supabase.from('notifications').insert({
        user_id: manager.user_id,
        type: 'escalation_alert',
        title: message.subject,
        message: message.body,
        data: {
          processId: process.id,
          requestId: process.requestId,
          escalationLevel: escalation.level
        },
        priority: 'high',
        read: false,
        created_at: new Date().toISOString()
      });

      results.push({
        success: true,
        channel: 'in_app',
        sentAt: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Send timeout warning before escalation
   */
  async sendTimeoutWarning(
    process: ApprovalProcess,
    hoursUntilEscalation: number
  ): Promise<NotificationResult[]> {
    const pendingApprovers = process.pendingApprovers || [];
    const results: NotificationResult[] = [];

    for (const approverId of pendingApprovers) {
      const message = {
        subject: 'Urgent: Approval Deadline Approaching',
        body: `The redemption request (${process.requestId}) will be escalated in ${hoursUntilEscalation} hours if not approved.`
      };

      await supabase.from('notifications').insert({
        user_id: approverId,
        type: 'timeout_warning',
        title: message.subject,
        message: message.body,
        data: {
          processId: process.id,
          requestId: process.requestId,
          hoursUntilEscalation
        },
        priority: 'urgent',
        read: false,
        created_at: new Date().toISOString()
      });

      results.push({
        success: true,
        channel: 'in_app',
        sentAt: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Send auto-rejection notice
   */
  async sendAutoRejectionNotice(
    process: ApprovalProcess,
    reason: string
  ): Promise<NotificationResult[]> {
    const { data: requestData } = await supabase
      .from('redemption_requests')
      .select('investor_id')
      .eq('id', process.requestId)
      .single();

    if (!requestData) {
      return [];
    }

    const message = {
      subject: 'Redemption Request Auto-Rejected',
      body: `Your redemption request (${process.requestId}) has been automatically rejected.\n\nReason: ${reason}`
    };

    await supabase.from('notifications').insert({
      user_id: requestData.investor_id,
      type: 'auto_rejection',
      title: message.subject,
      message: message.body,
      data: {
        processId: process.id,
        requestId: process.requestId,
        reason
      },
      priority: 'high',
      read: false,
      created_at: new Date().toISOString()
    });

    return [{
      success: true,
      channel: 'in_app',
      sentAt: new Date().toISOString()
    }];
  }

  /**
   * Build escalation message
   */
  private buildEscalationMessage(
    process: ApprovalProcess,
    escalation: EscalationNotification,
    approver: Approver
  ): string {
    return `Hello ${approver.name || 'Approver'},

This approval request has been escalated to you (Level ${escalation.level}).

Request ID: ${process.requestId}
Escalation Reason: ${escalation.reason}
Required Approvals: ${process.requiredApprovals}
Current Approvals: ${process.currentApprovals || 0}
Deadline: ${process.deadline || 'Not set'}

As an escalated approver, your immediate attention is required to prevent further delays.

Please review and approve at your earliest convenience.`;
  }

  /**
   * Send escalation email
   */
  private async sendEscalationEmail(
    approver: Approver,
    message: { subject: string; body: string }
  ): Promise<void> {
    // TODO: Integrate with email service
    // For now, log to database
    await supabase.from('email_log').insert({
      user_id: approver.userId,
      subject: message.subject,
      body: message.body,
      priority: 'urgent',
      sent_at: new Date().toISOString()
    });
  }

  /**
   * Store escalation notification record
   */
  private async storeEscalationNotification(
    escalation: EscalationNotification
  ): Promise<void> {
    await supabase.from('escalation_notifications').insert({
      process_id: escalation.processId,
      level: escalation.level,
      reason: escalation.reason,
      escalated_to: escalation.escalatedTo.map(a => a.userId),
      escalated_from: escalation.escalatedFrom || [],
      timestamp: escalation.timestamp
    });
  }

  /**
   * Schedule automatic escalation check
   */
  async scheduleEscalationCheck(
    process: ApprovalProcess
  ): Promise<void> {
    // This would integrate with a job scheduler (e.g., cron, bull queue)
    // For now, we'll create a reminder record
    const escalationTime = new Date();
    escalationTime.setHours(
      escalationTime.getHours() + this.config.escalationIntervalHours
    );

    await supabase.from('escalation_schedule').insert({
      process_id: process.id,
      scheduled_at: escalationTime.toISOString(),
      status: 'scheduled'
    });
  }

  /**
   * Check and execute pending escalations
   */
  async checkPendingEscalations(): Promise<void> {
    const now = new Date().toISOString();

    // Get processes due for escalation
    const { data: processes } = await supabase
      .from('approval_processes')
      .select('*')
      .eq('status', 'pending')
      .lt('deadline', now);

    if (!processes || processes.length === 0) {
      return;
    }

    for (const process of processes) {
      // Send timeout warning first
      await this.sendTimeoutWarning(process, 0);

      // TODO: Trigger actual escalation workflow
      // This would call back to ApprovalWorkflowManager.escalateApproval()
    }
  }
}

// Export singleton instance
export const escalationNotifier = new EscalationNotifier();
