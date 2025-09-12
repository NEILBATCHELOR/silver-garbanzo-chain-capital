import { supabase } from '@/infrastructure/database/client';
import { ClimatePolicy, EnergyAsset, ClimateReceivable } from '../../types';

/**
 * Regulatory news item interface
 */
interface RegulatoryNewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  publishedDate: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  categories: string[];
  regions: string[];
  affectedSectors: string[];
  url?: string;
  summary: string;
}

/**
 * Policy alert interface
 */
interface PolicyAlert {
  alertId: string;
  policyId: string;
  alertType: 'new_policy' | 'policy_change' | 'expiration_warning' | 'compliance_deadline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedAssets: string[];
  affectedReceivables: string[];
  recommendedActions: string[];
  deadline?: string;
  createdAt: string;
  resolved: boolean;
}

/**
 * Policy impact assessment interface
 */
interface PolicyImpactAssessment {
  policyId: string;
  impactType: 'financial' | 'operational' | 'compliance' | 'strategic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedFinancialImpact?: number;
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  affectedEntities: {
    assets: string[];
    receivables: string[];
    incentives: string[];
  };
  mitigationStrategies: string[];
  complianceRequirements: string[];
}

/**
 * Service for tracking policy and regulatory changes affecting renewable energy receivables
 * Monitors regulatory news feeds and provides risk assessments
 */
export class PolicyRiskTrackingService {
  // FREE API Endpoints (NO API KEYS REQUIRED)
  private static readonly FEDERAL_REGISTER_BASE_URL = 'https://www.federalregister.gov/api/v1';
  private static readonly CONGRESS_BASE_URL = 'https://api.congress.gov/v3';
  
  // OPTIONAL API Endpoints (FREE TIER AVAILABLE)
  private static readonly GOVINFO_API_KEY = import.meta.env.VITE_GOVINFO_API_KEY; // Optional
  private static readonly LEGISCAN_API_KEY = import.meta.env.VITE_LEGISCAN_API_KEY; // Optional
  private static readonly GOVINFO_BASE_URL = 'https://api.govinfo.gov';
  
  // Cache and monitoring settings
  private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  private static readonly MONITORING_KEYWORDS = [
    'renewable energy', 'tax credit', 'investment tax credit', 'production tax credit',
    'renewable portfolio standard', 'net metering', 'feed-in tariff', 'solar', 'wind',
    'energy storage', 'carbon pricing', 'emissions trading', 'clean energy standard',
    'utility regulation', 'power purchase agreement', 'interconnection standards'
  ];

  /**
   * Monitor regulatory changes using FREE APIs with batch processing
   * @param regions Array of regions to monitor (e.g., ['federal', 'california', 'texas'])
   * @returns Array of new policy alerts
   */
  public static async monitorRegulatoryChanges(
    regions: string[] = ['federal']
  ): Promise<PolicyAlert[]> {
    try {
      console.log(`[BATCH] Monitoring regulatory changes for regions: ${regions.join(', ')}`);
      const alerts: PolicyAlert[] = [];
      
      // Fetch regulatory news from FREE sources only
      const newsItems = await this.fetchRegulatoryNewsFromFreeAPIs(regions);
      console.log(`[BATCH] Found ${newsItems.length} regulatory news items`);
      
      // Analyze news items for policy impacts
      for (const newsItem of newsItems) {
        const policyAlerts = await this.analyzeNewsForPolicyImpacts(newsItem);
        alerts.push(...policyAlerts);
      }
      
      // Check for upcoming policy deadlines
      const deadlineAlerts = await this.checkUpcomingDeadlines();
      alerts.push(...deadlineAlerts);
      
      // Save alerts to database
      if (alerts.length > 0) {
        await this.saveAlertsToDatabase(alerts);
        console.log(`[BATCH] Generated ${alerts.length} policy alerts`);
      }
      
      return alerts;
    } catch (error) {
      console.error('[BATCH] Error monitoring regulatory changes:', error);
      return [];
    }
  }

