import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Leaf,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  DollarSign,
  BarChart3,
  Award
} from 'lucide-react';
import { CarbonOffset, CarbonOffsetType, CarbonOffsetStatus } from '../../../types';
import { CarbonOffsetsService } from '../../../services';

/**
 * Carbon Offset Detail Component
 * Displays comprehensive information about a single carbon offset
 */
export function CarbonOffsetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [carbonOffset, setCarbonOffset] = useState<CarbonOffset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadCarbonOffset();
    }
  }, [id]);

  const loadCarbonOffset = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const offset = await CarbonOffsetsService.getOffsetById(id);
      if (offset) {
        setCarbonOffset(offset);
      } else {
        toast({
          title: "Error",
          description: "Carbon offset not found",
          variant: "destructive",
        });
        navigate('/climate-receivables/carbon-offsets');
      }
    } catch (error) {
      console.error('Error loading carbon offset:', error);
      toast({
        title: "Error",
        description: "An error occurred while loading the carbon offset",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (carbonOffset) {
      navigate(`/climate-receivables/carbon-offsets/edit/${carbonOffset.offsetId}`);
    }
  };

  const handleDelete = async () => {
    if (!carbonOffset) return;
    
    try {
      setIsDeleting(true);
      const success = await CarbonOffsetsService.deleteOffset(carbonOffset.offsetId);
      if (success) {
        toast({
          title: "Success",
          description: "Carbon offset deleted successfully",
        });
        navigate('/climate-receivables/carbon-offsets');
      } else {
        toast({
          title: "Error",
          description: "Failed to delete carbon offset",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting carbon offset:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the carbon offset",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    navigate('/climate-receivables/carbon-offsets');
  };

  const getStatusIcon = (status: CarbonOffsetStatus) => {
    switch (status) {
      case CarbonOffsetStatus.VERIFIED:
        return <CheckCircle className="h-4 w-4" />;
      case CarbonOffsetStatus.PENDING:
        return <Clock className="h-4 w-4" />;
      case CarbonOffsetStatus.RETIRED:
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: CarbonOffsetStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case CarbonOffsetStatus.VERIFIED:
        return "default";
      case CarbonOffsetStatus.PENDING:
        return "secondary";
      case CarbonOffsetStatus.RETIRED:
        return "outline";
      default:
        return "secondary";
    }
  };

  const getTypeIcon = (type: CarbonOffsetType) => {
    switch (type) {
      case CarbonOffsetType.REFORESTATION:
        return <Leaf className="h-4 w-4" />;
      case CarbonOffsetType.RENEWABLE_ENERGY:
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <Leaf className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!carbonOffset) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Carbon offset not found</p>
            <Button onClick={handleBack} className="mt-4">
              Back to Carbon Offsets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Carbon Offset Details</h1>
            <p className="text-muted-foreground">
              Project ID: {carbonOffset.projectId} • {carbonOffset.type.replace('_', ' ').toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Carbon Offset</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this carbon offset? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <Badge variant={getStatusBadgeVariant(carbonOffset.status)} className="flex items-center gap-1">
          {getStatusIcon(carbonOffset.status)}
          {carbonOffset.status.replace('_', ' ').toUpperCase()}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          {getTypeIcon(carbonOffset.type)}
          {carbonOffset.type.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="financial">Financial Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5" />
                  Carbon Offset Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project ID</label>
                  <p className="font-mono text-sm">{carbonOffset.projectId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="flex items-center gap-2">
                    {getTypeIcon(carbonOffset.type)}
                    {carbonOffset.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount (tons CO₂)</label>
                  <p className="font-semibold text-lg">{formatNumber(carbonOffset.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant={getStatusBadgeVariant(carbonOffset.status)} className="flex items-center gap-1 w-fit">
                    {getStatusIcon(carbonOffset.status)}
                    {carbonOffset.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Price per Ton</label>
                  <p className="font-semibold text-lg">{formatCurrency(carbonOffset.pricePerTon)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Value</label>
                  <p className="font-bold text-xl text-green-600">{formatCurrency(carbonOffset.totalValue)}</p>
                </div>
                <Separator />
                <div className="text-sm text-muted-foreground">
                  <p>Calculation: {formatNumber(carbonOffset.amount)} tons × {formatCurrency(carbonOffset.pricePerTon)}/ton</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Verification Details
              </CardTitle>
              <CardDescription>
                Information about the verification and certification of this carbon offset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Verification Standard</label>
                  <p className="font-medium">
                    {carbonOffset.verificationStandard || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Verification Date</label>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(carbonOffset.verificationDate)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expiration Date</label>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(carbonOffset.expirationDate)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Status</label>
                  <Badge variant={getStatusBadgeVariant(carbonOffset.status)} className="flex items-center gap-1 w-fit">
                    {getStatusIcon(carbonOffset.status)}
                    {carbonOffset.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Financial Analysis
              </CardTitle>
              <CardDescription>
                Detailed financial breakdown and analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Carbon Amount</p>
                    <p className="text-2xl font-bold">{formatNumber(carbonOffset.amount)}</p>
                    <p className="text-sm text-muted-foreground">tons CO₂</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Unit Price</p>
                    <p className="text-2xl font-bold">{formatCurrency(carbonOffset.pricePerTon)}</p>
                    <p className="text-sm text-muted-foreground">per ton</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(carbonOffset.totalValue)}</p>
                    <p className="text-sm text-muted-foreground">USD</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h4 className="font-medium">Environmental Impact</h4>
                  <p className="text-sm text-muted-foreground">
                    This carbon offset represents the removal or avoidance of {formatNumber(carbonOffset.amount)} tons of CO₂ 
                    equivalent from the atmosphere through {carbonOffset.type.replace('_', ' ').toLowerCase()} activities.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Record Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <label className="font-medium text-muted-foreground">Created</label>
              <p>{formatDate(carbonOffset.createdAt)}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Last Updated</label>
              <p>{formatDate(carbonOffset.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
