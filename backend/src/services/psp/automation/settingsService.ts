/**
 * PSP Settings Service
 * 
 * Manages payment automation and configuration settings for PSP projects.
 * 
 * Features:
 * - Payment automation configuration (on/off)
 * - Withdrawal frequency settings (continuous, on-demand, daily, weekly)
 * - On-ramp configuration (USD → Crypto automation)
 * - Off-ramp configuration (Crypto → USD automation)
 * - Default payment rail selection
 * 
 * Settings are project-scoped and initialized with sensible defaults.
 */

import { BaseService, ServiceResult } from '@/services/BaseService';
import type { 
  PSPPaymentSettings,
  UpdatePaymentSettingsRequest,
  WithdrawalFrequency,
  PaymentRail
} from '@/types/psp';

export class SettingsService extends BaseService {
  constructor() {
    super('PSPSettings');
  }

  /**
   * Get payment settings for a project
   * Creates default settings if none exist
   */
  async getSettings(projectId: string): Promise<ServiceResult<PSPPaymentSettings>> {
    try {
      // Try to find existing settings
      let settings = await this.db.psp_payment_settings.findUnique({
        where: { project_id: projectId }
      });

      // If no settings exist, create defaults
      if (!settings) {
        this.logInfo(`Creating default payment settings for project ${projectId}`);
        
        const defaultSettings = this.createDefaultSettings(projectId);
        settings = await this.db.psp_payment_settings.create({
          data: defaultSettings
        });
      }

      return this.success(settings as PSPPaymentSettings);
    } catch (error) {
      return this.handleError('Failed to get payment settings', error);
    }
  }

  /**
   * Update payment settings for a project
   */
  async updateSettings(
    projectId: string,
    updates: UpdatePaymentSettingsRequest
  ): Promise<ServiceResult<PSPPaymentSettings>> {
    try {
      // Validate the updates
      const validation = this.validateSettings(updates);
      if (!validation.success) {
        return this.error(
          validation.error || 'Validation failed',
          validation.code || 'VALIDATION_ERROR',
          validation.statusCode || 400
        );
      }

      // Ensure settings exist for this project
      const existingResult = await this.getSettings(projectId);
      if (!existingResult.success) {
        return existingResult;
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date()
      };

      if (updates.automation_enabled !== undefined) {
        updateData.automation_enabled = updates.automation_enabled;
      }
      if (updates.withdrawal_frequency !== undefined) {
        updateData.withdrawal_frequency = updates.withdrawal_frequency;
      }
      if (updates.onramp_enabled !== undefined) {
        updateData.onramp_enabled = updates.onramp_enabled;
      }
      if (updates.onramp_target_asset !== undefined) {
        updateData.onramp_target_asset = updates.onramp_target_asset;
      }
      if (updates.onramp_target_network !== undefined) {
        updateData.onramp_target_network = updates.onramp_target_network;
      }
      if (updates.onramp_target_wallet_id !== undefined) {
        updateData.onramp_target_wallet_id = updates.onramp_target_wallet_id;
      }
      if (updates.offramp_enabled !== undefined) {
        updateData.offramp_enabled = updates.offramp_enabled;
      }
      if (updates.offramp_target_currency !== undefined) {
        updateData.offramp_target_currency = updates.offramp_target_currency;
      }
      if (updates.offramp_target_account_id !== undefined) {
        updateData.offramp_target_account_id = updates.offramp_target_account_id;
      }
      if (updates.default_fiat_rail !== undefined) {
        updateData.default_fiat_rail = updates.default_fiat_rail;
      }

      // Update in database
      const updatedSettings = await this.db.psp_payment_settings.update({
        where: { project_id: projectId },
        data: updateData
      });

      this.logInfo(`Payment settings updated for project ${projectId}`, {
        projectId,
        updatedFields: Object.keys(updateData)
      });

      return this.success(updatedSettings as PSPPaymentSettings);
    } catch (error) {
      return this.handleError('Failed to update payment settings', error);
    }
  }

