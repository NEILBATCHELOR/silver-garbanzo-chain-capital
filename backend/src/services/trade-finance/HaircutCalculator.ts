/**
 * Statistical Haircut Calculator
 * 
 * Purpose: Analyze historical price data and calculate risk metrics
 * 
 * Features:
 * - Flexible data loading (hourly, daily, weekly, any interval)
 * - Multiple statistical measures (volatility, VaR, drawdown, Sharpe)
 * - Annualized calculations for comparison
 * - Configurable confidence levels
 */

export interface PricePoint {
  timestamp: number;      // Unix timestamp (seconds)
  price: number;          // Price in USD
  volume?: number;        // Optional trading volume
}

export interface RiskMetrics {
  // Core volatility metrics
  volatility: number;           // Annualized volatility (%)
  volatilityBps: number;        // Volatility in basis points
  
  // Drawdown analysis
  maxDrawdown: number;          // Maximum historical drawdown (%)
  maxDrawdownBps: number;       // Max drawdown in basis points
  avgDrawdown: number;          // Average drawdown (%)
  drawdownDuration: number;     // Longest drawdown period (days)
  
  // Value at Risk
  valueAtRisk95: number;        // 95% VaR (%)
  valueAtRisk99: number;        // 99% VaR (%)
  var95Bps: number;             // 95% VaR in basis points
  var99Bps: number;             // 99% VaR in basis points
  
  // Performance metrics
  sharpeRatio: number;          // Risk-adjusted return
  sortinoRatio: number;         // Downside risk-adjusted return
  maxReturn: number;            // Maximum daily return (%)
  minReturn: number;            // Minimum daily return (%)
  
  // Liquidity proxy
  liquidityScore: number;       // 0-10000 (based on volume and spread)
  avgVolume: number;            // Average daily volume
  
  // Metadata
  dataPoints: number;           // Number of price points
  startDate: Date;              // First data point
  endDate: Date;                // Last data point
  intervalType: 'hourly' | 'daily' | 'weekly' | 'irregular';
  calculatedAt: Date;           // Calculation timestamp
}

export interface HaircutRecommendation {
  baseHaircut: number;          // Base haircut (bps)
  volatilityComponent: number;  // Volatility-based (bps)
  drawdownComponent: number;    // Drawdown-based (bps)
  liquidityComponent: number;   // Liquidity-based (bps)
  totalHaircut: number;         // Total recommended (bps)
  confidence: number;           // 0-100 (confidence in recommendation)
  reasoning: string;            // Human-readable explanation
}

export class HaircutCalculator {
  
  // ============ CONFIGURATION ============
  
  private readonly VOLATILITY_MULTIPLIER = 0.5;    // 50% of volatility → haircut
  private readonly DRAWDOWN_MULTIPLIER = 0.3;      // 30% of drawdown → haircut
  private readonly TRADING_DAYS_PER_YEAR = 252;
  private readonly HOURS_PER_YEAR = 8760;
  private readonly RISK_FREE_RATE = 0.04;          // 4% annual risk-free rate
  
  // ============ PRICE DATA LOADING ============
  
  /**
   * Load price data from JSON array
   */
  loadPriceDataFromJSON(data: any[]): PricePoint[] {
    return data.map(point => ({
      timestamp: typeof point.timestamp === 'string' 
        ? new Date(point.timestamp).getTime() / 1000
        : point.timestamp,
      price: parseFloat(point.price),
      volume: point.volume ? parseFloat(point.volume) : undefined
    }));
  }
  
  /**
   * Load price data from API response
   */
  async loadPriceDataFromAPI(
    url: string,
    transformer?: (data: any) => PricePoint[]
  ): Promise<PricePoint[]> {
    const response = await fetch(url);
    const data = await response.json();
    
    if (transformer) {
      return transformer(data);
    }
    
    return this.loadPriceDataFromJSON(data);
  }
  
  // ============ RISK METRIC CALCULATIONS ============
  
  /**
   * Calculate comprehensive risk metrics from price history
   */
  calculateRiskMetrics(prices: PricePoint[]): RiskMetrics {
    if (prices.length < 2) {
      throw new Error('Need at least 2 price points');
    }
    
    // Sort by timestamp
    const sorted = [...prices].sort((a, b) => a.timestamp - b.timestamp);
    
    // Detect interval type
    const intervalType = this._detectIntervalType(sorted);
    
    // Calculate returns
    const returns = this._calculateReturns(sorted);
    
    // Volatility
    const volatility = this._calculateVolatility(returns, intervalType);
    
    // Drawdown analysis
    const drawdownMetrics = this._calculateDrawdown(sorted);
    
    // Value at Risk
    const var95 = this._calculateVaR(returns, 0.95);
    const var99 = this._calculateVaR(returns, 0.99);
    
    // Performance metrics
    const sharpe = this._calculateSharpeRatio(returns, intervalType);
    const sortino = this._calculateSortinoRatio(returns, intervalType);
    
    // Liquidity score
    const liquidityScore = this._calculateLiquidityScore(sorted);
    
    return {
      // Volatility
      volatility: volatility * 100,
      volatilityBps: Math.round(volatility * 10000),
      
      // Drawdown
      maxDrawdown: (drawdownMetrics?.maxDrawdown ?? 0) * 100,
      maxDrawdownBps: Math.round((drawdownMetrics?.maxDrawdown ?? 0) * 10000),
      avgDrawdown: (drawdownMetrics?.avgDrawdown ?? 0) * 100,
      drawdownDuration: drawdownMetrics?.maxDuration ?? 0,
      
      // VaR
      valueAtRisk95: Math.abs(var95) * 100,
      valueAtRisk99: Math.abs(var99) * 100,
      var95Bps: Math.round(Math.abs(var95) * 10000),
      var99Bps: Math.round(Math.abs(var99) * 10000),
      
      // Performance
      sharpeRatio: sharpe,
      sortinoRatio: sortino,
      maxReturn: Math.max(...returns) * 100,
      minReturn: Math.min(...returns) * 100,
      
      // Liquidity
      liquidityScore: liquidityScore,
      avgVolume: this._calculateAvgVolume(sorted),
      
      // Metadata
      dataPoints: sorted.length,
      startDate: new Date((sorted[0]?.timestamp ?? 0) * 1000),
      endDate: new Date((sorted[sorted.length - 1]?.timestamp ?? 0) * 1000),
      intervalType: intervalType,
      calculatedAt: new Date()
    };
  }
  
  /**
   * Generate haircut recommendation based on risk metrics
   */
  recommendHaircut(metrics: RiskMetrics): HaircutRecommendation {
    // Base haircut (minimum)
    let baseHaircut = 500; // 5% default
    
    // Volatility component
    const volatilityComponent = Math.round(
      metrics.volatilityBps * this.VOLATILITY_MULTIPLIER
    );
    
    // Drawdown component
    const drawdownComponent = Math.round(
      metrics.maxDrawdownBps * this.DRAWDOWN_MULTIPLIER
    );
    
    // Liquidity component
    const liquidityComponent = this._calculateLiquidityHaircut(
      metrics.liquidityScore
    );
    
    // Total haircut
    const totalHaircut = baseHaircut 
      + volatilityComponent 
      + drawdownComponent 
      + liquidityComponent;
    
    // Confidence (based on data quality)
    const confidence = this._calculateConfidence(metrics);
    
    // Generate reasoning
    const reasoning = this._generateReasoning(
      metrics,
      baseHaircut,
      volatilityComponent,
      drawdownComponent,
      liquidityComponent
    );
    
    return {
      baseHaircut,
      volatilityComponent,
      drawdownComponent,
      liquidityComponent,
      totalHaircut: Math.min(totalHaircut, 5000), // Cap at 50%
      confidence,
      reasoning
    };
  }
  
  // ============ STATISTICAL CALCULATIONS ============
  
  /**
   * Calculate returns from prices
   */
  private _calculateReturns(prices: PricePoint[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const currentPrice = prices[i]?.price;
      const prevPrice = prices[i - 1]?.price;
      
      if (currentPrice !== undefined && prevPrice !== undefined && prevPrice !== 0) {
        const ret = (currentPrice - prevPrice) / prevPrice;
        returns.push(ret);
      }
    }
    
    return returns;
  }
  
  /**
   * Calculate annualized volatility
   */
  private _calculateVolatility(
    returns: number[],
    intervalType: string
  ): number {
    if (returns.length === 0) return 0;
    
    // Calculate standard deviation
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => {
      return sum + Math.pow(r - mean, 2);
    }, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Annualize based on interval type
    let annualizationFactor: number;
    switch (intervalType) {
      case 'hourly':
        annualizationFactor = Math.sqrt(this.HOURS_PER_YEAR);
        break;
      case 'daily':
        annualizationFactor = Math.sqrt(this.TRADING_DAYS_PER_YEAR);
        break;
      case 'weekly':
        annualizationFactor = Math.sqrt(52);
        break;
      default:
        annualizationFactor = Math.sqrt(this.TRADING_DAYS_PER_YEAR);
    }
    
    return stdDev * annualizationFactor;
  }
  
