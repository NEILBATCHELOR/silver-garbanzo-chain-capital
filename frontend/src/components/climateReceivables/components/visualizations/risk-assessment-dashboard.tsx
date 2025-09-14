import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ZAxis,
  BarChart,
  Bar
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { supabase } from "@/infrastructure/database/client";
import { ClimateReceivable, ClimateRiskFactor, RiskLevel } from "../../types";
import type { ClimateRiskLevel } from "@/types/domain/climate/receivables";
import { FreeMarketDataService } from "../../../../services/climateReceivables/freeMarketDataService";
import { UserDataSourceService } from "../../../../services/climateReceivables/userDataSourceService";
import type { 
  MarketDataSnapshot,
  PolicyChange 
} from "../../../../services/climateReceivables/freeMarketDataService";
import type { UserDataSource } from "../../../../services/climateReceivables/userDataSourceService";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, Database, Wifi } from "lucide-react";

interface RiskAssessmentDashboardProps {
  // Remove projectId as it doesn't exist in our schema
}

interface MarketDataIndicator {
  type: 'treasury' | 'credit' | 'energy' | 'policy';
  current_value: number;
  trend: 'up' | 'down' | 'stable';
  impact_on_risk: 'increase' | 'decrease' | 'neutral';
  confidence: number;
}

interface DataQualityMetrics {
  user_data_sources: number;
  market_data_freshness: number;
  coverage_percentage: number;
  confidence_boost: number;
}

/**
 * Component for visualizing risk assessment data
 */
