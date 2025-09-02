import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUp, ArrowDown, DollarSign, Wind, Sun, Leaf, Award, AlertTriangle } from "lucide-react";
import BarChart from "@/components/ui/bar-chart";
import LineChart from "@/components/ui/line-chart";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  climateReceivablesService, 
  energyAssetsService, 
  CarbonOffsetsService, 
  recsService 
} from '../../services';

/**
 * Dashboard component for the Climate Receivables module
 * Displays key metrics, charts, and quick access to main features
 */
export function ClimateReceivablesDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    totalReceivables: { value: 0, change: 0 },
    activeAssets: { value: 0, change: 0 },
    carbonOffsets: { value: 0, change: 0 },
    recs: { value: 0, change: 0 },
    receivablesAtRisk: { value: 0, percentage: 0 },
    upcomingCashFlow: { value: 325000, timeframe: '30 days' },
    productionEfficiency: { value: 92, target: 95 },
    tokenizationRate: { value: 65, change: 15 }
  });

  // Fetch dashboard data from various services
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch data from multiple services in parallel
        const [receivablesSummary, assetsSummary, offsetsSummary, recsSummary] = await Promise.all([
          climateReceivablesService.getReceivablesSummary(),
          energyAssetsService.getAssetsSummary(),
          CarbonOffsetsService.getOffsetsSummary(),
          recsService.getRECsSummary()
        ]);
        
        // Aggregate RECs data from the array response
        const totalRECsQuantity = recsSummary.reduce((sum, rec) => sum + rec.totalQuantity, 0);
        
        // Calculate percentage changes (would need historical data for real implementation)
        setDashboardData({
          totalReceivables: { 
            value: receivablesSummary.totalAmount, 
            change: 12.5 // This would come from comparing with previous period
          },
          activeAssets: { 
            value: assetsSummary.totalCount, 
            change: 2 // This would come from comparing with previous period
          },
          carbonOffsets: { 
            value: offsetsSummary.totalAmount, 
            change: 25 // This would come from comparing with previous period
          },
          recs: { 
            value: totalRECsQuantity, 
            change: -5 // This would come from comparing with previous period
          },
          receivablesAtRisk: { 
            value: receivablesSummary.countByRiskLevel.high * 25000, // Estimated
            percentage: (receivablesSummary.countByRiskLevel.high / (receivablesSummary.countByRiskLevel.low + receivablesSummary.countByRiskLevel.medium + receivablesSummary.countByRiskLevel.high)) * 100
          },
          upcomingCashFlow: { value: 325000, timeframe: '30 days' },
          productionEfficiency: { value: 92, target: 95 },
          tokenizationRate: { value: 65, change: 15 }
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Handle error appropriately
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Mock chart data formatted correctly for BarChart component
  const cashFlowChartData = [
    { label: "Jan", value: 230000, color: "rgba(75, 192, 192, 0.8)" },
    { label: "Feb", value: 250000, color: "rgba(75, 192, 192, 0.8)" },
    { label: "Mar", value: 250000, color: "rgba(75, 192, 192, 0.8)" },
    { label: "Apr", value: 285000, color: "rgba(75, 192, 192, 0.8)" },
    { label: "May", value: 265000, color: "rgba(75, 192, 192, 0.8)" },
    { label: "Jun", value: 325000, color: "rgba(75, 192, 192, 0.8)" }
  ];

  // Mock line chart data formatted correctly for LineChart component
  const productionChartData = {
    series: [
      {
        name: "Solar Output",
        color: "rgb(255, 159, 64)",
        data: [
          { x: "Jan", y: 420 },
          { x: "Feb", y: 380 },
          { x: "Mar", y: 510 },
          { x: "Apr", y: 590 },
          { x: "May", y: 620 },
          { x: "Jun", y: 650 }
        ]
      },
      {
        name: "Wind Output",
        color: "rgb(54, 162, 235)",
        data: [
          { x: "Jan", y: 350 },
          { x: "Feb", y: 390 },
          { x: "Mar", y: 420 },
          { x: "Apr", y: 380 },
          { x: "May", y: 410 },
          { x: "Jun", y: 440 }
        ]
      }
    ]
  };

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Climate Receivables Dashboard</h1>
        <div className="flex space-x-2">
          <Button onClick={() => handleQuickAction('/climate-receivables/receivables/create')}>
            Add Receivable
          </Button>
          <Button onClick={() => handleQuickAction('/climate-receivables/assets/create')}>
            Add Asset
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="environmental">Environmental</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(dashboardData.totalReceivables.value).toLocaleString()}</div>
                <p className={cn("text-xs", 
                  dashboardData.totalReceivables.change > 0 
                    ? "text-green-500" 
                    : "text-red-500")}>
                  {dashboardData.totalReceivables.change > 0 ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />}
                  {Math.abs(dashboardData.totalReceivables.change)}% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
                <Sun className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.activeAssets.value}</div>
                <p className={cn("text-xs", 
                  dashboardData.activeAssets.change > 0 
                    ? "text-green-500" 
                    : "text-red-500")}>
                  {dashboardData.activeAssets.change > 0 ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />}
                  {Math.abs(dashboardData.activeAssets.change)} from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Carbon Offsets (tons)</CardTitle>
                <Leaf className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.carbonOffsets.value.toLocaleString()}</div>
                <p className={cn("text-xs", 
                  dashboardData.carbonOffsets.change > 0 
                    ? "text-green-500" 
                    : "text-red-500")}>
                  {dashboardData.carbonOffsets.change > 0 ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />}
                  {Math.abs(dashboardData.carbonOffsets.change)}% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RECs (MWh)</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.recs.value.toLocaleString()}</div>
                <p className={cn("text-xs", 
                  dashboardData.recs.change > 0 
                    ? "text-green-500" 
                    : "text-red-500")}>
                  {dashboardData.recs.change > 0 ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />}
                  {Math.abs(dashboardData.recs.change)}% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Forecast</CardTitle>
                <CardDescription>Projected receivables and incentives for the next 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart data={cashFlowChartData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Energy Production</CardTitle>
                <CardDescription>Monthly output from renewable energy assets</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart series={productionChartData.series} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
                <Sun className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.activeAssets.value}</div>
                <p className="text-xs text-muted-foreground">
                  Total operational renewable energy assets
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Production Efficiency</CardTitle>
                <Wind className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.productionEfficiency.value}%</div>
                <p className="text-xs text-muted-foreground">
                  Target: {dashboardData.productionEfficiency.target}%
                </p>
              </CardContent>
            </Card>
            {/* Additional asset-related metrics would go here */}
          </div>
          
          {/* Additional asset-related charts would go here */}
        </TabsContent>

        <TabsContent value="financials" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receivables at Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${dashboardData.receivablesAtRisk.value.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.receivablesAtRisk.percentage}% of total receivables
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Cash Flow</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${dashboardData.upcomingCashFlow.value.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Expected in next {dashboardData.upcomingCashFlow.timeframe}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tokenization Rate</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.tokenizationRate.value}%</div>
                <p className={cn("text-xs", 
                  dashboardData.tokenizationRate.change > 0 
                    ? "text-green-500" 
                    : "text-red-500")}>
                  {dashboardData.tokenizationRate.change > 0 ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />}
                  {Math.abs(dashboardData.tokenizationRate.change)}% from last month
                </p>
              </CardContent>
            </Card>
            {/* Additional financial metrics would go here */}
          </div>
          
          {/* Additional financial charts would go here */}
        </TabsContent>

        <TabsContent value="environmental" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Carbon Offsets (tons)</CardTitle>
                <Leaf className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.carbonOffsets.value.toLocaleString()}</div>
                <p className={cn("text-xs", 
                  dashboardData.carbonOffsets.change > 0 
                    ? "text-green-500" 
                    : "text-red-500")}>
                  {dashboardData.carbonOffsets.change > 0 ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />}
                  {Math.abs(dashboardData.carbonOffsets.change)}% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RECs (MWh)</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.recs.value.toLocaleString()}</div>
                <p className={cn("text-xs", 
                  dashboardData.recs.change > 0 
                    ? "text-green-500" 
                    : "text-red-500")}>
                  {dashboardData.recs.change > 0 ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />}
                  {Math.abs(dashboardData.recs.change)}% from last month
                </p>
              </CardContent>
            </Card>
            {/* Additional environmental metrics would go here */}
          </div>
          
          {/* Additional environmental charts would go here */}
        </TabsContent>
      </Tabs>
    </div>
  );
}