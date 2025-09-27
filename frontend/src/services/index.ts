/**
 * =====================================================
 * SERVICES - CENTRAL INDEX
 * Comprehensive export of all application services
 * =====================================================
 */

// ============================================
// AUTHENTICATION SERVICES
// ============================================
export * from './auth';

// ============================================
// PRODUCT SERVICES
// ============================================
export * from './products';

// ============================================
// WALLET SERVICES
// ============================================
export * from './wallet';

// ============================================
// BLOCKCHAIN SERVICES
// ============================================
export * from './blockchain';

// ============================================
// TOKEN SERVICES
// ============================================
export * from './token';

// ============================================
// PROJECT SERVICES
// ============================================
export * from './project';

// ============================================
// DOCUMENT SERVICES
// ============================================
export * from './document';

// ============================================
// COMPLIANCE SERVICES
// ============================================
export * from './compliance';

// ============================================
// PERMISSIONS SERVICES
// ============================================
export * from './permissions';

// ============================================
// APPROVAL SERVICES
// ============================================
export * from './approval';

// ============================================
// AUDIT SERVICES
// ============================================
// Re-export audit services with explicit type exports to avoid conflicts
export {
  frontendAuditService,
  backendAuditService,
  auditLogService,
  tableAuditGenerator,
  universalAuditService
} from './audit';

export type {
  FrontendAuditEvent,
  AuditConfig,
  AuditEvent,
  AuditQueryOptions,
  PaginatedResponse as AuditPaginatedResponse, // Alias to avoid conflict with nav/NavService
  AuditStatistics,
  AuditAnalytics,
  ComplianceReport,
  AnomalyDetection
} from './audit';

// ============================================
// GUARDIAN SERVICES
// ============================================
export * from './guardian';

// ============================================
// CLIMATE RECEIVABLES SERVICES
// ============================================
export * from './climateReceivables';

// ============================================
// INDIVIDUAL SERVICES (with proper index imports)
// ============================================

// Activity Services
export * from './activity';

// Base Services
export * from './base';

// Calendar Services
export * from './calendar';

// Cap Table Services
export * from './captable/capTableService';

// Compatibility Services
export * from './compatibility';

// Dashboard Services
// Re-export with alias to avoid WorkflowStage conflict with workflow/workflowService
export {
  type WorkflowStage as DashboardWorkflowStage,
  type StatusItem,
  type WalletAddress,
  type WhitelistSettings,
  type NotificationProps,
  type ComplianceData,
  getWorkflowStages,
  getWalletData,
  getNotifications,
  getComplianceData
} from './dashboard/dashboardDataService';

// Database Services
export * from './database';

// DFNS Services
export * from './dfns/dfnsService';

// Integration Services - Import only non-conflicting functions from InvestorServices
export {
  fetchInvestors,
  bulkUpdateInvestors as bulkUpdateInvestorsIntegration,
  bulkDeleteInvestors,
  bulkCreateInvestors,
  // Note: InvestorGroup functions (getInvestorGroups, createInvestorGroup, etc.) not yet implemented
} from './integrations/InvestorServices';
export * from './integrations/cube3Service';
export * from './integrations/identifyService';
export * from './integrations/onfidoService';
export * from './integrations/restrictionService';
export * from './integrations/sanctionsService';

// Investor Services - Primary investor CRUD operations
export * from './investor/investors';

// Navigation Services
export * from './nav';

// Policy Services - Selective exports to avoid duplicates
export type {
  Policy
} from './policy/policyService';

export {
  // Note: PolicyStatus is not exported from policyService (it's a local type)
  // Note: PolicyService and policyService classes/instances don't exist
  getAllPolicies,
  getPolicy,
  savePolicy,
  deletePolicy
} from './policy/policyService';

export {
  // Note: PolicyTemplate type should be imported from types, not from service
  // Note: PolicyTemplateService and policyTemplateService don't exist
  getAllPolicyTemplates,
  getPolicyTemplateById,
  savePolicyTemplate,
  updatePolicyTemplate,
  deletePolicyTemplate,
  templateToPolicy
} from './policy/policyTemplateService';

export * from './policy/policyVersionService';
export * from './policy/policyApproverService';
export * from './policy/approvalService';
export * from './policy/enhancedPolicyService';
export * from './policy/enhancedPolicyTemplateService';

// Realtime Services
export * from './realtime/realtimeService';

// Redemption Services
export * from './redemption/redemptionService';

// Rule Services
export * from './rule/ruleService';

// Sidebar Services
export * from './sidebar';

// User Services
export * from './user/userService';
export * from './user/users';
export * from './user/roles';

// Workflow Services
export * from './workflow/workflowService';
