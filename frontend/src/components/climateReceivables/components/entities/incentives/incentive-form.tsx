import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { incentivesService } from '../../services';
import { supabase } from '@/infrastructure/database/client';
import {
  ClimateIncentive,
  ClimateIncentiveFormState,
  IncentiveType,
  IncentiveStatus,
  EnergyAsset,
  EnergyAssetType,
  ClimateReceivable
} from '../../types';

// Define interface for the component props
interface IncentiveFormProps {
  isEditing?: boolean;
}

/**
 * Component for creating and editing incentives
 */
const IncentiveForm: React.FC<IncentiveFormProps> = ({ isEditing = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [receivables, setReceivables] = useState<ClimateReceivable[]>([]);
  
  // Define form schema with Zod
  const formSchema = z.object({
    type: z.enum([
      IncentiveType.TAX_CREDIT, 
      IncentiveType.REC, 
      IncentiveType.GRANT, 
      IncentiveType.SUBSIDY,
      IncentiveType.OTHER
    ]),
    amount: z.coerce.number().positive('Amount must be positive'),
    status: z.enum([
      IncentiveStatus.APPLIED,
      IncentiveStatus.APPROVED,
      IncentiveStatus.PENDING,
      IncentiveStatus.RECEIVED,
      IncentiveStatus.REJECTED
    ]),
    assetId: z.string().optional(),
    receivableId: z.string().optional(),
    expectedReceiptDate: z.any().optional()
  });
  
  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: IncentiveType.TAX_CREDIT,
      amount: 0,
      status: IncentiveStatus.APPLIED,
      assetId: undefined,
      receivableId: undefined,
      expectedReceiptDate: undefined
    }
  });
  
  // Load data for editing and populate form fields
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load assets and receivables for the dropdowns
        await Promise.all([
          loadAssets(),
          loadReceivables()
        ]);
        
        // If editing, load the incentive data
        if (isEditing && id) {
          const incentive = await incentivesService.getById(id);
          if (incentive) {
            form.reset({
              type: incentive.type,
              amount: incentive.amount,
              status: incentive.status,
              assetId: incentive.assetId,
              receivableId: incentive.receivableId,
              expectedReceiptDate: incentive.expectedReceiptDate 
                ? parseISO(incentive.expectedReceiptDate) 
                : undefined
            });
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to load form data:', err);
        setError('Failed to load form data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [isEditing, id, form]);
  
  /**
   * Load all energy assets for the dropdown
   */
  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('energy_assets')
        .select('asset_id, name, type, location, capacity');
      
      if (error) throw error;
      
      if (data) {
        setAssets(data.map(asset => ({
          assetId: asset.asset_id,
          name: asset.name,
          type: asset.type as EnergyAssetType,
          location: asset.location,
          capacity: asset.capacity,
          ownerId: '',
          createdAt: '',
          updatedAt: ''
        })));
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError('Failed to load assets. Please try again.');
    }
  };
  
  /**
   * Load all receivables for the dropdown
   */
  const loadReceivables = async () => {
    try {
      const { data, error } = await supabase
        .from('climate_receivables')
        .select(`
          receivable_id,
          asset_id,
          payer_id,
          amount,
          due_date,
          energy_assets!climate_receivables_asset_id_fkey(name, type)
        `);
      
      if (error) throw error;
      
      if (data) {
        setReceivables(data.map(receivable => ({
          receivableId: receivable.receivable_id,
          assetId: receivable.asset_id,
          payerId: receivable.payer_id,
          amount: receivable.amount,
          dueDate: receivable.due_date,
          // Add additional properties with temporary values
          createdAt: '',
          updatedAt: '',
          // Add the asset name for display in the dropdown
          asset: receivable.energy_assets ? {
            assetId: receivable.asset_id,
            name: receivable.energy_assets.name,
            type: (receivable.energy_assets.type || 'other') as EnergyAssetType,
            location: '',
            capacity: 0,
            ownerId: '',
            createdAt: '',
            updatedAt: ''
          } : undefined
        })));
      }
    } catch (err) {
      console.error('Failed to load receivables:', err);
      setError('Failed to load receivables. Please try again.');
    }
  };
  
  /**
   * Handle form submission
   */
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setSubmitting(true);
      
      // Convert the date to ISO string format for database
      const formattedValues = {
        type: values.type,
        amount: values.amount,
        status: values.status,
        asset_id: values.assetId,
        receivable_id: values.receivableId,
        expected_receipt_date: values.expectedReceiptDate 
          ? new Date(values.expectedReceiptDate as string | Date).toISOString()
          : null
      };
      
      if (isEditing && id) {
        // Update existing incentive
        await incentivesService.update(id, formattedValues);
      } else {
        // Create new incentive
        await incentivesService.create(formattedValues);
      }
      
      // Navigate back to incentives list
      navigate('/climate-receivables/incentives');
    } catch (err) {
      console.error('Failed to save incentive:', err);
      setError('Failed to save incentive. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <div className="p-6 text-center">Loading form data...</div>;
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
        <h2 className="text-2xl font-bold">
          {isEditing ? 'Edit Incentive' : 'Create New Incentive'}
        </h2>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Incentive' : 'New Incentive'}</CardTitle>
          <CardDescription>
            {isEditing 
              ? 'Update the details of this incentive' 
              : 'Enter the details for a new incentive'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Incentive Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incentive Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select incentive type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={IncentiveType.TAX_CREDIT}>Tax Credit</SelectItem>
                          <SelectItem value={IncentiveType.REC}>REC</SelectItem>
                          <SelectItem value={IncentiveType.GRANT}>Grant</SelectItem>
                          <SelectItem value={IncentiveType.SUBSIDY}>Subsidy</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of financial incentive
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        The financial value of this incentive
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={IncentiveStatus.APPLIED}>Applied</SelectItem>
                          <SelectItem value={IncentiveStatus.PENDING}>Pending</SelectItem>
                          <SelectItem value={IncentiveStatus.APPROVED}>Approved</SelectItem>
                          <SelectItem value={IncentiveStatus.RECEIVED}>Received</SelectItem>
                          <SelectItem value={IncentiveStatus.REJECTED}>Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The current status of this incentive
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Expected Receipt Date */}
                <FormField
                  control={form.control}
                  name="expectedReceiptDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expected Receipt Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span className="text-muted-foreground">Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When you expect to receive this incentive
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Asset */}
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Asset</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an asset (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {assets.map(asset => (
                            <SelectItem key={asset.assetId} value={asset.assetId}>
                              {asset.name} ({asset.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The energy asset this incentive is associated with
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Receivable */}
                <FormField
                  control={form.control}
                  name="receivableId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Receivable</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a receivable (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {receivables.map(receivable => (
                            <SelectItem key={receivable.receivableId} value={receivable.receivableId}>
                              {receivable.asset?.name || 'Unknown'} - ${receivable.amount.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The receivable this incentive is associated with
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/climate-receivables/incentives')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Incentive'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncentiveForm;