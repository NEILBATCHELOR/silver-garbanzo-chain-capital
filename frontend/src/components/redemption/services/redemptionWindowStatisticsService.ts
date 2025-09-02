/**
 * Redemption Window Statistics Service
 * Date: August 26, 2025
 * Purpose: Application-level service to manage redemption window statistics
 * Links redemption_requests to redemption_windows and maintains real-time statistics
 */

import { supabase } from '@/infrastructure/database/client';

export interface RedemptionWindowStatistics {
  window_id: string;
  current_requests: number;
  total_request_value: number;
  approved_requests: number;
  rejected_requests: number;
  queued_requests: number;
  approved_value: number;
  rejected_value: number;
  queued_value: number;
  last_updated: Date;
}

export interface RedemptionRequestLink {
  request_id: string;
  window_id: string;
  amount: number;
  status: string;
  created_at: Date;
}

export class RedemptionWindowStatisticsService {
  
  /**
   * Link a redemption request to a redemption window
   */
  async linkRequestToWindow(requestId: string, windowId: string): Promise<{
    success: boolean;
    data?: boolean;
    error?: string;
  }> {
    try {
      // Call database function to link request and auto-update statistics
      const { data, error } = await supabase
        .rpc('link_redemption_request_to_window', {
          request_id: requestId,
          window_id: windowId
        });

      if (error) {
        throw error;
      }

      return { success: true, data: data || true };
    } catch (error) {
      console.error('Error linking request to window:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to link request to window' 
      };
    }
  }

  /**
   * Update statistics for a specific redemption window
   */
  async updateWindowStatistics(windowId: string): Promise<{
    success: boolean;
    data?: RedemptionWindowStatistics;
    error?: string;
  }> {
    try {
      // Call database function to update statistics
      const { error } = await supabase
        .rpc('update_redemption_window_statistics', {
          window_uuid: windowId
        });

      if (error) {
        throw error;
      }

      // Get updated statistics
      const { data: windowData, error: fetchError } = await supabase
        .from('redemption_windows')
        .select(`
          id,
          current_requests,
          total_request_value,
          approved_requests,
          rejected_requests,
          queued_requests,
          approved_value,
          rejected_value,
          queued_value,
          updated_at
        `)
        .eq('id', windowId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const statistics: RedemptionWindowStatistics = {
        window_id: windowData.id,
        current_requests: windowData.current_requests || 0,
        total_request_value: parseFloat(windowData.total_request_value || '0'),
        approved_requests: windowData.approved_requests || 0,
        rejected_requests: windowData.rejected_requests || 0,
        queued_requests: windowData.queued_requests || 0,
        approved_value: parseFloat(windowData.approved_value || '0'),
        rejected_value: parseFloat(windowData.rejected_value || '0'),
        queued_value: parseFloat(windowData.queued_value || '0'),
        last_updated: new Date(windowData.updated_at)
      };

      return { success: true, data: statistics };
    } catch (error) {
      console.error('Error updating window statistics:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update window statistics' 
      };
    }
  }

  /**
   * Get current statistics for a redemption window
   */
  async getWindowStatistics(windowId: string): Promise<{
    success: boolean;
    data?: RedemptionWindowStatistics;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('redemption_windows')
        .select(`
          id,
          current_requests,
          total_request_value,
          approved_requests,
          rejected_requests,
          queued_requests,
          approved_value,
          rejected_value,
          queued_value,
          updated_at
        `)
        .eq('id', windowId)
        .single();

      if (error) {
        throw error;
      }

      const statistics: RedemptionWindowStatistics = {
        window_id: data.id,
        current_requests: data.current_requests || 0,
        total_request_value: parseFloat(data.total_request_value || '0'),
        approved_requests: data.approved_requests || 0,
        rejected_requests: data.rejected_requests || 0,
        queued_requests: data.queued_requests || 0,
        approved_value: parseFloat(data.approved_value || '0'),
        rejected_value: parseFloat(data.rejected_value || '0'),
        queued_value: parseFloat(data.queued_value || '0'),
        last_updated: new Date(data.updated_at)
      };

      return { success: true, data: statistics };
    } catch (error) {
      console.error('Error getting window statistics:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get window statistics' 
      };
    }
  }

