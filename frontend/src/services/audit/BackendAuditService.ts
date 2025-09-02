/**
 * Backend Audit Service
 * Comprehensive integration with Chain Capital backend audit API
 * Supports all 25+ audit endpoints with analytics, reporting, and compliance
 */

interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  username?: string;
  details?: string;
  status?: string;
  user_email?: string;
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  old_data?: any;
  new_data?: any;
  metadata?: any;
  project_id?: string;
  action_type?: string;
  changes?: any;
  occurred_at?: string;
  system_process_id?: string;
  batch_operation_id?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  duration?: number;
  source?: string;
  is_automated?: boolean;
  category?: string;
  parent_id?: string;
  correlation_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  api_version?: string;
  request_id?: string;
  importance?: number;
}

interface AuditQueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filters?: {
    action?: string;
    category?: string;
    severity?: string;
    source?: string;
    entity_type?: string;
    user_id?: string;
    project_id?: string;
    date_from?: string;
    date_to?: string;
    correlation_id?: string;
    session_id?: string;
  };
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface AuditStatistics {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsToday: number;
  averageEventsPerDay: number;
  topUsers: Array<{ user_id: string; username: string; event_count: number }>;
  topActions: Array<{ action: string; count: number }>;
  systemHealth: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
}

interface AuditAnalytics {
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    systemProcesses: number;
    averageDuration: number;
    successRate: number;
  };
  trends: {
    hourly: Array<{ hour: number; events: number }>;
    daily: Array<{ date: string; events: number }>;
    categories: Record<string, number>;
  };
  userBehavior: {
    activeUsers: number;
    averageSessionDuration: number;
    topPages: Array<{ page: string; visits: number }>;
    topActions: Array<{ action: string; count: number }>;
  };
  security: {
    suspiciousActivities: number;
    failedAttempts: number;
    blockedIPs: string[];
    securityEvents: Array<{
      type: string;
      severity: string;
      count: number;
      lastOccurred: string;
    }>;
  };
  performance: {
    averageResponseTime: number;
    slowestOperations: Array<{ operation: string; averageTime: number }>;
    errorRate: number;
    peakHours: Array<{ hour: number; load: number }>;
  };
}

interface ComplianceReport {
  standard: string;
  period: { from: string; to: string };
  compliance_score: number;
  requirements: Array<{
    requirement: string;
    status: 'compliant' | 'non_compliant' | 'partial';
    details: string;
    evidence: string[];
  }>;
  recommendations: string[];
  issues: Array<{
    severity: string;
    description: string;
    remediation: string;
  }>;
}

interface AnomalyDetection {
  anomalies: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: string;
    affected_entities: string[];
    confidence: number;
    evidence: any[];
  }>;
  patterns: Array<{
    pattern_type: string;
    description: string;
    frequency: number;
    risk_level: string;
  }>;
}

class BackendAuditService {
  private baseUrl = '/api/v1/audit';
  private cache = new Map<string, { data: any; expiry: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {}

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Audit API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.cacheTimeout
    });
  }

  /**
   * Core Audit Event Management
   */
  
  async createAuditEvent(event: Partial<AuditEvent>): Promise<{ success: boolean; data: AuditEvent }> {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async createBulkAuditEvents(events: Partial<AuditEvent>[]): Promise<{ 
    success: boolean; 
    created: number; 
    failed: number;
    errors: string[];
  }> {
    return this.request('/events/bulk', {
      method: 'POST',
      body: JSON.stringify({ events }),
    });
  }

  async getAuditEvent(id: string): Promise<{ success: boolean; data: AuditEvent }> {
    return this.request(`/events/${id}`);
  }

  async getAuditEvents(options: AuditQueryOptions = {}): Promise<{
    success: boolean;
    data: PaginatedResponse<AuditEvent>;
  }> {
    const cacheKey = `events_${JSON.stringify(options)}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    const queryString = new URLSearchParams();
    if (options.page) queryString.append('page', options.page.toString());
    if (options.limit) queryString.append('limit', options.limit.toString());
    if (options.sort) queryString.append('sort', options.sort);
    if (options.order) queryString.append('order', options.order);
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value) queryString.append(key, value.toString());
      });
    }

    try {
      const result = await this.request<{ success: boolean; data: PaginatedResponse<AuditEvent> }>(`/events?${queryString.toString()}`);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      return {
        success: false,
        data: {
          data: [],
          total: 0,
          page: options.page || 1,
          limit: options.limit || 10,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  }

  async getAuditTrail(entityType: string, entityId: string): Promise<{
    success: boolean;
    data: AuditEvent[];
  }> {
    const cacheKey = `trail_${entityType}_${entityId}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.request<{ success: boolean; data: AuditEvent[] }>(`/trail/${entityType}/${entityId}`);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      return {
        success: false,
        data: []
      };
    }
  }

  /**
   * Advanced Search & Export
   */

  async searchAuditEvents(searchQuery: {
    query?: string;
    filters?: Record<string, any>;
    dateRange?: { from: string; to: string };
    correlationId?: string;
  }): Promise<{
    success: boolean;
    data: AuditEvent[];
    total: number;
  }> {
    return this.request('/search', {
      method: 'POST',
      body: JSON.stringify(searchQuery),
    });
  }

  async exportAuditData(options: {
    format: 'csv' | 'excel' | 'pdf' | 'json';
    filters?: Record<string, any>;
    dateRange?: { from: string; to: string };
    columns?: string[];
  }): Promise<{
    success: boolean;
    downloadUrl: string;
    filename: string;
  }> {
    return this.request('/export', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * Analytics & Reporting
   */

  async getAuditStatistics(): Promise<{
    success: boolean;
    data: AuditStatistics;
  }> {
    const cacheKey = 'statistics';
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.request<{ success: boolean; data: AuditStatistics }>('/statistics');
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      return {
        success: false,
        data: {
          totalEvents: 0,
          eventsByCategory: {},
          eventsBySeverity: {},
          eventsToday: 0,
          averageEventsPerDay: 0,
          topUsers: [],
          topActions: [],
          systemHealth: {
            score: 0,
            issues: [],
            recommendations: []
          }
        }
      };
    }
  }

  async getAuditAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<{
    success: boolean;
    data: AuditAnalytics;
  }> {
    const cacheKey = `analytics_${startDate}_${endDate}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    const queryString = new URLSearchParams();
    if (startDate) queryString.append('start_date', startDate);
    if (endDate) queryString.append('end_date', endDate);

    try {
      const result = await this.request<{ success: boolean; data: AuditAnalytics }>(`/analytics?${queryString.toString()}`);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      return {
        success: false,
        data: {
          summary: {
            totalEvents: 0,
            uniqueUsers: 0,
            systemProcesses: 0,
            averageDuration: 0,
            successRate: 0
          },
          trends: {
            hourly: [],
            daily: [],
            categories: {}
          },
          userBehavior: {
            activeUsers: 0,
            averageSessionDuration: 0,
            topPages: [],
            topActions: []
          },
          security: {
            suspiciousActivities: 0,
            failedAttempts: 0,
            blockedIPs: [],
            securityEvents: []
          },
          performance: {
            averageResponseTime: 0,
            slowestOperations: [],
            errorRate: 0,
            peakHours: []
          }
        }
      };
    }
  }

  async getUserAuditAnalytics(userId: string): Promise<{
    success: boolean;
    data: {
      totalActions: number;
      lastActivity: string;
      commonActions: Array<{ action: string; count: number }>;
      sessionMetrics: {
        averageDuration: number;
        totalSessions: number;
        uniqueDays: number;
      };
      securityEvents: Array<{
        type: string;
        timestamp: string;
        severity: string;
      }>;
    };
  }> {
    const cacheKey = `user_analytics_${userId}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.request<{
        success: boolean;
        data: {
          totalActions: number;
          lastActivity: string;
          commonActions: Array<{ action: string; count: number }>;
          sessionMetrics: {
            averageDuration: number;
            totalSessions: number;
            uniqueDays: number;
          };
          securityEvents: Array<{
            type: string;
            timestamp: string;
            severity: string;
          }>;
        };
      }>(`/analytics/users?user_id=${userId}`);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      return {
        success: false,
        data: {
          totalActions: 0,
          lastActivity: new Date().toISOString(),
          commonActions: [],
          sessionMetrics: {
            averageDuration: 0,
            totalSessions: 0,
            uniqueDays: 0
          },
          securityEvents: []
        }
      };
    }
  }

  async getSecurityAnalytics(): Promise<{
    success: boolean;
    data: {
      threatLevel: 'low' | 'medium' | 'high' | 'critical';
      activeThreats: number;
      securityEvents: Array<{
        type: string;
        count: number;
        lastOccurred: string;
        severity: string;
      }>;
      suspiciousActivities: Array<{
        id: string;
        type: string;
        description: string;
        timestamp: string;
        user_id?: string;
        ip_address?: string;
        risk_score: number;
      }>;
      recommendations: string[];
    };
  }> {
    const cacheKey = 'security_analytics';
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.request<{
        success: boolean;
        data: {
          threatLevel: 'low' | 'medium' | 'high' | 'critical';
          activeThreats: number;
          securityEvents: Array<{
            type: string;
            count: number;
            lastOccurred: string;
            severity: string;
          }>;
          suspiciousActivities: Array<{
            id: string;
            type: string;
            description: string;
            timestamp: string;
            user_id?: string;
            ip_address?: string;
            risk_score: number;
          }>;
          recommendations: string[];
        };
      }>('/analytics/security');
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      return {
        success: false,
        data: {
          threatLevel: 'low',
          activeThreats: 0,
          securityEvents: [],
          suspiciousActivities: [],
          recommendations: []
        }
      };
    }
  }

  async getAnomalyDetection(): Promise<{
    success: boolean;
    data: AnomalyDetection;
  }> {
    return this.request('/anomalies');
  }

  /**
   * Compliance & Governance
   */

  async getComplianceReport(
    standard: 'SOX' | 'GDPR' | 'PCI_DSS' | 'ISO27001',
    startDate?: string,
    endDate?: string
  ): Promise<{
    success: boolean;
    data: ComplianceReport;
  }> {
    const queryString = new URLSearchParams();
    if (startDate) queryString.append('start_date', startDate);
    if (endDate) queryString.append('end_date', endDate);

    return this.request(`/compliance/${standard.toLowerCase()}?${queryString.toString()}`);
  }

  async validateAuditData(options: {
    timeframe?: { from: string; to: string };
    entity_types?: string[];
    check_integrity?: boolean;
  }): Promise<{
    success: boolean;
    data: {
      validationResults: Array<{
        check: string;
        status: 'pass' | 'fail' | 'warning';
        message: string;
        details?: any;
      }>;
      integrityScore: number;
      issues: Array<{
        severity: string;
        description: string;
        affectedRecords: number;
      }>;
    };
  }> {
    return this.request('/validate', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * Real-time Monitoring
   */

  async getAuditHealth(): Promise<{
    success: boolean;
    data: {
      status: 'healthy' | 'warning' | 'critical';
      uptime: number;
      processedEvents: number;
      queueSize: number;
      errorRate: number;
      lastProcessed: string;
      services: Array<{
        name: string;
        status: string;
        responseTime: number;
      }>;
    };
  }> {
    return this.request('/health');
  }

  /**
   * Utility Methods
   */

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  async getRealtimeMetrics(): Promise<{
    eventsPerSecond: number;
    activeUsers: number;
    queueSize: number;
    processingLatency: number;
    errorRate: number;
  }> {
    return this.request('/metrics/realtime');
  }

  /**
   * Event Streaming (Server-Sent Events)
   */
  createEventStream(filters?: {
    category?: string;
    severity?: string;
    entity_type?: string;
    user_id?: string;
    project_id?: string;
  }): EventSource {
    const queryString = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryString.append(key, value);
      });
    }

    const url = `${this.baseUrl}/stream?${queryString.toString()}`;
    return new EventSource(url);
  }

  /**
   * Batch Operations
   */
  async processBatchOperation(
    operationType: string,
    items: any[],
    metadata?: Record<string, any>
  ): Promise<{
    success: boolean;
    batchId: string;
    processed: number;
    failed: number;
    errors: string[];
  }> {
    return this.request('/batch', {
      method: 'POST',
      body: JSON.stringify({
        operation_type: operationType,
        items,
        metadata,
      }),
    });
  }
}

// Singleton instance
export const backendAuditService = new BackendAuditService();
export default backendAuditService;

export type {
  AuditEvent,
  AuditQueryOptions,
  PaginatedResponse,
  AuditStatistics,
  AuditAnalytics,
  ComplianceReport,
  AnomalyDetection,
};
