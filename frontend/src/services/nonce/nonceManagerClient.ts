/**
 * Frontend wrapper for NonceManagerService (backend)
 * Provides nonce reservation, confirmation, and release for blockchain transactions
 */
export class NonceManagerClient {
  private static readonly API_BASE = '/api/nonce';

  /**
   * Reserve a nonce for a transaction
   * This prevents other transactions from using the same nonce
   * 
   * @returns Full response with success status, reserved nonce and expiration time
   */
  static async reserveNonce(
    walletId: string,
    blockchain: string,
    specificNonce?: number
  ): Promise<{ success: boolean; data?: { nonce: number; expires_at: string }; error?: string }> {
    try {
      console.log('🔒 [NonceManager] Reserving nonce...', { walletId, blockchain, specificNonce });

      const response = await fetch(`${this.API_BASE}/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_id: walletId,
          blockchain,
          specific_nonce: specificNonce
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [NonceManager] Failed to reserve nonce:', error);
        return { success: false, error: error.error || 'Failed to reserve nonce' };
      }

      const result = await response.json();
      console.log('✅ [NonceManager] Nonce reserved:', result);
      
      // Return the full response object with success, data, and optional error
      return result;
    } catch (error) {
      console.error('❌ [NonceManager] Reserve nonce error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Confirm that a nonce has been used (transaction broadcast successfully)
   * This marks the nonce as confirmed and prevents it from being reused
   */
  static async confirmNonce(
    walletId: string,
    blockchain: string,
    nonce: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('✅ [NonceManager] Confirming nonce usage...', { walletId, blockchain, nonce });

      const response = await fetch(`${this.API_BASE}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_id: walletId,
          blockchain,
          nonce
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [NonceManager] Failed to confirm nonce:', error);
        return { success: false, error: error.error || 'Failed to confirm nonce' };
      }

      console.log('✅ [NonceManager] Nonce confirmed');
      return { success: true };
    } catch (error) {
      console.error('❌ [NonceManager] Confirm nonce error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Release a reserved nonce (transaction cancelled or failed)
   * This frees up the nonce for reuse
   */
  static async releaseNonce(
    walletId: string,
    blockchain: string,
    nonce: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔓 [NonceManager] Releasing nonce...', { walletId, blockchain, nonce });

      const response = await fetch(`${this.API_BASE}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_id: walletId,
          blockchain,
          nonce
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [NonceManager] Failed to release nonce:', error);
        return { success: false, error: error.error || 'Failed to release nonce' };
      }

      console.log('✅ [NonceManager] Nonce released');
      return { success: true };
    } catch (error) {
      console.error('❌ [NonceManager] Release nonce error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get current nonce information for a wallet
   */
  static async getNonceInfo(
    walletId: string,
    blockchain: string
  ): Promise<{ current_nonce: number; pending_nonce: number } | null> {
    try {
      console.log('📊 [NonceManager] Getting nonce info...', { walletId, blockchain });

      const response = await fetch(`${this.API_BASE}/info?wallet_id=${walletId}&blockchain=${blockchain}`);

      if (!response.ok) {
        console.error('❌ [NonceManager] Failed to get nonce info');
        return null;
      }

      const result = await response.json();
      console.log('✅ [NonceManager] Nonce info retrieved:', result);
      
      return result.data;
    } catch (error) {
      console.error('❌ [NonceManager] Get nonce info error:', error);
      return null;
    }
  }

  /**
   * Fallback: Get nonce directly from blockchain (when backend is unavailable)
   */
  static async getFallbackNonce(
    provider: any,
    address: string
  ): Promise<number> {
    try {
      const nonce = await provider.getTransactionCount(address, 'pending');
      console.log('⚠️ [NonceManager] Using fallback nonce from blockchain:', nonce);
      return nonce;
    } catch (error) {
      console.error('❌ [NonceManager] Fallback nonce failed:', error);
      throw new Error('Failed to get nonce from blockchain');
    }
  }
}
