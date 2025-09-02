// Enhanced redemption service with relative date support
// Handles both fixed dates and dates relative to token issuance/distribution
// Date: August 23, 2025

import { supabase } from '@/infrastructure/database/client';
import type { 
  RedemptionRequest, 
  CreateRedemptionRequestInput,
  RedemptionRequestResponse,
  RedemptionListResponse,
  Distribution,
  EnrichedDistribution,
  EnrichedDistributionResponse,
  DistributionRedemption,
  RedemptionWindow,
  RedemptionWindowTemplate,
  CreateRedemptionWindowTemplateInput,
  SubmissionDateMode,
  ProcessingDateMode,
  NavSource
} from '../types';

export interface CreateRedemptionWindowInput {
  project_id: string;
  organization_id?: string;
  name: string;
  
  // Date Configuration Modes
  submission_date_mode: SubmissionDateMode;
  processing_date_mode: ProcessingDateMode;
  
  // Relative Date Settings
  lockup_days?: number;
  processing_offset_days?: number;
  
  // Fixed Date Settings (used when mode is 'fixed')
  submission_start_date?: string;
  submission_end_date?: string;
  start_date?: string;
  end_date?: string;
  
  // Financial Settings
  nav?: number;
  nav_source?: NavSource;
  max_redemption_amount?: number;
  min_redemption_amount?: number;
  
  // Enhanced Processing Options
  enable_pro_rata_distribution?: boolean;
  auto_process?: boolean;
  is_active?: boolean;
  is_template?: boolean;
  pro_rata_factor?: number;
  processing_fee_percentage?: number;
  early_redemption_penalty?: number;
  
  // Status Settings
  submission_status?: 'not_started' | 'open' | 'closed' | 'extended' | 'cancelled';
  processing_status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  
  // Notes
  notes?: string;
}

export class EnhancedRedemptionService {
  private readonly windowsTable = 'redemption_windows';
  private readonly configsTable = 'redemption_window_configs';
  private readonly templatesTable = 'redemption_window_templates';

  /**
   * Get or create a default redemption window configuration
   */
  private async getOrCreateDefaultConfig(projectId: string): Promise<string> {
    try {
      // First, try to find an existing config for this project
      const { data: existingConfig, error: findError } = await supabase
        .from(this.configsTable)
        .select('id')
        .eq('project_id', projectId)
        .limit(1)
        .single();

      if (!findError && existingConfig) {
        return existingConfig.id;
      }

      // If no config exists, create a default one
      const { data: newConfig, error: createError } = await supabase
        .from(this.configsTable)
        .insert({
          name: 'Default Redemption Config',
          project_id: projectId,
          fund_id: projectId, // Use project_id as fund_id for now
          frequency: 'monthly',
          submission_window_days: 14,
          lock_up_period: 90,
          max_redemption_percentage: null,
          enable_pro_rata_distribution: true,
          queue_unprocessed_requests: true,
          use_window_nav: true,
          lock_tokens_on_request: true,
          enable_admin_override: false,
          notification_days: 7,
          auto_process: false,
          active: true
        })
        .select('id')
        .single();

      if (createError) {
        throw new Error(`Failed to create default config: ${createError.message}`);
      }

      return newConfig.id;
    } catch (error) {
      console.error('Error getting/creating default config:', error);
      throw error;
    }
  }

  /**
   * Validate and fix nav_source value
   */
  private validateNavSource(navSource?: string): string {
    const validSources = ['manual', 'oracle', 'calculated'];
    if (!navSource || !validSources.includes(navSource)) {
      return 'manual'; // Default to manual
    }
    // Map any invalid values to valid ones
    if (navSource === 'automated_calculation') {
      return 'calculated';
    }
    return navSource;
  }

  /**
   * Calculate proper date ranges ensuring constraints are met
   */
  private calculateValidDateRanges(
    windowData: CreateRedemptionWindowInput
  ): {
    submissionStart: Date;
    submissionEnd: Date;
    processingStart: Date;
    processingEnd: Date;
  } {
    const now = new Date();
    
    let submissionStart: Date;
    let submissionEnd: Date;
    let processingStart: Date;
    let processingEnd: Date;

    // Calculate submission dates
    if (windowData.submission_date_mode === 'relative') {
      submissionStart = new Date(now.getTime() + (windowData.lockup_days || 0) * 24 * 60 * 60 * 1000);
      submissionEnd = new Date(submissionStart.getTime() + 7 * 24 * 60 * 60 * 1000); // 7-day window
    } else {
      submissionStart = windowData.submission_start_date ? new Date(windowData.submission_start_date) : now;
      submissionEnd = windowData.submission_end_date ? new Date(windowData.submission_end_date) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Calculate processing dates ensuring they satisfy constraints
    if (windowData.processing_date_mode === 'same_day') {
      processingStart = new Date(submissionEnd.getTime());
      // Ensure end_date > start_date constraint by adding 1 hour minimum
      processingEnd = new Date(processingStart.getTime() + 60 * 60 * 1000); // Add 1 hour
    } else if (windowData.processing_date_mode === 'offset') {
      const offsetDays = windowData.processing_offset_days || 1;
      processingStart = new Date(submissionEnd.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      processingEnd = new Date(processingStart.getTime() + 24 * 60 * 60 * 1000); // 1-day processing window
    } else {
      // Fixed dates mode
      processingStart = windowData.start_date ? new Date(windowData.start_date) : new Date(submissionEnd.getTime() + 24 * 60 * 60 * 1000);
      processingEnd = windowData.end_date ? new Date(windowData.end_date) : new Date(processingStart.getTime() + 24 * 60 * 60 * 1000);
    }

    // Validate constraints
    if (submissionEnd <= submissionStart) {
      submissionEnd = new Date(submissionStart.getTime() + 24 * 60 * 60 * 1000);
    }
    if (processingEnd <= processingStart) {
      processingEnd = new Date(processingStart.getTime() + 60 * 60 * 1000);
    }

    return {
      submissionStart,
      submissionEnd,
      processingStart,
      processingEnd
    };
  }

  /**
   * Create redemption window with relative date support
   */
  async createRedemptionWindow(windowData: CreateRedemptionWindowInput): Promise<{
    success: boolean;
    data?: RedemptionWindow;
    error?: string;
  }> {
    try {
      // Get or create default config
      const configId = await this.getOrCreateDefaultConfig(windowData.project_id);

      // Calculate valid date ranges
      const dates = this.calculateValidDateRanges(windowData);

      // Validate and fix nav_source
      const validNavSource = this.validateNavSource(windowData.nav_source);

      // Create window with enhanced data
      const windowInstanceData = {
        config_id: configId,
        project_id: windowData.project_id,
        organization_id: windowData.organization_id,
        name: windowData.name,
        
        // Date configuration
        submission_date_mode: windowData.submission_date_mode,
        processing_date_mode: windowData.processing_date_mode,
        lockup_days: windowData.lockup_days || 0,
        processing_offset_days: windowData.processing_offset_days || 1,
        
        // Calculated dates (ensuring constraints are met)
        submission_start_date: dates.submissionStart.toISOString(),
        submission_end_date: dates.submissionEnd.toISOString(),
        start_date: dates.processingStart.toISOString(),
        end_date: dates.processingEnd.toISOString(),
        
        // Financial settings
        nav: windowData.nav,
        nav_date: windowData.nav ? new Date().toISOString().split('T')[0] : null,
        nav_source: validNavSource,
        max_redemption_amount: windowData.max_redemption_amount,
        min_redemption_amount: windowData.min_redemption_amount || 0,
        
        // Enhanced Processing Options (now using dedicated columns)
        enable_pro_rata_distribution: windowData.enable_pro_rata_distribution || true,
        auto_process: windowData.auto_process || false,
        is_active: windowData.is_active !== undefined ? windowData.is_active : true,
        is_template: windowData.is_template || false,
        pro_rata_factor: windowData.pro_rata_factor || 1.0,
        processing_fee_percentage: windowData.processing_fee_percentage || 0.0,
        early_redemption_penalty: windowData.early_redemption_penalty || 0.0,
        
        // Enhanced Status Tracking
        submission_status: windowData.submission_status || 'not_started',
        processing_status: windowData.processing_status || 'pending',
        
        // Status and metrics
        status: 'upcoming',
        current_requests: 0,
        total_request_value: 0,
        approved_requests: 0,
        approved_value: 0,
        rejected_requests: 0,
        rejected_value: 0,
        queued_requests: 0,
        queued_value: 0,
        
        // Notes field can now be used for actual notes instead of JSON settings
        notes: windowData.notes || null
      };

      const { data: windowResult, error: windowError } = await supabase
        .from(this.windowsTable)
        .insert(windowInstanceData)
        .select()
        .single();

      if (windowError) {
        throw windowError;
      }

      // Map the result to our interface
      const window: RedemptionWindow = {
        id: windowResult.id,
        config_id: windowResult.config_id,
        project_id: windowResult.project_id,
        organization_id: windowResult.organization_id,
        name: windowResult.name || windowData.name || 'Untitled Window',
        submission_date_mode: windowResult.submission_date_mode,
        processing_date_mode: windowResult.processing_date_mode,
        lockup_days: windowResult.lockup_days,
        processing_offset_days: windowResult.processing_offset_days,
        submission_start_date: new Date(windowResult.submission_start_date),
        submission_end_date: new Date(windowResult.submission_end_date),
        start_date: new Date(windowResult.start_date),
        end_date: new Date(windowResult.end_date),
        nav: windowResult.nav,
        nav_date: windowResult.nav_date,
        nav_source: windowResult.nav_source,
        max_redemption_amount: windowResult.max_redemption_amount,
        min_redemption_amount: windowResult.min_redemption_amount,
        
        // Enhanced Processing Options (from dedicated columns)
        enable_pro_rata_distribution: windowResult.enable_pro_rata_distribution,
        auto_process: windowResult.auto_process,
        is_active: windowResult.is_active,
        is_template: windowResult.is_template,
        pro_rata_factor: windowResult.pro_rata_factor,
        processing_fee_percentage: windowResult.processing_fee_percentage,
        early_redemption_penalty: windowResult.early_redemption_penalty,
        
        // Enhanced Status Tracking
        submission_status: windowResult.submission_status,
        processing_status: windowResult.processing_status,
        
        status: windowResult.status,
        total_requests: windowResult.current_requests || 0,
        total_request_value: windowResult.total_request_value || 0,
        processed_requests: (windowResult.approved_requests || 0) + (windowResult.rejected_requests || 0),
        processed_value: (windowResult.approved_value || 0) + (windowResult.rejected_value || 0),
        rejected_requests: windowResult.rejected_requests || 0,
        queued_requests: windowResult.queued_requests || 0,
        
        // Audit Trail
        notes: windowResult.notes,
        created_at: new Date(windowResult.created_at),
        updated_at: new Date(windowResult.updated_at),
        created_by: windowResult.created_by,
        last_modified_by: windowResult.last_modified_by,
        last_status_change_at: windowResult.last_status_change_at ? new Date(windowResult.last_status_change_at) : undefined,
        processed_by: windowResult.processed_by,
        processed_at: windowResult.processed_at ? new Date(windowResult.processed_at) : undefined,
        approved_by: windowResult.approved_by,
        approved_at: windowResult.approved_at ? new Date(windowResult.approved_at) : undefined
      };

      return { success: true, data: window };
    } catch (error) {
      console.error('Error creating enhanced redemption window:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create redemption window' 
      };
    }
  }

  /**
   * Get a single redemption window by ID
   */
  async getRedemptionWindowById(windowId: string): Promise<{
    success: boolean;
    data?: RedemptionWindow;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from(this.windowsTable)
        .select('*')
        .eq('id', windowId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Redemption window not found'
          };
        }
        throw error;
      }

      // Map database row to RedemptionWindow object
      const window: RedemptionWindow = {
        id: data.id,
        config_id: data.config_id,
        project_id: data.project_id,
        organization_id: data.organization_id,
        name: data.name || `Window ${data.id.slice(0, 8)}`,
        submission_date_mode: data.submission_date_mode || 'fixed',
        processing_date_mode: data.processing_date_mode || 'offset',
        lockup_days: data.lockup_days || 0,
        processing_offset_days: data.processing_offset_days || 1,
        submission_start_date: new Date(data.submission_start_date),
        submission_end_date: new Date(data.submission_end_date),
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        nav: data.nav,
        nav_date: data.nav_date,
        nav_source: data.nav_source,
        max_redemption_amount: data.max_redemption_amount,
        min_redemption_amount: data.min_redemption_amount,
        
        // Enhanced Processing Options (from dedicated columns)
        enable_pro_rata_distribution: data.enable_pro_rata_distribution,
        auto_process: data.auto_process,
        is_active: data.is_active,
        is_template: data.is_template,
        pro_rata_factor: data.pro_rata_factor,
        processing_fee_percentage: data.processing_fee_percentage,
        early_redemption_penalty: data.early_redemption_penalty,
        
        // Enhanced Status Tracking
        submission_status: data.submission_status,
        processing_status: data.processing_status,
        
        status: data.status,
        total_requests: data.current_requests || 0,
        total_request_value: data.total_request_value || 0,
        processed_requests: (data.approved_requests || 0) + (data.rejected_requests || 0),
        processed_value: (data.approved_value || 0) + (data.rejected_value || 0),
        rejected_requests: data.rejected_requests || 0,
        queued_requests: data.queued_requests || 0,
        
        // Audit Trail
        notes: data.notes,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
        created_by: data.created_by,
        last_modified_by: data.last_modified_by,
        last_status_change_at: data.last_status_change_at ? new Date(data.last_status_change_at) : undefined,
        processed_by: data.processed_by,
        processed_at: data.processed_at ? new Date(data.processed_at) : undefined,
        approved_by: data.approved_by,
        approved_at: data.approved_at ? new Date(data.approved_at) : undefined
      };

      return { success: true, data: window };
    } catch (error) {
      console.error('Error fetching redemption window by ID:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load redemption window' 
      };
    }
  }

  /**
   * Get redemption windows with enhanced filtering
   */
  async getRedemptionWindows(filters?: {
    projectId?: string;
    status?: string;
    submission_date_mode?: SubmissionDateMode;
    processing_date_mode?: ProcessingDateMode;
  }): Promise<{
    success: boolean;
    data?: RedemptionWindow[];
    error?: string;
  }> {
    try {
      let query = supabase
        .from(this.windowsTable)
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.submission_date_mode) {
        query = query.eq('submission_date_mode', filters.submission_date_mode);
      }
      if (filters?.processing_date_mode) {
        query = query.eq('processing_date_mode', filters.processing_date_mode);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Map database rows to RedemptionWindow objects
      const windows: RedemptionWindow[] = (data || []).map(row => ({
        id: row.id,
        config_id: row.config_id,
        project_id: row.project_id,
        organization_id: row.organization_id,
        name: row.name || `Window ${row.id.slice(0, 8)}`,
        submission_date_mode: row.submission_date_mode || 'fixed',
        processing_date_mode: row.processing_date_mode || 'offset',
        lockup_days: row.lockup_days || 0,
        processing_offset_days: row.processing_offset_days || 1,
        submission_start_date: new Date(row.submission_start_date),
        submission_end_date: new Date(row.submission_end_date),
        start_date: new Date(row.start_date),
        end_date: new Date(row.end_date),
        nav: row.nav,
        nav_date: row.nav_date,
        nav_source: row.nav_source,
        max_redemption_amount: row.max_redemption_amount,
        min_redemption_amount: row.min_redemption_amount,
        
        // Enhanced Processing Options (from dedicated columns)
        enable_pro_rata_distribution: row.enable_pro_rata_distribution,
        auto_process: row.auto_process,
        is_active: row.is_active,
        is_template: row.is_template,
        pro_rata_factor: row.pro_rata_factor,
        processing_fee_percentage: row.processing_fee_percentage,
        early_redemption_penalty: row.early_redemption_penalty,
        
        // Enhanced Status Tracking
        submission_status: row.submission_status,
        processing_status: row.processing_status,
        
        status: row.status,
        total_requests: row.current_requests || 0,
        total_request_value: row.total_request_value || 0,
        processed_requests: (row.approved_requests || 0) + (row.rejected_requests || 0),
        processed_value: (row.approved_value || 0) + (row.rejected_value || 0),
        rejected_requests: row.rejected_requests || 0,
        queued_requests: row.queued_requests || 0,
        
        // Audit Trail
        notes: row.notes,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        created_by: row.created_by,
        last_modified_by: row.last_modified_by,
        last_status_change_at: row.last_status_change_at ? new Date(row.last_status_change_at) : undefined,
        processed_by: row.processed_by,
        processed_at: row.processed_at ? new Date(row.processed_at) : undefined,
        approved_by: row.approved_by,
        approved_at: row.approved_at ? new Date(row.approved_at) : undefined
      }));

      return { success: true, data: windows };
    } catch (error) {
      console.error('Error fetching redemption windows:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load redemption windows' 
      };
    }
  }

  /**
   * Calculate redemption window dates based on distribution dates
   * This is used for relative date mode windows
   */
  async calculateWindowDatesForDistribution(
    distributionId: string,
    lockupDays: number = 0,
    processingOffsetDays: number = 1
  ): Promise<{
    submissionStartDate: Date;
    submissionEndDate: Date;
    processingStartDate: Date;
    processingEndDate: Date;
  }> {
    // Get distribution date from the distributions table
    const { data: distribution, error } = await supabase
      .from('distributions')
      .select('distribution_date')
      .eq('id', distributionId)
      .single();

    if (error || !distribution) {
      throw new Error('Distribution not found');
    }

    const distributionDate = new Date(distribution.distribution_date);
    
    // Calculate dates
    const submissionStartDate = new Date(distributionDate.getTime() + lockupDays * 24 * 60 * 60 * 1000);
    const submissionEndDate = new Date(submissionStartDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7-day submission window
    const processingStartDate = new Date(submissionEndDate.getTime() + processingOffsetDays * 24 * 60 * 60 * 1000);
    const processingEndDate = new Date(processingStartDate.getTime() + 24 * 60 * 60 * 1000); // 1-day processing window

    return {
      submissionStartDate,
      submissionEndDate,
      processingStartDate,
      processingEndDate
    };
  }

  /**
   * Get all distributions for a project to support multiple redemption windows
   */
  async getProjectDistributions(projectId: string): Promise<{
    success: boolean;
    data?: Distribution[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('distributions')
        .select('*')
        .eq('project_id', projectId)
        .order('distribution_date', { ascending: false });

      if (error) {
        throw error;
      }

      const distributions: Distribution[] = (data || []).map(row => ({
        id: row.id,
        tokenAllocationId: row.token_allocation_id,
        investorId: row.investor_id,
        subscriptionId: row.subscription_id,
        projectId: row.project_id,
        tokenType: row.token_type,
        tokenAmount: parseFloat(row.token_amount),
        distributionDate: new Date(row.distribution_date),
        distributionTxHash: row.distribution_tx_hash,
        walletId: row.wallet_id,
        blockchain: row.blockchain,
        tokenAddress: row.token_address,
        tokenSymbol: row.token_symbol,
        toAddress: row.to_address,
        status: row.status,
        notes: row.notes,
        remainingAmount: parseFloat(row.remaining_amount || '0'),
        fullyRedeemed: row.fully_redeemed || false,
        standard: row.standard,
        createdAt: new Date(row.created_at),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
      }));

      return { success: true, data: distributions };
    } catch (error) {
      console.error('Error fetching project distributions:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load project distributions' 
      };
    }
  }

  // =============================
  // REDEMPTION WINDOW TEMPLATES CRUD
  // =============================

  /**
   * Create a new redemption window template
   */
  async createRedemptionWindowTemplate(templateData: CreateRedemptionWindowTemplateInput): Promise<{
    success: boolean;
    data?: RedemptionWindowTemplate;
    error?: string;
  }> {
    try {
      const templateInstanceData = {
        name: templateData.name,
        description: templateData.description,
        submission_date_mode: templateData.submission_date_mode,
        processing_date_mode: templateData.processing_date_mode,
        lockup_days: templateData.lockup_days || 0,
        processing_offset_days: templateData.processing_offset_days || 1,
        default_nav_source: this.validateNavSource(templateData.default_nav_source),
        default_enable_pro_rata_distribution: templateData.default_enable_pro_rata_distribution || true,
        default_auto_process: templateData.default_auto_process || false,
        is_active: true,
        project_id: templateData.project_id,
        organization_id: templateData.organization_id
      };

      const { data: templateResult, error: templateError } = await supabase
        .from(this.templatesTable)
        .insert(templateInstanceData)
        .select()
        .single();

      if (templateError) {
        throw templateError;
      }

      const template: RedemptionWindowTemplate = {
        id: templateResult.id,
        name: templateResult.name,
        description: templateResult.description,
        submission_date_mode: templateResult.submission_date_mode,
        processing_date_mode: templateResult.processing_date_mode,
        lockup_days: templateResult.lockup_days,
        processing_offset_days: templateResult.processing_offset_days,
        default_nav_source: templateResult.default_nav_source,
        default_enable_pro_rata_distribution: templateResult.default_enable_pro_rata_distribution,
        default_auto_process: templateResult.default_auto_process,
        is_active: templateResult.is_active,
        created_by: templateResult.created_by,
        project_id: templateResult.project_id,
        organization_id: templateResult.organization_id,
        created_at: new Date(templateResult.created_at),
        updated_at: new Date(templateResult.updated_at)
      };

      return { success: true, data: template };
    } catch (error) {
      console.error('Error creating redemption window template:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create template' 
      };
    }
  }

  /**
   * Get redemption window templates
   */
  async getRedemptionWindowTemplates(filters?: {
    projectId?: string;
    organizationId?: string;
    isActive?: boolean;
  }): Promise<{
    success: boolean;
    data?: RedemptionWindowTemplate[];
    error?: string;
  }> {
    try {
      let query = supabase
        .from(this.templatesTable)
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters?.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const templates: RedemptionWindowTemplate[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        submission_date_mode: row.submission_date_mode,
        processing_date_mode: row.processing_date_mode,
        lockup_days: row.lockup_days,
        processing_offset_days: row.processing_offset_days,
        default_nav_source: row.default_nav_source,
        default_enable_pro_rata_distribution: row.default_enable_pro_rata_distribution,
        default_auto_process: row.default_auto_process,
        is_active: row.is_active,
        created_by: row.created_by,
        project_id: row.project_id,
        organization_id: row.organization_id,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      }));

      return { success: true, data: templates };
    } catch (error) {
      console.error('Error fetching redemption window templates:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load templates' 
      };
    }
  }

  /**
   * Create redemption window from template
   */
  async createRedemptionWindowFromTemplate(
    templateId: string, 
    windowData: {
      project_id: string;
      name: string;
      nav?: number;
      max_redemption_amount?: number;
    }
  ): Promise<{
    success: boolean;
    data?: RedemptionWindow;
    error?: string;
  }> {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from(this.templatesTable)
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError || !template) {
        return { success: false, error: 'Template not found' };
      }

      // Create window using template settings
      const windowInputData: CreateRedemptionWindowInput = {
        project_id: windowData.project_id,
        name: windowData.name,
        submission_date_mode: template.submission_date_mode,
        processing_date_mode: template.processing_date_mode,
        lockup_days: template.lockup_days,
        processing_offset_days: template.processing_offset_days,
        nav_source: template.default_nav_source,
        enable_pro_rata_distribution: template.default_enable_pro_rata_distribution,
        auto_process: template.default_auto_process,
        nav: windowData.nav,
        max_redemption_amount: windowData.max_redemption_amount
      };

      return await this.createRedemptionWindow(windowInputData);
    } catch (error) {
      console.error('Error creating window from template:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create window from template' 
      };
    }
  }

  /**
   * Update redemption window
   */
  async updateRedemptionWindow(windowId: string, windowData: Partial<CreateRedemptionWindowInput>): Promise<{
    success: boolean;
    data?: RedemptionWindow;
    error?: string;
  }> {
    try {
      // Calculate valid date ranges if needed
      let dates;
      if (windowData.submission_date_mode || windowData.processing_date_mode || 
          windowData.lockup_days !== undefined || windowData.processing_offset_days !== undefined) {
        // Get existing window data first to merge with updates
        const existingWindow = await this.getRedemptionWindowById(windowId);
        if (!existingWindow.success || !existingWindow.data) {
          return { success: false, error: 'Redemption window not found' };
        }

        const mergedData = {
          project_id: existingWindow.data.project_id,
          name: windowData.name || existingWindow.data.name,
          submission_date_mode: windowData.submission_date_mode || existingWindow.data.submission_date_mode,
          processing_date_mode: windowData.processing_date_mode || existingWindow.data.processing_date_mode,
          lockup_days: windowData.lockup_days !== undefined ? windowData.lockup_days : existingWindow.data.lockup_days,
          processing_offset_days: windowData.processing_offset_days !== undefined ? windowData.processing_offset_days : existingWindow.data.processing_offset_days,
          submission_start_date: windowData.submission_start_date || existingWindow.data.submission_start_date.toISOString(),
          submission_end_date: windowData.submission_end_date || existingWindow.data.submission_end_date.toISOString(),
          start_date: windowData.start_date || existingWindow.data.start_date.toISOString(),
          end_date: windowData.end_date || existingWindow.data.end_date.toISOString(),
          nav_source: windowData.nav_source || existingWindow.data.nav_source
        };

        dates = this.calculateValidDateRanges(mergedData);
      }

      // Validate and fix nav_source if provided
      const validNavSource = windowData.nav_source ? this.validateNavSource(windowData.nav_source) : undefined;

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString(),
        last_status_change_at: new Date().toISOString()
      };

      // Only include fields that are being updated
      if (windowData.name !== undefined) updateData.name = windowData.name;
      if (windowData.submission_date_mode !== undefined) updateData.submission_date_mode = windowData.submission_date_mode;
      if (windowData.processing_date_mode !== undefined) updateData.processing_date_mode = windowData.processing_date_mode;
      if (windowData.lockup_days !== undefined) updateData.lockup_days = windowData.lockup_days;
      if (windowData.processing_offset_days !== undefined) updateData.processing_offset_days = windowData.processing_offset_days;
      if (windowData.nav !== undefined) updateData.nav = windowData.nav;
      if (validNavSource) updateData.nav_source = validNavSource;
      if (windowData.max_redemption_amount !== undefined) updateData.max_redemption_amount = windowData.max_redemption_amount;
      if (windowData.min_redemption_amount !== undefined) updateData.min_redemption_amount = windowData.min_redemption_amount;
      
      // Enhanced Processing Options (using dedicated columns)
      if (windowData.enable_pro_rata_distribution !== undefined) updateData.enable_pro_rata_distribution = windowData.enable_pro_rata_distribution;
      if (windowData.auto_process !== undefined) updateData.auto_process = windowData.auto_process;
      if (windowData.is_active !== undefined) updateData.is_active = windowData.is_active;
      if (windowData.is_template !== undefined) updateData.is_template = windowData.is_template;
      if (windowData.pro_rata_factor !== undefined) updateData.pro_rata_factor = windowData.pro_rata_factor;
      if (windowData.processing_fee_percentage !== undefined) updateData.processing_fee_percentage = windowData.processing_fee_percentage;
      if (windowData.early_redemption_penalty !== undefined) updateData.early_redemption_penalty = windowData.early_redemption_penalty;
      
      // Enhanced Status Tracking
      if (windowData.submission_status !== undefined) updateData.submission_status = windowData.submission_status;
      if (windowData.processing_status !== undefined) updateData.processing_status = windowData.processing_status;

      // Update calculated dates if they were recalculated
      if (dates) {
        updateData.submission_start_date = dates.submissionStart.toISOString();
        updateData.submission_end_date = dates.submissionEnd.toISOString();
        updateData.start_date = dates.processingStart.toISOString();
        updateData.end_date = dates.processingEnd.toISOString();
      } else {
        // Use provided dates if not recalculated
        if (windowData.submission_start_date) updateData.submission_start_date = windowData.submission_start_date;
        if (windowData.submission_end_date) updateData.submission_end_date = windowData.submission_end_date;
        if (windowData.start_date) updateData.start_date = windowData.start_date;
        if (windowData.end_date) updateData.end_date = windowData.end_date;
      }

      // Update NAV date if NAV is being updated
      if (windowData.nav !== undefined) {
        updateData.nav_date = new Date().toISOString().split('T')[0];
      }

      const { data: windowResult, error: windowError } = await supabase
        .from(this.windowsTable)
        .update(updateData)
        .eq('id', windowId)
        .select()
        .single();

      if (windowError) {
        throw windowError;
      }

      // Map the result to our interface
      const window: RedemptionWindow = {
        id: windowResult.id,
        config_id: windowResult.config_id,
        project_id: windowResult.project_id,
        organization_id: windowResult.organization_id,
        name: windowResult.name || 'Untitled Window',
        submission_date_mode: windowResult.submission_date_mode,
        processing_date_mode: windowResult.processing_date_mode,
        lockup_days: windowResult.lockup_days,
        processing_offset_days: windowResult.processing_offset_days,
        submission_start_date: new Date(windowResult.submission_start_date),
        submission_end_date: new Date(windowResult.submission_end_date),
        start_date: new Date(windowResult.start_date),
        end_date: new Date(windowResult.end_date),
        nav: windowResult.nav,
        nav_date: windowResult.nav_date,
        nav_source: windowResult.nav_source,
        max_redemption_amount: windowResult.max_redemption_amount,
        min_redemption_amount: windowResult.min_redemption_amount,
        
        // Enhanced Processing Options (from dedicated columns)
        enable_pro_rata_distribution: windowResult.enable_pro_rata_distribution,
        auto_process: windowResult.auto_process,
        is_active: windowResult.is_active,
        is_template: windowResult.is_template,
        pro_rata_factor: windowResult.pro_rata_factor,
        processing_fee_percentage: windowResult.processing_fee_percentage,
        early_redemption_penalty: windowResult.early_redemption_penalty,
        
        // Enhanced Status Tracking
        submission_status: windowResult.submission_status,
        processing_status: windowResult.processing_status,
        
        status: windowResult.status,
        total_requests: windowResult.current_requests || 0,
        total_request_value: windowResult.total_request_value || 0,
        processed_requests: (windowResult.approved_requests || 0) + (windowResult.rejected_requests || 0),
        processed_value: (windowResult.approved_value || 0) + (windowResult.rejected_value || 0),
        rejected_requests: windowResult.rejected_requests || 0,
        queued_requests: windowResult.queued_requests || 0,
        
        // Audit Trail
        notes: windowResult.notes,
        created_at: new Date(windowResult.created_at),
        updated_at: new Date(windowResult.updated_at),
        created_by: windowResult.created_by,
        last_modified_by: windowResult.last_modified_by,
        last_status_change_at: windowResult.last_status_change_at ? new Date(windowResult.last_status_change_at) : undefined,
        processed_by: windowResult.processed_by,
        processed_at: windowResult.processed_at ? new Date(windowResult.processed_at) : undefined,
        approved_by: windowResult.approved_by,
        approved_at: windowResult.approved_at ? new Date(windowResult.approved_at) : undefined
      };

      return { success: true, data: window };
    } catch (error) {
      console.error('Error updating redemption window:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update redemption window' 
      };
    }
  }
}

// Export singleton instance
export const enhancedRedemptionService = new EnhancedRedemptionService();
