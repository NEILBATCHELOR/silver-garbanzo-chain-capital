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
import { tokenizationPoolsService } from '../../services';
import {
  ClimateTokenizationPool,
  ClimateTokenizationPoolFormState,
  RiskLevel
} from '../../types';

// Define interface for the component props
interface TokenizationPoolFormProps {
  isEditing?: boolean;
}

/**
 * Component for creating and editing tokenization pools
 */
const TokenizationPoolForm: React.FC<TokenizationPoolFormProps> = ({ isEditing = false }) => {
  const { id, projectId } = useParams<{ id: string; projectId?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Helper function to generate project-aware URLs
  const getProjectUrl = (path: string) => {
    return projectId 
      ? `/projects/${projectId}/climate-receivables${path}`
      : `/climate-receivables${path}`;
  };
  
  // Define form schema with Zod
  const formSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    totalValue: z.coerce.number().nonnegative('Total value must be non-negative'),
    riskProfile: z.enum([RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL])
  });
  
  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      totalValue: 0,
      riskProfile: RiskLevel.MEDIUM
    }
  });
  
  // Load data for editing and populate form fields
  useEffect(() => {
    const loadData = async () => {
      if (!isEditing || !id) return;
      
      try {
        setLoading(true);
        const pool = await tokenizationPoolsService.getById(id);
        
        if (pool) {
          form.reset({
            name: pool.name,
            totalValue: pool.totalValue,
            riskProfile: pool.riskProfile
          });
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to load pool data:', err);
        setError('Failed to load pool data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [isEditing, id, form]);
  
  /**
   * Handle form submission
   */
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setSubmitting(true);
      
      // Convert to database format
      const formattedValues = {
        name: values.name,
        total_value: values.totalValue,
        risk_profile: values.riskProfile,
        project_id: projectId // Include project ID when creating/updating pool
      };
      
      if (isEditing && id) {
        // Update existing pool
        await tokenizationPoolsService.update(id, formattedValues);
      } else {
        // Create new pool
        await tokenizationPoolsService.create(formattedValues);
      }
      
      // Navigate back to pools list
      navigate(getProjectUrl('/pools'));
    } catch (err) {
      console.error('Failed to save pool:', err);
      setError('Failed to save pool. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <div className="p-6 text-center">Loading pool data...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate(getProjectUrl('/pools'))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">
          {isEditing ? 'Edit Tokenization Pool' : 'Create New Tokenization Pool'}
        </h2>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Pool' : 'New Pool'}</CardTitle>
          <CardDescription>
            {isEditing 
              ? 'Update the details of this tokenization pool' 
              : 'Enter the details for a new tokenization pool'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pool Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter pool name" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this tokenization pool
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Total Value */}
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
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        {isEditing 
                          ? 'This will be updated automatically as receivables are added/removed' 
                          : 'Initial value of the pool (will be updated as receivables are added)'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Risk Profile */}
                <FormField
                  control={form.control}
                  name="riskProfile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Profile</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select risk profile" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={RiskLevel.LOW}>Low Risk</SelectItem>
                          <SelectItem value={RiskLevel.MEDIUM}>Medium Risk</SelectItem>
                          <SelectItem value={RiskLevel.HIGH}>High Risk</SelectItem>
                          <SelectItem value={RiskLevel.CRITICAL}>Critical Risk</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The risk classification for this pool
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
                  onClick={() => navigate(getProjectUrl('/pools'))}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Pool'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenizationPoolForm;