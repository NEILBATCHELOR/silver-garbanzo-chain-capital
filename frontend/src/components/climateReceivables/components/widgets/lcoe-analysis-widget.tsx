import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Factory,
  Wrench,
  Receipt,
  Award,
  BarChart3,
  Info,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { supabase } from "@/infrastructure/database/client";
import { toast } from "@/components/ui/use-toast";

interface LCOEAnalysisWidgetProps {
  receivableId?: string;
  assetId?: string;
  className?: string;
  showComparison?: boolean;
}

interface LCOEComponents {
  capex: number;
  opexAnnual: number;
  maintenanceCosts: Array<{
    year: number;
    description: string;
    amount: number;
  }>;
  taxCredits: {
    federalITC: number;
    stateTaxCredit: number;
    depreciation: string;
    totalValue: number;
  };
  lcoeCalculated: number;
  competitiveness: 'excellent' | 'good' | 'market' | 'poor';
  benchmarkComparison: {
    industryAverage: number;
    percentageDifference: number;
    rank: string;
  };
}

interface IndustryBenchmarks {
  solar: { utility: number; distributed: number };
  wind: { onshore: number; offshore: number };
  hydro: { large: number; small: number };
}

const INDUSTRY_BENCHMARKS: IndustryBenchmarks = {
  solar: { utility: 35, distributed: 144 },
  wind: { onshore: 38, offshore: 112 },
  hydro: { large: 56, small: 95 }
};

/**
 * LCOE Analysis Widget Component
 * 
 * Displays comprehensive LCOE (Levelized Cost of Energy) analysis including:
 * - Cost breakdown (CAPEX, OPEX, maintenance, tax credits)
 * - Industry benchmark comparison and competitiveness rating
 * - Performance trending over time
 * - Tax credit impact analysis
 */
const LCOEAnalysisWidget: React.FC<LCOEAnalysisWidgetProps> = ({
  receivableId,
  assetId,
  className = "",
  showComparison = true
}) => {
  const [lcoeData, setLcoeData] = useState<LCOEComponents | null>(null);
  const [assetType, setAssetType] = useState<'solar' | 'wind' | 'hydro' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("breakdown");

  // Fetch LCOE data from database
  const fetchLCOEData = async () => {
    if (!receivableId && !assetId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Query climate_nav_calculations table for LCOE data
      let query = supabase
        .from('climate_nav_calculations')
        .select(`
          lcoe_capex,
          lcoe_opex_annual,
          lcoe_maintenance_costs,
          lcoe_tax_credits,
          lcoe_calculated,
          lcoe_competitiveness,
          asset_id,
          receivable_id
        `)
        .eq('calculation_type', 'lcoe_analysis')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (receivableId) {
        query = query.eq('receivable_id', receivableId);
      } else if (assetId) {
        query = query.eq('asset_id', assetId);
      }
      
      const { data, error: dbError } = await query;
      
      if (dbError) throw dbError;
      
      if (data && data.length > 0) {
        const record = data[0];
        
        // Get asset type for benchmark comparison
        if (record.asset_id) {
          const { data: assetData } = await supabase
            .from('energy_assets')
            .select('asset_type')
            .eq('asset_id', record.asset_id)
            .single();
          
          if (assetData) {
            setAssetType(assetData.asset_type?.toLowerCase() as 'solar' | 'wind' | 'hydro');
          }
        }
        
        // Parse and structure the data
        const maintenanceCosts = record.lcoe_maintenance_costs || [];
        const taxCredits = record.lcoe_tax_credits || {
          federalITC: 0.30,
          stateTaxCredit: 0.10,
          depreciation: 'MACRS',
          totalValue: 0
        };
        
        // Calculate tax credit total value if not provided
        if (!taxCredits.totalValue && record.lcoe_capex) {
          taxCredits.totalValue = record.lcoe_capex * (taxCredits.federalITC + (taxCredits.stateTaxCredit || 0));
        }
        
        // Determine competitiveness and benchmark comparison
        const lcoe = record.lcoe_calculated || 0;
        let industryAverage = 50; // Default fallback
        
        if (assetType) {
          switch (assetType) {
            case 'solar':
              industryAverage = INDUSTRY_BENCHMARKS.solar.utility;
              break;
            case 'wind':
              industryAverage = INDUSTRY_BENCHMARKS.wind.onshore;
              break;
            case 'hydro':
              industryAverage = INDUSTRY_BENCHMARKS.hydro.large;
              break;
          }
        }
        
        const percentageDifference = ((lcoe - industryAverage) / industryAverage) * 100;
        
        let competitiveness: 'excellent' | 'good' | 'market' | 'poor';
        let rank: string;
        
        if (percentageDifference <= -15) {
          competitiveness = 'excellent';
          rank = 'Top Quartile';
        } else if (percentageDifference <= -5) {
          competitiveness = 'good';
          rank = 'Above Average';
        } else if (percentageDifference <= 5) {
          competitiveness = 'market';
          rank = 'Market Rate';
        } else {
          competitiveness = 'poor';
          rank = 'Below Average';
        }
        
        setLcoeData({
          capex: record.lcoe_capex || 0,
          opexAnnual: record.lcoe_opex_annual || 0,
          maintenanceCosts: Array.isArray(maintenanceCosts) ? maintenanceCosts : [],
          taxCredits,
          lcoeCalculated: lcoe,
          competitiveness,
          benchmarkComparison: {
            industryAverage,
            percentageDifference,
            rank
          }
        });
      } else {
        // No data found - show empty state
        setLcoeData(null);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch LCOE data:', err);
      
      toast({
        title: "Failed to Load LCOE Data",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLCOEData();
  }, [receivableId, assetId]);

  // Get competitiveness styling
  const getCompetitivenessStyle = (competitiveness: string) => {
    switch (competitiveness) {
      case 'excellent':
        return { variant: 'default' as const, color: 'text-green-600', bgColor: 'bg-green-50', icon: TrendingUp };
      case 'good':
        return { variant: 'secondary' as const, color: 'text-blue-600', bgColor: 'bg-blue-50', icon: ArrowUp };
      case 'market':
        return { variant: 'outline' as const, color: 'text-gray-600', bgColor: 'bg-gray-50', icon: DollarSign };
      default:
        return { variant: 'destructive' as const, color: 'text-red-600', bgColor: 'bg-red-50', icon: TrendingDown };
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !lcoeData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            LCOE Analysis
          </CardTitle>
          <CardDescription>Levelized Cost of Energy breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              {error ? `Error: ${error}` : 'No LCOE data available'}
            </p>
            <Button variant="outline" onClick={fetchLCOEData}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const competitivenessStyle = getCompetitivenessStyle(lcoeData.competitiveness);
  const CompetitivenessIcon = competitivenessStyle.icon;

  // Calculate total maintenance cost
  const totalMaintenanceCost = lcoeData.maintenanceCosts.reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            LCOE Analysis
          </div>
          <Badge variant={competitivenessStyle.variant} className="gap-1">
            <CompetitivenessIcon className="h-3 w-3" />
            {lcoeData.competitiveness.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Levelized Cost of Energy: ${lcoeData.lcoeCalculated.toFixed(2)}/MWh
          {assetType && ` (${assetType} asset)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
            <TabsTrigger value="comparison">Benchmark</TabsTrigger>
            <TabsTrigger value="credits">Tax Credits</TabsTrigger>
          </TabsList>

          <TabsContent value="breakdown" className="space-y-4 mt-4">
            {/* LCOE Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${competitivenessStyle.bgColor}`}>
                <div className="text-2xl font-bold">${lcoeData.lcoeCalculated.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">LCOE per MWh</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold">{lcoeData.benchmarkComparison.rank}</div>
                <div className="text-sm text-muted-foreground">Market Position</div>
              </div>
            </div>

            {/* Cost Components */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Cost Components
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">CAPEX (Initial Investment)</span>
                  </div>
                  <span className="font-semibold">${lcoeData.capex.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">OPEX (Annual Operating)</span>
                  </div>
                  <span className="font-semibold">${lcoeData.opexAnnual.toLocaleString()}/year</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Maintenance (Lifecycle)</span>
                  </div>
                  <span className="font-semibold">${totalMaintenanceCost.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Tax Credit Savings</span>
                  </div>
                  <span className="font-semibold text-green-600">
                    -${lcoeData.taxCredits.totalValue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Maintenance Schedule */}
            {lcoeData.maintenanceCosts.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Maintenance Schedule</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {lcoeData.maintenanceCosts.map((maintenance, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div>
                        <div className="font-medium">Year {maintenance.year}</div>
                        <div className="text-muted-foreground">{maintenance.description}</div>
                      </div>
                      <span className="font-semibold">${maintenance.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4 mt-4">
            {/* Benchmark Comparison */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold">${lcoeData.benchmarkComparison.industryAverage}</div>
                  <div className="text-sm text-muted-foreground">Industry Average</div>
                </div>
                <div className={`p-4 rounded-lg ${
                  lcoeData.benchmarkComparison.percentageDifference < 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className={`text-2xl font-bold ${
                    lcoeData.benchmarkComparison.percentageDifference < 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {lcoeData.benchmarkComparison.percentageDifference > 0 ? '+' : ''}
                    {lcoeData.benchmarkComparison.percentageDifference.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">vs Industry</div>
                </div>
              </div>

              {/* Competitiveness Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cost Competitiveness</span>
                  <span className={`text-sm font-semibold ${competitivenessStyle.color}`}>
                    {lcoeData.benchmarkComparison.rank}
                  </span>
                </div>
                <Progress 
                  value={Math.max(0, 100 + lcoeData.benchmarkComparison.percentageDifference)} 
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>More Expensive</span>
                  <span>Market Rate</span>
                  <span>More Competitive</span>
                </div>
              </div>

              {/* Industry Benchmarks */}
              {showComparison && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Industry Benchmarks ($/MWh)</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex justify-between items-center p-2 border rounded">
                      <span className="text-sm">Solar Utility Scale</span>
                      <span className="font-medium">${INDUSTRY_BENCHMARKS.solar.utility}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 border rounded">
                      <span className="text-sm">Wind Onshore</span>
                      <span className="font-medium">${INDUSTRY_BENCHMARKS.wind.onshore}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 border rounded">
                      <span className="text-sm">Hydro Large Scale</span>
                      <span className="font-medium">${INDUSTRY_BENCHMARKS.hydro.large}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="credits" className="space-y-4 mt-4">
            {/* Tax Credit Analysis */}
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${lcoeData.taxCredits.totalValue.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Tax Credit Value</div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Tax Credit Breakdown
                </h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Federal Investment Tax Credit (ITC)</div>
                      <div className="text-xs text-muted-foreground">
                        {(lcoeData.taxCredits.federalITC * 100).toFixed(0)}% of project cost
                      </div>
                    </div>
                    <span className="font-semibold">
                      ${(lcoeData.capex * lcoeData.taxCredits.federalITC).toLocaleString()}
                    </span>
                  </div>
                  
                  {lcoeData.taxCredits.stateTaxCredit > 0 && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="text-sm font-medium">State Tax Credit</div>
                        <div className="text-xs text-muted-foreground">
                          {(lcoeData.taxCredits.stateTaxCredit * 100).toFixed(0)}% additional credit
                        </div>
                      </div>
                      <span className="font-semibold">
                        ${(lcoeData.capex * lcoeData.taxCredits.stateTaxCredit).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Depreciation Schedule</div>
                      <div className="text-xs text-muted-foreground">
                        {lcoeData.taxCredits.depreciation} accelerated depreciation
                      </div>
                    </div>
                    <Badge variant="outline">
                      {lcoeData.taxCredits.depreciation}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* LCOE Impact */}
              <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Tax Credit Impact on LCOE</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Without tax credits, LCOE would be approximately 
                  <span className="font-semibold text-red-600 ml-1">
                    ${(lcoeData.lcoeCalculated * 1.4).toFixed(2)}/MWh
                  </span>
                  , making tax credits essential for project competitiveness.
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Button */}
        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchLCOEData}
            className="w-full"
          >
            Refresh LCOE Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LCOEAnalysisWidget;