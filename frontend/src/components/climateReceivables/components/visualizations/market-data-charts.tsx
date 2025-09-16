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
import { MARKET_DATA_COLORS, CHART_STYLES, CHART_COLOR_SEQUENCES, withOpacity } from "../../constants/chart-colors";

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
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '6m' | '1y' | '2y'>('30d');
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
      
      console.log(`🔄 Loading market data for ${selectedTimeRange}...`);
      
      // Clear credit spread history cache for fresh data with all 9 fields
      console.log('🗺️ Clearing credit spread history cache...');
      try {
        await FreeMarketDataService.clearCache(`credit_spread_history_${selectedTimeRange}`);
      } catch (cacheError) {
        console.warn('Cache clearing failed:', cacheError);
      }

      // Get current market snapshot
      const currentData = await FreeMarketDataService.getMarketDataSnapshot();
      setCurrentMarketData(currentData);
      console.log('📊 Current market data:', currentData);

      // Get historical data based on selected time range
      console.log(`📈 Fetching historical data for ${selectedTimeRange}...`);
      const [treasuryHist, creditHist, energyHist, volatilityHist] = await Promise.allSettled([
        FreeMarketDataService.getTreasuryRateHistory(selectedTimeRange),
        FreeMarketDataService.getCreditSpreadHistory(selectedTimeRange),
        FreeMarketDataService.getEnergyMarketHistory(selectedTimeRange),
        FreeMarketDataService.getMarketVolatilityData(selectedTimeRange)
      ]);

      if (treasuryHist.status === 'fulfilled') {
        console.log(`✅ Treasury history: ${treasuryHist.value.length} data points`);
        console.log('📊 Treasury sample:', treasuryHist.value.slice(0, 2));
        setTreasuryHistory(treasuryHist.value);
      } else {
        console.error('❌ Treasury history failed:', treasuryHist.reason);
      }
      
      if (creditHist.status === 'fulfilled') {
        console.log(`✅ Credit spread history: ${creditHist.value.length} data points`);
        console.log('📊 Credit spread sample:', creditHist.value.slice(0, 2));
        setCreditSpreadHistory(creditHist.value);
      } else {
        console.error('❌ Credit spread history failed:', creditHist.reason);
      }
      
      if (energyHist.status === 'fulfilled') {
        console.log(`✅ Energy history: ${energyHist.value.length} data points`);
        setEnergyPriceHistory(energyHist.value);
      } else {
        console.error('❌ Energy history failed:', energyHist.reason);
      }
      
      if (volatilityHist.status === 'fulfilled') {
        console.log(`✅ Volatility data: ${volatilityHist.value.length} data points`);
        setVolatilityData(volatilityHist.value);
      } else {
        console.error('❌ Volatility data failed:', volatilityHist.reason);
      }

    } catch (err) {
      console.error('❌ Error loading market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh market data with cache clearing
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear cache for fresh data
      await FreeMarketDataService.clearCache();
      console.log('🔄 Cache cleared, refreshing data...');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
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
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
              <SelectItem value="2y">2 Years</SelectItem>
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
          {process.env.NODE_ENV === 'development' && (
            <Button 
              onClick={() => FreeMarketDataService.clearCache()} 
              variant="outline" 
              size="sm"
            >
              🗑️ Clear Cache
            </Button>
          )}
        </div>
      </div>



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
              {/* Data validation and error handling */}
              {!currentMarketData?.treasury_rates ? (
                <div className="h-[420px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <p className="text-gray-500 mb-2">Treasury rates data unavailable</p>
                    <p className="text-sm text-gray-400">FRED API key required for treasury data</p>
                    <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-3">
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Retry Loading
                    </Button>
                  </div>
                </div>
              ) : treasuryHistory.length === 0 ? (
                <div className="h-[420px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <p className="text-gray-500 mb-2">Historical treasury data loading...</p>
                    <p className="text-sm text-gray-400">Current rates: {currentMarketData.treasury_rates.treasury_10y.toFixed(2)}% (10Y)</p>
                  </div>
                </div>
              ) : (
                <div className="h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={treasuryHistory} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis 
                        label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft' }}
                        domain={['dataMin - 0.1', 'dataMax + 0.1']}
                        tickFormatter={(value) => Number(value).toFixed(3)}
                      />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: any, name: string) => [`${value.toFixed(2)}%`, name.replace('treasury_', '').toUpperCase()]}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="treasury_1m" 
                        stroke={MARKET_DATA_COLORS.treasury.rates[0]} 
                        name="1M" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="treasury_3m" 
                        stroke={MARKET_DATA_COLORS.treasury.rates[1]} 
                        name="3M" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="treasury_1y" 
                        stroke={MARKET_DATA_COLORS.treasury.rates[2]} 
                        name="1Y" 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="treasury_10y" 
                        stroke={MARKET_DATA_COLORS.treasury.rates[3]} 
                        name="10Y" 
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="treasury_30y" 
                        stroke={MARKET_DATA_COLORS.treasury.rates[4]} 
                        name="30Y" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
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
              <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={creditSpreadHistory} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid 
                      stroke={CHART_STYLES.grid.stroke}
                      strokeDasharray={CHART_STYLES.grid.strokeDasharray}
                    />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      tick={CHART_STYLES.axis.tick}
                    />
                    <YAxis 
                      label={{ value: 'Credit Spreads (bps)', angle: -90, position: 'insideLeft' }}
                      tick={CHART_STYLES.axis.tick}
                      domain={[0, 'dataMax + 50']}
                      type="number"
                      tickFormatter={(value) => `${Number(value).toFixed(0)} bps`}
                    />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: any, name: string) => [`${value} bps`, name.replace('_', ' ').toUpperCase()]}
                    />
                    <Legend />
                    
                    {/* Investment Grade Credit Spreads */}
                    <Line
                      type="monotone"
                      dataKey="investment_grade"
                      stroke={MARKET_DATA_COLORS.credit.investmentGrade}
                      name="Investment Grade Aggregate"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="corporate_aaa"
                      stroke={CHART_COLOR_SEQUENCES.extended[0]}
                      name="AAA Corporate"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="corporate_aa"
                      stroke={CHART_COLOR_SEQUENCES.extended[1]}
                      name="AA Corporate"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="corporate_a"
                      stroke={CHART_COLOR_SEQUENCES.extended[2]}
                      name="A Corporate"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="corporate_bbb"
                      stroke={CHART_COLOR_SEQUENCES.extended[3]}
                      name="BBB Corporate"
                      strokeWidth={2}
                      dot={false}
                    />

                    {/* High Yield Credit Spreads */}
                    <Line
                      type="monotone"
                      dataKey="high_yield"
                      stroke={MARKET_DATA_COLORS.credit.highYield}
                      name="High Yield Aggregate"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="high_yield_bb"
                      stroke={CHART_COLOR_SEQUENCES.extended[4]}
                      name="BB High Yield"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="high_yield_b"
                      stroke={CHART_COLOR_SEQUENCES.extended[5]}
                      name="B High Yield"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="high_yield_ccc"
                      stroke={CHART_COLOR_SEQUENCES.extended[6]}
                      name="CCC High Yield"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
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
              <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={energyPriceHistory} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                    <CartesianGrid 
                      stroke={CHART_STYLES.grid.stroke}
                      strokeDasharray={CHART_STYLES.grid.strokeDasharray}
                    />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      tick={CHART_STYLES.axis.tick}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Price ($/MWh)', angle: -90, position: 'insideLeft' }}
                      tick={CHART_STYLES.axis.tick}
                      domain={[0, 'dataMax + 10']}
                      tickFormatter={(value) => Number(value).toFixed(2)}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Index/Forecast', angle: 90, position: 'insideRight' }}
                      tick={CHART_STYLES.axis.tick}
                      domain={[0, 150]}
                      tickFormatter={(value) => Number(value).toFixed(1)}
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
                      fill={MARKET_DATA_COLORS.energy.electricity} 
                      name="Electricity Price"
                      opacity={0.7}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="renewable_energy_index" 
                      stroke={MARKET_DATA_COLORS.energy.renewable} 
                      strokeWidth={2}
                      name="Renewable Index"
                      dot={false}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="carbon_credit_price" 
                      stroke={MARKET_DATA_COLORS.energy.carbon} 
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
              <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={volatilityData} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                    <CartesianGrid 
                      stroke={CHART_STYLES.grid.stroke}
                      strokeDasharray={CHART_STYLES.grid.strokeDasharray}
                    />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      tick={CHART_STYLES.axis.tick}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Treasury & Credit (%)', angle: -90, position: 'insideLeft' }}
                      tick={CHART_STYLES.axis.tick}
                      domain={[0, 'dataMax + 1']}
                      tickFormatter={(value) => Number(value).toFixed(3)}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Energy Volatility (%)', angle: 90, position: 'insideRight' }}
                      tick={CHART_STYLES.axis.tick}
                      domain={[0, 'dataMax + 5']}
                      tickFormatter={(value) => Number(value).toFixed(2)}
                    />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: any, name: string) => [`${value.toFixed(2)}%`, name.replace('_volatility', '').replace('_', ' ').toUpperCase()]}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="treasury_volatility" 
                      fill={MARKET_DATA_COLORS.volatility.treasury} 
                      name="Treasury"
                      opacity={0.8}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="credit_spread_volatility" 
                      fill={MARKET_DATA_COLORS.volatility.credit} 
                      name="Credit Spreads"
                      opacity={0.8}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="energy_price_volatility" 
                      stroke={MARKET_DATA_COLORS.volatility.energy}
                      strokeWidth={3}
                      name="Energy Prices"
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MarketDataCharts;
