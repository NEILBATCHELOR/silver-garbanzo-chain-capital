/**
 * Enhanced Organization Service for managing issuer/organization CRUD operations
 * Updated: August 11, 2025 - Added support for all onboarding fields and proper field mapping
 * 
 * ENHANCED: Handles field mapping between frontend and database column names
 * Supports all organization fields from onboarding process
 */

import { supabase } from '@/infrastructure/database/client';
import type { Organization } from '@/types/core/centralModels';

export interface OrganizationSummary {
  id: string;
  name: string;
  legal_name: string | null;
  business_type: string | null;
  status: string | null;
  compliance_status: string | null;
  onboarding_completed: boolean | null;
  document_count: number;
  created_at: string;
  updated_at: string | null;
}

export interface OrganizationWithDocuments extends Organization {
  documents: {
    id: string;
    document_name: string;
    document_type: string;
    status: string;
    uploaded_at: string;
    is_public: boolean | null;
  }[];
}

/**
 * Extended Organization interface with all onboarding fields
 */
export interface ExtendedOrganization extends Organization {
  // Onboarding fields mapped to database columns
  entityStructure?: string;           // maps to entity_structure
  issuerType?: string;               // maps to issuer_type
  governanceModel?: string;          // maps to governance_model
  countryJurisdiction?: string;      // maps to jurisdiction
  regulatoryStatus?: string;         // maps to compliance_status
  externalTrustees?: string;         // maps to legal_representatives
  taxId?: string;                    // maps to tax_id
  website?: string;                  // maps to website
  registrationDate?: string;         // maps to registration_date
}

export class OrganizationService {
  
  /**
   * Map frontend field names to database column names
   * REMOVES any fields that don't exist in the database
   * PUBLIC method for use in components
   */
  public static mapFieldsToDatabase(frontendData: Partial<ExtendedOrganization>): any {
    const dbData: any = {};
    
    // Only include fields that actually exist in the database
    // Based on the actual organizations table schema
    
    // Direct field mappings (no transformation needed)
    if (frontendData.name !== undefined) dbData.name = frontendData.name;
    if (frontendData.website !== undefined) dbData.website = frontendData.website;
    if (frontendData.address !== undefined) dbData.address = frontendData.address;
    if (frontendData.status !== undefined) dbData.status = frontendData.status;
    
    // camelCase to snake_case conversions
    if (frontendData.legalName !== undefined) {
      dbData.legal_name = frontendData.legalName;
    }
    
    if (frontendData.businessType !== undefined) {
      dbData.business_type = frontendData.businessType;
    }
    
    if (frontendData.registrationNumber !== undefined) {
      dbData.registration_number = frontendData.registrationNumber;
    }
    
    if (frontendData.registrationDate !== undefined) {
      dbData.registration_date = frontendData.registrationDate;
    }
    
    if (frontendData.taxId !== undefined) {
      dbData.tax_id = frontendData.taxId;
    }
    
    if (frontendData.contactEmail !== undefined) {
      dbData.contact_email = frontendData.contactEmail;
    }
    
    if (frontendData.contactPhone !== undefined) {
      dbData.contact_phone = frontendData.contactPhone;
    }
    
    if (frontendData.onboardingCompleted !== undefined) {
      dbData.onboarding_completed = frontendData.onboardingCompleted;
    }
    
    // Special field mappings
    if (frontendData.countryJurisdiction !== undefined) {
      dbData.jurisdiction = frontendData.countryJurisdiction;
    } else if (frontendData.jurisdiction !== undefined) {
      dbData.jurisdiction = frontendData.jurisdiction;
    }
    
    if (frontendData.regulatoryStatus !== undefined) {
      dbData.compliance_status = frontendData.regulatoryStatus;
    } else if (frontendData.complianceStatus !== undefined) {
      dbData.compliance_status = frontendData.complianceStatus;
    }
    
    if (frontendData.entityStructure !== undefined) {
      dbData.entity_structure = frontendData.entityStructure;
    }
    
    if (frontendData.issuerType !== undefined) {
      dbData.issuer_type = frontendData.issuerType;
    }
    
    if (frontendData.governanceModel !== undefined) {
      dbData.governance_model = frontendData.governanceModel;
    }
    
    // Handle legal representatives
    if (frontendData.externalTrustees !== undefined) {
      dbData.legal_representatives = frontendData.externalTrustees 
        ? [{ name: frontendData.externalTrustees, role: 'External Representative' }]
        : null;
    } else if (frontendData.legalRepresentatives !== undefined) {
      dbData.legal_representatives = frontendData.legalRepresentatives;
    }
    
    // CRITICAL: Remove any fields that don't exist in the database
    // These fields are frontend-only and should never be sent to the database
    const validDatabaseFields = [
      'name', 'legal_name', 'registration_number', 'registration_date', 'tax_id',
      'jurisdiction', 'business_type', 'status', 'contact_email', 'contact_phone',
      'website', 'address', 'legal_representatives', 'compliance_status',
      'onboarding_completed', 'entity_structure', 'issuer_type', 'governance_model',
      'created_at', 'updated_at'
    ];
    
    // Filter to only include valid database fields
    const cleanDbData: any = {};
    validDatabaseFields.forEach(field => {
      if (dbData[field] !== undefined) {
        cleanDbData[field] = dbData[field];
      }
    });
    
    // IMPORTANT: Explicitly exclude frontend-only fields
    const frontendOnlyFields = [
      'documents', 'document_count', 'countryJurisdiction', 'regulatoryStatus',
      'entityStructure', 'issuerType', 'governanceModel', 'externalTrustees',
      'legalName', 'businessType', 'registrationNumber', 'registrationDate',
      'taxId', 'contactEmail', 'contactPhone', 'complianceStatus', 'onboardingCompleted'
    ];
    
    // Double-check that no frontend-only fields are included
    frontendOnlyFields.forEach(field => {
      if (cleanDbData[field] !== undefined) {
        delete cleanDbData[field];
      }
    });
    
    return cleanDbData;
  }
  
