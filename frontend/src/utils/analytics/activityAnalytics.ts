/**
 * Enhanced Activity Analytics
 * 
 * Comprehensive analytics utility for activity monitoring with real-time
 * performance metrics, anomaly detection, and system health scoring.
 */

import { supabase } from '@/infrastructure/supabaseClient';
import { 
  ActivitySource, 
  ActivityCategory, 
  ActivitySeverity, 
  ActivityStatus,
  ActivityEvent,
  ActivityFilters 
} from '@/services/activity/EnhancedActivityService';

// System Health Interfaces
export interface SystemHealthScore {
  score: number; // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical';
  factors: {
    errorRate: number;
    responseTime: number;
    systemLoad: number;
    complianceRate: number;
    uptime: number;
  };
  recommendations: string[];
}

// Performance Metrics Interface
export interface PerformanceMetrics {
  totalEvents: number;
  averageResponseTime: number;
  errorRate: number;
  successRate: number;
  peakThroughput: number;
  cacheHitRate: number;
  systemUptime: number;
  lastUpdateTime: Date;
  // Additional properties for compatibility
  responseTimeChange?: number;
  throughput?: number;
}

// User Activity Summary
export interface UserActivitySummary {
  userId: string;
  userEmail?: string;
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  successRate: number;
  mostCommonActions: Array<{ action: string; count: number }>;
  lastActivityTime: Date;
  engagementScore: number;
  // Additional property for compatibility
  totalActivities?: number;
}

// Activity Trend Data
export interface ActivityTrend {
  date: string;
  hour?: number;
  total: number;
  successful: number;
  failed: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  // Additional properties for compatibility
  activityType?: string;
  description?: string;
  changePercentage?: number;
}

// Anomaly Detection Result
export interface ActivityAnomaly {
  type: 'spike' | 'drop' | 'error_increase' | 'slow_response';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: Date;
  affectedMetric: string;
  currentValue: number;
  expectedValue: number;
  recommendations: string[];
}

// Analytics Configuration
interface AnalyticsConfig {
  anomalyThresholds: {
    errorRateIncrease: number; // %
    responseTimeIncrease: number; // %
    volumeSpike: number; // multiplier
    volumeDrop: number; // multiplier
  };
  healthScoreWeights: {
    errorRate: number;
    responseTime: number;
    systemLoad: number;
    complianceRate: number;
    uptime: number;
  };
  cacheTimeout: number; // milliseconds
}

/**
 * Enhanced Activity Analytics Class
 * 
 * Provides comprehensive analytics functionality including:
 * - Real-time performance monitoring
 * - System health scoring
 * - Anomaly detection
 * - User activity summaries
 * - Trend analysis
 */
export class EnhancedActivityAnalytics {
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  private config: AnalyticsConfig = {
    anomalyThresholds: {
      errorRateIncrease: 50, // 50% increase
      responseTimeIncrease: 100, // 100% increase
      volumeSpike: 3, // 3x normal volume
      volumeDrop: 0.3 // 30% of normal volume
    },
    healthScoreWeights: {
      errorRate: 0.3,
      responseTime: 0.25,
      systemLoad: 0.2,
      complianceRate: 0.15,
      uptime: 0.1
    },
    cacheTimeout: 300000 // 5 minutes
  };

