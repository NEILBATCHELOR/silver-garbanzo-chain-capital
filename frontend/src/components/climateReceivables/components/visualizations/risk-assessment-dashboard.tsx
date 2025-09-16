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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { supabase } from "@/infrastructure/database/client";
import { ClimateReceivable, ClimateRiskFactor, RiskLevel } from "../../types";
import type { ClimateRiskLevel } from "@/types/domain/climate/receivables";
import { FreeMarketDataService } from "../../../../services/climateReceivables/freeMarketDataService";
import { UserDataSourceService } from "../../../../services/climateReceivables/userDataSourceService";
import { PolicyRiskTrackingService } from "../../services/api/policy-risk-tracking-service";
import type { 
  MarketDataSnapshot,
  PolicyChange 
} from "../../../../services/climateReceivables/freeMarketDataService";
import type { UserDataSource } from "../../../../services/climateReceivables/userDataSourceService";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, Database, Wifi, ChevronDown, ChevronUp, FileText, Calendar, Clock, CheckCircle2, XCircle, Info } from "lucide-react";
import { RISK_COLORS, CHART_COLOR_SEQUENCES, CHART_STYLES, withOpacity } from "../../constants/chart-colors";

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

// Enhanced policy types from Policy Timeline
interface PolicyTimelineEvent {
  id: string;
  date: string;
  title: string;
  summary: string;
  description: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  policyType: 'regulation' | 'tax_credit' | 'renewable_standard' | 'carbon_pricing' | 'trade_policy' | 'other';
  source: 'federal_register' | 'congress_gov' | 'regulatory_news' | 'industry_alert';
  affectedSectors: string[];
  regions: string[];
  url?: string;
  effectiveDate?: string;
  deadline?: string;
  alertType: string;
  affectedAssets: number;
  affectedReceivables: number;
  recommendedActions: string[];
  resolved: boolean;
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
  
