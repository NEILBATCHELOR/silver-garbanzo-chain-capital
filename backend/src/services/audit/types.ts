// Audit service types for Chain Capital
import { ServiceResult, QueryOptions, PaginatedResponse } from '@/types/index'

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high', 
  CRITICAL = 'critical'
}

/**
 * Audit event categories
 */
export enum AuditCategory {
  USER_ACTION = 'user_action',
  SYSTEM_PROCESS = 'system_process',
  DATA_OPERATION = 'data_operation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  PERFORMANCE = 'performance',
  ERROR = 'error'
}

/**
 * Audit event types
 */
export enum AuditEventType {
  // User Actions
  LOGIN = 'user_login',
  LOGOUT = 'user_logout',
  PASSWORD_CHANGE = 'password_change',
  PROFILE_UPDATE = 'profile_update',
  DOCUMENT_VIEW = 'document_view',
  DOCUMENT_DOWNLOAD = 'document_download',
  FORM_SUBMIT = 'form_submit',
  PAGE_VIEW = 'page_view',
  
  // Data Operations
  CREATE = 'data_create',
  UPDATE = 'data_update', 
  DELETE = 'data_delete',
  BULK_UPDATE = 'bulk_update',
  EXPORT = 'data_export',
  IMPORT = 'data_import',
  
  // System Processes
  SCHEDULED_JOB = 'scheduled_job',
  BACKGROUND_TASK = 'background_task',
  API_CALL = 'api_call',
  DATABASE_QUERY = 'database_query',
  EMAIL_SENT = 'email_sent',
  WEBHOOK_SENT = 'webhook_sent',
  
  // Security Events
  FAILED_LOGIN = 'failed_login',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // Compliance Events
  COMPLIANCE_CHECK = 'compliance_check',
  REGULATION_VALIDATION = 'regulation_validation',
  AUDIT_REQUIREMENT = 'audit_requirement'
}

/**
 * Base audit event interface
 */
export interface BaseAuditEvent {
  id?: string
  timestamp?: Date
  action: string
  category: AuditCategory
  severity: AuditSeverity
  user_id?: string
  username?: string
  user_email?: string
  entity_type?: string
  entity_id?: string
  project_id?: string
  session_id?: string
  correlation_id?: string
  ip_address?: string
  user_agent?: string
  details?: string
  metadata?: Record<string, any>
  old_data?: Record<string, any>
  new_data?: Record<string, any>
  changes?: Record<string, any>
  duration?: number
  source?: string
  is_automated?: boolean
  parent_id?: string
  request_id?: string
  api_version?: string
  importance?: number
  status?: string
}

/**
 * User action audit event
 */
export interface UserAuditEvent extends BaseAuditEvent {
  category: AuditCategory.USER_ACTION
  user_id: string
  session_id: string
  action_type?: string
}

/**
 * System process audit event  
 */
export interface SystemAuditEvent extends BaseAuditEvent {
  category: AuditCategory.SYSTEM_PROCESS
  system_process_id?: string
  is_automated: true
  process_name?: string
  process_status?: string
}

/**
 * Data operation audit event
 */
export interface DataAuditEvent extends BaseAuditEvent {
  category: AuditCategory.DATA_OPERATION
  entity_type: string
  entity_id: string
  old_data?: Record<string, any>
  new_data?: Record<string, any>
  changes: Record<string, any>
}

/**
 * Security audit event
 */
export interface SecurityAuditEvent extends BaseAuditEvent {
  category: AuditCategory.SECURITY
  severity: AuditSeverity.HIGH | AuditSeverity.CRITICAL
  threat_level?: string
  action_taken?: string
}

/**
 * API request audit event
 */
export interface ApiAuditEvent extends BaseAuditEvent {
  method: string
  endpoint: string
  status_code: number
  duration: number
  request_size?: number
  response_size?: number
  query_params?: Record<string, any>
  request_body?: Record<string, any>
  response_body?: Record<string, any>
}

/**
 * Audit query options
 */
export interface AuditQueryOptions extends QueryOptions {
  user_id?: string
  entity_type?: string
  entity_id?: string
  category?: AuditCategory | AuditCategory[]
  severity?: AuditSeverity | AuditSeverity[]
  date_from?: Date | string
  date_to?: Date | string
  search_details?: string
  include_metadata?: boolean
  include_changes?: boolean
  correlation_id?: string
  session_id?: string
  // Additional properties for audit service compatibility
  sort?: string
  order?: 'asc' | 'desc'
  filters?: Record<string, any>
}

/**
 * Audit statistics interface
 */