  /**
   * Get all requests linked to a redemption window
   */
  async getWindowRequests(windowId: string): Promise<{
    success: boolean;
    data?: RedemptionRequestLink[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('redemption_requests')
        .select(`
          id,
          status,
          token_amount,
          usdc_amount,
          window_id,
          redemption_window_id,
          created_at
        `)
        .or(`window_id.eq.${windowId},redemption_window_id.eq.${windowId}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const requests: RedemptionRequestLink[] = (data || []).map(row => ({
        request_id: row.id,
        window_id: windowId,
        amount: parseFloat(row.usdc_amount || row.token_amount || '0'),
        status: row.status,
        created_at: new Date(row.created_at)
      }));

      return { success: true, data: requests };
    } catch (error) {
      console.error('Error getting window requests:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get window requests' 
      };
    }
  }

  /**
   * Refresh statistics for all active redemption windows
   */
  async refreshAllStatistics(): Promise<{
    success: boolean;
    data?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('refresh_all_redemption_window_statistics');

      if (error) {
        throw error;
      }

      return { success: true, data: data || 0 };
    } catch (error) {
      console.error('Error refreshing all statistics:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to refresh all statistics' 
      };
    }
  }

  /**
   * Create a new redemption request and link to window
   */
  async createRequestForWindow(
    windowId: string,
    requestData: {
      investor_id?: string;
      token_amount: number;
      token_type: string;
      status: string;
      source_wallet_address?: string;
      destination_wallet_address?: string;
      project_id?: string;
    }
  ): Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }> {
    try {
      // Create the redemption request with window link
      const { data, error } = await supabase
        .from('redemption_requests')
        .insert({
          ...requestData,
          redemption_window_id: windowId,
          usdc_amount: requestData.token_amount, // Assuming 1:1 for now
          conversion_rate: 1.0,
          required_approvals: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      // Statistics will be automatically updated by database trigger
      return { success: true, data: data.id };
    } catch (error) {
      console.error('Error creating request for window:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create request for window' 
      };
    }
  }

  /**
   * Update request status (triggers automatic statistics update)
   */
  async updateRequestStatus(
    requestId: string,
    status: 'pending' | 'approved' | 'rejected' | 'processing'
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase
        .from('redemption_requests')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        throw error;
      }

      // Statistics will be automatically updated by database trigger
      return { success: true };
    } catch (error) {
      console.error('Error updating request status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update request status' 
      };
    }
  }

  /**
   * Get statistics comparison (actual vs stored)
   */
  async getStatisticsComparison(): Promise<{
    success: boolean;
    data?: Array<{
      window_name: string;
      stored_requests: number;
      actual_requests: number;
      stored_value: number;
      actual_value: number;
      stored_approved: number;
      actual_approved: number;
    }>;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('get_redemption_statistics_comparison');

      if (error) {
        // If RPC doesn't exist, fall back to manual calculation
        const { data: windows, error: windowsError } = await supabase
          .from('redemption_windows')
          .select(`
            id,
            name,
            current_requests,
            total_request_value,
            approved_requests
          `);

        if (windowsError) {
          throw windowsError;
        }

        const comparison = [];
        for (const window of windows || []) {
          // Get actual statistics from requests
          const { data: requestStats } = await supabase
            .from('redemption_requests')
            .select('status, usdc_amount, token_amount')
            .or(`window_id.eq.${window.id},redemption_window_id.eq.${window.id}`);

          const actualRequests = requestStats?.length || 0;
          const actualValue = requestStats?.reduce((sum, req) => 
            sum + parseFloat(req.usdc_amount || req.token_amount || '0'), 0
          ) || 0;
          const actualApproved = requestStats?.filter(req => req.status === 'approved').length || 0;

          comparison.push({
            window_name: window.name,
            stored_requests: window.current_requests || 0,
            actual_requests: actualRequests,
            stored_value: parseFloat(window.total_request_value || '0'),
            actual_value: actualValue,
            stored_approved: window.approved_requests || 0,
            actual_approved: actualApproved
          });
        }

        return { success: true, data: comparison };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting statistics comparison:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get statistics comparison' 
      };
    }
  }
}

// Export singleton instance
export const redemptionWindowStatisticsService = new RedemptionWindowStatisticsService();