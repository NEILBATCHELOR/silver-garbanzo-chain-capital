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
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { productionDataService } from '../../../services/productionDataService';
import { ProductionData } from '../../../types';

interface ProductionDataDetailProps {
  projectId?: string;
}

/**
 * Component to display details of a production data record
 */
const ProductionDataDetail: React.FC<ProductionDataDetailProps> = ({ projectId: propProjectId }) => {
  const { id, projectId: paramProjectId } = useParams<{ id: string; projectId: string }>();
  const navigate = useNavigate();
  const [productionData, setProductionData] = useState<ProductionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  // Use projectId from props or URL params
  const projectId = propProjectId || paramProjectId;

  // Helper to generate project-aware URLs
  const getProjectUrl = (path: string) => {
    return projectId 
      ? `/projects/${projectId}/climate-receivables${path}` 
      : `/climate-receivables${path}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await productionDataService.getById(id);
        setProductionData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching production data:', err);
        setError('Failed to load production data details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleEdit = () => {
    navigate(getProjectUrl(`/production/edit/${id}`));
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await productionDataService.delete(id);
      navigate(getProjectUrl('/production'));
    } catch (err) {
      console.error('Error deleting production data:', err);
      setError('Failed to delete production data. Please try again.');
    }
  };

  const handleBack = () => {
    navigate(getProjectUrl('/production'));
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading production data details...</div>;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">{error}</div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleBack}>Back to Production Data</Button>
        </CardFooter>
      </Card>
    );
  }

  if (!productionData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Production data record not found.</div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleBack}>Back to Production Data</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Data Details</CardTitle>
        <CardDescription>
          Viewing production data for {productionData.asset?.name || 'Unknown Asset'} on {format(new Date(productionData.productionDate), 'MMMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Asset Information</h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Asset Name:</span>{' '}
                {productionData.asset?.name || 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Asset Type:</span>{' '}
                {productionData.asset?.type || 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Location:</span>{' '}
                {productionData.asset?.location || 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Capacity:</span>{' '}
                {productionData.asset?.capacity ? `${productionData.asset.capacity} MW` : 'Unknown'}
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Production Details</h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Date:</span>{' '}
                {format(new Date(productionData.productionDate), 'MMMM d, yyyy')}
              </div>
              <div>
                <span className="font-medium">Output:</span>{' '}
                {productionData.outputMwh.toFixed(2)} MWh
              </div>
              <div>
                <span className="font-medium">Created:</span>{' '}
                {format(new Date(productionData.createdAt), 'MMM d, yyyy HH:mm')}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>{' '}
                {format(new Date(productionData.updatedAt), 'MMM d, yyyy HH:mm')}
              </div>
            </div>
          </div>
          
          {productionData.weatherCondition && (
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-2">Weather Conditions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {productionData.weatherCondition.sunlightHours !== undefined && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-3xl mb-1">☀️</div>
                    <div className="text-sm text-muted-foreground">Sunlight Hours</div>
                    <div className="text-xl font-semibold">
                      {productionData.weatherCondition.sunlightHours.toFixed(1)} hours
                    </div>
                  </div>
                )}
                
                {productionData.weatherCondition.windSpeed !== undefined && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-3xl mb-1">🌬️</div>
                    <div className="text-sm text-muted-foreground">Wind Speed</div>
                    <div className="text-xl font-semibold">
                      {productionData.weatherCondition.windSpeed.toFixed(1)} mph
                    </div>
                  </div>
                )}
                
                {productionData.weatherCondition.temperature !== undefined && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-3xl mb-1">🌡️</div>
                    <div className="text-sm text-muted-foreground">Temperature</div>
                    <div className="text-xl font-semibold">
                      {productionData.weatherCondition.temperature.toFixed(1)} °C
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <div className="flex space-x-2">
          <Button onClick={handleEdit}>Edit</Button>
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the production
                  data record.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProductionDataDetail;
