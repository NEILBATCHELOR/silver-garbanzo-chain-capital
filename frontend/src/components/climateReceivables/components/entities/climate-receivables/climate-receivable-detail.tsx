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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  ChevronRight,
  Building,
  Calendar,
  DollarSign,
  AlertTriangle,
  Percent,
  Wind,
  FileText,
  Award,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { climateReceivablesService } from '../../../services/climateReceivablesService';
import { ClimateReceivable, IncentiveType, IncentiveStatus } from '../../../types';

/**
 * Component to display details of a climate receivable
 */
const ClimateReceivableDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receivable, setReceivable] = useState<ClimateReceivable | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await climateReceivablesService.getById(id);
        setReceivable(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching receivable:', err);
        setError('Failed to load receivable details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleEdit = () => {
    navigate(`/climate-receivables/receivables/edit/${id}`);
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await climateReceivablesService.delete(id);
      navigate('/climate-receivables/receivables');
    } catch (err) {
      console.error('Error deleting receivable:', err);
      setError('Failed to delete receivable. Please try again.');
    }
  };

  const handleBack = () => {
    navigate('/climate-receivables/receivables');
  };

  const getRiskLevelLabel = (score?: number | null) => {
    if (score === undefined || score === null) return 'Unknown';
    
    if (score < 30) {
      return 'Low Risk';
    } else if (score < 70) {
      return 'Medium Risk';
    } else {
      return 'High Risk';
    }
  };

  const getRiskLevelColor = (score?: number | null) => {
    if (score === undefined || score === null) return 'bg-gray-500';
    
    if (score < 30) {
      return 'bg-green-500';
    } else if (score < 70) {
      return 'bg-yellow-500';
    } else {
      return 'bg-red-500';
    }
  };

  const getIncentiveTypeIcon = (type: IncentiveType) => {
    switch (type) {
      case 'tax_credit':
        return <DollarSign className="h-4 w-4" />;
      case 'rec':
        return <Award className="h-4 w-4" />;
      case 'grant':
        return <FileText className="h-4 w-4" />;
      case 'subsidy':
        return <Building className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getIncentiveStatusBadge = (status: IncentiveStatus) => {
    switch (status) {
      case 'applied':
        return <Badge variant="outline">Applied</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500">Approved</Badge>;
      case 'received':
        return <Badge className="bg-green-500">Received</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading receivable details...</div>;
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
          <Button onClick={handleBack}>Back to Receivables</Button>
        </CardFooter>
      </Card>
    );
  }

  if (!receivable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Receivable not found.</div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleBack}>Back to Receivables</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <CardTitle>Receivable Details</CardTitle>
            <CardDescription>
              {receivable.asset?.name || 'Unknown Asset'} <ChevronRight className="inline h-4 w-4" /> {receivable.payer?.name || 'Unknown Payer'}
            </CardDescription>
          </div>
          <div className="mt-4 md:mt-0">
            <Badge className={getRiskLevelColor(receivable.riskScore)}>
              {getRiskLevelLabel(receivable.riskScore)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="incentives">Incentives</TabsTrigger>
            <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Main Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Receivable Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                    <span className="font-medium">Amount:</span>
                    <span className="ml-2">${receivable.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="font-medium">Due Date:</span>
                    <span className="ml-2">
                      {format(new Date(receivable.dueDate), 'MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Percent className="h-5 w-5 text-purple-500 mr-2" />
                    <span className="font-medium">Discount Rate:</span>
                    <span className="ml-2">
                      {receivable.discountRate ? `${receivable.discountRate.toFixed(2)}%` : 'Not set'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Risk Assessment</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">Risk Score:</span>
                      <span>{receivable.riskScore ?? 'Not assessed'}</span>
                    </div>
                    <Progress value={receivable.riskScore ?? 0} className="h-2" />
                  </div>
                  {receivable.riskFactors && receivable.riskFactors.length > 0 && (
                    <>
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                        <span className="font-medium">Risk Breakdown:</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {receivable.riskFactors[0].productionRisk !== undefined && (
                          <div className="border rounded p-2 text-center">
                            <div className="text-sm text-muted-foreground">Production</div>
                            <div className="font-semibold">{receivable.riskFactors[0].productionRisk.toFixed(1)}</div>
                          </div>
                        )}
                        {receivable.riskFactors[0].creditRisk !== undefined && (
                          <div className="border rounded p-2 text-center">
                            <div className="text-sm text-muted-foreground">Credit</div>
                            <div className="font-semibold">{receivable.riskFactors[0].creditRisk.toFixed(1)}</div>
                          </div>
                        )}
                        {receivable.riskFactors[0].policyRisk !== undefined && (
                          <div className="border rounded p-2 text-center">
                            <div className="text-sm text-muted-foreground">Policy</div>
                            <div className="font-semibold">{receivable.riskFactors[0].policyRisk.toFixed(1)}</div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Asset & Payer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Asset Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {receivable.asset ? (
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Name:</span> {receivable.asset.name}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {receivable.asset.type}
                      </div>
                      <div>
                        <span className="font-medium">Location:</span> {receivable.asset.location}
                      </div>
                      <div>
                        <span className="font-medium">Capacity:</span> {receivable.asset.capacity} MW
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">Asset information not available</div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Payer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {receivable.payer ? (
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Name:</span> {receivable.payer.name}
                      </div>
                      <div>
                        <span className="font-medium">Credit Rating:</span>{' '}
                        {receivable.payer.creditRating ? (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {receivable.payer.creditRating}
                          </span>
                        ) : (
                          'Not rated'
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Financial Health Score:</span>{' '}
                        {receivable.payer.financialHealthScore !== undefined && receivable.payer.financialHealthScore !== null ? (
                          <>
                            {receivable.payer.financialHealthScore}
                            <Progress 
                              value={receivable.payer.financialHealthScore} 
                              className="h-1.5 mt-1" 
                            />
                          </>
                        ) : (
                          'Not assessed'
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">Payer information not available</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="incentives">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Financial Incentives</h3>
                <Button variant="outline" size="sm">
                  Add Incentive
                </Button>
              </div>
              
              {receivable.incentives && receivable.incentives.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expected Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivable.incentives.map((incentive) => (
                      <TableRow key={incentive.incentiveId}>
                        <TableCell>
                          <div className="flex items-center">
                            {getIncentiveTypeIcon(incentive.type)}
                            <span className="ml-2">{incentive.type.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>${incentive.amount.toLocaleString()}</TableCell>
                        <TableCell>{getIncentiveStatusBadge(incentive.status)}</TableCell>
                        <TableCell>
                          {incentive.expectedReceiptDate 
                            ? format(new Date(incentive.expectedReceiptDate), 'MMM d, yyyy')
                            : 'Not scheduled'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-8 border rounded-md">
                  <p className="text-muted-foreground">No incentives have been added for this receivable.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="risk">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Risk Assessment</h3>
                <Badge className={getRiskLevelColor(receivable.riskScore)}>
                  {getRiskLevelLabel(receivable.riskScore)}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Overall Risk Score:</span>
                  <span>{receivable.riskScore ?? 'Not assessed'}</span>
                </div>
                <Progress value={receivable.riskScore ?? 0} className="h-2" />
              </div>
              
              {/* Risk Factors */}
              {receivable.riskFactors && receivable.riskFactors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {receivable.riskFactors[0].productionRisk !== undefined && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <Wind className="h-4 w-4 mr-2" />
                          Production Risk
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Score:</span>
                          <span>{receivable.riskFactors[0].productionRisk.toFixed(1)}</span>
                        </div>
                        <Progress 
                          value={receivable.riskFactors[0].productionRisk} 
                          className="h-1.5" 
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          Risk associated with energy production variability due to weather and operational factors.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {receivable.riskFactors[0].creditRisk !== undefined && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <Building className="h-4 w-4 mr-2" />
                          Credit Risk
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Score:</span>
                          <span>{receivable.riskFactors[0].creditRisk.toFixed(1)}</span>
                        </div>
                        <Progress 
                          value={receivable.riskFactors[0].creditRisk} 
                          className="h-1.5" 
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          Risk based on the payer's creditworthiness and payment history.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {receivable.riskFactors[0].policyRisk !== undefined && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Policy Risk
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Score:</span>
                          <span>{receivable.riskFactors[0].policyRisk.toFixed(1)}</span>
                        </div>
                        <Progress 
                          value={receivable.riskFactors[0].policyRisk} 
                          className="h-1.5" 
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          Risk related to regulatory changes and policy impacts on renewables.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 border rounded-md">
                  <p className="text-muted-foreground">No detailed risk assessment available for this receivable.</p>
                </div>
              )}
              
              {/* Policy Impacts */}
              {receivable.policyImpacts && receivable.policyImpacts.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Policy Impacts</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Policy</TableHead>
                        <TableHead>Impact Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivable.policyImpacts.map((impact) => (
                        <TableRow key={impact.impactId}>
                          <TableCell>Policy {impact.policyId}</TableCell>
                          <TableCell>{impact.impactDescription || 'No description available'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back to Receivables
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
                  This action cannot be undone. This will permanently delete the receivable
                  and all associated data.
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

export default ClimateReceivableDetail;
