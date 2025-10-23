/**
 * AddressSelectionTracker - Tracks user address selections in transfer UI
 * 
 * This service tracks when users select addresses in the transfer form
 * to provide a "Recent Addresses" feature that shows actually-used addresses
 * rather than just historical transaction recipients.
 */

import { supabase } from '@/infrastructure/database/client';
import { ethers } from 'ethers';

export interface AddressSelection {
  id: string;
  user_id: string;
  project_id: string | null;
  address: string;
  selected_at: string;
  context: string;
}

export interface RecentAddress {
  address: string;
  lastSelected: Date;
  count: number;
  label?: string;
  type?: 'project' | 'user' | 'multisig' | 'external';
}

class AddressSelectionTrackerService {
  /**
   * Track an address selection
   * Uses upsert logic to update timestamp if address already tracked
   */
  async trackSelection(
    userId: string,
    address: string,
    projectId?: string | null,
    context: string = 'transfer_tab'
  ): Promise<boolean> {
    try {
      // Validate address format
      if (!this.isValidAddress(address)) {
        console.warn('Invalid address format, skipping tracking:', address);
        return false;
      }

      // Normalize address to lowercase
      const normalizedAddress = address.toLowerCase();

      // Use the upsert function
      const { error } = await supabase.rpc('upsert_address_selection', {
        p_user_id: userId,
        p_project_id: projectId || null,
        p_address: normalizedAddress,
        p_context: context
      });

      if (error) {
        console.error('Failed to track address selection:', error);
        return false;
      }

      console.log('✅ Tracked address selection:', normalizedAddress);
      return true;
    } catch (error) {
      console.error('Error tracking address selection:', error);
      return false;
    }
  }

  /**
   * Get recent addresses for a user
   */
  async getRecentAddresses(
    userId: string,
    projectId?: string | null,
    limit: number = 8
  ): Promise<RecentAddress[]> {
    try {
      let query = supabase
        .from('recent_address_selections')
        .select('address, selected_at')
        .eq('user_id', userId)
        .order('selected_at', { ascending: false });

      // Filter by project if provided
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      query = query.limit(limit * 2); // Get more to allow for deduplication

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch recent addresses:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Aggregate by address (in case there are multiple selections)
      const addressMap = new Map<string, RecentAddress>();
      
      data.forEach((selection) => {
        const address = selection.address;
        const selectedAt = new Date(selection.selected_at);

        if (addressMap.has(address)) {
          const existing = addressMap.get(address)!;
          existing.count++;
          // Keep the most recent date
          if (selectedAt > existing.lastSelected) {
            existing.lastSelected = selectedAt;
          }
        } else {
          addressMap.set(address, {
            address,
            lastSelected: selectedAt,
            count: 1
          });
        }
      });

      // Convert to array and sort by most recent
      const addresses = Array.from(addressMap.values())
        .sort((a, b) => b.lastSelected.getTime() - a.lastSelected.getTime())
        .slice(0, limit);

      return addresses;
    } catch (error) {
      console.error('Error fetching recent addresses:', error);
      return [];
    }
  }

  /**
   * Clear recent addresses for a user
   */
  async clearRecentAddresses(
    userId: string,
    projectId?: string | null
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('recent_address_selections')
        .delete()
        .eq('user_id', userId);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { error } = await query;

      if (error) {
        console.error('Failed to clear recent addresses:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error clearing recent addresses:', error);
      return false;
    }
  }

  /**
   * Validate Ethereum address format
   */
  private isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const addressSelectionTracker = new AddressSelectionTrackerService();
