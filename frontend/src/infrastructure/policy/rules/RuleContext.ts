/**
 * Rule Context - Enhanced
 * Strategic context and state management for rule evaluation with comprehensive risk scoring
 */

import { supabase } from '@/infrastructure/database/client';
import type { 
  RuleEvaluationContext, 
  GlobalRuleState,
  ComplianceStatus,
  MarketConditions,
  RiskFactors,
  UserProfile
} from './types';
import type { CryptoOperation, PolicyContext } from '../PolicyEngine';

interface StateCache {
  data: any;
  timestamp: number;
  ttl: number;
}

export class RuleContext {
  private stateCache: Map<string, StateCache> = new Map();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // Risk scoring weights
  private readonly RISK_WEIGHTS = {
    operationFrequency: 0.15,
    volumePattern: 0.20,
    addressReputation: 0.15,
    complianceStatus: 0.25,
    marketConditions: 0.10,
    historicalBehavior: 0.15
  };

  /**
   * Build comprehensive rule evaluation context
   */
  async buildContext(
    operation: CryptoOperation,
    policyContext: PolicyContext
  ): Promise<RuleEvaluationContext> {
    const globalState = await this.getGlobalState(policyContext.user.address);
    const userProfile = await this.getUserProfile(policyContext.user.address);
    const riskFactors = await this.calculateRiskFactors(operation, policyContext);
    
    return {
      operation,
      policyContext,
      previousEvaluations: [],
      globalState,
      userProfile,
      riskFactors,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get enhanced global rule state for evaluation
   */
  async getGlobalState(userAddress: string): Promise<GlobalRuleState> {
    const cacheKey = `global:${userAddress}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Parallel fetching for performance
    const [
      dailyOperationCount,
      weeklyOperationCount,
      monthlyOperationCount,
      totalVolumeToday,
      totalVolumeWeek,
      totalVolumeMonth,
      lastOperationTime,
      userRiskScore,
      complianceStatus,
      marketConditions,
      operationHistory
    ] = await Promise.all([
      this.getDailyOperationCount(userAddress),
      this.getWeeklyOperationCount(userAddress),
      this.getMonthlyOperationCount(userAddress),
      this.getTotalVolume(userAddress, 'day'),
      this.getTotalVolume(userAddress, 'week'),
      this.getTotalVolume(userAddress, 'month'),
      this.getLastOperationTime(userAddress),
      this.calculateUserRiskScore(userAddress),
      this.getComplianceStatus(userAddress),
      this.getMarketConditions(),
      this.getOperationHistory(userAddress)
    ]);

    const state: GlobalRuleState = {
      dailyOperationCount,
      weeklyOperationCount,
      monthlyOperationCount,
      totalVolumeToday,
      totalVolumeWeek,
      totalVolumeMonth,
      lastOperationTime,
      userRiskScore,
      regulatoryCompliance: complianceStatus,
      marketConditions,
      operationHistory,
      averageTransactionSize: this.calculateAverageTransactionSize(operationHistory),
      velocityScore: this.calculateVelocityScore(operationHistory),
      blacklistStatus: await this.checkBlacklists(userAddress)
    };

    this.setCache(cacheKey, state, this.DEFAULT_CACHE_TTL);
    return state;
  }

  /**
   * Get comprehensive user profile with risk indicators
   */
  private async getUserProfile(userAddress: string): Promise<UserProfile> {
    const cacheKey = `profile:${userAddress}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('address', userAddress)
      .single();

    const profile: UserProfile = {
      address: userAddress,
      kycLevel: userData?.kyc_level || 0,
      amlStatus: userData?.aml_status || 'pending',
      riskTier: userData?.risk_tier || 'medium',
      accountAge: this.calculateAccountAge(userData?.created_at),
      totalTransactions: await this.getTotalTransactionCount(userAddress),
      totalVolume: await this.getTotalHistoricalVolume(userAddress),
      flags: userData?.flags || [],
      restrictions: userData?.restrictions || [],
      whitelistStatus: userData?.whitelist_status || false,
      lastActivityDate: userData?.last_activity || new Date().toISOString()
    };

    this.setCache(cacheKey, profile, this.DEFAULT_CACHE_TTL * 2);
    return profile;
  }

  /**
   * Calculate comprehensive risk factors
   */
  private async calculateRiskFactors(
    operation: CryptoOperation,
    policyContext: PolicyContext
  ): Promise<RiskFactors> {
    const userAddress = policyContext.user.address;
    
    const [
      transactionRisk,
      addressRisk,
      patternRisk,
      complianceRisk,
      marketRisk
    ] = await Promise.all([
      this.assessTransactionRisk(operation),
      this.assessAddressRisk(operation.from, operation.to),
      this.assessPatternRisk(userAddress, operation),
      this.assessComplianceRisk(userAddress),
      this.assessMarketRisk(operation)
    ]);

    const overallRisk = this.calculateOverallRisk({
      transactionRisk,
      addressRisk,
      patternRisk,
      complianceRisk,
      marketRisk
    });

    return {
      transactionRisk,
      addressRisk,
      patternRisk,
      complianceRisk,
      marketRisk,
      overallRisk,
      riskLevel: this.getRiskLevel(overallRisk),
      mitigationFactors: await this.getMitigationFactors(userAddress),
      timestamp: Date.now()
    };
  }

  /**
   * Assess transaction-specific risk
   */
  private async assessTransactionRisk(operation: CryptoOperation): Promise<number> {
    let risk = 0;
    
    // Large transaction risk
    if (operation.amount) {
      const amount = BigInt(operation.amount);
      const threshold = await this.getTransactionThreshold();
      
      if (amount > threshold * 10n) risk += 40;
      else if (amount > threshold * 5n) risk += 25;
      else if (amount > threshold) risk += 10;
    }
    
    // Operation type risk
    const riskByType = {
      mint: 15,
      burn: 10,
      transfer: 5,
      lock: 8,
      unlock: 8,
      block: 20,
      unblock: 15
    };
    
    risk += riskByType[operation.type] || 5;
    
    // Time-based risk (unusual hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) risk += 5;
    
    return Math.min(risk, 100);
  }

  /**
   * Assess address-related risk
   */
  private async assessAddressRisk(from?: string, to?: string): Promise<number> {
    let risk = 0;
    
    if (from) {
      const fromRisk = await this.getAddressRiskScore(from);
      risk += fromRisk * 0.4;
    }
    
    if (to) {
      const toRisk = await this.getAddressRiskScore(to);
      risk += toRisk * 0.6; // Recipient risk weighted higher
    }
    
    return Math.min(risk, 100);
  }

  /**
   * Get address risk score from various sources
   */
  private async getAddressRiskScore(address: string): Promise<number> {
    let score = 0;
    
    // Check internal blacklist
    const { data: blacklisted } = await supabase
      .from('address_blacklist')
      .select('risk_level')
      .eq('address', address)
      .single();
    
    if (blacklisted) {
      score += blacklisted.risk_level === 'critical' ? 100 : 50;
    }
    
    // Check suspicious activity
    const { data: violations } = await supabase
      .from('policy_violations')
      .select('severity')
      .eq('user_address', address)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
    
    if (violations && violations.length > 0) {
      score += Math.min(violations.length * 10, 50);
    }
    
    // Check if newly created address
    const { data: firstTx } = await supabase
      .from('token_operations')
      .select('timestamp')
      .eq('operator', address)
      .order('timestamp', { ascending: true })
      .limit(1);
    
    if (!firstTx || firstTx.length === 0) {
      score += 20; // New address risk
    } else {
      const age = Date.now() - new Date(firstTx[0].timestamp).getTime();
      if (age < 7 * 86400000) score += 15; // Less than 7 days old
      else if (age < 30 * 86400000) score += 10; // Less than 30 days old
    }
    
    return Math.min(score, 100);
  }

  /**
   * Assess pattern-based risk
   */
  private async assessPatternRisk(userAddress: string, operation: CryptoOperation): Promise<number> {
    let risk = 0;
    
    // Get recent operations
    const { data: recentOps } = await supabase
      .from('token_operations')
      .select('*')
      .eq('operator', userAddress)
      .gte('timestamp', new Date(Date.now() - 3600000).toISOString())
      .order('timestamp', { ascending: false });
    
    if (recentOps) {
      // Rapid fire transactions
      if (recentOps.length > 10) risk += 25;
      else if (recentOps.length > 5) risk += 15;
      
      // Repetitive patterns
      const similarOps = recentOps.filter(op => 
        op.operation_type === operation.type &&
        op.recipient === operation.to
      );
      
      if (similarOps.length > 3) risk += 20;
      
      // Unusual amount patterns
      if (operation.amount) {
        const amounts = recentOps.map(op => BigInt(op.amount || 0));
        const avgAmount = amounts.reduce((a, b) => a + b, 0n) / BigInt(amounts.length || 1);
        const currentAmount = BigInt(operation.amount);
        
        if (currentAmount > avgAmount * 10n) risk += 30;
        else if (currentAmount > avgAmount * 5n) risk += 15;
      }
    }
    
    return Math.min(risk, 100);
  }

  /**
   * Assess compliance-related risk
   */
  private async assessComplianceRisk(userAddress: string): Promise<number> {
    const compliance = await this.getComplianceStatus(userAddress);
    let risk = 0;
    
    if (!compliance.kycVerified) risk += 30;
    if (!compliance.amlChecked) risk += 25;
    if (!compliance.sanctionsScreened) risk += 20;
    
    // Check time since last compliance check
    if (compliance.lastCheckDate) {
      const daysSinceCheck = (Date.now() - compliance.lastCheckDate.getTime()) / 86400000;
      if (daysSinceCheck > 180) risk += 15;
      else if (daysSinceCheck > 90) risk += 10;
      else if (daysSinceCheck > 30) risk += 5;
    }
    
    return Math.min(risk, 100);
  }

  /**
   * Assess market-related risk
   */
  private async assessMarketRisk(operation: CryptoOperation): Promise<number> {
    const conditions = await this.getMarketConditions();
    let risk = 0;
    
    // Volatility risk
    if (conditions.volatility === 'extreme') risk += 30;
    else if (conditions.volatility === 'high') risk += 20;
    else if (conditions.volatility === 'medium') risk += 10;
    
    // Liquidity risk
    if (conditions.liquidityLevel === 'low') risk += 25;
    else if (conditions.liquidityLevel === 'medium') risk += 10;
    
    // Price impact risk
    if (conditions.priceImpact && conditions.priceImpact > 0.05) risk += 20;
    else if (conditions.priceImpact && conditions.priceImpact > 0.02) risk += 10;
    
    return Math.min(risk, 100);
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRisk(risks: Record<string, number>): number {
    let weightedSum = 0;
    let totalWeight = 0;
    
    const weights = {
      transactionRisk: 0.25,
      addressRisk: 0.30,
      patternRisk: 0.15,
      complianceRisk: 0.20,
      marketRisk: 0.10
    };
    
    for (const [key, value] of Object.entries(risks)) {
      const weight = weights[key as keyof typeof weights] || 0.1;
      weightedSum += value * weight;
      totalWeight += weight;
    }
    
    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Get risk level category
   */
  private getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Get mitigation factors that reduce risk
   */
  private async getMitigationFactors(userAddress: string): Promise<string[]> {
    const factors: string[] = [];
    
    // Check whitelist status
    const { data: whitelist } = await supabase
      .from('address_whitelist')
      .select('*')
      .eq('address', userAddress)
      .single();
    
    if (whitelist) factors.push('whitelisted_address');
    
    // Check multi-sig requirement
    const { data: multiSig } = await supabase
      .from('multi_sig_wallets')
      .select('*')
      .eq('owner_address', userAddress)
      .single();
    
    if (multiSig) factors.push('multi_sig_enabled');
    
    // Check 2FA status
    const { data: user } = await supabase
      .from('users')
      .select('two_factor_enabled')
      .eq('address', userAddress)
      .single();
    
    if (user?.two_factor_enabled) factors.push('2fa_enabled');
    
    return factors;
  }

  // Enhanced helper methods with proper error handling and caching

  private async getTotalVolume(userAddress: string, period: 'day' | 'week' | 'month'): Promise<bigint> {
    const cacheKey = `volume:${userAddress}:${period}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    try {
      const { data } = await supabase
        .from('token_operations')
        .select('amount')
        .eq('operator', userAddress)
        .gte('timestamp', startDate.toISOString());

      const total = data?.reduce((sum, op) => sum + BigInt(op.amount || 0), 0n) || 0n;
      this.setCache(cacheKey, total, 60000); // Cache for 1 minute
      return total;
    } catch (error) {
      console.error(`Error calculating volume for ${period}:`, error);
      return 0n;
    }
  }

  private async getDailyOperationCount(userAddress: string): Promise<number> {
    return this.getOperationCount(userAddress, 'day');
  }

  private async getWeeklyOperationCount(userAddress: string): Promise<number> {
    return this.getOperationCount(userAddress, 'week');
  }

  private async getMonthlyOperationCount(userAddress: string): Promise<number> {
    return this.getOperationCount(userAddress, 'month');
  }

  private async getOperationCount(userAddress: string, period: 'day' | 'week' | 'month'): Promise<number> {
    const cacheKey = `opCount:${userAddress}:${period}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    try {
      const { count } = await supabase
        .from('token_operations')
        .select('*', { count: 'exact', head: true })
        .eq('operator', userAddress)
        .gte('timestamp', startDate.toISOString());

      const result = count || 0;
      this.setCache(cacheKey, result, 60000);
      return result;
    } catch (error) {
      console.error(`Error getting operation count for ${period}:`, error);
      return 0;
    }
  }

  private async getLastOperationTime(userAddress: string): Promise<Date | undefined> {
    const cacheKey = `lastOp:${userAddress}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const { data } = await supabase
        .from('token_operations')
        .select('timestamp')
        .eq('operator', userAddress)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (!data || data.length === 0) return undefined;

      const result = new Date(data[0].timestamp);
      this.setCache(cacheKey, result, 30000); // Cache for 30 seconds
      return result;
    } catch (error) {
      console.error('Error getting last operation time:', error);
      return undefined;
    }
  }

  private async calculateUserRiskScore(userAddress: string): Promise<number> {
    // Comprehensive risk calculation using all available data
    const factors = await this.calculateRiskFactors(
      { type: 'transfer', from: userAddress } as CryptoOperation,
      { user: { address: userAddress } } as PolicyContext
    );
    
    return factors.overallRisk;
  }

  private async getComplianceStatus(userAddress: string): Promise<ComplianceStatus> {
    const cacheKey = `compliance:${userAddress}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const { data } = await supabase
      .from('user_compliance')
      .select('*')
      .eq('user_address', userAddress)
      .single();

    const status: ComplianceStatus = {
      kycVerified: data?.kyc_verified || false,
      amlChecked: data?.aml_checked || false,
      sanctionsScreened: data?.sanctions_screened || false,
      lastCheckDate: data?.last_check_date ? new Date(data.last_check_date) : new Date(),
      riskRating: data?.risk_rating || 'medium',
      notes: data?.notes || []
    };

    this.setCache(cacheKey, status, this.DEFAULT_CACHE_TTL);
    return status;
  }

  private async getMarketConditions(): Promise<MarketConditions> {
    const cacheKey = 'market:conditions';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // In production, this would integrate with market data services
    const conditions: MarketConditions = {
      volatility: this.calculateVolatility(),
      liquidityLevel: await this.assessLiquidity(),
      priceImpact: await this.estimatePriceImpact(),
      marketSentiment: 'neutral',
      trendDirection: 'sideways'
    };

    this.setCache(cacheKey, conditions, 60000); // Cache for 1 minute
    return conditions;
  }

  private calculateVolatility(): 'low' | 'medium' | 'high' | 'extreme' {
    // Simplified volatility calculation
    // In production, would use actual market data
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 16) return 'medium';
    if (hour >= 0 && hour <= 6) return 'low';
    return 'high';
  }

  private async assessLiquidity(): Promise<'low' | 'medium' | 'high'> {
    // In production, would check actual liquidity pools
    return 'high';
  }

  private async estimatePriceImpact(): Promise<number> {
    // In production, would calculate based on order size and liquidity
    return 0.02; // 2% default
  }

  private async getOperationHistory(userAddress: string): Promise<any[]> {
    const { data } = await supabase
      .from('token_operations')
      .select('*')
      .eq('operator', userAddress)
      .order('timestamp', { ascending: false })
      .limit(100);
    
    return data || [];
  }

  private calculateAverageTransactionSize(history: any[]): bigint {
    if (!history || history.length === 0) return 0n;
    
    const total = history.reduce((sum, op) => sum + BigInt(op.amount || 0), 0n);
    return total / BigInt(history.length);
  }

  private calculateVelocityScore(history: any[]): number {
    if (!history || history.length < 2) return 0;
    
    const timeSpan = new Date(history[0].timestamp).getTime() - 
                    new Date(history[history.length - 1].timestamp).getTime();
    
    const txPerDay = (history.length / (timeSpan / 86400000)) || 0;
    
    // Score based on transactions per day
    if (txPerDay > 100) return 100;
    if (txPerDay > 50) return 75;
    if (txPerDay > 20) return 50;
    if (txPerDay > 10) return 25;
    return Math.round(txPerDay * 2.5);
  }

  private async checkBlacklists(userAddress: string): Promise<boolean> {
    const { data } = await supabase
      .from('address_blacklist')
      .select('*')
      .eq('address', userAddress)
      .single();
    
    return !!data;
  }

  private async getTotalTransactionCount(userAddress: string): Promise<number> {
    const { count } = await supabase
      .from('token_operations')
      .select('*', { count: 'exact', head: true })
      .eq('operator', userAddress);
    
    return count || 0;
  }

  private async getTotalHistoricalVolume(userAddress: string): Promise<bigint> {
    const { data } = await supabase
      .from('token_operations')
      .select('amount')
      .eq('operator', userAddress);
    
    return data?.reduce((sum, op) => sum + BigInt(op.amount || 0), 0n) || 0n;
  }

  private calculateAccountAge(createdAt?: string): number {
    if (!createdAt) return 0;
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000); // Days
  }

  private async getTransactionThreshold(): Promise<bigint> {
    // Get from system settings or use default
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'transaction_threshold')
      .single();
    
    return BigInt(data?.value || 10000); // Default 10k
  }

  // Cache management methods
  
  private getCached(key: string): any {
    const cached = this.stateCache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.stateCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.stateCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // Clean up old cache entries
    if (this.stateCache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.stateCache.entries()) {
        if (now - v.timestamp > v.ttl) {
          this.stateCache.delete(k);
        }
      }
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.stateCache.clear();
  }
}
