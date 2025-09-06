import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calculator,
  Target,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Lightbulb,
  RefreshCw
} from "lucide-react";
import { useIntegratedClimateValuation } from "../../hooks/useIntegratedClimateValuation";
import type { IntegratedValuationResult } from "../../services/business-logic/integrated-climate-receivables-valuation-engine";

interface ValuationReconciliationViewProps {
  receivableIds: string[];
  className?: string;
  showDetailedAnalysis?: boolean;
  autoRefresh?: boolean;
}

interface ReconciliationMetrics {
  climateNAV: number;
  monteCarloNPV: number;
  recommendedValue: number;
  variance: number;
  variancePercentage: number;
  confidence: number;
  reconciliationStatus: 'ALIGNED' | 'MINOR_VARIANCE' | 'HIGH_VARIANCE' | 'NEEDS_INVESTIGATION';
  methodology: string;
  lastUpdated: string;
}

interface VarianceFactors {
  modelDifferences: string[];
  dataQuality: string[];
  assumptionDifferences: string[];
  marketConditions: string[];
}

/**
 * Integrated Valuation Reconciliation View Component
 * 
 * Displays comprehensive valuation reconciliation including:
 * - Side-by-side NAV comparison (Climate vs Monte Carlo)
 * - Variance analysis with drill-down capability
 * - Confidence level indicators and methodology comparison
 * - Investment recommendation summary
 * - Risk factor attribution analysis with detailed breakdown
 */
