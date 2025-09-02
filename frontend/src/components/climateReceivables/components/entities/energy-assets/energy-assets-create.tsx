import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FieldValues } from 'react-hook-form';
import * as z from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { toast } from '@/components/ui/use-toast';
import { EnergyAssetType, EnergyAssetFormState } from '../../../types';
import { energyAssetsService } from '../../../services';

// Form validation schema
const formSchema = z.object({
  name: z.string().min(3, { message: 'Asset name must be at least 3 characters.' }),
  type: z.nativeEnum(EnergyAssetType, {
    errorMap: () => ({ message: 'Please select an asset type.' }),
  }),
  location: z.string().min(3, { message: 'Location must be at least 3 characters.' }),
  capacity: z.coerce.number().positive({ message: 'Capacity must be a positive number.' }),
});

/**
 * Component for creating a new energy asset
 */
export function EnergyAssetsCreate() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with default values
  const form = useForm<EnergyAssetFormState>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: undefined,
      location: '',
      capacity: undefined,
    },
  });

  // Handle form submission
  const onSubmit = async (data: EnergyAssetFormState) => {
    setIsSubmitting(true);
    
    try {
      // Create the energy asset via the service
      const assetData = {
        name: data.name,
        type: data.type,
        location: data.location,
        capacity: data.capacity,
        owner_id: '', // This would be set based on the current user
      };
      
      await energyAssetsService.create(assetData);
      
      toast({
        title: 'Success',
        description: `Energy asset "${data.name}" created successfully.`,
      });
      
      // Navigate back to assets list
      navigate('/climate-receivables/assets');
    } catch (error) {
      console.error('Error creating energy asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to create energy asset. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Energy Asset</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>New Energy Asset</CardTitle>
          <CardDescription>
            Add a new renewable energy asset to your portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Solar Farm Alpha" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter a descriptive name for this energy asset.
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
                    <FormLabel>Asset Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select asset type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={EnergyAssetType.SOLAR}>Solar</SelectItem>
                        <SelectItem value={EnergyAssetType.WIND}>Wind</SelectItem>
                        <SelectItem value={EnergyAssetType.HYDRO}>Hydro</SelectItem>
                        <SelectItem value={EnergyAssetType.BIOMASS}>Biomass</SelectItem>
                        <SelectItem value={EnergyAssetType.GEOTHERMAL}>Geothermal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the type of renewable energy asset.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Arizona, USA" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the geographic location of the asset.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity (MW)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50"
                        step="0.01"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the capacity in megawatts (MW).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Owner ID field removed as it's not in EnergyAssetFormState */}
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/climate-receivables/assets')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Asset'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
