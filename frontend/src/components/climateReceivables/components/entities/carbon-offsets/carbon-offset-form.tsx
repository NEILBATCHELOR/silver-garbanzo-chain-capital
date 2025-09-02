import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { CalendarIcon, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/utils/shared/utils';
import { CarbonOffset, CarbonOffsetType, CarbonOffsetStatus, CarbonOffsetFormState, InsertCarbonOffset } from '../../../types';
import { CarbonOffsetsService } from '../../../services';

// Form validation schema
const carbonOffsetSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  type: z.nativeEnum(CarbonOffsetType, {
    errorMap: () => ({ message: 'Please select a valid offset type' })
  }),
  amount: z.number().positive('Amount must be greater than 0'),
  pricePerTon: z.number().positive('Price per ton must be greater than 0'),
  verificationStandard: z.string().optional(),
  verificationDate: z.date().optional(),
  expirationDate: z.date().optional(),
  status: z.nativeEnum(CarbonOffsetStatus, {
    errorMap: () => ({ message: 'Please select a valid status' })
  }),
});

type CarbonOffsetFormData = z.infer<typeof carbonOffsetSchema>;

interface CarbonOffsetFormProps {
  isEditing?: boolean;
}

/**
 * Carbon Offset Form Component
 * Handles creation and editing of carbon offsets
 */
export function CarbonOffsetForm({ isEditing = false }: CarbonOffsetFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carbonOffset, setCarbonOffset] = useState<CarbonOffset | null>(null);

  const form = useForm<CarbonOffsetFormData>({
    resolver: zodResolver(carbonOffsetSchema),
    defaultValues: {
      projectId: '',
      type: CarbonOffsetType.REFORESTATION,
      amount: 0,
      pricePerTon: 0,
      verificationStandard: '',
      status: CarbonOffsetStatus.PENDING,
    },
  });

  // Calculate total value when amount or price changes
  const watchAmount = form.watch('amount');
  const watchPricePerTon = form.watch('pricePerTon');
  const totalValue = watchAmount * watchPricePerTon;

  useEffect(() => {
    if (isEditing && id) {
      loadCarbonOffset();
    }
  }, [isEditing, id]);

  const loadCarbonOffset = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const offset = await CarbonOffsetsService.getOffsetById(id);
      if (offset) {
        setCarbonOffset(offset);
        
        // Populate form with existing data
        form.reset({
          projectId: offset.projectId,
          type: offset.type,
          amount: offset.amount,
          pricePerTon: offset.pricePerTon,
          verificationStandard: offset.verificationStandard || '',
          verificationDate: offset.verificationDate ? new Date(offset.verificationDate) : undefined,
          expirationDate: offset.expirationDate ? new Date(offset.expirationDate) : undefined,
          status: offset.status,
        });
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
      navigate('/climate-receivables/carbon-offsets');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CarbonOffsetFormData) => {
    try {
      setIsSubmitting(true);
      
      // Convert form data to create data format
      const createData = {
        projectId: data.projectId,
        type: data.type,
        amount: data.amount,
        pricePerTon: data.pricePerTon,
        verificationStandard: data.verificationStandard || undefined,
        verificationDate: data.verificationDate?.toISOString().split('T')[0] || undefined,
        expirationDate: data.expirationDate?.toISOString().split('T')[0] || undefined,
        status: data.status,
      };

      let result;
      if (isEditing && carbonOffset) {
        result = await CarbonOffsetsService.updateOffset({
          offsetId: carbonOffset.offsetId,
          ...createData,
        });
      } else {
        result = await CarbonOffsetsService.createOffset(createData);
      }

      if (result) {
        toast({
          title: "Success",
          description: `Carbon offset ${isEditing ? 'updated' : 'created'} successfully`,
        });
        navigate('/climate-receivables/carbon-offsets');
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} carbon offset:`, error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/climate-receivables/carbon-offsets');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Edit Carbon Offset' : 'Create New Carbon Offset'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update the carbon offset details' : 'Add a new carbon offset to the system'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the basic details for the carbon offset
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter project identifier" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unique identifier for the carbon offset project
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offset Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select offset type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={CarbonOffsetType.REFORESTATION}>Reforestation</SelectItem>
                          <SelectItem value={CarbonOffsetType.RENEWABLE_ENERGY}>Renewable Energy</SelectItem>
                          <SelectItem value={CarbonOffsetType.METHANE_CAPTURE}>Methane Capture</SelectItem>
                          <SelectItem value={CarbonOffsetType.ENERGY_EFFICIENCY}>Energy Efficiency</SelectItem>
                          <SelectItem value={CarbonOffsetType.OTHER}>Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Type of activity that generates the carbon offset
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={CarbonOffsetStatus.PENDING}>Pending</SelectItem>
                          <SelectItem value={CarbonOffsetStatus.VERIFIED}>Verified</SelectItem>
                          <SelectItem value={CarbonOffsetStatus.RETIRED}>Retired</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Current status of the carbon offset
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Details</CardTitle>
                <CardDescription>
                  Enter the quantity and pricing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (tons CO₂)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Amount of CO₂ equivalent offset in tons
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricePerTon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Ton (USD)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Price per ton of CO₂ equivalent in USD
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Total Value Display */}
                {(watchAmount > 0 && watchPricePerTon > 0) && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-800">Total Value:</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(totalValue)}
                      </span>
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      {watchAmount} tons × {formatCurrency(watchPricePerTon)}/ton
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Verification Information */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Details</CardTitle>
              <CardDescription>
                Optional verification and certification information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="verificationStandard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Standard</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., VCS, Gold Standard" {...field} />
                      </FormControl>
                      <FormDescription>
                        Certification or verification standard used
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="verificationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
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
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Date when the offset was verified
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expirationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
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
                        Date when the offset expires (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update Carbon Offset' : 'Create Carbon Offset'}
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleBack}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
