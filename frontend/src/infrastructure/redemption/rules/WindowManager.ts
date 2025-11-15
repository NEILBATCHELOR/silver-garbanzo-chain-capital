/**
 * Stage 9: Window Manager
 * Manages redemption window lifecycle and operations
 */

import { supabase } from '@/infrastructure/database/client';
import type {
  RedemptionWindow,
  RedemptionWindowDB,
  CreateWindowParams,
  WindowFilter,
  WindowUpdateParams,
  WindowStatus
} from './types';
import { mapWindowFromDB, mapWindowToDB } from './types'; // Mapper functions imported as values

export interface WindowManagerConfig {
  autoTransition?: boolean;
  notificationEnabled?: boolean;
  debugMode?: boolean;
}

export class WindowManager {
  private config: WindowManagerConfig;

  constructor(config: WindowManagerConfig = {}) {
    this.config = {
      autoTransition: true,
      notificationEnabled: true,
      debugMode: false,
      ...config
    };
  }

  /**
   * Create a new redemption window
   */
  async createWindow(params: CreateWindowParams): Promise<RedemptionWindow> {
    try {
      // Validate dates
      this.validateWindowDates(params);

      // Check for overlapping windows
      const hasOverlap = await this.checkOverlappingWindows(
        params.projectId,
        params.submissionStartDate,
        params.submissionEndDate
      );

      if (hasOverlap) {
        throw new Error('Window overlaps with existing active window');
      }

      // Prepare window data
      const windowData: Partial<RedemptionWindowDB> = {
        project_id: params.projectId,
        organization_id: params.organizationId,
        name: params.name,
        start_date: params.startDate,
        end_date: params.endDate,
        submission_start_date: params.submissionStartDate,
        submission_end_date: params.submissionEndDate,
        submission_date_mode: params.submissionDateMode || 'fixed',
        processing_date_mode: params.processingDateMode || 'fixed',
        lockup_days: params.lockupDays || null,
        processing_offset_days: params.processingOffsetDays || 1,
        max_redemption_amount: params.maxRedemptionAmount || null,
        min_redemption_amount: params.minRedemptionAmount || 0,
        enable_pro_rata_distribution: params.enableProRataDistribution ?? true,
        auto_process: params.autoProcess ?? false,
        is_template: params.isTemplate ?? false,
        is_active: true,
        status: 'upcoming',
        submission_status: 'not_started',
        processing_status: 'pending',
        current_requests: 0,
        total_request_value: 0,
        approved_requests: 0,
        approved_value: 0,
        rejected_requests: 0,
        rejected_value: 0,
        queued_requests: 0,
        queued_value: 0,
        pro_rata_factor: 1.0,
        processing_fee_percentage: 0,
        early_redemption_penalty: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_status_change_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('redemption_windows')
        .insert(windowData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create window: ${error.message}`);
      }

      const window = mapWindowFromDB(data as RedemptionWindowDB);

      if (this.config.debugMode) {
        console.log('Window created:', window.id);
      }

      return window;

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Window creation failed: ${message}`);
    }
  }

  /**
   * Get current active window for a project
   */
  async getCurrentWindow(projectId: string): Promise<RedemptionWindow | null> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('redemption_windows')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .eq('is_active', true)
        .lte('submission_start_date', now)
        .gte('submission_end_date', now)
        .order('submission_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to get current window: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return mapWindowFromDB(data as RedemptionWindowDB);

    } catch (error) {
      if (this.config.debugMode) {
        console.error('Error getting current window:', error);
      }
      throw error;
    }
  }

  /**
   * Get window by ID
   */
  async getWindow(windowId: string): Promise<RedemptionWindow | null> {
    try {
      const { data, error } = await supabase
        .from('redemption_windows')
        .select('*')
        .eq('id', windowId)
        .single();

      if (error || !data) {
        return null;
      }

      return mapWindowFromDB(data as RedemptionWindowDB);

    } catch (error) {
      if (this.config.debugMode) {
        console.error('Error getting window:', error);
      }
      return null;
    }
  }

  /**
   * List windows with filters
   */
  async listWindows(filter: WindowFilter = {}): Promise<RedemptionWindow[]> {
    try {
      let query = supabase
        .from('redemption_windows')
        .select('*');

      if (filter.projectId) {
        query = query.eq('project_id', filter.projectId);
      }

      if (filter.organizationId) {
        query = query.eq('organization_id', filter.organizationId);
      }

      if (filter.status) {
        query = query.eq('status', filter.status);
      }

      if (filter.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive);
      }

      if (filter.startDateFrom) {
        query = query.gte('start_date', filter.startDateFrom);
      }

      if (filter.startDateTo) {
        query = query.lte('start_date', filter.startDateTo);
      }

      query = query.order('start_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to list windows: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(windowDB => mapWindowFromDB(windowDB as RedemptionWindowDB));

    } catch (error) {
      if (this.config.debugMode) {
        console.error('Error listing windows:', error);
      }
      throw error;
    }
  }

  /**
   * Update window
   */
  async updateWindow(
    windowId: string,
    updates: WindowUpdateParams
  ): Promise<RedemptionWindow> {
    try {
      const updateData: Partial<RedemptionWindowDB> = {
        ...mapWindowToDB(updates as Partial<RedemptionWindow>),
        updated_at: new Date().toISOString()
      };

      // Track status changes
      if (updates.status) {
        updateData.last_status_change_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('redemption_windows')
        .update(updateData)
        .eq('id', windowId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update window: ${error.message}`);
      }

      return mapWindowFromDB(data as RedemptionWindowDB);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Window update failed: ${message}`);
    }
  }

  /**
   * Open a window (change status to active)
   */
  async openWindow(windowId: string, openedBy: string): Promise<RedemptionWindow> {
    try {
      const window = await this.getWindow(windowId);
      
      if (!window) {
        throw new Error('Window not found');
      }

      if (window.status === 'active') {
        throw new Error('Window is already open');
      }

      const updates = {
        status: 'active' as WindowStatus,
        submission_status: 'open',
        last_modified_by: openedBy
      };

      const updatedWindow = await this.updateWindow(windowId, updates);

      if (this.config.notificationEnabled) {
        await this.notifyWindowOpened(updatedWindow);
      }

      if (this.config.debugMode) {
        console.log('Window opened:', windowId);
      }

      return updatedWindow;

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to open window: ${message}`);
    }
  }

  /**
   * Close a window
   */
  async closeWindow(windowId: string, closedBy: string): Promise<RedemptionWindow> {
    try {
      const window = await this.getWindow(windowId);
      
      if (!window) {
        throw new Error('Window not found');
      }

      if (window.status === 'closed') {
        throw new Error('Window is already closed');
      }

      const updates = {
        status: 'closed' as WindowStatus,
        submission_status: 'closed',
        last_modified_by: closedBy
      };

      const updatedWindow = await this.updateWindow(windowId, updates);

      if (this.config.notificationEnabled) {
        await this.notifyWindowClosed(updatedWindow);
      }

      if (this.config.debugMode) {
        console.log('Window closed:', windowId);
      }

      return updatedWindow;

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to close window: ${message}`);
    }
  }

  /**
   * Process window (mark as processing)
   */
  async processWindow(windowId: string, processedBy: string): Promise<RedemptionWindow> {
    try {
      const updates = {
        status: 'processing' as WindowStatus,
        processing_status: 'in_progress',
        processed_by: processedBy,
        processed_at: new Date().toISOString()
      };

      return await this.updateWindow(windowId, updates);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to process window: ${message}`);
    }
  }

  /**
   * Complete window processing
   */
  async completeWindow(windowId: string, approvedBy: string): Promise<RedemptionWindow> {
    try {
      const updates = {
        status: 'completed' as WindowStatus,
        processing_status: 'completed',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      };

      return await this.updateWindow(windowId, updates);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to complete window: ${message}`);
    }
  }

  /**
   * Cancel a window
   */
  async cancelWindow(windowId: string, reason: string): Promise<RedemptionWindow> {
    try {
      const updates = {
        status: 'cancelled' as WindowStatus,
        notes: reason,
        is_active: false
      };

      return await this.updateWindow(windowId, updates);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to cancel window: ${message}`);
    }
  }

  /**
   * Check for overlapping windows
   */
  private async checkOverlappingWindows(
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('redemption_windows')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .or(`and(submission_start_date.lte.${endDate},submission_end_date.gte.${startDate})`);

      if (error) {
        throw new Error(`Overlap check failed: ${error.message}`);
      }

      return (data?.length || 0) > 0;

    } catch (error) {
      if (this.config.debugMode) {
        console.error('Error checking overlaps:', error);
      }
      return false;
    }
  }

  /**
   * Validate window dates
   */
  private validateWindowDates(params: CreateWindowParams): void {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    const submissionStart = new Date(params.submissionStartDate);
    const submissionEnd = new Date(params.submissionEndDate);

    if (start >= end) {
      throw new Error('Start date must be before end date');
    }

    if (submissionStart >= submissionEnd) {
      throw new Error('Submission start date must be before submission end date');
    }

    if (submissionEnd > end) {
      throw new Error('Submission end date cannot be after window end date');
    }
  }

  /**
   * Notify stakeholders that window opened
   */
  private async notifyWindowOpened(window: RedemptionWindow): Promise<void> {
    // Placeholder for notification logic
    // TODO: Integrate with notification service
    if (this.config.debugMode) {
      console.log('Notification: Window opened', window.id);
    }
  }

  /**
   * Notify stakeholders that window closed
   */
  private async notifyWindowClosed(window: RedemptionWindow): Promise<void> {
    // Placeholder for notification logic
    // TODO: Integrate with notification service
    if (this.config.debugMode) {
      console.log('Notification: Window closed', window.id);
    }
  }

  /**
   * Get upcoming windows
   */
  async getUpcomingWindows(projectId: string): Promise<RedemptionWindow[]> {
    return this.listWindows({
      projectId,
      status: 'upcoming',
      isActive: true,
      startDateFrom: new Date().toISOString()
    });
  }

  /**
   * Get active windows
   */
  async getActiveWindows(projectId: string): Promise<RedemptionWindow[]> {
    return this.listWindows({
      projectId,
      status: 'active',
      isActive: true
    });
  }
}
