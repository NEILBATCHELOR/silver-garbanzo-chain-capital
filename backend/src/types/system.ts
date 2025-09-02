/**
 * System Domain Types
 * Types specific to system events, notifications, and real-time features
 */

/**
 * System event structure for real-time features
 */
export interface SystemEvent {
  type: string
  payload: Record<string, any>
  userId?: string
  timestamp: string
  source: 'api' | 'system' | 'webhook'
}

/**
 * Notification data structure
 */
export interface NotificationData {
  userId: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  actionUrl?: string
  metadata?: Record<string, any>
}
