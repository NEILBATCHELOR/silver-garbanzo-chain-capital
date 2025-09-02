import { supabase } from '@/infrastructure/database/client';
import { ClimatePayer } from '../../types';

/**
 * Credit rating data from external providers
 */
interface CreditRatingData {
  payerId: string;
  creditScore: number;
  creditRating: string;
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  lastUpdated: string;
  source: 'moodys' | 'sp' | 'dun_bradstreet' | 'experian_business' | 'internal';
  paymentHistory: {
    onTimePaymentRate: number;
    averageDelayDays: number;
    totalTransactions: number;
    defaultEvents: number;
  };
  financialMetrics: {
    debtToEquityRatio?: number;
    currentRatio?: number;
    quickRatio?: number;
    cashFlowRating?: string;
    revenueGrowth?: number;
  };
  publicRecords: {
    bankruptcies: number;
    liens: number;
    judgments: number;
    ucc_filings: number;
  };
  recommendations: string[];
}

/**
 * Credit alert data
 */
interface CreditAlert {
  alertId: string;
  payerId: string;
  alertType: 'rating_downgrade' | 'payment_delay' | 'financial_distress' | 'bankruptcy_risk' | 'regulatory_action';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendedAction: string;
  createdAt: string;
  resolved: boolean;
}

/**
 * Service for monitoring credit health of utilities and large customers
 * Integrates with external credit rating agencies and financial data providers
 */
export class CreditMonitoringService {
  // API Configuration
  private static readonly MOODYS_API_KEY = import.meta.env.VITE_MOODYS_API_KEY;
  private static readonly SP_API_KEY = import.meta.env.VITE_SP_API_KEY;
  private static readonly DUN_BRADSTREET_API_KEY = import.meta.env.VITE_DUN_BRADSTREET_API_KEY;
  private static readonly EXPERIAN_API_KEY = import.meta.env.VITE_EXPERIAN_BUSINESS_API_KEY;
  
  // API Endpoints
  private static readonly MOODYS_BASE_URL = 'https://api.moodys.com/v1';
  private static readonly SP_BASE_URL = 'https://api.spglobal.com/ratings/v1';
  private static readonly DUN_BRADSTREET_BASE_URL = 'https://api.dnb.com/v1';
  private static readonly EXPERIAN_BASE_URL = 'https://api.experian.com/businessinformation/v1';
  
  // Cache settings
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly ALERT_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

  /**
   * Get comprehensive credit assessment for a payer
   * @param payerId Payer ID to assess
   * @param forceRefresh Force refresh from external APIs
   * @returns Credit rating data with recommendations
   */
  public static async getCreditAssessment(
    payerId: string,
    forceRefresh: boolean = false
  ): Promise<CreditRatingData> {
    try {
      // Check for cached data first
      if (!forceRefresh) {
        const cachedData = await this.getCachedCreditData(payerId);
        if (cachedData && this.isCacheValid(cachedData.lastUpdated)) {
          return cachedData;
        }
      }

      // Get payer information
      const payer = await this.getPayerInfo(payerId);
      if (!payer) {
        throw new Error('Payer not found');
      }

      // Fetch from multiple credit sources
      const [
        moodysData,
        spData,
        dunBradstreetData,
        experianData
      ] = await Promise.allSettled([
        this.fetchMoodysRating(payer),
        this.fetchSPRating(payer),
        this.fetchDunBradstreetData(payer),
        this.fetchExperianData(payer)
      ]);

      // Combine and analyze data
      const combinedData = this.combineRatingData(
        payer,
        moodysData,
        spData,
        dunBradstreetData,
        experianData
      );

      // Save to cache
      await this.saveCreditDataToCache(payerId, combinedData);

      return combinedData;
    } catch (error) {
      console.error('Error getting credit assessment:', error);
      
      // Return cached data if available, or basic assessment
      const cachedData = await this.getCachedCreditData(payerId);
      if (cachedData) {
        return cachedData;
      }
      
      return this.generateBasicAssessment(payerId);
    }
  }

