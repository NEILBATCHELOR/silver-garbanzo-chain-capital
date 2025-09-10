import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  DollarSign,
  BarChart3,
  Loader2,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect, useMemo } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { DfnsWalletSummary } from "../../../../types/dfns/wallets";

// Portfolio data interface
interface PortfolioDataPoint {
  date: string;
  totalValue: number;
  ethValue: number;
  btcValue: number;
  solValue: number;
  otherValue: number;
  timestamp: number;
}

// Time range options
type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

/**
 * Portfolio Chart Component
 * Shows portfolio value over time with multiple time ranges and network breakdown
 */
export function PortfolioChart() {
  const [wallets, setWallets] = useState<DfnsWalletSummary[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  // Initialize DFNS service
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service');
      }
    };

    initializeDfns();
  }, []);

  // Fetch wallet data and generate portfolio chart data
  useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        const walletService = dfnsService.getWalletService();
        const walletSummaries = await walletService.getWalletsSummary();
        
        setWallets(walletSummaries);
        
        // Generate mock historical data based on current values
        // In a real implementation, this would come from historical data storage
        const currentTotalValue = walletSummaries.reduce((sum, wallet) => 
          sum + (parseFloat(wallet.totalValueUsd?.toString() || '0') || 0), 0
        );

        const generatedData = generatePortfolioHistory(walletSummaries, timeRange, currentTotalValue);
        setPortfolioData(generatedData);

      } catch (error) {
        console.error('Failed to fetch portfolio data:', error);
        setError('Failed to load portfolio data');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, [dfnsService, timeRange]);

  // Generate mock portfolio history data
  const generatePortfolioHistory = (
    wallets: DfnsWalletSummary[],
    range: TimeRange,
    currentValue: number
  ): PortfolioDataPoint[] => {
    const now = new Date();
    const dataPoints: PortfolioDataPoint[] = [];
    
    // Determine number of data points and time intervals based on range
    const rangeConfig = {
      '24h': { points: 24, intervalMs: 60 * 60 * 1000, label: 'Hour' },
      '7d': { points: 7, intervalMs: 24 * 60 * 60 * 1000, label: 'Day' },
      '30d': { points: 30, intervalMs: 24 * 60 * 60 * 1000, label: 'Day' },
      '90d': { points: 30, intervalMs: 3 * 24 * 60 * 60 * 1000, label: 'Day' },
      '1y': { points: 52, intervalMs: 7 * 24 * 60 * 60 * 1000, label: 'Week' },
      'all': { points: 12, intervalMs: 30 * 24 * 60 * 60 * 1000, label: 'Month' }
    };

    const config = rangeConfig[range];
    
    // Group wallets by network for breakdown
    const networkValues: Record<string, number> = {};
    wallets.forEach(wallet => {
      const value = parseFloat(wallet.totalValueUsd?.toString() || '0') || 0;
      networkValues[wallet.network] = (networkValues[wallet.network] || 0) + value;
    });

    // Generate historical data with realistic variation
    for (let i = config.points - 1; i >= 0; i--) {
      const timestamp = now.getTime() - (i * config.intervalMs);
      const date = new Date(timestamp);
      
      // Create realistic variation (±5-15% from current value)
      const variation = 0.95 + (Math.random() * 0.2); // 0.95 to 1.15
      const totalValue = currentValue * variation;
      
      // Distribute across networks proportionally with some variation
      const ethValue = (networkValues['Ethereum'] || 0) * (variation * (0.9 + Math.random() * 0.2));
      const btcValue = (networkValues['Bitcoin'] || 0) * (variation * (0.9 + Math.random() * 0.2));
      const solValue = (networkValues['Solana'] || 0) * (variation * (0.9 + Math.random() * 0.2));
      const otherValue = totalValue - ethValue - btcValue - solValue;

      dataPoints.push({
        date: range === '24h' 
          ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              ...(range === '1y' || range === 'all' ? { year: '2-digit' } : {})
            }),
        totalValue: Math.round(totalValue),
        ethValue: Math.round(ethValue),
        btcValue: Math.round(btcValue),
        solValue: Math.round(solValue),
        otherValue: Math.round(Math.max(0, otherValue)),
        timestamp
      });
    }

    return dataPoints;
  };

  // Calculate portfolio performance metrics
  const portfolioMetrics = useMemo(() => {
    if (portfolioData.length < 2) {
      return {
        currentValue: 0,
        change: 0,
        changePercent: 0,
        isPositive: true,
        highestValue: 0,
        lowestValue: 0
      };
    }

    const currentValue = portfolioData[portfolioData.length - 1].totalValue;
    const previousValue = portfolioData[0].totalValue;
    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;
    
    const values = portfolioData.map(d => d.totalValue);
    const highestValue = Math.max(...values);
    const lowestValue = Math.min(...values);

    return {
      currentValue,
      change,
      changePercent,
      isPositive: change >= 0,
      highestValue,
      lowestValue
    };
  }, [portfolioData]);

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-4 min-w-[200px]">
          <p className="text-sm font-medium mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Value:</span>
              <span className="text-sm font-medium">${data.totalValue.toLocaleString()}</span>
            </div>
            {data.ethValue > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ethereum:</span>
                <span className="text-sm">${data.ethValue.toLocaleString()}</span>
              </div>
            )}
            {data.btcValue > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bitcoin:</span>
                <span className="text-sm">${data.btcValue.toLocaleString()}</span>
              </div>
            )}
            {data.solValue > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Solana:</span>
                <span className="text-sm">${data.solValue.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Portfolio Value</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading portfolio data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Portfolio Value</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <span className="ml-2">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Portfolio Value</span>
            </CardTitle>
            <CardDescription>
              Track your portfolio performance over time across all networks
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={chartType} onValueChange={(value: 'line' | 'area') => setChartType(value)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="line">Line</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
              <SelectTrigger className="w-[100px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24H</SelectItem>
                <SelectItem value="7d">7D</SelectItem>
                <SelectItem value="30d">30D</SelectItem>
                <SelectItem value="90d">90D</SelectItem>
                <SelectItem value="1y">1Y</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Portfolio Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Current Value</div>
            </div>
            <div className="text-2xl font-bold">
              ${portfolioMetrics.currentValue.toLocaleString()}
            </div>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              {portfolioMetrics.isPositive ? (
                <ArrowUp className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-600" />
              )}
              <div className="text-sm text-muted-foreground">{timeRange.toUpperCase()} Change</div>
            </div>
            <div className={cn(
              "text-2xl font-bold",
              portfolioMetrics.isPositive ? "text-green-600" : "text-red-600"
            )}>
              {portfolioMetrics.isPositive ? '+' : ''}${portfolioMetrics.change.toLocaleString()}
            </div>
            <div className={cn(
              "text-sm",
              portfolioMetrics.isPositive ? "text-green-600" : "text-red-600"
            )}>
              {portfolioMetrics.isPositive ? '+' : ''}{portfolioMetrics.changePercent.toFixed(2)}%
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="text-sm text-green-700">Highest ({timeRange.toUpperCase()})</div>
            </div>
            <div className="text-2xl font-bold text-green-800">
              ${portfolioMetrics.highestValue.toLocaleString()}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <div className="text-sm text-red-700">Lowest ({timeRange.toUpperCase()})</div>
            </div>
            <div className="text-2xl font-bold text-red-800">
              ${portfolioMetrics.lowestValue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={portfolioData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Area
                  type="monotone"
                  dataKey="totalValue"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  name="Total Portfolio"
                />
                {/* Individual network areas for stacked chart */}
                <Area
                  type="monotone"
                  dataKey="ethValue"
                  stackId="2"
                  stroke="#627eea"
                  fill="#627eea"
                  fillOpacity={0.6}
                  name="Ethereum"
                />
                <Area
                  type="monotone"
                  dataKey="btcValue"
                  stackId="2"
                  stroke="#f7931a"
                  fill="#f7931a"
                  fillOpacity={0.6}
                  name="Bitcoin"
                />
                <Area
                  type="monotone"
                  dataKey="solValue"
                  stackId="2"
                  stroke="#00d4aa"
                  fill="#00d4aa"
                  fillOpacity={0.6}
                  name="Solana"
                />
                <Area
                  type="monotone"
                  dataKey="otherValue"
                  stackId="2"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                  name="Other"
                />
              </AreaChart>
            ) : (
              <LineChart data={portfolioData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Line
                  type="monotone"
                  dataKey="totalValue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                  name="Total Portfolio"
                />
                <Line
                  type="monotone"
                  dataKey="ethValue"
                  stroke="#627eea"
                  strokeWidth={2}
                  dot={{ fill: "#627eea", strokeWidth: 2, r: 3 }}
                  name="Ethereum"
                />
                <Line
                  type="monotone"
                  dataKey="btcValue"
                  stroke="#f7931a"
                  strokeWidth={2}
                  dot={{ fill: "#f7931a", strokeWidth: 2, r: 3 }}
                  name="Bitcoin"
                />
                <Line
                  type="monotone"
                  dataKey="solValue"
                  stroke="#00d4aa"
                  strokeWidth={2}
                  dot={{ fill: "#00d4aa", strokeWidth: 2, r: 3 }}
                  name="Solana"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Network Performance Summary */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {portfolioData.length > 0 && (
            <>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  ${portfolioData[portfolioData.length - 1].ethValue.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Ethereum</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600">
                  ${portfolioData[portfolioData.length - 1].btcValue.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Bitcoin</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-teal-600">
                  ${portfolioData[portfolioData.length - 1].solValue.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Solana</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">
                  ${portfolioData[portfolioData.length - 1].otherValue.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Other Networks</div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}