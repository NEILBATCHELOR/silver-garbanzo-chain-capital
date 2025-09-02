import { LifecycleEventType } from '../products';

/**
 * Notification channel options
 */
export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  CALENDAR = 'calendar'
}

/**
 * Email template options
 */
export enum EmailTemplate {
  DEFAULT = 'default',
  DETAILED = 'detailed',
  URGENT = 'urgent'
}

/**
 * Notification settings interface
 */
export interface NotificationSettings {
  id: string;
  userId: string;
  projectId?: string; // Optional for project-specific settings
  eventTypes: LifecycleEventType[]; // Empty array means all types
  notificationChannels: NotificationChannel[];
  emailRecipients: string[]; // Array of email addresses
  emailTemplate: EmailTemplate;
  advanceNoticeDays: number[]; // Days before event to send notification
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create notification settings request
 */
export interface CreateNotificationSettingsRequest {
  userId: string;
  projectId?: string;
  eventTypes?: LifecycleEventType[];
  notificationChannels?: NotificationChannel[];
  emailRecipients?: string[];
  emailTemplate?: EmailTemplate;
  advanceNoticeDays?: number[];
  disabled?: boolean;
}

/**
 * Update notification settings request
 */
export interface UpdateNotificationSettingsRequest {
  eventTypes?: LifecycleEventType[];
  notificationChannels?: NotificationChannel[];
  emailRecipients?: string[];
  emailTemplate?: EmailTemplate;
  advanceNoticeDays?: number[];
  disabled?: boolean;
}