const RiskAssessmentDashboard: React.FC<RiskAssessmentDashboardProps> = () => {
  const [receivables, setReceivables] = useState<ClimateReceivable[]>([]);
  const [riskFactors, setRiskFactors] = useState<ClimateRiskFactor[]>([]);
  const [marketData, setMarketData] = useState<MarketDataSnapshot | null>(null);
  const [userDataSources, setUserDataSources] = useState<UserDataSource[]>([]);
  const [policyAlerts, setPolicyAlerts] = useState<PolicyChange[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [riskProfileFilter, setRiskProfileFilter] = useState<ClimateRiskLevel | "">("");

  // Color constants
  const COLORS = ["#4CAF50", "#FFC107", "#F44336", "#9C27B0"];
  const RISK_COLORS = {
    "LOW": "#4CAF50",
    "MEDIUM": "#FFC107",
    "HIGH": "#F44336"
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
    fetchMarketData();
    fetchUserDataSources();
  }, []);

  /**
   * Fetch receivables and risk factors data
   */
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch receivables
      const { data: receivablesData, error: receivablesError } = await supabase
        .from("climate_receivables")
        .select("*");

      if (receivablesError) throw receivablesError;

      // Fetch risk factors
      const { data: riskFactorsData, error: riskFactorsError } = await supabase
        .from("climate_risk_factors")
        .select("*");

      if (riskFactorsError) throw riskFactorsError;

      // Transform data to match our frontend types
      const transformedReceivables = receivablesData?.map(item => ({
        receivableId: item.receivable_id,
        assetId: item.asset_id,
        payerId: item.payer_id,
        amount: item.amount,
        dueDate: item.due_date,
        riskScore: item.risk_score,
        discountRate: item.discount_rate,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })) || [];

      const transformedRiskFactors = riskFactorsData?.map(item => ({
        factorId: item.factor_id,
        receivableId: item.receivable_id,
        productionRisk: item.production_risk,
        creditRisk: item.credit_risk,
        policyRisk: item.policy_risk,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })) || [];

      setReceivables(transformedReceivables);
      setRiskFactors(transformedRiskFactors);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch market data for enhanced risk assessment indicators
   */
  const fetchMarketData = async () => {
    try {
      const marketDataSnapshot = await FreeMarketDataService.getMarketDataSnapshot();
      setMarketData(marketDataSnapshot);
      
      // Extract policy alerts that affect risk
      const relevantPolicyChanges = marketDataSnapshot.policy_changes.filter(
        policy => policy.impact_on_receivables !== 0
      );
      setPolicyAlerts(relevantPolicyChanges);
    } catch (err) {
      console.error("Failed to fetch market data:", err);
      // Don't set error for market data failure - it's supplementary
    }
  };

  /**
   * Fetch user data sources for data quality reporting
   */
  const fetchUserDataSources = async () => {
    try {
      const dataSources = await UserDataSourceService.getUserDataSources();
      setUserDataSources(dataSources);
    } catch (err) {
      console.error("Failed to fetch user data sources:", err);
      // Don't set error for user data failure - it's supplementary
    }
  };

  /**
   * Get risk level based on risk score
   */
  const getRiskLevel = (riskScore: number): ClimateRiskLevel => {
    if (riskScore <= 30) return "LOW";
    if (riskScore <= 70) return "MEDIUM";
    return "HIGH";
  };

  /**
   * Calculate data for risk distribution pie chart
   */
  const getRiskDistributionData = () => {
    const distribution = {
      "LOW": 0,
      "MEDIUM": 0,
      "HIGH": 0
    };

    receivables.forEach(receivable => {
      if (receivable.riskScore !== undefined) {
        const riskLevel = getRiskLevel(receivable.riskScore);
        distribution[riskLevel] += 1;
      }
    });

    return Object.entries(distribution).map(([riskLevel, count]) => ({
      name: riskLevel,
      value: count
    }));
  };

  /**
   * Calculate data for risk value chart
   */
  const getRiskValueData = () => {
    const distribution = {
      "LOW": 0,
      "MEDIUM": 0,
      "HIGH": 0
    };

    receivables.forEach(receivable => {
      if (receivable.riskScore !== undefined) {
        const riskLevel = getRiskLevel(receivable.riskScore);
        distribution[riskLevel] += receivable.amount;
      }
    });

    return Object.entries(distribution).map(([riskLevel, value]) => ({
      name: riskLevel,
      value
    }));
  };

  /**
   * Calculate data for risk factors radar chart
   */
  const getRiskFactorsRadarData = () => {
    if (riskFactors.length === 0) return [];

    // Calculate average risk factors
    let totalProductionRisk = 0;
    let totalCreditRisk = 0;
    let totalPolicyRisk = 0;
    let count = 0;

    riskFactors.forEach(factor => {
      if (factor.productionRisk !== undefined && 
          factor.creditRisk !== undefined && 
          factor.policyRisk !== undefined) {
        totalProductionRisk += factor.productionRisk;
        totalCreditRisk += factor.creditRisk;
        totalPolicyRisk += factor.policyRisk;
        count += 1;
      }
    });

    if (count === 0) return [];

    return [
      {
        subject: "Production Risk",
        A: totalProductionRisk / count,
        fullMark: 100
      },
      {
        subject: "Credit Risk",
        A: totalCreditRisk / count,
        fullMark: 100
      },
      {
        subject: "Policy Risk",
        A: totalPolicyRisk / count,
        fullMark: 100
      }
    ];
  };

  /**
   * Calculate data for risk-amount scatter plot
   */
  const getRiskAmountScatterData = () => {
    return receivables
      .filter(receivable => receivable.riskScore !== undefined)
      .map(receivable => ({
        x: receivable.riskScore,
        y: receivable.amount,
        z: receivable.discountRate || 0,
        name: `Receivable ${receivable.receivableId.slice(0, 8)}...`,
        riskLevel: getRiskLevel(receivable.riskScore || 0)
      }));
  };

  /**
   * Calculate data for risk bucket chart
   */
  const getRiskBucketData = () => {
    const buckets = [
      { range: "0-10", count: 0 },
      { range: "11-20", count: 0 },
      { range: "21-30", count: 0 },
      { range: "31-40", count: 0 },
      { range: "41-50", count: 0 },
      { range: "51-60", count: 0 },
      { range: "61-70", count: 0 },
      { range: "71-80", count: 0 },
      { range: "81-90", count: 0 },
      { range: "91-100", count: 0 }
    ];

    receivables.forEach(receivable => {
      if (receivable.riskScore !== undefined) {
        const bucketIndex = Math.min(9, Math.floor(receivable.riskScore / 10));
        buckets[bucketIndex].count += 1;
      }
    });

    return buckets;
  };

  /**
   * Format currency values for tooltip
   */
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  /**
   * Custom tooltip for pie charts
   */
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p>Count: {data.value}</p>
          <p>
            {((data.value / receivables.length) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Custom tooltip for value pie chart
   */
  const CustomValueTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalValue = receivables.reduce((sum, r) => sum + r.amount, 0);
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p>Value: {formatCurrency(data.value)}</p>
          <p>
            {((data.value / totalValue) * 100).toFixed(1)}% of total value
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Custom tooltip for scatter plot
   */
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p>Risk Score: {data.x}</p>
          <p>Amount: {formatCurrency(data.y)}</p>
          <p>Discount Rate: {(data.z * 100).toFixed(2)}%</p>
          <p>Risk Level: {data.riskLevel}</p>
        </div>
      );
    }
    return null;
  };

  /**
   * Calculate market data indicators
   */
  const getMarketDataIndicators = (): MarketDataIndicator[] => {
    if (!marketData) return [];

    const indicators: MarketDataIndicator[] = [];

    // Treasury rate indicator
    if (marketData.treasury_rates) {
      const treasury10Y = marketData.treasury_rates.treasury_10y;
      indicators.push({
        type: 'treasury',
        current_value: treasury10Y,
        trend: treasury10Y > 3.0 ? 'up' : treasury10Y < 2.5 ? 'down' : 'stable',
        impact_on_risk: treasury10Y > 3.5 ? 'increase' : 'neutral',
        confidence: 95
      });
    }

    // Credit spread indicator
    if (marketData.credit_spreads) {
      const igSpread = marketData.credit_spreads.investment_grade;
      indicators.push({
        type: 'credit',
        current_value: igSpread,
        trend: igSpread > 200 ? 'up' : igSpread < 120 ? 'down' : 'stable',
        impact_on_risk: igSpread > 250 ? 'increase' : 'neutral',
        confidence: 90
      });
    }

    // Energy price indicator
    if (marketData.energy_prices) {
      const energyPrice = marketData.energy_prices.electricity_price_mwh;
      indicators.push({
        type: 'energy',
        current_value: energyPrice,
        trend: energyPrice > 40 ? 'up' : energyPrice < 30 ? 'down' : 'stable',
        impact_on_risk: energyPrice < 25 ? 'increase' : 'neutral', // Low prices hurt renewables
        confidence: 85
      });
    }

    return indicators;
  };

  /**
   * Calculate data quality metrics
   */
  const getDataQualityMetrics = (): DataQualityMetrics => {
    const activeUserSources = userDataSources.filter(source => source.is_active).length;
    const marketDataAge = marketData ? 
      Math.max(0, 24 - Math.floor((Date.now() - new Date(marketData.data_freshness).getTime()) / (1000 * 60 * 60))) : 0;
    
    const coveragePercentage = Math.min(100, 
      (receivables.length > 0 ? (receivables.filter(r => r.riskScore !== undefined).length / receivables.length * 100) : 0)
    );
    
    const confidenceBoost = Math.min(20, 
      (activeUserSources * 5) + (marketData ? 10 : 0) + (policyAlerts.length > 0 ? 5 : 0)
    );

    return {
      user_data_sources: activeUserSources,
      market_data_freshness: marketDataAge,
      coverage_percentage: coveragePercentage,
      confidence_boost: confidenceBoost
    };
  };

  /**
   * Get trend icon component
   */
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-600" />;
      default: return <span className="h-3 w-3 inline-block" />;
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading risk assessment data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Risk Assessment Dashboard</h2>
          <p className="text-sm text-muted-foreground">Climate Receivables Risk Analysis</p>
        </div>
        <Button onClick={fetchData}>Refresh Data</Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receivables.length}</div>
            <div className="flex items-center gap-2 mt-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">
                {getDataQualityMetrics().user_data_sources} user sources active
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Value at Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(receivables.reduce((sum, r) => sum + r.amount, 0))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Wifi className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">
                Market data: {marketData ? 'Live' : 'Offline'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Average Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {receivables.length > 0
                ? (
                    receivables.reduce(
                      (sum, r) => sum + (r.riskScore || 0),
                      0
                    ) / receivables.length
                  ).toFixed(1)
                : "N/A"}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                +{getDataQualityMetrics().confidence_boost}% confidence
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Data Integration Panel */}
      {marketData && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Market Data Impact Analysis
            </CardTitle>
            <CardDescription>
              Real-time market conditions affecting risk assessments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {getMarketDataIndicators().map((indicator, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div>
                    <div className="font-medium capitalize">
                      {indicator.type === 'treasury' ? 'Treasury 10Y' :
                       indicator.type === 'credit' ? 'Credit Spreads' :
                       indicator.type === 'energy' ? 'Energy Prices' : 'Policy Risk'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {indicator.type === 'treasury' ? `${indicator.current_value.toFixed(2)}%` :
                       indicator.type === 'credit' ? `${indicator.current_value}bps` :
                       indicator.type === 'energy' ? `${indicator.current_value}/MWh` : 
                       `${indicator.current_value}% impact`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(indicator.trend)}
                    <Badge 
                      variant={indicator.impact_on_risk === 'increase' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {indicator.impact_on_risk}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policy Alerts Panel */}
      {policyAlerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Recent Policy Changes
            </CardTitle>
            <CardDescription>
              Policy changes affecting renewable energy receivables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {policyAlerts.slice(0, 3).map((policy, index) => (
                <div key={index} className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{policy.title}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {policy.summary.slice(0, 100)}...
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Effective: {new Date(policy.effective_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-1">
                    <Badge 
                      variant={policy.impact_level === 'high' || policy.impact_level === 'critical' ? 'destructive' : 
                              policy.impact_level === 'medium' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {policy.impact_level}
                    </Badge>
                    <span className={`text-xs ${
                      policy.impact_on_receivables > 0 ? 'text-green-600' : 
                      policy.impact_on_receivables < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {policy.impact_on_receivables > 0 ? '+' : ''}{(policy.impact_on_receivables * 100).toFixed(1)}% impact
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {policyAlerts.length > 3 && (
              <div className="text-center mt-3">
                <Button variant="outline" size="sm">
                  View {policyAlerts.length - 3} more policy changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="distribution" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="distribution">Risk Distribution</TabsTrigger>
          <TabsTrigger value="factors">Risk Factors</TabsTrigger>
          <TabsTrigger value="analysis">Risk-Amount Analysis</TabsTrigger>
          <TabsTrigger value="data-quality">Data Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Distribution</CardTitle>
                <CardDescription>
                  Distribution of receivables by risk level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getRiskDistributionData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {getRiskDistributionData().map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={RISK_COLORS[entry.name as RiskLevel] || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Value at Risk Distribution</CardTitle>
                <CardDescription>
                  Distribution of value by risk level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getRiskValueData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {getRiskValueData().map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={RISK_COLORS[entry.name as RiskLevel] || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomValueTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Risk Score Distribution</CardTitle>
                <CardDescription>
                  Distribution of receivables by risk score range
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getRiskBucketData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="count"
                        name="Number of Receivables"
                        fill="#8884d8"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="factors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Factor Analysis</CardTitle>
                <CardDescription>
                  Breakdown of different risk factor contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={90} data={getRiskFactorsRadarData()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="Average Risk Factors"
                        dataKey="A"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Factor Details</CardTitle>
                <CardDescription>
                  Detailed information about risk factors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {riskFactors.length > 0 ? (
                  <>
                    <div>
                      <h3 className="font-medium">Production Risk</h3>
                      <p className="text-sm text-muted-foreground">
                        Average:{" "}
                        {(
                          riskFactors.reduce(
                            (sum, f) => sum + (f.productionRisk || 0),
                            0
                          ) / riskFactors.length
                        ).toFixed(1)}
                        %
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Affected by weather, equipment reliability, and energy source
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium">Credit Risk</h3>
                      <p className="text-sm text-muted-foreground">
                        Average:{" "}
                        {(
                          riskFactors.reduce(
                            (sum, f) => sum + (f.creditRisk || 0),
                            0
                          ) / riskFactors.length
                        ).toFixed(1)}
                        %
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Affected by payer financial health and payment history
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium">Policy Risk</h3>
                      <p className="text-sm text-muted-foreground">
                        Average:{" "}
                        {(
                          riskFactors.reduce(
                            (sum, f) => sum + (f.policyRisk || 0),
                            0
                          ) / riskFactors.length
                        ).toFixed(1)}
                        %
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Affected by regulatory changes, subsidies, and political climate
                      </p>
                    </div>
                  </>
                ) : (
                  <p>No risk factor data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Risk vs. Amount Analysis</CardTitle>
              <CardDescription>
                Scatter plot showing the relationship between risk score and receivable amount
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Risk Score"
                      domain={[0, 100]}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Amount"
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <ZAxis
                      type="number"
                      dataKey="z"
                      range={[50, 400]}
                      name="Discount Rate"
                    />
                    <Tooltip content={<CustomScatterTooltip />} />
                    <Legend />
                    {["LOW", "MEDIUM", "HIGH"].map(
                      (riskLevel) => (
                        <Scatter
                          key={riskLevel}
                          name={`${riskLevel} Risk`}
                          data={getRiskAmountScatterData().filter(
                            (item) => item.riskLevel === riskLevel
                          )}
                          fill={RISK_COLORS[riskLevel]}
                        />
                      )
                    )}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Quality Tab */}
        <TabsContent value="data-quality">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Source Overview</CardTitle>
                <CardDescription>
                  Active data sources enhancing risk assessments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Market Data Sources */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Wifi className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">Market Data APIs</div>
                        <div className="text-sm text-gray-600">
                          Treasury.gov, FRED, EIA, Federal Register
                        </div>
                      </div>
                    </div>
                    <Badge variant={marketData ? "default" : "secondary"}>
                      {marketData ? "Active" : "Offline"}
                    </Badge>
                  </div>
                  
                  {/* User Data Sources */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">User Data Sources</div>
                        <div className="text-sm text-gray-600">
                          Credit reports, financial statements, custom data
                        </div>
                      </div>
                    </div>
                    <Badge variant={userDataSources.length > 0 ? "default" : "secondary"}>
                      {userDataSources.filter(source => source.is_active).length} Active
                    </Badge>
                  </div>
                  
                  {/* Policy Monitoring */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <div className="font-medium">Policy Monitoring</div>
                        <div className="text-sm text-gray-600">
                          Federal Register, Congress.gov tracking
                        </div>
                      </div>
                    </div>
                    <Badge variant={policyAlerts.length > 0 ? "destructive" : "secondary"}>
                      {policyAlerts.length} Active Alerts
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Quality Metrics</CardTitle>
                <CardDescription>
                  Quality and completeness indicators for risk assessments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Coverage Percentage */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Risk Assessment Coverage</span>
                      <span className="text-sm font-bold">
                        {getDataQualityMetrics().coverage_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{width: `${getDataQualityMetrics().coverage_percentage}%`}}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Data Freshness */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Market Data Freshness</span>
                      <span className="text-sm font-bold">
                        {getDataQualityMetrics().market_data_freshness}h ago
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          getDataQualityMetrics().market_data_freshness > 12 ? 'bg-red-600' :
                          getDataQualityMetrics().market_data_freshness > 6 ? 'bg-yellow-600' : 'bg-green-600'
                        }`}
                        style={{width: `${Math.max(10, 100 - (getDataQualityMetrics().market_data_freshness * 4))}%`}}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Confidence Boost */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Confidence Enhancement</span>
                      <span className="text-sm font-bold">
                        +{getDataQualityMetrics().confidence_boost}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{width: `${(getDataQualityMetrics().confidence_boost / 20) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                  
                  {/* User Data Sources Count */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">User Data Sources</span>
                      <span className="text-sm font-bold">
                        {getDataQualityMetrics().user_data_sources} active
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{width: `${Math.min(100, (getDataQualityMetrics().user_data_sources / 5) * 100)}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Quality Recommendations */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Data Quality Recommendations</CardTitle>
                <CardDescription>
                  Suggestions to improve risk assessment accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {getDataQualityMetrics().user_data_sources === 0 && (
                    <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
                      <div className="font-medium text-blue-800 dark:text-blue-200">
                        Upload Credit Data
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                        Upload payer credit reports to improve risk assessment accuracy by up to 15%
                      </div>
                    </div>
                  )}
                  
                  {!marketData && (
                    <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                      <div className="font-medium text-yellow-800 dark:text-yellow-200">
                        Enable Market Data
                      </div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
                        Connect to free market APIs for real-time risk adjustments
                      </div>
                    </div>
                  )}
                  
                  {getDataQualityMetrics().coverage_percentage < 90 && (
                    <div className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-950">
                      <div className="font-medium text-red-800 dark:text-red-200">
                        Incomplete Coverage
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-300 mt-1">
                        {((100 - getDataQualityMetrics().coverage_percentage) / 100 * receivables.length).toFixed(0)} receivables missing risk scores
                      </div>
                    </div>
                  )}
                  
                  {getDataQualityMetrics().market_data_freshness > 12 && (
                    <div className="p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
                      <div className="font-medium text-orange-800 dark:text-orange-200">
                        Stale Market Data
                      </div>
                      <div className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                        Market data is {getDataQualityMetrics().market_data_freshness}h old. Refresh for current conditions.
                      </div>
                    </div>
                  )}
                  
                  {getDataQualityMetrics().confidence_boost >= 15 && (
                    <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950">
                      <div className="font-medium text-green-800 dark:text-green-200">
                        Excellent Data Quality
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-300 mt-1">
                        High-confidence risk assessments with comprehensive data coverage
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskAssessmentDashboard;