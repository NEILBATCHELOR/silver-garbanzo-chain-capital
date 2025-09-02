// Core redemption service for managing redemption requests
// Handles CRUD operations and basic redemption lifecycle
// Uses Supabase for direct database access

import { supabase } from '@/infrastructure/supabaseClient';
import type { 
  RedemptionRequest, 
  CreateRedemptionRequestInput,
  RedemptionRequestResponse,
  RedemptionListResponse,
  Distribution,
  EnrichedDistribution,
  EnrichedDistributionResponse,
  DistributionRedemption
} from '../types';

// Add types for Redemption Windows
interface RedemptionWindowConfig {
  id: string;
  name: string;
  fund_id: string;
  frequency: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  submission_window_days: number;
  lock_up_period: number;
  max_redemption_percentage?: number;
  enable_pro_rata_distribution: boolean;
  queue_unprocessed_requests: boolean;
  use_window_nav: boolean;
  lock_tokens_on_request: boolean;
  enable_admin_override: boolean;
  notification_days: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface RedemptionWindow {
  id: string;
  config_id: string;
  start_date: Date;
  end_date: Date;
  submission_start_date: Date;
  submission_end_date: Date;
  nav?: number;
  nav_date?: string;
  nav_source?: string;
  status: 'upcoming' | 'submission_open' | 'submission_closed' | 'processing' | 'completed' | 'cancelled';
  total_requests: number;
  total_request_value: number;
  processed_requests: number;
  processed_value: number;
  rejected_requests: number;
  queued_requests: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export class RedemptionService {
  private readonly tableName = 'redemption_requests';
  private readonly windowConfigsTable = 'redemption_window_configs';
  private readonly windowsTable = 'redemption_windows';

  /**
   * Map database row (snake_case) to RedemptionRequest (camelCase)
   */
  private mapDbToRedemptionRequest(row: any): RedemptionRequest {
    return {
      id: row.id,
      tokenAmount: typeof row.token_amount === 'number' ? row.token_amount : parseFloat(String(row.token_amount || '0')),
      tokenType: row.token_type,
      tokenSymbol: row.token_symbol || undefined, // Include token symbol if available
      redemptionType: row.redemption_type,
      status: row.status,
      sourceWallet: row.source_wallet_address,
      destinationWallet: row.destination_wallet_address,
      sourceWalletAddress: row.source_wallet_address, // Backward compatibility
      destinationWalletAddress: row.destination_wallet_address, // Backward compatibility
      conversionRate: typeof row.conversion_rate === 'number' ? row.conversion_rate : parseFloat(String(row.conversion_rate || '1')),
      usdcAmount: (typeof row.token_amount === 'number' ? row.token_amount : parseFloat(String(row.token_amount || '0'))) * (typeof row.conversion_rate === 'number' ? row.conversion_rate : parseFloat(String(row.conversion_rate || '1'))), // Calculated field
      investorName: row.investor_name,
      investorId: row.investor_id,
      requiredApprovals: row.required_approvals || 2,
      isBulkRedemption: row.is_bulk_redemption || false,
      investorCount: row.investor_count || 1,
      rejectionReason: row.rejection_reason,
      rejectedBy: row.rejected_by,
      rejectionTimestamp: row.rejection_timestamp ? new Date(row.rejection_timestamp) : undefined,
      notes: '', // Not in current schema
      submittedAt: new Date(row.created_at),
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      settledAt: row.status === 'settled' && row.updated_at ? new Date(row.updated_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Map database row to RedemptionWindowConfig
   */
  private mapDbToWindowConfig(row: any): RedemptionWindowConfig {
    return {
      id: row.id,
      name: row.name,
      fund_id: row.fund_id,
      frequency: row.frequency,
      submission_window_days: row.submission_window_days,
      lock_up_period: row.lock_up_period,
      max_redemption_percentage: row.max_redemption_percentage,
      enable_pro_rata_distribution: row.enable_pro_rata_distribution,
      queue_unprocessed_requests: row.queue_unprocessed_requests,
      use_window_nav: row.use_window_nav,
      lock_tokens_on_request: row.lock_tokens_on_request,
      enable_admin_override: row.enable_admin_override,
      notification_days: row.notification_days,
      active: row.active,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Map database row to RedemptionWindow
   */
  private mapDbToWindow(row: any): RedemptionWindow {
    return {
      id: row.id,
      config_id: row.config_id,
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      submission_start_date: new Date(row.submission_start_date),
      submission_end_date: new Date(row.submission_end_date),
      nav: row.nav,
      nav_date: row.nav_date,
      nav_source: row.nav_source,
      status: row.status,
      total_requests: row.total_requests || 0,
      total_request_value: row.total_request_value || 0,
      // Calculate processed values from database columns
      processed_requests: (row.approved_requests || 0) + (row.rejected_requests || 0),
      processed_value: (row.approved_value || 0) + (row.rejected_value || 0),
      rejected_requests: row.rejected_requests || 0,
      queued_requests: row.queued_requests || 0,
      notes: row.notes,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Get redemption windows with filtering
   */
  async getRedemptionWindows(filters?: {
    organizationId?: string;
    projectId?: string;
    productId?: string;
    productType?: string;
  }): Promise<{
    success: boolean;
    data?: RedemptionWindow[];
    error?: string;
  }> {
    try {
      // Build query for redemption windows
      let query = supabase
        .from(this.windowsTable)
        .select(`
          *,
          ${this.windowConfigsTable} (
            name,
            frequency,
            fund_id
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters if provided
      // Note: Actual filtering would depend on how projects/products are linked to windows
      // For now, we'll just return all windows as the database structure may need updates

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const windows = (data || []).map(row => this.mapDbToWindow(row));
      return { success: true, data: windows };
    } catch (error) {
      console.error('Error fetching redemption windows:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Create redemption window
   */
  async createRedemptionWindow(windowData: {
    project_id: string;
    name: string;
    submission_start_date: string;
    submission_end_date: string;
    start_date: string;
    end_date: string;
    nav?: number;
    max_redemption_amount?: number;
    enable_pro_rata_distribution: boolean;
    auto_process: boolean;
  }): Promise<{
    success: boolean;
    data?: RedemptionWindow;
    error?: string;
  }> {
    try {
      // First, we need to create or find a window configuration
      // For now, we'll create a default configuration
      const configData = {
        name: `${windowData.name} Config`,
        fund_id: windowData.project_id, // Using project_id as fund_id
        frequency: 'quarterly' as const,
        submission_window_days: Math.ceil((new Date(windowData.submission_end_date).getTime() - new Date(windowData.submission_start_date).getTime()) / (1000 * 60 * 60 * 24)),
        lock_up_period: 90,
        max_redemption_percentage: windowData.max_redemption_amount ? 25 : null,
        enable_pro_rata_distribution: windowData.enable_pro_rata_distribution,
        queue_unprocessed_requests: true,
        use_window_nav: true,
        lock_tokens_on_request: true,
        enable_admin_override: false,
        notification_days: 7,
        active: true
      };

      // Create or update window config
      const { data: configResult, error: configError } = await supabase
        .from(this.windowConfigsTable)
        .upsert(configData, { 
          onConflict: 'fund_id,name',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (configError) {
        throw configError;
      }

      // Now create the window instance
      const windowInstanceData = {
        config_id: configResult.id,
        start_date: windowData.start_date,
        end_date: windowData.end_date,
        submission_start_date: windowData.submission_start_date,
        submission_end_date: windowData.submission_end_date,
        nav: windowData.nav,
        nav_date: windowData.nav ? new Date().toISOString().split('T')[0] : null,
        status: 'upcoming',
        current_requests: 0,
        total_request_value: 0,
        approved_requests: 0,
        approved_value: 0,
        rejected_requests: 0,
        rejected_value: 0,
        queued_requests: 0,
        queued_value: 0,
        // Note: processed_requests and processed_value are calculated dynamically
      };

      const { data: windowResult, error: windowError } = await supabase
        .from(this.windowsTable)
        .insert(windowInstanceData)
        .select()
        .single();

      if (windowError) {
        throw windowError;
      }

      const window = this.mapDbToWindow(windowResult);
      return { success: true, data: window };
    } catch (error) {
      console.error('Error creating redemption window:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Update redemption window
   */
  async updateRedemptionWindow(id: string, updates: Partial<RedemptionWindow>): Promise<{
    success: boolean;
    data?: RedemptionWindow;
    error?: string;
  }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Map camelCase updates to snake_case database columns
      if (updates.nav !== undefined) updateData.nav = updates.nav;
      if (updates.nav_date !== undefined) updateData.nav_date = updates.nav_date;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { data, error } = await supabase
        .from(this.windowsTable)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const window = this.mapDbToWindow(data);
      return { success: true, data: window };
    } catch (error) {
      console.error('Error updating redemption window:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Cancel redemption window
   */
  async cancelRedemptionWindow(id: string): Promise<{
    success: boolean;
    data?: RedemptionWindow;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from(this.windowsTable)
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const window = this.mapDbToWindow(data);
      return { success: true, data: window };
    } catch (error) {
      console.error('Error cancelling redemption window:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Process redemption window
   */
  async processRedemptionWindow(id: string): Promise<{
    success: boolean;
    data?: RedemptionWindow;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from(this.windowsTable)
        .update({
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const window = this.mapDbToWindow(data);
      return { success: true, data: window };
    } catch (error) {
      console.error('Error processing redemption window:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Create a new redemption request
   */
  async createRedemptionRequest(input: CreateRedemptionRequestInput): Promise<RedemptionRequestResponse> {
    try {
      // Auto-populate investor details if distributionId is provided
      let investorName = input.investorName;
      let investorId = input.investorId;
      
      // ALWAYS fetch investor_id from distribution if distributionId is provided
      // This is critical to ensure we use the correct investor_id instead of placeholder values
      if (input.distributionId) {
        console.log('🔍 Fetching investor details from distribution:', input.distributionId);
        
        // Fetch distribution to get the actual investor_id
        const { data: distribution, error: distError } = await supabase
          .from('distributions')
          .select('investor_id')
          .eq('id', input.distributionId)
          .single();
          
        console.log('📊 Distribution query result:', { distribution, error: distError });
          
        if (distribution && !distError) {
          // CRITICAL FIX: Always use the investor_id from the distribution
          investorId = distribution.investor_id;
          console.log('✅ Updated investor_id from distribution:', investorId);
          
          // Fetch investor name using the investor_id from distribution
          const { data: investor, error: invError } = await supabase
            .from('investors')
            .select('name')
            .eq('investor_id', distribution.investor_id)
            .single();
            
          console.log('👤 Investor query result:', { investor, error: invError });
            
          if (investor && !invError) {
            investorName = investor.name;
            console.log('✅ Updated investor_name from investor:', investorName);
          }
        } else {
          console.error('❌ Failed to fetch distribution:', distError);
          // Don't proceed if we can't fetch the distribution when distributionId is provided
          return {
            success: false,
            error: `Failed to fetch distribution details: ${distError?.message || 'Unknown error'}`
          };
        }
      }
      
      // Final validation: Ensure we don't create requests with placeholder values
      if (investorId === 'current-user' || investorId === 'current-investor') {
        console.error('❌ Still using placeholder investor_id:', investorId);
        return {
          success: false,
          error: 'Could not determine actual investor ID. Please ensure distribution is properly linked.'
        };
      }
      
      console.log('📝 Final investor details:', { investorId, investorName });

      // Map camelCase input to snake_case database columns
      const dbInput = {
        token_amount: input.tokenAmount,
        token_type: input.tokenType,
        redemption_type: input.redemptionType,
        status: 'pending',
        source_wallet_address: input.sourceWallet || input.sourceWalletAddress,
        destination_wallet_address: input.destinationWallet || input.destinationWalletAddress,
        conversion_rate: input.conversionRate,
        investor_name: investorName, // Now properly populated
        investor_id: investorId, // Now properly populated
        required_approvals: 2, // Default to 2-of-3 approval
        is_bulk_redemption: false,
        investor_count: 1
      };

      const { data, error } = await supabase
        .from(this.tableName)
        .insert(dbInput)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update distribution redemption_status to "processing" if distributionId is provided
      if (input.distributionId) {
        const { error: updateError } = await supabase
          .from('distributions')
          .update({
            redemption_status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', input.distributionId);

        if (updateError) {
          console.warn('Failed to update distribution redemption_status:', updateError);
          // Don't fail the entire request, just log the warning
        }
      }

      // Convert snake_case response to camelCase
      const redemptionRequest = this.mapDbToRedemptionRequest(data);
      return { success: true, data: redemptionRequest };
    } catch (error) {
      console.error('Error creating redemption request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get redemption request by ID
   */
  async getRedemptionRequest(id: string): Promise<RedemptionRequestResponse> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Redemption request not found'
          };
        }
        throw error;
      }

      // Get token symbol from related distribution
      let tokenSymbol: string | undefined;
      const { data: distributionRedemption, error: distError } = await supabase
        .from('distribution_redemptions')
        .select(`
          distributions (
            token_symbol
          )
        `)
        .eq('redemption_request_id', id)
        .single();

      if (!distError && distributionRedemption && distributionRedemption.distributions) {
        tokenSymbol = (distributionRedemption.distributions as any).token_symbol;
      }

      const redemptionRequest = {
        ...this.mapDbToRedemptionRequest(data),
        tokenSymbol: tokenSymbol || undefined
      };
      
      return { success: true, data: redemptionRequest };
    } catch (error) {
      console.error('Error fetching redemption request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * List redemption requests with pagination and filtering
   */
  async listRedemptionRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    investorId?: string;
    tokenType?: string;
    redemptionType?: 'standard' | 'interval';
  }): Promise<RedemptionListResponse> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 20;
      const offset = (page - 1) * limit;

      // First, get redemption requests with basic data
      let query = supabase
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (params?.status) {
        query = query.eq('status', params.status);
      }
      if (params?.investorId) {
        query = query.eq('investor_id', params.investorId);
      }
      if (params?.tokenType) {
        query = query.eq('token_type', params.tokenType);
      }
      if (params?.redemptionType) {
        query = query.eq('redemption_type', params.redemptionType);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // Get redemption request IDs for token symbol lookup
      const redemptionIds = (data || []).map(row => row.id);
      
      // Fetch token symbols from related distributions
      let tokenSymbolMap = new Map<string, string>();
      if (redemptionIds.length > 0) {
        const { data: distributionRedemptions, error: distError } = await supabase
          .from('distribution_redemptions')
          .select(`
            redemption_request_id,
            distribution_id,
            distributions (
              token_symbol
            )
          `)
          .in('redemption_request_id', redemptionIds);

        if (!distError && distributionRedemptions) {
          distributionRedemptions.forEach(dr => {
            if (dr.distributions && (dr.distributions as any).token_symbol) {
              tokenSymbolMap.set(dr.redemption_request_id, (dr.distributions as any).token_symbol);
            }
          });
        }
      }

      // Map database results to RedemptionRequest objects with token symbols
      const redemptionRequests = (data || []).map(row => {
        const mapped = this.mapDbToRedemptionRequest(row);
        // Add token symbol from lookup
        const tokenSymbol = tokenSymbolMap.get(row.id);
        return {
          ...mapped,
          tokenSymbol: tokenSymbol || mapped.tokenSymbol
        };
      });
      
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return { 
        success: true, 
        data: redemptionRequests,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages
        },
        totalCount,
        hasMore: page < totalPages
      };
    } catch (error) {
      console.error('Error listing redemption requests:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Update redemption request status
   */
  async updateRedemptionStatus(id: string, status: string, reason?: string): Promise<RedemptionRequestResponse> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // Add rejection data if status is rejected
      if (status === 'rejected' && reason) {
        updateData.rejection_reason = reason;
        updateData.rejection_timestamp = new Date().toISOString();
      }

      // Add approved timestamp
      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }
      // Note: settled timestamp is tracked via updated_at when status changes to 'settled'

      const { data, error } = await supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const redemptionRequest = this.mapDbToRedemptionRequest(data);
      return { success: true, data: redemptionRequest };
    } catch (error) {
      console.error('Error updating redemption status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Cancel redemption request
   */
  async cancelRedemptionRequest(id: string, reason?: string): Promise<RedemptionRequestResponse> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update({
          status: 'cancelled',
          rejection_reason: reason || 'Cancelled by user',
          rejection_timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const redemptionRequest = this.mapDbToRedemptionRequest(data);
      return { success: true, data: redemptionRequest };
    } catch (error) {
      console.error('Error cancelling redemption request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get available distributions for redemption by investor
   */
  async getAvailableDistributions(investorId: string): Promise<{
    success: boolean;
    data?: Distribution[];
    error?: string;
  }> {
    try {
      // Check if this investor has active redemption requests
      const { data: activeRedemptions, error: redemptionsError } = await supabase
        .from('redemption_requests')
        .select('investor_id')
        .eq('investor_id', investorId)
        .in('status', ['pending', 'approved', 'processing']);

      if (redemptionsError) {
        console.warn('Could not check active redemption requests:', redemptionsError);
      }

      // If investor has active requests, return empty array
      if (activeRedemptions && activeRedemptions.length > 0) {
        console.log(`Investor ${investorId} has active redemption requests, excluding all distributions`);
        return { success: true, data: [] };
      }

      const { data: distributions, error } = await supabase
        .from('distributions')
        .select('*')
        .eq('investor_id', investorId)
        .eq('fully_redeemed', false)
        .gt('remaining_amount', 0)
        .is('redemption_status', null);

      if (error) {
        throw error;
      }

      // Map database rows to Distribution type
      const distributionList: Distribution[] = (distributions || []).map(row => ({
        id: row.id,
        tokenAllocationId: row.token_allocation_id,
        investorId: row.investor_id,
        subscriptionId: row.subscription_id,
        projectId: row.project_id,
        tokenType: row.token_type,
        tokenAmount: typeof row.token_amount === 'number' ? row.token_amount : parseFloat(String(row.token_amount || '0')),
        distributionDate: new Date(row.distribution_date),
        distributionTxHash: row.distribution_tx_hash,
        walletId: row.wallet_id,
        blockchain: row.blockchain,
        tokenAddress: row.token_address,
        tokenSymbol: row.token_symbol,
        toAddress: row.to_address,
        status: row.status,
        notes: row.notes,
        remainingAmount: typeof row.remaining_amount === 'number' ? row.remaining_amount : parseFloat(String(row.remaining_amount || '0')),
        fullyRedeemed: row.fully_redeemed,
        standard: row.standard,
        createdAt: new Date(row.created_at),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
      }));

      return { success: true, data: distributionList };
    } catch (error) {
      console.error('Error fetching available distributions:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get ALL distributions globally (not filtered by investor)
   */
  async getAllDistributions(): Promise<{
    success: boolean;
    data?: Distribution[];
    error?: string;
  }> {
    try {
      // Get investors who have active redemption requests
      const { data: activeRedemptions, error: redemptionsError } = await supabase
        .from('redemption_requests')
        .select('investor_id')
        .in('status', ['pending', 'approved', 'processing']);

      if (redemptionsError) {
        console.warn('Could not fetch active redemption requests:', redemptionsError);
      }

      const investorsWithActiveRequests = activeRedemptions ? 
        [...new Set(activeRedemptions.map(r => r.investor_id))] : [];

      let distributionsQuery = supabase
        .from('distributions')
        .select('*')
        .eq('fully_redeemed', false)
        .gt('remaining_amount', 0)
        .is('redemption_status', null)
        .order('distribution_date', { ascending: false });

      const { data: allDistributions, error } = await distributionsQuery;

      if (error) {
        throw error;
      }

      // Filter out distributions from investors with active requests (client-side filtering)
      const distributions = (allDistributions || []).filter(dist => 
        !investorsWithActiveRequests.includes(dist.investor_id)
      );

      // Map database rows to Distribution type
      const distributionList: Distribution[] = (distributions || []).map(row => ({
        id: row.id,
        tokenAllocationId: row.token_allocation_id,
        investorId: row.investor_id,
        subscriptionId: row.subscription_id,
        projectId: row.project_id,
        tokenType: row.token_type,
        tokenAmount: typeof row.token_amount === 'number' ? row.token_amount : parseFloat(String(row.token_amount || '0')),
        distributionDate: new Date(row.distribution_date),
        distributionTxHash: row.distribution_tx_hash,
        walletId: row.wallet_id,
        blockchain: row.blockchain,
        tokenAddress: row.token_address,
        tokenSymbol: row.token_symbol,
        toAddress: row.to_address,
        status: row.status,
        notes: row.notes,
        remainingAmount: typeof row.remaining_amount === 'number' ? row.remaining_amount : parseFloat(String(row.remaining_amount || '0')),
        fullyRedeemed: row.fully_redeemed,
        standard: row.standard,
        createdAt: new Date(row.created_at),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
      }));

      return { success: true, data: distributionList };
    } catch (error) {
      console.error('Error fetching all distributions:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get enriched distributions with related investor, subscription, and token allocation data
   * Optionally filter by investor ID
   */
  async getEnrichedDistributions(investorId?: string): Promise<EnrichedDistributionResponse> {
    try {
      // First, get investors who have active redemption requests
      // These investors' distributions should be excluded
      // Note: redemption_requests.investor_id is text, distributions.investor_id is uuid
      const { data: activeRedemptions, error: redemptionsError } = await supabase
        .from('redemption_requests')
        .select('investor_id')
        .in('status', ['pending', 'approved', 'processing']);

      if (redemptionsError) {
        console.warn('Could not fetch active redemption requests:', redemptionsError);
      }

      const investorsWithActiveRequests = activeRedemptions ? 
        [...new Set(activeRedemptions.map(r => r.investor_id))] : [];

      console.log('Investors with active redemption requests:', investorsWithActiveRequests);

      // Get all distributions based on filter criteria
      // Only show distributions that are available for redemption:
      // 1. Not fully redeemed
      // 2. Have remaining amount > 0
      // 3. redemption_status is NULL (not already processing)
      // 4. Investor doesn't have active redemption requests
      let distributionsQuery = supabase
        .from('distributions')
        .select('*')
        .eq('fully_redeemed', false)
        .gt('remaining_amount', 0)
        .is('redemption_status', null)
        .order('distribution_date', { ascending: false });

      // Apply investor filter if provided and it's not a placeholder value
      if (investorId && investorId !== 'current-user' && investorId !== 'current-investor') {
        distributionsQuery = distributionsQuery.eq('investor_id', investorId);
      }

      const { data: allDistributions, error: distributionsError } = await distributionsQuery;

      if (distributionsError) {
        throw distributionsError;
      }

      // Filter out distributions from investors with active requests (client-side filtering)
      // This handles the data type mismatch between text and uuid
      const distributions = (allDistributions || []).filter(dist => 
        !investorsWithActiveRequests.includes(dist.investor_id)
      );

      console.log('Filtered distributions:', { 
        total: allDistributions?.length || 0, 
        afterFiltering: distributions.length,
        excludedInvestors: investorsWithActiveRequests 
      });

      if (!distributions || distributions.length === 0) {
        return { success: true, data: [] };
      }

      // Get all unique investor IDs and subscription IDs
      const investorIds = [...new Set(distributions.map(d => d.investor_id))];
      const subscriptionIds = [...new Set(distributions.map(d => d.subscription_id).filter(Boolean))];

      // Fetch all related investors
      const { data: investors, error: investorsError } = await supabase
        .from('investors')
        .select(`
          investor_id,
          name,
          email,
          type,
          company,
          wallet_address,
          kyc_status,
          investor_status,
          onboarding_completed,
          accreditation_status
        `)
        .in('investor_id', investorIds);

      if (investorsError) {
        console.warn('Error fetching investors:', investorsError);
      }

      // Fetch all related subscriptions using the correct join (subscriptions.id = distributions.subscription_id)
      let subscriptions: any[] = [];
      if (subscriptionIds.length > 0) {
        const { data: subs, error: subscriptionsError } = await supabase
          .from('subscriptions')
          .select(`
            id,
            subscription_id,
            fiat_amount,
            currency,
            confirmed,
            allocated,
            distributed,
            notes,
            subscription_date
          `)
          .in('id', subscriptionIds);

        if (subscriptionsError) {
          console.warn('Error fetching subscriptions:', subscriptionsError);
        } else {
          subscriptions = subs || [];
        }
      }

      // Create lookup maps for efficient joining
      const investorMap = new Map(
        (investors || []).map(inv => [inv.investor_id, inv])
      );
      const subscriptionMap = new Map(
        subscriptions.map(sub => [sub.id, sub])
      );

      // Map database rows to EnrichedDistribution type
      const enrichedDistributions: EnrichedDistribution[] = distributions.map(row => ({
        // Base distribution properties
        id: row.id,
        tokenAllocationId: row.token_allocation_id,
        investorId: row.investor_id,
        subscriptionId: row.subscription_id,
        projectId: row.project_id,
        tokenType: row.token_type,
        tokenAmount: typeof row.token_amount === 'number' ? row.token_amount : parseFloat(String(row.token_amount || '0')),
        distributionDate: new Date(row.distribution_date),
        distributionTxHash: row.distribution_tx_hash,
        walletId: row.wallet_id,
        blockchain: row.blockchain,
        tokenAddress: row.token_address,
        tokenSymbol: row.token_symbol,
        toAddress: row.to_address,
        status: row.status,
        notes: row.notes,
        remainingAmount: typeof row.remaining_amount === 'number' ? row.remaining_amount : parseFloat(String(row.remaining_amount || '0')),
        fullyRedeemed: row.fully_redeemed,
        standard: row.standard,
        createdAt: new Date(row.created_at),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
        // Related data from lookups
        investor: investorMap.get(row.investor_id) || undefined,
        subscription: subscriptionMap.get(row.subscription_id) || undefined,
        // Token allocation will be fetched separately if needed
        tokenAllocation: undefined
      }));

      return { success: true, data: enrichedDistributions };
    } catch (error) {
      console.error('Error fetching enriched distributions:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Create distribution redemption link
   */
  async createDistributionRedemption(distributionId: string, redemptionRequestId: string, amountRedeemed: number): Promise<{
    success: boolean;
    data?: DistributionRedemption;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('distribution_redemptions')
        .insert({
          distribution_id: distributionId,
          redemption_request_id: redemptionRequestId,
          amount_redeemed: amountRedeemed,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update the distribution's remaining amount
      // Note: Update distribution remaining amount directly
      const { data: currentDist, error: fetchError } = await supabase
        .from('distributions')
        .select('remaining_amount')
        .eq('id', distributionId)
        .single();
      
      const updateError = fetchError;
      
      if (updateError) {
        console.warn('Could not fetch distribution for update:', updateError);
      } else if (currentDist) {
        const newRemainingAmount = parseFloat(String(currentDist.remaining_amount || '0')) - amountRedeemed;
        await supabase
          .from('distributions')
          .update({
            remaining_amount: newRemainingAmount,
            fully_redeemed: newRemainingAmount <= 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', distributionId);
      }

      const distributionRedemption: DistributionRedemption = {
        id: data.id,
        distributionId: data.distribution_id,
        redemptionRequestId: data.redemption_request_id,
        amountRedeemed: typeof data.amount_redeemed === 'number' ? data.amount_redeemed : parseFloat(String(data.amount_redeemed)),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      return { success: true, data: distributionRedemption };
    } catch (error) {
      console.error('Error creating distribution redemption:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get redemption metrics and statistics
   */
  async getRedemptionMetrics(params?: {
    startDate?: string;
    endDate?: string;
    tokenType?: string;
    redemptionType?: 'standard' | 'interval';
  }): Promise<{
    success: boolean;
    data?: {
      totalRedemptions: number;
      totalVolume: number;
      pendingRedemptions: number;
      completedRedemptions: number;
      rejectedRedemptions: number;
      avgProcessingTime: number;
      successRate: number;
    };
    error?: string;
  }> {
    try {
      let query = supabase.from(this.tableName).select('*');

      // Apply date filters
      if (params?.startDate) {
        query = query.gte('created_at', params.startDate);
      }
      if (params?.endDate) {
        query = query.lte('created_at', params.endDate);
      }
      if (params?.tokenType) {
        query = query.eq('token_type', params.tokenType);
      }
      if (params?.redemptionType) {
        query = query.eq('redemption_type', params.redemptionType);
      }

      const { data: redemptions, error } = await query;

      if (error) {
        throw error;
      }

      if (!redemptions) {
        return {
          success: true,
          data: {
            totalRedemptions: 0,
            totalVolume: 0,
            pendingRedemptions: 0,
            completedRedemptions: 0,
            rejectedRedemptions: 0,
            avgProcessingTime: 0,
            successRate: 0
          }
        };
      }

      const totalRedemptions = redemptions.length;
      const totalVolume = redemptions.reduce((sum, r) => sum + parseFloat(String(r.token_amount || '0')), 0);
      const pendingRedemptions = redemptions.filter(r => r.status === 'pending').length;
      const completedRedemptions = redemptions.filter(r => r.status === 'settled').length;
      const rejectedRedemptions = redemptions.filter(r => r.status === 'rejected').length;
      
      // Calculate average processing time for completed redemptions
      const completedWithTimes = redemptions.filter(r => r.status === 'settled' && r.updated_at);
      const avgProcessingTime = completedWithTimes.length > 0 ?
        completedWithTimes.reduce((sum, r) => {
          const created = new Date(r.created_at).getTime();
          const settled = new Date(r.updated_at).getTime();
          return sum + (settled - created);
        }, 0) / completedWithTimes.length / (1000 * 60 * 60) : 0; // Convert to hours

      const successRate = totalRedemptions > 0 ? (completedRedemptions / totalRedemptions) * 100 : 0;

      return {
        success: true,
        data: {
          totalRedemptions,
          totalVolume,
          pendingRedemptions,
          completedRedemptions,
          rejectedRedemptions,
          avgProcessingTime: Math.round(avgProcessingTime * 100) / 100, // Round to 2 decimal places
          successRate: Math.round(successRate * 100) / 100
        }
      };
    } catch (error) {
      console.error('Error fetching redemption metrics:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Submit bulk redemption request
   */
  async createBulkRedemptionRequest(requests: CreateRedemptionRequestInput[]): Promise<{
    success: boolean;
    data?: {
      batchId: string;
      requests: RedemptionRequest[];
      successCount: number;
      failureCount: number;
      failures: Array<{ index: number; error: string; }>;
    };
    error?: string;
  }> {
    try {
      const batchId = `batch-${Date.now()}`;
      const successfulRequests: RedemptionRequest[] = [];
      const failures: Array<{ index: number; error: string; }> = [];
      let successCount = 0;
      let failureCount = 0;

      // Process each request individually
      for (let i = 0; i < requests.length; i++) {
        try {
          const result = await this.createRedemptionRequest({
            ...requests[i],
            // Mark as bulk redemption
            tokenType: requests[i].tokenType || 'bulk'
          });

          if (result.success && result.data) {
            successfulRequests.push(result.data);
            successCount++;
          } else {
            failures.push({
              index: i,
              error: result.error || 'Unknown error'
            });
            failureCount++;
          }
        } catch (error) {
          failures.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          });
          failureCount++;
        }
      }

      return {
        success: true,
        data: {
          batchId,
          requests: successfulRequests,
          successCount,
          failureCount,
          failures
        }
      };
    } catch (error) {
      console.error('Error creating bulk redemption request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Alias methods for component compatibility
  async getRedemptions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    investorId?: string;
    tokenType?: string;
    redemptionType?: 'standard' | 'interval';
  }): Promise<RedemptionListResponse> {
    return this.listRedemptionRequests(params);
  }

  async getEnrichedDistributionsForInvestor(investorId: string): Promise<EnrichedDistributionResponse> {
    // If investorId is a placeholder, get all distributions
    if (investorId === 'current-user' || investorId === 'current-investor') {
      return this.getEnrichedDistributions();
    }
    return this.getEnrichedDistributions(investorId);
  }

  async getAllEnrichedDistributions(): Promise<EnrichedDistributionResponse> {
    return this.getEnrichedDistributions();
  }

  async createBulkRedemption(requests: CreateRedemptionRequestInput[]): Promise<{
    success: boolean;
    data?: {
      batchId: string;
      requests: RedemptionRequest[];
      successCount: number;
      failureCount: number;
      failures: Array<{ index: number; error: string; }>;
    };
    error?: string;
  }> {
    return this.createBulkRedemptionRequest(requests);
  }

  async updateRedemptionRequest(id: string, updates: Partial<RedemptionRequest>): Promise<RedemptionRequestResponse> {
    return this.updateRedemptionStatus(id, updates.status || '', updates.rejectionReason);
  }
}

// Export singleton instance
export const redemptionService = new RedemptionService();
