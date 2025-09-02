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
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { incentivesService } from '../../services';
import {
  ClimateIncentive,
  IncentiveType,
  IncentiveStatus
} from '../../types';

/**
 * Component for displaying detailed information about a specific incentive
 */
const IncentiveDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incentive, setIncentive] = useState<ClimateIncentive | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load incentive data on component mount
  useEffect(() => {
    if (id) {
      loadIncentive(id);
    }
  }, [id]);
  
  /**
   * Load incentive data by ID
   */
  const loadIncentive = async (incentiveId: string) => {
    try {
      setLoading(true);
      const data = await incentivesService.getById(incentiveId);
      setIncentive(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load incentive:', err);
      setError('Failed to load incentive details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle deleting the incentive
   */
  const handleDelete = async () => {
    if (!incentive) return;
    
    if (window.confirm('Are you sure you want to delete this incentive?')) {
      try {
        await incentivesService.delete(incentive.incentiveId);
        navigate('/climate-receivables/incentives');
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

  /**
   * Get progress percentage based on incentive status
   */
  const getStatusProgress = (status: IncentiveStatus) => {
    switch (status) {
      case IncentiveStatus.APPLIED:
        return 20;
      case IncentiveStatus.PENDING:
        return 40;
      case IncentiveStatus.APPROVED:
        return 60;
      case IncentiveStatus.RECEIVED:
        return 100;
      case IncentiveStatus.REJECTED:
        return 0;
      default:
        return 0;
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
    return <div className="p-6 text-center">Loading incentive details...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
        <Button
          variant="link"
          onClick={() => navigate('/climate-receivables/incentives')}
          className="ml-4"
        >
          Back to Incentives
        </Button>
      </div>
    );
  }
  
  if (!incentive) {
    return (
      <div className="p-6 text-center">
        Incentive not found.
        <Button
          variant="link"
          onClick={() => navigate('/climate-receivables/incentives')}
          className="ml-4"
        >
          Back to Incentives
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
          onClick={() => navigate('/climate-receivables/incentives')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">Incentive Details</h2>
      </div>
      
      <div className="flex justify-between items-center">
        <div>
          <Badge className={getTypeBadgeColor(incentive.type)}>
            {incentive.type.replace('_', ' ')}
          </Badge>
          <Badge className={`ml-2 ${getStatusBadgeColor(incentive.status)}`}>
            {incentive.status}
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/climate-receivables/incentives/edit/${incentive.incentiveId}`)}
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
          <TabsTrigger value="related">Related Entities</TabsTrigger>
          <TabsTrigger value="status">Status Tracking</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incentive Overview</CardTitle>
              <CardDescription>
                Basic information about this incentive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Type</h4>
                  <p className="text-lg font-medium">{incentive.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Amount</h4>
                  <p className="text-lg font-medium">${incentive.amount.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                  <p className="text-lg font-medium">{incentive.status}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Expected Receipt Date</h4>
                  <p className="text-lg font-medium">{formatDate(incentive.expectedReceiptDate)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Created At</h4>
                  <p className="text-lg font-medium">{formatDate(incentive.createdAt)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Updated At</h4>
                  <p className="text-lg font-medium">{formatDate(incentive.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="related" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Related Asset</CardTitle>
              <CardDescription>
                The energy asset associated with this incentive
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incentive.asset ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Asset Name</h4>
                      <p className="text-lg font-medium">{incentive.asset.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Asset Type</h4>
                      <p className="text-lg font-medium">{incentive.asset.type}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Location</h4>
                      <p className="text-lg font-medium">{incentive.asset.location}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Capacity</h4>
                      <p className="text-lg font-medium">{incentive.asset.capacity} MW</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/climate-receivables/assets/${incentive.asset?.assetId}`)}
                  >
                    View Asset Details
                  </Button>
                </div>
              ) : (
                <p>No asset directly associated with this incentive.</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Related Receivable</CardTitle>
              <CardDescription>
                The receivable associated with this incentive
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incentive.receivable ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Receivable ID</h4>
                      <p className="text-lg font-medium">{incentive.receivable.receivableId.substring(0, 8)}...</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Amount</h4>
                      <p className="text-lg font-medium">${incentive.receivable.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Due Date</h4>
                      <p className="text-lg font-medium">{formatDate(incentive.receivable.dueDate)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Risk Score</h4>
                      <p className="text-lg font-medium">{incentive.receivable.riskScore || 'Not assessed'}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/climate-receivables/receivables/${incentive.receivable?.receivableId}`)}
                  >
                    View Receivable Details
                  </Button>
                </div>
              ) : (
                <p>No receivable associated with this incentive.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status Tracking</CardTitle>
              <CardDescription>
                Track the progress of this incentive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Progress</span>
                  <span>{getStatusProgress(incentive.status)}%</span>
                </div>
                <Progress value={getStatusProgress(incentive.status)} />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full mr-3 ${
                    [IncentiveStatus.APPLIED, IncentiveStatus.PENDING, IncentiveStatus.APPROVED, IncentiveStatus.RECEIVED].includes(incentive.status)
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}>
                  </div>
                  <div>
                    <h4 className="font-medium">Applied</h4>
                    <p className="text-sm text-muted-foreground">Incentive application submitted</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full mr-3 ${
                    [IncentiveStatus.PENDING, IncentiveStatus.APPROVED, IncentiveStatus.RECEIVED].includes(incentive.status)
                      ? 'bg-green-500'
                      : incentive.status === IncentiveStatus.REJECTED
                      ? 'bg-red-500'
                      : 'bg-gray-300'
                  }`}>
                  </div>
                  <div>
                    <h4 className="font-medium">Pending</h4>
                    <p className="text-sm text-muted-foreground">Application under review</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full mr-3 ${
                    [IncentiveStatus.APPROVED, IncentiveStatus.RECEIVED].includes(incentive.status)
                      ? 'bg-green-500'
                      : incentive.status === IncentiveStatus.REJECTED
                      ? 'bg-red-500'
                      : 'bg-gray-300'
                  }`}>
                  </div>
                  <div>
                    <h4 className="font-medium">Approved</h4>
                    <p className="text-sm text-muted-foreground">Incentive has been approved</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full mr-3 ${
                    incentive.status === IncentiveStatus.RECEIVED
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}>
                  </div>
                  <div>
                    <h4 className="font-medium">Received</h4>
                    <p className="text-sm text-muted-foreground">Payment has been received</p>
                  </div>
                </div>
                
                {incentive.status === IncentiveStatus.REJECTED && (
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full mr-3 bg-red-500"></div>
                    <div>
                      <h4 className="font-medium">Rejected</h4>
                      <p className="text-sm text-muted-foreground">Application was rejected</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {incentive.expectedReceiptDate && (
            <Card>
              <CardHeader>
                <CardTitle>Expected Receipt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>Expected to receive this incentive on:</p>
                  <p className="text-xl font-bold">{formatDate(incentive.expectedReceiptDate)}</p>
                  {incentive.status !== IncentiveStatus.RECEIVED && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(incentive.expectedReceiptDate) > new Date() 
                        ? `${Math.ceil((new Date(incentive.expectedReceiptDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining` 
                        : 'Past due date'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IncentiveDetail;