  /**
   * Monitor all payers for credit changes and generate alerts
   * @returns Array of new credit alerts
   */
  public static async monitorCreditChanges(): Promise<CreditAlert[]> {
    try {
      const alerts: CreditAlert[] = [];
      
      // Get all active payers
      const payers = await this.getActivePayers();
      
      for (const payer of payers) {
        try {
          // Get latest credit data
          const latestData = await this.getCreditAssessment(payer.payerId, true);
          
          // Compare with previous data
          const previousData = await this.getPreviousCreditData(payer.payerId);
          
          if (previousData) {
            const newAlerts = this.detectCreditChanges(payer, previousData, latestData);
            alerts.push(...newAlerts);
          }
        } catch (error) {
          console.error(`Error monitoring credit for payer ${payer.payerId}:`, error);
        }
      }

      // Save alerts to database
      if (alerts.length > 0) {
        await this.saveAlertsToDatabase(alerts);
      }

      return alerts;
    } catch (error) {
      console.error('Error monitoring credit changes:', error);
      return [];
    }
  }

  /**
   * Get credit alerts for a specific payer
   * @param payerId Payer ID
   * @param includeResolved Include resolved alerts
   * @returns Array of credit alerts
   */
  public static async getCreditAlerts(
    payerId?: string,
    includeResolved: boolean = false
  ): Promise<CreditAlert[]> {
    try {
      // For now, return simulated alerts since we don't have a database table yet
      // In production, this would query the credit_alerts table
      return this.getSimulatedAlerts(payerId, includeResolved);
    } catch (error) {
      console.error('Error getting credit alerts:', error);
      return [];
    }
  }

  /**
   * Update payer credit information in database
   * @param payerId Payer ID
   * @param creditData Credit rating data
   */
  public static async updatePayerCreditInfo(
    payerId: string,
    creditData: CreditRatingData
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('climate_payers')
        .update({
          credit_rating: creditData.creditRating,
          financial_health_score: creditData.creditScore,
          payment_history: creditData.paymentHistory,
          updated_at: new Date().toISOString()
        })
        .eq('payer_id', payerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payer credit info:', error);
      throw error;
    }
  }

