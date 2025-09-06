import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Leaf, 
  TrendingUp, 
  TrendingDown, 
  Award,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Calendar,
  DollarSign,
  Target,
  Globe,
  Zap,
  ArrowUp,
  Info
} from "lucide-react";
import { supabase } from "@/infrastructure/database/client";
import { toast } from "@/components/ui/use-toast";

interface CarbonCreditDashboardProps {
  receivableId?: string;
  assetId?: string;
  className?: string;
  showMarketTrends?: boolean;
}

interface CarbonCreditValuation {
  annualGeneration: number;
  currentPrice: number;
  verificationStandard: 'VCS' | 'CDM' | 'Gold-Standard' | 'CAR';
  additionality: {
    financial: boolean;
    regulatory: boolean;
    commonPractice: boolean;
    barrier: boolean;
    score: number;
  };
  premiumPercentage: number;
  totalAnnualValue: number;
  lifetimeValue: number;
  vintage: number;
  permanence: number;
  leakage: number;
}

interface MarketData {
  vcsPrices: { date: string; price: number }[];
  goldStandardPrices: { date: string; price: number }[];
  averagePrice: number;
  priceRange: { min: number; max: number };
  trend: 'increasing' | 'decreasing' | 'stable';
}

const VERIFICATION_STANDARDS = {
  'VCS': { name: 'Verified Carbon Standard', basePrice: 12, multiplier: 1.0 },
  'CDM': { name: 'Clean Development Mechanism', basePrice: 8, multiplier: 0.8 },
  'Gold-Standard': { name: 'Gold Standard', basePrice: 18, multiplier: 1.4 },
  'CAR': { name: 'Climate Action Reserve', basePrice: 15, multiplier: 1.2 }
};

/**
 * Carbon Credit Valuation Dashboard Component
 * 
 * Displays comprehensive carbon credit analysis including:
 * - Annual credit generation tracking and projections
 * - Additionality assessment scorecard with detailed breakdown
 * - Verification standard comparison and premium analysis
 * - Market price trends and forecasting
 * - Premium value calculation from high additionality
 */
