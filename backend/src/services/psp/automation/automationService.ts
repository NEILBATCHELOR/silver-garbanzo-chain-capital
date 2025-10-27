/**
 * PSP Automation Service
 * 
 * Orchestrates automated payment flows based on configuration settings.
 * 
 * Features:
 * - Automated on-ramp (USD → Crypto)
 * - Automated off-ramp (Crypto → USD)
 * - Scheduled payment processing
 * - Deposit monitoring and auto-conversion
 * - Withdrawal automation
 * 
 * This service integrates with:
 * - Settings Service (configuration)
 * - Balance Service (balance checks)
 * - Trade Service (currency conversion)
 * - Payment Service (fund transfers)
 */

import { BaseService, ServiceResult } from '@/services/BaseService';
import { SettingsService } from './settingsService';
import { BalanceService } from '../accounts/balanceService';
import { TradeService } from '../payments/tradeService';
import { PaymentService } from '../payments/paymentService';
import { getErrorMessage } from '@/utils/error-helpers';
import { decimalToString } from '@/utils/decimal-helpers';
import type {
  PSPEnvironment,
  CreateTradeRequest,
  CreateFiatPaymentRequest,
  CreateCryptoPaymentRequest
} from '@/types/psp';

export interface AutomationExecutionResult {
  executed: boolean;
  actions: Array<{
    type: 'trade' | 'payment';
    id: string;
    status: string;
    details: any;
  }>;
  errors: string[];
}

export interface DepositProcessingOptions {
  deposit_id?: string;
  amount: string;
  currency: string;
  network?: string;
}

export class AutomationService extends BaseService {
  private settingsService: SettingsService;
  private balanceService: BalanceService;
  private tradeService: TradeService;
  private paymentService: PaymentService;

  constructor() {
    super('PSPAutomation');
    this.settingsService = new SettingsService();
    this.balanceService = new BalanceService();
    this.tradeService = new TradeService();
    this.paymentService = new PaymentService();
  }

