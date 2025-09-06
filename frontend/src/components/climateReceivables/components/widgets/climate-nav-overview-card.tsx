import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  DollarSign, 
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useIntegratedClimateValuation } from "../../hooks/useIntegratedClimateValuation";

interface ClimateNAVOverviewCardProps {
  receivableIds: string[];
  className?: string;
  showPortfolioSummary?: boolean;
}

interface ClimateNAVMetrics {
  climateNAV: number;
  monteCarloNAV: number;
  variance: number;
  variancePercentage: number;
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  confidence: number;
  targetPrice: number;
  totalPortfolioValue: number;
  reconciliationStatus: 'ALIGNED' | 'HIGH_VARIANCE' | 'NEEDS_REVIEW';
}

/**
 * Climate NAV Overview Card Component
 * 
 * Displays comprehensive climate NAV metrics including:
 * - Dual valuation comparison (Climate NAV vs Monte Carlo)
 * - Investment recommendations with confidence levels
 * - Variance analysis and reconciliation status
 * - Portfolio-level aggregation when multiple receivables
 */
const ClimateNAVOverviewCard: React.FC<ClimateNAVOverviewCardProps> = ({
  receivableIds,
  className = "",
  showPortfolioSummary = true
}) => {
  const {
    metrics,
    portfolioSummary,
    loading,
    calculating,
    error,
    totalPortfolioValue,
    getPortfolioPerformance,
    performIntegratedValuation
  } = useIntegratedClimateValuation({
    receivableIds,
    autoRefresh: true,
    enableStressTesting: true,
    enableMLModels: true
  });

  // Calculate aggregated metrics
  const aggregatedMetrics: ClimateNAVMetrics | null = React.useMemo(() => {
    if (metrics.length === 0) return null;

    const totalClimateNAV = metrics.reduce((sum, m) => sum + m.climateNAV, 0);
    const totalMonteCarloNAV = metrics.reduce((sum, m) => sum + m.cashFlowNPV, 0);
    const variance = Math.abs(totalClimateNAV - totalMonteCarloNAV);
    const variancePercentage = (variance / Math.max(totalClimateNAV, totalMonteCarloNAV)) * 100;
    
    // Determine overall recommendation based on majority
    const recommendations = metrics.map(m => m.investmentRecommendation);
    const recommendationCounts = recommendations.reduce((acc, rec) => {
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const majorityRecommendation = Object.entries(recommendationCounts)
      .reduce((a, b) => recommendationCounts[a[0]] > recommendationCounts[b[0]] ? a : b)[0] as 'BUY' | 'HOLD' | 'SELL';
    
    const averageConfidence = metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length;
    const averageTarget = metrics.reduce((sum, m) => sum + m.recommendedValue, 0) / metrics.length;
    
    // Determine reconciliation status
    let reconciliationStatus: 'ALIGNED' | 'HIGH_VARIANCE' | 'NEEDS_REVIEW' = 'ALIGNED';
    if (variancePercentage > 20) {
      reconciliationStatus = 'HIGH_VARIANCE';
    } else if (variancePercentage > 10) {
      reconciliationStatus = 'NEEDS_REVIEW';
    }

    return {
      climateNAV: totalClimateNAV,
      monteCarloNAV: totalMonteCarloNAV,
      variance,
      variancePercentage,
      recommendation: majorityRecommendation,
      confidence: averageConfidence,
      targetPrice: averageTarget,
      totalPortfolioValue,
      reconciliationStatus
    };
  }, [metrics, totalPortfolioValue]);

  const portfolioPerformance = getPortfolioPerformance();

  // Get recommendation styling
  const getRecommendationStyle = (recommendation: string) => {
    switch (recommendation) {
      case 'BUY':
        return { variant: 'default' as const, color: 'text-green-600', icon: TrendingUp };
      case 'SELL':
        return { variant: 'destructive' as const, color: 'text-red-600', icon: TrendingDown };
      default:
        return { variant: 'secondary' as const, color: 'text-yellow-600', icon: ArrowRight };
    }
  };

  // Get reconciliation status styling
  const getReconciliationStyle = (status: string) => {
    switch (status) {
      case 'ALIGNED':
        return { variant: 'default' as const, color: 'text-green-600', icon: CheckCircle };
      case 'HIGH_VARIANCE':
        return { variant: 'destructive' as const, color: 'text-red-600', icon: AlertTriangle };
      default:
        return { variant: 'secondary' as const, color: 'text-yellow-600', icon: AlertTriangle };
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Climate NAV Error
          </CardTitle>
          <CardDescription>Failed to load valuation data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => performIntegratedValuation(receivableIds)}
            disabled={calculating}
          >
            Retry Calculation
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!aggregatedMetrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Climate NAV Overview
          </CardTitle>
          <CardDescription>Comprehensive valuation analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">No valuation data available</p>
            <Button 
              onClick={() => performIntegratedValuation(receivableIds)}
              disabled={calculating || receivableIds.length === 0}
            >
              {calculating ? "Calculating..." : "Calculate NAV"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recommendationStyle = getRecommendationStyle(aggregatedMetrics.recommendation);
  const reconciliationStyle = getReconciliationStyle(aggregatedMetrics.reconciliationStatus);
  const RecommendationIcon = recommendationStyle.icon;
  const ReconciliationIcon = reconciliationStyle.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Climate NAV Overview
          </div>
          <Badge variant={recommendationStyle.variant} className="gap-1">
            <RecommendationIcon className="h-3 w-3" />
            {aggregatedMetrics.recommendation}
          </Badge>
        </CardTitle>
        <CardDescription>
          Integrated valuation analysis for {receivableIds.length} receivable{receivableIds.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dual Valuation Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Climate NAV</span>
              <Badge variant="outline" className="text-xs">LCOE + PPA + Carbon</Badge>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              ${aggregatedMetrics.climateNAV.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Institutional-grade climate valuation
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Monte Carlo NPV</span>
              <Badge variant="outline" className="text-xs">10K+ Simulations</Badge>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              ${aggregatedMetrics.monteCarloNAV.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Statistical cash flow analysis
            </div>
          </div>
        </div>

        {/* Variance Analysis */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Valuation Variance</span>
            <Badge variant={reconciliationStyle.variant} className="gap-1">
              <ReconciliationIcon className="h-3 w-3" />
              {aggregatedMetrics.reconciliationStatus.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Absolute Difference</span>
              <span className="text-sm font-medium">
                ${aggregatedMetrics.variance.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={Math.min(aggregatedMetrics.variancePercentage, 100)} 
              className="h-2"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Variance Percentage</span>
              <span className={`text-xs font-medium ${
                aggregatedMetrics.variancePercentage > 20 ? 'text-red-600' : 
                aggregatedMetrics.variancePercentage > 10 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {aggregatedMetrics.variancePercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Investment Recommendation */}
        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Investment Recommendation</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <span className="text-sm font-semibold">
                {(aggregatedMetrics.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Current Value</div>
              <div className="text-lg font-bold">
                ${aggregatedMetrics.totalPortfolioValue.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Target Price</div>
              <div className="text-lg font-bold text-green-600">
                ${aggregatedMetrics.targetPrice.toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {aggregatedMetrics.recommendation === 'BUY' && 
                  `Upside potential: ${((aggregatedMetrics.targetPrice / aggregatedMetrics.totalPortfolioValue - 1) * 100).toFixed(1)}%`}
                {aggregatedMetrics.recommendation === 'SELL' && 
                  `Consider divestment due to risk factors`}
                {aggregatedMetrics.recommendation === 'HOLD' && 
                  `Monitor performance and market conditions`}
              </span>
            </div>
          </div>
        </div>

        {/* Portfolio Summary (if enabled and multiple receivables) */}
        {showPortfolioSummary && portfolioPerformance && receivableIds.length > 1 && (
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Portfolio Performance</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Diversification</div>
                <div className="text-sm font-semibold">
                  {(portfolioPerformance.diversificationBenefit * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Asset Selection</div>
                <div className="text-sm font-semibold text-green-600">
                  +{(portfolioPerformance.performanceAttribution.assetSelection * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Alpha</div>
                <div className="text-sm font-semibold text-blue-600">
                  {portfolioPerformance.performanceAttribution.totalAlpha > 0 ? '+' : ''}
                  {(portfolioPerformance.performanceAttribution.totalAlpha * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            
            {portfolioPerformance.recommendedActions.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-1">Recommended Actions:</div>
                <div className="text-xs">
                  {portfolioPerformance.recommendedActions[0]}
                  {portfolioPerformance.recommendedActions.length > 1 && 
                    ` (+${portfolioPerformance.recommendedActions.length - 1} more)`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => performIntegratedValuation(receivableIds, true)}
            disabled={calculating}
            className="flex-1"
          >
            {calculating ? "Recalculating..." : "Refresh Valuation"}
          </Button>
          {aggregatedMetrics.variancePercentage > 10 && (
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1"
            >
              Investigate Variance
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClimateNAVOverviewCard;