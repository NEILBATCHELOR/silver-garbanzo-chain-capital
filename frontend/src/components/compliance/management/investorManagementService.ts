/**
 * Enhanced Investor Management Service for compliance management
 * Created: August 12, 2025
 * 
 * Provides CRUD operations for investor management in compliance context
 * Handles KYC/AML status, document management, and investor verification
 */

import { supabase } from '@/infrastructure/database/client';
import type { Investor } from '@/types/core/centralModels';

export interface InvestorSummary {
  id: string;
  name: string;
  email: string;
  type: string | null;
  kyc_status: string | null;
  investor_status: string | null;
  accreditation_status: string | null;
  accreditation_type: string | null;
  onboarding_completed: boolean | null;
  company: string | null;
  wallet_address: string | null;
  tax_residency: string | null;
  document_count: number;
  last_compliance_check: string | null;
  compliance_checked_email: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface InvestorWithDocuments extends InvestorSummary {
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
 * Extended Investor interface with all compliance fields
 * Overrides enum types from base Investor to handle string values from database
 */
export interface ExtendedInvestor extends Omit<Investor, 'kycStatus' | 'investorStatus' | 'accreditationStatus'> {
  // Override enum fields with string types to match database values
  kycStatus?: string;
  investorStatus?: string;
  accreditationStatus?: string;
  // Additional compliance fields
  taxResidency?: string;
  taxIdNumber?: string;
  investmentPreferences?: any;
  riskAssessment?: any;
  profileData?: any;
  notes?: string;
  lastComplianceCheck?: string;
  kycExpiryDate?: string;
  accreditationExpiryDate?: string;
}

export class InvestorManagementService {

  /**
   * Get all investors with basic info and document counts for compliance management
   */
  static async getInvestors(): Promise<InvestorSummary[]> {
    try {
      // Get investors with basic compliance info
      const { data: investors, error: investorError } = await supabase
        .from('investors')
        .select(`
          investor_id,
          name,
          email,
          type,
          kyc_status,
          investor_status,
          accreditation_status,
          accreditation_type,
          onboarding_completed,
          company,
          wallet_address,
          tax_residency,
          last_compliance_check,
          compliance_checked_email,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (investorError) {
        console.error('Error fetching investors:', investorError);
        throw investorError;
      }

      // Get document counts for all investors in one efficient query
      // This replaces 494 parallel requests with 1 aggregated query
      let documentCountMap: Record<string, number> = {};
      
      try {
        if (investors && investors.length > 0) {
          const investorIds = investors.map(inv => inv.investor_id);
          
          // Single query to get all documents for all investors
          const { data: documentCounts, error: docCountError } = await supabase
            .from('investor_documents')
            .select('investor_id')
            .in('investor_id', investorIds);

          if (docCountError) {
            console.warn('Error fetching document counts, defaulting to 0:', docCountError);
          } else if (documentCounts) {
            // Create lookup map for O(1) counting
            documentCountMap = documentCounts.reduce((acc, doc) => {
              acc[doc.investor_id] = (acc[doc.investor_id] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
          }
        }
      } catch (error) {
        console.warn('Document count query failed, using fallback:', error);
        // Continue with empty map (all counts will be 0)
      }

      // Map investors with their document counts
      const investorsWithDocCounts = (investors || []).map(investor => ({
        id: investor.investor_id,
        name: investor.name,
        email: investor.email,
        type: investor.type,
        kyc_status: investor.kyc_status,
        investor_status: investor.investor_status,
        accreditation_status: investor.accreditation_status,
        accreditation_type: investor.accreditation_type,
        onboarding_completed: investor.onboarding_completed,
        company: investor.company,
        wallet_address: investor.wallet_address,
        tax_residency: investor.tax_residency,
        last_compliance_check: investor.last_compliance_check,
        compliance_checked_email: investor.compliance_checked_email,
        created_at: investor.created_at,
        updated_at: investor.updated_at,
        document_count: documentCountMap[investor.investor_id] || 0
      }));

      return investorsWithDocCounts;
    } catch (error) {
      console.error('Failed to fetch investors:', error);
      throw error;
    }
  }

  /**
   * Get investor by ID with complete details
   */
  static async getInvestorById(id: string): Promise<InvestorWithDocuments | null> {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .eq('investor_id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Investor not found
        }
        console.error('Error fetching investor:', error);
        throw error;
      }

      // Get investor documents
      const { data: documents, error: docError } = await supabase
        .from('investor_documents')
        .select(`
          id,
          document_name,
          document_type,
          status,
          uploaded_at,
          is_public
        `)
        .eq('investor_id', id)
        .order('uploaded_at', { ascending: false });

      if (docError) {
        console.error('Error fetching investor documents:', docError);
      }

      // Map to expected format
      const mappedInvestor: InvestorWithDocuments = {
        id: data.investor_id,
        name: data.name,
        email: data.email,
        type: data.type,
        kyc_status: data.kyc_status,
        investor_status: data.investor_status,
        accreditation_status: data.accreditation_status,
        accreditation_type: data.accreditation_type,
        onboarding_completed: data.onboarding_completed,
        company: data.company,
        wallet_address: data.wallet_address,
        tax_residency: data.tax_residency,
        last_compliance_check: data.last_compliance_check,
        compliance_checked_email: data.compliance_checked_email,
        created_at: data.created_at,
        updated_at: data.updated_at,
        document_count: (documents || []).length,
        documents: documents || []
      };

      return mappedInvestor;
    } catch (error) {
      console.error('Failed to fetch investor:', error);
      throw error;
    }
  }

  /**
   * Create new investor with proper compliance defaults
   */
  static async createInvestor(investorData: Partial<ExtendedInvestor>): Promise<InvestorSummary> {
    try {
      // Ensure proper defaults for compliance
      const investorWithDefaults = {
        name: investorData.name,
        email: investorData.email,
        type: investorData.type || 'individual',
        kyc_status: investorData.kycStatus || 'not_started',
        investor_status: investorData.investorStatus || 'pending',
        accreditation_status: investorData.accreditationStatus || 'not_verified',
        accreditation_type: investorData.accreditationType || null,
        onboarding_completed: false, // Always start as incomplete
        company: investorData.company || null,
        wallet_address: investorData.walletAddress || null,
        tax_residency: investorData.taxResidency || null,
        tax_id_number: investorData.taxIdNumber || null,
        investment_preferences: investorData.investmentPreferences || null,
        risk_assessment: investorData.riskAssessment || null,
        profile_data: investorData.profileData || null,
        notes: investorData.notes || null,
        last_compliance_check: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('investors')
        .insert([investorWithDefaults])
        .select()
        .single();

      if (error) {
        console.error('Error creating investor:', error);
        throw error;
      }

      return {
        id: data.investor_id,
        name: data.name,
        email: data.email,
        type: data.type,
        kyc_status: data.kyc_status,
        investor_status: data.investor_status,
        accreditation_status: data.accreditation_status,
        accreditation_type: data.accreditation_type,
        onboarding_completed: data.onboarding_completed,
        company: data.company,
        wallet_address: data.wallet_address,
        tax_residency: data.tax_residency,
        last_compliance_check: data.last_compliance_check,
        compliance_checked_email: data.compliance_checked_email,
        created_at: data.created_at,
        updated_at: data.updated_at,
        document_count: 0
      };
    } catch (error) {
      console.error('Failed to create investor:', error);
      throw error;
    }
  }

  /**
   * Update investor with proper field mapping
   */
  static async updateInvestor(id: string, updates: Partial<ExtendedInvestor>): Promise<InvestorSummary> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      console.log('InvestorManagementService.updateInvestor called:', { id, updates });

      // Map frontend fields to database columns
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.kycStatus !== undefined) updateData.kyc_status = updates.kycStatus;
      if (updates.investorStatus !== undefined) updateData.investor_status = updates.investorStatus;
      if (updates.accreditationStatus !== undefined) updateData.accreditation_status = updates.accreditationStatus;
      if (updates.accreditationType !== undefined) updateData.accreditation_type = updates.accreditationType;
      if (updates.onboardingCompleted !== undefined) updateData.onboarding_completed = updates.onboardingCompleted;
      if (updates.company !== undefined) updateData.company = updates.company;
      if (updates.walletAddress !== undefined) updateData.wallet_address = updates.walletAddress;
      if (updates.taxResidency !== undefined) updateData.tax_residency = updates.taxResidency;
      if (updates.taxIdNumber !== undefined) updateData.tax_id_number = updates.taxIdNumber;
      if (updates.investmentPreferences !== undefined) updateData.investment_preferences = updates.investmentPreferences;
      if (updates.riskAssessment !== undefined) updateData.risk_assessment = updates.riskAssessment;
      if (updates.profileData !== undefined) updateData.profile_data = updates.profileData;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.lastComplianceCheck !== undefined) updateData.last_compliance_check = updates.lastComplianceCheck;

      console.log('Database update payload:', { updateData, id });

      const { data, error } = await supabase
        .from('investors')
        .update(updateData)
        .eq('investor_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating investor:', error);
        throw error;
      }

      console.log('Database update successful:', data);

      return {
        id: data.investor_id,
        name: data.name,
        email: data.email,
        type: data.type,
        kyc_status: data.kyc_status,
        investor_status: data.investor_status,
        accreditation_status: data.accreditation_status,
        accreditation_type: data.accreditation_type,
        onboarding_completed: data.onboarding_completed,
        company: data.company,
        wallet_address: data.wallet_address,
        tax_residency: data.tax_residency,
        last_compliance_check: data.last_compliance_check,
        compliance_checked_email: data.compliance_checked_email,
        created_at: data.created_at,
        updated_at: data.updated_at,
        document_count: 0 // Will be populated separately if needed
      };
    } catch (error) {
      console.error('Failed to update investor:', error);
      throw error;
    }
  }

  /**
   * Delete investor (and associated documents via cascade)
   */
  static async deleteInvestor(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('investors')
        .delete()
        .eq('investor_id', id);

      if (error) {
        console.error('Error deleting investor:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete investor:', error);
      throw error;
    }
  }

  /**
   * Search investors by name or email
   */
  static async searchInvestors(query: string): Promise<InvestorSummary[]> {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select(`
          investor_id,
          name,
          email,
          type,
          kyc_status,
          investor_status,
          accreditation_status,
          accreditation_type,
          onboarding_completed,
          company,
          wallet_address,
          tax_residency,
          last_compliance_check,
          created_at,
          updated_at
        `)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching investors:', error);
        throw error;
      }

      return (data || []).map(investor => ({
        id: investor.investor_id,
        name: investor.name,
        email: investor.email,
        type: investor.type,
        kyc_status: investor.kyc_status,
        investor_status: investor.investor_status,
        accreditation_status: investor.accreditation_status,
        accreditation_type: investor.accreditation_type,
        onboarding_completed: investor.onboarding_completed,
        company: investor.company,
        wallet_address: investor.wallet_address,
        tax_residency: investor.tax_residency,
        last_compliance_check: investor.last_compliance_check,
        created_at: investor.created_at,
        updated_at: investor.updated_at,
        document_count: 0 // Will be populated when needed
      }));
    } catch (error) {
      console.error('Failed to search investors:', error);
      throw error;
    }
  }

  /**
   * Get investors by KYC status
   */
  static async getInvestorsByKycStatus(status: string): Promise<InvestorSummary[]> {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select(`
          investor_id,
          name,
          email,
          type,
          kyc_status,
          investor_status,
          accreditation_status,
          accreditation_type,
          onboarding_completed,
          company,
          wallet_address,
          tax_residency,
          last_compliance_check,
          created_at,
          updated_at
        `)
        .eq('kyc_status', status)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching investors by KYC status:', error);
        throw error;
      }

      return (data || []).map(investor => ({
        id: investor.investor_id,
        name: investor.name,
        email: investor.email,
        type: investor.type,
        kyc_status: investor.kyc_status,
        investor_status: investor.investor_status,
        accreditation_status: investor.accreditation_status,
        accreditation_type: investor.accreditation_type,
        onboarding_completed: investor.onboarding_completed,
        company: investor.company,
        wallet_address: investor.wallet_address,
        tax_residency: investor.tax_residency,
        last_compliance_check: investor.last_compliance_check,
        created_at: investor.created_at,
        updated_at: investor.updated_at,
        document_count: 0
      }));
    } catch (error) {
      console.error('Failed to fetch investors by KYC status:', error);
      throw error;
    }
  }

  /**
   * Update investor KYC status
   */
  static async updateKycStatus(id: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('investors')
        .update({
          kyc_status: status,
          last_compliance_check: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('investor_id', id);

      if (error) {
        console.error('Error updating KYC status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update KYC status:', error);
      throw error;
    }
  }

  /**
   * Update investor accreditation status
   */
  static async updateAccreditationStatus(id: string, status: string, type?: string): Promise<void> {
    try {
      const updateData: any = {
        accreditation_status: status,
        last_compliance_check: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (type) {
        updateData.accreditation_type = type;
      }

      const { error } = await supabase
        .from('investors')
        .update(updateData)
        .eq('investor_id', id);

      if (error) {
        console.error('Error updating accreditation status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update accreditation status:', error);
      throw error;
    }
  }

  /**
   * Complete investor onboarding
   */
  static async completeOnboarding(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('investors')
        .update({
          onboarding_completed: true,
          investor_status: 'active',
          last_compliance_check: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('investor_id', id);

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
   * Get document count for an investor
   */
  static async getDocumentCount(investorId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('investor_documents')
        .select('*', { count: 'exact', head: true })
        .eq('investor_id', investorId);

      if (error) {
        console.error('Error counting documents for investor:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get document count:', error);
      return 0;
    }
  }

  /**
   * Get documents for an investor
   */
  static async getInvestorDocuments(investorId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('investor_documents')
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
        .eq('investor_id', investorId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching investor documents:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get investor documents:', error);
      return [];
    }
  }

  /**
   * Get compliance statistics
   */
  static async getComplianceStats(): Promise<{
    total: number;
    kycApproved: number;
    accredited: number;
    onboardingComplete: number;
    pendingReview: number;
  }> {
    try {
      const investors = await this.getInvestors();
      
      return {
        total: investors.length,
        kycApproved: investors.filter(inv => inv.kyc_status === 'approved').length,
        accredited: investors.filter(inv => inv.accreditation_status === 'verified').length,
        onboardingComplete: investors.filter(inv => inv.onboarding_completed === true).length,
        pendingReview: investors.filter(inv => 
          inv.kyc_status === 'pending' || 
          inv.investor_status === 'pending' ||
          inv.accreditation_status === 'pending'
        ).length
      };
    } catch (error) {
      console.error('Failed to get compliance stats:', error);
      return {
        total: 0,
        kycApproved: 0,
        accredited: 0,
        onboardingComplete: 0,
        pendingReview: 0
      };
    }
  }
}

export default InvestorManagementService;
