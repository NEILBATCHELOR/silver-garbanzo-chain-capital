import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Trash2, Plus, Users, FileText, DollarSign, Eye } from 'lucide-react';
import { tokenizationPoolsService } from '../../services';
import {
  ClimateTokenizationPool,
  ClimateReceivable,
  ClimateInvestorPool,
  RiskLevel
} from '../../types';

/**
 * Component for displaying detailed information about a specific tokenization pool
 */
const TokenizationPoolDetail: React.FC = () => {
  const { id, projectId } = useParams<{ id: string; projectId?: string }>();
  const navigate = useNavigate();
  
  // Helper function to generate project-aware URLs
  const getProjectUrl = (path: string) => {
    return projectId 
      ? `/projects/${projectId}/climate-receivables${path}`
      : `/climate-receivables${path}`;
  };
  const [pool, setPool] = useState<ClimateTokenizationPool | null>(null);
  const [receivables, setReceivables] = useState<ClimateReceivable[]>([]);
  const [investors, setInvestors] = useState<ClimateInvestorPool[]>([]);
  const [energyAssets, setEnergyAssets] = useState<any[]>([]);
  const [recs, setRECs] = useState<any[]>([]);
  const [incentives, setIncentives] = useState<any[]>([]);
  const [availableReceivables, setAvailableReceivables] = useState<ClimateReceivable[]>([]);
  const [availableEnergyAssets, setAvailableEnergyAssets] = useState<any[]>([]);
  const [availableRECs, setAvailableRECs] = useState<any[]>([]);
  const [availableIncentives, setAvailableIncentives] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [selectedReceivableId, setSelectedReceivableId] = useState<string>('');
  const [selectedEnergyAssetId, setSelectedEnergyAssetId] = useState<string>('');
  const [selectedRECId, setSelectedRECId] = useState<string>('');
  const [selectedIncentiveId, setSelectedIncentiveId] = useState<string>('');
  const [investorId, setInvestorId] = useState<string>('');
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  
  // Load pool data on component mount
  useEffect(() => {
    if (id) {
      loadPoolData(id);
    }
  }, [id]);
  
  /**
   * Load pool data and related entities
   */
  const loadPoolData = async (poolId: string) => {
    try {
      setLoading(true);
      
      // Load pool, receivables, investors, energy assets, RECs, incentives, and available entities in parallel
      const [
        poolData, 
        receivablesData, 
        investorsData, 
        energyAssetsData,
        recsData,
        incentivesData,
        availableReceivablesData,
        availableEnergyAssetsData,
        availableRECsData,
        availableIncentivesData
      ] = await Promise.all([
        tokenizationPoolsService.getById(poolId),
        tokenizationPoolsService.getPoolReceivables(poolId),
        tokenizationPoolsService.getPoolInvestors(poolId),
        tokenizationPoolsService.getPoolEnergyAssets(poolId),
        tokenizationPoolsService.getPoolRECs(poolId),
        tokenizationPoolsService.getPoolIncentives(poolId),
        tokenizationPoolsService.getAvailableReceivables(),
        tokenizationPoolsService.getAvailableEnergyAssets(),
        tokenizationPoolsService.getAvailableRECs(),
        tokenizationPoolsService.getAvailableIncentives()
      ]);
      
      setPool(poolData);
      setReceivables(receivablesData);
      setInvestors(investorsData);
      setEnergyAssets(energyAssetsData);
      setRECs(recsData);
      setIncentives(incentivesData);
      setAvailableReceivables(availableReceivablesData);
      setAvailableEnergyAssets(availableEnergyAssetsData);
      setAvailableRECs(availableRECsData);
      setAvailableIncentives(availableIncentivesData);
      setError(null);
    } catch (err) {
      console.error('Failed to load pool data:', err);
      setError('Failed to load pool details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle deleting the pool
   */
  const handleDelete = async () => {
    if (!pool) return;
    
    if (window.confirm('Are you sure you want to delete this tokenization pool?')) {
      try {
        await tokenizationPoolsService.delete(pool.poolId);
        navigate(getProjectUrl('/pools'));
      } catch (err) {
        console.error('Failed to delete pool:', err);
        setError('Failed to delete pool. Please try again.');
      }
    }
  };

  /**
   * Add a receivable to the pool
   */
  const handleAddReceivable = async () => {
    if (!pool || !selectedReceivableId) return;
    
    try {
      await tokenizationPoolsService.addReceivableToPool(pool.poolId, selectedReceivableId);
      // Reload pool data
      loadPoolData(pool.poolId);
      // Reset selection
      setSelectedReceivableId('');
    } catch (err) {
      console.error('Failed to add receivable to pool:', err);
      setError('Failed to add receivable to pool. Please try again.');
    }
  };

  /**
   * Remove a receivable from the pool
   */
  const handleRemoveReceivable = async (receivableId: string) => {
    if (!pool) return;
    
    if (window.confirm('Are you sure you want to remove this receivable from the pool?')) {
      try {
        await tokenizationPoolsService.removeReceivableFromPool(pool.poolId, receivableId);
        // Reload pool data
        loadPoolData(pool.poolId);
      } catch (err) {
        console.error('Failed to remove receivable from pool:', err);
        setError('Failed to remove receivable from pool. Please try again.');
      }
    }
  };

  /**
   * Add an investor to the pool
   */
  const handleAddInvestor = async () => {
    if (!pool || !investorId || !investmentAmount) return;
    
    try {
      await tokenizationPoolsService.addInvestorToPool(
        pool.poolId, 
        investorId,
        parseFloat(investmentAmount)
      );
      // Reload pool data
      loadPoolData(pool.poolId);
      // Reset form
      setInvestorId('');
      setInvestmentAmount('');
    } catch (err) {
      console.error('Failed to add investor to pool:', err);
      setError('Failed to add investor to pool. Please try again.');
    }
  };

  /**
   * Remove an investor from the pool
   */
  const handleRemoveInvestor = async (investorId: string) => {
    if (!pool) return;
    
    if (window.confirm('Are you sure you want to remove this investor from the pool?')) {
      try {
        await tokenizationPoolsService.removeInvestorFromPool(pool.poolId, investorId);
        // Reload pool data
        loadPoolData(pool.poolId);
      } catch (err) {
        console.error('Failed to remove investor from pool:', err);
        setError('Failed to remove investor from pool. Please try again.');
      }
    }
  };

  /**
   * Get badge color based on risk profile
   */
  const getRiskBadgeColor = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.LOW:
        return 'bg-green-500';
      case RiskLevel.MEDIUM:
        return 'bg-yellow-500';
      case RiskLevel.HIGH:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return format(new Date(dateString), 'MMMM d, yyyy');
  };
  
  if (loading) {
    return <div className="p-6 text-center">Loading pool details...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
        <Button
          variant="link"
          onClick={() => navigate(getProjectUrl('/pools'))}
          className="ml-4"
        >
          Back to Pools
        </Button>
      </div>
    );
  }
  
  if (!pool) {
    return (
      <div className="p-6 text-center">
        Pool not found.
        <Button
          variant="link"
          onClick={() => navigate(getProjectUrl('/pools'))}
          className="ml-4"
        >
          Back to Pools
        </Button>
      </div>
    );
  }

  // Calculate summary data
  const totalReceivedAmount = receivables.reduce((sum, rec) => sum + rec.amount, 0);
  const totalInvestedAmount = investors.reduce((sum, inv) => sum + inv.investmentAmount, 0);
  const fundingPercentage = pool.totalValue > 0 
    ? (totalInvestedAmount / pool.totalValue) * 100 
    : 0;
  
  // Calculate average risk score
  const avgRiskScore = receivables.length > 0
    ? receivables.reduce((sum, rec) => sum + (rec.riskScore || 0), 0) / receivables.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate(getProjectUrl('/pools'))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">Pool Details</h2>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold">{pool.name}</h3>
          <Badge className={getRiskBadgeColor(pool.riskProfile)}>
            {pool.riskProfile}
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate(getProjectUrl(`/pools/edit/${pool.poolId}`))}
          >
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${pool.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRiskScore.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Funding Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>${totalInvestedAmount.toLocaleString()}</span>
                <span>{fundingPercentage.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${Math.min(fundingPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="receivables">Receivables ({receivables.length})</TabsTrigger>
          <TabsTrigger value="energy-assets">Energy Assets ({energyAssets.length})</TabsTrigger>
          <TabsTrigger value="recs">RECs ({recs.length})</TabsTrigger>
          <TabsTrigger value="incentives">Incentives ({incentives.length})</TabsTrigger>
          <TabsTrigger value="investors">Investors ({investors.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pool Overview</CardTitle>
              <CardDescription>
                Basic information about this tokenization pool
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Pool Name</h4>
                  <p className="text-lg font-medium">{pool.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Risk Profile</h4>
                  <p className="text-lg font-medium">{pool.riskProfile}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Value</h4>
                  <p className="text-lg font-medium">${pool.totalValue.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Creation Date</h4>
                  <p className="text-lg font-medium">{formatDate(pool.createdAt)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h4>
                  <p className="text-lg font-medium">{formatDate(pool.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Pool Stats</CardTitle>
              <CardDescription>
                Key metrics and statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Receivables</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Count</p>
                      <p className="text-lg font-medium">{receivables.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-lg font-medium">${totalReceivedAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Average Risk</p>
                      <p className="text-lg font-medium">{avgRiskScore.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Investors</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Count</p>
                      <p className="text-lg font-medium">{investors.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Investment</p>
                      <p className="text-lg font-medium">${totalInvestedAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Funding Percentage</p>
                      <p className="text-lg font-medium">{fundingPercentage.toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="receivables" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Receivables in Pool</h3>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Receivable
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Receivable to Pool</DialogTitle>
                  <DialogDescription>
                    Select a receivable to add to this tokenization pool
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Available Receivables</label>
                    <Select 
                      value={selectedReceivableId} 
                      onValueChange={setSelectedReceivableId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a receivable" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableReceivables.map(rec => (
                          <SelectItem key={rec.receivableId} value={rec.receivableId}>
                            ${rec.amount.toLocaleString()} - Due: {new Date(rec.dueDate).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAddReceivable} disabled={!selectedReceivableId}>
                    Add to Pool
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {receivables.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No receivables in this pool</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add receivables to this pool to increase its value and generate tokens.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Discount Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivables.map(rec => (
                      <TableRow key={rec.receivableId}>
                        <TableCell>${rec.amount.toLocaleString()}</TableCell>
                        <TableCell>{new Date(rec.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>{rec.riskScore || 'N/A'}</TableCell>
                        <TableCell>{rec.discountRate ? `${rec.discountRate}%` : 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(getProjectUrl(`/receivables/${rec.receivableId}`))}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveReceivable(rec.receivableId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="investors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Investors in Pool</h3>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Investor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Investor to Pool</DialogTitle>
                  <DialogDescription>
                    Enter investor details and investment amount
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Investor ID</label>
                    <Input
                      value={investorId}
                      onChange={e => setInvestorId(e.target.value)}
                      placeholder="Enter investor ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Investment Amount ($)</label>
                    <Input
                      type="number"
                      value={investmentAmount}
                      onChange={e => setInvestmentAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button 
                    onClick={handleAddInvestor} 
                    disabled={!investorId || !investmentAmount}
                  >
                    Add Investor
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {investors.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No investors in this pool</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add investors to track who has invested in this tokenization pool.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor ID</TableHead>
                      <TableHead>Investment Amount</TableHead>
                      <TableHead>Ownership</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investors.map(inv => (
                      <TableRow key={inv.investorId}>
                        <TableCell>{inv.investorId}</TableCell>
                        <TableCell>${inv.investmentAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          {pool.totalValue > 0 
                            ? `${((inv.investmentAmount / pool.totalValue) * 100).toFixed(2)}%` 
                            : 'N/A'}
                        </TableCell>
                        <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveInvestor(inv.investorId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          
          {investors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Investment Distribution</CardTitle>
                <CardDescription>
                  Breakdown of investor ownership in this pool
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {investors.map(inv => (
                    <div key={inv.investorId} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{inv.investorId}</span>
                        <span>${inv.investmentAmount.toLocaleString()} ({pool.totalValue > 0 
                          ? `${((inv.investmentAmount / pool.totalValue) * 100).toFixed(0)}%` 
                          : '0%'})</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: pool.totalValue > 0 
                            ? `${(inv.investmentAmount / pool.totalValue) * 100}%` 
                            : '0%' }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TokenizationPoolDetail;