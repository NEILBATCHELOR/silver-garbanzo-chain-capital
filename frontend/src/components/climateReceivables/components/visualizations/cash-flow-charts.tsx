import React, { useState, useEffect } from "react";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  Area
} from "recharts";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/infrastructure/database/client";
import { ClimateReceivable, ClimateIncentive, IncentiveType, IncentiveStatus } from "../../types";
import { CashFlowForecastingService } from "../../utils/cash-flow-forecasting-service";

interface CashFlowChartsProps {
  // Remove projectId as it doesn't exist in our schema
}

/**
 * Component for visualizing cash flow projections
 */
const CashFlowCharts: React.FC<CashFlowChartsProps> = () => {
  const [receivables, setReceivables] = useState<ClimateReceivable[]>([]);
  const [incentives, setIncentives] = useState<ClimateIncentive[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<'day' | 'week' | 'month' | 'quarter'>('month');
  const [forecastMonths, setForecastMonths] = useState<number>(12);
  const [chartData, setChartData] = useState<any[]>([]);
  const [cumulativeData, setCumulativeData] = useState<any[]>([]);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Generate charts when data, period type, or forecast months change
  useEffect(() => {
    if (receivables.length > 0 || incentives.length > 0) {
      generateChartData();
    }
  }, [receivables, incentives, periodType, forecastMonths]);

  /**
   * Fetch receivables and incentives data
   */
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch receivables
      const { data: receivablesData, error: receivablesError } = await supabase
        .from("climate_receivables")
        .select("*");

      if (receivablesError) throw receivablesError;

      // Fetch incentives
      const { data: incentivesData, error: incentivesError } = await supabase
        .from("climate_incentives")
        .select("*");

      if (incentivesError) throw incentivesError;

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

      const transformedIncentives = incentivesData?.map(item => ({
        incentiveId: item.incentive_id,
        type: item.type as IncentiveType,
        amount: item.amount,
        status: item.status as IncentiveStatus,
        assetId: item.asset_id,
        receivableId: item.receivable_id,
        expectedReceiptDate: item.expected_receipt_date,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })) || [];

      setReceivables(transformedReceivables);
      setIncentives(transformedIncentives);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate chart data from receivables and incentives
   */
  const generateChartData = () => {
    try {
      // Use the CashFlowForecastingService to generate projections
      const startDate = new Date();
      const projections = CashFlowForecastingService.generateForecast(
        receivables,
        incentives,
        startDate,
        forecastMonths
      );

      // Aggregate projections by period type
      const aggregatedData = CashFlowForecastingService.aggregateProjections(
        projections,
        periodType
      );

      // Convert to array format for Recharts
      const chartData = Object.entries(aggregatedData).map(([period, values]) => ({
        period,
        receivables: parseFloat(values.receivables.toFixed(2)),
        incentives: parseFloat(values.incentives.toFixed(2)),
        total: parseFloat(values.total.toFixed(2))
      }));

      // Generate cumulative data
      const cumulativeData = chartData.reduce((acc, current, index) => {
        const previousTotal = index > 0 ? acc[index - 1].cumulativeTotal : 0;
        acc.push({
          ...current,
          cumulativeTotal: previousTotal + current.total
        });
        return acc;
      }, [] as any[]);

      setChartData(chartData);
      setCumulativeData(cumulativeData);
    } catch (err) {
      console.error("Failed to generate chart data:", err);
      setError("Failed to generate chart data. Please try again.");
    }
  };

  /**
   * Format period labels for better display
   */
  const formatPeriodLabel = (period: string) => {
    if (periodType === 'month') {
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    } else if (periodType === 'quarter') {
      return period; // e.g., "2023-Q1"
    } else if (periodType === 'week') {
      return `Week ${period.split('-W')[1]}`; // e.g., "Week 3"
    }
    return period; // day format
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
   * Custom tooltip for charts
   */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-sm">
          <p className="font-medium">{formatPeriodLabel(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="p-6 text-center">Loading cash flow data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cash Flow Projections</h2>
          <p className="text-sm text-muted-foreground">Climate Receivables Cash Flow Analysis</p>
        </div>
        <div className="flex space-x-4">
          <Select value={periodType} onValueChange={(value: any) => setPeriodType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Period Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="day">Daily</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={forecastMonths.toString()} 
            onValueChange={(value) => setForecastMonths(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Forecast Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 Months</SelectItem>
              <SelectItem value="12">12 Months</SelectItem>
              <SelectItem value="18">18 Months</SelectItem>
              <SelectItem value="24">24 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData}>Refresh Data</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Tabs defaultValue="stacked" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="stacked">Stacked Bar Chart</TabsTrigger>
          <TabsTrigger value="cumulative">Cumulative Cash Flow</TabsTrigger>
          <TabsTrigger value="combined">Combined View</TabsTrigger>
        </TabsList>

        <TabsContent value="stacked">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Cash Flow Projection</CardTitle>
              <CardDescription>
                Projected cash inflows from receivables and incentives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      tickFormatter={formatPeriodLabel}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="receivables" 
                      name="Receivables" 
                      stackId="a" 
                      fill="#4f46e5" 
                    />
                    <Bar 
                      dataKey="incentives" 
                      name="Incentives" 
                      stackId="a" 
                      fill="#10b981"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cumulative">
          <Card>
            <CardHeader>
              <CardTitle>Cumulative Cash Flow</CardTitle>
              <CardDescription>
                Running total of projected cash inflows over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      tickFormatter={formatPeriodLabel}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeTotal" 
                      name="Cumulative Cash Flow" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combined">
          <Card>
            <CardHeader>
              <CardTitle>Combined Cash Flow Projection</CardTitle>
              <CardDescription>
                Stacked bars with cumulative line overlay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      tickFormatter={formatPeriodLabel}
                    />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="receivables" 
                      name="Receivables" 
                      stackId="a" 
                      fill="#4f46e5" 
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="incentives" 
                      name="Incentives" 
                      stackId="a" 
                      fill="#10b981"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="cumulativeTotal" 
                      name="Cumulative Cash Flow" 
                      stroke="#ff7300" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Projected Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(cumulativeData[cumulativeData.length - 1]?.cumulativeTotal || 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              Over {forecastMonths} months
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">From Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                chartData.reduce((sum, item) => sum + item.receivables, 0)
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round(
                (chartData.reduce((sum, item) => sum + item.receivables, 0) / 
                cumulativeData[cumulativeData.length - 1]?.cumulativeTotal || 0) * 100
              )}% of total
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">From Incentives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                chartData.reduce((sum, item) => sum + item.incentives, 0)
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round(
                (chartData.reduce((sum, item) => sum + item.incentives, 0) / 
                cumulativeData[cumulativeData.length - 1]?.cumulativeTotal || 0) * 100
              )}% of total
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CashFlowCharts;