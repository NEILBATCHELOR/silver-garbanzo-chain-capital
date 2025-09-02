/**
 * Organization Assignment Types
 * Type definitions for organization assignment functionality
 */

export interface Organization {
  id: string;
  name: string;
  legalName?: string | null;
  businessType?: string | null;
  status?: string | null;
  complianceStatus?: string | null;
  documentCount?: number;
  createdAt: string;
  updatedAt?: string | null;
}

export interface UserOrganizationRole {
  id: string;
  userId: string;
  roleId: string;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationAssignmentMode {
  mode: 'all' | 'multiple' | 'single';
  organizationIds: string[];
}

export interface OrganizationAssignmentRequest {
  userId: string;
  roleId: string;
  mode: 'all' | 'multiple' | 'single';
  organizationIds: string[];
}

export interface ProjectOrganizationAssignmentData {
  id?: string;
  projectId: string;
  organizationId: string;
  relationship: 'issuer' | 'investor' | 'service_provider' | 'regulator';
  notes?: string | null;
  isActive?: boolean;
  assignedAt?: string;
  createdAt: string;
  updatedAt?: string;
  // Expanded project information
  projectName?: string;
  projectDescription?: string;
  projectStatus?: string;
  // Expanded organization information
  organizationName?: string;
  organizationLegalName?: string;
  organizationBusinessType?: string;
  organizationStatus?: string;
}

export interface OrganizationSearchOptions {
  query?: string;
  status?: string;
  businessType?: string;
  limit?: number;
  page?: number;
}
