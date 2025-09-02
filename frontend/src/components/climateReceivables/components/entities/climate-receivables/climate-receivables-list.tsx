import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import BulkReceivablesUpload from '../../../BulkReceivablesUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  CircleAlert,
  DollarSign,
  MoreVertical,
  Calendar,
  FilterX,
  PencilLine,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { climateReceivablesService } from '../../../services/climateReceivablesService';
import { ClimateReceivable, EnergyAsset, ClimatePayer } from '../../../types';

interface ClimateReceivablesListProps {
  projectId?: string;
}

/**
 * Component to list and filter climate receivables
 */
const ClimateReceivablesList: React.FC<ClimateReceivablesListProps> = ({ projectId }) => {
  const [receivables, setReceivables] = useState<ClimateReceivable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedPayerId, setSelectedPayerId] = useState<string>('');
  const [riskRange, setRiskRange] = useState<[number, number]>([0, 100]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [payers, setPayers] = useState<ClimatePayer[]>([]);
  const [summary, setSummary] = useState<{
    totalAmount: number;
    averageRiskScore: number;
    countByRiskLevel: { low: number; medium: number; high: number };
  } | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await climateReceivablesService.getAll(
        selectedAssetId && selectedAssetId !== 'all' ? selectedAssetId : undefined,
        selectedPayerId && selectedPayerId !== 'all' ? selectedPayerId : undefined,
        riskRange[0],
        riskRange[1],
        startDate || undefined,
        endDate || undefined
      );
      setReceivables(data);
      
      // Fetch summary statistics
      const summaryData = await climateReceivablesService.getReceivablesSummary();
      setSummary(summaryData);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching climate receivables:', err);
      setError('Failed to load receivables. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, [selectedAssetId, selectedPayerId, riskRange, startDate, endDate]);

  // Extract unique assets and payers from receivables
  useEffect(() => {
    const uniqueAssets = receivables
      .filter(item => item.asset)
      .reduce((acc, item) => {
        if (item.asset && !acc.some(asset => asset.assetId === item.asset?.assetId)) {
          acc.push(item.asset);
        }
        return acc;
      }, [] as EnergyAsset[]);
    
    const uniquePayers = receivables
      .filter(item => item.payer)
      .reduce((acc, item) => {
        if (item.payer && !acc.some(payer => payer.payerId === item.payer?.payerId)) {
          acc.push(item.payer);
        }
        return acc;
      }, [] as ClimatePayer[]);
    
    setAssets(uniqueAssets);
    setPayers(uniquePayers);
  }, [receivables]);

  const handleAddNew = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/climate-receivables/receivables/new`);
    } else {
      navigate('/climate-receivables/receivables/new');
    }
  };

  const handleEdit = (id: string) => {
    if (projectId) {
      navigate(`/projects/${projectId}/climate-receivables/receivables/edit/${id}`);
    } else {
      navigate(`/climate-receivables/receivables/edit/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await climateReceivablesService.delete(id);
      // Refresh the list
      const updatedReceivables = receivables.filter(item => item.receivableId !== id);
      setReceivables(updatedReceivables);
    } catch (err) {
      console.error('Error deleting receivable:', err);
      setError('Failed to delete receivable. Please try again.');
    }
  };

  const handleRowClick = (id: string) => {
    if (projectId) {
      navigate(`/projects/${projectId}/climate-receivables/receivables/${id}`);
    } else {
      navigate(`/climate-receivables/receivables/${id}`);
    }
  };

  const handleRiskRangeChange = (value: number[]) => {
    setRiskRange([value[0], value[1]]);
  };

  const handleClearFilters = () => {
    setSelectedAssetId('');
    setSelectedPayerId('');
    setRiskRange([0, 100]);
    setStartDate('');
    setEndDate('');
  };

  const getRiskBadge = (score?: number | null) => {
    if (score === undefined || score === null) return null;
    
    if (score < 30) {
      return <Badge className="bg-green-500">Low Risk</Badge>;
    } else if (score < 70) {
      return <Badge className="bg-yellow-500">Medium Risk</Badge>;
    } else {
      return <Badge className="bg-red-500">High Risk</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Climate Receivables</CardTitle>
        <CardDescription>
          View and manage receivables from renewable energy assets
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border rounded-lg p-4 flex items-center">
              <DollarSign className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">${summary.totalAmount.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-card border rounded-lg p-4 flex items-center">
              <CircleAlert className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm text-muted-foreground">Average Risk Score</p>
                <p className="text-2xl font-bold">{summary.averageRiskScore.toFixed(1)}</p>
              </div>
            </div>
            <div className="bg-card border rounded-lg p-4 flex items-center">
              <Calendar className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-muted-foreground">Risk Distribution</p>
                <div className="flex space-x-2 mt-1">
                  <Badge className="bg-green-500">{summary.countByRiskLevel.low} Low</Badge>
                  <Badge className="bg-yellow-500">{summary.countByRiskLevel.medium} Medium</Badge>
                  <Badge className="bg-red-500">{summary.countByRiskLevel.high} High</Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/3">
              <Select
                value={selectedAssetId}
                onValueChange={setSelectedAssetId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  {assets.map((asset) => (
                    <SelectItem key={asset.assetId} value={asset.assetId}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-1/3">
              <Select
                value={selectedPayerId}
                onValueChange={setSelectedPayerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by payer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payers</SelectItem>
                  {payers.map((payer) => (
                    <SelectItem key={payer.payerId} value={payer.payerId}>
                      {payer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-1/3">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleClearFilters}
              >
                <FilterX className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/3">
              <p className="text-sm mb-2">Risk Score Range: {riskRange[0]} - {riskRange[1]}</p>
              <Slider
                defaultValue={[0, 100]}
                min={0}
                max={100}
                step={1}
                value={riskRange}
                onValueChange={handleRiskRangeChange}
                className="mb-2"
              />
            </div>
            <div className="w-full md:w-1/3">
              <p className="text-sm mb-2">Due Date From:</p>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-full md:w-1/3">
              <p className="text-sm mb-2">Due Date To:</p>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end mb-4 gap-2">
          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Bulk Upload</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Receivables</DialogTitle>
              </DialogHeader>
              {projectId && (
                <BulkReceivablesUpload 
                  projectId={projectId} 
                  onUploadComplete={() => {
                    fetchData();
                    setIsUploadModalOpen(false);
                  }}
                  onCancel={() => setIsUploadModalOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
          <Button onClick={handleAddNew}>Add New Receivable</Button>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex justify-center p-8">Loading receivables...</div>
        ) : error ? (
          <div className="text-red-500 p-4">{error}</div>
        ) : receivables.length === 0 ? (
          <div className="text-center p-8">
            No receivables found. Add some receivables to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Discount Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivables.map((item) => (
                  <TableRow 
                    key={item.receivableId}
                    className="cursor-pointer"
                  >
                    <TableCell onClick={() => handleRowClick(item.receivableId)}>
                      {item.asset?.name || 'Unknown Asset'}
                    </TableCell>
                    <TableCell onClick={() => handleRowClick(item.receivableId)}>
                      {item.payer?.name || 'Unknown Payer'}
                      {item.payer?.creditRating && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                          {item.payer.creditRating}
                        </span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => handleRowClick(item.receivableId)}>
                      ${item.amount.toLocaleString()}
                    </TableCell>
                    <TableCell onClick={() => handleRowClick(item.receivableId)}>
                      {format(new Date(item.dueDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell onClick={() => handleRowClick(item.receivableId)}>
                      <div className="flex items-center space-x-2">
                        <span>{item.riskScore ?? 'N/A'}</span>
                        {getRiskBadge(item.riskScore)}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleRowClick(item.receivableId)}>
                      {item.discountRate ? `${item.discountRate.toFixed(2)}%` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleRowClick(item.receivableId)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(item.receivableId)}>
                            <PencilLine className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDelete(item.receivableId)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClimateReceivablesList;