  /**
   * Map database fields to frontend field names
   * PUBLIC method for use in components
   */
  public static mapFieldsFromDatabase(dbData: any): ExtendedOrganization {
    return {
      ...dbData,
      // Map database columns to frontend fields
      countryJurisdiction: dbData.jurisdiction,
      regulatoryStatus: dbData.compliance_status,
      entityStructure: dbData.entity_structure,
      issuerType: dbData.issuer_type,
      governanceModel: dbData.governance_model,
      externalTrustees: Array.isArray(dbData.legal_representatives) 
        ? dbData.legal_representatives.map((rep: any) => rep.name || rep).join(', ')
        : '',
      legalName: dbData.legal_name,
      businessType: dbData.business_type,
      registrationNumber: dbData.registration_number,
      registrationDate: dbData.registration_date,
      taxId: dbData.tax_id,
      contactEmail: dbData.contact_email,
      contactPhone: dbData.contact_phone,
      complianceStatus: dbData.compliance_status,
      onboardingCompleted: dbData.onboarding_completed,
    };
  }

  /**
   * Get all organizations with basic info and actual document counts
   * FIXED: Now properly calculates document counts using issuer_id relationship
   */
  static async getOrganizations(): Promise<OrganizationSummary[]> {
    try {
      // Get organizations with document counts via LEFT JOIN
      const { data: organizationsWithCounts, error: orgError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          legal_name,
          business_type,
          status,
          compliance_status,
          onboarding_completed,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (orgError) {
        console.error('Error fetching organizations:', orgError);
        throw orgError;
      }

      // Get document counts separately for each organization
      const organizationsWithDocCounts = await Promise.all(
        (organizationsWithCounts || []).map(async (org) => {
          // Count documents where issuer_id matches organization id
          const { count, error: countError } = await supabase
            .from('issuer_documents')
            .select('*', { count: 'exact', head: true })
            .eq('issuer_id', org.id);

          if (countError) {
            console.warn(`Error counting documents for organization ${org.id}:`, countError);
          }

          return {
            id: org.id,
            name: org.name,
            legal_name: org.legal_name,
            business_type: org.business_type,
            status: org.status,
            compliance_status: org.compliance_status,
            onboarding_completed: org.onboarding_completed,
            created_at: org.created_at,
            updated_at: org.updated_at,
            document_count: count || 0 // Real document count from issuer_documents table
          };
        })
      );

      return organizationsWithDocCounts;
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      throw error;
    }
  }

  /**
   * Get organization by ID with complete details
   * Returns organization data without documents field
   */
  static async getOrganizationById(id: string): Promise<OrganizationWithDocuments | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Organization not found
        }
        console.error('Error fetching organization:', error);
        throw error;
      }

      // Map database fields to frontend fields
      const mappedData = this.mapFieldsFromDatabase(data);

      // IMPORTANT: Add documents field as empty array (not from database)
      return {
        ...mappedData,
        documents: [] // This is a frontend-only field, not from database
      };
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      throw error;
    }
  }

  /**
   * Create new organization with proper field mapping and pending defaults
   */
  static async createOrganization(organizationData: Partial<ExtendedOrganization>): Promise<Organization> {
    try {
      // Map frontend fields to database columns
      const dbData = this.mapFieldsToDatabase(organizationData);
      
      // Ensure proper defaults for compliance and onboarding status
      const organizationWithDefaults = {
        ...dbData,
        compliance_status: dbData.compliance_status || 'pending_review', // Default to pending_review
        onboarding_completed: false, // Always start as incomplete
        status: dbData.status || 'pending', // Default to pending
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('organizations')
        .insert([organizationWithDefaults])
        .select()
        .single();

      if (error) {
        console.error('Error creating organization:', error);
        throw error;
      }

      return this.mapFieldsFromDatabase(data);
    } catch (error) {
      console.error('Failed to create organization:', error);
      throw error;
    }
  }

  /**
   * Update organization with proper field mapping
   */
  static async updateOrganization(id: string, updates: Partial<ExtendedOrganization>): Promise<Organization> {
    try {
      // Map frontend fields to database columns
      const dbUpdates = this.mapFieldsToDatabase(updates);
      
      const { data, error } = await supabase
        .from('organizations')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating organization:', error);
        throw error;
      }

      return this.mapFieldsFromDatabase(data);
    } catch (error) {
      console.error('Failed to update organization:', error);
      throw error;
    }
  }

  /**
   * Delete organization (and associated documents via cascade)
   */
  static async deleteOrganization(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting organization:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete organization:', error);
      throw error;
    }
  }

  /**
   * Search organizations by name or legal name
   */
  static async searchOrganizations(query: string): Promise<OrganizationSummary[]> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          legal_name,
          business_type,
          status,
          compliance_status,
          onboarding_completed,
          created_at,
          updated_at
        `)
        .or(`name.ilike.%${query}%,legal_name.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching organizations:', error);
        throw error;
      }

      return (data || []).map(org => ({
        id: org.id,
        name: org.name,
        legal_name: org.legal_name,
        business_type: org.business_type,
        status: org.status,
        compliance_status: org.compliance_status,
        onboarding_completed: org.onboarding_completed,
        created_at: org.created_at,
        updated_at: org.updated_at,
        document_count: 0 // Will be populated when relationship is available
      }));
    } catch (error) {
      console.error('Failed to search organizations:', error);
      throw error;
    }
  }

  /**
   * Get organizations by status
   */
  static async getOrganizationsByStatus(status: string): Promise<OrganizationSummary[]> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          legal_name,
          business_type,
          status,
          compliance_status,
          onboarding_completed,
          created_at,
          updated_at
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching organizations by status:', error);
        throw error;
      }

      return (data || []).map(org => ({
        id: org.id,
        name: org.name,
        legal_name: org.legal_name,
        business_type: org.business_type,
        status: org.status,
        compliance_status: org.compliance_status,
        onboarding_completed: org.onboarding_completed,
        created_at: org.created_at,
        updated_at: org.updated_at,
        document_count: 0 // Will be populated when relationship is available
      }));
    } catch (error) {
      console.error('Failed to fetch organizations by status:', error);
      throw error;
    }
  }

  /**
   * Update organization compliance status
   */
  static async updateComplianceStatus(id: string, complianceStatus: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          compliance_status: complianceStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating compliance status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update compliance status:', error);
      throw error;
    }
  }

  /**
   * Mark organization onboarding as completed
   */
  static async completeOnboarding(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          onboarding_completed: true,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error completing onboarding:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  }

  /**
   * Get document count for an organization
   * FIXED: Now properly counts documents using issuer_id relationship
   */
  static async getDocumentCount(organizationId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('issuer_documents')
        .select('*', { count: 'exact', head: true })
        .eq('issuer_id', organizationId);

      if (error) {
        console.error('Error counting documents for organization:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get document count:', error);
      return 0;
    }
  }

  /**
   * Get documents for an organization
   * FIXED: Now properly fetches documents using issuer_id relationship
   */
  static async getOrganizationDocuments(organizationId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('issuer_documents')
        .select(`
          id,
          document_name,
          document_type,
          status,
          file_url,
          uploaded_at,
          is_public,
          metadata
        `)
        .eq('issuer_id', organizationId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching organization documents:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get organization documents:', error);
      return [];
    }
  }

  /**
   * Link a document to an organization
   * FIXED: Now properly links documents using issuer_id relationship
   */
  static async linkDocumentToOrganization(documentId: string, organizationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('issuer_documents')
        .update({ issuer_id: organizationId })
        .eq('id', documentId);

      if (error) {
        console.error('Error linking document to organization:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to link document to organization:', error);
      return false;
    }
  }

  /**
   * Validate organization data before save
   */
  static validateOrganizationData(data: Partial<ExtendedOrganization>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.name?.trim()) {
      errors.push('Organization name is required');
    }
    
    if (!data.legalName?.trim()) {
      errors.push('Legal name is required');
    }
    
    if (!data.businessType) {
      errors.push('Business type is required');
    }
    
    if (!data.countryJurisdiction && !data.jurisdiction) {
      errors.push('Country of registration is required');
    }
    
    if (data.contactEmail && !data.contactEmail.includes('@')) {
      errors.push('Valid email address is required');
    }
    
    if (data.website && !data.website.startsWith('http')) {
      errors.push('Website must be a valid URL');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default OrganizationService;
