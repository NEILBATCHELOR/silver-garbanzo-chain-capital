import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, PlusCircle, BarChart3, FolderPlus, Edit, Trash2, ArrowUpDown, Zap, Gift, Leaf } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EnhancedDataTable } from "@/components/ui/enhanced-data-table";
import { ColumnDef } from "@tanstack/react-table";

// Climate types and services
import {
  ClimateTokenizationPool,
  EnergyAsset,
  ClimateIncentive,
  RenewableEnergyCredit,
  RiskLevel,
  IncentiveStatus,
  RECStatus,
  EnergyAssetType,
  IncentiveType,
  RECMarketType
} from "../../../types";
import {
  tokenizationPoolsService,
  energyAssetsService,
  incentivesService,
  recsService
} from "../../../services";
import { supabase } from "@/infrastructure/database/client";

interface ClimatePoolManagerProps {
  projectId?: string;
}

interface PoolFormData {
  name: string;
  riskProfile: RiskLevel;
  selectedAssetIds: string[];
  selectedIncentiveIds: string[];
  selectedRecIds: string[];
}

/**
 * Climate Pool Manager - Enhanced pool management for Energy Assets, RECs, and Incentives
 * Follows the same pattern as factoring PoolManager.tsx with climate-specific enhancements
 */
const ClimatePoolManager: React.FC<ClimatePoolManagerProps> = ({ projectId }) => {
  const params = useParams();
  const currentProjectId = projectId || params.projectId;
  const { toast } = useToast();

  // State management
  const [pools, setPools] = useState<ClimateTokenizationPool[]>([]);
  const [energyAssets, setEnergyAssets] = useState<EnergyAsset[]>([]);
  const [incentives, setIncentives] = useState<ClimateIncentive[]>([]);
  const [recs, setRecs] = useState<RenewableEnergyCredit[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [selectedPool, setSelectedPool] = useState<ClimateTokenizationPool | null>(null);
  const [activeTab, setActiveTab] = useState<"pools" | "pool-detail" | "add-assets">("pools");
  const [assetTab, setAssetTab] = useState<"energy-assets" | "incentives" | "recs">("energy-assets");
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addAssetsDialogOpen, setAddAssetsDialogOpen] = useState(false);
  
  // Form state
  const [poolFormData, setPoolFormData] = useState<PoolFormData>({
    name: "",
    riskProfile: RiskLevel.MEDIUM,
    selectedAssetIds: [],
    selectedIncentiveIds: [],
    selectedRecIds: []
  });

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<EnergyAssetType | "all">("all");
  const [incentiveTypeFilter, setIncentiveTypeFilter] = useState<IncentiveType | "all">("all");
  const [recMarketFilter, setRecMarketFilter] = useState<RECMarketType | "all">("all");

  // Load data on component mount
  useEffect(() => {
    fetchAllData();
  }, [currentProjectId]);

  /**
   * Fetch all data needed for pool management
   */
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch pools
      const poolsData = await tokenizationPoolsService.getAll(undefined, currentProjectId);
      setPools(poolsData);

      // Fetch available assets (unassigned to pools)
      const [assetsData, incentivesData, recsData] = await Promise.all([
        energyAssetsService.getAll(),
        incentivesService.getAll(),
        recsService.getAll()
      ]);

      setEnergyAssets(assetsData);
      setIncentives(incentivesData);
      setRecs(recsData);
      
    } catch (error) {
      console.error("Error fetching climate data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch climate data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentProjectId, toast]);

  /**
   * Get unassigned assets (not in any pool)
   */
  const getUnassignedAssets = useCallback(async (assetType: 'energy' | 'incentive' | 'rec') => {
    try {
      let query;
      
      switch (assetType) {
        case 'energy':
          // Get asset IDs that are already in pools
          const { data: poolAssets } = await supabase
            .from('climate_pool_energy_assets')
            .select('asset_id');
          
          const assignedAssetIds = poolAssets?.map(pa => pa.asset_id) || [];
          return energyAssets.filter(asset => !assignedAssetIds.includes(asset.assetId));
          
        case 'incentive':
          const { data: poolIncentives } = await supabase
            .from('climate_pool_incentives')
            .select('incentive_id');
          
          const assignedIncentiveIds = poolIncentives?.map(pi => pi.incentive_id) || [];
          return incentives.filter(incentive => !assignedIncentiveIds.includes(incentive.incentiveId));
          
        case 'rec':
          const { data: poolRecs } = await supabase
            .from('climate_pool_recs')
            .select('rec_id');
          
          const assignedRecIds = poolRecs?.map(pr => pr.rec_id) || [];
          return recs.filter(rec => !assignedRecIds.includes(rec.recId));
          
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error getting unassigned ${assetType} assets:`, error);
      return [];
    }
  }, [energyAssets, incentives, recs]);

  /**
   * Create new pool with selected assets
   */
  const handleCreatePool = async () => {
    if (!poolFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Pool name is required",
        variant: "destructive",
      });
      return;
    }

    const totalSelectedAssets = poolFormData.selectedAssetIds.length + 
                               poolFormData.selectedIncentiveIds.length + 
                               poolFormData.selectedRecIds.length;

    if (totalSelectedAssets === 0) {
      toast({
        title: "Validation Error", 
        description: "At least one asset must be selected",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Calculate total value from selected assets
      const selectedAssets = energyAssets.filter(asset => poolFormData.selectedAssetIds.includes(asset.assetId));
      const selectedIncentivesData = incentives.filter(inc => poolFormData.selectedIncentiveIds.includes(inc.incentiveId));
      const selectedRecsData = recs.filter(rec => poolFormData.selectedRecIds.includes(rec.recId));
      
      const totalValue = selectedAssets.reduce((sum, asset) => sum + (asset.capacity * 1000), 0) + // Rough value estimate
                        selectedIncentivesData.reduce((sum, inc) => sum + inc.amount, 0) +
                        selectedRecsData.reduce((sum, rec) => sum + rec.totalValue, 0);

      // Create the pool
      const poolData = {
        name: poolFormData.name,
        total_value: totalValue,
        risk_profile: poolFormData.riskProfile,
        project_id: currentProjectId
      };

      const { data: newPool, error: poolError } = await supabase
        .from("climate_tokenization_pools")
        .insert(poolData)
        .select()
        .single();

      if (poolError) throw poolError;

      // Add energy assets to pool
      if (poolFormData.selectedAssetIds.length > 0) {
        const assetPoolData = poolFormData.selectedAssetIds.map(assetId => ({
          pool_id: newPool.pool_id,
          asset_id: assetId,
          project_id: currentProjectId
        }));

        const { error: assetError } = await supabase
          .from("climate_pool_energy_assets")
          .insert(assetPoolData);

        if (assetError) throw assetError;
      }

      // Add incentives to pool
      if (poolFormData.selectedIncentiveIds.length > 0) {
        const incentivePoolData = poolFormData.selectedIncentiveIds.map(incentiveId => ({
          pool_id: newPool.pool_id,
          incentive_id: incentiveId,
          project_id: currentProjectId
        }));

        const { error: incentiveError } = await supabase
          .from("climate_pool_incentives")
          .insert(incentivePoolData);

        if (incentiveError) throw incentiveError;
      }

      // Add RECs to pool
      if (poolFormData.selectedRecIds.length > 0) {
        const recPoolData = poolFormData.selectedRecIds.map(recId => ({
          pool_id: newPool.pool_id,
          rec_id: recId,
          project_id: currentProjectId
        }));

        const { error: recError } = await supabase
          .from("climate_pool_recs")
          .insert(recPoolData);

        if (recError) throw recError;
      }

      toast({
        title: "Success",
        description: `Pool "${poolFormData.name}" created successfully with ${totalSelectedAssets} assets`,
        variant: "default",
      });

      // Reset form and refresh data
      setPoolFormData({
        name: "",
        riskProfile: RiskLevel.MEDIUM,
        selectedAssetIds: [],
        selectedIncentiveIds: [],
        selectedRecIds: []
      });
      setCreateDialogOpen(false);
      await fetchAllData();
      setActiveTab("pools");

    } catch (error) {
      console.error("Error creating pool:", error);
      toast({
        title: "Error",
        description: "Failed to create pool. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete pool and unassign all assets
   */
  const handleDeletePool = async (pool: ClimateTokenizationPool) => {
    if (!confirm(`Are you sure you want to delete pool "${pool.name}"? This will unassign all assets from the pool.`)) {
      return;
    }

    try {
      setLoading(true);

      // Delete pool asset relationships
      await Promise.all([
        supabase.from("climate_pool_energy_assets").delete().eq("pool_id", pool.poolId),
        supabase.from("climate_pool_incentives").delete().eq("pool_id", pool.poolId),
        supabase.from("climate_pool_recs").delete().eq("pool_id", pool.poolId)
      ]);

      // Delete the pool
      const { error } = await supabase
        .from("climate_tokenization_pools")
        .delete()
        .eq("pool_id", pool.poolId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Pool "${pool.name}" deleted successfully`,
        variant: "default",
      });

      await fetchAllData();

      if (selectedPool?.poolId === pool.poolId) {
        setSelectedPool(null);
        setActiveTab("pools");
      }

    } catch (error) {
      console.error("Error deleting pool:", error);
      toast({
        title: "Error",
        description: "Failed to delete pool",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * View pool details with assets
   */
  const handleViewPool = async (pool: ClimateTokenizationPool) => {
    setSelectedPool(pool);
    setActiveTab("pool-detail");
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get risk badge color
  const getRiskBadgeColor = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.LOW: return 'bg-green-500';
      case RiskLevel.MEDIUM: return 'bg-yellow-500'; 
      case RiskLevel.HIGH: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Pool table columns
  const poolColumns = useMemo<ColumnDef<ClimateTokenizationPool, any>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Pool Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "riskProfile",
      header: "Risk Profile",
      cell: ({ row }) => (
        <Badge className={getRiskBadgeColor(row.original.riskProfile)}>
          {row.original.riskProfile}
        </Badge>
      ),
    },
    {
      accessorKey: "totalValue",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Total Value
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatCurrency(row.original.totalValue || 0),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const pool = row.original;
        return (
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewPool(pool)}
            >
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeletePool(pool)}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="mx-6 my-4 space-y-6">
      {/* Navigation */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Climate Asset Pool Management</h2>
        <div className="flex space-x-2">
          {activeTab === "pool-detail" && selectedPool && (
            <Button variant="outline" onClick={() => { setSelectedPool(null); setActiveTab("pools"); }}>
              Back to Pools
            </Button>
          )}
          {activeTab === "pools" && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Pool
            </Button>
          )}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "pools" && (
        <Card>
          <CardHeader>
            <CardTitle>Tokenization Pools</CardTitle>
            <CardDescription>
              Manage pools of energy assets, RECs, and incentives for tokenization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <EnhancedDataTable
                columns={poolColumns}
                data={pools}
                searchKey="name"
                searchPlaceholder="Search pools..."
                exportFilename="climate-pools-export"
              />
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "pool-detail" && selectedPool && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedPool.name}</CardTitle>
              <CardDescription>
                {selectedPool.riskProfile} Risk | {formatCurrency(selectedPool.totalValue)} Total Value
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Created: {new Date(selectedPool.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
          
          {/* Pool Assets Tabs */}
          <Card>
            <CardContent className="p-6">
              <Tabs value={assetTab} onValueChange={(value) => setAssetTab(value as typeof assetTab)}>
                <TabsList>
                  <TabsTrigger value="energy-assets">
                    <Zap className="h-4 w-4 mr-2" />
                    Energy Assets
                  </TabsTrigger>
                  <TabsTrigger value="incentives">
                    <Gift className="h-4 w-4 mr-2" />
                    Incentives  
                  </TabsTrigger>
                  <TabsTrigger value="recs">
                    <Leaf className="h-4 w-4 mr-2" />
                    RECs
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="energy-assets">
                  <div className="text-center py-8">
                    <p>Energy assets in this pool will be displayed here</p>
                    <p className="text-sm text-muted-foreground mt-2">Pool asset detail functionality coming soon</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="incentives">
                  <div className="text-center py-8">
                    <p>Climate incentives in this pool will be displayed here</p>
                    <p className="text-sm text-muted-foreground mt-2">Pool asset detail functionality coming soon</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="recs">
                  <div className="text-center py-8">
                    <p>Renewable energy credits in this pool will be displayed here</p>
                    <p className="text-sm text-muted-foreground mt-2">Pool asset detail functionality coming soon</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Pool Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Climate Asset Pool</DialogTitle>
            <DialogDescription>
              Create a new pool and assign energy assets, RECs, and incentives to it
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Pool Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="poolName">Pool Name</Label>
                <Input
                  id="poolName"
                  value={poolFormData.name}
                  onChange={(e) => setPoolFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter pool name"
                />
              </div>
              
              <div>
                <Label>Risk Profile</Label>
                <Select 
                  value={poolFormData.riskProfile}
                  onValueChange={(value) => setPoolFormData(prev => ({ ...prev, riskProfile: value as RiskLevel }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RiskLevel.LOW}>Low Risk</SelectItem>
                    <SelectItem value={RiskLevel.MEDIUM}>Medium Risk</SelectItem>
                    <SelectItem value={RiskLevel.HIGH}>High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Asset Selection */}
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Selected: {poolFormData.selectedAssetIds.length} Energy Assets, {poolFormData.selectedIncentiveIds.length} Incentives, {poolFormData.selectedRecIds.length} RECs
              </div>
              
              <Tabs defaultValue="energy-assets" className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="energy-assets">
                    <Zap className="h-4 w-4 mr-2" />
                    Energy Assets ({energyAssets.length})
                  </TabsTrigger>
                  <TabsTrigger value="incentives">
                    <Gift className="h-4 w-4 mr-2" />
                    Incentives ({incentives.length})
                  </TabsTrigger>
                  <TabsTrigger value="recs">
                    <Leaf className="h-4 w-4 mr-2" />
                    RECs ({recs.length})
                  </TabsTrigger>
                </TabsList>
                
                {/* Energy Assets Tab */}
                <TabsContent value="energy-assets" className="space-y-4">
                  <div className="h-60 border rounded-md overflow-auto p-4">
                    {energyAssets.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No energy assets available
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {energyAssets.map(asset => (
                          <div key={asset.assetId} className="flex items-center space-x-3">
                            <Checkbox
                              id={`asset-${asset.assetId}`}
                              checked={poolFormData.selectedAssetIds.includes(asset.assetId)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setPoolFormData(prev => ({
                                    ...prev,
                                    selectedAssetIds: [...prev.selectedAssetIds, asset.assetId]
                                  }));
                                } else {
                                  setPoolFormData(prev => ({
                                    ...prev,
                                    selectedAssetIds: prev.selectedAssetIds.filter(id => id !== asset.assetId)
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={`asset-${asset.assetId}`} className="flex-1 cursor-pointer">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">{asset.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {asset.type} | {asset.location} | {asset.capacity} MW
                                  </div>
                                </div>
                                <Badge variant="outline">{asset.type}</Badge>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                {/* Incentives Tab */}
                <TabsContent value="incentives" className="space-y-4">
                  <div className="h-60 border rounded-md overflow-auto p-4">
                    {incentives.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No incentives available
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {incentives.map(incentive => (
                          <div key={incentive.incentiveId} className="flex items-center space-x-3">
                            <Checkbox
                              id={`incentive-${incentive.incentiveId}`}
                              checked={poolFormData.selectedIncentiveIds.includes(incentive.incentiveId)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setPoolFormData(prev => ({
                                    ...prev,
                                    selectedIncentiveIds: [...prev.selectedIncentiveIds, incentive.incentiveId]
                                  }));
                                } else {
                                  setPoolFormData(prev => ({
                                    ...prev,
                                    selectedIncentiveIds: prev.selectedIncentiveIds.filter(id => id !== incentive.incentiveId)
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={`incentive-${incentive.incentiveId}`} className="flex-1 cursor-pointer">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">{incentive.type}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatCurrency(incentive.amount)} | Status: {incentive.status}
                                  </div>
                                </div>
                                <Badge variant={incentive.status === IncentiveStatus.RECEIVED ? "default" : "outline"}>
                                  {incentive.status}
                                </Badge>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                {/* RECs Tab */}
                <TabsContent value="recs" className="space-y-4">
                  <div className="h-60 border rounded-md overflow-auto p-4">
                    {recs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No RECs available
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recs.map(rec => (
                          <div key={rec.recId} className="flex items-center space-x-3">
                            <Checkbox
                              id={`rec-${rec.recId}`}
                              checked={poolFormData.selectedRecIds.includes(rec.recId)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setPoolFormData(prev => ({
                                    ...prev,
                                    selectedRecIds: [...prev.selectedRecIds, rec.recId]
                                  }));
                                } else {
                                  setPoolFormData(prev => ({
                                    ...prev,
                                    selectedRecIds: prev.selectedRecIds.filter(id => id !== rec.recId)
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={`rec-${rec.recId}`} className="flex-1 cursor-pointer">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">{rec.quantity} RECs - {rec.vintageYear}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {rec.marketType} | {formatCurrency(rec.totalValue)} | {rec.pricePerRec}/REC
                                  </div>
                                </div>
                                <Badge variant={rec.status === RECStatus.AVAILABLE ? "default" : "outline"}>
                                  {rec.status}
                                </Badge>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePool} disabled={loading || !poolFormData.name.trim()}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Pool'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClimatePoolManager;