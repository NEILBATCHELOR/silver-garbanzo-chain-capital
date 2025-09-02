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
import { AutomatedRiskCalculationEngine } from '../../../services/business-logic/automated-risk-calculation-engine';
import { PayerFormDialog } from '../climate-payers';
import AutoRiskAssessmentCard from '../../risk-assessment/AutoRiskAssessmentCard';
import { RiskAssessmentResult } from '@/services/climateReceivables/payerRiskAssessmentService';

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
 * Enhanced with automated risk assessment based on credit ratings and financial health scores
 */
const ClimateReceivableForm: React.FC<ClimateReceivableFormProps> = ({ isEditing = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedCalculationLoading, setAdvancedCalculationLoading] = useState<boolean>(false);
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [payers, setPayers] = useState<ClimatePayer[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<RiskAssessmentResult | null>(null);
  
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

  // Watch for selected payer to provide data to risk assessment
  const selectedPayerId = form.watch('payerId');
  const selectedPayer = payers.find(p => p.payerId === selectedPayerId);

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
    }  };

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

  // Handle risk assessment updates from AutoRiskAssessmentCard
  const handleRiskScoreChange = (riskScore: number) => {
    form.setValue('riskScore', riskScore);
  };

  const handleDiscountRateChange = (discountRate: number) => {
    form.setValue('discountRate', discountRate);
  };

  const handleAssessmentUpdate = (assessment: RiskAssessmentResult) => {
    setCurrentAssessment(assessment);
    // Could trigger additional business logic here based on the assessment
    if (assessment.risk_score > 80) {
      toast({
        title: 'High Risk Alert',
        description: 'This receivable has been classified as high risk. Review recommended.',
        variant: 'destructive',
      });
    }
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
      const result = await AutomatedRiskCalculationEngine.performAutomatedRiskCalculation(id, true);
      
      // Update form with calculated values
      form.setValue('riskScore', result.compositeRisk.score);
      form.setValue('discountRate', result.discountRate.calculated);

      toast({
        title: "Advanced Risk Calculation Complete",
        description: `Risk score: ${result.compositeRisk.score}%, Discount rate: ${(result.discountRate.calculated * 100).toFixed(2)}%`
      });

      // Show recommendations if any
      if (result.recommendations.length > 0) {
        console.log('Risk Management Recommendations:', result.recommendations);
      }

      // Show alerts if any
      if (result.alerts.length > 0) {
        const criticalAlerts = result.alerts.filter(alert => alert.level === 'critical');
        if (criticalAlerts.length > 0) {
          toast({
            title: "Critical Risk Alert",
            description: criticalAlerts[0].message,
            variant: "destructive"
          });
        }
      }

    } catch (error) {
      console.error('Advanced risk calculation failed:', error);
      toast({
        title: "Calculation Failed",
        description: "Unable to perform advanced risk calculation. Using research-based calculation.",
        variant: "destructive"
      });
    } finally {
      setAdvancedCalculationLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Receivable' : 'Add Receivable'}</CardTitle>
          <CardDescription>
            {isEditing 
              ? 'Update the details of an existing receivable with research-backed risk assessment' 
              : 'Create a new receivable from a renewable energy asset with automatic risk pricing'}
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
                          <PayerFormDialog onPayerAdded={handlePayerAdded} />
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
                                {payer.name} ({payer.creditRating || 'No Rating'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the payer responsible for this receivable
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
                        <FormLabel>Amount (USD)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="Enter amount"
                            step="0.01"
                            min="0"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormDescription>
                          The amount of the receivable in USD
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
                          <Input
                            {...field}
                            type="date"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormDescription>
                          When the payment is due
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
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <div className="space-x-2">
            {isEditing && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAdvancedRiskCalculation}
                disabled={advancedCalculationLoading}
              >
                {advancedCalculationLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="mr-2 h-4 w-4" />
                )}
                Advanced Risk Calculation
              </Button>
            )}
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Receivable
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Integrated Research-Backed Risk Assessment */}
      <AutoRiskAssessmentCard
        payerId={selectedPayerId}
        creditRating={selectedPayer?.creditRating || ''}
        financialHealthScore={selectedPayer?.financialHealthScore || 0}
        currentRiskScore={form.watch('riskScore') || undefined}
        currentDiscountRate={form.watch('discountRate') || undefined}
        onRiskScoreChange={handleRiskScoreChange}
        onDiscountRateChange={handleDiscountRateChange}
        onAssessmentUpdate={handleAssessmentUpdate}
      />
    </div>
  );
};

export default ClimateReceivableForm;