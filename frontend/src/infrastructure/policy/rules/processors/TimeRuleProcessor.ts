/**
 * Time Rule Processor
 * Processes rules related to time windows, blackout periods, and frequency limits
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

export class TimeRuleProcessor extends RuleProcessor {
  async process(
    rule: PolicyRule | PolicyRuleExtended,
    context: RuleEvaluationContext
  ): Promise<RuleResult> {
    const conditions: ConditionResult[] = [];
    const now = new Date();
    
    // Use details if available, otherwise use conditions if it's an object
    const extendedRule = rule as PolicyRuleExtended;
    const ruleDetails = extendedRule.details || 
      (rule.conditions && !Array.isArray(rule.conditions) ? rule.conditions as RuleDetails : {});

    this.log('Processing time rule', { rule: rule.name, currentTime: now.toISOString() });

    // Check allowed hours
    if (ruleDetails?.allowedHours) {
      const currentHour = now.getHours();
      const { start, end } = ruleDetails.allowedHours;
      
      const isInWindow = start <= end 
        ? currentHour >= start && currentHour <= end
        : currentHour >= start || currentHour <= end; // Handle overnight windows
      
      conditions.push(this.createCondition(
        'time_window',
        isInWindow,
        currentHour.toString(),
        `${start}-${end}`,
        `Operation at ${currentHour}:00 (allowed: ${start}-${end})`
      ));
    }

    // Check blackout dates
    if (ruleDetails?.blackoutDates && ruleDetails.blackoutDates.length > 0) {
      const today = now.toISOString().split('T')[0];
      const isBlackout = ruleDetails.blackoutDates.includes(today);
      
      conditions.push(this.createCondition(
        'blackout_period',
        !isBlackout,
        today,
        'not blackout',
        isBlackout ? 'Operation during blackout period' : 'Not in blackout period'
      ));
    }

    // Check maintenance windows
    if (ruleDetails?.maintenanceWindows && ruleDetails.maintenanceWindows.length > 0) {
      const inMaintenance = this.isInMaintenanceWindow(now, ruleDetails.maintenanceWindows);
      
      conditions.push(this.createCondition(
        'maintenance_window',
        !inMaintenance,
        now.toISOString(),
        'not in maintenance',
        inMaintenance ? 'Operation during maintenance window' : 'Not in maintenance'
      ));
    }

    // Check hourly operation limits
    if (ruleDetails?.maxOperationsPerHour) {
      const hourlyCount = await this.getHourlyOperationCount(context);
      const limit = ruleDetails.maxOperationsPerHour;
      
      conditions.push(this.createCondition(
        'hourly_frequency',
        hourlyCount < limit,
        hourlyCount.toString(),
        limit.toString(),
        `${hourlyCount} operations this hour (max: ${limit})`
      ));
    }

    // Check daily operation limits
    if (ruleDetails?.maxOperationsPerDay) {
      const dailyCount = await this.getDailyOperationCount(context);
      const limit = ruleDetails.maxOperationsPerDay;
      
      conditions.push(this.createCondition(
        'daily_frequency',
        dailyCount < limit,
        dailyCount.toString(),
        limit.toString(),
        `${dailyCount} operations today (max: ${limit})`
      ));
    }

    // Check cooldown period
    if (ruleDetails?.cooldownPeriod && context.globalState?.lastOperationTime) {
      const lastOpTime = context.globalState.lastOperationTime;
      const cooldownMs = ruleDetails.cooldownPeriod * 1000;
      const timeSinceLastOp = now.getTime() - lastOpTime.getTime();
      const cooldownExpired = timeSinceLastOp >= cooldownMs;
      
      conditions.push(this.createCondition(
        'cooldown_period',
        cooldownExpired,
        `${Math.floor(timeSinceLastOp / 1000)}s`,
        `${ruleDetails.cooldownPeriod}s`,
        cooldownExpired 
          ? 'Cooldown period has expired'
          : `Cooldown not expired (${Math.floor((cooldownMs - timeSinceLastOp) / 1000)}s remaining)`
      ));
    }

    // Check business hours (if defined)
    if (ruleDetails?.businessHoursOnly) {
      const isBusinessHours = this.isBusinessHours(now);
      
      conditions.push(this.createCondition(
        'business_hours',
        isBusinessHours,
        now.toTimeString().slice(0, 5),
        '09:00-17:00',
        isBusinessHours ? 'Within business hours' : 'Outside business hours'
      ));
    }

    return this.buildResult(rule, conditions);
  }

  private isInMaintenanceWindow(now: Date, windows: any[]): boolean {
    for (const window of windows) {
      const start = new Date(window.start);
      const end = new Date(window.end);
      
      if (now >= start && now <= end) {
        return true;
      }
    }
    return false;
  }

  private isBusinessHours(now: Date): boolean {
    const hour = now.getHours();
    const day = now.getDay();
    
    // Monday-Friday, 9 AM - 5 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
  }

  private async getHourlyOperationCount(context: RuleEvaluationContext): Promise<number> {
    try {
      const operator = context.policyContext.user.address;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('token_operations')
        .select('id')
        .eq('operator', operator)
        .eq('operation_type', context.operation.type)
        .gte('timestamp', oneHourAgo.toISOString());

      if (error) {
        console.error('Error fetching hourly operation count:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error calculating hourly operation count:', error);
      return 0;
    }
  }

  private async getDailyOperationCount(context: RuleEvaluationContext): Promise<number> {
    try {
      const operator = context.policyContext.user.address;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('token_operations')
        .select('id')
        .eq('operator', operator)
        .eq('operation_type', context.operation.type)
        .gte('timestamp', startOfDay.toISOString());

      if (error) {
        console.error('Error fetching daily operation count:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error calculating daily operation count:', error);
      return 0;
    }
  }
}