  /**
   * Get policy impact assessment for a specific policy or regulatory change
   * @param policyId Policy ID or regulatory change identifier
   * @param assetIds Optional array of asset IDs to assess impact for
   * @returns Detailed policy impact assessment
   */
  public static async assessPolicyImpact(
    policyId: string,
    assetIds?: string[]
  ): Promise<PolicyImpactAssessment> {
    try {
      // Get policy details
      const policy = await this.getPolicyDetails(policyId);
      if (!policy) {
        throw new Error('Policy not found');
      }

      // Get affected assets (all or filtered)
      const assets = assetIds ? 
        await this.getSpecificAssets(assetIds) : 
        await this.getAllEnergyAssets();

      // Get affected receivables
      const receivables = await this.getReceivablesForAssets(assets.map(a => a.assetId));

      // Analyze financial impact
      const financialImpact = this.calculateFinancialImpact(policy, assets, receivables);

      // Determine severity based on impact
      const severity = this.determinePolicyImpactSeverity(policy, financialImpact);

      // Generate mitigation strategies
      const mitigationStrategies = this.generateMitigationStrategies(policy, severity);

      // Identify compliance requirements
      const complianceRequirements = this.identifyComplianceRequirements(policy);

      return {
        policyId,
        impactType: this.categorizeImpactType(policy),
        severity,
        description: `${policy.description} - Impact analysis completed`,
        estimatedFinancialImpact: financialImpact,
        timeframe: this.determineTimeframe(policy),
        affectedEntities: {
          assets: assets.map(a => a.assetId),
          receivables: receivables.map(r => r.receivableId),
          incentives: [] // Would be populated with affected incentives
        },
        mitigationStrategies,
        complianceRequirements
      };
    } catch (error) {
      console.error('Error assessing policy impact:', error);
      throw error;
    }
  }

  /**
   * Get all policy alerts for a given time period
   * @param startDate Start date for alerts
   * @param endDate End date for alerts
   * @param severity Optional severity filter
   * @returns Array of policy alerts
   */
  public static async getPolicyAlerts(
    startDate?: string,
    endDate?: string,
    severity?: string
  ): Promise<PolicyAlert[]> {
    try {
      // For now, return simulated alerts since we don't have a database table yet
      // In production, this would query the policy_alerts table
      return this.getSimulatedPolicyAlerts(startDate, endDate, severity);
    } catch (error) {
      console.error('Error getting policy alerts:', error);
      return [];
    }
  }

  /**
   * Update policy risk scores for all receivables based on current regulatory environment
   * @returns Number of receivables updated
   */
  public static async updatePolicyRiskScores(): Promise<number> {
    try {
      let updatedCount = 0;
      
      // Get all receivables
      const receivables = await this.getAllReceivables();
      
      for (const receivable of receivables) {
        try {
          // Calculate new policy risk score
          const newPolicyRisk = await this.calculatePolicyRiskScore(receivable);
          
          // Update risk factors table
          await this.updateReceivablePolicyRisk(receivable.receivableId, newPolicyRisk);
          
          updatedCount++;
        } catch (error) {
          console.error(`Error updating policy risk for receivable ${receivable.receivableId}:`, error);
        }
      }
      
      return updatedCount;
    } catch (error) {
      console.error('Error updating policy risk scores:', error);
      return 0;
    }
  }

