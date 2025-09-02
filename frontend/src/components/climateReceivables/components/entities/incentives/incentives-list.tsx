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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Eye, Edit, Trash2, Plus, Filter } from 'lucide-react';
import { incentivesService } from '../../services';
import {
  ClimateIncentive,
  IncentiveType,
  IncentiveStatus
} from '../../types';

/**
 * Component for displaying a list of incentives with filtering capabilities
 */
const IncentivesList: React.FC = () => {
  const navigate = useNavigate();
  const [incentives, setIncentives] = useState<ClimateIncentive[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState<IncentiveType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<IncentiveStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  
  // Summary data
  const [summary, setSummary] = useState<{
    totalAmount: number;
    pendingAmount: number;
    receivedAmount: number;
  }>({
    totalAmount: 0,
    pendingAmount: 0,
    receivedAmount: 0
  });

  // Load incentives on component mount
  useEffect(() => {
    loadIncentives();
  }, []);

  // Calculate summary data when incentives change
  useEffect(() => {
    calculateSummary();
  }, [incentives]);

  /**
   * Load incentives with optional filters
   */
  const loadIncentives = async () => {
    try {
      setLoading(true);
      const data = await incentivesService.getAll();
      setIncentives(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load incentives:', err);
      setError('Failed to load incentives. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate summary data from the loaded incentives
   */
  const calculateSummary = () => {
    const total = incentives.reduce((sum, incentive) => sum + incentive.amount, 0);
    const pending = incentives
      .filter(i => i.status !== IncentiveStatus.RECEIVED)
      .reduce((sum, incentive) => sum + incentive.amount, 0);
    const received = incentives
      .filter(i => i.status === IncentiveStatus.RECEIVED)
      .reduce((sum, incentive) => sum + incentive.amount, 0);
    
    setSummary({
      totalAmount: total,
      pendingAmount: pending,
      receivedAmount: received
    });
  };

  /**
   * Apply filters to the incentives list
   */
  const applyFilters = async () => {
    try {
      setLoading(true);
      const data = await incentivesService.getAll(
        undefined, // assetId - not filtering by asset here
        undefined, // receivableId - not filtering by receivable here
        typeFilter !== 'all' ? typeFilter : undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );
      
      // Apply date filter client-side if needed
      let filteredData = data;
      if (dateFilter) {
        const filterDate = format(dateFilter, 'yyyy-MM-dd');
        filteredData = data.filter(incentive => 
          incentive.expectedReceiptDate && 
          incentive.expectedReceiptDate.substring(0, 10) === filterDate
        );
      }
      
      setIncentives(filteredData);
      setError(null);
    } catch (err) {
      console.error('Failed to apply filters:', err);
      setError('Failed to apply filters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset all filters
   */
  const resetFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setDateFilter(null);
    loadIncentives();
  };

  /**
   * Handle deleting an incentive
   */
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this incentive?')) {
      try {
        await incentivesService.delete(id);
        // Reload the list after deletion
        loadIncentives();
      } catch (err) {
        console.error('Failed to delete incentive:', err);
        setError('Failed to delete incentive. Please try again.');
      }
    }
  };

  /**
   * Get badge color based on incentive status
   */
  const getStatusBadgeColor = (status: IncentiveStatus) => {
    switch (status) {
      case IncentiveStatus.RECEIVED:
        return 'bg-green-500';
      case IncentiveStatus.APPROVED:
        return 'bg-blue-500';
      case IncentiveStatus.PENDING:
        return 'bg-yellow-500';
      case IncentiveStatus.APPLIED:
        return 'bg-purple-500';
      case IncentiveStatus.REJECTED:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  /**
   * Get badge color based on incentive type
   */
  const getTypeBadgeColor = (type: IncentiveType) => {
    switch (type) {
      case IncentiveType.TAX_CREDIT:
        return 'bg-indigo-500';
      case IncentiveType.REC:
        return 'bg-green-500';
      case IncentiveType.GRANT:
        return 'bg-blue-500';
      case IncentiveType.SUBSIDY:
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Incentives</h2>
        <Button 
          variant="default" 
          onClick={() => navigate('/climate-receivables/incentives/new')}
        >
          <Plus className="mr-2 h-4 w-4" /> New Incentive
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.pendingAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Received Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.receivedAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Incentives</CardTitle>
          <CardDescription>
            Filter incentives by type, status, and expected receipt date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as IncentiveType | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={IncentiveType.TAX_CREDIT}>Tax Credit</SelectItem>
                  <SelectItem value={IncentiveType.REC}>REC</SelectItem>
                  <SelectItem value={IncentiveType.GRANT}>Grant</SelectItem>
                  <SelectItem value={IncentiveType.SUBSIDY}>Subsidy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as IncentiveStatus | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={IncentiveStatus.APPLIED}>Applied</SelectItem>
                  <SelectItem value={IncentiveStatus.APPROVED}>Approved</SelectItem>
                  <SelectItem value={IncentiveStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={IncentiveStatus.RECEIVED}>Received</SelectItem>
                  <SelectItem value={IncentiveStatus.REJECTED}>Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expected Receipt Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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

      {/* Incentives table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center">Loading incentives...</div>
          ) : incentives.length === 0 ? (
            <div className="p-6 text-center">
              No incentives found. 
              <Link to="/climate-receivables/incentives/new" className="text-blue-500 ml-2">
                Create a new incentive
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected Receipt</TableHead>
                  <TableHead>Related Asset</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incentives.map((incentive) => (
                  <TableRow key={incentive.incentiveId}>
                    <TableCell>
                      <Badge className={getTypeBadgeColor(incentive.type)}>
                        {incentive.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>${incentive.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(incentive.status)}>
                        {incentive.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {incentive.expectedReceiptDate 
                        ? format(new Date(incentive.expectedReceiptDate), 'MMM d, yyyy')
                        : 'Not specified'}
                    </TableCell>
                    <TableCell>
                      {incentive.asset 
                        ? incentive.asset.name 
                        : incentive.receivable 
                          ? 'Via receivable' 
                          : 'Not linked'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/climate-receivables/incentives/${incentive.incentiveId}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/climate-receivables/incentives/edit/${incentive.incentiveId}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(incentive.incentiveId)}
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

export default IncentivesList;