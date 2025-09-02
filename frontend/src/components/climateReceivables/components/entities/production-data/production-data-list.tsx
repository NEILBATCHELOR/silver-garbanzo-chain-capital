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
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import BulkProductionDataUpload from '../../../BulkProductionDataUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { productionDataService, energyAssetsService } from '../../../services';
import { ProductionData, EnergyAsset } from '../../../types';
import { format } from 'date-fns';

interface ProductionDataListProps {
  projectId?: string;
}

/**
 * Component to list and filter production data
 */
const ProductionDataList: React.FC<ProductionDataListProps> = ({ projectId }) => {
  const [productionData, setProductionData] = useState<ProductionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  const navigate = useNavigate();

  // Helper to generate project-aware URLs
  const getProjectUrl = (path: string) => {
    return projectId ? `/projects/${projectId}/climate-receivables${path}` : `/climate-receivables${path}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await productionDataService.getAll(
        selectedAssetId === 'all' ? undefined : selectedAssetId,
        startDate || undefined,
        endDate || undefined
      );
      setProductionData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching production data:', err);
      setError('Failed to load production data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAssetId, startDate, endDate, projectId]);

  // Fetch assets for the filter dropdown
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        // Pass projectId to service for filtering (temporarily using standard getAll)
        const assetsData = await energyAssetsService.getAll();
        // TODO: Update service to support projectId filtering
        setAssets(assetsData);
      } catch (error) {
        console.error('Error fetching assets:', error);
        // Don't set error here as it might interfere with production data loading
      }
    };

    fetchAssets();
  }, [projectId]);

  const handleAddNew = () => {
    navigate(getProjectUrl('/production/new'));
  };

  const handleRowClick = (id: string) => {
    navigate(getProjectUrl(`/production/${id}`));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Data</CardTitle>
        <CardDescription>
          View and manage energy production data records for your assets
          {projectId && <span className="text-sm text-muted-foreground"> (Project: {projectId})</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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
            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-full md:w-1/3">
            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
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
                <DialogTitle>Bulk Upload Production Data</DialogTitle>
              </DialogHeader>
              {projectId && (
                <BulkProductionDataUpload 
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
          <Button onClick={handleAddNew}>Add New Production Data</Button>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex justify-center p-8">Loading production data...</div>
        ) : error ? (
          <div className="text-red-500 p-4">{error}</div>
        ) : productionData.length === 0 ? (
          <div className="text-center p-8">
            No production data found. Add some production data to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Output (MWh)</TableHead>
                  <TableHead>Weather</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionData.map((item) => (
                  <TableRow 
                    key={item.productionId}
                    onClick={() => handleRowClick(item.productionId)}
                    className="cursor-pointer hover:bg-muted"
                  >
                    <TableCell>
                      {item.asset?.name || 'Unknown Asset'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.productionDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{item.outputMwh.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.weatherCondition ? (
                        <div className="text-sm">
                          {item.weatherCondition.sunlightHours && (
                            <span className="mr-2">
                              ☀️ {item.weatherCondition.sunlightHours.toFixed(1)}h
                            </span>
                          )}
                          {item.weatherCondition.windSpeed && (
                            <span className="mr-2">
                              🌬️ {item.weatherCondition.windSpeed.toFixed(1)} mph
                            </span>
                          )}
                          {item.weatherCondition.temperature && (
                            <span>
                              🌡️ {item.weatherCondition.temperature.toFixed(1)}°C
                            </span>
                          )}
                        </div>
                      ) : (
                        'No weather data'
                      )}
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

export default ProductionDataList;