  /**
   * Get trending policy topics that could affect renewable energy sector
   * @param timeframe Timeframe for trend analysis
   * @returns Array of trending topics with impact scores
   */
  public static async getTrendingPolicyTopics(
    timeframe: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<any[]> {
    try {
      // Get recent regulatory news
      const newsItems = await this.fetchRegulatoryNewsFromFreeAPIs(['federal']);
      
      // Analyze trending topics
      const trendingTopics = this.analyzeTrendingTopics(newsItems, timeframe);
      
      return trendingTopics;
    } catch (error) {
      console.error('Error getting trending policy topics:', error);
      return [];
    }
  }

  // Private methods for external API integration

  /**
   * Fetch regulatory news from FREE APIs ONLY
   */
  private static async fetchRegulatoryNewsFromFreeAPIs(regions: string[]): Promise<RegulatoryNewsItem[]> {
    const newsItems: RegulatoryNewsItem[] = [];
    
    try {
      console.log('[BATCH] Fetching from FREE regulatory APIs');
      
      // Priority 1: Federal Register API (FREE, no API key required)
      if (regions.includes('federal')) {
        const federalNews = await this.fetchFederalRegisterNews();
        newsItems.push(...federalNews);
        console.log(`[BATCH] Federal Register: ${federalNews.length} items`);
      }
      
      // Priority 2: GovInfo API (FREE with registration, optional)
      if (this.GOVINFO_API_KEY && regions.includes('federal')) {
        const govInfoNews = await this.fetchGovInfoNews();
        newsItems.push(...govInfoNews);
        console.log(`[BATCH] GovInfo: ${govInfoNews.length} items`);
      }
      
      // Priority 3: LegiScan API (FREE tier available, optional)
      if (this.LEGISCAN_API_KEY) {
        const legiScanNews = await this.fetchLegiScanNews(regions);
        newsItems.push(...legiScanNews);
        console.log(`[BATCH] LegiScan: ${legiScanNews.length} items`);
      }
      
      // If no external APIs available or no data found, use simulated news for development
      if (newsItems.length === 0) {
        console.log('[BATCH] No external API data available, using simulated news');
        return this.getSimulatedRegulatoryNews();
      }
      
      // Remove duplicates based on title
      const uniqueItems = newsItems.filter((item, index, self) => 
        index === self.findIndex(other => other.title === item.title)
      );
      
      console.log(`[BATCH] Total unique regulatory news items: ${uniqueItems.length}`);
      return uniqueItems;
    } catch (error) {
      console.error('[BATCH] Error fetching regulatory news from free APIs:', error);
      return this.getSimulatedRegulatoryNews();
    }
  }

  /**
   * Fetch news from Federal Register API (FREE - No API key required)
   * Enhanced with better keyword targeting and date filtering
   */
  private static async fetchFederalRegisterNews(): Promise<RegulatoryNewsItem[]> {
    try {
      console.log('[BATCH] Fetching from Federal Register API (free)');
      
      // Use specific renewable energy search terms for better results
      const searchTerms = [
        'renewable energy tax credit',
        'investment tax credit renewable',
        'production tax credit',
        'solar wind energy policy',
        'clean energy standard'
      ];
      
      const allResults: RegulatoryNewsItem[] = [];
      
      // Search for each term to get comprehensive coverage
      for (const term of searchTerms) {
        try {
          const response = await fetch(
            `${this.FEDERAL_REGISTER_BASE_URL}/documents.json?conditions[term]=${encodeURIComponent(term)}&conditions[publication_date][gte]=${this.getLastMonthDate()}&per_page=20`
          );
          
          if (!response.ok) {
            console.log(`[BATCH] Federal Register API warning for term "${term}": ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          if (data.results) {
            const items = data.results.map((item: any) => ({
              id: `federal_register_${item.document_number}`,
              title: item.title,
              description: item.abstract || item.title,
              source: 'Federal Register',
              publishedDate: item.publication_date,
              impactLevel: this.assessImpactLevel(item.title + ' ' + (item.abstract || '')),
              categories: [item.type || 'regulation'],
              regions: ['federal'],
              affectedSectors: this.identifyAffectedSectors(item.title + ' ' + (item.abstract || '')),
              url: item.html_url,
              summary: item.abstract || 'Federal Register document - see full text for details'
            }));
            
            allResults.push(...items);
          }
        } catch (termError) {
          console.error(`[BATCH] Error fetching Federal Register for term "${term}":`, termError);
        }
      }
      
      // Remove duplicates and sort by publication date
      const uniqueResults = allResults.filter((item, index, self) => 
        index === self.findIndex(other => other.id === item.id)
      );
      
      console.log(`[BATCH] Federal Register API returned ${uniqueResults.length} unique items`);
      return uniqueResults;
    } catch (error) {
      console.error('[BATCH] Error fetching Federal Register news:', error);
      return [];
    }
  }

  /**
   * Fetch news from GovInfo API (FREE with registration)
   * Enhanced with better error handling
   */
  private static async fetchGovInfoNews(): Promise<RegulatoryNewsItem[]> {
    try {
      console.log('[BATCH] Fetching from GovInfo API (free with registration)');
      
      if (!this.GOVINFO_API_KEY) {
        console.log('[BATCH] GovInfo API key not configured - skipping');
        return [];
      }

      const currentYear = new Date().getFullYear();
      const response = await fetch(
        `${this.GOVINFO_BASE_URL}/collections/FR/${currentYear}-01-01/${currentYear}-12-31?offset=0&pageSize=50&api_key=${this.GOVINFO_API_KEY}`
      );
      
      if (!response.ok) {
        console.log(`[BATCH] GovInfo API warning: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.packages) {
        return [];
      }
      
      // Filter for renewable energy related documents
      const renewableEnergyDocs = data.packages.filter((item: any) => 
        this.MONITORING_KEYWORDS.some(keyword => 
          item.title.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      
      const results = renewableEnergyDocs.map((item: any) => ({
        id: `govinfo_${item.packageId}`,
        title: item.title,
        description: item.title,
        source: 'GovInfo',
        publishedDate: item.dateIssued,
        impactLevel: this.assessImpactLevel(item.title),
        categories: ['federal_document'],
        regions: ['federal'],
        affectedSectors: this.identifyAffectedSectors(item.title),
        url: `https://www.govinfo.gov/app/details/${item.packageId}`,
        summary: 'Government document - access full text via link'
      }));
      
      console.log(`[BATCH] GovInfo API returned ${results.length} relevant items`);
      return results;
    } catch (error) {
      console.error('[BATCH] Error fetching GovInfo news:', error);
      return [];
    }
  }

  /**
   * Fetch news from LegiScan API (FREE tier available)
   * NEW: State and federal legislation tracking
   */
  private static async fetchLegiScanNews(regions: string[]): Promise<RegulatoryNewsItem[]> {
    try {
      console.log('[BATCH] Fetching from LegiScan API (free tier)');
      
      if (!this.LEGISCAN_API_KEY) {
        console.log('[BATCH] LegiScan API key not configured - skipping');
        return [];
      }

      const results: RegulatoryNewsItem[] = [];
      
      // Search for renewable energy bills in specified states
      const searchKeywords = ['renewable energy', 'solar', 'wind', 'clean energy'];
      
      for (const keyword of searchKeywords) {
        try {
          const response = await fetch(
            `https://api.legiscan.com/?key=${this.LEGISCAN_API_KEY}&op=search&query=${encodeURIComponent(keyword)}&year=2024`
          );
          
          if (!response.ok) continue;
          
          const data = await response.json();
          
          if (data.searchresult && data.searchresult.summary) {
            // Process each bill found
            for (const bill of data.searchresult.summary) {
              if (bill && bill.bill_id) {
                results.push({
                  id: `legiscan_${bill.bill_id}`,
                  title: bill.title || `${bill.state} ${bill.bill_number}`,
                  description: bill.description || bill.title || 'Legislative bill',
                  source: 'LegiScan',
                  publishedDate: bill.last_action_date || new Date().toISOString().split('T')[0],
                  impactLevel: this.assessBillImpactLevel(bill),
                  categories: ['legislation'],
                  regions: [bill.state?.toLowerCase() || 'federal'],
                  affectedSectors: this.identifyAffectedSectors(bill.title || ''),
                  url: bill.url || `https://legiscan.com/bill/${bill.bill_id}`,
                  summary: `${bill.state} legislative bill ${bill.bill_number} - ${bill.status || 'in progress'}`
                });
              }
            }
          }
        } catch (keywordError) {
          console.error(`[BATCH] LegiScan error for keyword "${keyword}":`, keywordError);
        }
      }
      
      console.log(`[BATCH] LegiScan API returned ${results.length} legislative items`);
      return results;
    } catch (error) {
      console.error('[BATCH] Error fetching LegiScan news:', error);
      return [];
    }
  }

  // Helper methods for enhanced free API integration

  private static assessBillImpactLevel(bill: any): 'low' | 'medium' | 'high' | 'critical' {
    if (!bill.title) return 'low';
    
    const title = bill.title.toLowerCase();
    const status = bill.status?.toLowerCase() || '';
    
    // Critical: Bills that are passed or very close to passing
    if (status.includes('passed') || status.includes('enacted') || status.includes('signed')) {
      return 'critical';
    }
    
    // High: Tax credits, major renewable energy bills
    if (title.includes('tax credit') || title.includes('renewable portfolio') || title.includes('clean energy standard')) {
      return 'high';
    }
    
    // Medium: Other renewable energy legislation
    if (title.includes('renewable') || title.includes('solar') || title.includes('wind') || title.includes('clean energy')) {
      return 'medium';
    }
    
    return 'low';
  }

  private static getLastMonthDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  // Helper methods

  private static async analyzeNewsForPolicyImpacts(newsItem: RegulatoryNewsItem): Promise<PolicyAlert[]> {
    const alerts: PolicyAlert[] = [];
    
    // Analyze news content for renewable energy impact
    const hasRenewableEnergyImpact = this.MONITORING_KEYWORDS.some(keyword => 
      newsItem.title.toLowerCase().includes(keyword.toLowerCase()) ||
      newsItem.description.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasRenewableEnergyImpact) {
      // Get affected assets and receivables
      const affectedAssets = await this.identifyAffectedAssetsByNews(newsItem);
      const affectedReceivables = await this.identifyAffectedReceivablesByNews(newsItem);
      
      alerts.push({
        alertId: `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        policyId: newsItem.id,
        alertType: 'new_policy',
        severity: newsItem.impactLevel as any,
        title: `New Policy Impact: ${newsItem.title}`,
        description: newsItem.summary,
        affectedAssets,
        affectedReceivables,
        recommendedActions: this.generateRecommendedActions(newsItem),
        createdAt: new Date().toISOString(),
        resolved: false
      });
    }
    
    return alerts;
  }

  private static async checkUpcomingDeadlines(): Promise<PolicyAlert[]> {
    const alerts: PolicyAlert[] = [];
    
    // Check for known upcoming policy deadlines
    const upcomingDeadlines = [
      {
        policyId: 'itc_stepdown_2024',
        title: 'Investment Tax Credit Step-Down',
        description: 'ITC rate decreases from 30% to 26% on January 1, 2025',
        deadline: '2024-12-31',
        severity: 'high' as const
      },
      {
        policyId: 'ptc_expiration_2025',
        title: 'Production Tax Credit Expiration Warning',
        description: 'PTC scheduled to expire for new projects after 2025',
        deadline: '2025-12-31',
        severity: 'critical' as const
      }
    ];
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    for (const deadline of upcomingDeadlines) {
      const deadlineDate = new Date(deadline.deadline);
      
      if (deadlineDate <= thirtyDaysFromNow && deadlineDate > now) {
        alerts.push({
          alertId: `deadline_${deadline.policyId}`,
          policyId: deadline.policyId,
          alertType: 'expiration_warning',
          severity: deadline.severity,
          title: deadline.title,
          description: deadline.description,
          affectedAssets: [], // Would be populated based on policy
          affectedReceivables: [], // Would be populated based on policy
          recommendedActions: [
            'Review affected projects and receivables',
            'Consider accelerating project timelines',
            'Evaluate impact on cash flow projections'
          ],
          deadline: deadline.deadline,
          createdAt: new Date().toISOString(),
          resolved: false
        });
      }
    }
    
    return alerts;
  }

  private static assessImpactLevel(text: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalKeywords = ['tax credit', 'expir', 'eliminat', 'suspend', 'cancel'];
    const highKeywords = ['reduc', 'decreas', 'limit', 'restrict', 'phase out'];
    const mediumKeywords = ['modif', 'chang', 'updat', 'revis'];
    
    const lowerText = text.toLowerCase();
    
    if (criticalKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'critical';
    } else if (highKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'high';
    } else if (mediumKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  private static identifyAffectedSectors(text: string): string[] {
    const sectors = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('solar')) sectors.push('solar');
    if (lowerText.includes('wind')) sectors.push('wind');
    if (lowerText.includes('hydro') || lowerText.includes('hydroelectric')) sectors.push('hydro');
    if (lowerText.includes('storage') || lowerText.includes('battery')) sectors.push('storage');
    if (lowerText.includes('utility') || lowerText.includes('grid')) sectors.push('utility');
    
    return sectors.length > 0 ? sectors : ['renewable_energy'];
  }

  private static async identifyAffectedAssetsByNews(newsItem: RegulatoryNewsItem): Promise<string[]> {
    try {
      // Get all assets
      const assets = await this.getAllEnergyAssets();
      
      // Filter assets based on news item sectors
      const affectedAssets = assets.filter(asset => 
        newsItem.affectedSectors.includes(asset.type) ||
        newsItem.affectedSectors.includes('renewable_energy')
      );
      
      return affectedAssets.map(asset => asset.assetId);
    } catch (error) {
      console.error('Error identifying affected assets:', error);
      return [];
    }
  }

  private static async identifyAffectedReceivablesByNews(newsItem: RegulatoryNewsItem): Promise<string[]> {
    try {
      // Get all receivables
      const receivables = await this.getAllReceivables();
      
      // For now, return all receivables for high/critical impact news
      if (newsItem.impactLevel === 'high' || newsItem.impactLevel === 'critical') {
        return receivables.map(r => r.receivableId);
      }
      
      return [];
    } catch (error) {
      console.error('Error identifying affected receivables:', error);
      return [];
    }
  }

  private static generateRecommendedActions(newsItem: RegulatoryNewsItem): string[] {
    const actions = [];
    
    if (newsItem.impactLevel === 'critical') {
      actions.push('Immediate assessment of financial impact required');
      actions.push('Consider accelerating affected project timelines');
      actions.push('Review and potentially restructure payment terms');
    } else if (newsItem.impactLevel === 'high') {
      actions.push('Conduct detailed impact analysis within 30 days');
      actions.push('Monitor for additional regulatory developments');
      actions.push('Consider hedging strategies for affected receivables');
    } else {
      actions.push('Monitor development and assess potential impacts');
      actions.push('Include in quarterly risk assessment review');
    }
    
    return actions;
  }

  private static async getPolicyDetails(policyId: string): Promise<ClimatePolicy | null> {
    try {
      const { data, error } = await supabase
        .from('climate_policies')
        .select('*')
        .eq('policy_id', policyId)
        .single();
      
      if (error) throw error;
      
      return {
        policyId: data.policy_id,
        name: data.name,
        description: data.description,
        impactLevel: data.impact_level,
        effectiveDate: data.effective_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error getting policy details:', error);
      return null;
    }
  }

  private static async getAllEnergyAssets(): Promise<EnergyAsset[]> {
    try {
      const { data, error } = await supabase
        .from('energy_assets')
        .select('*');
      
      if (error) throw error;
      
      return data.map(item => ({
        assetId: item.asset_id,
        name: item.name,
        type: item.type,
        location: item.location,
        capacity: item.capacity,
        ownerId: item.owner_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error getting energy assets:', error);
      return [];
    }
  }

  private static async getSpecificAssets(assetIds: string[]): Promise<EnergyAsset[]> {
    try {
      const { data, error } = await supabase
        .from('energy_assets')
        .select('*')
        .in('asset_id', assetIds);
      
      if (error) throw error;
      
      return data.map(item => ({
        assetId: item.asset_id,
        name: item.name,
        type: item.type,
        location: item.location,
        capacity: item.capacity,
        ownerId: item.owner_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error getting specific assets:', error);
      return [];
    }
  }

  private static async getReceivablesForAssets(assetIds: string[]): Promise<ClimateReceivable[]> {
    try {
      const { data, error } = await supabase
        .from('climate_receivables')
        .select('*')
        .in('asset_id', assetIds);
      
      if (error) throw error;
      
      return data.map(item => ({
        receivableId: item.receivable_id,
        assetId: item.asset_id,
        payerId: item.payer_id,
        amount: item.amount,
        dueDate: item.due_date,
        riskScore: item.risk_score,
        discountRate: item.discount_rate,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error getting receivables for assets:', error);
      return [];
    }
  }

  private static async getAllReceivables(): Promise<ClimateReceivable[]> {
    try {
      const { data, error } = await supabase
        .from('climate_receivables')
        .select('*');
      
      if (error) throw error;
      
      return data.map(item => ({
        receivableId: item.receivable_id,
        assetId: item.asset_id,
        payerId: item.payer_id,
        amount: item.amount,
        dueDate: item.due_date,
        riskScore: item.risk_score,
        discountRate: item.discount_rate,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error getting all receivables:', error);
      return [];
    }
  }

  private static calculateFinancialImpact(
    policy: ClimatePolicy,
    assets: EnergyAsset[],
    receivables: ClimateReceivable[]
  ): number {
    // Simplified financial impact calculation
    // In a real implementation, this would be much more sophisticated
    
    const totalReceivableValue = receivables.reduce((sum, r) => sum + r.amount, 0);
    
    let impactMultiplier = 0;
    
    switch (policy.impactLevel) {
      case 'critical':
        impactMultiplier = 0.2; // 20% impact
        break;
      case 'high':
        impactMultiplier = 0.1; // 10% impact
        break;
      case 'medium':
        impactMultiplier = 0.05; // 5% impact
        break;
      default:
        impactMultiplier = 0.02; // 2% impact
    }
    
    return totalReceivableValue * impactMultiplier;
  }

  private static determinePolicyImpactSeverity(
    policy: ClimatePolicy,
    financialImpact: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (financialImpact > 1000000 || policy.impactLevel === 'critical') {
      return 'critical';
    } else if (financialImpact > 500000 || policy.impactLevel === 'high') {
      return 'high';
    } else if (financialImpact > 100000 || policy.impactLevel === 'medium') {
      return 'medium';
    }
    return 'low';
  }

  private static categorizeImpactType(policy: ClimatePolicy): 'financial' | 'operational' | 'compliance' | 'strategic' {
    const name = policy.name.toLowerCase();
    
    if (name.includes('tax') || name.includes('credit') || name.includes('subsidy')) {
      return 'financial';
    } else if (name.includes('standard') || name.includes('requirement') || name.includes('mandate')) {
      return 'compliance';
    } else if (name.includes('operational') || name.includes('technical')) {
      return 'operational';
    }
    
    return 'strategic';
  }

  private static determineTimeframe(policy: ClimatePolicy): 'immediate' | 'short_term' | 'medium_term' | 'long_term' {
    const effectiveDate = new Date(policy.effectiveDate);
    const now = new Date();
    const monthsUntilEffective = (effectiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsUntilEffective <= 1) return 'immediate';
    if (monthsUntilEffective <= 6) return 'short_term';
    if (monthsUntilEffective <= 24) return 'medium_term';
    return 'long_term';
  }

  private static generateMitigationStrategies(
    policy: ClimatePolicy,
    severity: string
  ): string[] {
    const strategies = [];
    
    if (severity === 'critical') {
      strategies.push('Implement immediate risk management protocols');
      strategies.push('Consider emergency cash flow measures');
      strategies.push('Engage legal counsel for compliance review');
    } else if (severity === 'high') {
      strategies.push('Develop contingency plans for affected projects');
      strategies.push('Review and update risk management procedures');
      strategies.push('Consider insurance or hedging options');
    } else {
      strategies.push('Monitor development and update risk assessments');
      strategies.push('Include in regular compliance reviews');
    }
    
    return strategies;
  }

  private static identifyComplianceRequirements(policy: ClimatePolicy): string[] {
    // Simplified compliance requirements identification
    const requirements = [
      'Review policy documentation for compliance obligations',
      'Update internal procedures to align with new requirements',
      'Establish monitoring and reporting processes'
    ];
    
    if (policy.impactLevel === 'critical' || policy.impactLevel === 'high') {
      requirements.push('Conduct legal compliance review');
      requirements.push('File required regulatory notifications');
    }
    
    return requirements;
  }

  private static async calculatePolicyRiskScore(receivable: ClimateReceivable): Promise<number> {
    // Get policy impacts for this receivable
    const { data: policyImpacts } = await supabase
      .from('climate_policy_impacts')
      .select(`
        *,
        climate_policies!climate_policy_impacts_policy_id_fkey(*)
      `)
      .or(`receivable_id.eq.${receivable.receivableId},asset_id.eq.${receivable.assetId}`);
    
    let policyRiskScore = 10; // Base policy risk
    
    if (policyImpacts && policyImpacts.length > 0) {
      for (const impact of policyImpacts) {
        const policy = impact.climate_policies;
        if (policy) {
          switch (policy.impact_level) {
            case 'critical':
              policyRiskScore += 40;
              break;
            case 'high':
              policyRiskScore += 25;
              break;
            case 'medium':
              policyRiskScore += 15;
              break;
            case 'low':
              policyRiskScore += 5;
              break;
          }
        }
      }
    }
    
    return Math.min(policyRiskScore, 100);
  }

  private static async updateReceivablePolicyRisk(receivableId: string, policyRisk: number): Promise<void> {
    try {
      // Check if risk factors already exist
      const { data: existing, error: checkError } = await supabase
        .from('climate_risk_factors')
        .select('factor_id')
        .eq('receivable_id', receivableId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('climate_risk_factors')
          .update({ policy_risk: policyRisk })
          .eq('factor_id', existing.factor_id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('climate_risk_factors')
          .insert([{
            receivable_id: receivableId,
            production_risk: 20, // Default values
            credit_risk: 20,
            policy_risk: policyRisk
          }]);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating receivable policy risk:', error);
    }
  }

  private static analyzeTrendingTopics(newsItems: RegulatoryNewsItem[], timeframe: string): any[] {
    // Simple trending analysis
    const topics: Record<string, { count: number; impact: string }> = {};
    
    newsItems.forEach(item => {
      item.categories.forEach(category => {
        if (!topics[category]) {
          topics[category] = { count: 0, impact: 'low' };
        }
        topics[category].count++;
        
        if (item.impactLevel === 'critical' || item.impactLevel === 'high') {
          topics[category].impact = item.impactLevel;
        }
      });
    });
    
    return Object.entries(topics)
      .map(([topic, data]) => ({
        topic,
        mentions: data.count,
        impact: data.impact
      }))
      .sort((a, b) => b.mentions - a.mentions);
  }

  private static getLastWeekDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  }

  private static async saveAlertsToDatabase(alerts: PolicyAlert[]): Promise<void> {
    // In a real implementation, this would save to a policy_alerts table
    console.log(`Saving ${alerts.length} policy alerts to database`);
  }

  // Simulation methods for when APIs are not available

  private static getSimulatedRegulatoryNews(): RegulatoryNewsItem[] {
    return [
      {
        id: 'sim_news_001',
        title: 'IRS Announces Investment Tax Credit Extension for Solar Projects',
        description: 'The IRS has announced a one-year extension of the 30% Investment Tax Credit for solar projects',
        source: 'IRS',
        publishedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        impactLevel: 'high',
        categories: ['tax_credit', 'solar'],
        regions: ['federal'],
        affectedSectors: ['solar'],
        url: 'https://www.irs.gov/newsroom/tax-credit-extension',
        summary: 'Extension provides additional year for solar project developers to claim 30% tax credit'
      },
      {
        id: 'sim_news_002',
        title: 'California Announces New Renewable Portfolio Standard Targets',
        description: 'California increases renewable energy requirements to 60% by 2030',
        source: 'California PUC',
        publishedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        impactLevel: 'medium',
        categories: ['renewable_portfolio_standard'],
        regions: ['california'],
        affectedSectors: ['renewable_energy'],
        url: 'https://www.cpuc.ca.gov/news',
        summary: 'New targets create additional demand for renewable energy certificates'
      }
    ];
  }

  private static getSimulatedPolicyAlerts(
    startDate?: string,
    endDate?: string,
    severity?: string
  ): PolicyAlert[] {
    const alerts = [
      {
        alertId: 'policy_alert_001',
        policyId: 'itc_extension_2024',
        alertType: 'new_policy' as const,
        severity: 'high' as const,
        title: 'Investment Tax Credit Extension Announced',
        description: 'ITC extended for one additional year at 30% rate',
        affectedAssets: ['asset_001', 'asset_002'],
        affectedReceivables: ['rec_001', 'rec_002'],
        recommendedActions: [
          'Review project timelines to take advantage of extension',
          'Update cash flow projections',
          'Consider accelerating development pipeline'
        ],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        resolved: false
      },
      {
        alertId: 'policy_alert_002',
        policyId: 'ca_rps_increase_2024',
        alertType: 'policy_change' as const,
        severity: 'medium' as const,
        title: 'California RPS Targets Increased',
        description: 'New renewable portfolio standard targets announced',
        affectedAssets: ['asset_003'],
        affectedReceivables: ['rec_003'],
        recommendedActions: [
          'Assess opportunities in California market',
          'Review REC pricing forecasts',
          'Consider additional California projects'
        ],
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        resolved: false
      }
    ];

    // Filter by severity if specified
    return severity ? alerts.filter(alert => alert.severity === severity) : alerts;
  }
}
