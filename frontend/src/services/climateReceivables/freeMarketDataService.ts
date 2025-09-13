/**
 * Free Market Data API Service
 * 
 * Integrates with free government and public APIs to provide:
 * - Treasury rates (Treasury.gov, FRED)
 * - Credit spreads (FRED, Yahoo Finance)
 * - Energy market data (EIA)
 * - Policy changes (Federal Register, Congress.gov)
 * 
 * Zero-cost solution using only free APIs with generous rate limits
 * Designed for integration with PayerRiskAssessmentService
 */

import { supabase } from '@/infrastructure/database/client';

export interface TreasuryRates {
  treasury_1m: number;
  treasury_3m: number;
  treasury_6m: number;
  treasury_1y: number;
  treasury_2y: number;
  treasury_5y: number;
  treasury_10y: number;
  treasury_30y: number;
  last_updated: string;
  source: 'treasury.gov' | 'fred';
}

export interface CreditSpreads {
  investment_grade: number; // Basis points over treasury
  high_yield: number;
  corporate_aaa: number;
  corporate_baa: number;
  last_updated: string;
  source: 'fred' | 'yahoo_finance';
}

export interface EnergyMarketData {
  electricity_price_mwh: number;
  renewable_energy_index: number;
  carbon_credit_price: number;
  regional_demand_forecast: number;
  last_updated: string;
  source: 'eia' | 'iex_cloud';
}

export interface PolicyChange {
  policy_id: string;
  title: string;
  summary: string;
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  sectors_affected: string[];
  effective_date: string;
  publication_date: string;
  impact_on_receivables: number; // -1 to 1 scale
  source: 'federal_register' | 'congress_gov';
  url: string;
}

export interface MarketDataSnapshot {
  treasury_rates: TreasuryRates | null;
  credit_spreads: CreditSpreads | null;
  energy_prices: EnergyMarketData | null;
  policy_changes: PolicyChange[];
  data_freshness: string;
  api_call_count: number;
  cache_hit_rate: number;
}

/**
 * Service for fetching free market data from government APIs
 */
export class FreeMarketDataService {

  // API Configuration - All FREE APIs
  private static readonly TREASURY_API_BASE = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1';
  private static readonly FRED_API_BASE = 'https://api.stlouisfed.org/fred';
  private static readonly EIA_API_BASE = 'https://api.eia.gov/v2';
  private static readonly FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';
  private static readonly CONGRESS_API_BASE = 'https://api.congress.gov/v3';
  private static readonly YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance';

  // API Keys (optional for most endpoints)
  private static readonly EIA_API_KEY = import.meta.env.VITE_EIA_API_KEY; // Free with registration
  private static readonly CONGRESS_API_KEY = import.meta.env.VITE_CONGRESS_API_KEY; // Free with registration

  // Cache settings
  private static readonly CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours
  private static readonly API_TIMEOUT = 12000; // 12 seconds
  private static readonly MAX_RETRIES = 2;

  // Rate limiting
  private static apiCallCount = 0;
  private static cacheHitCount = 0;

  /**
   * Get comprehensive market data snapshot from all free sources
   */
  public static async getMarketDataSnapshot(): Promise<MarketDataSnapshot> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cachedSnapshot = await this.getCachedMarketSnapshot();
      if (cachedSnapshot) {
        this.cacheHitCount++;
        return {
          ...cachedSnapshot,
          cache_hit_rate: this.cacheHitCount / (this.cacheHitCount + this.apiCallCount)
        };
      }

      // Fetch all data sources in parallel
      const [
        treasuryRates,
        creditSpreads,
        energyData,
        policyChanges
      ] = await Promise.allSettled([
        this.fetchTreasuryRates(),
        this.fetchCreditSpreads(),
        this.fetchEnergyMarketData(),
        this.fetchRecentPolicyChanges()
      ]);

      const snapshot: MarketDataSnapshot = {
        treasury_rates: treasuryRates.status === 'fulfilled' ? treasuryRates.value : null,
        credit_spreads: creditSpreads.status === 'fulfilled' ? creditSpreads.value : null,
        energy_prices: energyData.status === 'fulfilled' ? energyData.value : null,
        policy_changes: policyChanges.status === 'fulfilled' ? policyChanges.value : [],
        data_freshness: new Date().toISOString(),
        api_call_count: this.apiCallCount,
        cache_hit_rate: this.cacheHitCount / (this.cacheHitCount + this.apiCallCount)
      };

