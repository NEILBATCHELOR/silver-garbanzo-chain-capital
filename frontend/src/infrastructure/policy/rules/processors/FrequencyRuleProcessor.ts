/**
 * Frequency Rule Processor
 * Processes rules related to transaction frequency, rate limiting, and cooldown periods
 */

import { RuleProcessor } from './RuleProcessor';
import { supabase } from '@/infrastructure/database/client';
import type { PolicyRule } from '@/services/rule/enhancedRuleService';
import type { 
  RuleEvaluationContext, 
  RuleResult, 
  ConditionResult,
  PolicyRuleExtended,
  RuleDetails
} from '../types';

export class FrequencyRuleProcessor extends RuleProcessor {
  async process(
    rule: PolicyRule | PolicyRuleExtended,
    context: RuleEvaluationContext
  ): Promise<RuleResult> {
    const { operation, policyContext, globalState } = context;
    const conditions: ConditionResult[] = [];
    
    // Use details if available, otherwise use conditions if it's an object
    const extendedRule = rule as PolicyRuleExtended;
    const ruleDetails = extendedRule.details || 
      (rule.conditions && !Array.isArray(rule.conditions) ? rule.conditions as RuleDetails : {});

    this.log('Processing frequency rule', { rule: rule.name, operation: operation.type });

    // Check cooldown period between transactions
    if (ruleDetails?.cooldownPeriod) {
      const cooldownSeconds = ruleDetails.cooldownPeriod;
      const lastOpTime = globalState?.lastOperationTime;
      
      if (lastOpTime) {
        const timeSinceLastOp = Date.now() - lastOpTime.getTime();
        const cooldownMs = cooldownSeconds * 1000;
        const cooldownMet = timeSinceLastOp >= cooldownMs;
        
        conditions.push(this.createCondition(
          'cooldown_period',
          cooldownMet,
          `${Math.floor(timeSinceLastOp / 1000)}s`,
          `${cooldownSeconds}s`,
          cooldownMet 
            ? 'Cooldown period satisfied'
            : `Must wait ${Math.ceil((cooldownMs - timeSinceLastOp) / 1000)}s more`
        ));
      }
    }

    // Check maximum transactions per period
    if (ruleDetails?.maxTransactionsPerPeriod && ruleDetails?.periodDuration) {
      const txCount = await this.getTransactionCountInPeriod(
        context,
        ruleDetails.periodDuration
      );
      const limit = ruleDetails.maxTransactionsPerPeriod;
      
      conditions.push(this.createCondition(
        'transaction_frequency',
        txCount < limit,
        txCount.toString(),
        limit.toString(),
        `${txCount} transactions in last ${ruleDetails.periodDuration}s (max: ${limit})`
      ));
    }

    // Check burst limit (transactions in short window)
    if (ruleDetails?.burstLimit && ruleDetails?.burstWindow) {
      const burstCount = await this.getTransactionCountInPeriod(
        context,
        ruleDetails.burstWindow
      );
      const limit = ruleDetails.burstLimit;
      
      conditions.push(this.createCondition(
        'burst_limit',
        burstCount < limit,
        burstCount.toString(),
        limit.toString(),
        `${burstCount} transactions in ${ruleDetails.burstWindow}s burst window (max: ${limit})`
      ));
    }

    // Check rolling window limits
    if (ruleDetails?.rollingWindowLimit && ruleDetails?.rollingWindowDuration) {
      const windowCount = await this.getRollingWindowCount(
        context,
        ruleDetails.rollingWindowDuration
      );
      const limit = ruleDetails.rollingWindowLimit;
      
      conditions.push(this.createCondition(
        'rolling_window',
        windowCount < limit,
        windowCount.toString(),
        limit.toString(),
        `${windowCount} transactions in rolling ${ruleDetails.rollingWindowDuration}s window (max: ${limit})`
      ));
    }

    // Check unique recipients per period
    if (ruleDetails?.maxUniqueRecipientsPerPeriod && ruleDetails?.uniqueRecipientPeriod) {
      const uniqueRecipients = await this.getUniqueRecipientsInPeriod(
        context,
        ruleDetails.uniqueRecipientPeriod
      );
      const limit = ruleDetails.maxUniqueRecipientsPerPeriod;
      
      conditions.push(this.createCondition(
        'unique_recipients',
        uniqueRecipients.length <= limit,
        uniqueRecipients.length.toString(),
        limit.toString(),
        `${uniqueRecipients.length} unique recipients in ${ruleDetails.uniqueRecipientPeriod}s (max: ${limit})`
      ));
    }

    return this.buildResult(rule, conditions);
  }

  private async getTransactionCountInPeriod(
    context: RuleEvaluationContext,
    periodSeconds: number
  ): Promise<number> {
    try {
      const operator = context.policyContext.user.address;
      const periodStart = new Date(Date.now() - periodSeconds * 1000);

      const { data, error } = await supabase
        .from('token_operations')
        .select('id')
        .eq('operator', operator)
        .eq('operation_type', context.operation.type)
        .gte('timestamp', periodStart.toISOString());

      if (error) {
        console.error('Error fetching transaction count:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error calculating transaction count:', error);
      return 0;
    }
  }

  private async getRollingWindowCount(
    context: RuleEvaluationContext,
    windowSeconds: number
  ): Promise<number> {
    // Rolling window is same as period count but with continuous sliding window
    return this.getTransactionCountInPeriod(context, windowSeconds);
  }

  private async getUniqueRecipientsInPeriod(
    context: RuleEvaluationContext,
    periodSeconds: number
  ): Promise<string[]> {
    try {
      const operator = context.policyContext.user.address;
      const periodStart = new Date(Date.now() - periodSeconds * 1000);

      const { data, error } = await supabase
        .from('token_operations')
        .select('recipient')
        .eq('operator', operator)
        .eq('operation_type', 'transfer')
        .gte('timestamp', periodStart.toISOString())
        .not('recipient', 'is', null);

      if (error) {
        console.error('Error fetching unique recipients:', error);
        return [];
      }

      // Get unique recipients - filter nulls and ensure string type
      const recipients: string[] = data
        ?.map(d => d.recipient)
        .filter((r): r is string => r !== null && typeof r === 'string') || [];
      const uniqueRecipients: string[] = [...new Set(recipients)];
      return uniqueRecipients;
    } catch (error) {
      console.error('Error calculating unique recipients:', error);
      return [];
    }
  }
}
