import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Input } from '@/components/ui/input';
import { Eye, Edit, Trash2, Plus, Filter } from 'lucide-react';
import { recsService } from '../../services';
import {
  RenewableEnergyCredit,
  RECMarketType,
  RECStatus
} from '../../types';

/**
 * Component for displaying a list of Renewable Energy Credits (RECs) with filtering capabilities
 */
const RECsList: React.FC = () => {
  const navigate = useNavigate();
  const [recs, setRECs] = useState<RenewableEnergyCredit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [marketTypeFilter, setMarketTypeFilter] = useState<RECMarketType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<RECStatus | 'all'>('all');
  const [vintageYearFilter, setVintageYearFilter] = useState<number | 'all'>('all');
  
  // Summary data
  const [summary, setSummary] = useState<{
    totalQuantity: number;
    totalValue: number;
    availableQuantity: number;
    averagePrice: number;
  }>({
    totalQuantity: 0,
    totalValue: 0,
    availableQuantity: 0,
    averagePrice: 0
  });

  // Vintage year options
  const [vintageYears, setVintageYears] = useState<number[]>([]);

  // Load RECs on component mount
  useEffect(() => {
    loadRECs();
    loadVintageYears();
  }, []);

  // Calculate summary data when RECs change
  useEffect(() => {
    calculateSummary();
  }, [recs]);

  /**
   * Load RECs with optional filters
   */
  const loadRECs = async () => {
    try {
      setLoading(true);
      const data = await recsService.getAll(
        undefined, // assetId - not filtering by asset here
        undefined, // receivableId - not filtering by receivable here
        marketTypeFilter !== 'all' ? marketTypeFilter : undefined,
        statusFilter !== 'all' ? statusFilter : undefined,
        vintageYearFilter !== 'all' ? vintageYearFilter : undefined
      );
      setRECs(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load RECs:', err);
      setError('Failed to load RECs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load available vintage years for the filter dropdown
   */
  const loadVintageYears = async () => {
    try {
      const distribution = await recsService.getVintageDistribution();
      const years = distribution.map(item => item.vintageYear);
      setVintageYears(years);
    } catch (err) {
      console.error('Failed to load vintage years:', err);
    }
  };

  /**
   * Calculate summary data from the loaded RECs
   */
  const calculateSummary = () => {
    const totalQuantity = recs.reduce((sum, rec) => sum + rec.quantity, 0);
    const totalValue = recs.reduce((sum, rec) => sum + rec.totalValue, 0);
    const availableQuantity = recs
      .filter(rec => rec.status === RECStatus.AVAILABLE)
      .reduce((sum, rec) => sum + rec.quantity, 0);
    
    // Calculate average price (avoid division by zero)
    const avgPrice = totalQuantity > 0 
      ? totalValue / totalQuantity 
      : 0;
    
    setSummary({
      totalQuantity,
      totalValue,
      availableQuantity,
      averagePrice: avgPrice
    });
  };

  /**
   * Apply filters to the RECs list
   */
  const applyFilters = async () => {
    loadRECs();
  };

  /**
   * Reset all filters
   */
  const resetFilters = () => {
    setMarketTypeFilter('all');
    setStatusFilter('all');
    setVintageYearFilter('all');
    loadRECs();
  };

  /**
   * Handle deleting a REC
   */
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this REC?')) {
      try {
        await recsService.delete(id);
        // Reload the list after deletion
        loadRECs();
      } catch (err) {
        console.error('Failed to delete REC:', err);
        setError('Failed to delete REC. Please try again.');
      }
    }
  };

  /**
   * Get badge color based on REC status
   */
  const getStatusBadgeColor = (status: RECStatus) => {
    switch (status) {
      case RECStatus.AVAILABLE:
        return 'bg-green-500';
      case RECStatus.SOLD:
        return 'bg-blue-500';
      case RECStatus.RETIRED:
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  /**
   * Get badge color based on market type
   */
  const getMarketTypeBadgeColor = (type: RECMarketType) => {
    switch (type) {
      case RECMarketType.COMPLIANCE:
        return 'bg-indigo-500';
      case RECMarketType.VOLUNTARY:
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Renewable Energy Credits (RECs)</h2>
        <Button 
          variant="default" 
          onClick={() => navigate('/climate-receivables/recs/new')}
        >
          <Plus className="mr-2 h-4 w-4" /> New REC
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalQuantity.toLocaleString()} MWh</div>
          </CardContent>
        </Card>
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
            <CardTitle className="text-sm font-medium">Available Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.availableQuantity.toLocaleString()} MWh</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.averagePrice.toFixed(2)}/MWh</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter RECs</CardTitle>
          <CardDescription>
            Filter renewable energy credits by market type, status, and vintage year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Market Type</label>
              <Select value={marketTypeFilter} onValueChange={(value) => setMarketTypeFilter(value as RECMarketType | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select market type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Market Types</SelectItem>
                  <SelectItem value={RECMarketType.COMPLIANCE}>Compliance</SelectItem>
                  <SelectItem value={RECMarketType.VOLUNTARY}>Voluntary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RECStatus | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={RECStatus.AVAILABLE}>Available</SelectItem>
                  <SelectItem value={RECStatus.SOLD}>Sold</SelectItem>
                  <SelectItem value={RECStatus.RETIRED}>Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Vintage Year</label>
              <Select 
                value={vintageYearFilter.toString()} 
                onValueChange={(value) => setVintageYearFilter(value === 'all' ? 'all' : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vintage year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {vintageYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
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

      {/* RECs table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center">Loading RECs...</div>
          ) : recs.length === 0 ? (
            <div className="p-6 text-center">
              No RECs found. 
              <Link to="/climate-receivables/recs/new" className="text-blue-500 ml-2">
                Create a new REC
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Quantity (MWh)</TableHead>
                  <TableHead>Vintage Year</TableHead>
                  <TableHead>Market Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recs.map((rec) => (
                  <TableRow key={rec.recId}>
                    <TableCell>
                      {rec.asset ? rec.asset.name : 'Unknown Asset'}
                    </TableCell>
                    <TableCell>{rec.quantity.toLocaleString()}</TableCell>
                    <TableCell>{rec.vintageYear}</TableCell>
                    <TableCell>
                      <Badge className={getMarketTypeBadgeColor(rec.marketType)}>
                        {rec.marketType}
                      </Badge>
                    </TableCell>
                    <TableCell>${rec.pricePerRec.toFixed(2)}/MWh</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(rec.status)}>
                        {rec.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/climate-receivables/recs/${rec.recId}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/climate-receivables/recs/edit/${rec.recId}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rec.recId)}
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

export default RECsList;