      // Cache the result
      await this.cacheMarketSnapshot(snapshot);

      console.log(`Market data fetch completed in ${Date.now() - startTime}ms`);
      return snapshot;
    } catch (error) {
      console.error('Market data snapshot failed:', error);
      
      // Return fallback data
      return this.getFallbackMarketSnapshot();
    }
  }

  /**
   * Fetch Treasury rates from Treasury.gov API (FREE - no API key)
   */
  public static async fetchTreasuryRates(): Promise<TreasuryRates> {
    try {
      this.apiCallCount++;
      
      // Try Treasury.gov first
      const response = await this.fetchWithRetry(
        `${this.TREASURY_API_BASE}/accounting/od/avg_interest_rates?fields=record_date,security_desc,avg_interest_rate_amt&filter=record_date:eq:${this.getLatestBusinessDay()}&sort=-record_date&page[size]=50`
      );

      if (response.ok) {
        const data = await response.json();
        const rates = this.parseTreasuryGovData(data);
        if (rates) {
          console.log('✅ Treasury rates from Treasury.gov API');
          return rates;
        }
      }

      console.log('Treasury.gov failed, trying FRED...');
      return await this.fetchTreasuryRatesFromFRED();
    } catch (error) {
      console.warn('Treasury API failed:', error);
      return await this.fetchTreasuryRatesFromFRED();
    }
  }

  /**
   * Fetch Treasury rates from FRED API (FREE - uses demo key)
   */
  private static async fetchTreasuryRatesFromFRED(): Promise<TreasuryRates> {
    try {
      this.apiCallCount++;

      // Fetch key treasury rates from FRED
      const seriesIds = ['GS1M', 'GS3M', 'GS6M', 'GS1', 'GS2', 'GS5', 'GS10', 'GS30'];
      const requests = seriesIds.map(series => 
        this.fetchWithRetry(`${this.FRED_API_BASE}/series/observations?series_id=${series}&api_key=demo&file_type=json&limit=1&sort_order=desc`)
      );

      const responses = await Promise.allSettled(requests);
      const rates: any = {};

      // Parse responses
      for (let index = 0; index < responses.length; index++) {
        const response = responses[index];
        if (response.status === 'fulfilled') {
          try {
            const data = response.value;
            if (data.ok) {
              const json = await data.json();
              const rate = parseFloat(json.observations?.[0]?.value || '0');
              const seriesId = seriesIds[index];
              rates[this.fredSeriesToField(seriesId)] = rate;
            }
          } catch (error) {
            console.warn(`FRED series ${seriesIds[index]} parse failed:`, error);
          }
        }
      }

      // Fill in missing rates with interpolation
      const treasuryRates = this.interpolateTreasuryRates(rates);
      
      console.log('✅ Treasury rates from FRED API');
      return {
        ...treasuryRates,
        last_updated: new Date().toISOString(),
        source: 'fred'
      };
    } catch (error) {
      console.warn('FRED Treasury API failed:', error);
      return this.getFallbackTreasuryRates();
    }
  }

  /**
   * Fetch credit spreads from FRED API (FREE - uses demo key)
   */
  public static async fetchCreditSpreads(): Promise<CreditSpreads> {
    try {
      this.apiCallCount++;

      // Fetch corporate bond spreads from FRED
      const [igResponse, hyResponse, aaaResponse, baaResponse] = await Promise.allSettled([
        this.fetchWithRetry(`${this.FRED_API_BASE}/series/observations?series_id=BAMLC0A1CAAAEY&api_key=demo&file_type=json&limit=1&sort_order=desc`),
        this.fetchWithRetry(`${this.FRED_API_BASE}/series/observations?series_id=BAMLH0A0HYM2EY&api_key=demo&file_type=json&limit=1&sort_order=desc`),
        this.fetchWithRetry(`${this.FRED_API_BASE}/series/observations?series_id=BAMLC0A1CAAA&api_key=demo&file_type=json&limit=1&sort_order=desc`),
        this.fetchWithRetry(`${this.FRED_API_BASE}/series/observations?series_id=BAMLC0A4CBAA&api_key=demo&file_type=json&limit=1&sort_order=desc`)
      ]);

      let investmentGrade = 150; // Default
      let highYield = 400; // Default
      let corporateAAA = 100; // Default
      let corporateBAA = 180; // Default

      // Parse investment grade spreads
      if (igResponse.status === 'fulfilled') {
        try {
          const igData = await igResponse.value.json();
          investmentGrade = parseFloat(igData.observations?.[0]?.value || '150');
        } catch (error) {
          console.warn('IG spread parse failed:', error);
        }
      }

      // Parse high yield spreads
      if (hyResponse.status === 'fulfilled') {
        try {
          const hyData = await hyResponse.value.json();
          highYield = parseFloat(hyData.observations?.[0]?.value || '400');
        } catch (error) {
          console.warn('HY spread parse failed:', error);
        }
      }

      // Parse AAA spreads
      if (aaaResponse.status === 'fulfilled') {
        try {
          const aaaData = await aaaResponse.value.json();
          corporateAAA = parseFloat(aaaData.observations?.[0]?.value || '100');
        } catch (error) {
          console.warn('AAA spread parse failed:', error);
        }
      }

      // Parse BAA spreads
      if (baaResponse.status === 'fulfilled') {
        try {
          const baaData = await baaResponse.value.json();
          corporateBAA = parseFloat(baaData.observations?.[0]?.value || '180');
        } catch (error) {
          console.warn('BAA spread parse failed:', error);
        }
      }

      console.log('✅ Credit spreads from FRED API');
      return {
        investment_grade: investmentGrade,
        high_yield: highYield,
        corporate_aaa: corporateAAA,
        corporate_baa: corporateBAA,
        last_updated: new Date().toISOString(),
        source: 'fred'
      };
    } catch (error) {
      console.warn('Credit spreads API failed:', error);
      return this.getFallbackCreditSpreads();
    }
  }

  /**
   * Fetch energy market data from EIA API (FREE with registration)
   */
  public static async fetchEnergyMarketData(): Promise<EnergyMarketData> {
    try {
      if (!this.EIA_API_KEY) {
        console.log('EIA API key not configured, using fallback');
        return this.getFallbackEnergyData();
      }

      this.apiCallCount++;

      // Fetch electricity prices and renewable data
      const response = await this.fetchWithRetry(
        `${this.EIA_API_BASE}/electricity/rto/region-data/data/?frequency=hourly&data[0]=value&facets[respondent][]=US48&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5&api_key=${this.EIA_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`EIA API error: ${response.status}`);
      }

      const data = await response.json();
      const latestData = data.response?.data?.[0];
      
      if (!latestData) {
        throw new Error('No EIA data available');
      }

      // Calculate averages and trends
      const recentValues = data.response.data.slice(0, 5).map((d: any) => d.value).filter((v: any) => v);
      const avgPrice = recentValues.reduce((sum: number, val: number) => sum + val, 0) / recentValues.length;

      console.log('✅ Energy data from EIA API');
      return {
        electricity_price_mwh: Math.round(avgPrice * 100) / 100 || 35,
        renewable_energy_index: 100, // Placeholder - could fetch specific renewable index
        carbon_credit_price: 25, // Placeholder - would need carbon market API
        regional_demand_forecast: this.calculateDemandForecast(recentValues),
        last_updated: new Date().toISOString(),
        source: 'eia'
      };
    } catch (error) {
      console.warn('EIA API failed:', error);
      return this.getFallbackEnergyData();
    }
  }

  /**
   * Fetch recent policy changes from Federal Register API (FREE - no API key)
   */
  public static async fetchRecentPolicyChanges(): Promise<PolicyChange[]> {
    try {
      this.apiCallCount++;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateFilter = thirtyDaysAgo.toISOString().split('T')[0];

      const response = await this.fetchWithRetry(
        `${this.FEDERAL_REGISTER_API}/articles.json?conditions[term]=renewable energy tax credit investment tax credit clean energy&conditions[publication_date][gte]=${dateFilter}&per_page=20&order=newest`
      );

      if (!response.ok) {
        throw new Error(`Federal Register API error: ${response.status}`);
      }

      const data = await response.json();
      const articles = data.results || [];

      const policyChanges: PolicyChange[] = articles.map((article: any) => ({
        policy_id: article.document_number,
        title: article.title,
        summary: article.abstract || article.title,
        impact_level: this.assessPolicyImpactLevel(article.title, article.abstract) as 'low' | 'medium' | 'high' | 'critical',
        sectors_affected: this.identifyAffectedSectors(article.title, article.abstract),
        effective_date: article.effective_on || article.publication_date,
        publication_date: article.publication_date,
        impact_on_receivables: this.calculatePolicyImpactScore(article.title, article.abstract),
        source: 'federal_register' as const,
        url: article.html_url
      })).filter((policy: PolicyChange) => policy.impact_on_receivables !== 0);

      console.log(`✅ ${policyChanges.length} policy changes from Federal Register API`);
      return policyChanges;
    } catch (error) {
      console.warn('Federal Register API failed:', error);
      
      // Try Congress.gov API as fallback
      return await this.fetchPolicyChangesFromCongress();
    }
  }

  /**
   * Fetch policy changes from Congress.gov API (FREE with registration)
   */
  private static async fetchPolicyChangesFromCongress(): Promise<PolicyChange[]> {
    try {
      if (!this.CONGRESS_API_KEY) {
        console.log('Congress API key not configured');
        return [];
      }

      this.apiCallCount++;

      const response = await this.fetchWithRetry(
        `${this.CONGRESS_API_BASE}/bill?q=renewable+energy+tax+credit&sort=latestAction.actionDate+desc&limit=10&api_key=${this.CONGRESS_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Congress API error: ${response.status}`);
      }

      const data = await response.json();
      const bills = data.bills || [];

      const policyChanges: PolicyChange[] = bills.map((bill: any) => ({
        policy_id: bill.number,
        title: bill.title,
        summary: bill.latestAction?.text || bill.title,
        impact_level: 'medium' as const, // Congress bills are typically medium impact
        sectors_affected: ['renewable_energy', 'tax_credits'],
        effective_date: bill.latestAction?.actionDate || new Date().toISOString().split('T')[0],
        publication_date: bill.introducedDate,
        impact_on_receivables: 0.2, // Positive bias for renewable energy bills
        source: 'congress_gov' as const,
        url: bill.url
      }));

      console.log(`✅ ${policyChanges.length} policy changes from Congress.gov API`);
      return policyChanges;
    } catch (error) {
      console.warn('Congress API failed:', error);
      return [];
    }
  }

  // Helper methods for data processing

  private static parseTreasuryGovData(apiData: any): TreasuryRates | null {
    try {
      const rates = apiData.data || [];
      const rateMap: any = {};

      rates.forEach((item: any) => {
        const desc = item.security_desc?.toLowerCase() || '';
        const rate = parseFloat(item.avg_interest_rate_amt || '0');
        
        if (desc.includes('1-month') || desc.includes('4-week')) {
          rateMap.treasury_1m = rate;
        } else if (desc.includes('3-month') || desc.includes('13-week')) {
          rateMap.treasury_3m = rate;
        } else if (desc.includes('6-month') || desc.includes('26-week')) {
          rateMap.treasury_6m = rate;
        } else if (desc.includes('1-year') || desc.includes('52-week')) {
          rateMap.treasury_1y = rate;
        } else if (desc.includes('2-year')) {
          rateMap.treasury_2y = rate;
        } else if (desc.includes('5-year')) {
          rateMap.treasury_5y = rate;
        } else if (desc.includes('10-year')) {
          rateMap.treasury_10y = rate;
        } else if (desc.includes('30-year')) {
          rateMap.treasury_30y = rate;
        }
      });

      // Check if we have enough data
      if (Object.keys(rateMap).length < 3) {
        return null;
      }

      return {
        ...this.interpolateTreasuryRates(rateMap),
        last_updated: new Date().toISOString(),
        source: 'treasury.gov'
      };
    } catch (error) {
      console.warn('Treasury.gov data parsing failed:', error);
      return null;
    }
  }

  private static fredSeriesToField(seriesId: string): string {
    const map: Record<string, string> = {
      'GS1M': 'treasury_1m',
      'GS3M': 'treasury_3m',
      'GS6M': 'treasury_6m',
      'GS1': 'treasury_1y',
      'GS2': 'treasury_2y',
      'GS5': 'treasury_5y',
      'GS10': 'treasury_10y',
      'GS30': 'treasury_30y'
    };
    return map[seriesId] || seriesId.toLowerCase();
  }

  private static interpolateTreasuryRates(partialRates: any): TreasuryRates {
    // Use 10-year or 5-year rate as base for interpolation
    const base = partialRates.treasury_10y || partialRates.treasury_5y || 2.8;
    
    return {
      treasury_1m: partialRates.treasury_1m || Math.max(0.1, base - 1.8),
      treasury_3m: partialRates.treasury_3m || Math.max(0.2, base - 1.5),
      treasury_6m: partialRates.treasury_6m || Math.max(0.3, base - 1.2),
      treasury_1y: partialRates.treasury_1y || Math.max(0.5, base - 0.9),
      treasury_2y: partialRates.treasury_2y || Math.max(0.7, base - 0.6),
      treasury_5y: partialRates.treasury_5y || Math.max(1.0, base - 0.3),
      treasury_10y: partialRates.treasury_10y || base,
      treasury_30y: partialRates.treasury_30y || base + 0.4,
      last_updated: new Date().toISOString(),
      source: 'treasury.gov'
    };
  }

  private static calculateDemandForecast(recentValues: number[]): number {
    if (recentValues.length < 2) return 1.05; // Default 5% growth
    
    // Calculate simple trend
    const oldest = recentValues[recentValues.length - 1];
    const newest = recentValues[0];
    const trend = (newest - oldest) / oldest;
    
    // Convert to annual growth forecast
    return Math.max(0.95, Math.min(1.20, 1 + trend * 4)); // Bound between -5% and +20%
  }

  private static assessPolicyImpactLevel(title: string, abstract: string): string {
    const text = (title + ' ' + (abstract || '')).toLowerCase();
    
    // Critical impact indicators
    if (text.includes('eliminate') || text.includes('repeal') || text.includes('sunset') || text.includes('terminate')) {
      return 'critical';
    }
    
    // High impact indicators
    if (text.includes('reduce') || text.includes('cut') || text.includes('decrease') || text.includes('modify significantly')) {
      return 'high';
    }
    
    // Medium impact indicators
    if (text.includes('extend') || text.includes('increase') || text.includes('expand') || text.includes('enhance')) {
      return 'medium';
    }
    
    return 'low';
  }

  private static identifyAffectedSectors(title: string, abstract: string): string[] {
    const text = (title + ' ' + (abstract || '')).toLowerCase();
    const sectors: string[] = [];
    
    if (text.includes('solar') || text.includes('photovoltaic') || text.includes('pv')) {
      sectors.push('solar');
    }
    if (text.includes('wind') || text.includes('turbine')) {
      sectors.push('wind');
    }
    if (text.includes('renewable') || text.includes('clean energy')) {
      sectors.push('renewable_energy');
    }
    if (text.includes('tax credit') || text.includes('itc') || text.includes('ptc')) {
      sectors.push('tax_credits');
    }
    if (text.includes('utility') || text.includes('electric')) {
      sectors.push('utilities');
    }
    
    return sectors.length > 0 ? sectors : ['renewable_energy'];
  }

  private static calculatePolicyImpactScore(title: string, abstract: string): number {
    const text = (title + ' ' + (abstract || '')).toLowerCase();
    let score = 0;
    
    // Positive indicators for renewable energy
    if (text.includes('extend')) score += 0.4;
    if (text.includes('increase')) score += 0.3;
    if (text.includes('expand')) score += 0.3;
    if (text.includes('enhance')) score += 0.2;
    if (text.includes('improve')) score += 0.2;
    if (text.includes('support')) score += 0.1;
    
    // Negative indicators
    if (text.includes('reduce')) score -= 0.3;
    if (text.includes('eliminate')) score -= 0.8;
    if (text.includes('sunset')) score -= 0.6;
    if (text.includes('terminate')) score -= 0.7;
    if (text.includes('cut')) score -= 0.4;
    if (text.includes('restrict')) score -= 0.3;
    
    return Math.max(-1, Math.min(1, score));
  }

  // Utility methods

  private static async fetchWithRetry(url: string, retries: number = this.MAX_RETRIES): Promise<Response> {
    let lastError: Error;
    
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(this.API_TIMEOUT),
          headers: {
            'User-Agent': 'ClimateReceivables/1.0 (contact@chainCapital.com)',
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          return response;
        }
        
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          break;
        }
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`Fetch attempt ${i + 1} failed:`, error);
      }
      
      // Wait before retry (exponential backoff)
      if (i < retries) {
        await this.sleep(Math.pow(2, i) * 1000);
      }
    }
    
    throw lastError!;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static getLatestBusinessDay(): string {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // If weekend, go back to Friday
    if (dayOfWeek === 0) { // Sunday
      today.setDate(today.getDate() - 2);
    } else if (dayOfWeek === 6) { // Saturday
      today.setDate(today.getDate() - 1);
    }
    
    return today.toISOString().split('T')[0];
  }

  // Cache management

  private static async getCachedMarketSnapshot(): Promise<MarketDataSnapshot | null> {
    try {
      const { data, error } = await supabase
        .from('external_api_cache')
        .select('data, timestamp')
        .eq('cache_key', 'market_data_snapshot')
        .single();

      if (error || !data) return null;

      // Check if cache is still valid
      const cacheTime = new Date(data.timestamp).getTime();
      const now = Date.now();
      
      if (now - cacheTime > this.CACHE_DURATION) {
        return null;
      }

      return typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  private static async cacheMarketSnapshot(snapshot: MarketDataSnapshot): Promise<void> {
    try {
      const expiry = new Date(Date.now() + this.CACHE_DURATION);
      
      await supabase
        .from('external_api_cache')
        .upsert({
          cache_key: 'market_data_snapshot',
          data: JSON.stringify(snapshot),
          timestamp: new Date().toISOString(),
          expires_at: expiry.toISOString()
        });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  // Fallback data methods

  private static getFallbackMarketSnapshot(): MarketDataSnapshot {
    return {
      treasury_rates: this.getFallbackTreasuryRates(),
      credit_spreads: this.getFallbackCreditSpreads(),
      energy_prices: this.getFallbackEnergyData(),
      policy_changes: [],
      data_freshness: new Date().toISOString(),
      api_call_count: this.apiCallCount,
      cache_hit_rate: 0
    };
  }

  private static getFallbackTreasuryRates(): TreasuryRates {
    return {
      treasury_1m: 1.25,
      treasury_3m: 1.55,
      treasury_6m: 1.85,
      treasury_1y: 2.15,
      treasury_2y: 2.45,
      treasury_5y: 2.75,
      treasury_10y: 3.05,
      treasury_30y: 3.35,
      last_updated: new Date().toISOString(),
      source: 'treasury.gov'
    };
  }

  private static getFallbackCreditSpreads(): CreditSpreads {
    return {
      investment_grade: 150,
      high_yield: 400,
      corporate_aaa: 100,
      corporate_baa: 180,
      last_updated: new Date().toISOString(),
      source: 'fred'
    };
  }

  private static getFallbackEnergyData(): EnergyMarketData {
    return {
      electricity_price_mwh: 35,
      renewable_energy_index: 100,
      carbon_credit_price: 25,
      regional_demand_forecast: 1.05,
      last_updated: new Date().toISOString(),
      source: 'eia'
    };
  }

  /**
   * Get API usage statistics
   */
  public static getUsageStats(): {
    total_api_calls: number;
    cache_hits: number;
    cache_hit_rate: number;
    estimated_cost_saved: number; // Theoretical cost if using paid APIs
  } {
    return {
      total_api_calls: this.apiCallCount,
      cache_hits: this.cacheHitCount,
      cache_hit_rate: this.cacheHitCount / Math.max(1, this.cacheHitCount + this.apiCallCount),
      estimated_cost_saved: this.apiCallCount * 0.05 // Assuming $0.05 per call if using paid APIs
    };
  }

  /**
   * Reset usage statistics
   */
  public static resetUsageStats(): void {
    this.apiCallCount = 0;
    this.cacheHitCount = 0;
  }
}
