import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
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
import { ArrowLeft } from 'lucide-react';
import { recsService } from '../../services';
import { supabase } from '@/infrastructure/database/client';
import {
  RenewableEnergyCredit,
  RenewableEnergyCreditFormState,
  RECMarketType,
  RECStatus,
  EnergyAsset,
  EnergyAssetType,
  ClimateReceivable
} from '../../types';

// Define interface for the component props
interface RECFormProps {
  isEditing?: boolean;
}

/**
 * Component for creating and editing Renewable Energy Credits (RECs)
 */
const RECForm: React.FC<RECFormProps> = ({ isEditing = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [receivables, setReceivables] = useState<ClimateReceivable[]>([]);
  const [certifications, setCertifications] = useState<string[]>([
    'Green-e', 'WREGIS', 'M-RETS', 'NAR', 'NC-RETS', 'PJM-GATS'
  ]);
  
  // Define form schema with Zod
  const formSchema = z.object({
    assetId: z.string().optional(),
    receivableId: z.string().optional(),
    quantity: z.coerce.number().positive('Quantity must be positive'),
    vintageYear: z.coerce.number().int().min(2000).max(new Date().getFullYear()),
    marketType: z.enum([RECMarketType.COMPLIANCE, RECMarketType.VOLUNTARY]),
    pricePerRec: z.coerce.number().positive('Price must be positive'),
    totalValue: z.coerce.number().optional(),
    certification: z.string().optional(),
    status: z.enum([RECStatus.AVAILABLE, RECStatus.SOLD, RECStatus.RETIRED, RECStatus.PENDING])
  }).refine(
    (data) => data.assetId || data.receivableId,
    {
      message: "At least one of Asset ID or Receivable ID must be selected",
      path: ["assetId"]
    }
  );
  
  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetId: '',
      receivableId: '',
      quantity: 0,
      vintageYear: new Date().getFullYear(),
      marketType: RECMarketType.VOLUNTARY,
      pricePerRec: 0,
      totalValue: 0,
      certification: '',
      status: RECStatus.AVAILABLE
    }
  });
  
  // Load data for editing and populate form fields
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load assets and receivables for the dropdowns
        await Promise.all([loadAssets(), loadReceivables()]);
        
        // If editing, load the REC data
        if (isEditing && id) {
          const rec = await recsService.getById(id);
          if (rec) {
            form.reset({
              assetId: rec.assetId || '',
              receivableId: rec.receivableId || '',
              quantity: rec.quantity,
              vintageYear: rec.vintageYear,
              marketType: rec.marketType,
              pricePerRec: rec.pricePerRec,
              totalValue: rec.totalValue,
              certification: rec.certification || '',
              status: rec.status
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
   * Load all climate receivables for the dropdown
   */
  const loadReceivables = async () => {
    try {
      const { data, error } = await supabase
        .from('climate_receivables')
        .select('receivable_id, amount, due_date, risk_score, discount_rate');
      
      if (error) throw error;
      
      if (data) {
        setReceivables(data.map(receivable => ({
          receivableId: receivable.receivable_id,
          assetId: null,
          payerId: null,
          amount: receivable.amount,
          dueDate: receivable.due_date,
          riskScore: receivable.risk_score,
          discountRate: receivable.discount_rate,
          createdAt: '',
          updatedAt: ''
        })));
      }
    } catch (err) {
      console.error('Failed to load receivables:', err);
      setError('Failed to load receivables. Please try again.');
    }
  };
  
  /**
   * Calculate total value when quantity or price changes
   */
  useEffect(() => {
    const quantity = form.watch('quantity');
    const pricePerRec = form.watch('pricePerRec');
    
    if (quantity && pricePerRec) {
      const totalValue = quantity * pricePerRec;
      form.setValue('totalValue', totalValue);
    }
  }, [form.watch('quantity'), form.watch('pricePerRec'), form]);
  
  /**
   * Handle form submission
   */
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setSubmitting(true);
      
      // Ensure total value is calculated
      const quantity = Number(values.quantity) || 0;
      const pricePerRec = Number(values.pricePerRec) || 0;
      const totalValue = values.totalValue || quantity * pricePerRec;
      
      // Convert to database format
      const formattedValues = {
        asset_id: values.assetId === "none" ? null : values.assetId || null,
        receivable_id: values.receivableId === "none" ? null : values.receivableId || null,
        quantity: values.quantity,
        vintage_year: values.vintageYear,
        market_type: values.marketType,
        price_per_rec: values.pricePerRec,
        total_value: totalValue,
        certification: values.certification || null,
        status: values.status
      };
      
      if (isEditing && id) {
        // Update existing REC
        await recsService.update(id, formattedValues);
      } else {
        // Create new REC
        await recsService.create(formattedValues);
      }
      
      // Navigate back to RECs list
      navigate('/climate-receivables/recs');
    } catch (err) {
      console.error('Failed to save REC:', err);
      setError('Failed to save REC. Please try again.');
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
          onClick={() => navigate('/climate-receivables/recs')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">
          {isEditing ? 'Edit REC' : 'Create New REC'}
        </h2>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit REC' : 'New REC'}</CardTitle>
          <CardDescription>
            {isEditing 
              ? 'Update the details of this Renewable Energy Credit' 
              : 'Enter the details for a new Renewable Energy Credit'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Asset */}
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Energy Asset (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
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
                        The energy asset that generated this REC (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Climate Receivable */}
                <FormField
                  control={form.control}
                  name="receivableId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Climate Receivable (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
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
                              ${receivable.amount.toLocaleString()} due {new Date(receivable.dueDate).toLocaleDateString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Link to specific climate receivable if applicable (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity (MWh)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        The amount of renewable energy in MWh
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Vintage Year */}
                <FormField
                  control={form.control}
                  name="vintageYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vintage Year</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="2023" 
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        The year when the energy was generated
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Market Type */}
                <FormField
                  control={form.control}
                  name="marketType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select market type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={RECMarketType.COMPLIANCE}>Compliance</SelectItem>
                          <SelectItem value={RECMarketType.VOLUNTARY}>Voluntary</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of market this REC is intended for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Price Per REC */}
                <FormField
                  control={form.control}
                  name="pricePerRec"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Per REC ($/MWh)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          step="0.01"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        The price per MWh of renewable energy
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Total Value (Calculated) */}
                <FormField
                  control={form.control}
                  name="totalValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Value ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          disabled
                          value={field.value}
                        />
                      </FormControl>
                      <FormDescription>
                        Calculated automatically (Quantity × Price)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Certification */}
                <FormField
                  control={form.control}
                  name="certification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certification</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select certification (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {certifications.map(cert => (
                            <SelectItem key={cert} value={cert}>
                              {cert}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The certification standard for this REC
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
                          <SelectItem value={RECStatus.AVAILABLE}>Available</SelectItem>
                          <SelectItem value={RECStatus.SOLD}>Sold</SelectItem>
                          <SelectItem value={RECStatus.RETIRED}>Retired</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The current status of this REC
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
                  onClick={() => navigate('/climate-receivables/recs')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create REC'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RECForm;