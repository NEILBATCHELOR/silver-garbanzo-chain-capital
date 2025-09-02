/**
 * Fix for Audit Service Console Errors
 * 
 * Issues found:
 * 1. Database category values ("SYSTEM") don't match AuditCategory enum ("system_process") 
 * 2. Database severity values ("INFO") don't match AuditSeverity enum ("low", "medium", "high", "critical")
 * 3. Backend service validation is too strict for existing data
 * 4. Frontend useEnhancedAudit hook needs error handling
 */

import { AuditCategory, AuditSeverity } from '../services/audit/types'

/**
 * Category mapping for backward compatibility
 */
export const CATEGORY_MAPPING: Record<string, AuditCategory> = {
  // Legacy database values → New enum values
  'SYSTEM': AuditCategory.SYSTEM_PROCESS,
  'USER': AuditCategory.USER_ACTION,
  'user_action': AuditCategory.USER_ACTION,
  'system_process': AuditCategory.SYSTEM_PROCESS,
  'data_operation': AuditCategory.DATA_OPERATION,
  'authentication': AuditCategory.AUTHENTICATION,
  'authorization': AuditCategory.AUTHORIZATION,
  'security': AuditCategory.SECURITY,
  'compliance': AuditCategory.COMPLIANCE,
  'performance': AuditCategory.PERFORMANCE,
  'error': AuditCategory.ERROR,
  
  // Additional legacy values
  'SYSTEM_PROCESS': AuditCategory.SYSTEM_PROCESS,
  'DATA_OPERATION': AuditCategory.DATA_OPERATION,
  'AUTHENTICATION': AuditCategory.AUTHENTICATION,
  'AUTHORIZATION': AuditCategory.AUTHORIZATION,
  'SECURITY': AuditCategory.SECURITY,
  'COMPLIANCE': AuditCategory.COMPLIANCE,
  'PERFORMANCE': AuditCategory.PERFORMANCE,
  'ERROR': AuditCategory.ERROR
}

/**
 * Severity mapping for backward compatibility
 */
export const SEVERITY_MAPPING: Record<string, AuditSeverity> = {
  // Legacy database values → New enum values
  'INFO': AuditSeverity.LOW,
  'DEBUG': AuditSeverity.LOW,
  'WARN': AuditSeverity.MEDIUM,
  'WARNING': AuditSeverity.MEDIUM,
  'ERROR': AuditSeverity.HIGH,
  'FATAL': AuditSeverity.CRITICAL,
  'CRITICAL': AuditSeverity.CRITICAL,
  
  // Standard enum values (pass through)
  'low': AuditSeverity.LOW,
  'medium': AuditSeverity.MEDIUM,
  'high': AuditSeverity.HIGH,
  'critical': AuditSeverity.CRITICAL,
  
  // Case variations
  'Low': AuditSeverity.LOW,
  'Medium': AuditSeverity.MEDIUM,
  'High': AuditSeverity.HIGH,
  'Critical': AuditSeverity.CRITICAL,
  'LOW': AuditSeverity.LOW,
  'MEDIUM': AuditSeverity.MEDIUM,
  'HIGH': AuditSeverity.HIGH
}

/**
 * Normalize category value for compatibility
 */
export function normalizeCategory(category: string): AuditCategory {
  const normalized = CATEGORY_MAPPING[category]
  if (normalized) {
    return normalized
  }
  
  // Fallback: try lowercase match
  const lowercaseMatch = CATEGORY_MAPPING[category.toLowerCase()]
  if (lowercaseMatch) {
    return lowercaseMatch
  }
  
  // Default fallback
  console.warn(`Unknown audit category: ${category}, defaulting to USER_ACTION`)
  return AuditCategory.USER_ACTION
}

/**
 * Normalize severity value for compatibility
 */
export function normalizeSeverity(severity: string): AuditSeverity {
  const normalized = SEVERITY_MAPPING[severity]
  if (normalized) {
    return normalized
  }
  
  // Fallback: try lowercase match
  const lowercaseMatch = SEVERITY_MAPPING[severity.toLowerCase()]
  if (lowercaseMatch) {
    return lowercaseMatch
  }
  
  // Default fallback
  console.warn(`Unknown audit severity: ${severity}, defaulting to LOW`)
  return AuditSeverity.LOW
}

/**
 * Normalize audit event data from database for API responses
 */
export function normalizeAuditEvent(event: any): any {
  if (!event) return event
  
  return {
    ...event,
    category: event.category ? normalizeCategory(event.category) : AuditCategory.USER_ACTION,
    severity: event.severity ? normalizeSeverity(event.severity) : AuditSeverity.LOW,
    // Ensure required fields have defaults
    action: event.action || 'unknown_action',
    timestamp: event.timestamp || new Date(),
    source: event.source || 'system',
    is_automated: event.is_automated ?? false,
    importance: event.importance || 1,
    status: event.status || 'logged'
  }
}

/**
 * Normalize bulk audit events
 */
export function normalizeBulkAuditEvents(events: any[]): any[] {
  if (!Array.isArray(events)) return []
  return events.map(normalizeAuditEvent)
}

/**
 * Create safe audit event for database insertion
 */
export function createSafeAuditEvent(eventData: any): any {
  return {
    id: eventData.id || undefined, // Let database generate if not provided
    timestamp: eventData.timestamp || new Date(),
    action: eventData.action || 'unknown_action',
    category: eventData.category ? normalizeCategory(eventData.category) : AuditCategory.USER_ACTION,
    severity: eventData.severity ? normalizeSeverity(eventData.severity) : AuditSeverity.LOW,
    user_id: eventData.user_id || null,
    username: eventData.username || null,
    user_email: eventData.user_email || null,
    entity_type: eventData.entity_type || null,
    entity_id: eventData.entity_id || null,
    project_id: eventData.project_id || null,
    session_id: eventData.session_id || null,
    correlation_id: eventData.correlation_id || null,
    ip_address: eventData.ip_address || null,
    user_agent: eventData.user_agent || null,
    details: eventData.details || null,
    metadata: eventData.metadata || undefined,
    old_data: eventData.old_data || undefined,
    new_data: eventData.new_data || undefined,
    changes: eventData.changes || undefined,
    duration: eventData.duration || null,
    source: eventData.source || 'api',
    is_automated: eventData.is_automated ?? false,
    parent_id: eventData.parent_id || null,
    request_id: eventData.request_id || null,
    api_version: eventData.api_version || null,
    importance: eventData.importance || 1,
    status: eventData.status || 'logged',
    occurred_at: eventData.occurred_at || eventData.timestamp || new Date()
  }
}

export default {
  normalizeCategory,
  normalizeSeverity,
  normalizeAuditEvent,
  normalizeBulkAuditEvents,
  createSafeAuditEvent,
  CATEGORY_MAPPING,
  SEVERITY_MAPPING
}