  /**
   * Calculate maximum drawdown and related metrics
   */
  private _calculateDrawdown(prices: PricePoint[]): {
    maxDrawdown: number;
    avgDrawdown: number;
    maxDuration: number;
  } {
    if (prices.length === 0) {
      return {
        maxDrawdown: 0,
        avgDrawdown: 0,
        maxDuration: 0
      };
    }
    
    const firstPrice = prices[0];
    if (!firstPrice) {
      return {
        maxDrawdown: 0,
        avgDrawdown: 0,
        maxDuration: 0
      };
    }
    
    let peak = firstPrice.price;
    let maxDrawdown = 0;
    let totalDrawdown = 0;
    let drawdownCount = 0;
    let currentDrawdownStart = 0;
    let maxDuration = 0;
    
    for (let i = 0; i < prices.length; i++) {
      const pricePoint = prices[i];
      if (!pricePoint) continue;
      
      const price = pricePoint.price;
      
      if (price > peak) {
        peak = price;
        if (currentDrawdownStart > 0) {
          const duration = i - currentDrawdownStart;
          maxDuration = Math.max(maxDuration, duration);
          currentDrawdownStart = 0;
        }
      } else {
        const drawdown = (peak - price) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
        totalDrawdown += drawdown;
        drawdownCount++;
        
        if (currentDrawdownStart === 0) {
          currentDrawdownStart = i;
        }
      }
    }
    
    const avgDrawdown = drawdownCount > 0 
      ? totalDrawdown / drawdownCount 
      : 0;
    
    // Convert duration from intervals to days (approximate)
    const avgIntervalSeconds = this._calculateAvgInterval(prices);
    const durationDays = avgIntervalSeconds > 0 
      ? Math.round((maxDuration * avgIntervalSeconds) / 86400)
      : 0;
    
    return {
      maxDrawdown,
      avgDrawdown,
      maxDuration: durationDays
    };
  }
  
  /**
   * Calculate Value at Risk (VaR)
   */
  private _calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    
    // Sort returns in ascending order
    const sorted = [...returns].sort((a, b) => a - b);
    
    // Find percentile
    const index = Math.floor((1 - confidence) * sorted.length);
    
