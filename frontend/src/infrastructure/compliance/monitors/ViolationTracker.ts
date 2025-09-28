/**
 * ViolationTracker.ts
 * Tracks and manages compliance violations
 */

import type { ComplianceViolation } from '../ComplianceTracker';
import { supabase } from '@/infrastructure/database/client';
import { generateUUID } from '@/utils/shared/formatting/uuidUtils';

export interface ViolationTrackerConfig {
  patternDetectionEnabled?: boolean;
  patternTimeWindow?: number; // in milliseconds
  autoResolveEnabled?: boolean;
  autoResolveTimeout?: number; // in milliseconds
}

export interface ViolationStatistics {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  resolved: number;
  unresolved: number;
  averageResolutionTime: number;
}

export interface ViolationPattern {
  type: string;
  count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timeframe: number;
  operator: string;
  firstOccurrence: string;
  lastOccurrence: string;
  violations: string[];
}

export class ViolationTracker {
  private config: ViolationTrackerConfig;
  private violationCache: Map<string, ComplianceViolation[]>;

  constructor(config: ViolationTrackerConfig = {}) {
    this.config = {
      patternDetectionEnabled: config.patternDetectionEnabled ?? true,
      patternTimeWindow: config.patternTimeWindow ?? 24 * 60 * 60 * 1000, // 24 hours
      autoResolveEnabled: config.autoResolveEnabled ?? false,
      autoResolveTimeout: config.autoResolveTimeout ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      ...config
    };

    this.violationCache = new Map();
    
    // Start auto-resolution if enabled
    if (this.config.autoResolveEnabled) {
      this.startAutoResolution();
    }
  }

  /**
   * Track violations
   */
  async track(violations: ComplianceViolation[], operator: string): Promise<void> {
    try {
      // Store each violation
      for (const violation of violations) {
        await this.storeViolation(violation, operator);
      }

      // Update cache
      const existing = this.violationCache.get(operator) || [];
      this.violationCache.set(operator, [...existing, ...violations]);

      // Detect patterns if enabled
      if (this.config.patternDetectionEnabled) {
        await this.detectAndStorePatterns(operator);
      }
    } catch (error: any) {
      console.error('Failed to track violations:', error);
      throw error;
    }
  }