  /**
   * Delete payment settings (rarely used - typically for cleanup)
   */
  async deleteSettings(projectId: string): Promise<ServiceResult<boolean>> {
    try {
      await this.db.psp_payment_settings.delete({
        where: { project_id: projectId }
      });

      this.logInfo(`Payment settings deleted for project ${projectId}`);
      return this.success(true);
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return this.error('Payment settings not found', 'NOT_FOUND', 404);
      }
      return this.handleError('Failed to delete payment settings', error);
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetToDefaults(projectId: string): Promise<ServiceResult<PSPPaymentSettings>> {
    try {
      const defaultSettings = this.createDefaultSettings(projectId);
      
      const resetSettings = await this.db.psp_payment_settings.upsert({
        where: { project_id: projectId },
        create: defaultSettings,
        update: {
          ...defaultSettings,
          updated_at: new Date()
        }
      });

      this.logInfo(`Payment settings reset to defaults for project ${projectId}`);
      return this.success(resetSettings as PSPPaymentSettings);
    } catch (error) {
      return this.handleError('Failed to reset payment settings', error);
    }
  }

  /**
   * Check if automation is enabled for a project
   */
  async isAutomationEnabled(projectId: string): Promise<ServiceResult<boolean>> {
    try {
      const settingsResult = await this.getSettings(projectId);
      if (!settingsResult.success || !settingsResult.data) {
        return this.error('Failed to check automation status', 'SETTINGS_ERROR');
      }

      return this.success(settingsResult.data.automation_enabled);
    } catch (error) {
      return this.handleError('Failed to check automation status', error);
    }
  }

  /**
   * Check if on-ramp automation is enabled
   */
  async isOnRampEnabled(projectId: string): Promise<ServiceResult<boolean>> {
    try {
      const settingsResult = await this.getSettings(projectId);
      if (!settingsResult.success || !settingsResult.data) {
        return this.error('Failed to check on-ramp status', 'SETTINGS_ERROR');
      }

      return this.success(settingsResult.data.onramp_enabled);
    } catch (error) {
      return this.handleError('Failed to check on-ramp status', error);
    }
  }

  /**
   * Check if off-ramp automation is enabled
   */
  async isOffRampEnabled(projectId: string): Promise<ServiceResult<boolean>> {
    try {
      const settingsResult = await this.getSettings(projectId);
      if (!settingsResult.success || !settingsResult.data) {
        return this.error('Failed to check off-ramp status', 'SETTINGS_ERROR');
      }

      return this.success(settingsResult.data.offramp_enabled);
    } catch (error) {
      return this.handleError('Failed to check off-ramp status', error);
    }
  }

  /**
   * Get on-ramp configuration
   */
  async getOnRampConfig(projectId: string): Promise<ServiceResult<{
    enabled: boolean;
    targetAsset?: string;
    targetNetwork?: string;
    targetWalletId?: string;
  }>> {
    try {
      const settingsResult = await this.getSettings(projectId);
      if (!settingsResult.success || !settingsResult.data) {
        return this.error('Failed to get on-ramp config', 'SETTINGS_ERROR');
      }

      const settings = settingsResult.data;
      return this.success({
        enabled: settings.onramp_enabled,
        targetAsset: settings.onramp_target_asset || undefined,
        targetNetwork: settings.onramp_target_network || undefined,
        targetWalletId: settings.onramp_target_wallet_id || undefined
      });
    } catch (error) {
      return this.handleError('Failed to get on-ramp config', error);
    }
  }

  /**
   * Get off-ramp configuration
   */
  async getOffRampConfig(projectId: string): Promise<ServiceResult<{
    enabled: boolean;
    targetCurrency?: string;
    targetAccountId?: string;
  }>> {
    try {
      const settingsResult = await this.getSettings(projectId);
      if (!settingsResult.success || !settingsResult.data) {
        return this.error('Failed to get off-ramp config', 'SETTINGS_ERROR');
      }

      const settings = settingsResult.data;
      return this.success({
        enabled: settings.offramp_enabled,
        targetCurrency: settings.offramp_target_currency || undefined,
        targetAccountId: settings.offramp_target_account_id || undefined
      });
    } catch (error) {
      return this.handleError('Failed to get off-ramp config', error);
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Create default settings for a new project
   */
  private createDefaultSettings(projectId: string): any {
    return {
      project_id: projectId,
      automation_enabled: false,
      withdrawal_frequency: 'on_demand' as WithdrawalFrequency,
      onramp_enabled: false,
      onramp_target_asset: null,
      onramp_target_network: null,
      onramp_target_wallet_id: null,
      offramp_enabled: false,
      offramp_target_currency: 'USD',
      offramp_target_account_id: null,
      default_fiat_rail: 'ach' as PaymentRail,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  /**
   * Validate settings update request
   */
  private validateSettings(
    settings: UpdatePaymentSettingsRequest
  ): ServiceResult<boolean> {
    // Validate withdrawal frequency
    if (settings.withdrawal_frequency) {
      const validFrequencies: WithdrawalFrequency[] = [
        'continuous',
        'on_demand',
        'daily',
        'weekly'
      ];
      if (!validFrequencies.includes(settings.withdrawal_frequency)) {
        return this.error(
          `Invalid withdrawal frequency: ${settings.withdrawal_frequency}`,
          'VALIDATION_ERROR',
          400
        );
      }
    }

    // Validate default fiat rail
    if (settings.default_fiat_rail) {
      const validRails: PaymentRail[] = ['ach', 'wire', 'rtp', 'fednow', 'push_to_card'];
      if (!validRails.includes(settings.default_fiat_rail)) {
        return this.error(
          `Invalid payment rail: ${settings.default_fiat_rail}`,
          'VALIDATION_ERROR',
          400
        );
      }
    }

    // Validate on-ramp configuration
    if (settings.onramp_enabled) {
      if (!settings.onramp_target_asset) {
        return this.error(
          'On-ramp target asset is required when on-ramp is enabled',
          'VALIDATION_ERROR',
          400
        );
      }
      if (!settings.onramp_target_network) {
        return this.error(
          'On-ramp target network is required when on-ramp is enabled',
          'VALIDATION_ERROR',
          400
        );
      }
    }

    // Validate off-ramp configuration
    if (settings.offramp_enabled) {
      if (!settings.offramp_target_account_id) {
        return this.error(
          'Off-ramp target account is required when off-ramp is enabled',
          'VALIDATION_ERROR',
          400
        );
      }
    }

    return this.success(true);
  }
}

export default SettingsService;