    return sorted[index] ?? 0;
  }
  
  /**
   * Calculate Sharpe Ratio (risk-adjusted return)
   */
  private _calculateSharpeRatio(
    returns: number[],
    intervalType: string
  ): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = this._calculateVolatility(returns, intervalType);
    
    // Adjust risk-free rate for interval
    let adjustedRfRate: number;
    switch (intervalType) {
      case 'hourly':
        adjustedRfRate = this.RISK_FREE_RATE / this.HOURS_PER_YEAR;
        break;
      case 'daily':
        adjustedRfRate = this.RISK_FREE_RATE / this.TRADING_DAYS_PER_YEAR;
        break;
      default:
        adjustedRfRate = this.RISK_FREE_RATE / this.TRADING_DAYS_PER_YEAR;
    }
    
    if (volatility === 0) return 0;
    
    return (avgReturn - adjustedRfRate) / volatility;
  }
  
  /**
   * Calculate Sortino Ratio (downside risk-adjusted return)
   */
  private _calculateSortinoRatio(
    returns: number[],
    intervalType: string
  ): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    // Calculate downside deviation (only negative returns)
    const negativeReturns = returns.filter(r => r < 0);
    if (negativeReturns.length === 0) return Infinity;
    
    const downsideVariance = negativeReturns.reduce((sum, r) => {
      return sum + Math.pow(r, 2);
    }, 0) / negativeReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);
    
    // Annualize
    let annualizationFactor: number;
    switch (intervalType) {
      case 'hourly':
        annualizationFactor = Math.sqrt(this.HOURS_PER_YEAR);
        break;
      case 'daily':
        annualizationFactor = Math.sqrt(this.TRADING_DAYS_PER_YEAR);
        break;
      default:
        annualizationFactor = Math.sqrt(this.TRADING_DAYS_PER_YEAR);
    }
    
    const annualizedDownside = downsideDeviation * annualizationFactor;
    
    if (annualizedDownside === 0) return 0;
    
    return avgReturn / annualizedDownside;
  }
  
  /**
   * Calculate liquidity score (0-10000)
   */
  private _calculateLiquidityScore(prices: PricePoint[]): number {
    // If no volume data, use price stability as proxy
    const hasVolume = prices.some(p => p.volume && p.volume > 0);
    
    if (!hasVolume) {
      // Use price stability as liquidity proxy
      const returns = this._calculateReturns(prices);
      const volatility = this._calculateVolatility(returns, 'daily');
      
      // Lower volatility = higher liquidity
      const score = Math.max(0, 10000 - volatility * 10000);
      return Math.round(score);
    }
    
    // Calculate average volume
    const avgVolume = this._calculateAvgVolume(prices);
    
    // Simple mapping: Higher volume = higher score
    if (avgVolume > 1000000) return 10000;
    if (avgVolume > 100000) return 8000;
    if (avgVolume > 10000) return 6000;
    if (avgVolume > 1000) return 4000;
    return 2000;
  }
  
  /**
   * Calculate liquidity-based haircut component
   */
  private _calculateLiquidityHaircut(liquidityScore: number): number {
    if (liquidityScore >= 8000) return 0;
    if (liquidityScore >= 5000) return 100;
    if (liquidityScore >= 2000) return 300;
    return 500;
  }
  
  // ============ HELPER FUNCTIONS ============
  
  /**
   * Detect interval type from timestamps
   */
  private _detectIntervalType(
    prices: PricePoint[]
  ): 'hourly' | 'daily' | 'weekly' | 'irregular' {
    if (prices.length < 2) return 'irregular';
    
    const avgInterval = this._calculateAvgInterval(prices);
    
    if (avgInterval >= 2880 && avgInterval <= 4320) return 'hourly';
    if (avgInterval >= 69120 && avgInterval <= 103680) return 'daily';
    if (avgInterval >= 483840 && avgInterval <= 725760) return 'weekly';
    
    return 'irregular';
  }
  
  /**
   * Calculate average interval between prices
   */
  private _calculateAvgInterval(prices: PricePoint[]): number {
    if (prices.length < 2) return 0;
    
    let totalInterval = 0;
    for (let i = 1; i < prices.length; i++) {
      const currentTimestamp = prices[i]?.timestamp ?? 0;
      const prevTimestamp = prices[i - 1]?.timestamp ?? 0;
      totalInterval += currentTimestamp - prevTimestamp;
    }
    
    return totalInterval / (prices.length - 1);
  }
  
  /**
   * Calculate average volume
   */
  private _calculateAvgVolume(prices: PricePoint[]): number {
    const volumePrices = prices.filter(p => p.volume && p.volume > 0);
    
    if (volumePrices.length === 0) return 0;
    
    const totalVolume = volumePrices.reduce((sum, p) => sum + (p.volume || 0), 0);
    return totalVolume / volumePrices.length;
  }
  
  /**
   * Calculate confidence in recommendation
   */
  private _calculateConfidence(metrics: RiskMetrics): number {
    let confidence = 100;
    
    if (metrics.dataPoints < 30) confidence -= 20;
    if (metrics.dataPoints < 100) confidence -= 10;
    if (metrics.intervalType === 'irregular') confidence -= 15;
    if (metrics.liquidityScore < 5000) confidence -= 10;
    
    return Math.max(0, confidence);
  }
  
  /**
   * Generate human-readable reasoning
   */
  private _generateReasoning(
    metrics: RiskMetrics,
    base: number,
    vol: number,
    dd: number,
    liq: number
  ): string {
    const parts: string[] = [];
    
    parts.push(`Base haircut: ${(base / 100).toFixed(2)}%`);
    
    if (vol > 0) {
      parts.push(
        `Volatility component: ${(vol / 100).toFixed(2)}% ` +
        `(based on ${metrics.volatility.toFixed(2)}% annualized volatility)`
      );
    }
    
    if (dd > 0) {
      parts.push(
        `Drawdown component: ${(dd / 100).toFixed(2)}% ` +
        `(based on ${metrics.maxDrawdown.toFixed(2)}% max drawdown)`
      );
    }
    
    if (liq > 0) {
      parts.push(
        `Liquidity component: ${(liq / 100).toFixed(2)}% ` +
        `(liquidity score: ${metrics.liquidityScore}/10000)`
      );
    }
    
    parts.push(
      `Data quality: ${metrics.dataPoints} ${metrics.intervalType} prices ` +
      `from ${metrics.startDate?.toISOString().split('T')[0] ?? 'unknown'} to ` +
      `${metrics.endDate?.toISOString().split('T')[0] ?? 'unknown'}`
    );
    
    return parts.join('\n');
  }
}
