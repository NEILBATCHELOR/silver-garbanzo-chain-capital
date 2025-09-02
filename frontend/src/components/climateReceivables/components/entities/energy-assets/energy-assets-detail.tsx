import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import LineChart from '@/components/ui/line-chart';
import { 
  Sun, 
  Wind, 
  Droplets, 
  Leaf,
  Edit,
  ArrowLeft,
  BarChart3,
  FileText,
  Activity,
  Eye
} from 'lucide-react';
import { EnergyAsset, EnergyAssetType, ProductionData } from '../../../types';
import { energyAssetsService } from '../../../services';

/**
 * Component for displaying detailed information about an energy asset
 */
export function EnergyAssetsDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<EnergyAsset | null>(null);
  const [productionData, setProductionData] = useState<ProductionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch asset details and production data
  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        
        // Fetch asset details and production data in parallel
        const [assetData, productionDataResult] = await Promise.all([
          energyAssetsService.getById(id),
          energyAssetsService.getProductionData(id)
        ]);
        
        if (assetData) {
          setAsset(assetData);
          setProductionData(productionDataResult);
        }
      } catch (error) {
        console.error('Error fetching asset details:', error);
        // Handle error appropriately - you might want to show an error message
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssetDetails();
  }, [id]);

  const getAssetTypeIcon = (type: EnergyAssetType) => {
    switch (type) {
      case EnergyAssetType.SOLAR:
        return <Sun className="w-6 h-6 text-amber-500" />;
      case EnergyAssetType.WIND:
        return <Wind className="w-6 h-6 text-blue-500" />;
      case EnergyAssetType.HYDRO:
        return <Droplets className="w-6 h-6 text-cyan-500" />;
      default:
        return <Leaf className="w-6 h-6 text-green-500" />;
    }
  };

  const productionChartData = {
    series: [
      {
        name: 'Daily Output (MWh)',
        data: productionData.map(data => ({
          x: new Date(data.productionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          y: data.outputMwh
        })),
        color: 'rgb(75, 192, 192)',
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Asset Not Found</h1>
          <p className="mt-4 text-muted-foreground">The requested asset could not be found.</p>
          <Button 
            className="mt-4" 
            onClick={() => navigate('/climate-receivables/assets')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/climate-receivables/assets')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{asset.name}</h1>
          <Badge variant="outline" className="ml-2">
            {asset.type}
          </Badge>
        </div>
        <Button onClick={() => console.log('Edit asset')}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Asset
        </Button>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="production">Production Data</TabsTrigger>
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Asset Information</CardTitle>
                <CardDescription>
                  Basic details about this energy asset
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    {getAssetTypeIcon(asset.type)}
                    <span className="font-medium">Type:</span>
                  </div>
                  <span>{asset.type}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Location:</span>
                  <span>{asset.location}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Capacity:</span>
                  <span>{asset.capacity} MW</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Created:</span>
                  <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Last Updated:</span>
                  <span>{new Date(asset.updatedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>
                  Recent production performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Current Status:</span>
                  </div>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Average Daily Output:</span>
                  <span>
                    {productionData.length > 0
                      ? `${(productionData.reduce((sum, data) => sum + data.outputMwh, 0) / productionData.length).toFixed(2)} MWh`
                      : 'N/A'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Efficiency Rate:</span>
                  <span>92%</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Last Production:</span>
                  <span>
                    {productionData.length > 0
                      ? `${productionData[productionData.length - 1].outputMwh} MWh on ${new Date(productionData[productionData.length - 1].productionDate).toLocaleDateString()}`
                      : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Production</CardTitle>
              <CardDescription>
                Energy output over the past 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {productionChartData.series[0]?.data.length > 0 ? (
                  <LineChart {...productionChartData} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No production data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="flex space-x-4">
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={() => navigate('/climate-receivables/production-data')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              View All Production Data
            </Button>
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={() => navigate('/climate-receivables/receivables/create')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Receivable
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="production">
          <Card>
            <CardHeader>
              <CardTitle>Production Data</CardTitle>
              <CardDescription>
                Detailed energy production information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Production data content would go here */}
              <p className="text-muted-foreground">This tab will display detailed production data for the asset.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivables">
          <Card>
            <CardHeader>
              <CardTitle>Receivables</CardTitle>
              <CardDescription>
                Financial receivables associated with this asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Receivables content would go here */}
              <p className="text-muted-foreground">This tab will display receivables linked to this asset.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Contracts, certificates, and other documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Documents content would go here */}
              <p className="text-muted-foreground">This tab will display documents related to this asset.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
