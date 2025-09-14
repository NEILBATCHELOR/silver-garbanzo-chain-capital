import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  RefreshCw, 
  Database, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3,
  TrendingUp,
  Upload,
  FileText,
  AlertCircle
} from "lucide-react";
import { FreeMarketDataService } from "../../../../services/climateReceivables/freeMarketDataService";
import { UserDataSourceService } from "../../../../services/climateReceivables/userDataSourceService";
import type { 
  MarketDataSnapshot,
  PolicyChange 
} from "../../../../services/climateReceivables/freeMarketDataService";
import type { 
  UserDataSource
} from "../../../../services/climateReceivables/userDataSourceService";

interface DataQualityDashboardProps {
  projectId?: string;
  className?: string;
}

interface DataQualityScore {
  overall_score: number;
  completeness_score: number;
  freshness_score: number;
  accuracy_score: number;
  coverage_score: number;
}

interface DataSourceHealth {
  source_type: string;
  source_name: string;
  status: 'healthy' | 'warning' | 'error' | 'offline';
  last_updated: string;
  success_rate: number;
  error_count: number;
}

/**
 * Data Quality Dashboard Widget
 * 
 * Provides comprehensive data quality reporting and monitoring for:
 * - User data source processing status and quality scores
 * - Market data API health and freshness indicators  
 * - Data completeness and coverage metrics
 * - Validation results and error reporting
 * - Recommendations for data quality improvements
 */
export function DataQualityDashboard({ projectId, className }: DataQualityDashboardProps) {
  const [marketData, setMarketData] = useState<MarketDataSnapshot | null>(null);
  const [userDataSources, setUserDataSources] = useState<UserDataSource[]>([]);
  const [dataQualityScore, setDataQualityScore] = useState<DataQualityScore | null>(null);
  const [dataSourceHealth, setDataSourceHealth] = useState<DataSourceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadDataQualityMetrics();
  }, [selectedTimeRange]);

  /**
   * Load comprehensive data quality metrics
   */
  const loadDataQualityMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data sources in parallel
      const [marketDataSnapshot, userSources] = await Promise.allSettled([
        FreeMarketDataService.getMarketDataSnapshot(),
        UserDataSourceService.getUserDataSources()
      ]);

      // Set market data
      if (marketDataSnapshot.status === 'fulfilled') {
        setMarketData(marketDataSnapshot.value);
      }

      // Set user data sources
      if (userSources.status === 'fulfilled') {
        setUserDataSources(userSources.value);
      }

      // Calculate data quality scores
      calculateDataQualityScores(
        marketDataSnapshot.status === 'fulfilled' ? marketDataSnapshot.value : null,
        userSources.status === 'fulfilled' ? userSources.value : []
      );

      // Calculate data source health metrics
      calculateDataSourceHealth(
        marketDataSnapshot.status === 'fulfilled' ? marketDataSnapshot.value : null,
        userSources.status === 'fulfilled' ? userSources.value : []
      );

    } catch (err) {
      console.error('Error loading data quality metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data quality metrics');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate comprehensive data quality scores
   */
  const calculateDataQualityScores = (market: MarketDataSnapshot | null, userSources: UserDataSource[]) => {
    // Completeness score (0-100)
    const activeUserSources = userSources.filter(source => source.is_active).length;
    const maxUserSources = 5; // Optimal number of user sources
    const completenessScore = Math.min(100, 
      ((market ? 30 : 0) + (activeUserSources / maxUserSources * 70))
    );

    // Freshness score (0-100)
    const marketDataAge = market ? 
      Math.max(0, 24 - Math.floor((Date.now() - new Date(market.data_freshness).getTime()) / (1000 * 60 * 60))) : 0;
    const freshnessScore = Math.max(0, Math.min(100,
      ((marketDataAge / 24 * 60) + (userSources.length > 0 ? 40 : 0))
    ));

    // Accuracy score (based on data validation and processing success)
    const processingSuccessRate = userSources.length > 0 ? 
      userSources.filter(source => source.processing_status === 'completed').length / userSources.length : 0.5;
    const accuracyScore = Math.min(100, 
      ((market ? 50 : 20) + (processingSuccessRate * 50))
    );

    // Coverage score (percentage of data needs met)
    const coverageFactors = [
      market?.treasury_rates ? 20 : 0,
      market?.credit_spreads ? 20 : 0,
      market?.energy_prices ? 20 : 0,
      market?.policy_changes && market.policy_changes.length > 0 ? 20 : 0,
      activeUserSources > 0 ? 20 : 0
    ];
    const coverageScore = coverageFactors.reduce((sum, score) => sum + score, 0);

    // Overall score (weighted average)
    const overallScore = Math.round(
      (completenessScore * 0.3) + 
      (freshnessScore * 0.25) + 
      (accuracyScore * 0.25) + 
      (coverageScore * 0.2)
    );

    setDataQualityScore({
      overall_score: overallScore,
      completeness_score: Math.round(completenessScore),
      freshness_score: Math.round(freshnessScore),
      accuracy_score: Math.round(accuracyScore),
      coverage_score: Math.round(coverageScore)
    });
  };

  /**
   * Calculate data source health metrics
   */
  const calculateDataSourceHealth = (market: MarketDataSnapshot | null, userSources: UserDataSource[]) => {
    const healthMetrics: DataSourceHealth[] = [];

    // Market data sources health
    if (market) {
      const marketAge = Math.floor((Date.now() - new Date(market.data_freshness).getTime()) / (1000 * 60 * 60));
      const cacheHitRate = market.cache_hit_rate || 0;
      
      healthMetrics.push({
        source_type: 'market_apis',
        source_name: 'Free Market Data APIs',
        status: marketAge > 12 ? 'warning' : marketAge > 24 ? 'error' : 'healthy',
        last_updated: market.data_freshness,
        success_rate: Math.min(100, 70 + (cacheHitRate * 30)),
        error_count: market.api_call_count > 0 ? Math.max(0, market.api_call_count - (market.api_call_count * cacheHitRate)) : 0
      });
    } else {
      healthMetrics.push({
        source_type: 'market_apis',
        source_name: 'Free Market Data APIs',
        status: 'offline',
        last_updated: 'Never',
        success_rate: 0,
        error_count: 0
      });
    }

    // User data sources health
    userSources.forEach(source => {
      const lastProcessed = source.last_processed ? new Date(source.last_processed) : null;
      const hoursSinceLastUpdate = lastProcessed ? 
        Math.floor((Date.now() - lastProcessed.getTime()) / (1000 * 60 * 60)) : 9999;

      let status: 'healthy' | 'warning' | 'error' | 'offline' = 'offline';
      if (source.processing_status === 'completed') {
        status = hoursSinceLastUpdate > 168 ? 'warning' : 'healthy'; // 7 days
      } else if (source.processing_status === 'error') {
        status = 'error';
      } else if (source.processing_status === 'processing') {
        status = 'warning';
      }

      healthMetrics.push({
        source_type: 'user_data',
        source_name: source.source_name,
        status,
        last_updated: source.last_processed || 'Never processed',
        success_rate: source.processing_status === 'completed' ? 95 : 
                     source.processing_status === 'processing' ? 50 : 0,
        error_count: source.validation_errors ? Object.keys(source.validation_errors).length : 0
      });
    });

    setDataSourceHealth(healthMetrics);
  };

  /**
   * Refresh all data quality metrics
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDataQualityMetrics();
    setRefreshing(false);
  };

  /**
   * Get status color for badges and indicators
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-600';
      case 'warning': return 'bg-yellow-600';
      case 'error': return 'bg-red-600';
      case 'offline': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  /**
   * Get status badge variant
   */
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      case 'offline': return 'outline';
      default: return 'outline';
    }
  };

  /**
   * Get data quality score color
   */
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle>Data Quality Dashboard</CardTitle>
            <CardDescription>Loading data quality metrics...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle>Data Quality Dashboard</CardTitle>
            <CardDescription>Error loading data quality metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Quality Dashboard</h2>
          <p className="text-gray-600">
            Comprehensive data quality monitoring and recommendations
            {projectId && <span className="ml-2 text-xs">• Project Context</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Data quality score overview */}
      {dataQualityScore && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Overall Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getScoreColor(dataQualityScore.overall_score)}`}>
                {dataQualityScore.overall_score}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {dataQualityScore.overall_score >= 80 ? 'Excellent' : 
                 dataQualityScore.overall_score >= 60 ? 'Good' : 'Needs Improvement'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Completeness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(dataQualityScore.completeness_score)}`}>
                {dataQualityScore.completeness_score}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                <div 
                  className={`h-1 rounded-full ${getStatusColor(
                    dataQualityScore.completeness_score >= 80 ? 'healthy' : 
                    dataQualityScore.completeness_score >= 60 ? 'warning' : 'error'
                  )}`}
                  style={{width: `${dataQualityScore.completeness_score}%`}}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Freshness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(dataQualityScore.freshness_score)}`}>
                {dataQualityScore.freshness_score}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                <div 
                  className={`h-1 rounded-full ${getStatusColor(
                    dataQualityScore.freshness_score >= 80 ? 'healthy' : 
                    dataQualityScore.freshness_score >= 60 ? 'warning' : 'error'
                  )}`}
                  style={{width: `${dataQualityScore.freshness_score}%`}}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(dataQualityScore.accuracy_score)}`}>
                {dataQualityScore.accuracy_score}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                <div 
                  className={`h-1 rounded-full ${getStatusColor(
                    dataQualityScore.accuracy_score >= 80 ? 'healthy' : 
                    dataQualityScore.accuracy_score >= 60 ? 'warning' : 'error'
                  )}`}
                  style={{width: `${dataQualityScore.accuracy_score}%`}}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(dataQualityScore.coverage_score)}`}>
                {dataQualityScore.coverage_score}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                <div 
                  className={`h-1 rounded-full ${getStatusColor(
                    dataQualityScore.coverage_score >= 80 ? 'healthy' : 
                    dataQualityScore.coverage_score >= 60 ? 'warning' : 'error'
                  )}`}
                  style={{width: `${dataQualityScore.coverage_score}%`}}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed data quality tabs */}
      <Tabs defaultValue="sources" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="processing">Processing Status</TabsTrigger>
          <TabsTrigger value="validation">Validation Results</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Data Sources Tab */}
        <TabsContent value="sources">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Source Health</CardTitle>
                <CardDescription>
                  Status and performance of all data sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dataSourceHealth.map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {source.source_type === 'market_apis' ? 
                          <Wifi className="h-5 w-5 text-blue-600" /> : 
                          <Database className="h-5 w-5 text-purple-600" />
                        }
                        <div>
                          <div className="font-medium">{source.source_name}</div>
                          <div className="text-sm text-gray-600">
                            Last updated: {source.last_updated === 'Never' || source.last_updated === 'Never processed' ? 
                              source.last_updated : 
                              new Date(source.last_updated).toLocaleString()
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(source.status)}>
                          {source.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {source.success_rate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Source Distribution</CardTitle>
                <CardDescription>
                  Breakdown of active data sources by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { 
                            name: 'Market APIs', 
                            value: marketData ? 1 : 0,
                            color: '#3B82F6'
                          },
                          { 
                            name: 'User Data', 
                            value: userDataSources.filter(s => s.is_active).length,
                            color: '#8B5CF6'
                          },
                          { 
                            name: 'Inactive', 
                            value: userDataSources.filter(s => !s.is_active).length,
                            color: '#6B7280'
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => 
                          percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                        }
                      >
                        {[
                          { color: '#3B82F6' },
                          { color: '#8B5CF6' },
                          { color: '#6B7280' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Processing Status Tab */}
        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle>Data Processing Status</CardTitle>
              <CardDescription>
                Real-time status of data processing jobs and workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userDataSources.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">No User Data Sources</p>
                    <p className="text-sm">Upload data sources to see processing status</p>
                  </div>
                ) : (
                  userDataSources.map((source, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <div className="font-medium">{source.source_name}</div>
                            <div className="text-sm text-gray-600 mb-2">
                              Type: {source.source_type} • Format: {source.data_format}
                            </div>
                            <div className="text-xs text-gray-500">
                              Uploaded: {new Date(source.upload_date).toLocaleString()}
                            </div>
                            {source.last_processed && (
                              <div className="text-xs text-gray-500">
                                Last processed: {new Date(source.last_processed).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={getStatusBadgeVariant(
                            source.processing_status === 'completed' ? 'healthy' :
                            source.processing_status === 'processing' ? 'warning' :
                            source.processing_status === 'error' ? 'error' : 'offline'
                          )}>
                            {source.processing_status}
                          </Badge>
                          {source.file_size && (
                            <span className="text-xs text-gray-500">
                              {(source.file_size / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {source.validation_errors && Object.keys(source.validation_errors).length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Validation Errors</span>
                          </div>
                          <div className="text-sm text-red-600 dark:text-red-300 mt-1">
                            {Object.keys(source.validation_errors).length} error(s) found during processing
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation Results Tab */}
        <TabsContent value="validation">
          <Card>
            <CardHeader>
              <CardTitle>Data Validation Results</CardTitle>
              <CardDescription>
                Data quality validation results and error reporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Validation Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">
                      {userDataSources.filter(s => s.processing_status === 'completed').length}
                    </div>
                    <div className="text-sm text-gray-600">Valid Sources</div>
                  </div>
                  
                  <div className="p-4 border rounded-lg text-center">
                    <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-600">
                      {userDataSources.filter(s => s.processing_status === 'processing').length}
                    </div>
                    <div className="text-sm text-gray-600">Processing</div>
                  </div>
                  
                  <div className="p-4 border rounded-lg text-center">
                    <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">
                      {userDataSources.filter(s => s.processing_status === 'error').length}
                    </div>
                    <div className="text-sm text-gray-600">Errors</div>
                  </div>
                </div>

                {/* Detailed Error Reports */}
                {userDataSources.filter(s => s.validation_errors && Object.keys(s.validation_errors).length > 0).length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Validation Error Details</h3>
                    <div className="space-y-3">
                      {userDataSources
                        .filter(s => s.validation_errors && Object.keys(s.validation_errors).length > 0)
                        .map((source, index) => (
                          <div key={index} className="border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <span className="font-medium">{source.source_name}</span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              {source.validation_errors && Object.entries(source.validation_errors).map(([field, error], errorIndex) => (
                                <div key={errorIndex} className="ml-6">
                                  <span className="font-medium">{field}:</span> {error as string}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Data Quality Recommendations</CardTitle>
              <CardDescription>
                Actionable recommendations to improve data quality and accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Recommendations based on current state */}
                {!marketData && (
                  <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div className="font-medium text-yellow-800 dark:text-yellow-200">
                        Enable Market Data Integration
                      </div>
                    </div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-300 mt-1 ml-7">
                      Connect to free government APIs (Treasury.gov, FRED, EIA) for real-time risk adjustments
                    </div>
                  </div>
                )}

                {userDataSources.filter(s => s.is_active).length === 0 && (
                  <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
                    <div className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-blue-600" />
                      <div className="font-medium text-blue-800 dark:text-blue-200">
                        Upload User Data Sources
                      </div>
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-300 mt-1 ml-7">
                      Upload credit reports, financial statements, or custom data to improve risk assessment accuracy
                    </div>
                  </div>
                )}

                {userDataSources.filter(s => s.processing_status === 'error').length > 0 && (
                  <div className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-950">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div className="font-medium text-red-800 dark:text-red-200">
                        Fix Data Processing Errors
                      </div>
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-300 mt-1 ml-7">
                      {userDataSources.filter(s => s.processing_status === 'error').length} data source(s) have processing errors that need attention
                    </div>
                  </div>
                )}

                {dataQualityScore && dataQualityScore.overall_score >= 80 && (
                  <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="font-medium text-green-800 dark:text-green-200">
                        Excellent Data Quality
                      </div>
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-300 mt-1 ml-7">
                      Your data quality score is {dataQualityScore.overall_score}. Consider maintaining regular data refresh schedules.
                    </div>
                  </div>
                )}

                {/* Actionable next steps */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Next Steps</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span>Monitor data quality scores regularly for trends</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-blue-600" />
                      <span>Set up automated data refresh schedules</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-600" />
                      <span>Implement data validation rules for new sources</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <span>Set up quality threshold alerts and notifications</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DataQualityDashboard;
