import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Progress } from '@/components/ui/progress';
import { Eye, Edit, Trash2, Plus, Filter } from 'lucide-react';
import { tokenizationPoolsService } from '../../services';
import TokenizationPoolCreateDialog from './tokenization-pool-create-dialog';
import {
  ClimateTokenizationPool,
  RiskLevel
} from '../../types';

/**
 * Component for displaying a list of tokenization pools with filtering capabilities
 */
const TokenizationPoolsList: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [pools, setPools] = useState<ClimateTokenizationPool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Helper function to generate project-aware URLs
  const getProjectUrl = (path: string) => {
    return projectId 
      ? `/projects/${projectId}/climate-receivables${path}`
      : `/climate-receivables${path}`;
  };
  
  // Filter states
  const [riskProfileFilter, setRiskProfileFilter] = useState<RiskLevel | 'all'>('all');
  
  // Summary data
  const [summary, setSummary] = useState<{
    totalValue: number;
    poolCount: number;
    lowRiskValue: number;
    mediumRiskValue: number;
    highRiskValue: number;
  }>({
    totalValue: 0,
    poolCount: 0,
    lowRiskValue: 0,
    mediumRiskValue: 0,
    highRiskValue: 0
  });

  // Load pools on component mount
  useEffect(() => {
    loadPools();
  }, []);

  // Calculate summary data when pools change
  useEffect(() => {
    calculateSummary();
  }, [pools]);

  /**
   * Load pools with optional filters
   */
  const loadPools = async () => {
    try {
      setLoading(true);
      const data = await tokenizationPoolsService.getAll(
        riskProfileFilter !== 'all' ? riskProfileFilter : undefined,
        projectId // Pass project ID to filter pools by project
      );
      setPools(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load tokenization pools:', err);
      setError('Failed to load tokenization pools. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate summary data from the loaded pools
   */
  const calculateSummary = () => {
    const totalValue = pools.reduce((sum, pool) => sum + pool.totalValue, 0);
    const poolCount = pools.length;
    
    const lowRiskValue = pools
      .filter(pool => pool.riskProfile === RiskLevel.LOW)
      .reduce((sum, pool) => sum + pool.totalValue, 0);
    
    const mediumRiskValue = pools
      .filter(pool => pool.riskProfile === RiskLevel.MEDIUM)
      .reduce((sum, pool) => sum + pool.totalValue, 0);
    
    const highRiskValue = pools
      .filter(pool => pool.riskProfile === RiskLevel.HIGH)
      .reduce((sum, pool) => sum + pool.totalValue, 0);
    
    setSummary({
      totalValue,
      poolCount,
      lowRiskValue,
      mediumRiskValue,
      highRiskValue
    });
  };

  /**
   * Apply filters to the pools list
   */
  const applyFilters = async () => {
    loadPools();
  };

  /**
   * Reset all filters
   */
  const resetFilters = () => {
    setRiskProfileFilter('all');
    loadPools();
  };

  /**
   * Handle deleting a pool
   */
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this tokenization pool?')) {
      try {
        await tokenizationPoolsService.delete(id);
        // Reload the list after deletion
        loadPools();
      } catch (err) {
        console.error('Failed to delete tokenization pool:', err);
        setError('Failed to delete tokenization pool. Please try again.');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tokenization Pools</h2>
        <TokenizationPoolCreateDialog onPoolCreated={loadPools} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pool Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.poolCount}</div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low Risk: ${summary.lowRiskValue.toLocaleString()}</span>
                <span>Medium Risk: ${summary.mediumRiskValue.toLocaleString()}</span>
                <span>High Risk: ${summary.highRiskValue.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                {summary.totalValue > 0 && (
                  <div className="flex h-full">
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ width: `${(summary.lowRiskValue / summary.totalValue) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-yellow-500 h-full" 
                      style={{ width: `${(summary.mediumRiskValue / summary.totalValue) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-red-500 h-full" 
                      style={{ width: `${(summary.highRiskValue / summary.totalValue) * 100}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Tokenization Pools</CardTitle>
          <CardDescription>
            Filter pools by risk profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Risk Profile</label>
              <Select value={riskProfileFilter} onValueChange={(value) => setRiskProfileFilter(value as RiskLevel | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select risk profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Profiles</SelectItem>
                  <SelectItem value={RiskLevel.LOW}>Low Risk</SelectItem>
                  <SelectItem value={RiskLevel.MEDIUM}>Medium Risk</SelectItem>
                  <SelectItem value={RiskLevel.HIGH}>High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end space-x-2">
              <Button onClick={applyFilters} className="flex-1">
                <Filter className="mr-2 h-4 w-4" /> Apply Filters
              </Button>
              <Button variant="outline" onClick={resetFilters}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Pools table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center">Loading tokenization pools...</div>
          ) : pools.length === 0 ? (
            <div className="p-6 text-center">
              No tokenization pools found. 
              <Link to={getProjectUrl("/pools/new")} className="text-blue-500 ml-2">
                Create a new pool
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Risk Profile</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pools.map((pool) => (
                  <TableRow key={pool.poolId}>
                    <TableCell className="font-medium">{pool.name}</TableCell>
                    <TableCell>${pool.totalValue.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getRiskBadgeColor(pool.riskProfile)}>
                        {pool.riskProfile}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(pool.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(getProjectUrl(`/pools/${pool.poolId}`))}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(getProjectUrl(`/pools/edit/${pool.poolId}`))}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(pool.poolId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenizationPoolsList;