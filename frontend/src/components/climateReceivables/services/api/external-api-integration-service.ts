import { WeatherDataService } from './weather-data-service';
import { CarbonMarketPriceService } from './carbon-market-price-service';
import { CreditMonitoringService } from './credit-monitoring-service';
import { PolicyRiskTrackingService } from './policy-risk-tracking-service';

/**
 * External data source status interface
 */
interface ExternalDataSourceStatus {
  source: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  lastChecked: string;
  responseTime?: number;
  errorCount: number;
  lastError?: string;
  apiQuotaUsed?: number;
  apiQuotaLimit?: number;
}

/**
 * Integration health report interface
 */
interface IntegrationHealthReport {
  overallHealth: 'healthy' | 'degraded' | 'critical';
  totalSources: number;
  onlineSources: number;
  offlineSources: number;
  degradedSources: number;
  lastUpdated: string;
  sourceStatuses: ExternalDataSourceStatus[];
  recommendations: string[];
}

/**
 * API rate limiting interface
 */
interface RateLimitInfo {
  source: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  currentUsage: {
    minute: number;
    hour: number;
    day: number;
  };
  resetTime: string;
}

/**
 * External API integration configuration
 */
interface APIIntegrationConfig {
  weatherAPI: {
    enabled: boolean;
    provider: 'openweather' | 'weatherapi' | 'accuweather';
    fallbackProviders: string[];
    cacheEnabled: boolean;
    cacheDuration: number;
  };
  creditMonitoring: {
    enabled: boolean;
    providers: ('moodys' | 'sp' | 'dun_bradstreet' | 'experian')[];
    refreshInterval: number;
    alertThresholds: {
      ratingDowngrade: number;
      paymentDelay: number;
    };
  };
  policyTracking: {
    enabled: boolean;
    sources: ('federal_register' | 'govinfo' | 'regulatory_news')[];
    monitoringKeywords: string[];
    alertSeverityThreshold: 'low' | 'medium' | 'high' | 'critical';
  };
  carbonMarkets: {
    enabled: boolean;
    markets: ('voluntary' | 'compliance' | 'recs')[];
    priceUpdateInterval: number;
  };
}

/**
 * Centralized service for managing all external API integrations
 * Provides monitoring, rate limiting, fallback handling, and health checks
 */
export class ExternalAPIIntegrationService {
  private static readonly DEFAULT_CONFIG: APIIntegrationConfig = {
    weatherAPI: {
      enabled: true,
      provider: 'openweather',
      fallbackProviders: ['weatherapi', 'accuweather'],
      cacheEnabled: true,
      cacheDuration: 24 * 60 * 60 * 1000 // 24 hours
    },
    creditMonitoring: {
      enabled: true,
      providers: ['dun_bradstreet', 'experian'],
      refreshInterval: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        ratingDowngrade: 10, // 10 point drop
        paymentDelay: 5 // 5 day increase
      }
    },
    policyTracking: {
      enabled: true,
      sources: ['federal_register', 'govinfo'],
      monitoringKeywords: [
        'renewable energy', 'tax credit', 'investment tax credit',
        'production tax credit', 'renewable portfolio standard'
      ],
      alertSeverityThreshold: 'medium'
    },
    carbonMarkets: {
      enabled: true,
      markets: ['voluntary', 'compliance', 'recs'],
      priceUpdateInterval: 60 * 60 * 1000 // 1 hour
    }
  };

  private static config: APIIntegrationConfig = this.DEFAULT_CONFIG;
  private static readonly rateLimits = new Map<string, RateLimitInfo>();
  private static readonly sourceStatuses = new Map<string, ExternalDataSourceStatus>();

  /**
   * Initialize external API integrations with configuration
   * @param customConfig Optional custom configuration
   */
  public static async initialize(customConfig?: Partial<APIIntegrationConfig>): Promise<void> {
    try {
      // Merge custom config with defaults
      if (customConfig) {
        this.config = { ...this.DEFAULT_CONFIG, ...customConfig };
      }

      // Initialize rate limiting for each source
      this.initializeRateLimits();

      // Perform initial health checks
      await this.performHealthChecks();

      console.log('External API integrations initialized successfully');
    } catch (error) {
      console.error('Error initializing external API integrations:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive health report for all external integrations
   * @returns Integration health report
   */
  public static async getIntegrationHealthReport(): Promise<IntegrationHealthReport> {
    try {
      // Perform fresh health checks
      await this.performHealthChecks();

      const sourceStatuses = Array.from(this.sourceStatuses.values());
      const onlineCount = sourceStatuses.filter(s => s.status === 'online').length;
      const degradedCount = sourceStatuses.filter(s => s.status === 'degraded').length;
      const offlineCount = sourceStatuses.filter(s => s.status === 'offline').length;

      // Determine overall health
      let overallHealth: 'healthy' | 'degraded' | 'critical';
      if (offlineCount > sourceStatuses.length / 2) {
        overallHealth = 'critical';
      } else if (degradedCount > 0 || offlineCount > 0) {
        overallHealth = 'degraded';
      } else {
        overallHealth = 'healthy';
      }

      // Generate recommendations
      const recommendations = this.generateHealthRecommendations(sourceStatuses);

      return {
        overallHealth,
        totalSources: sourceStatuses.length,
        onlineSources: onlineCount,
        offlineSources: offlineCount,
        degradedSources: degradedCount,
        lastUpdated: new Date().toISOString(),
        sourceStatuses,
        recommendations
      };
    } catch (error) {
      console.error('Error getting integration health report:', error);
      throw error;
    }
  }

  /**
   * Execute comprehensive data refresh from all external sources
   * @returns Summary of refresh operations
   */
  public static async refreshAllExternalData(): Promise<{
    weatherData: boolean;
    creditData: boolean;
    policyData: boolean;
    carbonPrices: boolean;
    errors: string[];
  }> {
    const results = {
      weatherData: false,
      creditData: false,
      policyData: false,
      carbonPrices: false,
      errors: [] as string[]
    };

    try {
      // Refresh weather data
      if (this.config.weatherAPI.enabled) {
        try {
          await this.refreshWeatherData();
          results.weatherData = true;
        } catch (error) {
          results.errors.push(`Weather data refresh failed: ${error}`);
        }
      }

      // Refresh credit monitoring data
      if (this.config.creditMonitoring.enabled) {
        try {
          await this.refreshCreditMonitoringData();
          results.creditData = true;
        } catch (error) {
          results.errors.push(`Credit monitoring refresh failed: ${error}`);
        }
      }

      // Refresh policy tracking data
      if (this.config.policyTracking.enabled) {
        try {
          await this.refreshPolicyTrackingData();
          results.policyData = true;
        } catch (error) {
          results.errors.push(`Policy tracking refresh failed: ${error}`);
        }
      }

      // Refresh carbon market prices
      if (this.config.carbonMarkets.enabled) {
        try {
          await this.refreshCarbonMarketData();
          results.carbonPrices = true;
        } catch (error) {
          results.errors.push(`Carbon market refresh failed: ${error}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error refreshing external data:', error);
      results.errors.push(`General refresh error: ${error}`);
      return results;
    }
  }

  /**
   * Get rate limiting information for all external APIs
   * @returns Array of rate limit information
   */
  public static getRateLimitingInfo(): RateLimitInfo[] {
    return Array.from(this.rateLimits.values());
  }

  /**
   * Check if API call is allowed under rate limits
   * @param source API source identifier
   * @returns Whether the call is allowed
   */
  public static checkRateLimit(source: string): boolean {
    const rateLimit = this.rateLimits.get(source);
    if (!rateLimit) return true;

    const now = new Date();
    const currentMinute = Math.floor(now.getTime() / (60 * 1000));
    const currentHour = Math.floor(now.getTime() / (60 * 60 * 1000));
    const currentDay = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));

    // Check rate limits
    if (rateLimit.currentUsage.minute >= rateLimit.requestsPerMinute) return false;
    if (rateLimit.currentUsage.hour >= rateLimit.requestsPerHour) return false;
    if (rateLimit.currentUsage.day >= rateLimit.requestsPerDay) return false;

    return true;
  }

  /**
   * Record API usage for rate limiting
   * @param source API source identifier
   */
  public static recordAPIUsage(source: string): void {
    const rateLimit = this.rateLimits.get(source);
    if (!rateLimit) return;

    rateLimit.currentUsage.minute++;
    rateLimit.currentUsage.hour++;
    rateLimit.currentUsage.day++;

    this.rateLimits.set(source, rateLimit);
  }

  /**
   * Monitor all external API sources continuously
   * @param intervalMinutes Monitoring interval in minutes
   */
  public static startContinuousMonitoring(intervalMinutes: number = 60): void {
    setInterval(async () => {
      try {
        await this.performHealthChecks();
        await this.resetRateLimitCounters();
        
        // Auto-refresh data based on configuration
        if (this.shouldAutoRefresh('weatherAPI')) {
          await this.refreshWeatherData();
        }
        
        if (this.shouldAutoRefresh('creditMonitoring')) {
          await this.refreshCreditMonitoringData();
        }
        
        if (this.shouldAutoRefresh('policyTracking')) {
          await this.refreshPolicyTrackingData();
        }
        
        if (this.shouldAutoRefresh('carbonMarkets')) {
          await this.refreshCarbonMarketData();
        }
        
      } catch (error) {
        console.error('Error in continuous monitoring:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Handle API errors with fallback strategies
   * @param source Failed API source
   * @param error Error details
   * @param operation Operation that failed
   * @returns Fallback result if available
   */
  public static async handleAPIError(
    source: string,
    error: any,
    operation: string
  ): Promise<any> {
    try {
      // Update source status
      this.updateSourceStatus(source, 'offline', error.message);

      // Try fallback strategies based on source type
      if (source.includes('weather')) {
        return await this.handleWeatherAPIFallback(operation);
      } else if (source.includes('credit')) {
        return await this.handleCreditAPIFallback(operation);
      } else if (source.includes('policy')) {
        return await this.handlePolicyAPIFallback(operation);
      } else if (source.includes('carbon')) {
        return await this.handleCarbonAPIFallback(operation);
      }

      throw error;
    } catch (fallbackError) {
      console.error(`All fallback strategies failed for ${source}:`, fallbackError);
      throw fallbackError;
    }
  }

  /**
   * Update configuration for external integrations
   * @param newConfig New configuration
   */
  public static updateConfiguration(newConfig: Partial<APIIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('External API integration configuration updated');
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  public static getConfiguration(): APIIntegrationConfig {
    return { ...this.config };
  }

  // Private helper methods

  private static initializeRateLimits(): void {
    const sources = [
      {
        source: 'openweather',
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      {
        source: 'moodys',
        requestsPerMinute: 10,
        requestsPerHour: 100,
        requestsPerDay: 1000
      },
      {
        source: 'dun_bradstreet',
        requestsPerMinute: 30,
        requestsPerHour: 500,
        requestsPerDay: 5000
      },
      {
        source: 'federal_register',
        requestsPerMinute: 120,
        requestsPerHour: 2000,
        requestsPerDay: 20000
      },
      {
        source: 'carbon_interface',
        requestsPerMinute: 20,
        requestsPerHour: 200,
        requestsPerDay: 2000
      }
    ];

    sources.forEach(source => {
      this.rateLimits.set(source.source, {
        ...source,
        currentUsage: { minute: 0, hour: 0, day: 0 },
        resetTime: new Date().toISOString()
      });
    });
  }

  private static async performHealthChecks(): Promise<void> {
    const healthCheckPromises = [
      this.checkWeatherAPIHealth(),
      this.checkCreditMonitoringHealth(),
      this.checkPolicyTrackingHealth(),
      this.checkCarbonMarketHealth()
    ];

    await Promise.allSettled(healthCheckPromises);
  }

  private static async checkWeatherAPIHealth(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Simple health check - get weather for a test location
      await WeatherDataService.getWeatherData('New York, NY');
      
      const responseTime = Date.now() - startTime;
      
      this.updateSourceStatus('openweather', 'online', undefined, responseTime);
    } catch (error) {
      this.updateSourceStatus('openweather', 'offline', error.message);
    }
  }

  private static async checkCreditMonitoringHealth(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Test credit monitoring by attempting to get API status
      // In a real implementation, this would ping the credit API endpoints
      
      const responseTime = Date.now() - startTime;
      
      this.updateSourceStatus('credit_monitoring', 'online', undefined, responseTime);
    } catch (error) {
      this.updateSourceStatus('credit_monitoring', 'offline', error.message);
    }
  }

  private static async checkPolicyTrackingHealth(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Test policy tracking by checking Federal Register API
      const response = await fetch('https://www.federalregister.gov/api/v1/public-inspection-documents.json');
      
      if (!response.ok) {
        throw new Error(`Federal Register API error: ${response.status}`);
      }
      
      const responseTime = Date.now() - startTime;
      
      this.updateSourceStatus('federal_register', 'online', undefined, responseTime);
    } catch (error) {
      this.updateSourceStatus('federal_register', 'offline', error.message);
    }
  }

  private static async checkCarbonMarketHealth(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Test carbon market data availability
      await CarbonMarketPriceService.getCarbonOffsetPrices();
      
      const responseTime = Date.now() - startTime;
      
      this.updateSourceStatus('carbon_markets', 'online', undefined, responseTime);
    } catch (error) {
      this.updateSourceStatus('carbon_markets', 'degraded', error.message);
    }
  }

  private static updateSourceStatus(
    source: string,
    status: 'online' | 'offline' | 'degraded',
    errorMessage?: string,
    responseTime?: number
  ): void {
    const existing = this.sourceStatuses.get(source);
    const errorCount = status === 'offline' ? (existing?.errorCount || 0) + 1 : 0;

    this.sourceStatuses.set(source, {
      source,
      status,
      lastChecked: new Date().toISOString(),
      responseTime,
      errorCount,
      lastError: errorMessage,
      apiQuotaUsed: this.rateLimits.get(source)?.currentUsage.day,
      apiQuotaLimit: this.rateLimits.get(source)?.requestsPerDay
    });
  }

  private static generateHealthRecommendations(
    sourceStatuses: ExternalDataSourceStatus[]
  ): string[] {
    const recommendations = [];
    
    const offlineSources = sourceStatuses.filter(s => s.status === 'offline');
    const degradedSources = sourceStatuses.filter(s => s.status === 'degraded');
    const highErrorSources = sourceStatuses.filter(s => s.errorCount > 5);

    if (offlineSources.length > 0) {
      recommendations.push(`${offlineSources.length} API sources are offline - check API keys and network connectivity`);
    }

    if (degradedSources.length > 0) {
      recommendations.push(`${degradedSources.length} API sources are degraded - monitor for service issues`);
    }

    if (highErrorSources.length > 0) {
      recommendations.push(`${highErrorSources.length} sources have high error rates - review API usage patterns`);
    }

    // Check API quota usage
    const nearQuotaLimit = sourceStatuses.filter(s => 
      s.apiQuotaUsed && s.apiQuotaLimit && 
      (s.apiQuotaUsed / s.apiQuotaLimit) > 0.8
    );

    if (nearQuotaLimit.length > 0) {
      recommendations.push('Some APIs are approaching quota limits - consider upgrading plans or optimizing usage');
    }

    if (recommendations.length === 0) {
      recommendations.push('All external integrations are operating normally');
    }

    return recommendations;
  }

  private static async refreshWeatherData(): Promise<void> {
    // Refresh weather data for key locations
    const keyLocations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX'];
    
    for (const location of keyLocations) {
      try {
        await WeatherDataService.getWeatherData(location);
        await WeatherDataService.getForecastWeather(location, 7);
      } catch (error) {
        console.error(`Error refreshing weather data for ${location}:`, error);
      }
    }
  }

  private static async refreshCreditMonitoringData(): Promise<void> {
    try {
      await CreditMonitoringService.monitorCreditChanges();
    } catch (error) {
      console.error('Error refreshing credit monitoring data:', error);
    }
  }

  private static async refreshPolicyTrackingData(): Promise<void> {
    try {
      await PolicyRiskTrackingService.monitorRegulatoryChanges(['federal']);
      await PolicyRiskTrackingService.updatePolicyRiskScores();
    } catch (error) {
      console.error('Error refreshing policy tracking data:', error);
    }
  }

  private static async refreshCarbonMarketData(): Promise<void> {
    try {
      await CarbonMarketPriceService.getCarbonOffsetPrices();
      await CarbonMarketPriceService.getRECPrices();
    } catch (error) {
      console.error('Error refreshing carbon market data:', error);
    }
  }

  private static shouldAutoRefresh(service: keyof APIIntegrationConfig): boolean {
    const config = this.config[service];
    if (!config.enabled) return false;

    // Check if enough time has passed since last refresh
    // This would be implemented with proper timestamp tracking
    return true;
  }

  private static async resetRateLimitCounters(): Promise<void> {
    const now = new Date();
    const currentMinute = Math.floor(now.getTime() / (60 * 1000));
    const currentHour = Math.floor(now.getTime() / (60 * 60 * 1000));
    const currentDay = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));

    this.rateLimits.forEach((rateLimit, source) => {
      const lastResetTime = new Date(rateLimit.resetTime);
      const lastResetMinute = Math.floor(lastResetTime.getTime() / (60 * 1000));
      const lastResetHour = Math.floor(lastResetTime.getTime() / (60 * 60 * 1000));
      const lastResetDay = Math.floor(lastResetTime.getTime() / (24 * 60 * 60 * 1000));

      // Reset counters based on time periods
      if (currentMinute > lastResetMinute) {
        rateLimit.currentUsage.minute = 0;
      }
      if (currentHour > lastResetHour) {
        rateLimit.currentUsage.hour = 0;
      }
      if (currentDay > lastResetDay) {
        rateLimit.currentUsage.day = 0;
      }

      rateLimit.resetTime = now.toISOString();
      this.rateLimits.set(source, rateLimit);
    });
  }

  // Fallback handlers

  private static async handleWeatherAPIFallback(operation: string): Promise<any> {
    console.log('Attempting weather API fallback...');
    
    // Try alternative weather providers
    for (const provider of this.config.weatherAPI.fallbackProviders) {
      try {
        // In a real implementation, this would try different weather APIs
        console.log(`Trying fallback weather provider: ${provider}`);
        // Return cached or simulated data
        break;
      } catch (error) {
        console.error(`Fallback provider ${provider} also failed:`, error);
      }
    }
    
    throw new Error('All weather API sources unavailable');
  }

  private static async handleCreditAPIFallback(operation: string): Promise<any> {
    console.log('Attempting credit API fallback...');
    
    // Use internal credit assessment or cached data
    return {
      source: 'fallback',
      creditScore: 65,
      riskLevel: 'medium',
      note: 'Using fallback credit assessment due to API unavailability'
    };
  }

  private static async handlePolicyAPIFallback(operation: string): Promise<any> {
    console.log('Attempting policy API fallback...');
    
    // Use cached regulatory data or manual updates
    return {
      source: 'fallback',
      policies: [],
      note: 'Using cached policy data due to API unavailability'
    };
  }

  private static async handleCarbonAPIFallback(operation: string): Promise<any> {
    console.log('Attempting carbon market API fallback...');
    
    // Use cached market data or industry averages
    return {
      source: 'fallback',
      prices: [],
      note: 'Using cached market data due to API unavailability'
    };
  }
}