  // Enhanced policy state
  const [policyEvents, setPolicyEvents] = useState<PolicyTimelineEvent[]>([]);
  const [policyLoading, setPolicyLoading] = useState<boolean>(false);
  const [expandedPolicyDescriptions, setExpandedPolicyDescriptions] = useState<Set<string>>(new Set());
  const [selectedPolicyEvent, setSelectedPolicyEvent] = useState<PolicyTimelineEvent | null>(null);
  const [policyDetailsModalOpen, setPolicyDetailsModalOpen] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
    fetchMarketData();
    fetchUserDataSources();
    loadEnhancedPolicyData();
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
   * Load enhanced policy data using PolicyRiskTrackingService (mirrors Policy Timeline)
   */
  const loadEnhancedPolicyData = async () => {
    try {
      setPolicyLoading(true);
      console.log('Risk Dashboard: Loading enhanced policy data from government APIs');

      // Get real policy alerts from live APIs (Federal Register, GovInfo, LegiScan)
      const realAlerts = await PolicyRiskTrackingService.monitorRegulatoryChanges(['federal']);
      console.log(`Risk Dashboard: Received ${realAlerts.length} real policy alerts`);

      // Transform alerts to timeline event format
      const transformedEvents = realAlerts.map(transformPolicyAlertToTimelineEvent);

      // Filter to show only most recent and high-impact events
      const filteredEvents = transformedEvents
        .filter(event => event.impactLevel === 'high' || event.impactLevel === 'critical')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5); // Show top 5 most important recent policy changes

      setPolicyEvents(filteredEvents);
      console.log(`Risk Dashboard: Displaying ${filteredEvents.length} high-impact policy events`);

    } catch (err) {
      console.error('Risk Dashboard: Error loading enhanced policy data:', err);
      setPolicyEvents([]); // No fallback data - show empty state if APIs fail
    } finally {
      setPolicyLoading(false);
    }
  };

  /**
   * Transform PolicyAlert to PolicyTimelineEvent format (from Policy Timeline)
   */
  const transformPolicyAlertToTimelineEvent = (alert: any): PolicyTimelineEvent => {
    // Map alert source based on policyId patterns
    let source: PolicyTimelineEvent['source'] = 'regulatory_news';
    if (alert.policyId?.includes('federal_register')) source = 'federal_register';
    if (alert.policyId?.includes('govinfo')) source = 'congress_gov';
    if (alert.policyId?.includes('legiscan')) source = 'industry_alert';

    // Infer policy type from title/description content
    const title = alert.title?.toLowerCase() || '';
    let policyType: PolicyTimelineEvent['policyType'] = 'other';
    if (title.includes('tax credit') || title.includes('itc') || title.includes('ptc')) policyType = 'tax_credit';
    if (title.includes('renewable portfolio') || title.includes('rps') || title.includes('standard')) policyType = 'renewable_standard';
    if (title.includes('carbon') || title.includes('emission') || title.includes('cap and trade')) policyType = 'carbon_pricing';
    if (title.includes('regulation') || title.includes('rule') || title.includes('requirement')) policyType = 'regulation';
    if (title.includes('tariff') || title.includes('trade') || title.includes('import')) policyType = 'trade_policy';

    // Infer affected sectors from title/description
    const affectedSectors = [];
    if (title.includes('solar')) affectedSectors.push('solar');
    if (title.includes('wind')) affectedSectors.push('wind');
    if (title.includes('storage') || title.includes('battery')) affectedSectors.push('energy_storage');
    if (title.includes('renewable') || title.includes('clean energy')) affectedSectors.push('renewable_energy');
    if (title.includes('grid') || title.includes('utility')) affectedSectors.push('grid_modernization');
    if (affectedSectors.length === 0) affectedSectors.push('renewable_energy');

    return {
      id: alert.alertId || alert.policyId || Math.random().toString(),
      date: alert.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      title: alert.title || 'Policy Update',
      summary: alert.description || alert.title || 'Policy change detected',
      description: alert.description || alert.title || 'Policy change detected',
      impactLevel: alert.severity || 'medium',
      policyType,
      source,
      affectedSectors,
      regions: ['federal'],
      effectiveDate: alert.deadline,
      deadline: alert.deadline,
      alertType: alert.alertType || 'policy_change',
      affectedAssets: alert.affectedAssets?.length || 0,
      affectedReceivables: alert.affectedReceivables?.length || 0,
      recommendedActions: alert.recommendedActions || [],
      resolved: alert.resolved || false
    };
  };

  /**
   * Policy helper functions (from Policy Timeline)
   */
  const truncateToLines = (text: string, lines: number = 3): { truncated: string; isTruncated: boolean } => {
    const words = text.split(' ');
    const avgWordsPerLine = 12;
    const maxWords = lines * avgWordsPerLine;
    
    if (words.length <= maxWords) {
      return { truncated: text, isTruncated: false };
    }
    
    return { 
      truncated: words.slice(0, maxWords).join(' ') + '...', 
      isTruncated: true 
    };
  };

  const togglePolicyDescription = (eventId: string) => {
    const newExpanded = new Set(expandedPolicyDescriptions);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedPolicyDescriptions(newExpanded);
  };

  const openPolicyDetailsModal = (event: PolicyTimelineEvent) => {
    setSelectedPolicyEvent(event);
    setPolicyDetailsModalOpen(true);
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'critical': return '#dc2626'; // red-600
      case 'high': return '#ea580c'; // orange-600
      case 'medium': return '#d97706'; // amber-600
      case 'low': return '#65a30d'; // lime-600
      default: return '#6b7280'; // gray-500
    }
  };

  const getAlertTypeBadge = (alertType: string) => {
    switch (alertType) {
      case 'new_policy': return { variant: 'default' as const, color: 'bg-blue-100 text-blue-800' };
      case 'policy_change': return { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' };
      case 'expiration_warning': return { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' };
      case 'compliance_deadline': return { variant: 'outline' as const, color: 'bg-orange-100 text-orange-800' };
      default: return { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' };
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
        <div 
          className="p-3 border rounded shadow-sm"
          style={{
            backgroundColor: CHART_STYLES.tooltip.backgroundColor,
            border: CHART_STYLES.tooltip.border,
            color: CHART_STYLES.tooltip.color
          }}
        >
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
        <div 
          className="p-3 border rounded shadow-sm"
          style={{
            backgroundColor: CHART_STYLES.tooltip.backgroundColor,
            border: CHART_STYLES.tooltip.border,
            color: CHART_STYLES.tooltip.color
          }}
        >
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
        <div 
          className="p-3 border rounded shadow-sm"
          style={{
            backgroundColor: CHART_STYLES.tooltip.backgroundColor,
            border: CHART_STYLES.tooltip.border,
            color: CHART_STYLES.tooltip.color
          }}
        >
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
      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
      
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

      {/* Market Data Requirements & Status Panel */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-600" />
            Market Data Requirements & Status
          </CardTitle>
          <CardDescription>
            Data sources needed for comprehensive risk analysis and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Data Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Required Market Data Sources</h4>
                {[
                  { name: 'Treasury Rates', status: marketData ? 'Available' : 'Disconnected', description: '10Y Treasury for risk-free rate baseline' },
                  { name: 'Credit Spreads', status: marketData ? 'Available' : 'Disconnected', description: 'Investment grade spreads for credit risk' },
                  { name: 'Energy Prices', status: marketData ? 'Available' : 'Disconnected', description: 'Electricity prices affecting renewable profitability' },
                  { name: 'Climate Policy Feed', status: policyAlerts.length > 0 ? 'Active' : 'Inactive', description: 'Regulatory changes impacting renewables' }
                ].map((source, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                    <div>
                      <div className="font-medium text-sm">{source.name}</div>
                      <div className="text-xs text-gray-600">{source.description}</div>
                    </div>
                    <Badge 
                      variant={source.status === 'Available' || source.status === 'Active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {source.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Data Quality Impact</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Risk Assessment Accuracy</span>
                    <span className="text-sm font-bold">
                      {marketData && userDataSources.length > 0 ? '85-95%' : 
                       marketData || userDataSources.length > 0 ? '65-80%' : '40-60%'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        marketData && userDataSources.length > 0 ? 'bg-green-600' :
                        marketData || userDataSources.length > 0 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{width: `${
                        marketData && userDataSources.length > 0 ? '90' :
                        marketData || userDataSources.length > 0 ? '70' : '50'
                      }%`}}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-600">
                    Current confidence based on available data sources
                  </div>
                </div>

                <div className="mt-4 p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
                  <div className="font-medium text-blue-800 dark:text-blue-200 text-sm">
                    Enhancement Available
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                    Connect to free market APIs (Treasury.gov, FRED, EIA) to improve risk assessment accuracy by 20-30%
                  </div>
                </div>
              </div>
            </div>

            {/* Current Market Context (if available) */}
            {marketData && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Current Market Context</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {getMarketDataIndicators().map((indicator, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                      <div>
                        <div className="font-medium text-sm capitalize">
                          {indicator.type === 'treasury' ? 'Treasury 10Y' :
                           indicator.type === 'credit' ? 'Credit Spreads' :
                           indicator.type === 'energy' ? 'Energy Prices' : 'Policy Risk'}
                        </div>
                        <div className="text-xs text-gray-600">
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Recent Policy Changes Panel - Mirrors Policy Timeline */}
      {(policyEvents.length > 0 || policyLoading) && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Recent Policy Changes
            </CardTitle>
            <CardDescription>
              High-impact regulatory changes affecting renewable energy receivables (mirrors Policy Timeline)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {policyLoading ? (
              <div className="text-center py-4">
                <div className="text-sm text-gray-600">Loading policy changes from government APIs...</div>
              </div>
            ) : policyEvents.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No high-impact policy changes found in recent monitoring.</p>
                <p className="text-xs mt-1 text-gray-400">
                  Monitoring Federal Register, GovInfo, and LegiScan APIs for regulatory changes
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {policyEvents.map((event, index) => {
                  const alertTypeBadge = getAlertTypeBadge(event.alertType);
                  const isDescriptionExpanded = expandedPolicyDescriptions.has(event.id);
                  const { truncated, isTruncated } = truncateToLines(event.description, 2);
                  const displayDescription = isDescriptionExpanded ? event.description : truncated;
                  
                  return (
                    <div key={event.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                      {/* Event Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm leading-tight">{event.title}</h4>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {new Date(event.date).toLocaleDateString()}
                            </span>
                            {event.effectiveDate && event.effectiveDate !== event.date && (
                              <span className="flex items-center gap-1 text-xs text-blue-600">
                                <Clock className="h-3 w-3" />
                                Effective: {new Date(event.effectiveDate).toLocaleDateString()}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {event.source.replace('_', ' ')}
                            </Badge>
                            <Badge 
                              variant={alertTypeBadge.variant}
                              className={`text-xs ${alertTypeBadge.color}`}
                            >
                              {event.alertType.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="text-xs whitespace-nowrap"
                          style={{ 
                            backgroundColor: `${getImpactColor(event.impactLevel)}20`,
                            borderColor: getImpactColor(event.impactLevel),
                            color: getImpactColor(event.impactLevel)
                          }}
                        >
                          {event.impactLevel.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Event Description */}
                      <div className="text-sm text-gray-600 mb-3">
                        <p className={isDescriptionExpanded ? '' : 'line-clamp-2'}>
                          {displayDescription}
                        </p>
                        {isTruncated && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => togglePolicyDescription(event.id)}
                            className="mt-1 p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
                          >
                            {isDescriptionExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Show more
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Affected sectors and impact metrics */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {event.affectedSectors.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span>Sectors:</span>
                              {event.affectedSectors.slice(0, 2).map((sector, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {sector.replace('_', ' ')}
                                </Badge>
                              ))}
                              {event.affectedSectors.length > 2 && (
                                <span className="text-xs text-gray-400">+{event.affectedSectors.length - 2} more</span>
                              )}
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openPolicyDetailsModal(event)}
                          className="text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                {policyEvents.length > 0 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-gray-500">
                      Showing {policyEvents.length} high-impact policy changes • 
                      <span className="text-blue-600 ml-1">View full Policy Timeline for comprehensive analysis</span>
                    </p>
                  </div>
                )}
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
                            fill={RISK_COLORS[entry.name as RiskLevel] || CHART_COLOR_SEQUENCES.primary[index % CHART_COLOR_SEQUENCES.primary.length]}
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
                            fill={RISK_COLORS[entry.name as RiskLevel] || CHART_COLOR_SEQUENCES.primary[index % CHART_COLOR_SEQUENCES.primary.length]}
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
                      <CartesianGrid 
                        stroke={CHART_STYLES.grid.stroke}
                        strokeDasharray={CHART_STYLES.grid.strokeDasharray}
                      />
                      <XAxis 
                        dataKey="range" 
                        tick={CHART_STYLES.axis.tick}
                      />
                      <YAxis 
                        allowDecimals={false} 
                        tick={CHART_STYLES.axis.tick}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="count"
                        name="Number of Receivables"
                        fill={CHART_COLOR_SEQUENCES.primary[0]}
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
                      <PolarGrid stroke={CHART_STYLES.grid.stroke} />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: CHART_STYLES.axis.tick.fill }}
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 100]} 
                        tick={{ fill: CHART_STYLES.axis.tick.fill }}
                      />
                      <Radar
                        name="Average Risk Factors"
                        dataKey="A"
                        stroke={CHART_COLOR_SEQUENCES.primary[0]}
                        fill={CHART_COLOR_SEQUENCES.primary[0]}
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
                    <CartesianGrid 
                      stroke={CHART_STYLES.grid.stroke}
                      strokeDasharray={CHART_STYLES.grid.strokeDasharray}
                    />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Risk Score"
                      domain={[0, 100]}
                      tick={CHART_STYLES.axis.tick}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Amount"
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                      tick={CHART_STYLES.axis.tick}
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
                      (riskLevel, index) => (
                        <Scatter
                          key={riskLevel}
                          name={`${riskLevel} Risk`}
                          data={getRiskAmountScatterData().filter(
                            (item) => item.riskLevel === riskLevel
                          )}
                          fill={RISK_COLORS[riskLevel] || CHART_COLOR_SEQUENCES.primary[index]}
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

      {/* Policy Details Modal */}
      <Dialog open={policyDetailsModalOpen} onOpenChange={setPolicyDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Policy Details
            </DialogTitle>
            <DialogDescription>
              Complete information for {selectedPolicyEvent?.source.replace('_', ' ')} policy alert
            </DialogDescription>
          </DialogHeader>
          
          {selectedPolicyEvent && (
            <div className="space-y-6">
              {/* Title and basic info */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{selectedPolicyEvent.title}</h3>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{selectedPolicyEvent.source.replace('_', ' ')}</Badge>
                  <Badge variant="outline">{selectedPolicyEvent.policyType.replace('_', ' ')}</Badge>
                  <Badge 
                    variant="outline"
                    style={{ 
                      backgroundColor: `${getImpactColor(selectedPolicyEvent.impactLevel)}20`,
                      borderColor: getImpactColor(selectedPolicyEvent.impactLevel),
                      color: getImpactColor(selectedPolicyEvent.impactLevel)
                    }}
                  >
                    {selectedPolicyEvent.impactLevel.toUpperCase()} Impact
                  </Badge>
                  <Badge className={selectedPolicyEvent.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {selectedPolicyEvent.resolved ? 'Resolved' : 'Active'}
                  </Badge>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Important Dates</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Retrieved:</span>
                      <span>{new Date(selectedPolicyEvent.date).toLocaleDateString()}</span>
                    </div>
                    {selectedPolicyEvent.effectiveDate && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-400" />
                        <span className="text-gray-600">Effective:</span>
                        <span className="text-blue-600">{new Date(selectedPolicyEvent.effectiveDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedPolicyEvent.deadline && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-gray-600">Deadline:</span>
                        <span className="text-red-600">{new Date(selectedPolicyEvent.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Impact Metrics</h4>
                  <div className="space-y-1 text-sm">
                    <div>Assets Affected: <span className="font-medium">{selectedPolicyEvent.affectedAssets}</span></div>
                    <div>Receivables Affected: <span className="font-medium">{selectedPolicyEvent.affectedReceivables}</span></div>
                    <div>Alert Type: <span className="font-medium">{selectedPolicyEvent.alertType.replace('_', ' ')}</span></div>
                  </div>
                </div>
              </div>

              {/* Full description */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Full Description</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPolicyEvent.description}</p>
                </div>
              </div>

              {/* Affected sectors */}
              {selectedPolicyEvent.affectedSectors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Affected Sectors</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedPolicyEvent.affectedSectors.map((sector) => (
                      <Badge key={sector} variant="secondary">
                        {sector.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended actions */}
              {selectedPolicyEvent.recommendedActions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">All Recommended Actions</h4>
                  <ul className="space-y-2">
                    {selectedPolicyEvent.recommendedActions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Regions */}
              {selectedPolicyEvent.regions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Applicable Regions</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedPolicyEvent.regions.map((region) => (
                      <Badge key={region} variant="outline">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RiskAssessmentDashboard;