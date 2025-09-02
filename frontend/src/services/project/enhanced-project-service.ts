/**
 * Enhanced Project Service
 * Handles all project operations with comprehensive field support
 */

import { supabase } from '@/infrastructure/supabaseClient';
import { calculateCompletionPercentage, getMissingMandatoryFields, getProjectTypeConfig } from '@/types/projects/projectTypes';

// Duration enum type based on database enum
export type ProjectDuration = '1_month' | '3_months' | '6_months' | '9_months' | '12_months' | 'over_12_months';

// Insert interface for creating new projects - requires essential fields
export interface EnhancedProjectInsert {
  name: string; // Required for new projects
  description?: string;
  project_type: string; // Required for new projects
  status?: string; // Has default in database
  investment_status?: string; // Has default in database
  is_primary?: boolean;
  
  // Financial fields
  target_raise?: number;
  total_notional?: number;
  minimum_investment?: number;
  authorized_shares?: number;
  share_price?: number;
  company_valuation?: number;
  estimated_yield_percentage?: number;
  currency?: string;
  
  // Date fields
  subscription_start_date?: string;
  subscription_end_date?: string;
  transaction_start_date?: string;
  maturity_date?: string;
  duration?: ProjectDuration;
  
  // Legal fields
  legal_entity?: string;
  jurisdiction?: string;
  tax_id?: string;
  
  // Token fields
  token_symbol?: string;
  
  // Universal ESG & Sustainability fields
  sustainability_classification?: string;
  esg_risk_rating?: string;
  principal_adverse_impacts?: string;
  taxonomy_alignment_percentage?: number;
  
  // Risk & Governance fields
  risk_profile?: string;
  governance_structure?: string;
  compliance_framework?: string[];
  third_party_custodian?: boolean;
  custodian_name?: string;
  
  // Investor Protection fields
  target_investor_type?: string;
  complexity_indicator?: string;
  liquidity_terms?: string;
  fee_structure_summary?: string;
  
  // Traditional Assets - Structured Products
  capital_protection_level?: number;
  underlying_assets?: string[];
  barrier_level?: number;
  payoff_structure?: string;
  
  // Traditional Assets - Equity
  voting_rights?: string;
  dividend_policy?: string;
  dilution_protection?: string[];
  exit_strategy?: string;
  
  // Traditional Assets - Bonds
  credit_rating?: string;
  coupon_frequency?: string;
  callable_features?: boolean;
  call_date?: string;
  call_price?: number;
  security_collateral?: string;
  
  // Alternative Assets - Private Equity
  fund_vintage_year?: number;
  investment_stage?: string;
  sector_focus?: string[];
  geographic_focus?: string[];
  
  // Alternative Assets - Real Estate
  property_type?: string;
  geographic_location?: string;
  development_stage?: string;
  environmental_certifications?: string[];
  
  // Alternative Assets - Receivables
  debtor_credit_quality?: string;
  collection_period_days?: number;
  recovery_rate_percentage?: number;
  diversification_metrics?: string;
  
  // Alternative Assets - Energy/Solar & Wind
  project_capacity_mw?: number;
  power_purchase_agreements?: string;
  regulatory_approvals?: string[];
  carbon_offset_potential?: number;
  
  // Digital Assets - All Digital Assets
  blockchain_network?: string;
  smart_contract_audit_status?: string;
  consensus_mechanism?: string;
  gas_fee_structure?: string;
  oracle_dependencies?: string[];
  
  // Digital Assets - Stablecoins
  collateral_type?: string;
  reserve_management_policy?: string;
  audit_frequency?: string;
  redemption_mechanism?: string;
  depeg_risk_mitigation?: string[];
  
  // Digital Assets - Tokenized Funds
  token_economics?: string;
  custody_arrangements?: string;
  smart_contract_address?: string;
  upgrade_governance?: string;
  
  // Operational & Compliance
  data_processing_basis?: string;
  privacy_policy_link?: string;
  data_retention_policy?: string;
  business_continuity_plan?: boolean;
  cybersecurity_framework?: string[];
  disaster_recovery_procedures?: string;
  tax_reporting_obligations?: string[];
  regulatory_permissions?: string[];
  cross_border_implications?: string;
}

// Update interface that excludes system-managed fields and ensures required fields are properly typed
export interface EnhancedProjectUpdate {
  name?: string;
  description?: string;
  project_type?: string;
  status?: string;
  investment_status?: string;
  is_primary?: boolean;
  
  // Financial fields
  target_raise?: number;
  total_notional?: number;
  minimum_investment?: number;
  authorized_shares?: number;
  share_price?: number;
  company_valuation?: number;
  estimated_yield_percentage?: number;
  currency?: string;
  
  // Date fields
  subscription_start_date?: string;
  subscription_end_date?: string;
  transaction_start_date?: string;
  maturity_date?: string;
  duration?: ProjectDuration;
  
  // Legal fields
  legal_entity?: string;
  jurisdiction?: string;
  tax_id?: string;
  
  // Token fields
  token_symbol?: string;
  
  // Universal ESG & Sustainability fields
  sustainability_classification?: string;
  esg_risk_rating?: string;
  principal_adverse_impacts?: string;
  taxonomy_alignment_percentage?: number;
  
  // Risk & Governance fields
  risk_profile?: string;
  governance_structure?: string;
  compliance_framework?: string[];
  third_party_custodian?: boolean;
  custodian_name?: string;
  
  // Investor Protection fields
  target_investor_type?: string;
  complexity_indicator?: string;
  liquidity_terms?: string;
  fee_structure_summary?: string;
  
  // Traditional Assets - Structured Products
  capital_protection_level?: number;
  underlying_assets?: string[];
  barrier_level?: number;
  payoff_structure?: string;
  
  // Traditional Assets - Equity
  voting_rights?: string;
  dividend_policy?: string;
  dilution_protection?: string[];
  exit_strategy?: string;
  
  // Traditional Assets - Bonds
  credit_rating?: string;
  coupon_frequency?: string;
  callable_features?: boolean;
  call_date?: string;
  call_price?: number;
  security_collateral?: string;
  
  // Alternative Assets - Private Equity
  fund_vintage_year?: number;
  investment_stage?: string;
  sector_focus?: string[];
  geographic_focus?: string[];
  
  // Alternative Assets - Real Estate
  property_type?: string;
  geographic_location?: string;
  development_stage?: string;
  environmental_certifications?: string[];
  
  // Alternative Assets - Receivables
  debtor_credit_quality?: string;
  collection_period_days?: number;
  recovery_rate_percentage?: number;
  diversification_metrics?: string;
  
  // Alternative Assets - Energy/Solar & Wind
  project_capacity_mw?: number;
  power_purchase_agreements?: string;
  regulatory_approvals?: string[];
  carbon_offset_potential?: number;
  
  // Digital Assets - All Digital Assets
  blockchain_network?: string;
  smart_contract_audit_status?: string;
  consensus_mechanism?: string;
  gas_fee_structure?: string;
  oracle_dependencies?: string[];
  
  // Digital Assets - Stablecoins
  collateral_type?: string;
  reserve_management_policy?: string;
  audit_frequency?: string;
  redemption_mechanism?: string;
  depeg_risk_mitigation?: string[];
  
  // Digital Assets - Tokenized Funds
  token_economics?: string;
  custody_arrangements?: string;
  smart_contract_address?: string;
  upgrade_governance?: string;
  
  // Operational & Compliance
  data_processing_basis?: string;
  privacy_policy_link?: string;
  data_retention_policy?: string;
  business_continuity_plan?: boolean;
  cybersecurity_framework?: string[];
  disaster_recovery_procedures?: string;
  tax_reporting_obligations?: string[];
  regulatory_permissions?: string[];
  cross_border_implications?: string;
}

export interface EnhancedProject {
  id?: string;
  name: string;
  description?: string;
  project_type: string;
  status: string;
  investment_status: string;
  is_primary?: boolean;
  
  // Financial fields
  target_raise?: number;
  total_notional?: number;
  minimum_investment?: number;
  authorized_shares?: number;
  share_price?: number;
  company_valuation?: number;
  estimated_yield_percentage?: number;
  currency?: string;
  
  // Date fields
  subscription_start_date?: string;
  subscription_end_date?: string;
  transaction_start_date?: string;
  maturity_date?: string;
  duration?: ProjectDuration;
  
  // Legal fields
  legal_entity?: string;
  jurisdiction?: string;
  tax_id?: string;
  
  // Token fields
  token_symbol?: string;
  
  // Universal ESG & Sustainability fields
  sustainability_classification?: string;
  esg_risk_rating?: string;
  principal_adverse_impacts?: string;
  taxonomy_alignment_percentage?: number;
  
  // Risk & Governance fields
  risk_profile?: string;
  governance_structure?: string;
  compliance_framework?: string[];
  third_party_custodian?: boolean;
  custodian_name?: string;
  
  // Investor Protection fields
  target_investor_type?: string;
  complexity_indicator?: string;
  liquidity_terms?: string;
  fee_structure_summary?: string;
  
  // Traditional Assets - Structured Products
  capital_protection_level?: number;
  underlying_assets?: string[];
  barrier_level?: number;
  payoff_structure?: string;
  
  // Traditional Assets - Equity
  voting_rights?: string;
  dividend_policy?: string;
  dilution_protection?: string[];
  exit_strategy?: string;
  
  // Traditional Assets - Bonds
  credit_rating?: string;
  coupon_frequency?: string;
  callable_features?: boolean;
  call_date?: string;
  call_price?: number;
  security_collateral?: string;
  
  // Alternative Assets - Private Equity
  fund_vintage_year?: number;
  investment_stage?: string;
  sector_focus?: string[];
  geographic_focus?: string[];
  
  // Alternative Assets - Real Estate
  property_type?: string;
  geographic_location?: string;
  development_stage?: string;
  environmental_certifications?: string[];
  
  // Alternative Assets - Receivables
  debtor_credit_quality?: string;
  collection_period_days?: number;
  recovery_rate_percentage?: number;
  diversification_metrics?: string;
  
  // Alternative Assets - Energy/Solar & Wind
  project_capacity_mw?: number;
  power_purchase_agreements?: string;
  regulatory_approvals?: string[];
  carbon_offset_potential?: number;
  
  // Digital Assets - All Digital Assets
  blockchain_network?: string;
  smart_contract_audit_status?: string;
  consensus_mechanism?: string;
  gas_fee_structure?: string;
  oracle_dependencies?: string[];
  
  // Digital Assets - Stablecoins
  collateral_type?: string;
  reserve_management_policy?: string;
  audit_frequency?: string;
  redemption_mechanism?: string;
  depeg_risk_mitigation?: string[];
  
  // Digital Assets - Tokenized Funds
  token_economics?: string;
  custody_arrangements?: string;
  smart_contract_address?: string;
  upgrade_governance?: string;
  
  // Operational & Compliance
  data_processing_basis?: string;
  privacy_policy_link?: string;
  data_retention_policy?: string;
  business_continuity_plan?: boolean;
  cybersecurity_framework?: string[];
  disaster_recovery_procedures?: string;
  tax_reporting_obligations?: string[];
  regulatory_permissions?: string[];
  cross_border_implications?: string;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface ProjectWithStats extends EnhancedProject {
  completion_percentage?: number;
  missing_fields?: string[];
  wallet_required?: boolean;
  has_wallet?: boolean;
  investor_count?: number;
  raised_amount?: number;
}

/**
 * Enhanced Project Service Class
 */
export class EnhancedProjectService {
  
  /**
   * Get all projects with enhanced statistics
   */
  static async getAllProjects(): Promise<ProjectWithStats[]> {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Enhance projects with completion statistics
      const enhancedProjects = projects?.map(project => this.enhanceProjectWithStats(project)) || [];
      
      return enhancedProjects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }
  
