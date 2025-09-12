import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/infrastructure/database/client";
import { toast } from "@/components/ui/use-toast";
import { 
  ClimateReceivable, 
  EnergyAsset, 
  ClimateTokenizationPool, 
  ClimateIncentive, 
  CarbonOffset, 
  RenewableEnergyCredit 
} from "./types";

interface ClimateReceivablesDashboardProps {
  projectId: string;
}

/**
 * Dashboard for the Climate Receivables module
 */
const ClimateReceivablesDashboard: React.FC<ClimateReceivablesDashboardProps> = ({ projectId }) => {
  console.log("%c CLIMATE RECEIVABLES DASHBOARD MOUNTED ", "background: #10b981; color: white; font-size: 20px");
  console.log("ProjectID:", projectId);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    receivableCount: 0,
    assetCount: 0,
    poolCount: 0,
    incentiveCount: 0,
    carbonOffsetCount: 0,
    recCount: 0,
    totalReceivableValue: 0,
    totalIncentiveValue: 0,
    totalTokenizedValue: 0,
  });

  console.log("ClimateReceivablesDashboard rendered with projectId:", projectId);

  useEffect(() => {
    console.log("ClimateReceivablesDashboard useEffect triggered for projectId:", projectId);
    fetchStats();
  }, [projectId]);

  // Fetch dashboard stats with project filtering
  const fetchStats = async () => {
    if (!projectId) {
      console.error("No project ID provided to ClimateReceivablesDashboard");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching climate receivables stats for project:", projectId);

      // Note: These table names will need to be updated based on the actual schema
      // For now, using placeholder table names from the climate receivables schema

      // Fetch receivables count and total value
      const { data: receivables, error: receivablesError } = await supabase
        .from("climate_receivables")
        .select("amount");

      if (receivablesError && receivablesError.code !== 'PGRST116') {
        console.warn("Climate receivables table not found, using fallback:", receivablesError);
      }

      // Fetch assets count
      const { count: assetCount, error: assetError } = await supabase
        .from("energy_assets")
        .select("*", { count: "exact", head: true });

      if (assetError && assetError.code !== 'PGRST116') {
        console.warn("Energy assets table not found:", assetError);
      }

      // Fetch pools count
      const { count: poolCount, error: poolError } = await supabase
        .from("climate_tokenization_pools")
        .select("*", { count: "exact", head: true });

      if (poolError && poolError.code !== 'PGRST116') {
        console.warn("Climate tokenization pools table not found:", poolError);
      }

      // Fetch incentives count and total value
      const { data: incentives, error: incentivesError } = await supabase
        .from("climate_incentives")
        .select("amount");

      if (incentivesError && incentivesError.code !== 'PGRST116') {
        console.warn("Climate incentives table not found:", incentivesError);
      }

      // Fetch carbon offsets count
      const { count: carbonOffsetCount, error: carbonOffsetError } = await supabase
        .from("carbon_offsets")
        .select("*", { count: "exact", head: true });

      if (carbonOffsetError && carbonOffsetError.code !== 'PGRST116') {
        console.warn("Carbon offsets table not found:", carbonOffsetError);
      }

      // Fetch RECs count
      const { count: recCount, error: recError } = await supabase
        .from("renewable_energy_credits")
        .select("*", { count: "exact", head: true });

      if (recError && recError.code !== 'PGRST116') {
        console.warn("Renewable energy credits table not found:", recError);
      }

      // Calculate total values
      const totalReceivableValue = receivables?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalIncentiveValue = incentives?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      const newStats = {
        receivableCount: receivables?.length || 0,
        assetCount: assetCount || 0,
        poolCount: poolCount || 0,
        incentiveCount: incentives?.length || 0,
        carbonOffsetCount: carbonOffsetCount || 0,
        recCount: recCount || 0,
        totalReceivableValue,
        totalIncentiveValue,
        totalTokenizedValue: 0, // This would require a more complex query
      };

      console.log(`Fetched climate receivables stats:`, newStats);
      setStats(newStats);
    } catch (error) {
      console.error("Error fetching climate receivables dashboard stats:", error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchStats();
  };

  // Navigation helpers for project-aware URLs
  const getProjectUrl = (path: string) => {
    return projectId ? `/projects/${projectId}/climate-receivables${path}` : `/climate-receivables${path}`;
  };

  // Show loading skeleton during initial load
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-80 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Climate Receivables Dashboard</h1>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate(getProjectUrl("/assets/new"))}
          >
            New Energy Asset
          </Button>
          <Button 
            onClick={() => navigate(getProjectUrl("/receivables/new"))}
          >
            New Receivable
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Receivables</CardTitle>
            <CardDescription>Total value and count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalReceivableValue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">{stats.receivableCount} receivables</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Energy Assets</CardTitle>
            <CardDescription>Renewable energy producers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assetCount}</div>
            <div className="text-sm text-muted-foreground">Energy assets</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Financial Incentives</CardTitle>
            <CardDescription>RECs, carbon offsets, tax credits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalIncentiveValue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">
              {stats.incentiveCount} incentives, {stats.recCount} RECs, {stats.carbonOffsetCount} carbon offsets
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground mb-4">
          <TabsTrigger value="overview" className="px-3 py-1.5">Overview</TabsTrigger>
          <TabsTrigger value="receivables" className="px-3 py-1.5">Receivables</TabsTrigger>
          <TabsTrigger value="assets" className="px-3 py-1.5">Energy Assets</TabsTrigger>
          <TabsTrigger value="pools" className="px-3 py-1.5">Tokenization Pools</TabsTrigger>
          <TabsTrigger value="incentives" className="px-3 py-1.5">Incentives</TabsTrigger>
          <TabsTrigger value="carbonOffsets" className="px-3 py-1.5">Carbon Offsets</TabsTrigger>
          <TabsTrigger value="recs" className="px-3 py-1.5">RECs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>
                Summary of climate receivables, energy assets, and financial incentives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>The Climate Receivables module enables management of renewable energy receivables, carbon offsets, and renewable energy credits (RECs). Use this dashboard to track receivables, energy assets, and various financial incentives.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Tokenization Pools</div>
                  <div className="text-xl font-bold">{stats.poolCount}</div>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Tokenized Value</div>
                  <div className="text-xl font-bold">${stats.totalTokenizedValue.toLocaleString()}</div>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Carbon Offsets</div>
                  <div className="text-xl font-bold">{stats.carbonOffsetCount}</div>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">RECs</div>
                  <div className="text-xl font-bold">{stats.recCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="receivables">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Receivables</CardTitle>
                <CardDescription>Manage renewable energy receivables</CardDescription>
              </div>
              <Button 
                onClick={() => navigate(getProjectUrl("/receivables"))}
                variant="outline"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <p>Receivable management section coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Energy Assets</CardTitle>
                <CardDescription>Manage renewable energy assets</CardDescription>
              </div>
              <Button 
                onClick={() => navigate(getProjectUrl("/assets"))}
                variant="outline"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <p>Energy asset management section coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pools">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tokenization Pools</CardTitle>
                <CardDescription>Manage pools of receivables</CardDescription>
              </div>
              <Button 
                onClick={() => navigate(getProjectUrl("/pools"))}
                variant="outline"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <p>Pool management section coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="incentives">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Financial Incentives</CardTitle>
                <CardDescription>Manage tax credits, grants, and subsidies</CardDescription>
              </div>
              <Button 
                onClick={() => navigate(getProjectUrl("/incentives"))}
                variant="outline"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <p>Incentive management section coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="carbonOffsets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Carbon Offsets</CardTitle>
                <CardDescription>Manage carbon credit projects</CardDescription>
              </div>
              <Button 
                onClick={() => navigate(getProjectUrl("/carbon-offsets"))}
                variant="outline"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <p>Carbon offset management section coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Renewable Energy Credits (RECs)</CardTitle>
                <CardDescription>Manage renewable energy certificates</CardDescription>
              </div>
              <Button 
                onClick={() => navigate(getProjectUrl("/recs"))}
                variant="outline"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <p>REC management section coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClimateReceivablesDashboard;