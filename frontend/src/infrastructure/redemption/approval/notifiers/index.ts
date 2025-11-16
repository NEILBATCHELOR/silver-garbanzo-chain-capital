/**
 * Stage 10: Approval Notification Services
 * Export notifier modules
 */

export { 
  ApprovalNotifier, 
  approvalNotifier,
  type NotificationChannel,
  type NotificationTemplate,
  type NotificationResult
} from './ApprovalNotifier';

export {
  EscalationNotifier,
  escalationNotifier,
  type EscalationNotification,
  type EscalationConfig
} from './EscalationNotifier';
