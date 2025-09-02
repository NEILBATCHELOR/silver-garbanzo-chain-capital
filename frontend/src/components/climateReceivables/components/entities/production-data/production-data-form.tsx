import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { productionDataService, energyAssetsService } from '../../../services';
import { EnergyAsset, WeatherData, EnergyAssetType } from '../../../types';

// Define the form schema with Zod
const formSchema = z.object({
  assetId: z.string().uuid({ message: 'Please select an asset' }),
  productionDate: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: 'Please enter a valid date',
  }),
  outputMwh: z.coerce.number().positive({ message: 'Output must be a positive number' }),
  weatherConditionId: z.string().uuid().optional(),
  sunlightHours: z.coerce.number().min(0).optional(),
  windSpeed: z.coerce.number().min(0).optional(),
  temperature: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductionDataFormProps {
  isEditing?: boolean;
}

/**
 * Component for creating or editing production data
 */
const ProductionDataForm: React.FC<ProductionDataFormProps> = ({ isEditing = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetId: '',
      productionDate: new Date().toISOString().split('T')[0],
      outputMwh: 0,
      weatherConditionId: '',
      sunlightHours: undefined,
      windSpeed: undefined,
      temperature: undefined,
    },
  });

  // Fetch assets for the dropdown
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const assetsData = await energyAssetsService.getAll();
        setAssets(assetsData);
      } catch (error) {
        console.error('Error fetching assets:', error);
        setError('Failed to load assets. Please refresh the page.');
      }
    };

    fetchAssets();
  }, []);

  // Fetch production data for editing
  useEffect(() => {
    if (isEditing && id) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const data = await productionDataService.getById(id);
          
          if (data) {
            // Update form values
            form.reset({
              assetId: data.assetId,
              productionDate: data.productionDate,
              outputMwh: data.outputMwh,
              weatherConditionId: data.weatherConditionId || '',
              sunlightHours: data.weatherCondition?.sunlightHours,
              windSpeed: data.weatherCondition?.windSpeed,
              temperature: data.weatherCondition?.temperature,
            });
            
            // Store weather data
            if (data.weatherCondition) {
              setWeatherData({
                weatherId: '',
                location: '',
                date: '',
                sunlightHours: data.weatherCondition.sunlightHours,
                windSpeed: data.weatherCondition.windSpeed,
                temperature: data.weatherCondition.temperature,
                createdAt: '',
                updatedAt: ''
              });
            }
          }
          
          setError(null);
        } catch (err) {
          console.error('Error fetching production data for editing:', err);
          setError('Failed to load production data. Please try again.');
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
      
      // Handle weather data creation/update
      let weatherConditionId = values.weatherConditionId;
      
      // If we have weather data fields but no existing weather condition ID,
      // we need to create a new weather data record
      // In a real implementation, this would call a weather data service
      if (!weatherConditionId && (values.sunlightHours || values.windSpeed || values.temperature)) {
        // This is a placeholder - in a real app, you would create a new weather data record
        console.log('Would create new weather data record with:', {
          sunlightHours: values.sunlightHours,
          windSpeed: values.windSpeed,
          temperature: values.temperature,
        });
        
        // For now, we'll assume we have a new ID
        weatherConditionId = '550e8400-e29b-41d4-a716-446655440002';
      }
      
      // Prepare production data object
      const productionData = {
        asset_id: values.assetId,
        production_date: values.productionDate,
        output_mwh: values.outputMwh,
        weather_condition_id: weatherConditionId || null,
      };
      
      // Create or update the production data
      if (isEditing && id) {
        await productionDataService.update(id, productionData);
      } else {
        await productionDataService.create(productionData);
      }
      
      // Navigate back to the list
      navigate('/climate-receivables/production');
    } catch (err) {
      console.error('Error saving production data:', err);
      setError('Failed to save production data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/climate-receivables/production');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Production Data' : 'Add Production Data'}</CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Update the production details for your energy asset' 
            : 'Record new production data for your energy asset'}
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
              <FormField
                control={form.control}
                name="assetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Energy Asset</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
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
                      Select the energy asset for which you are recording production
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Production Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={loading} />
                    </FormControl>
                    <FormDescription>
                      The date when this production occurred
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outputMwh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Output (MWh)</FormLabel>
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
                      The amount of energy produced in megawatt-hours
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border p-4 rounded-md">
                <h3 className="text-lg font-medium mb-4">Weather Conditions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="sunlightHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sunlight Hours</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            min="0" 
                            {...field} 
                            value={field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              field.onChange(value);
                            }}
                            disabled={loading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="windSpeed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wind Speed (mph)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            min="0" 
                            {...field} 
                            value={field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              field.onChange(value);
                            }}
                            disabled={loading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature (°C)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            {...field} 
                            value={field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              field.onChange(value);
                            }}
                            disabled={loading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
          {loading ? 'Saving...' : isEditing ? 'Update' : 'Save'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductionDataForm;