const IntegratedValuationReconciliationView: React.FC<ValuationReconciliationViewProps> = ({
  receivableIds,
  className = "",
  showDetailedAnalysis = true,
  autoRefresh = true
}) => {
  const [activeTab, setActiveTab] = useState("comparison");
  const [detailedResults, setDetailedResults] = useState<IntegratedValuationResult[]>([]);

  const {
    valuations,
    metrics,
    loading,
    calculating,
    error,
    performIntegratedValuation,
    getPortfolioPerformance,
    getValuationAccuracy,
    totalPortfolioValue
  } = useIntegratedClimateValuation({
    receivableIds,
    autoRefresh,
    enableStressTesting: true,
    enableMLModels: true
  });

  // Calculate aggregated reconciliation metrics
  const reconciliationMetrics: ReconciliationMetrics | null = React.useMemo(() => {
    if (metrics.length === 0) return null;

    const totalClimateNAV = metrics.reduce((sum, m) => sum + m.climateNAV, 0);
    const totalMonteCarloNPV = metrics.reduce((sum, m) => sum + m.cashFlowNPV, 0);
    const totalRecommendedValue = metrics.reduce((sum, m) => sum + m.recommendedValue, 0);
    
    const variance = Math.abs(totalClimateNAV - totalMonteCarloNPV);
    const variancePercentage = (variance / Math.max(totalClimateNAV, totalMonteCarloNPV)) * 100;
    const averageConfidence = metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length;
    
    // Determine reconciliation status
    let reconciliationStatus: ReconciliationMetrics['reconciliationStatus'];
    if (variancePercentage <= 5) {
      reconciliationStatus = 'ALIGNED';
    } else if (variancePercentage <= 15) {
      reconciliationStatus = 'MINOR_VARIANCE';
    } else if (variancePercentage <= 25) {
      reconciliationStatus = 'HIGH_VARIANCE';
    } else {
      reconciliationStatus = 'NEEDS_INVESTIGATION';
    }

    return {
      climateNAV: totalClimateNAV,
      monteCarloNPV: totalMonteCarloNPV,
      recommendedValue: totalRecommendedValue,
      variance,
      variancePercentage,
      confidence: averageConfidence,
      reconciliationStatus,
      methodology: 'Hybrid (Climate NAV + Monte Carlo)',
      lastUpdated: new Date().toISOString()
    };
  }, [metrics]);

  // Analyze variance factors
  const analyzeVarianceFactors = (): VarianceFactors => {
    if (!reconciliationMetrics) {
      return {
        modelDifferences: [],
        dataQuality: [],
        assumptionDifferences: [],
        marketConditions: []
      };
    }

    const factors: VarianceFactors = {
      modelDifferences: [],
      dataQuality: [],
      assumptionDifferences: [],
      marketConditions: []
    };

    // Analyze variance based on percentage
    if (reconciliationMetrics.variancePercentage > 15) {
      factors.modelDifferences.push("Significant difference between DCF and climate-specific valuation approaches");
      factors.assumptionDifferences.push("Different discount rate assumptions between methodologies");
    }

    if (reconciliationMetrics.confidence < 0.8) {
      factors.dataQuality.push("Low confidence in input data affects both valuations");
      factors.dataQuality.push("Missing or outdated market data for carbon credits or LCOE");
    }

    if (reconciliationMetrics.variancePercentage > 20) {
      factors.marketConditions.push("Volatile market conditions affecting real-time pricing");
      factors.assumptionDifferences.push("PPA contract terms not fully reflected in Monte Carlo model");
    }

    if (metrics.some(m => m.riskLevel === 'HIGH' || m.riskLevel === 'CRITICAL')) {
      factors.assumptionDifferences.push("High-risk factors impact climate NAV more than DCF analysis");
    }

    return factors;
  };

  const varianceFactors = analyzeVarianceFactors();
  const portfolioPerformance = getPortfolioPerformance();
  const valuationAccuracy = getValuationAccuracy();

  // Get reconciliation status styling
  const getReconciliationStyle = (status: string) => {
    switch (status) {
      case 'ALIGNED':
        return { 
          variant: 'default' as const, 
          color: 'text-green-600', 
          bgColor: 'bg-green-50', 
          icon: CheckCircle,
          description: 'Valuations are well-aligned'
        };
      case 'MINOR_VARIANCE':
        return { 
          variant: 'secondary' as const, 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50', 
          icon: Info,
          description: 'Minor differences within acceptable range'
        };
      case 'HIGH_VARIANCE':
        return { 
          variant: 'destructive' as const, 
          color: 'text-yellow-600', 
          bgColor: 'bg-yellow-50', 
          icon: AlertTriangle,
          description: 'Significant variance requires review'
        };
      default:
        return { 
          variant: 'destructive' as const, 
          color: 'text-red-600', 
          bgColor: 'bg-red-50', 
          icon: XCircle,
          description: 'Major discrepancy needs investigation'
        };
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (receivableIds.length > 0) {
      await performIntegratedValuation(receivableIds, true);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 w-56 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-72 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !reconciliationMetrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Valuation Reconciliation
          </CardTitle>
          <CardDescription>Integrated valuation comparison and variance analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              {error ? `Error: ${error}` : 'No valuation data available for reconciliation'}
            </p>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={calculating || receivableIds.length === 0}
            >
              {calculating ? "Calculating..." : "Calculate Valuations"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const reconciliationStyle = getReconciliationStyle(reconciliationMetrics.reconciliationStatus);
  const ReconciliationIcon = reconciliationStyle.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Valuation Reconciliation
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={reconciliationStyle.variant} className="gap-1">
              <ReconciliationIcon className="h-3 w-3" />
              {reconciliationMetrics.reconciliationStatus.replace('_', ' ')}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={calculating}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${calculating ? 'animate-spin' : ''}`} />
              {calculating ? "Updating..." : "Refresh"}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Dual methodology comparison • {receivableIds.length} receivables analyzed
          • {(reconciliationMetrics.confidence * 100).toFixed(0)}% confidence
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="methodology">Methodology</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="space-y-4 mt-4">
            {/* Side-by-Side Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Climate NAV Methodology</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    ${reconciliationMetrics.climateNAV.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    LCOE + PPA + Carbon Credit analysis
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Climate NAV Components:</div>
                  <div className="text-xs space-y-1">
                    <div>• LCOE benchmarking and competitiveness analysis</div>
                    <div>• PPA contract evaluation and market comparison</div>
                    <div>• Carbon credit valuation with additionality premium</div>
                    <div>• Climate-specific risk adjustments</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Monte Carlo NPV</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    ${reconciliationMetrics.monteCarloNPV.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    10,000+ simulations with ML models
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Monte Carlo Components:</div>
                  <div className="text-xs space-y-1">
                    <div>• Statistical cash flow projections</div>
                    <div>• LSTM, CNN-LSTM, ARIMA ensemble models</div>
                    <div>• Probability distributions for key variables</div>
                    <div>• Stochastic interest rate modeling</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Variance Summary */}
            <div className={`p-4 rounded-lg ${reconciliationStyle.bgColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">Valuation Variance Analysis</span>
                </div>
                <Badge variant="outline">
                  {reconciliationMetrics.variancePercentage.toFixed(1)}% difference
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold">
                    ${reconciliationMetrics.variance.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Absolute Difference</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">
                    ${reconciliationMetrics.recommendedValue.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Recommended Value</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {(reconciliationMetrics.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Confidence Level</div>
                </div>
              </div>
              
              <Progress value={Math.min(reconciliationMetrics.variancePercentage, 100)} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Perfect Alignment</span>
                <span>5% Variance</span>
                <span>15% Variance</span>
                <span>25%+ Variance</span>
              </div>
            </div>

            {/* Reconciliation Status */}
            <Alert>
              <ReconciliationIcon className="h-4 w-4" />
              <AlertDescription>
                <strong>Status: {reconciliationMetrics.reconciliationStatus.replace('_', ' ')}</strong>
                <br />
                {reconciliationStyle.description}. 
                {reconciliationMetrics.variancePercentage <= 5 && " Both methodologies are providing consistent valuations."}
                {reconciliationMetrics.variancePercentage > 15 && " Review underlying assumptions and data sources."}
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="variance" className="space-y-4 mt-4">
            {/* Variance Factor Analysis */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold">
                    {reconciliationMetrics.variancePercentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Total Variance</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold">
                    {valuationAccuracy?.highVarianceCount || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">High Variance Items</div>
                </div>
              </div>

              {showDetailedAnalysis && (
                <div className="space-y-4">
                  {/* Model Differences */}
                  {varianceFactors.modelDifferences.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Model Differences
                      </h4>
                      <div className="space-y-1">
                        {varianceFactors.modelDifferences.map((factor, index) => (
                          <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <ArrowUpRight className="h-3 w-3 mt-0.5 text-blue-600" />
                            {factor}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Quality Issues */}
                  {varianceFactors.dataQuality.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Data Quality Factors
                      </h4>
                      <div className="space-y-1">
                        {varianceFactors.dataQuality.map((factor, index) => (
                          <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <ArrowDownRight className="h-3 w-3 mt-0.5 text-yellow-600" />
                            {factor}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assumption Differences */}
                  {varianceFactors.assumptionDifferences.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Assumption Differences
                      </h4>
                      <div className="space-y-1">
                        {varianceFactors.assumptionDifferences.map((factor, index) => (
                          <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <Info className="h-3 w-3 mt-0.5 text-purple-600" />
                            {factor}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Market Conditions */}
                  {varianceFactors.marketConditions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Market Conditions
                      </h4>
                      <div className="space-y-1">
                        {varianceFactors.marketConditions.map((factor, index) => (
                          <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <TrendingUp className="h-3 w-3 mt-0.5 text-green-600" />
                            {factor}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Variance Resolution Suggestions */}
              <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Variance Resolution Suggestions</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {reconciliationMetrics.variancePercentage > 20 && (
                    <>
                      <div>• Review and align discount rate assumptions between methodologies</div>
                      <div>• Validate carbon credit pricing and additionality assessments</div>
                    </>
                  )}
                  {reconciliationMetrics.confidence < 0.8 && (
                    <>
                      <div>• Update market data sources for LCOE and PPA benchmarks</div>
                      <div>• Improve data quality for production and financial projections</div>
                    </>
                  )}
                  <div>• Consider weighted average of both methodologies for final valuation</div>
                  <div>• Implement regular reconciliation reviews to maintain alignment</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4 mt-4">
            {/* Investment Recommendations */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold">
                    {metrics.filter(m => m.investmentRecommendation === 'BUY').length}
                  </div>
                  <div className="text-sm text-muted-foreground">BUY Recommendations</div>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold">
                    {metrics.filter(m => m.investmentRecommendation === 'SELL').length}
                  </div>
                  <div className="text-sm text-muted-foreground">SELL Recommendations</div>
                </div>
              </div>

              {/* Portfolio Recommendations */}
              {portfolioPerformance && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Portfolio Optimization Recommendations
                  </h4>
                  
                  <div className="space-y-2">
                    {portfolioPerformance.recommendedActions.map((action, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span className="text-sm">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valuation-Specific Recommendations */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Valuation Methodology Recommendations
                </h4>
                
                <div className="space-y-2">
                  {reconciliationMetrics.variancePercentage <= 5 && (
                    <div className="flex items-start gap-2 p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span className="text-sm">
                        Valuations are well-aligned. Use average of both methodologies for final pricing.
                      </span>
                    </div>
                  )}
                  
                  {reconciliationMetrics.variancePercentage > 15 && (
                    <div className="flex items-start gap-2 p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <span className="text-sm">
                        High variance detected. Investigate model assumptions and consider third-party valuation.
                      </span>
                    </div>
                  )}
                  
                  {reconciliationMetrics.confidence < 0.8 && (
                    <div className="flex items-start gap-2 p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                      <span className="text-sm">
                        Improve data quality and update market benchmarks to increase confidence levels.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Items */}
              <div className="p-3 border rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Immediate Action Items</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Schedule monthly reconciliation reviews to maintain valuation alignment</div>
                  <div>• Implement automated alerts for variances exceeding 15%</div>
                  <div>• Establish data quality standards for external API integrations</div>
                  <div>• Create documentation for methodology differences and their impact</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="methodology" className="space-y-4 mt-4">
            {/* Methodology Comparison */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold mb-2">Climate NAV Methodology</div>
                  <div className="text-sm space-y-1">
                    <div><strong>Approach:</strong> Industry-specific valuation</div>
                    <div><strong>Strengths:</strong> Climate expertise, market context</div>
                    <div><strong>Data Sources:</strong> LCOE benchmarks, PPA markets, carbon registries</div>
                    <div><strong>Risk Factors:</strong> Technology, regulatory, market-specific</div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold mb-2">Monte Carlo NPV</div>
                  <div className="text-sm space-y-1">
                    <div><strong>Approach:</strong> Statistical cash flow modeling</div>
                    <div><strong>Strengths:</strong> Probabilistic, ML-enhanced</div>
                    <div><strong>Data Sources:</strong> Historical performance, market data</div>
                    <div><strong>Risk Factors:</strong> Financial, operational, systematic</div>
                  </div>
                </div>
              </div>

              {/* Methodology Scoring */}
              <div className="space-y-3">
                <h4 className="font-semibold">Methodology Assessment</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Accuracy & Reliability</span>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="w-24 h-2" />
                      <span className="text-sm">85%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Market Relevance</span>
                    <div className="flex items-center gap-2">
                      <Progress value={92} className="w-24 h-2" />
                      <span className="text-sm">92%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Quality</span>
                    <div className="flex items-center gap-2">
                      <Progress value={78} className="w-24 h-2" />
                      <span className="text-sm">78%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Implementation Complexity</span>
                    <div className="flex items-center gap-2">
                      <Progress value={65} className="w-24 h-2" />
                      <span className="text-sm">Medium</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Best Practices */}
              <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Valuation Best Practices</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Use both methodologies for cross-validation and improved accuracy</div>
                  <div>• Weight final valuation based on data quality and market conditions</div>
                  <div>• Document assumptions and regularly update market benchmarks</div>
                  <div>• Implement sensitivity analysis for key variables in both models</div>
                  <div>• Maintain audit trail for regulatory compliance and investor transparency</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default IntegratedValuationReconciliationView;