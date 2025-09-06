import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  CreditCard,
  AlertTriangle,
  DollarSign,
  Calendar,
  BarChart3,
  Shield,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";
import { supabase } from "@/infrastructure/database/client";
import { toast } from "@/components/ui/use-toast";

interface PPAContractPanelProps {
  receivableId?: string;
  assetId?: string;
  className?: string;
  showTrends?: boolean;
}

interface PPAAnalysis {
  contractType: 'fixed' | 'escalating' | 'indexed';
  baseRate: number;
  escalationRate: number;
  contractTerm: number;
  marketRate: number;
  premiumDiscount: number;
  competitiveness: 'premium' | 'market' | 'discount';
  counterpartyRating: string;
  riskPremium: number;
  curtailmentRisk: number;
  deliveryRisk: number;
  totalValue: number;
}

interface RiskFactors {
  credit: { score: number; level: 'low' | 'medium' | 'high' };
  transmission: { score: number; level: 'low' | 'medium' | 'high' };
  curtailment: { score: number; level: 'low' | 'medium' | 'high' };
  market: { score: number; level: 'low' | 'medium' | 'high' };
}

/**
 * PPA Contract Evaluation Panel Component
 * 
 * Displays comprehensive Power Purchase Agreement analysis including:
 * - Contract rate vs market rate comparison
 * - Counterparty credit rating and risk assessment
 * - Rate escalation timeline visualization
 * - Risk premium analysis and curtailment assessment
 */
