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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Trash2, Award, Leaf } from 'lucide-react';
import { recsService } from '../../services';
import {
  RenewableEnergyCredit,
  RECMarketType,
  RECStatus
} from '../../types';

/**
 * Component for displaying detailed information about a specific REC
 */
const RECDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rec, setREC] = useState<RenewableEnergyCredit | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load REC data on component mount
  useEffect(() => {
    if (id) {
      loadREC(id);
    }
  }, [id]);
  
  /**
   * Load REC data by ID
   */
  const loadREC = async (recId: string) => {
    try {
      setLoading(true);
      const data = await recsService.getById(recId);
      setREC(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load REC:', err);
      setError('Failed to load REC details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle deleting the REC
   */
  const handleDelete = async () => {
    if (!rec) return;
    
    if (window.confirm('Are you sure you want to delete this REC?')) {
      try {
        await recsService.delete(rec.recId);
        navigate('/climate-receivables/recs');
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

  /**
   * Format date for display
   */
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return format(new Date(dateString), 'MMMM d, yyyy');
  };
  
  if (loading) {
    return <div className="p-6 text-center">Loading REC details...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
        <Button
          variant="link"
          onClick={() => navigate('/climate-receivables/recs')}
          className="ml-4"
        >
          Back to RECs
        </Button>
      </div>
    );
  }
  
  if (!rec) {
    return (
      <div className="p-6 text-center">
        REC not found.
        <Button
          variant="link"
          onClick={() => navigate('/climate-receivables/recs')}
          className="ml-4"
        >
          Back to RECs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate('/climate-receivables/recs')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">REC Details</h2>
      </div>
      
      <div className="flex justify-between items-center">
        <div>
          <Badge className={getMarketTypeBadgeColor(rec.marketType)}>
            {rec.marketType}
          </Badge>
          <Badge className={`ml-2 ${getStatusBadgeColor(rec.status)}`}>
            {rec.status}
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/climate-receivables/recs/edit/${rec.recId}`)}
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
      
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="asset">Asset Information</TabsTrigger>
          <TabsTrigger value="certification">Certification</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>REC Overview</CardTitle>
              <CardDescription>
                Basic information about this Renewable Energy Credit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Quantity</h4>
                  <p className="text-lg font-medium">{rec.quantity.toLocaleString()} MWh</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Vintage Year</h4>
                  <p className="text-lg font-medium">{rec.vintageYear}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Market Type</h4>
                  <p className="text-lg font-medium">{rec.marketType}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                  <p className="text-lg font-medium">{rec.status}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Price Per REC</h4>
                  <p className="text-lg font-medium">${rec.pricePerRec.toFixed(2)}/MWh</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Value</h4>
                  <p className="text-lg font-medium">${rec.totalValue.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Created At</h4>
                  <p className="text-lg font-medium">{formatDate(rec.createdAt)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Updated At</h4>
                  <p className="text-lg font-medium">{formatDate(rec.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Market Information</CardTitle>
              <CardDescription>
                Market details and carbon impact
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Market Type</h4>
                  <p className="text-lg font-medium">{rec.marketType}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {rec.marketType === RECMarketType.COMPLIANCE 
                      ? 'Used to meet Renewable Portfolio Standards (RPS) requirements' 
                      : 'Used by organizations to voluntarily offset their carbon footprint'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Carbon Impact</h4>
                  <p className="text-lg font-medium">
                    ~{(rec.quantity * 0.7).toLocaleString()} tons CO₂ avoided
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on average carbon intensity of replaced grid electricity
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="asset" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Related Asset</CardTitle>
              <CardDescription>
                The energy asset associated with this REC
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rec.asset ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Asset Name</h4>
                      <p className="text-lg font-medium">{rec.asset.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Asset Type</h4>
                      <p className="text-lg font-medium">{rec.asset.type}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Location</h4>
                      <p className="text-lg font-medium">{rec.asset.location}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Capacity</h4>
                      <p className="text-lg font-medium">{rec.asset.capacity} MW</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/climate-receivables/assets/${rec.asset?.assetId}`)}
                  >
                    <Leaf className="mr-2 h-4 w-4" /> View Asset Details
                  </Button>
                </div>
              ) : (
                <p>No asset directly associated with this REC.</p>
              )}
            </CardContent>
          </Card>
          
          {/* Generation Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Generation Information</CardTitle>
              <CardDescription>
                Details about when and how this energy was generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Vintage Year</h4>
                  <p className="text-lg font-medium">{rec.vintageYear}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The year in which the renewable energy was generated
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Generation Type</h4>
                  <p className="text-lg font-medium">{rec.asset?.type || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The renewable energy technology used to generate the electricity
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Quantity</h4>
                  <p className="text-lg font-medium">{rec.quantity.toLocaleString()} MWh</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    1 REC represents 1 MWh of renewable energy generation
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Equivalent Usage</h4>
                  <p className="text-lg font-medium">
                    ~{Math.round(rec.quantity / 10.5).toLocaleString()} homes for 1 year
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on average household electricity consumption
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="certification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Certification Details</CardTitle>
              <CardDescription>
                Information about the REC certification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Certification Standard</h4>
                  <p className="text-lg font-medium">{rec.certification || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                  <p className="text-lg font-medium">{rec.status}</p>
                </div>
              </div>
              
              {rec.certification && (
                <div className="mt-6 border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start">
                    <Award className="h-10 w-10 text-green-600 mr-4 mt-1" />
                    <div>
                      <h3 className="text-lg font-medium">Certified by {rec.certification}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {rec.certification === 'Green-e' 
                          ? 'Green-e Energy is the nation\'s leading voluntary certification program for renewable energy.' 
                          : rec.certification === 'WREGIS' 
                          ? 'Western Renewable Energy Generation Information System (WREGIS) is an independent registry for tracking renewable energy certificates.' 
                          : 'This certification ensures that renewable energy credits meet specific quality standards.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {rec.status === RECStatus.RETIRED && (
                <div className="mt-6 border rounded-lg p-4 bg-purple-100 dark:bg-purple-900/20">
                  <div className="flex items-start">
                    <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white mr-4">
                      <Trash2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Retired REC</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        This REC has been permanently retired, which means it has been used to claim renewable energy consumption and cannot be sold or transferred again.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RECDetail;