  /**
   * Store violation to database
   */
  private async storeViolation(violation: ComplianceViolation, operator: string): Promise<void> {
    const { error } = await supabase
      .from('compliance_violations')
      .insert({
        id: generateUUID(),
        violation_id: violation.violationId,
        operation_id: null, // Set if available
        type: violation.type,
        severity: violation.severity,
        description: violation.description,
        remediation: violation.remediation,
        resolved: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store violation: ${error.message}`);
    }
  }

  /**
   * Detect violation patterns
   */
  async detectPatterns(operator: string): Promise<ViolationPattern[]> {
    try {
      const timeWindow = new Date(Date.now() - this.config.patternTimeWindow!);
      
      // Get recent violations
      const { data: violations } = await supabase
        .from('compliance_violations')
        .select('*')
        .eq('operator', operator)
        .gte('created_at', timeWindow.toISOString())
        .order('created_at', { ascending: false });

      if (!violations || violations.length < 3) {
        return [];
      }

      // Group violations by type
      const violationsByType = this.groupViolationsByType(violations);
      const patterns: ViolationPattern[] = [];

      // Analyze each violation type
      for (const [type, typeViolations] of Object.entries(violationsByType)) {
        if (typeViolations.length >= 3) {
          // Pattern detected
          const severities = typeViolations.map(v => v.severity);
          const mostSevereSeverity = this.getMostSevere(severities);
          
          patterns.push({
            type,
            count: typeViolations.length,
            severity: mostSevereSeverity,
            timeframe: this.config.patternTimeWindow!,
            operator,
            firstOccurrence: typeViolations[typeViolations.length - 1].created_at,
            lastOccurrence: typeViolations[0].created_at,
            violations: typeViolations.map(v => v.violation_id)
          });
        }
      }

      // Check for rapid succession patterns
      const rapidPattern = this.detectRapidSuccession(violations);
      if (rapidPattern) {
        patterns.push(rapidPattern);
      }

      return patterns;
    } catch (error: any) {
      console.error('Failed to detect patterns:', error);
      return [];
    }
  }

  /**
   * Group violations by type
   */
  private groupViolationsByType(violations: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    for (const violation of violations) {
      if (!grouped[violation.type]) {
        grouped[violation.type] = [];
      }
      grouped[violation.type].push(violation);
    }
    
    return grouped;
  }

  /**
   * Detect rapid succession pattern
   */
  private detectRapidSuccession(violations: any[]): ViolationPattern | null {
    if (violations.length < 5) return null;

    // Check if violations occurred within a short timeframe
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentViolations = violations.filter(v => 
      new Date(v.created_at).getTime() > oneHourAgo
    );

    if (recentViolations.length >= 5) {
      return {
        type: 'RAPID_SUCCESSION',
        count: recentViolations.length,
        severity: 'high',
        timeframe: 60 * 60 * 1000,
        operator: violations[0].operator || 'unknown',
        firstOccurrence: recentViolations[recentViolations.length - 1].created_at,
        lastOccurrence: recentViolations[0].created_at,
        violations: recentViolations.map(v => v.violation_id)
      };
    }

    return null;
  }

  /**
   * Get most severe severity
   */
  private getMostSevere(severities: string[]): 'critical' | 'high' | 'medium' | 'low' {
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Detect and store patterns
   */
  private async detectAndStorePatterns(operator: string): Promise<void> {
    const patterns = await this.detectPatterns(operator);
    
    for (const pattern of patterns) {
      await this.storePattern(pattern);
    }
  }

  /**
   * Store pattern to database
   */
  private async storePattern(pattern: ViolationPattern): Promise<void> {
    const { error } = await supabase
      .from('violation_patterns')
      .insert({
        id: generateUUID(),
        operator: pattern.operator,
        pattern_type: pattern.type,
        count: pattern.count,
        severity: pattern.severity,
        timeframe: pattern.timeframe,
        first_occurrence: pattern.firstOccurrence,
        last_occurrence: pattern.lastOccurrence,
        violation_ids: pattern.violations,
        detected_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to store pattern:', error);
    }
  }

  /**
   * Resolve violation
   */
  async resolveViolation(
    violationId: string,
    resolvedBy: string,
    resolution?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('compliance_violations')
      .update({
        resolved: true,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
        remediation: resolution
      })
      .eq('violation_id', violationId);

    if (error) {
      throw new Error(`Failed to resolve violation: ${error.message}`);
    }

    // Clear from cache
    for (const [operator, violations] of this.violationCache.entries()) {
      const filtered = violations.filter(v => v.violationId !== violationId);
      if (filtered.length !== violations.length) {
        this.violationCache.set(operator, filtered);
      }
    }
  }

  /**
   * Bulk resolve violations
   */
  async bulkResolve(
    violationIds: string[],
    resolvedBy: string,
    resolution?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('compliance_violations')
      .update({
        resolved: true,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
        remediation: resolution
      })
      .in('violation_id', violationIds);

    if (error) {
      throw new Error(`Failed to bulk resolve violations: ${error.message}`);
    }
  }

  /**
   * Start auto-resolution process
   */
  private startAutoResolution(): void {
    // Run every hour
    setInterval(async () => {
      await this.autoResolveOldViolations();
    }, 60 * 60 * 1000);

    // Run immediately
    this.autoResolveOldViolations();
  }

  /**
   * Auto-resolve old violations
   */
  private async autoResolveOldViolations(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - this.config.autoResolveTimeout!);
      
      const { error } = await supabase
        .from('compliance_violations')
        .update({
          resolved: true,
          resolved_by: 'system',
          resolved_at: new Date().toISOString(),
          remediation: 'Auto-resolved due to age'
        })
        .eq('resolved', false)
        .eq('severity', 'low')
        .lte('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to auto-resolve violations:', error);
      } else {
        console.log('Auto-resolved old violations');
      }
    } catch (error) {
      console.error('Auto-resolution failed:', error);
    }
  }

  /**
   * Get violation statistics
   */
  async getStatistics(
    operator?: string,
    timeframe?: { start: Date; end: Date }
  ): Promise<ViolationStatistics> {
    let query = supabase
      .from('compliance_violations')
      .select('*');

    if (operator) {
      query = query.eq('operator', operator);
    }

    if (timeframe) {
      query = query
        .gte('created_at', timeframe.start.toISOString())
        .lte('created_at', timeframe.end.toISOString());
    }

    const { data: violations } = await query;

    if (!violations || violations.length === 0) {
      return {
        total: 0,
        bySeverity: {},
        byType: {},
        resolved: 0,
        unresolved: 0,
        averageResolutionTime: 0
      };
    }

    // Calculate statistics
    const stats: ViolationStatistics = {
      total: violations.length,
      bySeverity: {},
      byType: {},
      resolved: 0,
      unresolved: 0,
      averageResolutionTime: 0
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const violation of violations) {
      // Count by severity
      stats.bySeverity[violation.severity] = (stats.bySeverity[violation.severity] || 0) + 1;

      // Count by type
      stats.byType[violation.type] = (stats.byType[violation.type] || 0) + 1;

      // Count resolved/unresolved
      if (violation.resolved) {
        stats.resolved++;
        
        // Calculate resolution time
        if (violation.resolved_at && violation.created_at) {
          const resolutionTime = 
            new Date(violation.resolved_at).getTime() - 
            new Date(violation.created_at).getTime();
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }
      } else {
        stats.unresolved++;
      }
    }

    // Calculate average resolution time
    if (resolvedCount > 0) {
      stats.averageResolutionTime = totalResolutionTime / resolvedCount;
    }

    return stats;
  }

  /**
   * Get active violations for operator
   */
  async getActiveViolations(operator: string): Promise<ComplianceViolation[]> {
    const { data } = await supabase
      .from('compliance_violations')
      .select('*')
      .eq('operator', operator)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    return (data || []).map(v => ({
      violationId: v.violation_id,
      type: v.type,
      severity: v.severity,
      description: v.description,
      remediation: v.remediation
    }));
  }

  /**
   * Check if operator has critical violations
   */
  async hasCriticalViolations(operator: string): Promise<boolean> {
    const { count } = await supabase
      .from('compliance_violations')
      .select('*', { count: 'exact', head: true })
      .eq('operator', operator)
      .eq('severity', 'critical')
      .eq('resolved', false);

    return (count || 0) > 0;
  }

  /**
   * Get violation trends
   */
  async getTrends(
    days: number = 30,
    operator?: string
  ): Promise<{
    date: string;
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    let query = supabase
      .from('compliance_violations')
      .select('created_at, severity')
      .gte('created_at', startDate.toISOString());

    if (operator) {
      query = query.eq('operator', operator);
    }

    const { data } = await query;

    if (!data) return [];

    // Group by date
    const trends: Record<string, any> = {};

    for (const violation of data) {
      const date = violation.created_at.split('T')[0];
      
      if (!trends[date]) {
        trends[date] = {
          date,
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        };
      }

      trends[date].total++;
      trends[date][violation.severity]++;
    }

    return Object.values(trends).sort((a, b) => a.date.localeCompare(b.date));
  }
}
