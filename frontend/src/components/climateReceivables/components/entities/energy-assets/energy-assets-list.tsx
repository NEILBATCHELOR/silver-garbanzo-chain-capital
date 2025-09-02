import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, MoreHorizontal, Search, Sun, Wind, Droplets } from 'lucide-react';
import { EnergyAsset, EnergyAssetType } from '../../../types';
import { energyAssetsService } from '../../../services';

/**
 * Component for displaying and managing energy assets
 */
export function EnergyAssetsList() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<EnergyAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch energy assets data
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setIsLoading(true);
        const assetsData = await energyAssetsService.getAll();
        setAssets(assetsData);
        setFilteredAssets(assetsData);
      } catch (error) {
        console.error('Error fetching energy assets:', error);
        // Handle error appropriately - you might want to show an error message
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, []);

  // Filter assets based on search query and type filter
  useEffect(() => {
    let result = [...assets];
    
    // Apply search filter
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      result = result.filter(asset => 
        asset.name.toLowerCase().includes(lowerCaseQuery) || 
        asset.location.toLowerCase().includes(lowerCaseQuery)
      );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(asset => asset.type === typeFilter);
    }
    
    setFilteredAssets(result);
  }, [searchQuery, typeFilter, assets]);

  const handleCreateAsset = () => {
    navigate('/climate-receivables/assets/create');
  };

  const handleViewAsset = (assetId: string) => {
    navigate(`/climate-receivables/assets/${assetId}`);
  };

  const getAssetTypeIcon = (type: EnergyAssetType) => {
    switch (type) {
      case EnergyAssetType.SOLAR:
        return <Sun className="w-5 h-5 text-amber-500" />;
      case EnergyAssetType.WIND:
        return <Wind className="w-5 h-5 text-blue-500" />;
      case EnergyAssetType.HYDRO:
        return <Droplets className="w-5 h-5 text-cyan-500" />;
      default:
        return <Sun className="w-5 h-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading energy assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Energy Assets</h1>
        <Button onClick={handleCreateAsset}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Asset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Management</CardTitle>
          <CardDescription>
            View and manage your renewable energy assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={EnergyAssetType.SOLAR}>Solar</SelectItem>
                  <SelectItem value={EnergyAssetType.WIND}>Wind</SelectItem>
                  <SelectItem value={EnergyAssetType.HYDRO}>Hydro</SelectItem>
                  <SelectItem value={EnergyAssetType.BIOMASS}>Biomass</SelectItem>
                  <SelectItem value={EnergyAssetType.GEOTHERMAL}>Geothermal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity (MW)</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.length > 0 ? (
                    filteredAssets.map((asset) => (
                      <TableRow key={asset.assetId}>
                        <TableCell>
                          <div className="flex items-center">
                            {getAssetTypeIcon(asset.type)}
                            <span className="ml-2">{asset.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell>{asset.capacity}</TableCell>
                        <TableCell>{new Date(asset.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewAsset(asset.assetId)}>
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Edit asset</DropdownMenuItem>
                              <DropdownMenuItem>View production data</DropdownMenuItem>
                              <DropdownMenuItem>Create receivable</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No assets found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