const CarbonCreditValuationDashboard: React.FC<CarbonCreditDashboardProps> = ({
  receivableId,
  assetId,
  className = "",
  showMarketTrends = true
}) => {
  const [carbonData, setCarbonData] = useState<CarbonCreditValuation | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("generation");

  // Fetch carbon credit data from database
  const fetchCarbonData = async () => {
    if (!receivableId && !assetId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Query climate_nav_calculations table for carbon credit data
      let query = supabase
        .from('climate_nav_calculations')
        .select(`
          carbon_credits_annual,
          carbon_price_current,
          carbon_verification_standard,
          additionality_financial,
          additionality_regulatory,
          additionality_common_practice,
          additionality_barrier,
          additionality_premium_percentage,
          receivable_id,
          asset_id
        `)
        .eq('calculation_type', 'carbon_credit_analysis')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (receivableId) {
        query = query.eq('receivable_id', receivableId);
      } else if (assetId) {
        query = query.eq('asset_id', assetId);
      }
      
      const { data, error: dbError } = await query;
      
      if (dbError) throw dbError;
      
      if (data && data.length > 0) {
        const record = data[0];
        
        // Calculate additionality score
        const additionalityTests = {
          financial: record.additionality_financial || false,
          regulatory: record.additionality_regulatory || false,
          commonPractice: record.additionality_common_practice || false,
          barrier: record.additionality_barrier || false
        };
        
        const passedTests = Object.values(additionalityTests).filter(Boolean).length;
        const additionalityScore = (passedTests / 4) * 100;
        
        // Get verification standard details
        const standard = (record.carbon_verification_standard as keyof typeof VERIFICATION_STANDARDS) || 'VCS';
        const standardData = VERIFICATION_STANDARDS[standard];
        
        // Calculate pricing
        const basePrice = record.carbon_price_current || standardData.basePrice;
        const premiumPercentage = record.additionality_premium_percentage || (additionalityScore > 75 ? 20 : additionalityScore > 50 ? 10 : 0);
        const annualGeneration = record.carbon_credits_annual || 5000;
        
        const totalAnnualValue = annualGeneration * basePrice * (1 + premiumPercentage / 100);
        const lifetimeValue = totalAnnualValue * 20; // 20-year project life
        
        setCarbonData({
          annualGeneration,
          currentPrice: basePrice,
          verificationStandard: standard,
          additionality: {
            ...additionalityTests,
            score: additionalityScore
          },
          premiumPercentage,
          totalAnnualValue,
          lifetimeValue,
          vintage: new Date().getFullYear(),
          permanence: 100, // Renewable energy projects typically have permanent credits
          leakage: 5 // Low leakage for renewable energy
        });
        
        // Generate mock market data (in production, this would come from market data APIs)
        generateMarketData(basePrice);
        
      } else {
        // No data found - show empty state
        setCarbonData(null);
        setMarketData(null);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch carbon credit data:', err);
      
      toast({
        title: "Failed to Load Carbon Credit Data",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate mock market data (replace with real API in production)
  const generateMarketData = (currentPrice: number) => {
    const today = new Date();
    const vcsPrices = [];
    const goldStandardPrices = [];
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const vcsPrice = currentPrice + (Math.random() - 0.5) * 4;
      const goldPrice = currentPrice * 1.4 + (Math.random() - 0.5) * 6;
      
      vcsPrices.push({
        date: date.toISOString().split('T')[0],
        price: Math.max(0, vcsPrice)
      });
      
      goldStandardPrices.push({
        date: date.toISOString().split('T')[0],
        price: Math.max(0, goldPrice)
      });
    }
    
    const allPrices = [...vcsPrices.map(p => p.price), ...goldStandardPrices.map(p => p.price)];
    const averagePrice = allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length;
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    
    // Determine trend (simplified)
    const recentPrices = vcsPrices.slice(-7).map(p => p.price);
    const olderPrices = vcsPrices.slice(-14, -7).map(p => p.price);
    const recentAvg = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    const olderAvg = olderPrices.reduce((sum, price) => sum + price, 0) / olderPrices.length;
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (recentAvg > olderAvg * 1.05) {
      trend = 'increasing';
    } else if (recentAvg < olderAvg * 0.95) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }
    
    setMarketData({
      vcsPrices,
      goldStandardPrices,
      averagePrice,
      priceRange: { min: minPrice, max: maxPrice },
      trend
    });
  };

  useEffect(() => {
    fetchCarbonData();
  }, [receivableId, assetId]);

  // Get additionality styling
  const getAdditionalityStyle = (score: number) => {
    if (score >= 75) {
      return { variant: 'default' as const, color: 'text-green-600', bgColor: 'bg-green-50', level: 'High' };
    } else if (score >= 50) {
      return { variant: 'secondary' as const, color: 'text-blue-600', bgColor: 'bg-blue-50', level: 'Medium' };
    } else {
      return { variant: 'destructive' as const, color: 'text-red-600', bgColor: 'bg-red-50', level: 'Low' };
    }
  };

  // Get trend styling
  const getTrendStyle = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return { icon: TrendingUp, color: 'text-green-600' };
      case 'decreasing':
        return { icon: TrendingDown, color: 'text-red-600' };
      default:
        return { icon: BarChart3, color: 'text-blue-600' };
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !carbonData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5" />
            Carbon Credit Valuation
          </CardTitle>
          <CardDescription>Carbon credit generation and market analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              {error ? `Error: ${error}` : 'No carbon credit data available'}
            </p>
            <Button variant="outline" onClick={fetchCarbonData}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const additionalityStyle = getAdditionalityStyle(carbonData.additionality.score);
  const trendStyle = getTrendStyle(marketData?.trend || 'stable');
  const TrendIcon = trendStyle.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5" />
            Carbon Credit Valuation
          </div>
          <Badge variant={additionalityStyle.variant} className="gap-1">
            <Award className="h-3 w-3" />
            {additionalityStyle.level} Additionality
          </Badge>
        </CardTitle>
        <CardDescription>
          {carbonData.verificationStandard} verified • {carbonData.annualGeneration.toLocaleString()} credits/year
          • ${carbonData.currentPrice}/tonne
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="generation">Generation</TabsTrigger>
            <TabsTrigger value="additionality">Additionality</TabsTrigger>
            <TabsTrigger value="standards">Standards</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
          </TabsList>

          <TabsContent value="generation" className="space-y-4 mt-4">
            {/* Generation Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${additionalityStyle.bgColor}`}>
                <div className="text-2xl font-bold">{carbonData.annualGeneration.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Annual Credits (tCO2e)</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold">${(carbonData.totalAnnualValue / 1000).toFixed(0)}K</div>
                <div className="text-sm text-muted-foreground">Annual Credit Value</div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Credit Generation Metrics
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Vintage Year</span>
                  </div>
                  <span className="font-semibold">{carbonData.vintage}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Permanence</span>
                  </div>
                  <span className="font-semibold text-green-600">{carbonData.permanence}%</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Leakage</span>
                  </div>
                  <span className="font-semibold">{carbonData.leakage}%</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Premium from Additionality</span>
                  </div>
                  <span className="font-semibold text-green-600">
                    +{carbonData.premiumPercentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Lifetime Value Projection */}
            <div className="space-y-3">
              <h4 className="font-semibold">Lifetime Value Projection</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-lg font-bold">
                    ${(carbonData.lifetimeValue / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-xs text-muted-foreground">Total Value</div>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-lg font-bold">
                    {(carbonData.annualGeneration * 20).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Credits</div>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-lg font-bold">
                    ${(carbonData.lifetimeValue / (carbonData.annualGeneration * 20)).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Price/Credit</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="additionality" className="space-y-4 mt-4">
            {/* Additionality Assessment */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${additionalityStyle.bgColor}`}>
                  <div className="text-2xl font-bold">{carbonData.additionality.score.toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground">Additionality Score</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold">
                    {Object.values(carbonData.additionality).slice(0, 4).filter(Boolean).length}/4
                  </div>
                  <div className="text-sm text-muted-foreground">Tests Passed</div>
                </div>
              </div>

              {/* Additionality Tests */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Additionality Test Results
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Financial Additionality</div>
                      <div className="text-xs text-muted-foreground">
                        Project requires carbon revenue to be financially viable
                      </div>
                    </div>
                    <Badge variant={carbonData.additionality.financial ? 'default' : 'destructive'}>
                      {carbonData.additionality.financial ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {carbonData.additionality.financial ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Regulatory Additionality</div>
                      <div className="text-xs text-muted-foreground">
                        Goes beyond regulatory requirements
                      </div>
                    </div>
                    <Badge variant={carbonData.additionality.regulatory ? 'default' : 'destructive'}>
                      {carbonData.additionality.regulatory ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {carbonData.additionality.regulatory ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Common Practice Test</div>
                      <div className="text-xs text-muted-foreground">
                        Not common practice in the region/sector
                      </div>
                    </div>
                    <Badge variant={carbonData.additionality.commonPractice ? 'default' : 'destructive'}>
                      {carbonData.additionality.commonPractice ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {carbonData.additionality.commonPractice ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Barrier Analysis</div>
                      <div className="text-xs text-muted-foreground">
                        Overcomes significant implementation barriers
                      </div>
                    </div>
                    <Badge variant={carbonData.additionality.barrier ? 'default' : 'destructive'}>
                      {carbonData.additionality.barrier ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {carbonData.additionality.barrier ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Premium Impact */}
              <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Additionality Premium Impact</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  High additionality score enables {carbonData.premiumPercentage}% price premium, 
                  adding <span className="font-semibold text-green-600">
                    ${((carbonData.totalAnnualValue * carbonData.premiumPercentage / 100) / 1000).toFixed(0)}K annually
                  </span> to credit value.
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="standards" className="space-y-4 mt-4">
            {/* Verification Standard Comparison */}
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-lg font-bold">{VERIFICATION_STANDARDS[carbonData.verificationStandard].name}</div>
                <div className="text-sm text-muted-foreground">Current Verification Standard</div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Verification Standard Comparison
                </h4>
                
                <div className="space-y-2">
                  {Object.entries(VERIFICATION_STANDARDS).map(([key, standard]) => (
                    <div 
                      key={key} 
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        key === carbonData.verificationStandard ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {key === carbonData.verificationStandard && (
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        )}
                        <div>
                          <div className="text-sm font-medium">{standard.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {key === 'VCS' && 'World\'s most used voluntary carbon standard'}
                            {key === 'CDM' && 'UN Clean Development Mechanism'}
                            {key === 'Gold-Standard' && 'Premium standard with co-benefits'}
                            {key === 'CAR' && 'North American carbon registry'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${standard.basePrice}/tonne</div>
                        <div className="text-xs text-muted-foreground">
                          {((standard.multiplier - 1) * 100).toFixed(0)}% vs VCS
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Standard Benefits */}
              <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">
                    {VERIFICATION_STANDARDS[carbonData.verificationStandard].name} Benefits
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {carbonData.verificationStandard === 'VCS' && 
                    "Widest market acceptance, high liquidity, and robust methodologies for renewable energy projects."}
                  {carbonData.verificationStandard === 'CDM' && 
                    "UN backing provides regulatory certainty and government recognition worldwide."}
                  {carbonData.verificationStandard === 'Gold-Standard' && 
                    "Premium pricing due to additional sustainable development benefits and co-benefits verification."}
                  {carbonData.verificationStandard === 'CAR' && 
                    "Strong regional acceptance in North America with streamlined processes for renewable energy."}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="market" className="space-y-4 mt-4">
            {/* Market Overview */}
            {marketData && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold">${marketData.averagePrice.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Average Price</div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold">
                      ${marketData.priceRange.min.toFixed(0)}-${marketData.priceRange.max.toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Price Range</div>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    marketData.trend === 'increasing' ? 'bg-green-50 dark:bg-green-900/20' : 
                    marketData.trend === 'decreasing' ? 'bg-red-50 dark:bg-red-900/20' : 
                    'bg-blue-50 dark:bg-blue-900/20'
                  }`}>
                    <div className={`text-2xl font-bold flex items-center gap-1 ${trendStyle.color}`}>
                      <TrendIcon className="h-5 w-5" />
                      {marketData.trend.toUpperCase()}
                    </div>
                    <div className="text-sm text-muted-foreground">30-Day Trend</div>
                  </div>
                </div>

                {/* Price Comparison by Standard */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Recent Price Performance
                  </h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium">VCS Credits</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          ${marketData.vcsPrices[marketData.vcsPrices.length - 1]?.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Current</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium">Gold Standard</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          ${marketData.goldStandardPrices[marketData.goldStandardPrices.length - 1]?.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Current</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Market Insights */}
                <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Market Insights</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {marketData.trend === 'increasing' && (
                      <div>• Rising demand for high-quality renewable energy credits driving price appreciation</div>
                    )}
                    {marketData.trend === 'decreasing' && (
                      <div>• Market correction or increased supply affecting short-term pricing</div>
                    )}
                    {marketData.trend === 'stable' && (
                      <div>• Market showing stability with balanced supply and demand dynamics</div>
                    )}
                    <div>• Premium standards like Gold Standard maintaining 40-50% price premium</div>
                    <div>• High additionality projects continue to command market premiums</div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Button */}
        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchCarbonData}
            className="w-full"
          >
            Refresh Carbon Credit Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CarbonCreditValuationDashboard;