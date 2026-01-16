/**
 * XRPL Monitor Service
 * Health monitoring and metrics collection for XRPL operations
 */

import { HealthCheck, MetricData } from '../../types/xrpl'

export class XRPLMonitorService {
  private healthChecks: Map<string, HealthCheck>
  private metrics: MetricData[]
  private maxMetrics: number = 10000

  constructor() {
    this.healthChecks = new Map()
    this.metrics = []
  }

  /**
   * Record a health check
   */
  recordHealthCheck(
    service: string,
    status: 'healthy' | 'degraded' | 'unhealthy',
    responseTime?: number,
    errorMessage?: string
  ): void {
    const healthCheck: HealthCheck = {
      service,
      status,
      lastCheck: new Date(),
      responseTime,
      errorMessage
    }

    this.healthChecks.set(service, healthCheck)
  }

  /**
   * Get health status for a service
   */
  getHealthStatus(service: string): HealthCheck | null {
    return this.healthChecks.get(service) || null
  }

  /**
   * Get all health checks
   */
  getAllHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values())
  }

  /**
   * Get overall system health
   */
  getOverallHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    services: HealthCheck[]
    healthyCount: number
    degradedCount: number
    unhealthyCount: number
  } {
    const services = this.getAllHealthChecks()
    
    const healthyCount = services.filter(s => s.status === 'healthy').length
    const degradedCount = services.filter(s => s.status === 'degraded').length
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy'
    } else if (degradedCount > 0) {
      overallStatus = 'degraded'
    }

    return {
      status: overallStatus,
      services,
      healthyCount,
      degradedCount,
      unhealthyCount
    }
  }

  /**
   * Record a metric
   */
  recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    const metric: MetricData = {
      name,
      value,
      timestamp: new Date(),
      tags
    }

    this.metrics.push(metric)

    // Trim metrics if exceeding max
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  /**
   * Get metrics by name
   */
  getMetrics(name: string, since?: Date): MetricData[] {
    let filtered = this.metrics.filter(m => m.name === name)

    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since)
    }

    return filtered
  }

  /**
   * Get latest metric value
   */
  getLatestMetric(name: string): number | null {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) return null
    const lastMetric = metrics[metrics.length - 1]
    return lastMetric?.value ?? null
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name: string, since?: Date): {
    count: number
    min: number
    max: number
    avg: number
    latest: number | null
  } | null {
    const metrics = this.getMetrics(name, since)

    if (metrics.length === 0) {
      return null
    }

    const values = metrics.map(m => m.value)
    const lastValue = values[values.length - 1]
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      latest: lastValue ?? null
    }
  }

  /**
   * Clear old metrics
   */
  clearMetrics(before?: Date): void {
    if (before) {
      this.metrics = this.metrics.filter(m => m.timestamp >= before)
    } else {
      this.metrics = []
    }
  }

  /**
   * Clear all monitoring data
   */
  clearAll(): void {
    this.healthChecks.clear()
    this.metrics = []
  }
}

// Singleton instance
export const xrplMonitor = new XRPLMonitorService()