  /**
   * Get a single project by ID with enhanced statistics
   */
  static async getProjectById(id: string): Promise<ProjectWithStats | null> {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (!project) return null;
      
      return this.enhanceProjectWithStats(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  }
  
  /**
   * Create a new enhanced project
   */
  static async createProject(projectData: EnhancedProjectInsert): Promise<ProjectWithStats> {
    try {
      // If setting as primary, unset other primary projects first
      if (projectData.is_primary) {
        await this.unsetOtherPrimaryProjects();
      }
      
      const { data: project, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();
      
      if (error) throw error;
      
      return this.enhanceProjectWithStats(project);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing project
   */
  static async updateProject(id: string, projectData: EnhancedProjectUpdate): Promise<ProjectWithStats> {
    try {
      // If setting as primary, unset other primary projects first
      if (projectData.is_primary) {
        await this.unsetOtherPrimaryProjects(id);
      }
      
      const { data: project, error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return this.enhanceProjectWithStats(project);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }
  
  /**
   * Delete a project
   */
  static async deleteProject(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
  
  /**
   * Get projects by category
   */
  static async getProjectsByCategory(category: 'traditional' | 'alternative' | 'digital'): Promise<ProjectWithStats[]> {
    try {
      const projects = await this.getAllProjects();
      
      return projects.filter(project => {
        const config = getProjectTypeConfig(project.project_type);
        return config?.category === category;
      });
    } catch (error) {
      console.error('Error fetching projects by category:', error);
      throw error;
    }
  }
  
  /**
   * Get projects with incomplete mandatory fields
   */
  static async getIncompleteProjects(): Promise<ProjectWithStats[]> {
    try {
      const projects = await this.getAllProjects();
      
      return projects.filter(project => (project.completion_percentage || 0) < 100);
    } catch (error) {
      console.error('Error fetching incomplete projects:', error);
      throw error;
    }
  }
  
  /**
   * Get projects requiring wallets
   */
  static async getDigitalAssetProjects(): Promise<ProjectWithStats[]> {
    try {
      const projects = await this.getAllProjects();
      
      return projects.filter(project => project.wallet_required);
    } catch (error) {
      console.error('Error fetching digital asset projects:', error);
      throw error;
    }
  }
  
  /**
   * Check if project has wallet credentials
   */
  static async checkProjectWallet(projectId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('project_credentials')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
      
      return !!data;
    } catch (error) {
      console.error('Error checking project wallet:', error);
      return false;
    }
  }
  
  /**
   * Get compliance summary for all projects
   */
  static async getComplianceSummary() {
    try {
      const projects = await this.getAllProjects();
      
      const summary = {
        total_projects: projects.length,
        by_category: {
          traditional: projects.filter(p => getProjectTypeConfig(p.project_type)?.category === 'traditional').length,
          alternative: projects.filter(p => getProjectTypeConfig(p.project_type)?.category === 'alternative').length,
          digital: projects.filter(p => getProjectTypeConfig(p.project_type)?.category === 'digital').length,
        },
        completion_status: {
          complete: projects.filter(p => (p.completion_percentage || 0) === 100).length,
          incomplete: projects.filter(p => (p.completion_percentage || 0) < 100).length,
        },
        esg_ratings: {
          low: projects.filter(p => p.esg_risk_rating === 'low').length,
          medium: projects.filter(p => p.esg_risk_rating === 'medium').length,
          high: projects.filter(p => p.esg_risk_rating === 'high').length,
          not_assessed: projects.filter(p => !p.esg_risk_rating || p.esg_risk_rating === 'not_assessed').length,
        },
        sfdr_classification: {
          article_6: projects.filter(p => p.sustainability_classification === 'article_6').length,
          article_8: projects.filter(p => p.sustainability_classification === 'article_8').length,
          article_9: projects.filter(p => p.sustainability_classification === 'article_9').length,
          not_applicable: projects.filter(p => !p.sustainability_classification || p.sustainability_classification === 'not_applicable').length,
        },
        digital_assets: {
          total: projects.filter(p => p.wallet_required).length,
          with_wallet: projects.filter(p => p.wallet_required && p.has_wallet).length,
          without_wallet: projects.filter(p => p.wallet_required && !p.has_wallet).length,
        }
      };
      
      return summary;
    } catch (error) {
      console.error('Error getting compliance summary:', error);
      throw error;
    }
  }
  
  /**
   * Private helper methods
   */
  
  /**
   * Enhance project with completion statistics
   */
  private static enhanceProjectWithStats(project: any): ProjectWithStats {
    const completion_percentage = calculateCompletionPercentage(project, project.project_type);
    const missing_fields = getMissingMandatoryFields(project, project.project_type);
    const config = getProjectTypeConfig(project.project_type);
    const wallet_required = config?.walletRequired || false;
    
    return {
      ...project,
      completion_percentage,
      missing_fields,
      wallet_required,
      has_wallet: false, // This would be set by checking project_credentials table
    };
  }
  
  /**
   * Unset other primary projects when setting a new one
   */
  private static async unsetOtherPrimaryProjects(excludeId?: string): Promise<void> {
    try {
      let query = supabase
        .from('projects')
        .update({ is_primary: false })
        .eq('is_primary', true);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { error } = await query;
      
      if (error) throw error;
    } catch (error) {
      console.error('Error unsetting other primary projects:', error);
      throw error;
    }
  }
}

export default EnhancedProjectService;