  /**
   * Process incoming deposit with automation
   * Automatically converts and/or transfers funds based on settings
   */
  async processIncomingDeposit(
    projectId: string,
    deposit: DepositProcessingOptions,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<AutomationExecutionResult>> {
    try {
      const result: AutomationExecutionResult = {
        executed: false,
        actions: [],
        errors: []
      };

      // Get automation settings
      const settingsResult = await this.settingsService.getSettings(projectId);

      if (!settingsResult.success || !settingsResult.data) {
        result.errors.push('Failed to load automation settings');
        return this.success(result);
      }

      const settings = settingsResult.data;

      // Check if automation is enabled
      if (!settings.automation_enabled) {
        this.logInfo('Automation disabled, skipping processing', { projectId });
        return this.success(result);
      }

      // Determine if this is fiat or crypto deposit
      const isFiatDeposit = deposit.currency === 'USD' || deposit.currency === 'usd';

      if (isFiatDeposit && settings.onramp_enabled) {
        // On-ramp: USD → Crypto
        return this.executeOnRamp(projectId, deposit, settings, environment, result);
      } else if (!isFiatDeposit && settings.offramp_enabled) {
        // Off-ramp: Crypto → USD
        return this.executeOffRamp(projectId, deposit, settings, environment, result);
      }

      result.executed = false;
      return this.success(result);
    } catch (error) {
      return this.handleError('Failed to process incoming deposit', error);
    }
  }

  /**
   * Execute on-ramp automation (USD → Crypto)
   */
  private async executeOnRamp(
    projectId: string,
    deposit: DepositProcessingOptions,
    settings: any,
    environment: PSPEnvironment,
    result: AutomationExecutionResult
  ): Promise<ServiceResult<AutomationExecutionResult>> {
    try {
      this.logInfo('Executing on-ramp automation', {
        projectId,
        amount: deposit.amount,
        targetAsset: settings.onramp_target_asset
      });

      // Step 1: Trade USD to target crypto
      const tradeRequest: CreateTradeRequest = {
        project_id: projectId,
        source: {
          symbol: 'USD',
          amount: deposit.amount
        },
        destination: {
          symbol: settings.onramp_target_asset,
          network: settings.onramp_target_network
        }
      };

      const tradeResult = await this.tradeService.executeTrade(
        tradeRequest,
        environment
      );

      if (!tradeResult.success || !tradeResult.data) {
        result.errors.push('Failed to execute trade');
        return this.success(result);
      }

      result.actions.push({
        type: 'trade',
        id: tradeResult.data.id,
        status: tradeResult.data.status,
        details: {
          from: 'USD',
          to: settings.onramp_target_asset,
          amount: deposit.amount
        }
      });

      // Step 2: If withdrawal frequency is continuous, transfer crypto immediately
      if (settings.withdrawal_frequency === 'continuous' && settings.onramp_target_wallet_id) {
        await this.executeCryptoWithdrawal(
          projectId,
          tradeResult.data.id,
          settings.onramp_target_wallet_id,
          environment,
          result
        );
      }

      result.executed = true;
      return this.success(result);
    } catch (error) {
      result.errors.push(`On-ramp failed: ${getErrorMessage(error)}`);
      return this.success(result);
    }
  }

  /**
   * Execute off-ramp automation (Crypto → USD)
   */
  private async executeOffRamp(
    projectId: string,
    deposit: DepositProcessingOptions,
    settings: any,
    environment: PSPEnvironment,
    result: AutomationExecutionResult
  ): Promise<ServiceResult<AutomationExecutionResult>> {
    try {
      this.logInfo('Executing off-ramp automation', {
        projectId,
        amount: deposit.amount,
        sourceCurrency: deposit.currency
      });

      // Step 1: Trade crypto to USD
      const tradeRequest: CreateTradeRequest = {
        project_id: projectId,
        source: {
          symbol: deposit.currency,
          network: deposit.network,
          amount: deposit.amount
        },
        destination: {
          symbol: 'USD'
        }
      };

      const tradeResult = await this.tradeService.executeTrade(
        tradeRequest,
        environment
      );

      if (!tradeResult.success || !tradeResult.data) {
        result.errors.push('Failed to execute trade');
        return this.success(result);
      }

      result.actions.push({
        type: 'trade',
        id: tradeResult.data.id,
        status: tradeResult.data.status,
        details: {
          from: deposit.currency,
          to: 'USD',
          amount: deposit.amount
        }
      });

      // Step 2: If withdrawal frequency is continuous, transfer USD immediately
      if (settings.withdrawal_frequency === 'continuous' && settings.offramp_target_account_id) {
        await this.executeFiatWithdrawal(
          projectId,
          tradeResult.data.id,
          settings.offramp_target_account_id,
          settings.default_fiat_rail,
          environment,
          result
        );
      }

      result.executed = true;
      return this.success(result);
    } catch (error) {
      result.errors.push(`Off-ramp failed: ${getErrorMessage(error)}`);
      return this.success(result);
    }
  }

  /**
   * Execute scheduled withdrawals
   * Processes pending withdrawals based on frequency settings
   */
  async executeScheduledWithdrawals(
    projectId: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<AutomationExecutionResult>> {
    try {
      const result: AutomationExecutionResult = {
        executed: false,
        actions: [],
        errors: []
      };

      // Get settings
      const settingsResult = await this.settingsService.getSettings(projectId);

      if (!settingsResult.success || !settingsResult.data) {
        result.errors.push('Failed to load settings');
        return this.success(result);
      }

      const settings = settingsResult.data;

      // Only process if not continuous (continuous withdrawals happen immediately)
      if (settings.withdrawal_frequency === 'continuous') {
        return this.success(result);
      }

      // Check if it's time to process based on frequency
      const shouldProcess = await this.shouldProcessWithdrawals(
        projectId,
        settings.withdrawal_frequency
      );

      if (!shouldProcess) {
        this.logInfo('Not time to process scheduled withdrawals', {
          projectId,
          frequency: settings.withdrawal_frequency
        });
        return this.success(result);
      }

      // Get available balances
      const balancesResult = await this.balanceService.getBalances(projectId);

      if (!balancesResult.success || !balancesResult.data) {
        result.errors.push('Failed to fetch balances');
        return this.success(result);
      }

      // Process each balance type
      for (const balance of balancesResult.data) {
        const available = parseFloat(balance.available_balance);

        if (available <= 0) continue;

        // Fiat withdrawal
        if (balance.asset_type === 'fiat' && settings.offramp_target_account_id) {
          await this.executeFiatWithdrawal(
            projectId,
            balance.id,
            settings.offramp_target_account_id,
            settings.default_fiat_rail,
            environment,
            result
          );
        }

        // Crypto withdrawal
        if (balance.asset_type === 'crypto' && settings.onramp_target_wallet_id) {
          await this.executeCryptoWithdrawal(
            projectId,
            balance.id,
            settings.onramp_target_wallet_id,
            environment,
            result
          );
        }
      }

      result.executed = result.actions.length > 0;
      return this.success(result);
    } catch (error) {
      return this.handleError('Failed to execute scheduled withdrawals', error);
    }
  }

  /**
   * Manual trigger for automation (used for testing or forced execution)
   */
  async triggerAutomation(
    projectId: string,
    action: 'onramp' | 'offramp' | 'scheduled',
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<AutomationExecutionResult>> {
    try {
      const result: AutomationExecutionResult = {
        executed: false,
        actions: [],
        errors: []
      };

      // Get current balances
      const balancesResult = await this.balanceService.getBalances(projectId);

      if (!balancesResult.success || !balancesResult.data) {
        result.errors.push('Failed to fetch balances');
        return this.success(result);
      }

      const balances = balancesResult.data;

      // Get settings
      const settingsResult = await this.settingsService.getSettings(projectId);

      if (!settingsResult.success || !settingsResult.data) {
        result.errors.push('Failed to load settings');
        return this.success(result);
      }

      const settings = settingsResult.data;

      // Execute based on action type
      switch (action) {
        case 'onramp': {
          const usdBalance = balances.find(b => b.asset_symbol === 'USD');
          if (usdBalance && parseFloat(usdBalance.available_balance) > 0) {
            await this.executeOnRamp(
              projectId,
              {
                amount: usdBalance.available_balance,
                currency: 'USD'
              },
              settings,
              environment,
              result
            );
          }
          break;
        }

        case 'offramp': {
          // Find crypto balances
          const cryptoBalances = balances.filter(b => b.asset_type === 'crypto');
          for (const balance of cryptoBalances) {
            if (parseFloat(balance.available_balance) > 0) {
              await this.executeOffRamp(
                projectId,
                {
                  amount: balance.available_balance,
                  currency: balance.asset_symbol,
                  network: balance.network || undefined
                },
                settings,
                environment,
                result
              );
            }
          }
          break;
        }

        case 'scheduled': {
          return this.executeScheduledWithdrawals(projectId, environment);
        }
      }

      result.executed = result.actions.length > 0;
      return this.success(result);
    } catch (error) {
      return this.handleError('Failed to trigger automation', error);
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Execute fiat withdrawal
   */
  private async executeFiatWithdrawal(
    projectId: string,
    sourceId: string,
    targetAccountId: string,
    paymentRail: string,
    environment: PSPEnvironment,
    result: AutomationExecutionResult
  ): Promise<void> {
    try {
      // Get balance to determine amount
      const balance = await this.db.psp_balances.findUnique({
        where: { id: sourceId }
      });

      if (!balance || !balance.available_balance || parseFloat(balance.available_balance.toString()) <= 0) {
        return;
      }

      const paymentRequest: CreateFiatPaymentRequest = {
        project_id: projectId,
        source: {
          wallet_id: sourceId
        },
        destination: {
          external_account_id: targetAccountId
        },
        amount: decimalToString(balance.available_balance),
        payment_rail: paymentRail as any,
        memo: 'Automated withdrawal'
      };

      const paymentResult = await this.paymentService.createFiatPayment(
        paymentRequest,
        environment
      );

      if (paymentResult.success && paymentResult.data) {
        result.actions.push({
          type: 'payment',
          id: paymentResult.data.id,
          status: paymentResult.data.status,
          details: {
            type: 'fiat',
            amount: balance.available_balance,
            rail: paymentRail
          }
        });
      } else {
        result.errors.push('Failed to create fiat payment');
      }
    } catch (error) {
      result.errors.push(`Fiat withdrawal error: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Execute crypto withdrawal
   */
  private async executeCryptoWithdrawal(
    projectId: string,
    sourceId: string,
    targetWalletId: string,
    environment: PSPEnvironment,
    result: AutomationExecutionResult
  ): Promise<void> {
    try {
      // Get balance to determine amount
      const balance = await this.db.psp_balances.findUnique({
        where: { id: sourceId }
      });

      if (!balance || !balance.available_balance || parseFloat(balance.available_balance.toString()) <= 0) {
        return;
      }

      const paymentRequest: CreateCryptoPaymentRequest = {
        project_id: projectId,
        source: {
          wallet_id: sourceId
        },
        destination: {
          external_account_id: targetWalletId
        },
        amount: decimalToString(balance.available_balance),
        asset: balance.asset_symbol,
        network: balance.network || 'ethereum',
        memo: 'Automated withdrawal'
      };

      const paymentResult = await this.paymentService.createCryptoPayment(
        paymentRequest,
        environment
      );

      if (paymentResult.success && paymentResult.data) {
        result.actions.push({
          type: 'payment',
          id: paymentResult.data.id,
          status: paymentResult.data.status,
          details: {
            type: 'crypto',
            amount: balance.available_balance,
            asset: balance.asset_symbol
          }
        });
      } else {
        result.errors.push('Failed to create crypto payment');
      }
    } catch (error) {
      result.errors.push(`Crypto withdrawal error: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Check if scheduled withdrawals should be processed
   */
  private async shouldProcessWithdrawals(
    projectId: string,
    frequency: string
  ): Promise<boolean> {
    try {
      // Get last withdrawal time
      const lastPayment = await this.db.psp_payments.findFirst({
        where: {
          project_id: projectId,
          memo: 'Automated withdrawal'
        },
        orderBy: { created_at: 'desc' }
      });

      if (!lastPayment || !lastPayment.created_at) {
        return true; // Never processed before or no creation date
      }

      const now = new Date();
      const lastDate = new Date(lastPayment.created_at);
      const hoursSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

      switch (frequency) {
        case 'daily':
          return hoursSince >= 24;
        case 'weekly':
          return hoursSince >= 168; // 7 days
        case 'on_demand':
        case 'continuous':
        default:
          return false;
      }
    } catch (error) {
      this.logError('Error checking withdrawal schedule', error);
      return false;
    }
  }
}

export default AutomationService;
