import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, TrendingUp } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { climateReceivablesService, energyAssetsService, climatePayersService } from '../../../services';
import { EnergyAsset, ClimatePayer, EnergyAssetType } from '../../../types';
import { RiskAssessmentService } from '../../../utils/risk-assessment-service';
import { EnhancedRiskCalculationEngine } from '@/services/climateReceivables/enhancedRiskCalculationEngine';
import { PayerFormDialog } from '../climate-payers';

// Define the form schema with Zod
const formSchema = z.object({
  assetId: z.string().uuid({ message: 'Please select an asset' }).nullable(),
  payerId: z.string().uuid({ message: 'Please select a payer' }).nullable(),
  amount: z.coerce.number().positive({ message: 'Amount must be a positive number' }),
  dueDate: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: 'Please enter a valid date',
  }),
  riskScore: z.coerce.number().min(0).max(100).optional().nullable(),
  discountRate: z.coerce.number().min(0).max(100).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface ClimateReceivableFormProps {
  isEditing?: boolean;
}

/**
 * Component for creating or editing climate receivables
 */
const ClimateReceivableForm: React.FC<ClimateReceivableFormProps> = ({ isEditing = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedCalculationLoading, setAdvancedCalculationLoading] = useState<boolean>(false);
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [payers, setPayers] = useState<ClimatePayer[]>([]);
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetId: null,
      payerId: null,
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      riskScore: null,
      discountRate: null,
    },
  });

  // Fetch assets and payers for the dropdown
  useEffect(() => {
    fetchAssetsAndPayers();
  }, []);

  const fetchAssetsAndPayers = async () => {
    try {
      const [assetsData, payersData] = await Promise.all([
        energyAssetsService.getAll(),
        climatePayersService.getAll()
      ]);
      setAssets(assetsData);
      setPayers(payersData);
    } catch (error) {
      console.error('Error fetching assets and payers:', error);
      setError('Failed to load assets and payers. Please refresh the page.');
    }
  };

  // Refresh payers list after adding a new payer
  const refreshPayers = async () => {
    try {
      const payersData = await climatePayersService.getAll();
      setPayers(payersData);
    } catch (error) {
      console.error('Error refreshing payers:', error);
    }
  };

  // Handle new payer added
  const handlePayerAdded = async (newPayer: ClimatePayer) => {
    // Add the new payer to the list
    setPayers(prev => [...prev, newPayer]);
    
    // Automatically select the newly created payer
    form.setValue('payerId', newPayer.payerId);
    
    // Show success message
    toast({
      title: 'Payer Added',
      description: `${newPayer.name} has been added and selected.`,
    });
  };

  // Fetch receivable data for editing
  useEffect(() => {
    if (isEditing && id) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const data = await climateReceivablesService.getById(id);
          
          if (data) {
            // Update form values - handle null values properly
            form.reset({
              assetId: data.assetId || null,
              payerId: data.payerId || null,
              amount: data.amount,
              dueDate: data.dueDate,
              riskScore: data.riskScore || null,
              discountRate: data.discountRate || null,
            });
          }
          
          setError(null);
        } catch (err) {
          console.error('Error fetching receivable for editing:', err);
          setError('Failed to load receivable. Please try again.');
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [isEditing, id, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      
      // Prepare receivable data object (convert to database format)
      const receivableData = {
        asset_id: values.assetId || null,
        payer_id: values.payerId || null,
        amount: values.amount,
        due_date: values.dueDate,
        risk_score: values.riskScore || null,
        discount_rate: values.discountRate || null,
      };
      
      // Create or update the receivable
      if (isEditing && id) {
        await climateReceivablesService.update(id, receivableData);
        toast({
          title: 'Success',
          description: 'Receivable updated successfully.',
        });
      } else {
        await climateReceivablesService.create(receivableData);
        toast({
          title: 'Success',
          description: 'Receivable created successfully.',
        });
      }
      
      // Navigate back to the list
      navigate('/climate-receivables/receivables');
    } catch (err) {
      console.error('Error saving receivable:', err);
      setError('Failed to save receivable. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to save receivable. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/climate-receivables/receivables');
  };

  // Update discount rate when risk score changes
  const handleRiskScoreChange = (value: number[]) => {
    const riskScore = value[0];
    form.setValue('riskScore', riskScore);
    
    // Use the RiskAssessmentService to calculate the discount rate
    const suggestedRate = RiskAssessmentService.calculateDiscountRate(riskScore);
    form.setValue('discountRate', suggestedRate);
  };

  // Trigger advanced risk calculation for existing receivables
  const handleAdvancedRiskCalculation = async () => {
    if (!isEditing || !id) {
      toast({
        title: "Error",
        description: "Advanced risk calculation is only available for existing receivables",
        variant: "destructive"
      });
      return;
    }

    setAdvancedCalculationLoading(true);
    try {
      const result = await EnhancedRiskCalculationEngine.calculateEnhancedRisk({
        receivableId: id,
        payerId: form.getValues('payerId'),
        assetId: form.getValues('assetId'),
        amount: form.getValues('amount'),
        dueDate: form.getValues('dueDate')
      }, true);
      
      // Update form with calculated values
      if (result.success && result.data) {
        form.setValue('riskScore', result.data.riskScore);
        form.setValue('discountRate', result.data.discountRate);

        toast({
          title: "Advanced Risk Calculation Complete",
          description: `Risk score: ${result.data.riskScore}%, Discount rate: ${result.data.discountRate.toFixed(2)}%`
        });

        // Show methodology info
        console.log('Risk Assessment Methodology:', result.data.methodology);
        console.log('Factors Considered:', result.data.factorsConsidered);

        // Show risk level warnings if needed
        if (result.data.riskScore > 80) {
          toast({
            title: "Critical Risk Alert",
            description: `High risk detected (${result.data.riskScore}%). Review recommended.`,
            variant: "destructive"
          });
        }
      } else {
        throw new Error(result.error || 'Risk calculation failed');
      }

    } catch (error) {
      console.error('Advanced risk calculation failed:', error);
      toast({
        title: "Calculation Failed",
        description: "Unable to perform advanced risk calculation. Using basic calculation.",
        variant: "destructive"
      });
    } finally {
      setAdvancedCalculationLoading(false);
    }
  };
  
  // Calculate risk based on asset and payer selections
  useEffect(() => {
    const assetId = form.watch('assetId');
    const payerId = form.watch('payerId');
    
    if (assetId && payerId) {
      const selectedAsset = assets.find(a => a.assetId === assetId);
      const selectedPayer = payers.find(p => p.payerId === payerId);
      
      if (selectedAsset && selectedPayer && selectedPayer.financialHealthScore !== undefined && selectedPayer.financialHealthScore !== null) {
        // Basic risk calculation based on payer's financial health
        const baseRiskScore = Math.max(0, 100 - selectedPayer.financialHealthScore);
        form.setValue('riskScore', baseRiskScore);
        
        // Calculate discount rate based on risk score
        const discountRate = RiskAssessmentService.calculateDiscountRate(baseRiskScore);
        form.setValue('discountRate', discountRate);
      }
    }
  }, [form.watch('assetId'), form.watch('payerId'), assets, payers, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Receivable' : 'Add Receivable'}</CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Update the details of an existing receivable' 
            : 'Create a new receivable from a renewable energy asset'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !isEditing ? (
          <div className="flex justify-center p-8">Loading...</div>
        ) : error ? (
          <div className="text-red-500 mb-4">{error}</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Energy Asset</FormLabel>
                      <Select
                        value={field.value || ''}
                        onValueChange={(value) => field.onChange(value || null)}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an asset" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assets.map((asset) => (
                            <SelectItem key={asset.assetId} value={asset.assetId}>
                              {asset.name} ({asset.type}, {asset.capacity} MW)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the energy asset for this receivable
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        Payer
                        <PayerFormDialog 
                          onPayerAdded={handlePayerAdded}
                          trigger={
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-xs"
                              disabled={loading}
                            >
                              Add New
                            </Button>
                          }
                        />
                      </FormLabel>
                      <Select
                        value={field.value || ''}
                        onValueChange={(value) => field.onChange(value || null)}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a payer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {payers.map((payer) => (
                            <SelectItem key={payer.payerId} value={payer.payerId}>
                              {payer.name} {payer.creditRating && `(${payer.creditRating})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the entity responsible for payment or add a new one
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          {...field} 
                          disabled={loading} 
                        />
                      </FormControl>
                      <FormDescription>
                        The total amount of the receivable
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={loading} />
                      </FormControl>
                      <FormDescription>
                        The date when payment is expected
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border p-4 rounded-md">
                <h3 className="text-lg font-medium mb-4">Risk Assessment</h3>
                
                <FormField
                  control={form.control}
                  name="riskScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Score: {field.value !== undefined && field.value !== null ? field.value.toFixed(0) : 'Not assessed'}</FormLabel>
                      <FormControl>
                        <Slider
                          defaultValue={[field.value || 0]}
                          value={[field.value || 0]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={handleRiskScoreChange}
                          disabled={loading}
                          className="mb-2"
                        />
                      </FormControl>
                      <FormDescription>
                        Slide to set the risk score manually, or use advanced calculation below
                      </FormDescription>
                      <FormMessage />
                      
                      {/* Advanced Risk Calculation Button */}
                      {isEditing && (
                        <div className="mt-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAdvancedRiskCalculation}
                            disabled={advancedCalculationLoading || loading}
                            className="w-full"
                          >
                            {advancedCalculationLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Calculating Advanced Risk...
                              </>
                            ) : (
                              <>
                                <TrendingUp className="mr-2 h-4 w-4" />
                                Calculate Advanced Risk Assessment
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1">
                            Uses real-time weather, credit, and policy data for precise risk assessment
                          </p>
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discountRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Rate (%): {field.value !== undefined && field.value !== null ? field.value.toFixed(2) : 'Not set'}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          max="100"
                          {...field} 
                          value={field.value === undefined || field.value === null ? '' : field.value}
                          onChange={(e) => {
                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                          disabled={loading} 
                        />
                      </FormControl>
                      <FormDescription>
                        The discount rate applied to this receivable (automatically suggested based on risk score)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={form.handleSubmit(onSubmit)} 
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Updating...' : 'Saving...'}
            </>
          ) : (
            isEditing ? 'Update' : 'Save'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClimateReceivableForm;
