/**
 * Amount Rule Processor
 * Processes rules related to transaction amounts, limits, and thresholds
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

export class AmountRuleProcessor extends RuleProcessor {
  async process(
    rule: PolicyRule | PolicyRuleExtended,
    context: RuleEvaluationContext
  ): Promise<RuleResult> {
    const { operation } = context;
    const conditions: ConditionResult[] = [];
    
    // Type narrow to ensure we have RuleDetails - prefer details over conditions
    const extendedRule = rule as PolicyRuleExtended;
    const ruleDetails: RuleDetails | undefined = extendedRule.details || 
      (!Array.isArray(rule.conditions) ? rule.conditions as RuleDetails : undefined);

    this.log('Processing amount rule', { rule: rule.name, operation: operation.type });

    // Process max amount condition
    if (ruleDetails?.maxAmount) {
      const maxAmount = BigInt(ruleDetails.maxAmount);
      const operationAmount = BigInt(operation.amount || 0);
      
      conditions.push(this.createCondition(
        'max_amount',
        operationAmount <= maxAmount,
        operationAmount.toString(),
        maxAmount.toString(),
        `Amount ${operationAmount} vs limit ${maxAmount}`
      ));
    }

    // Process min amount condition
    if (ruleDetails?.minAmount) {
      const minAmount = BigInt(ruleDetails.minAmount);
      const operationAmount = BigInt(operation.amount || 0);
      
      conditions.push(this.createCondition(
        'min_amount',
        operationAmount >= minAmount,
        operationAmount.toString(),
        minAmount.toString(),
        `Amount ${operationAmount} vs minimum ${minAmount}`
      ));
    }

    // Process daily limit
    if (ruleDetails?.dailyLimit) {
      const dailyTotal = await this.getDailyTotal(context);
      const limit = BigInt(ruleDetails.dailyLimit);
      const newTotal = dailyTotal + BigInt(operation.amount || 0);
      
      conditions.push(this.createCondition(
        'daily_limit',
        newTotal <= limit,
        newTotal.toString(),
        limit.toString(),
        `Daily total ${newTotal} vs limit ${limit}`
      ));
    }

    // Process weekly limit
    if (ruleDetails?.weeklyLimit) {
      const weeklyTotal = await this.getWeeklyTotal(context);
      const limit = BigInt(ruleDetails.weeklyLimit);
      const newTotal = weeklyTotal + BigInt(operation.amount || 0);
      
      conditions.push(this.createCondition(
        'weekly_limit',
        newTotal <= limit,
        newTotal.toString(),
        limit.toString(),
        `Weekly total ${newTotal} vs limit ${limit}`
      ));
    }

    // Process monthly limit
    if (ruleDetails?.monthlyLimit) {
      const monthlyTotal = await this.getMonthlyTotal(context);
      const limit = BigInt(ruleDetails.monthlyLimit);
      const newTotal = monthlyTotal + BigInt(operation.amount || 0);
      
      conditions.push(this.createCondition(
        'monthly_limit',
        newTotal <= limit,
        newTotal.toString(),
        limit.toString(),
        `Monthly total ${newTotal} vs limit ${limit}`
      ));
    }

    // Check cumulative volume thresholds
    if (context.globalState?.totalVolumeToday !== undefined && ruleDetails?.volumeThreshold) {
      const threshold = BigInt(ruleDetails.volumeThreshold);
      const currentVolume = context.globalState.totalVolumeToday;
      
      conditions.push(this.createCondition(
        'volume_threshold',
        currentVolume <= threshold,
        currentVolume.toString(),
        threshold.toString(),
        `Current volume ${currentVolume} vs threshold ${threshold}`
      ));
    }

    return this.buildResult(rule, conditions);
  }

  private async getDailyTotal(context: RuleEvaluationContext): Promise<bigint> {
    try {
      const operator = context.policyContext.user.address;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('token_operations')
        .select('amount')
        .eq('operator', operator)
        .eq('operation_type', context.operation.type)
        .gte('timestamp', startOfDay.toISOString());

      if (error) {
        console.error('Error fetching daily total:', error);
        return 0n;
      }

      return data?.reduce((sum, op) => sum + BigInt(op.amount || 0), 0n) || 0n;
    } catch (error) {
      console.error('Error calculating daily total:', error);
      return 0n;
    }
  }

  private async getWeeklyTotal(context: RuleEvaluationContext): Promise<bigint> {
    try {
      const operator = context.policyContext.user.address;
      const startOfWeek = new Date();
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('token_operations')
        .select('amount')
        .eq('operator', operator)
        .eq('operation_type', context.operation.type)
        .gte('timestamp', startOfWeek.toISOString());

      if (error) {
        console.error('Error fetching weekly total:', error);
        return 0n;
      }

      return data?.reduce((sum, op) => sum + BigInt(op.amount || 0), 0n) || 0n;
    } catch (error) {
      console.error('Error calculating weekly total:', error);
      return 0n;
    }
  }

  private async getMonthlyTotal(context: RuleEvaluationContext): Promise<bigint> {
    try {
      const operator = context.policyContext.user.address;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('token_operations')
        .select('amount')
        .eq('operator', operator)
        .eq('operation_type', context.operation.type)
        .gte('timestamp', startOfMonth.toISOString());

      if (error) {
        console.error('Error fetching monthly total:', error);
        return 0n;
      }

      return data?.reduce((sum, op) => sum + BigInt(op.amount || 0), 0n) || 0n;
    } catch (error) {
      console.error('Error calculating monthly total:', error);
      return 0n;
    }
  }
}
