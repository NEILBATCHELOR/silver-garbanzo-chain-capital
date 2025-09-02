// Services export for redemption module
// Centralizes all redemption-related service exports

// Core redemption service
export { RedemptionService, redemptionService } from './redemptionService';

// Eligibility validation service
export { EligibilityService, eligibilityService } from './eligibilityService';
export type { EligibilityCheckParams } from './eligibilityService';

// Approval workflow service
export { ApprovalService, approvalService } from './approvalService';

// Enhanced approval service with rule compliance
export { EnhancedApprovalService, enhancedApprovalService } from './enhancedApprovalService';

// Settlement processing service
export { SettlementService, settlementService } from './settlementService';

// Rule compliance validation service
export { ruleComplianceService } from './ruleComplianceService';
export type { 
  ComplianceValidationResult,
  ComplianceViolation 
} from './ruleComplianceService';

// Calendar service
export {
  RedemptionCalendarService,
  redemptionCalendarService,
  formatEventDate,
  formatEventTime,
  getEventTypeColor,
  getStatusColor
} from './calendar';
export type { RedemptionCalendarEvent, CalendarSummaryData, RSSFeedOptions, CalendarExportOptions } from './calendar';

// Re-export types for convenience
export type {
  RedemptionRequest,
  RedemptionStatus,
  CreateRedemptionRequestInput,
  RedemptionRequestResponse,
  RedemptionListResponse,
  EligibilityResult,
  ApprovalRequest,
  ApprovalDecision,
  ApprovalResponse,
  SettlementRequest,
  SettlementResponse,
  SettlementStatusResponse
} from '../types';