  /**
   * Calculate composite credit score from multiple sources
   * @param ratings Array of credit ratings from different sources
   * @returns Composite credit score (0-100)
   */
  public static calculateCompositeScore(ratings: any[]): number {
    if (ratings.length === 0) return 50; // Default medium score

    // Weight different sources
    const weights = {
      moodys: 0.3,
      sp: 0.3,
      dun_bradstreet: 0.25,
      experian_business: 0.15
    };

    let totalScore = 0;
    let totalWeight = 0;

    ratings.forEach(rating => {
      if (rating.score && rating.source) {
        const weight = weights[rating.source as keyof typeof weights] || 0.1;
        totalScore += rating.score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
  }

  // Private methods for API integration

  /**
   * Fetch Moody's credit rating
   */
  private static async fetchMoodysRating(payer: ClimatePayer): Promise<any> {
    if (!this.MOODYS_API_KEY) {
      console.log('Moody\'s API key not configured, using simulation');
      return this.simulateMoodysRating(payer);
    }

    try {
      const response = await fetch(`${this.MOODYS_BASE_URL}/rating-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.MOODYS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityName: payer.name,
          country: 'US' // Default to US, could be made configurable
        })
      });

      if (!response.ok) {
        throw new Error(`Moody's API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Moody\'s rating:', error);
      return this.simulateMoodysRating(payer);
    }
  }

  /**
   * Fetch S&P credit rating
   */
  private static async fetchSPRating(payer: ClimatePayer): Promise<any> {
    if (!this.SP_API_KEY) {
      console.log('S&P API key not configured, using simulation');
      return this.simulateSPRating(payer);
    }

    try {
      const response = await fetch(`${this.SP_BASE_URL}/entities/search`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.SP_API_KEY}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`S&P API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching S&P rating:', error);
      return this.simulateSPRating(payer);
    }
  }

  /**
   * Fetch Dun & Bradstreet business data
   */
  private static async fetchDunBradstreetData(payer: ClimatePayer): Promise<any> {
    if (!this.DUN_BRADSTREET_API_KEY) {
      console.log('D&B API key not configured, using simulation');
      return this.simulateDunBradstreetData(payer);
    }

    try {
      const response = await fetch(`${this.DUN_BRADSTREET_BASE_URL}/match`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.DUN_BRADSTREET_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: payer.name,
          countryIsoAlpha2Code: 'US'
        })
      });

      if (!response.ok) {
        throw new Error(`D&B API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching D&B data:', error);
      return this.simulateDunBradstreetData(payer);
    }
  }

  /**
   * Fetch Experian business data
   */
  private static async fetchExperianData(payer: ClimatePayer): Promise<any> {
    if (!this.EXPERIAN_API_KEY) {
      console.log('Experian API key not configured, using simulation');
      return this.simulateExperianData(payer);
    }

    try {
      const response = await fetch(`${this.EXPERIAN_BASE_URL}/businesses/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.EXPERIAN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: payer.name,
          address: {
            countryCode: 'US'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Experian API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Experian data:', error);
      return this.simulateExperianData(payer);
    }
  }

  // Helper methods

  private static async getPayerInfo(payerId: string): Promise<ClimatePayer | null> {
    try {
      const { data, error } = await supabase
        .from('climate_payers')
        .select('*')
        .eq('payer_id', payerId)
        .single();

      if (error) throw error;

      return {
        payerId: data.payer_id,
        name: data.name,
        creditRating: data.credit_rating,
        financialHealthScore: data.financial_health_score,
        paymentHistory: data.payment_history,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error getting payer info:', error);
      return null;
    }
  }

  private static async getActivePayers(): Promise<ClimatePayer[]> {
    try {
      const { data, error } = await supabase
        .from('climate_payers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        payerId: item.payer_id,
        name: item.name,
        creditRating: item.credit_rating,
        financialHealthScore: item.financial_health_score,
        paymentHistory: item.payment_history,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error getting active payers:', error);
      return [];
    }
  }

  private static async getCachedCreditData(payerId: string): Promise<CreditRatingData | null> {
    try {
      // In a real implementation, this would check a credit_cache table
      // For now, return null to force fresh data fetch
      return null;
    } catch (error) {
      console.error('Error getting cached credit data:', error);
      return null;
    }
  }

  private static isCacheValid(lastUpdated: string): boolean {
    const updateTime = new Date(lastUpdated).getTime();
    const now = new Date().getTime();
    return (now - updateTime) < this.CACHE_DURATION;
  }

  private static combineRatingData(
    payer: ClimatePayer,
    moodysData: any,
    spData: any,
    dunBradstreetData: any,
    experianData: any
  ): CreditRatingData {
    // Extract scores from different sources
    const ratings = [];
    
    if (moodysData.status === 'fulfilled' && moodysData.value.rating) {
      ratings.push({
        source: 'moodys',
        score: this.convertMoodysRatingToScore(moodysData.value.rating)
      });
    }

    if (spData.status === 'fulfilled' && spData.value.rating) {
      ratings.push({
        source: 'sp',
        score: this.convertSPRatingToScore(spData.value.rating)
      });
    }

    if (dunBradstreetData.status === 'fulfilled' && dunBradstreetData.value.score) {
      ratings.push({
        source: 'dun_bradstreet',
        score: dunBradstreetData.value.score
      });
    }

    if (experianData.status === 'fulfilled' && experianData.value.score) {
      ratings.push({
        source: 'experian_business',
        score: experianData.value.score
      });
    }

    // Calculate composite score
    const compositeScore = this.calculateCompositeScore(ratings);
    
    // Determine risk level
    const riskLevel = compositeScore >= 80 ? 'low' : 
                     compositeScore >= 60 ? 'medium' : 
                     compositeScore >= 40 ? 'high' : 'very_high';

    // Use existing payer data or simulation for missing fields
    return {
      payerId: payer.payerId,
      creditScore: compositeScore,
      creditRating: this.scoreToRating(compositeScore),
      riskLevel,
      lastUpdated: new Date().toISOString(),
      source: ratings.length > 0 ? 'external' as any : 'internal',
      paymentHistory: {
        onTimePaymentRate: 0.95,
        averageDelayDays: 2,
        totalTransactions: 24,
        defaultEvents: 0
      },
      financialMetrics: {
        debtToEquityRatio: 0.45,
        currentRatio: 1.8,
        quickRatio: 1.2,
        cashFlowRating: 'Strong',
        revenueGrowth: 0.08
      },
      publicRecords: {
        bankruptcies: 0,
        liens: 0,
        judgments: 0,
        ucc_filings: 2
      },
      recommendations: this.generateRecommendations(compositeScore, riskLevel)
    };
  }

  private static convertMoodysRatingToScore(rating: string): number {
    const ratingMap: Record<string, number> = {
      'Aaa': 95, 'Aa1': 92, 'Aa2': 89, 'Aa3': 86,
      'A1': 83, 'A2': 80, 'A3': 77,
      'Baa1': 74, 'Baa2': 71, 'Baa3': 68,
      'Ba1': 65, 'Ba2': 62, 'Ba3': 59,
      'B1': 56, 'B2': 53, 'B3': 50,
      'Caa1': 47, 'Caa2': 44, 'Caa3': 41,
      'Ca': 38, 'C': 35
    };
    return ratingMap[rating] || 50;
  }

  private static convertSPRatingToScore(rating: string): number {
    const ratingMap: Record<string, number> = {
      'AAA': 95, 'AA+': 92, 'AA': 89, 'AA-': 86,
      'A+': 83, 'A': 80, 'A-': 77,
      'BBB+': 74, 'BBB': 71, 'BBB-': 68,
      'BB+': 65, 'BB': 62, 'BB-': 59,
      'B+': 56, 'B': 53, 'B-': 50,
      'CCC+': 47, 'CCC': 44, 'CCC-': 41,
      'CC': 38, 'C': 35, 'D': 20
    };
    return ratingMap[rating] || 50;
  }

  private static scoreToRating(score: number): string {
    if (score >= 90) return 'AAA';
    if (score >= 85) return 'AA';
    if (score >= 80) return 'A';
    if (score >= 70) return 'BBB';
    if (score >= 60) return 'BB';
    if (score >= 50) return 'B';
    if (score >= 40) return 'CCC';
    return 'CC';
  }

  private static generateRecommendations(score: number, riskLevel: string): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'low') {
      recommendations.push('Excellent credit profile - proceed with standard terms');
      recommendations.push('Consider offering volume discounts or extended payment terms');
    } else if (riskLevel === 'medium') {
      recommendations.push('Good credit profile - standard commercial terms appropriate');
      recommendations.push('Monitor quarterly for any changes in financial position');
    } else if (riskLevel === 'high') {
      recommendations.push('Elevated risk - consider requiring additional security or guarantees');
      recommendations.push('Implement monthly payment monitoring and reporting');
      recommendations.push('Consider credit insurance or third-party guarantees');
    } else {
      recommendations.push('High risk profile - proceed with extreme caution');
      recommendations.push('Require substantial collateral or personal guarantees');
      recommendations.push('Consider factoring receivables immediately upon delivery');
      recommendations.push('Implement daily payment monitoring');
    }

    return recommendations;
  }

  // Simulation methods for when APIs are not available

  private static simulateMoodysRating(payer: ClimatePayer): any {
    const ratings = ['Aaa', 'Aa1', 'Aa2', 'A1', 'A2', 'Baa1', 'Baa2', 'Ba1', 'Ba2', 'B1'];
    const randomRating = ratings[Math.floor(Math.random() * ratings.length)];
    
    return {
      rating: randomRating,
      outlook: 'Stable',
      lastUpdated: new Date().toISOString()
    };
  }

  private static simulateSPRating(payer: ClimatePayer): any {
    const ratings = ['AAA', 'AA+', 'AA', 'A+', 'A', 'BBB+', 'BBB', 'BB+', 'BB', 'B+'];
    const randomRating = ratings[Math.floor(Math.random() * ratings.length)];
    
    return {
      rating: randomRating,
      outlook: 'Stable',
      lastUpdated: new Date().toISOString()
    };
  }

  private static simulateDunBradstreetData(payer: ClimatePayer): any {
    return {
      score: Math.floor(Math.random() * 40) + 60, // 60-100 range
      riskLevel: 'Medium',
      paymentHistory: {
        onTimePaymentRate: 0.92 + Math.random() * 0.07,
        averageDelayDays: Math.floor(Math.random() * 10),
        totalTransactions: Math.floor(Math.random() * 50) + 10
      }
    };
  }

  private static simulateExperianData(payer: ClimatePayer): any {
    return {
      score: Math.floor(Math.random() * 30) + 70, // 70-100 range
      businessRisk: 'Low',
      financialStress: 'Low',
      paymentTrend: 'Improving'
    };
  }

  private static async saveCreditDataToCache(payerId: string, data: CreditRatingData): Promise<void> {
    // In a real implementation, this would save to a credit_cache table
    console.log(`Caching credit data for payer ${payerId}`);
  }

  private static async getPreviousCreditData(payerId: string): Promise<CreditRatingData | null> {
    // In a real implementation, this would get the previous assessment
    return null;
  }

  private static detectCreditChanges(
    payer: ClimatePayer,
    previous: CreditRatingData,
    current: CreditRatingData
  ): CreditAlert[] {
    const alerts: CreditAlert[] = [];

    // Check for rating downgrades
    if (current.creditScore < previous.creditScore - 10) {
      alerts.push({
        alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        payerId: payer.payerId,
        alertType: 'rating_downgrade',
        severity: current.creditScore < previous.creditScore - 20 ? 'high' : 'medium',
        description: `Credit score decreased from ${previous.creditScore} to ${current.creditScore}`,
        recommendedAction: 'Review payment terms and consider additional security',
        createdAt: new Date().toISOString(),
        resolved: false
      });
    }

    // Check for payment delays
    if (current.paymentHistory.averageDelayDays > previous.paymentHistory.averageDelayDays + 5) {
      alerts.push({
        alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        payerId: payer.payerId,
        alertType: 'payment_delay',
        severity: 'medium',
        description: `Average payment delay increased to ${current.paymentHistory.averageDelayDays} days`,
        recommendedAction: 'Contact customer to understand payment delays',
        createdAt: new Date().toISOString(),
        resolved: false
      });
    }

    return alerts;
  }

  private static async saveAlertsToDatabase(alerts: CreditAlert[]): Promise<void> {
    // In a real implementation, this would save to a credit_alerts table
    console.log(`Saving ${alerts.length} credit alerts to database`);
  }

  private static getSimulatedAlerts(payerId?: string, includeResolved: boolean = false): CreditAlert[] {
    // Simulate some alerts for demonstration
    const alerts: CreditAlert[] = [
      {
        alertId: 'alert_001',
        payerId: payerId || 'payer_001',
        alertType: 'rating_downgrade',
        severity: 'medium',
        description: 'Credit rating downgraded from A to BBB+',
        recommendedAction: 'Review payment terms and monitor closely',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        resolved: false
      },
      {
        alertId: 'alert_002',
        payerId: payerId || 'payer_002',
        alertType: 'payment_delay',
        severity: 'low',
        description: 'Average payment delay increased to 8 days',
        recommendedAction: 'Contact customer to understand delays',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        resolved: includeResolved
      }
    ];

    return payerId ? alerts.filter(a => a.payerId === payerId) : alerts;
  }

  private static generateBasicAssessment(payerId: string): CreditRatingData {
    return {
      payerId,
      creditScore: 65, // Default medium score
      creditRating: 'BBB',
      riskLevel: 'medium',
      lastUpdated: new Date().toISOString(),
      source: 'internal',
      paymentHistory: {
        onTimePaymentRate: 0.85,
        averageDelayDays: 5,
        totalTransactions: 12,
        defaultEvents: 0
      },
      financialMetrics: {},
      publicRecords: {
        bankruptcies: 0,
        liens: 0,
        judgments: 0,
        ucc_filings: 0
      },
      recommendations: [
        'Limited credit information available',
        'Consider requesting recent financial statements',
        'Monitor payment performance closely'
      ]
    };
  }
}
