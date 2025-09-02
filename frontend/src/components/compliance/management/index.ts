/**
 * Compliance Management Components
 * Export all organization and investor management components
 */

// Organization Management
export { default as OrganizationManagementDashboard } from './OrganizationManagementDashboard';
export { default as OrganizationDetailPage } from './OrganizationDetailPage';
export { default as OrganizationService } from './organizationService';

// Investor Management
export { default as InvestorManagementDashboard } from './InvestorManagementDashboard';
export { default as InvestorManagementDashboardEnhanced } from './InvestorManagementDashboardEnhanced';
export { default as InvestorDetailPage } from './InvestorDetailPage';
export { default as InvestorManagementService } from './investorManagementService';

export type {
  OrganizationSummary,
  OrganizationWithDocuments
} from './organizationService';

export type {
  InvestorSummary,
  InvestorWithDocuments,
  ExtendedInvestor
} from './investorManagementService';