  /**
   * Get comprehensive system health score
   */
  async getSystemHealthScore(projectId?: string): Promise<SystemHealthScore> {
    try {
      const cacheKey = `health_score_${projectId || 'global'}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get recent activity data
      let query = supabase
        .from('audit_logs')
        .select('source, category, severity, status, duration, timestamp')
        .gte('timestamp', dayAgo.toISOString());

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const events = data || [];
      
      // Calculate health factors
      const factors = {
        errorRate: this.calculateErrorRate(events),
        responseTime: this.calculateAverageResponseTime(events),
        systemLoad: this.calculateSystemLoad(events),
        complianceRate: this.calculateComplianceRate(events),
        uptime: this.calculateUptime(events)
      };

      // Calculate weighted health score
      const score = Math.round(
        (100 - factors.errorRate * 100) * this.config.healthScoreWeights.errorRate +
        (100 - Math.min(factors.responseTime / 1000, 100)) * this.config.healthScoreWeights.responseTime +
        (100 - factors.systemLoad) * this.config.healthScoreWeights.systemLoad +
        factors.complianceRate * 100 * this.config.healthScoreWeights.complianceRate +
        factors.uptime * 100 * this.config.healthScoreWeights.uptime
      );

      // Determine status
      let status: SystemHealthScore['status'];
      if (score >= 90) status = 'excellent';
      else if (score >= 75) status = 'good';
      else if (score >= 60) status = 'warning';
      else status = 'critical';

      // Generate recommendations
      const recommendations = this.generateHealthRecommendations(factors, score);

      const healthScore: SystemHealthScore = {
        score,
        status,
        factors,
        recommendations
      };

      this.setCache(cacheKey, healthScore);
      return healthScore;

    } catch (error) {
      console.error('Failed to calculate system health score:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(projectId?: string, days: number = 7): Promise<PerformanceMetrics> {
    try {
      const cacheKey = `performance_${projectId || 'global'}_${days}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      let query = supabase
        .from('audit_logs')
        .select('status, duration, timestamp, source')
        .gte('timestamp', startDate.toISOString());

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const events = data || [];

      const metrics: PerformanceMetrics = {
        totalEvents: events.length,
        averageResponseTime: this.calculateAverageResponseTime(events),
        errorRate: this.calculateErrorRate(events),
        successRate: this.calculateSuccessRate(events),
        peakThroughput: this.calculatePeakThroughput(events),
        cacheHitRate: 0.85, // Placeholder - would need cache metrics
        systemUptime: this.calculateUptime(events),
        lastUpdateTime: now,
        // Additional properties for compatibility
        responseTimeChange: 0, // Placeholder - would need historical comparison
        throughput: this.calculatePeakThroughput(events)
      };

      this.setCache(cacheKey, metrics);
      return metrics;

    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(
    userId: string, 
    projectId?: string, 
    days: number = 30
  ): Promise<UserActivitySummary> {
    try {
      const cacheKey = `user_activity_${userId}_${projectId || 'global'}_${days}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('audit_logs')
        .select('action, status, timestamp, user_email')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString());

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const events = data || [];

      // Calculate action counts
      const actionCounts = new Map<string, number>();
      let successCount = 0;
      let failCount = 0;
      let lastActivity: Date | null = null;

      events.forEach(event => {
        actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);
        
        if (event.status === 'SUCCESS') successCount++;
        else if (event.status === 'FAILURE') failCount++;

        const eventTime = new Date(event.timestamp);
        if (!lastActivity || eventTime > lastActivity) {
          lastActivity = eventTime;
        }
      });

      // Get most common actions
      const mostCommonActions = Array.from(actionCounts.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }));

      // Calculate engagement score (0-100)
      const avgActionsPerDay = events.length / days;
      const engagementScore = Math.min(Math.round(avgActionsPerDay * 10), 100);

      const summary: UserActivitySummary = {
        userId,
        userEmail: events[0]?.user_email,
        totalActions: events.length,
        successfulActions: successCount,
        failedActions: failCount,
        successRate: events.length > 0 ? successCount / events.length : 0,
        mostCommonActions,
        lastActivityTime: lastActivity || new Date(0),
        engagementScore,
        // Additional property for compatibility
        totalActivities: events.length
      };

      this.setCache(cacheKey, summary);
      return summary;

    } catch (error) {
      console.error('Failed to get user activity summary:', error);
      throw error;
    }
  }

  /**
   * Get activity trends
   */
  async getActivityTrends(
    projectId?: string, 
    days: number = 7, 
    granularity: 'hourly' | 'daily' = 'daily'
  ): Promise<ActivityTrend[]> {
    try {
      const cacheKey = `trends_${projectId || 'global'}_${days}_${granularity}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('audit_logs')
        .select('timestamp, status, category, severity')
        .gte('timestamp', startDate.toISOString());

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const events = data || [];

      // Group events by time period
      const trends = new Map<string, {
        total: number;
        successful: number;
        failed: number;
        byCategory: Map<string, number>;
        bySeverity: Map<string, number>;
      }>();

      events.forEach(event => {
        const date = new Date(event.timestamp);
        let key: string;

        if (granularity === 'hourly') {
          key = `${date.toISOString().split('T')[0]}-${date.getHours()}`;
        } else {
          key = date.toISOString().split('T')[0];
        }

        if (!trends.has(key)) {
          trends.set(key, {
            total: 0,
            successful: 0,
            failed: 0,
            byCategory: new Map(),
            bySeverity: new Map()
          });
        }

        const trend = trends.get(key)!;
        trend.total++;

        if (event.status === 'SUCCESS') trend.successful++;
        else if (event.status === 'FAILURE') trend.failed++;

        if (event.category) {
          trend.byCategory.set(event.category, (trend.byCategory.get(event.category) || 0) + 1);
        }

        if (event.severity) {
          trend.bySeverity.set(event.severity, (trend.bySeverity.get(event.severity) || 0) + 1);
        }
      });

      // Convert to array
      const trendArray: ActivityTrend[] = Array.from(trends.entries()).map(([key, data]) => {
        const parts = key.split('-');
        
        return {
          date: granularity === 'hourly' ? parts.slice(0, 3).join('-') : key,
          hour: granularity === 'hourly' ? parseInt(parts[3]) : undefined,
          total: data.total,
          successful: data.successful,
          failed: data.failed,
          byCategory: Object.fromEntries(data.byCategory),
          bySeverity: Object.fromEntries(data.bySeverity)
        };
      }).sort((a, b) => a.date.localeCompare(b.date));

      this.setCache(cacheKey, trendArray);
      return trendArray;

    } catch (error) {
      console.error('Failed to get activity trends:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in activity patterns
   */
  async detectAnomalies(projectId?: string, hours: number = 24): Promise<ActivityAnomaly[]> {
    try {
      const anomalies: ActivityAnomaly[] = [];
      
      // Get recent metrics
      const recentMetrics = await this.getPerformanceMetrics(projectId, 1);
      const historicalMetrics = await this.getPerformanceMetrics(projectId, 7);

      // Check error rate anomaly
      if (recentMetrics.errorRate > historicalMetrics.errorRate * (1 + this.config.anomalyThresholds.errorRateIncrease / 100)) {
        anomalies.push({
          type: 'error_increase',
          severity: recentMetrics.errorRate > 0.1 ? 'high' : 'medium',
          description: `Error rate increased to ${(recentMetrics.errorRate * 100).toFixed(1)}%`,
          detectedAt: new Date(),
          affectedMetric: 'errorRate',
          currentValue: recentMetrics.errorRate,
          expectedValue: historicalMetrics.errorRate,
          recommendations: [
            'Check system logs for recent errors',
            'Verify external service dependencies',
            'Review recent deployments'
          ]
        });
      }

      // Check response time anomaly
      if (recentMetrics.averageResponseTime > historicalMetrics.averageResponseTime * (1 + this.config.anomalyThresholds.responseTimeIncrease / 100)) {
        anomalies.push({
          type: 'slow_response',
          severity: recentMetrics.averageResponseTime > 5000 ? 'high' : 'medium',
          description: `Response time increased to ${recentMetrics.averageResponseTime.toFixed(0)}ms`,
          detectedAt: new Date(),
          affectedMetric: 'responseTime',
          currentValue: recentMetrics.averageResponseTime,
          expectedValue: historicalMetrics.averageResponseTime,
          recommendations: [
            'Check database performance',
            'Review server resource usage',
            'Optimize slow queries'
          ]
        });
      }

      // Check volume anomalies
      const volumeRatio = recentMetrics.totalEvents / Math.max(historicalMetrics.totalEvents / 7, 1);
      if (volumeRatio > this.config.anomalyThresholds.volumeSpike) {
        anomalies.push({
          type: 'spike',
          severity: volumeRatio > 5 ? 'high' : 'medium',
          description: `Activity volume spike: ${volumeRatio.toFixed(1)}x normal`,
          detectedAt: new Date(),
          affectedMetric: 'volume',
          currentValue: recentMetrics.totalEvents,
          expectedValue: historicalMetrics.totalEvents / 7,
          recommendations: [
            'Monitor system resources',
            'Check for automated processes',
            'Verify legitimate traffic patterns'
          ]
        });
      } else if (volumeRatio < this.config.anomalyThresholds.volumeDrop) {
        anomalies.push({
          type: 'drop',
          severity: volumeRatio < 0.1 ? 'high' : 'low',
          description: `Activity volume drop: ${(volumeRatio * 100).toFixed(1)}% of normal`,
          detectedAt: new Date(),
          affectedMetric: 'volume',
          currentValue: recentMetrics.totalEvents,
          expectedValue: historicalMetrics.totalEvents / 7,
          recommendations: [
            'Check system availability',
            'Verify user access',
            'Review service dependencies'
          ]
        });
      }

      return anomalies;

    } catch (error) {
      console.error('Failed to detect anomalies:', error);
      return [];
    }
  }

  /**
   * Alias for detectAnomalies for backward compatibility
   */
  async getActivityAnomalies(projectId?: string, hours: number = 24): Promise<ActivityAnomaly[]> {
    return this.detectAnomalies(projectId, hours);
  }

  /**
   * Get user activity summaries for multiple users
   */
  async getUserActivitySummaries(projectId?: string, days: number = 30, limit: number = 10): Promise<UserActivitySummary[]> {
    try {
      const analytics = await this.getComprehensiveAnalytics(days);
      if (analytics.userActivity) {
        return analytics.userActivity.slice(0, limit).map((user: any) => ({
          userId: user.userId,
          userEmail: user.userEmail,
          totalActions: user.totalActivities,
          successfulActions: Math.round(user.totalActivities * (user.successRate / 100)),
          failedActions: user.totalActivities - Math.round(user.totalActivities * (user.successRate / 100)),
          successRate: user.successRate / 100,
          mostCommonActions: [],
          lastActivityTime: new Date(user.lastActivity),
          engagementScore: 75, // Default engagement score
          totalActivities: user.totalActivities
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get user activity summaries:', error);
      return [];
    }
  }

  /**
   * Get comprehensive analytics for the ActivityMetrics component
   */
  async getComprehensiveAnalytics(days: number = 7): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('audit_logs')
        .select('*')
        .gte('timestamp', startDate.toISOString());

      const { data, error } = await query;
      if (error) throw error;

      const events = data || [];

      // Calculate overview metrics
      const overview = {
        totalActivities: events.length,
        successRate: this.calculateSuccessRate(events) * 100,
        errorRate: this.calculateErrorRate(events) * 100,
        uniqueUsers: new Set(events.map(e => e.user_id).filter(Boolean)).size
      };

      // Calculate trends
      const sourceDistribution = this.calculateDistribution(events, 'source');
      const categoryDistribution = this.calculateDistribution(events, 'category');
      const dailyActivity = this.calculateDailyActivity(events, days);
      const hourlyDistribution = this.calculateHourlyDistribution(events);

      const trends = {
        dailyActivity,
        hourlyDistribution,
        sourceDistribution,
        categoryDistribution
      };

      // Calculate performance metrics
      const performance = {
        averageResponseTime: this.calculateAverageResponseTime(events),
        throughput: events.length / days,
        errorRate: this.calculateErrorRate(events),
        queueHealth: this.calculateQueueHealth(events),
        cacheHitRate: 0.85 // Placeholder
      };

      // Get top actions
      const actionCounts = new Map<string, number>();
      events.forEach(event => {
        actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);
      });
      const topActions = Array.from(actionCounts.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([action, count]) => ({ action, count }));

      // Get user activity
      const userActivity = this.calculateUserActivity(events);

      return {
        overview,
        trends,
        performance,
        topActions,
        userActivity
      };

    } catch (error) {
      console.error('Failed to get comprehensive analytics:', error);
      throw error;
    }
  }

  // Private helper methods

  private calculateErrorRate(events: any[]): number {
    if (events.length === 0) return 0;
    const errors = events.filter(e => 
      e.status === 'FAILURE' || 
      e.severity === 'ERROR' || 
      e.severity === 'CRITICAL'
    ).length;
    return errors / events.length;
  }

  private calculateAverageResponseTime(events: any[]): number {
    const withDuration = events.filter(e => e.duration && e.duration > 0);
    if (withDuration.length === 0) return 0;
    const total = withDuration.reduce((sum, e) => sum + e.duration, 0);
    return total / withDuration.length;
  }

  private calculateSystemLoad(events: any[]): number {
    // Simplified system load calculation based on event frequency
    const hoursInDay = 24;
    const eventsPerHour = events.length / hoursInDay;
    // Normalize to 0-100 scale (assuming 1000 events/hour = 100% load)
    return Math.min((eventsPerHour / 1000) * 100, 100);
  }

  private calculateComplianceRate(events: any[]): number {
    const complianceEvents = events.filter(e => 
      e.category === 'COMPLIANCE' || 
      e.action?.includes('compliance')
    );
    if (complianceEvents.length === 0) return 1; // Assume compliant if no compliance events
    
    const passedCompliance = complianceEvents.filter(e => 
      e.status === 'SUCCESS' && 
      e.severity !== 'ERROR' && 
      e.severity !== 'CRITICAL'
    ).length;
    
    return passedCompliance / complianceEvents.length;
  }

  private calculateUptime(events: any[]): number {
    // Simplified uptime calculation - assume uptime based on consistent activity
    const hoursInDay = 24;
    const eventsPerHour = events.length / hoursInDay;
    return eventsPerHour > 0 ? Math.min(eventsPerHour / 10, 1) : 0.95; // Default to 95% if no events
  }

  private calculateSuccessRate(events: any[]): number {
    if (events.length === 0) return 0;
    const successful = events.filter(e => e.status === 'SUCCESS').length;
    return successful / events.length;
  }

  private calculatePeakThroughput(events: any[]): number {
    // Group events by hour and find peak
    const hourlyGroups = new Map<string, number>();
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).toISOString().slice(0, 13);
      hourlyGroups.set(hour, (hourlyGroups.get(hour) || 0) + 1);
    });

    return Math.max(...Array.from(hourlyGroups.values()), 0);
  }

  private generateHealthRecommendations(factors: any, score: number): string[] {
    const recommendations: string[] = [];

    if (factors.errorRate > 0.05) {
      recommendations.push('High error rate detected - review system logs and fix recurring issues');
    }
    if (factors.responseTime > 2000) {
      recommendations.push('Slow response times - consider optimizing database queries and API calls');
    }
    if (factors.systemLoad > 80) {
      recommendations.push('High system load - consider scaling resources or optimizing processes');
    }
    if (factors.complianceRate < 0.95) {
      recommendations.push('Compliance issues detected - review and update compliance rules');
    }
    if (score < 75) {
      recommendations.push('Overall system health needs attention - prioritize critical issues');
    }

    if (recommendations.length === 0) {
      recommendations.push('System health is good - maintain current monitoring and practices');
    }

    return recommendations;
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Calculate distribution for a field
   */
  private calculateDistribution(events: any[], field: string): Array<{ category: string; count: number; percentage: number }> {
    const distribution = new Map<string, number>();
    const total = events.length;

    events.forEach(event => {
      const value = event[field] || 'Unknown';
      distribution.set(value, (distribution.get(value) || 0) + 1);
    });

    return Array.from(distribution.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate daily activity
   */
  private calculateDailyActivity(events: any[], days: number): Array<{ date: string; count: number }> {
    const dailyGroups = new Map<string, number>();

    events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      dailyGroups.set(date, (dailyGroups.get(date) || 0) + 1);
    });

    return Array.from(dailyGroups.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate hourly distribution
   */
  private calculateHourlyDistribution(events: any[]): Array<{ hour: number; count: number }> {
    const hourlyGroups = new Map<number, number>();

    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyGroups.set(hour, (hourlyGroups.get(hour) || 0) + 1);
    });

    return Array.from(hourlyGroups.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);
  }

  /**
   * Calculate queue health status
   */
  private calculateQueueHealth(events: any[]): 'good' | 'warning' | 'critical' {
    const errorRate = this.calculateErrorRate(events);
    const averageResponseTime = this.calculateAverageResponseTime(events);

    if (errorRate > 0.1 || averageResponseTime > 5000) {
      return 'critical';
    } else if (errorRate > 0.05 || averageResponseTime > 2000) {
      return 'warning';
    }
    return 'good';
  }

  /**
   * Calculate user activity summary
   */
  private calculateUserActivity(events: any[]): Array<{
    userId: string;
    userEmail: string;
    totalActivities: number;
    lastActivity: string;
    activeDays: number;
    successRate: number;
  }> {
    const userGroups = new Map<string, {
      userEmail: string;
      activities: any[];
      activeDays: Set<string>;
    }>();

    events.forEach(event => {
      if (!event.user_id) return;

      if (!userGroups.has(event.user_id)) {
        userGroups.set(event.user_id, {
          userEmail: event.user_email || 'Unknown',
          activities: [],
          activeDays: new Set()
        });
      }

      const userGroup = userGroups.get(event.user_id)!;
      userGroup.activities.push(event);
      userGroup.activeDays.add(new Date(event.timestamp).toISOString().split('T')[0]);
    });

    return Array.from(userGroups.entries())
      .map(([userId, data]) => {
        const successfulActivities = data.activities.filter(a => a.status === 'SUCCESS').length;
        const latestActivity = data.activities.reduce((latest, current) => 
          new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
        );

        return {
          userId,
          userEmail: data.userEmail,
          totalActivities: data.activities.length,
          lastActivity: latestActivity.timestamp,
          activeDays: data.activeDays.size,
          successRate: data.activities.length > 0 ? (successfulActivities / data.activities.length) * 100 : 0
        };
      })
      .sort((a, b) => b.totalActivities - a.totalActivities)
      .slice(0, 10);
  }
}

// Export singleton instance
export const enhancedActivityAnalytics = new EnhancedActivityAnalytics();

export default enhancedActivityAnalytics;