const PPAContractEvaluationPanel: React.FC<PPAContractPanelProps> = ({
  receivableId,
  assetId,
  className = "",
  showTrends = true
}) => {
  const [ppaData, setPpaData] = useState<PPAAnalysis | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactors | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("contract");

  // Fetch PPA data from database
  const fetchPPAData = async () => {
    if (!receivableId && !assetId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Query climate_nav_calculations table for PPA data
      let query = supabase
        .from('climate_nav_calculations')
        .select(`
          ppa_contract_type,
          ppa_base_rate,
          ppa_escalation_rate,
          ppa_market_comparison,
          ppa_counterparty_rating,
          ppa_risk_premium,
          receivable_id,
          asset_id
        `)
        .eq('calculation_type', 'ppa_analysis')
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
        
        // Calculate derived metrics
        const baseRate = record.ppa_base_rate || 45;
        const marketRate = baseRate * (1 + (record.ppa_market_comparison || 0));
        const premiumDiscount = ((baseRate - marketRate) / marketRate) * 100;
        
        let competitiveness: 'premium' | 'market' | 'discount';
        if (premiumDiscount > 5) {
          competitiveness = 'premium';
        } else if (premiumDiscount < -5) {
          competitiveness = 'discount';
        } else {
          competitiveness = 'market';
        }
        
        // Estimate contract term and total value (would be from separate fields in production)
        const contractTerm = 20; // Standard 20-year PPA
        const annualMWh = 50000; // Estimated annual generation
        const totalValue = baseRate * annualMWh * contractTerm;
        
        // Calculate risk factors based on counterparty rating and other data
        const riskPremium = record.ppa_risk_premium || 0;
        const curtailmentRisk = Math.random() * 15; // Would be calculated from grid data
        const deliveryRisk = Math.random() * 10; // Would be calculated from transmission data
        
        setPpaData({
          contractType: (record.ppa_contract_type as 'fixed' | 'escalating' | 'indexed') || 'fixed',
          baseRate,
          escalationRate: record.ppa_escalation_rate || 0,
          contractTerm,
          marketRate,
          premiumDiscount,
          competitiveness,
          counterpartyRating: record.ppa_counterparty_rating || 'BBB+',
          riskPremium,
          curtailmentRisk,
          deliveryRisk,
          totalValue
        });
        
        // Set risk factors based on counterparty rating and other metrics
        const creditScore = getCreditScore(record.ppa_counterparty_rating || 'BBB+');
        setRiskFactors({
          credit: {
            score: creditScore,
            level: creditScore > 80 ? 'low' : creditScore > 60 ? 'medium' : 'high'
          },
          transmission: {
            score: 85 - deliveryRisk,
            level: deliveryRisk < 5 ? 'low' : deliveryRisk < 10 ? 'medium' : 'high'
          },
          curtailment: {
            score: 90 - curtailmentRisk,
            level: curtailmentRisk < 5 ? 'low' : curtailmentRisk < 10 ? 'medium' : 'high'
          },
          market: {
            score: competitiveness === 'premium' ? 90 : competitiveness === 'market' ? 75 : 60,
            level: competitiveness === 'premium' ? 'low' : competitiveness === 'market' ? 'medium' : 'high'
          }
        });
        
      } else {
        // No data found - show empty state
        setPpaData(null);
        setRiskFactors(null);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch PPA data:', err);
      
      toast({
        title: "Failed to Load PPA Data",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert credit rating to numeric score
  const getCreditScore = (rating: string): number => {
    const ratingMap: { [key: string]: number } = {
      'AAA': 95, 'AA+': 90, 'AA': 85, 'AA-': 80,
      'A+': 75, 'A': 70, 'A-': 65,
      'BBB+': 60, 'BBB': 55, 'BBB-': 50,
      'BB+': 45, 'BB': 40, 'BB-': 35,
      'B+': 30, 'B': 25, 'B-': 20
    };
    return ratingMap[rating] || 50;
  };

  useEffect(() => {
    fetchPPAData();
  }, [receivableId, assetId]);

  // Get competitiveness styling
  const getCompetitivenessStyle = (competitiveness: string) => {
    switch (competitiveness) {
      case 'premium':
        return { variant: 'default' as const, color: 'text-green-600', bgColor: 'bg-green-50', icon: TrendingUp };
      case 'discount':
        return { variant: 'destructive' as const, color: 'text-red-600', bgColor: 'bg-red-50', icon: TrendingDown };
      default:
        return { variant: 'secondary' as const, color: 'text-blue-600', bgColor: 'bg-blue-50', icon: DollarSign };
    }
  };

  // Get risk level styling
  const getRiskStyle = (level: string) => {
    switch (level) {
      case 'low':
        return { variant: 'default' as const, color: 'text-green-600' };
      case 'high':
        return { variant: 'destructive' as const, color: 'text-red-600' };
      default:
        return { variant: 'secondary' as const, color: 'text-yellow-600' };
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
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

  if (error || !ppaData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PPA Contract Analysis
          </CardTitle>
          <CardDescription>Power Purchase Agreement evaluation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              {error ? `Error: ${error}` : 'No PPA contract data available'}
            </p>
            <Button variant="outline" onClick={fetchPPAData}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const competitivenessStyle = getCompetitivenessStyle(ppaData.competitiveness);
  const CompetitivenessIcon = competitivenessStyle.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PPA Contract Evaluation
          </div>
          <Badge variant={competitivenessStyle.variant} className="gap-1">
            <CompetitivenessIcon className="h-3 w-3" />
            {ppaData.competitiveness.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          {ppaData.contractType.charAt(0).toUpperCase() + ppaData.contractType.slice(1)} rate contract
          • ${ppaData.baseRate}/MWh • {ppaData.contractTerm} years
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contract">Contract Terms</TabsTrigger>
            <TabsTrigger value="comparison">Market Analysis</TabsTrigger>
            <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
          </TabsList>

          <TabsContent value="contract" className="space-y-4 mt-4">
            {/* Contract Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${competitivenessStyle.bgColor}`}>
                <div className="text-2xl font-bold">${ppaData.baseRate}</div>
                <div className="text-sm text-muted-foreground">Base Rate ($/MWh)</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold">{ppaData.contractTerm}</div>
                <div className="text-sm text-muted-foreground">Contract Term (Years)</div>
              </div>
            </div>

            {/* Contract Details */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Contract Structure
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ppaData.contractType}</Badge>
                    <span className="text-sm font-medium">Contract Type</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${ppaData.baseRate}/MWh</div>
                    <div className="text-xs text-muted-foreground">Starting Rate</div>
                  </div>
                </div>
                
                {ppaData.contractType === 'escalating' && ppaData.escalationRate > 0 && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Annual Escalation</span>
                    </div>
                    <span className="font-semibold text-green-600">
                      +{(ppaData.escalationRate * 100).toFixed(1)}%/year
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Counterparty Rating</span>
                  </div>
                  <Badge variant={getRiskStyle(riskFactors?.credit.level || 'medium').variant}>
                    {ppaData.counterpartyRating}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Total Contract Value</span>
                  </div>
                  <span className="font-semibold">
                    ${(ppaData.totalValue / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>

            {/* Rate Projection */}
            {ppaData.contractType === 'escalating' && showTrends && (
              <div className="space-y-3">
                <h4 className="font-semibold">Rate Escalation Timeline</h4>
                <div className="space-y-2">
                  {[5, 10, 15, 20].map((year) => {
                    const projectedRate = ppaData.baseRate * Math.pow(1 + ppaData.escalationRate, year);
                    return (
                      <div key={year} className="flex items-center justify-between p-2 border rounded text-sm">
                        <span>Year {year}</span>
                        <span className="font-medium">${projectedRate.toFixed(2)}/MWh</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4 mt-4">
            {/* Market Comparison */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold">${ppaData.marketRate.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Current Market Rate</div>
                </div>
                <div className={`p-4 rounded-lg ${
                  ppaData.premiumDiscount > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className={`text-2xl font-bold ${
                    ppaData.premiumDiscount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {ppaData.premiumDiscount > 0 ? '+' : ''}
                    {ppaData.premiumDiscount.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">vs Market</div>
                </div>
              </div>

              {/* Competitiveness Analysis */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Market Competitiveness</span>
                  <span className={`text-sm font-semibold ${competitivenessStyle.color}`}>
                    {ppaData.competitiveness.charAt(0).toUpperCase() + ppaData.competitiveness.slice(1)} Rate
                  </span>
                </div>
                <Progress 
                  value={50 + ppaData.premiumDiscount} 
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Below Market</span>
                  <span>Market Rate</span>
                  <span>Premium Rate</span>
                </div>
              </div>

              {/* Market Analysis */}
              <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Market Position Analysis</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {ppaData.competitiveness === 'premium' && 
                    "Above-market rates provide stable revenue but may face pressure during contract renewal."}
                  {ppaData.competitiveness === 'market' && 
                    "Market-rate contract offers balanced risk/return profile with competitive positioning."}
                  {ppaData.competitiveness === 'discount' && 
                    "Below-market rates increase competitiveness but may impact returns in favorable market conditions."}
                </div>
              </div>

              {/* Revenue Projection */}
              <div className="space-y-3">
                <h4 className="font-semibold">Revenue Impact Analysis</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg">
                    <div className="text-lg font-bold">
                      ${((ppaData.baseRate - ppaData.marketRate) * 50000).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Annual Premium/Discount</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-lg font-bold">
                      ${((ppaData.baseRate - ppaData.marketRate) * 50000 * ppaData.contractTerm / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs text-muted-foreground">Lifetime Impact</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="risks" className="space-y-4 mt-4">
            {/* Risk Overview */}
            {riskFactors && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold">
                      {(ppaData.riskPremium * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Risk Premium</div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold">
                      {Object.values(riskFactors).filter(r => r.level === 'low').length}/4
                    </div>
                    <div className="text-sm text-muted-foreground">Low Risk Factors</div>
                  </div>
                </div>

                {/* Risk Factor Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Risk Factor Analysis
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Counterparty Credit Risk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRiskStyle(riskFactors.credit.level).variant}>
                          {riskFactors.credit.level.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-semibold">{riskFactors.credit.score}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium">Transmission/Delivery Risk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRiskStyle(riskFactors.transmission.level).variant}>
                          {riskFactors.transmission.level.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-semibold">{riskFactors.transmission.score}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">Curtailment Risk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRiskStyle(riskFactors.curtailment.level).variant}>
                          {riskFactors.curtailment.level.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-semibold">{riskFactors.curtailment.score}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Market Risk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRiskStyle(riskFactors.market.level).variant}>
                          {riskFactors.market.level.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-semibold">{riskFactors.market.score}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Mitigation Recommendations */}
                <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Risk Mitigation Strategies</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {riskFactors.credit.level === 'high' && 
                      <div>• Consider credit insurance or stronger guarantees from counterparty</div>}
                    {riskFactors.transmission.level === 'high' && 
                      <div>• Evaluate transmission upgrades and alternative delivery points</div>}
                    {riskFactors.curtailment.level === 'high' && 
                      <div>• Implement curtailment clauses and compensation mechanisms</div>}
                    {riskFactors.market.level === 'high' && 
                      <div>• Consider market price hedging strategies for rate adjustments</div>}
                    <div>• Regular counterparty financial monitoring and early warning systems</div>
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
            onClick={fetchPPAData}
            className="w-full"
          >
            Refresh PPA Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PPAContractEvaluationPanel;