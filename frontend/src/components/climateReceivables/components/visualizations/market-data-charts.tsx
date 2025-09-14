import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart
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
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { FreeMarketDataService } from "../../../../services/climateReceivables/freeMarketDataService";
import type { 
  TreasuryRates, 
  CreditSpreads, 
  EnergyMarketData, 
  MarketDataSnapshot 
} from "../../../../services/climateReceivables/freeMarketDataService";

interface MarketDataChartsProps {
  projectId?: string;
}

interface TreasuryRateHistoryData {
  date: string;
  treasury_1m: number;
  treasury_3m: number;
  treasury_6m: number;
  treasury_1y: number;
  treasury_2y: number;
  treasury_5y: number;
  treasury_10y: number;
  treasury_30y: number;
}

interface CreditSpreadHistoryData {
  date: string;
  investment_grade: number;
  high_yield: number;
  corporate_aaa: number;
  corporate_baa: number;
}

interface EnergyPriceHistoryData {
  date: string;
  electricity_price_mwh: number;
  renewable_energy_index: number;
  carbon_credit_price: number;
  regional_demand_forecast: number;
}

interface MarketVolatilityData {
  date: string;
  treasury_volatility: number;
  credit_spread_volatility: number;
  energy_price_volatility: number;
}

/**
 * Market Data Charts Component
 * 
 * Provides comprehensive visualization of free market data sources:
 * - Treasury rate trends from Treasury.gov and FRED APIs
 * - Credit spread analysis from FRED and Yahoo Finance APIs  
 * - Energy price evolution from EIA and IEX Cloud APIs
 * - Market volatility indicators across all data sources
 * 
 * Integrates with freeMarketDataService for zero-cost data access
 */
export function MarketDataCharts({ projectId }: MarketDataChartsProps) {
  const [currentMarketData, setCurrentMarketData] = useState<MarketDataSnapshot | null>(null);
  const [treasuryHistory, setTreasuryHistory] = useState<TreasuryRateHistoryData[]>([]);
  const [creditSpreadHistory, setCreditSpreadHistory] = useState<CreditSpreadHistoryData[]>([]);
  const [energyPriceHistory, setEnergyPriceHistory] = useState<EnergyPriceHistoryData[]>([]);
  const [volatilityData, setVolatilityData] = useState<MarketVolatilityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [error, setError] = useState<string | null>(null);

  // Load market data on component mount and when time range changes
  useEffect(() => {
    loadMarketData();
  }, [selectedTimeRange]);

  /**
   * Load current market data and historical trends
   */
  const loadMarketData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current market snapshot
      const currentData = await FreeMarketDataService.getMarketDataSnapshot();
      setCurrentMarketData(currentData);

      // Get historical data based on selected time range
      const [treasuryHist, creditHist, energyHist, volatilityHist] = await Promise.allSettled([
        FreeMarketDataService.getTreasuryRateHistory(selectedTimeRange),
        FreeMarketDataService.getCreditSpreadHistory(selectedTimeRange),
        FreeMarketDataService.getEnergyMarketHistory(selectedTimeRange),
        FreeMarketDataService.getMarketVolatilityData(selectedTimeRange)
      ]);

      if (treasuryHist.status === 'fulfilled') setTreasuryHistory(treasuryHist.value);
      if (creditHist.status === 'fulfilled') setCreditSpreadHistory(creditHist.value);
      if (energyHist.status === 'fulfilled') setEnergyPriceHistory(energyHist.value);
      if (volatilityHist.status === 'fulfilled') setVolatilityData(volatilityHist.value);

    } catch (err) {
      console.error('Error loading market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh market data
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMarketData();
    setRefreshing(false);
  };

  /**
   * Get trend indicator for a value
   */
  const getTrendIndicator = (currentValue: number, previousValue: number) => {
    const trend = currentValue > previousValue ? 'up' : currentValue < previousValue ? 'down' : 'stable';
    const change = Math.abs(currentValue - previousValue);
    const changePercent = previousValue ? ((change / previousValue) * 100).toFixed(2) : '0.00';

    if (trend === 'up') {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-3 w-3" />
          <span className="text-xs">+{changePercent}%</span>
        </div>
      );
    } else if (trend === 'down') {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingDown className="h-3 w-3" />
          <span className="text-xs">-{changePercent}%</span>
        </div>
      );
    }
    return <span className="text-xs text-gray-500">Stable</span>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Market Data Charts</CardTitle>
            <CardDescription>Loading market data visualizations...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Market Data Charts</CardTitle>
            <CardDescription>Error loading market data</CardDescription>
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
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Market Data Charts</h2>
          <p className="text-gray-600">
            Live market data from Treasury.gov, FRED, and EIA APIs
            {projectId && <span className="ml-2 text-xs">• Project Context</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
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

      {/* Current market summary cards */}
      {currentMarketData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Treasury 10Y</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {currentMarketData.treasury_rates?.treasury_10y?.toFixed(2) || 'N/A'}%
                </span>
                {treasuryHistory.length > 1 && getTrendIndicator(
                  currentMarketData.treasury_rates?.treasury_10y || 0,
                  treasuryHistory[treasuryHistory.length - 2]?.treasury_10y || 0
                )}
              </div>
              <Badge variant="secondary" className="text-xs mt-1">
                {currentMarketData.treasury_rates?.source || 'Treasury.gov'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Investment Grade Spread</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {currentMarketData.credit_spreads?.investment_grade || 'N/A'} bps
                </span>
                {creditSpreadHistory.length > 1 && getTrendIndicator(
                  currentMarketData.credit_spreads?.investment_grade || 0,
                  creditSpreadHistory[creditSpreadHistory.length - 2]?.investment_grade || 0
                )}
              </div>
              <Badge variant="secondary" className="text-xs mt-1">
                {currentMarketData.credit_spreads?.source || 'FRED'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Electricity Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  ${currentMarketData.energy_prices?.electricity_price_mwh?.toFixed(0) || 'N/A'}/MWh
                </span>
                {energyPriceHistory.length > 1 && getTrendIndicator(
                  currentMarketData.energy_prices?.electricity_price_mwh || 0,
                  energyPriceHistory[energyPriceHistory.length - 2]?.electricity_price_mwh || 0
                )}
              </div>
              <Badge variant="secondary" className="text-xs mt-1">
                {currentMarketData.energy_prices?.source || 'EIA'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Market data visualization tabs */}
      <Tabs defaultValue="treasury-rates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="treasury-rates">Treasury Rates</TabsTrigger>
          <TabsTrigger value="credit-spreads">Credit Spreads</TabsTrigger>
          <TabsTrigger value="energy-prices">Energy Prices</TabsTrigger>
          <TabsTrigger value="volatility">Market Volatility</TabsTrigger>
        </TabsList>

        {/* Treasury Rates Chart */}
        <TabsContent value="treasury-rates">
          <Card>
            <CardHeader>
              <CardTitle>Treasury Yield Curves</CardTitle>
              <CardDescription>
                U.S. Treasury rates from Treasury.gov and FRED APIs • Risk-free baseline rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={treasuryHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis 
                      label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft' }}
                      domain={['dataMin - 0.1', 'dataMax + 0.1']}
                    />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: any, name: string) => [`${value.toFixed(2)}%`, name.replace('treasury_', '').toUpperCase()]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="treasury_1m" 
                      stroke="#8884d8" 
                      name="1M" 
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="treasury_3m" 
                      stroke="#82ca9d" 
                      name="3M" 
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="treasury_1y" 
                      stroke="#ffc658" 
                      name="1Y" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="treasury_10y" 
                      stroke="#ff7300" 
                      name="10Y" 
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="treasury_30y" 
                      stroke="#8dd1e1" 
                      name="30Y" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit Spreads Chart */}
        <TabsContent value="credit-spreads">
          <Card>
            <CardHeader>
              <CardTitle>Corporate Credit Spreads</CardTitle>
              <CardDescription>
                Credit spreads over Treasury rates from FRED • Risk premium indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={creditSpreadHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis 
                      label={{ value: 'Spread (bps)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: any, name: string) => [`${value} bps`, name.replace('_', ' ').toUpperCase()]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="investment_grade"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                      name="Investment Grade"
                    />
                    <Area
                      type="monotone"
                      dataKey="high_yield"
                      stackId="1"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                      name="High Yield"
                    />
                    <Area
                      type="monotone"
                      dataKey="corporate_aaa"
                      stackId="2"
                      stroke="#ffc658"
                      fill="#ffc658"
                      fillOpacity={0.4}
                      name="Corporate AAA"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Energy Prices Chart */}
        <TabsContent value="energy-prices">
          <Card>
            <CardHeader>
              <CardTitle>Energy Market Prices</CardTitle>
              <CardDescription>
                Electricity and renewable energy data from EIA • Direct impact on climate receivables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={energyPriceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Price ($/MWh)', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Index/Forecast', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: any, name: string, props: any) => {
                        if (name === 'electricity_price_mwh') return [`$${value}/MWh`, 'Electricity Price'];
                        if (name === 'carbon_credit_price') return [`$${value}/tCO₂`, 'Carbon Credit Price'];
                        if (name === 'renewable_energy_index') return [`${value}`, 'Renewable Index'];
                        if (name === 'regional_demand_forecast') return [`${value}`, 'Demand Forecast'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="electricity_price_mwh" 
                      fill="#8884d8" 
                      name="Electricity Price"
                      opacity={0.7}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="renewable_energy_index" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Renewable Index"
                      dot={false}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="carbon_credit_price" 
                      stroke="#ff7300" 
                      strokeWidth={2}
                      name="Carbon Credits"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Volatility Chart */}
        <TabsContent value="volatility">
          <Card>
            <CardHeader>
              <CardTitle>Market Volatility Indicators</CardTitle>
              <CardDescription>
                Volatility measures across treasury, credit, and energy markets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volatilityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis 
                      label={{ value: 'Volatility (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: any, name: string) => [`${value.toFixed(2)}%`, name.replace('_volatility', '').replace('_', ' ').toUpperCase()]}
                    />
                    <Legend />
                    <Bar 
                      dataKey="treasury_volatility" 
                      fill="#8884d8" 
                      name="Treasury"
                      opacity={0.8}
                    />
                    <Bar 
                      dataKey="credit_spread_volatility" 
                      fill="#82ca9d" 
                      name="Credit Spreads"
                      opacity={0.8}
                    />
                    <Bar 
                      dataKey="energy_price_volatility" 
                      fill="#ffc658" 
                      name="Energy Prices"
                      opacity={0.8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Data sources footer */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-gray-600">
            <p className="font-medium mb-2">Free Market Data Sources</p>
            <div className="flex justify-center gap-6 flex-wrap">
              <span>🏛️ Treasury.gov • Treasury Rates</span>
              <span>📊 FRED • Credit Spreads</span>
              <span>⚡ EIA • Energy Prices</span>
              <span>📈 IEX Cloud • Market Indices</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {currentMarketData?.treasury_rates?.last_updated || 'Unknown'} • Zero API costs
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MarketDataCharts;
