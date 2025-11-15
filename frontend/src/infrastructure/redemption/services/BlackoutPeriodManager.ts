/**
 * Blackout Period Manager
 * Manages blackout periods during which operations (like redemptions) are not allowed
 */

import { supabase } from '@/infrastructure/database/client';
import type {
  BlackoutPeriod,
  BlackoutPeriodDB,
  CreateBlackoutParams,
  UpdateBlackoutParams,
  BlackoutCheckResult,
  OperationType
} from '../types/blackout';
import { mapBlackoutFromDB, mapBlackoutToDB } from '../types/blackout';

export class BlackoutPeriodManager {
  /**
   * Create a new blackout period
   */
  async createBlackoutPeriod(
    params: CreateBlackoutParams,
    createdBy?: string
  ): Promise<BlackoutPeriod> {
    // Validate dates
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    
    if (end <= start) {
      throw new Error('End date must be after start date');
    }

    // Check for overlapping blackout periods
    const overlapping = await this.checkOverlap(
      params.projectId,
      params.startDate,
      params.endDate,
      params.operations || ['redemption']
    );
    
    if (overlapping.length > 0) {
      throw new Error(
        `Blackout period overlaps with existing period(s): ${overlapping.map(b => b.id).join(', ')}`
      );
    }

    const { data, error } = await supabase
      .from('blackout_periods')
      .insert({
        project_id: params.projectId,
        start_date: params.startDate,
        end_date: params.endDate,
        reason: params.reason || null,
        affected_operations: params.operations || ['redemption'],
        created_by: createdBy || null,
        active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create blackout period: ${error.message}`);
    }

    return mapBlackoutFromDB(data as BlackoutPeriodDB);
  }

  /**
   * Update an existing blackout period
   */
  async updateBlackoutPeriod(
    params: UpdateBlackoutParams
  ): Promise<BlackoutPeriod> {
    const updates: Partial<BlackoutPeriodDB> = {};
    
    if (params.startDate) {
      updates.start_date = params.startDate;
    }
    if (params.endDate) {
      updates.end_date = params.endDate;
    }
    if (params.reason !== undefined) {
      updates.reason = params.reason;
    }
    if (params.operations) {
      updates.affected_operations = params.operations;
    }
    if (params.active !== undefined) {
      updates.active = params.active;
    }

    const { data, error } = await supabase
      .from('blackout_periods')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update blackout period: ${error.message}`);
    }

    return mapBlackoutFromDB(data as BlackoutPeriodDB);
  }

  /**
   * Delete a blackout period
   */
  async deleteBlackoutPeriod(id: string): Promise<void> {
    const { error } = await supabase
      .from('blackout_periods')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete blackout period: ${error.message}`);
    }
  }

  /**
   * Check if a project is in a blackout period for a specific operation
   */
  async isInBlackoutPeriod(
    projectId: string,
    operation: OperationType
  ): Promise<BlackoutCheckResult> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('blackout_periods')
      .select('*')
      .eq('project_id', projectId)
      .eq('active', true)
      .contains('affected_operations', [operation])
      .lte('start_date', now)
      .gte('end_date', now);

    if (error) {
      throw new Error(`Failed to check blackout period: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        isInBlackout: false,
        message: `No blackout period active for ${operation}`
      };
    }

    const blackoutPeriod = mapBlackoutFromDB(data[0] as BlackoutPeriodDB);

    return {
      isInBlackout: true,
      blackoutPeriod,
      message: blackoutPeriod.reason || 
        `Operation ${operation} is not allowed during blackout period until ${blackoutPeriod.endDate}`
    };
  }

  /**
   * Get all blackout periods for a project
   */
  async getBlackoutPeriods(projectId: string): Promise<BlackoutPeriod[]> {
    const { data, error } = await supabase
      .from('blackout_periods')
      .select('*')
      .eq('project_id', projectId)
      .order('start_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch blackout periods: ${error.message}`);
    }

    return (data as BlackoutPeriodDB[]).map(mapBlackoutFromDB);
  }

  /**
   * Get active blackout periods
   */
  /**
   * Get active blackout periods
   */
  async getActiveBlackoutPeriods(projectId: string): Promise<BlackoutPeriod[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('blackout_periods')
      .select('*')
      .eq('project_id', projectId)
      .eq('active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .order('start_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active blackout periods: ${error.message}`);
    }

    return (data as BlackoutPeriodDB[]).map(mapBlackoutFromDB);
  }

  /**
   * Get upcoming blackout periods
   */
  async getUpcomingBlackoutPeriods(
    projectId: string,
    daysAhead: number = 30
  ): Promise<BlackoutPeriod[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('blackout_periods')
      .select('*')
      .eq('project_id', projectId)
      .eq('active', true)
      .gte('start_date', now.toISOString())
      .lte('start_date', futureDate.toISOString())
      .order('start_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch upcoming blackout periods: ${error.message}`);
    }

    return (data as BlackoutPeriodDB[]).map(mapBlackoutFromDB);
  }

  /**
   * Check for overlapping blackout periods
   */
  private async checkOverlap(
    projectId: string,
    startDate: string,
    endDate: string,
    operations: OperationType[]
  ): Promise<BlackoutPeriod[]> {
    const { data, error } = await supabase
      .from('blackout_periods')
      .select('*')
      .eq('project_id', projectId)
      .eq('active', true)
      .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`);

    if (error) {
      return [];
    }

    if (!data) {
      return [];
    }

    // Filter for operations that overlap
    const overlapping = (data as BlackoutPeriodDB[])
      .map(mapBlackoutFromDB)
      .filter(bp => 
        bp.affectedOperations.some(op => operations.includes(op))
      );

    return overlapping;
  }

  /**
   * Deactivate a blackout period
   */
  async deactivateBlackoutPeriod(id: string): Promise<BlackoutPeriod> {
    const { data, error } = await supabase
      .from('blackout_periods')
      .update({ active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to deactivate blackout period: ${error.message}`);
    }

    return mapBlackoutFromDB(data as BlackoutPeriodDB);
  }

  /**
   * Activate a blackout period
   */
  async activateBlackoutPeriod(id: string): Promise<BlackoutPeriod> {
    const { data, error } = await supabase
      .from('blackout_periods')
      .update({ active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to activate blackout period: ${error.message}`);
    }

    return mapBlackoutFromDB(data as BlackoutPeriodDB);
  }

  /**
   * Cancel overlapping redemption windows during blackout
   */
  async cancelOverlappingWindows(blackout: BlackoutPeriod): Promise<number> {
    // Only cancel if blackout affects redemptions
    if (!blackout.affectedOperations.includes('redemption')) {
      return 0;
    }

    const { data, error } = await supabase
      .from('redemption_windows')
      .update({ status: 'cancelled' })
      .eq('project_id', blackout.projectId)
      .or(`and(submission_start_date.lte.${blackout.endDate},submission_end_date.gte.${blackout.startDate})`)
      .neq('status', 'closed')
      .select('id');

    if (error) {
      throw new Error(`Failed to cancel overlapping windows: ${error.message}`);
    }

    return data?.length || 0;
  }
}
