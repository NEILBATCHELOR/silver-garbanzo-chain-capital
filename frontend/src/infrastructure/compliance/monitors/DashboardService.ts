/**
 * DashboardService.ts
 * Manages compliance dashboard data and real-time updates
 */

import { supabase } from '@/infrastructure/database/client';
import { generateUUID } from '@/utils/shared/formatting/uuidUtils';
import type { ComplianceStatus } from '../ComplianceTracker';

export interface DashboardUpdate {
  operationId: string;
  status: ComplianceStatus;
  violations: number;
  timestamp: string;
}

export interface DashboardData {
  overview: DashboardOverview;
  recentOperations: RecentOperation[];
  violationTrends: ViolationTrend[];
  complianceMetrics: ComplianceMetric[];
  alerts: DashboardAlert[];
}

export interface DashboardOverview {
  totalOperations: number;
  complianceRate: number;
  activeViolations: number;
  pendingReports: number;
  averageComplianceScore: number;
  lastUpdated: string;
}

export interface RecentOperation {
  id: string;
  type: string;
  operator: string;
  status: string;
  complianceScore: number;
  violations: number;
  timestamp: string;
}

export interface ViolationTrend {
  date: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ComplianceMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
}

export interface DashboardAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface DashboardConfig {
  updateInterval?: number;
  maxRecentOperations?: number;
  trendDays?: number;
  realTimeEnabled?: boolean;
}

export class DashboardService {
  private config: DashboardConfig;
  private cache: Map<string, any>;
  private subscriptions: Map<string, any>;
  private updateCallbacks: Set<(data: DashboardData) => void>;

  constructor(config: DashboardConfig = {}) {
    this.config = {
      updateInterval: config.updateInterval ?? 30000, // 30 seconds
      maxRecentOperations: config.maxRecentOperations ?? 10,
      trendDays: config.trendDays ?? 7,
      realTimeEnabled: config.realTimeEnabled ?? true,
      ...config
    };

    this.cache = new Map();
    this.subscriptions = new Map();
    this.updateCallbacks = new Set();

    // Start periodic updates
    this.startPeriodicUpdates();

    // Subscribe to real-time updates if enabled
    if (this.config.realTimeEnabled) {
      this.subscribeToRealTimeUpdates();
    }
  }

  /**
   * Update dashboard with new data
   */
  async update(update: DashboardUpdate): Promise<void> {
    try {
      // Store update
      await this.storeDashboardUpdate(update);

      // Update cache
      await this.updateCache(update);

      // Notify subscribers
      await this.notifySubscribers();
    } catch (error: any) {
      console.error('Failed to update dashboard:', error);
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const [
        overview,
        recentOperations,
        violationTrends,
        complianceMetrics,
        alerts
      ] = await Promise.all([
        this.getOverview(),
        this.getRecentOperations(),
        this.getViolationTrends(),
        this.getComplianceMetrics(),
        this.getAlerts()
      ]);

      const data: DashboardData = {
        overview,
        recentOperations,
        violationTrends,
        complianceMetrics,
        alerts
      };

      // Cache the data
      this.cache.set('dashboardData', {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error: any) {
      console.error('Failed to get dashboard data:', error);
      
      // Return cached data if available
      const cached = this.cache.get('dashboardData');
      if (cached) {
        return cached.data;
      }

      // Return empty data structure
      return this.getEmptyDashboardData();
    }
  }

  /**
   * Get overview statistics
   */
  private async getOverview(): Promise<DashboardOverview> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's metrics
    const { data: metrics } = await supabase
      .from('compliance_metrics')
      .select('*')
      .eq('metric_date', today)
      .single();

    // Get active violations count
    const { count: violationCount } = await supabase
      .from('compliance_violations')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false);

    // Get pending reports count
    const { count: pendingReports } = await supabase
      .from('compliance_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return {
      totalOperations: metrics?.total_operations || 0,
      complianceRate: metrics?.compliant_operations && metrics?.total_operations
        ? metrics.compliant_operations / metrics.total_operations
        : 0,
      activeViolations: violationCount || 0,
      pendingReports: pendingReports || 0,
      averageComplianceScore: metrics?.avg_compliance_score || 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get recent operations
   */
  private async getRecentOperations(): Promise<RecentOperation[]> {
    const { data: operations } = await supabase
      .from('compliance_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(this.config.maxRecentOperations!);

    if (!operations) return [];

    return operations.map(op => ({
      id: op.operation_id,
      type: op.operation_type,
      operator: op.operator,
      status: op.compliance_status?.level || 'unknown',
      complianceScore: op.compliance_status?.score || 0,
      violations: op.violations?.length || 0,
      timestamp: op.created_at
    }));
  }

  /**
   * Get violation trends
   */
  private async getViolationTrends(): Promise<ViolationTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - this.config.trendDays!);

    const { data: violations } = await supabase
      .from('compliance_violations')
      .select('created_at, severity')
      .gte('created_at', startDate.toISOString());

    if (!violations) return [];

    // Group by date
    const trends: Record<string, ViolationTrend> = {};

    for (let i = 0; i < this.config.trendDays!; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      trends[dateStr] = {
        date: dateStr,
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };
    }

    // Count violations
    for (const violation of violations) {
      const date = violation.created_at.split('T')[0];
      if (trends[date]) {
        trends[date].total++;
        trends[date][violation.severity as keyof ViolationTrend]++;
      }
    }

    return Object.values(trends).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get compliance metrics
   */
  private async getComplianceMetrics(): Promise<ComplianceMetric[]> {
    const metrics: ComplianceMetric[] = [];

    // Get current and previous period data
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Today's metrics
    const { data: todayMetrics } = await supabase
      .from('compliance_metrics')
      .select('*')
      .eq('metric_date', today.toISOString().split('T')[0])
      .single();

    // Yesterday's metrics
    const { data: yesterdayMetrics } = await supabase
      .from('compliance_metrics')
      .select('*')
      .eq('metric_date', yesterday.toISOString().split('T')[0])
      .single();

    // Week aggregate
    const { data: weekMetrics } = await supabase
      .from('compliance_metrics')
      .select('*')
      .gte('metric_date', lastWeek.toISOString().split('T')[0])
      .lte('metric_date', today.toISOString().split('T')[0]);

    // Calculate metrics
    if (todayMetrics && yesterdayMetrics) {
      // Compliance rate
      const todayRate = todayMetrics.total_operations > 0
        ? todayMetrics.compliant_operations / todayMetrics.total_operations
        : 0;
      const yesterdayRate = yesterdayMetrics.total_operations > 0
        ? yesterdayMetrics.compliant_operations / yesterdayMetrics.total_operations
        : 0;

      metrics.push({
        name: 'Compliance Rate',
        value: todayRate,
        change: todayRate - yesterdayRate,
        trend: todayRate > yesterdayRate ? 'up' : todayRate < yesterdayRate ? 'down' : 'stable',
        period: 'daily'
      });

      // Violation rate
      const todayViolationRate = todayMetrics.total_operations > 0
        ? todayMetrics.violations_count / todayMetrics.total_operations
        : 0;
      const yesterdayViolationRate = yesterdayMetrics.total_operations > 0
        ? yesterdayMetrics.violations_count / yesterdayMetrics.total_operations
        : 0;

      metrics.push({
        name: 'Violation Rate',
        value: todayViolationRate,
        change: todayViolationRate - yesterdayViolationRate,
        trend: todayViolationRate < yesterdayViolationRate ? 'up' : todayViolationRate > yesterdayViolationRate ? 'down' : 'stable',
        period: 'daily'
      });
    }

    // Weekly average compliance score
    if (weekMetrics && weekMetrics.length > 0) {
      const weekAvgScore = weekMetrics.reduce((sum, m) => sum + (m.avg_compliance_score || 0), 0) / weekMetrics.length;
      
      metrics.push({
        name: 'Avg Compliance Score',
        value: weekAvgScore,
        change: 0, // Would need previous week for comparison
        trend: 'stable',
        period: 'weekly'
      });
    }

    return metrics;
  }

  /**
   * Get alerts
   */
  private async getAlerts(): Promise<DashboardAlert[]> {
    const { data: alerts } = await supabase
      .from('compliance_alerts')
      .select('*')
      .eq('acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!alerts) return [];

    return alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp,
      acknowledged: alert.acknowledged
    }));
  }

