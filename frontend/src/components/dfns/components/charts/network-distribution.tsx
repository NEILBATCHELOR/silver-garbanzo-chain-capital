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
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { 
  Globe, 
  Wallet,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Loader2,
  AlertCircle,
  DollarSign
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect, useMemo } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { DfnsWalletSummary } from "../../../../types/dfns/wallets";

// Network distribution data interface
interface NetworkDistribution {
  network: string;
  value: number;
  percentage: number;
  walletCount: number;
  color: string;
  icon: string;
}

// Chart type
type ChartType = 'pie' | 'bar';

// Metric type
type MetricType = 'value' | 'wallets' | 'assets';

/**
 * Network Distribution Chart Component
 * Shows asset and wallet distribution across blockchain networks
 */
export function NetworkDistribution() {
  const [wallets, setWallets] = useState<DfnsWalletSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [metricType, setMetricType] = useState<MetricType>('value');

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

  // Fetch wallet data
  useEffect(() => {
    const fetchWalletData = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        const walletService = dfnsService.getWalletService();
        const walletSummaries = await walletService.getWalletsSummary();
        
        setWallets(walletSummaries);
      } catch (error) {
        console.error('Failed to fetch wallet data:', error);
        setError('Failed to load network distribution data');
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [dfnsService]);

  // Network colors and icons
  const getNetworkColor = (network: string): string => {
    const colors: Record<string, string> = {
      'Ethereum': '#627eea',
      'Bitcoin': '#f7931a',
      'Polygon': '#8247e5',
      'Arbitrum': '#213147',
      'Optimism': '#ff0420',
      'Avalanche': '#e84142',
      'Binance': '#f3ba2f',
      'Solana': '#00d4aa',
      'Near': '#00c08b',
      'Algorand': '#000000',
      'Cardano': '#0033ad',
      'Polkadot': '#e6007a',
      'Cosmos': '#2e3148',
      'Stellar': '#7d00ff',
    };
    return colors[network] || '#6b7280';
  };

  const getNetworkIcon = (network: string): string => {
    const icons: Record<string, string> = {
      'Ethereum': '⟠',
      'Bitcoin': '₿',
      'Polygon': '⬠',
      'Arbitrum': '▲',
      'Optimism': '🔴',
      'Avalanche': '❄️',
      'Binance': '🟡',
      'Solana': '◎',
      'Near': '🔷',
      'Algorand': '🔺',
      'Cardano': '🅰️',
      'Polkadot': '⚫',
      'Cosmos': '⚛️',
      'Stellar': '⭐',
    };
    return icons[network] || '🌐';
  };

  // Calculate network distribution based on selected metric
  const networkDistribution = useMemo((): NetworkDistribution[] => {
    if (wallets.length === 0) return [];

    const networkData: Record<string, { value: number; walletCount: number; assetCount: number }> = {};

    // Aggregate data by network
    wallets.forEach(wallet => {
      const network = wallet.network;
      const value = parseFloat(wallet.totalValueUsd?.toString() || '0') || 0;
      const assetCount = wallet.assetCount || 0;

      if (!networkData[network]) {
        networkData[network] = { value: 0, walletCount: 0, assetCount: 0 };
      }

      networkData[network].value += value;
      networkData[network].walletCount += 1;
      networkData[network].assetCount += assetCount;
    });

    // Calculate totals for percentage calculations
    const totalValue = Object.values(networkData).reduce((sum, data) => sum + data.value, 0);
    const totalWallets = Object.values(networkData).reduce((sum, data) => sum + data.walletCount, 0);
    const totalAssets = Object.values(networkData).reduce((sum, data) => sum + data.assetCount, 0);

    const getTotal = () => {
      switch (metricType) {
        case 'value': return totalValue;
        case 'wallets': return totalWallets;
        case 'assets': return totalAssets;
        default: return totalValue;
      }
    };

    const getValue = (data: typeof networkData[string]) => {
      switch (metricType) {
        case 'value': return data.value;
        case 'wallets': return data.walletCount;
        case 'assets': return data.assetCount;
        default: return data.value;
      }
    };

    const total = getTotal();

    // Convert to distribution array
    const distribution: NetworkDistribution[] = Object.entries(networkData)
      .map(([network, data]) => ({
        network,
        value: getValue(data),
        percentage: total > 0 ? (getValue(data) / total) * 100 : 0,
        walletCount: data.walletCount,
        color: getNetworkColor(network),
        icon: getNetworkIcon(network)
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return distribution;
  }, [wallets, metricType]);

  // Total portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const totalValue = wallets.reduce((sum, wallet) => 
      sum + (parseFloat(wallet.totalValueUsd?.toString() || '0') || 0), 0
    );
    const totalWallets = wallets.length;
    const totalAssets = wallets.reduce((sum, wallet) => sum + (wallet.assetCount || 0), 0);
    const totalNetworks = new Set(wallets.map(w => w.network)).size;

    return {
      totalValue,
      totalWallets,
      totalAssets,
      totalNetworks
    };
  }, [wallets]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as NetworkDistribution;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{data.icon}</span>
            <span className="font-medium">{data.network}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {metricType === 'value' ? 'Value:' : 
                 metricType === 'wallets' ? 'Wallets:' : 'Assets:'}
              </span>
              <span className="font-medium">
                {metricType === 'value' ? `$${data.value.toLocaleString()}` : 
                 data.value.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Percentage:</span>
              <span className="font-medium">{data.percentage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wallets:</span>
              <span>{data.walletCount}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom label for pie chart
  const renderLabel = ({ value, percentage }: any) => {
    if (percentage < 5) return ''; // Don't show labels for small segments
    return `${percentage.toFixed(0)}%`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Network Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading network distribution...</span>
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
            <Globe className="h-5 w-5" />
            <span>Network Distribution</span>
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
              <Globe className="h-5 w-5" />
              <span>Network Distribution</span>
            </CardTitle>
            <CardDescription>
              Asset distribution across {portfolioMetrics.totalNetworks} blockchain networks
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={metricType} onValueChange={(value: MetricType) => setMetricType(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value">By Value</SelectItem>
                <SelectItem value="wallets">By Wallets</SelectItem>
                <SelectItem value="assets">By Assets</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">
                  <PieChartIcon className="h-4 w-4 mr-2 inline" />
                  Pie
                </SelectItem>
                <SelectItem value="bar">
                  <BarChart3 className="h-4 w-4 mr-2 inline" />
                  Bar
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <div className="text-sm text-muted-foreground">Total Value</div>
            <div className="text-xl font-bold">
              ${portfolioMetrics.totalValue.toLocaleString()}
            </div>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <div className="text-sm text-muted-foreground">Networks</div>
            <div className="text-xl font-bold">{portfolioMetrics.totalNetworks}</div>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <div className="text-sm text-muted-foreground">Wallets</div>
            <div className="text-xl font-bold">{portfolioMetrics.totalWallets}</div>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <div className="text-sm text-muted-foreground">Assets</div>
            <div className="text-xl font-bold">{portfolioMetrics.totalAssets}</div>
          </div>
        </div>

        {networkDistribution.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            No distribution data available.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={networkDistribution}
                        dataKey="value"
                        nameKey="network"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        innerRadius={40}
                        paddingAngle={2}
                        label={renderLabel}
                      >
                        {networkDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        formatter={(value, entry: any) => (
                          <span className="flex items-center">
                            <span className="mr-2">{entry.payload.icon}</span>
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  ) : (
                    <BarChart
                      data={networkDistribution}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="network"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tickFormatter={(network) => network.length > 8 ? network.substring(0, 8) + '...' : network}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => 
                          metricType === 'value' 
                            ? `$${(value / 1000).toFixed(0)}K` 
                            : value.toString()
                        }
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="value"
                        name={metricType === 'value' ? 'Value' : metricType === 'wallets' ? 'Wallets' : 'Assets'}
                      >
                        {networkDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Network List */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Network Breakdown</h3>
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {networkDistribution.map((network, index) => (
                  <div 
                    key={network.network}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: network.color }}
                      />
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{network.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{network.network}</div>
                          <div className="text-xs text-muted-foreground">
                            {network.walletCount} wallet{network.walletCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">
                        {metricType === 'value' 
                          ? `$${network.value.toLocaleString()}` 
                          : network.value.toLocaleString()
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {network.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Networks Summary */}
        {networkDistribution.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-medium mb-4">Top 3 Networks</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {networkDistribution.slice(0, 3).map((network, index) => (
                <div key={network.network} className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="text-2xl">{network.icon}</span>
                    <div className="text-sm font-medium">{network.network}</div>
                  </div>
                  <div className="text-lg font-bold">
                    {metricType === 'value' 
                      ? `$${network.value.toLocaleString()}` 
                      : network.value.toLocaleString()
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {network.percentage.toFixed(1)}% of total
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}