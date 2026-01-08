/**
 * Contract Master Service
 * 
 * Handles contract_masters table operations including activation/deactivation
 */

import { supabase } from '@/infrastructure/database/client';

export interface ToggleActiveResult {
  success: boolean;
  message: string;
  newIsActive: boolean;
  deprecatedAt: string | null;
}

export interface BulkToggleResult {
  success: boolean;
  message: string;
  successCount: number;
  failCount: number;
  errors: Array<{ id: string; error: string }>;
}

export class ContractMasterService {
  /**
   * Toggle is_active status and manage deprecated_at timestamp
   * 
   * Rules:
   * - When deactivating (active -> inactive): Set deprecated_at to current timestamp
   * - When activating (inactive -> active): Clear deprecated_at (set to null)
   */
  static async toggleActive(contractId: string, currentIsActive: boolean): Promise<ToggleActiveResult> {
    try {
      const newIsActive = !currentIsActive;
      const deprecatedAt = newIsActive ? null : new Date().toISOString();
      
      const { error } = await supabase
        .from('contract_masters')
        .update({
          is_active: newIsActive,
          deprecated_at: deprecatedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId);
      
      if (error) throw error;
      
      return {
        success: true,
        message: newIsActive 
          ? 'Contract activated successfully' 
          : 'Contract deactivated successfully',
        newIsActive,
        deprecatedAt
      };
    } catch (error) {
      console.error('Error toggling contract active status:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to toggle contract status',
        newIsActive: currentIsActive,
        deprecatedAt: null
      };
    }
  }

  /**
   * Bulk activate contracts
   * Sets is_active to true and clears deprecated_at for all selected contracts
   */
  static async bulkActivate(contractIds: string[]): Promise<BulkToggleResult> {
    try {
      const { error } = await supabase
        .from('contract_masters')
        .update({
          is_active: true,
          deprecated_at: null,
          updated_at: new Date().toISOString()
        })
        .in('id', contractIds);
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Successfully activated ${contractIds.length} contract${contractIds.length > 1 ? 's' : ''}`,
        successCount: contractIds.length,
        failCount: 0,
        errors: []
      };
    } catch (error) {
      console.error('Error bulk activating contracts:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to activate contracts',
        successCount: 0,
        failCount: contractIds.length,
        errors: [{ id: 'bulk', error: error instanceof Error ? error.message : 'Unknown error' }]
      };
    }
  }

  /**
   * Bulk deactivate contracts
   * Sets is_active to false and sets deprecated_at to current timestamp for all selected contracts
   */
  static async bulkDeactivate(contractIds: string[]): Promise<BulkToggleResult> {
    try {
      const deprecatedAt = new Date().toISOString();
      
      const { error } = await supabase
        .from('contract_masters')
        .update({
          is_active: false,
          deprecated_at: deprecatedAt,
          updated_at: new Date().toISOString()
        })
        .in('id', contractIds);
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Successfully deactivated ${contractIds.length} contract${contractIds.length > 1 ? 's' : ''}`,
        successCount: contractIds.length,
        failCount: 0,
        errors: []
      };
    } catch (error) {
      console.error('Error bulk deactivating contracts:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to deactivate contracts',
        successCount: 0,
        failCount: contractIds.length,
        errors: [{ id: 'bulk', error: error instanceof Error ? error.message : 'Unknown error' }]
      };
    }
  }
}