  /**
   * Store dashboard update
   */
  private async storeDashboardUpdate(update: DashboardUpdate): Promise<void> {
    await supabase
      .from('dashboard_updates')
      .insert({
        id: generateUUID(),
        operation_id: update.operationId,
        compliance_status: update.status,
        violations: update.violations,
        timestamp: update.timestamp,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Update cache with new data
   */
  private async updateCache(update: DashboardUpdate): Promise<void> {
    // Invalidate relevant cache entries
    this.cache.delete('overview');
    this.cache.delete('recentOperations');
    
    // Update recent operations cache if exists
    const cached = this.cache.get('dashboardData');
    if (cached) {
      // Add to recent operations
      cached.data.recentOperations.unshift({
        id: update.operationId,
        type: 'unknown', // Would need more data
        operator: 'unknown',
        status: update.status.level,
        complianceScore: update.status.score,
        violations: update.violations,
        timestamp: update.timestamp
      });

      // Limit to max recent operations
      if (cached.data.recentOperations.length > this.config.maxRecentOperations!) {
        cached.data.recentOperations.pop();
      }

      this.cache.set('dashboardData', cached);
    }
  }

  /**
   * Notify subscribers of updates
   */
  private async notifySubscribers(): Promise<void> {
    if (this.updateCallbacks.size === 0) return;

    const data = await this.getDashboardData();
    
    for (const callback of this.updateCallbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error('Callback error:', error);
      }
    }
  }

  /**
   * Subscribe to dashboard updates
   */
  onUpdate(callback: (data: DashboardData) => void): () => void {
    this.updateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * Start periodic updates
   */
  private startPeriodicUpdates(): void {
    setInterval(async () => {
      await this.getDashboardData();
      await this.notifySubscribers();
    }, this.config.updateInterval);
  }

  /**
   * Subscribe to real-time updates
   */
  private subscribeToRealTimeUpdates(): void {
    // Subscribe to compliance audit logs
    const auditSubscription = supabase
      .channel('dashboard-audit-logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'compliance_audit_logs'
      }, async (payload) => {
        await this.handleRealtimeUpdate('audit', payload);
      })
      .subscribe();

    this.subscriptions.set('audit', auditSubscription);

    // Subscribe to violations
    const violationSubscription = supabase
      .channel('dashboard-violations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'compliance_violations'
      }, async (payload) => {
        await this.handleRealtimeUpdate('violation', payload);
      })
      .subscribe();

    this.subscriptions.set('violations', violationSubscription);

    // Subscribe to alerts
    const alertSubscription = supabase
      .channel('dashboard-alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'compliance_alerts'
      }, async (payload) => {
        await this.handleRealtimeUpdate('alert', payload);
      })
      .subscribe();

    this.subscriptions.set('alerts', alertSubscription);
  }

  /**
   * Handle real-time update
   */
  private async handleRealtimeUpdate(type: string, payload: any): Promise<void> {
    // Invalidate relevant cache
    switch (type) {
      case 'audit':
        this.cache.delete('overview');
        this.cache.delete('recentOperations');
        break;
      case 'violation':
        this.cache.delete('overview');
        this.cache.delete('violationTrends');
        break;
      case 'alert':
        this.cache.delete('alerts');
        break;
    }

    // Notify subscribers
    await this.notifySubscribers();
  }

  /**
   * Get empty dashboard data structure
   */
  private getEmptyDashboardData(): DashboardData {
    return {
      overview: {
        totalOperations: 0,
        complianceRate: 0,
        activeViolations: 0,
        pendingReports: 0,
        averageComplianceScore: 0,
        lastUpdated: new Date().toISOString()
      },
      recentOperations: [],
      violationTrends: [],
      complianceMetrics: [],
      alerts: []
    };
  }

  /**
   * Cleanup subscriptions
   */
  dispose(): void {
    // Unsubscribe from real-time updates
    for (const [_, subscription] of this.subscriptions) {
      subscription.unsubscribe();
    }

    // Clear callbacks
    this.updateCallbacks.clear();

    // Clear cache
    this.cache.clear();
  }
}
