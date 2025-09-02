import { supabase } from '@/infrastructure/database/client';

/**
 * Guardian Wallet Database Integration Service
 * Handles querying and managing Guardian wallet data from the database
 */
export class GuardianWalletDBService {
  /**
   * Get Guardian wallets for a specific user
   */
  async getUserGuardianWallets(userId: string) {
    const { data, error } = await supabase
      .from('wallet_details')
      .select('*')
      .filter('blockchain_specific_data->>user_id', 'eq', userId)
      .filter('blockchain_specific_data->>name', 'neq', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch Guardian wallets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get Guardian wallet count for a user
   */
  async getUserGuardianWalletCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('wallet_details')
      .select('*', { count: 'exact', head: true })
      .filter('blockchain_specific_data->>user_id', 'eq', userId);

    if (error) {
      throw new Error(`Failed to count Guardian wallets: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get a specific Guardian wallet by ID
   */
  async getGuardianWallet(walletId: string) {
    const { data, error } = await supabase
      .from('wallet_details')
      .select('*')
      .eq('id', walletId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch Guardian wallet: ${error.message}`);
    }

    return data;
  }

  /**
   * Update Guardian wallet name
   */
  async updateGuardianWalletName(walletId: string, newName: string) {
    // First get current data
    const { data: currentData, error: fetchError } = await supabase
      .from('wallet_details')
      .select('blockchain_specific_data')
      .eq('id', walletId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch current wallet data: ${fetchError.message}`);
    }

    // Update the name in the JSON data
    const currentDataObj = currentData.blockchain_specific_data as Record<string, any> || {};
    const updatedData = {
      ...currentDataObj,
      name: newName
    };

    const { error } = await supabase
      .from('wallet_details')
      .update({
        blockchain_specific_data: updatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', walletId);

    if (error) {
      throw new Error(`Failed to update wallet name: ${error.message}`);
    }

    return true;
  }

  /**
   * Get Guardian wallet statistics for a user
   */
  async getUserWalletStats(userId: string) {
    const wallets = await this.getUserGuardianWallets(userId);
    
    const stats = {
      total: wallets.length,
      active: 0,
      pending: 0,
      error: 0,
      byBlockchain: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    wallets.forEach(wallet => {
      const data = wallet.blockchain_specific_data as Record<string, any> || {};
      const status = data.status || 'unknown';
      const blockchain = data.blockchain || 'unknown';
      const accounts = data.accounts || [];
      const type = accounts.length > 0 ? accounts[0].type : 'EOA';

      // Count by status
      if (status === 'active') stats.active++;
      else if (status === 'pending') stats.pending++;
      else stats.error++;

      // Count by blockchain
      stats.byBlockchain[blockchain] = (stats.byBlockchain[blockchain] || 0) + 1;

      // Count by type
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Check if user is approaching wallet limit
   */
  async checkWalletLimit(userId: string, limit: number = 50) {
    const count = await this.getUserGuardianWalletCount(userId);
    return {
      count,
      limit,
      remaining: Math.max(0, limit - count),
      isNearLimit: count >= limit * 0.8, // 80% of limit
      isAtLimit: count >= limit
    };
  }
}

export const guardianWalletDB = new GuardianWalletDBService();