export interface AuditStatistics {
  total_events: number
  events_by_category: Record<AuditCategory, number>
  events_by_severity: Record<AuditSeverity, number>
  events_by_user: Record<string, number>
  events_by_entity_type: Record<string, number>
  recent_activity: BaseAuditEvent[]
  time_period: {
    start_date: Date
    end_date: Date
    duration_hours: number
  }
}

/**
 * Audit analytics interface
 */
export interface AuditAnalytics {
  activity_trends: {
    hourly: Array<{ hour: string; count: number }>
    daily: Array<{ date: string; count: number }>
    weekly: Array<{ week: string; count: number }>
  }
  user_activity: Array<{
    user_id: string
    username: string
    total_actions: number
    last_activity: Date
    most_common_actions: string[]
  }>
  security_events: {
    total: number
    by_severity: Record<AuditSeverity, number>
    recent_threats: SecurityAuditEvent[]
  }
  system_performance: {
    average_response_time: number
    total_api_calls: number
    error_rate: number
    peak_usage_hours: string[]
  }
  compliance_metrics: {
    total_checks: number
    passed: number
    failed: number
    pending: number
    compliance_rate: number
  }
}

/**
 * Audit trail interface
 */
export interface AuditTrail {
  entity_type: string
  entity_id: string
  events: BaseAuditEvent[]
  summary: {
    total_events: number
    first_event: Date
    last_event: Date
    contributors: string[]
    major_changes: number
  }
}

/**
 * Audit configuration interface
 */
export interface AuditConfig {
  enabled: boolean
  log_level: AuditSeverity
  capture_request_body: boolean
  capture_response_body: boolean
  exclude_endpoints: string[]
  exclude_users: string[]
  max_metadata_size: number
  retention_days: number
  real_time_alerts: boolean
  anonymize_sensitive_data: boolean
  batch_size: number
  flush_interval_ms: number
}

/**
 * Audit event creation request
 */
export interface CreateAuditEventRequest {
  action: string
  category: AuditCategory
  severity?: AuditSeverity
  entity_type?: string
  entity_id?: string
  user_id?: string
  details?: string
  metadata?: Record<string, any>
  old_data?: Record<string, any>
  new_data?: Record<string, any>
  changes?: Record<string, any>
  correlation_id?: string
  session_id?: string
  source?: string
}

/**
 * Bulk audit creation request
 */
export interface BulkCreateAuditRequest {
  events: CreateAuditEventRequest[]
  batch_id?: string
}

/**
 * Audit export options
 */
export interface AuditExportOptions {
  format: 'csv' | 'json' | 'excel' | 'pdf'
  date_from?: Date | string
  date_to?: Date | string
  categories?: AuditCategory[]
  severities?: AuditSeverity[]
  user_ids?: string[]
  entity_types?: string[]
  include_metadata?: boolean
  include_changes?: boolean
  max_records?: number
}

/**
 * Audit compliance report
 */
export interface AuditComplianceReport {
  report_id: string
  generated_at: Date
  period: {
    start_date: Date
    end_date: Date
  }
  compliance_standard: string
  summary: {
    total_events: number
    compliant_events: number
    non_compliant_events: number
    compliance_percentage: number
  }
  findings: Array<{
    category: string
    severity: AuditSeverity
    description: string
    recommendation: string
    affected_records: number
  }>
  data_integrity: {
    verified_records: number
    tampered_records: number
    missing_records: number
    integrity_score: number
  }
}

/**
 * Service result types
 */
export type AuditServiceResult<T = any> = ServiceResult<T>
export type AuditPaginatedResponse<T> = PaginatedResponse<T>

/**
 * Audit event filters for advanced searching
 */
export interface AuditEventFilters {
  user_ids?: string[]
  entity_types?: string[]
  actions?: string[]
  categories?: AuditCategory[]
  severities?: AuditSeverity[]
  date_range?: {
    start: Date | string
    end: Date | string
  }
  has_changes?: boolean
  has_metadata?: boolean
  correlation_ids?: string[]
  session_ids?: string[]
  ip_addresses?: string[]
  source_systems?: string[]
  importance_min?: number
  duration_min?: number
  duration_max?: number
}

/**
 * Real-time audit event subscription
 */
export interface AuditEventSubscription {
  subscription_id: string
  user_id: string
  filters: AuditEventFilters
  webhook_url?: string
  email_alerts?: boolean
  real_time?: boolean
  created_at: Date
}

/**
 * Audit retention policy
 */
export interface AuditRetentionPolicy {
  policy_id: string
  name: string
  description: string
  retention_days: number
  categories: AuditCategory[]
  severities: AuditSeverity[]
  archive_after_days?: number
  delete_after_days?: number
  compress_after_days?: number
  apply_to_users?: string[]
  apply_to_entities?: string[]
  created_at: Date
  updated_at: Date
}
