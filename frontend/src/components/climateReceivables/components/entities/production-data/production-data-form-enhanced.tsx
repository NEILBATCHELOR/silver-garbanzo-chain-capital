import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2, CloudSun } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { productionDataService, energyAssetsService } from '../../../services';
import { WeatherDataService } from '../../../services/api/weather-data-service';
import { supabase } from '@/infrastructure/database/client';
import { EnergyAsset } from '../../../types';

// Enhanced form schema with better validation
const formSchema = z.object({
  assetId: z.string().uuid({ message: 'Please select a valid asset' }),
  productionDate: z.string().min(1, { message: 'Production date is required' })
    .refine(date => !isNaN(Date.parse(date)), {
      message: 'Please enter a valid date',
    })
    .refine(date => new Date(date) <= new Date(), {
      message: 'Production date cannot be in the future',
    }),
  outputMwh: z.coerce.number()
    .positive({ message: 'Output must be a positive number' })
    .max(10000, { message: 'Output seems unrealistically high (max 10,000 MWh)' }),
  sunlightHours: z.coerce.number().min(0).max(24).optional().or(z.literal('')),
  windSpeed: z.coerce.number().min(0).max(200).optional().or(z.literal('')),
  temperature: z.coerce.number().min(-50).max(70).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductionDataFormEnhancedProps {
  isEditing?: boolean;
  projectId?: string;
}

/**
 * Enhanced production data form with proper weather data integration
 */
const ProductionDataFormEnhanced: React.FC<ProductionDataFormEnhancedProps> = ({ 
  isEditing = false, 
  projectId 
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState<boolean>(true);
  const [weatherDataLoading, setWeatherDataLoading] = useState<boolean>(false);
  const [weatherDataFetched, setWeatherDataFetched] = useState<Set<string>>(new Set()); // Track what we've already fetched
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Helper to generate project-aware URLs
  const getProjectUrl = (path: string) => {
    return projectId 
      ? `/projects/${projectId}/climate-receivables${path}` 
      : `/climate-receivables${path}`;
  };

  // Initialize the form with better default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetId: '',
      productionDate: new Date().toISOString().split('T')[0],
      outputMwh: 0,
      sunlightHours: '',
      windSpeed: '',
      temperature: '',
    },
  });

  // Watch the asset ID to enable automatic weather data fetching
  const selectedAssetId = form.watch('assetId');
  const productionDate = form.watch('productionDate');

  // HELPER: Convert weather values to form-compatible types (number | "")
  const convertWeatherFieldToFormValue = (value: number | string | null | undefined): number | "" => {
    if (value === null || value === undefined || value === '') return '';
    
    // If it's already a number, return it
    if (typeof value === 'number') return value;
    
    // If it's a string, try to parse it as number
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return '';
    
    return parsed;
  };

  // Fetch assets for the dropdown with error handling
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setAssetsLoading(true);
        console.log('Fetching energy assets...');
        const assetsData = await energyAssetsService.getAll();
        console.log('Energy assets fetched:', assetsData);
        setAssets(assetsData);
        
        // If only one asset, auto-select it
        if (assetsData.length === 1 && !isEditing) {
          form.setValue('assetId', assetsData[0].assetId);
        }
      } catch (error) {
        console.error('Error fetching assets:', error);
        setError('Failed to load energy assets. Please check your connection and try again.');
        toast({
          title: "Error",
          description: "Failed to load energy assets. Please refresh the page and try again.",
          variant: "destructive",
        });
      } finally {
        setAssetsLoading(false);
      }
    };

    fetchAssets();
  }, [form, toast, isEditing]);

  // Fetch production data for editing with enhanced error handling and weather data population
  useEffect(() => {
    if (isEditing && id) {
      const fetchData = async () => {
        try {
          setLoading(true);
          console.log('Fetching production data for editing:', id);
          
          const data = await productionDataService.getById(id);
          console.log('Production data fetched:', data);
          
          if (data) {
            // FIXED: Properly map weather data using both weatherCondition and weatherData
            const weatherInfo = data.weatherCondition || data.weatherData;
            
            console.log('DEBUGGING Weather info transformation:', {
              rawData: data,
              weatherInfo: weatherInfo,
              weatherCondition: data.weatherCondition,
              weatherData: data.weatherData,
              weatherConditionType: typeof data.weatherCondition?.sunlightHours,
              weatherDataType: typeof data.weatherData?.sunlightHours
            });
            
            // FIXED: Update form values with proper type conversion
            const formValues = {
              assetId: data.assetId || '',
              productionDate: data.productionDate || new Date().toISOString().split('T')[0],
              outputMwh: data.outputMwh || 0,
              // FIXED: Proper weather data mapping with type conversion
              sunlightHours: convertWeatherFieldToFormValue(weatherInfo?.sunlightHours),
              windSpeed: convertWeatherFieldToFormValue(weatherInfo?.windSpeed),
              temperature: convertWeatherFieldToFormValue(weatherInfo?.temperature),
            };
            
            console.log('DEBUGGING Form values being set:', formValues);
            
            form.reset(formValues);
            
            console.log('FIXED: Form populated with properly converted data:', {
              assetId: data.assetId,
              productionDate: data.productionDate,
              outputMwh: data.outputMwh,
              weatherInfo: weatherInfo,
              convertedWeather: {
                sunlightHours: convertWeatherFieldToFormValue(weatherInfo?.sunlightHours),
                windSpeed: convertWeatherFieldToFormValue(weatherInfo?.windSpeed),
                temperature: convertWeatherFieldToFormValue(weatherInfo?.temperature),
              }
            });
            
            toast({
              title: "Data loaded",
              description: "Production data loaded successfully for editing.",
            });
          } else {
            throw new Error('Production data not found');
          }
          
          setError(null);
        } catch (err) {
          console.error('Error fetching production data for editing:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(`Failed to load production data: ${errorMessage}`);
          toast({
            title: "Error",
            description: "Failed to load production data. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [isEditing, id, form, toast]);

  // Auto-fetch weather data when asset and date are selected (for new records only) - DEBOUNCED
  useEffect(() => {
    // Clear any existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Only proceed if we're not in editing mode and have the required data
    if (!isEditing && selectedAssetId && productionDate && !weatherDataLoading) {
      const selectedAsset = assets.find(asset => asset.assetId === selectedAssetId);
      
      if (selectedAsset) {
        // Check if we already have weather data populated in the form
        const currentValues = form.getValues();
        const hasExistingWeatherData = (
          (currentValues.sunlightHours !== '' && currentValues.sunlightHours !== undefined) ||
          (currentValues.windSpeed !== '' && currentValues.windSpeed !== undefined) ||
          (currentValues.temperature !== '' && currentValues.temperature !== undefined)
        );

        // Skip if we already have weather data
        if (hasExistingWeatherData) {
          console.log('Weather data already populated in form, skipping API call');
          return;
        }

        // Create a unique key to track if we've already fetched this combination
        const fetchKey = `${selectedAsset.location}-${productionDate}`;
        
        if (weatherDataFetched.has(fetchKey)) {
          console.log('Weather data already fetched for this location/date combination, skipping API call');
          return;
        }

        // Debounce the API call by 1 second to prevent repeated calls
        debounceRef.current = setTimeout(() => {
          console.log('Debounced weather data fetch initiated for:', { location: selectedAsset.location, date: productionDate });
          fetchSuggestedWeatherData(selectedAsset.location, productionDate, fetchKey);
        }, 1000);
      }
    }

    // Cleanup function to clear timeout on unmount or dependency change
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [selectedAssetId, productionDate, assets, isEditing, weatherDataLoading, form, weatherDataFetched]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Function to fetch suggested weather data with improved error handling and tracking
  const fetchSuggestedWeatherData = async (location: string, date: string, fetchKey?: string) => {
    // Skip if we're already loading or if this is a broad/problematic location
    if (weatherDataLoading) {
      console.log('Weather data loading already in progress, skipping');
      return;
    }

    // Check for problematic location patterns that cause geocoding issues
    const problematicPatterns = [
      /^[A-Z]{2,}\s*,\s*USA$/i, // State names like "TEXAS, USA"  
      /^[A-Z]{2,}\s*,\s*US$/i,  // State names like "TEXAS, US"
      /^[A-Z\s]+STATE$/i,       // Generic state references
    ];

    const isProblematicLocation = problematicPatterns.some(pattern => pattern.test(location.trim()));
    
    if (isProblematicLocation) {
      console.warn(`Skipping weather API call for problematic location: "${location}". Location too broad for geocoding.`);
      return;
    }

    try {
      setWeatherDataLoading(true);
      console.log('Fetching suggested weather data for:', { location, date });
      
      // Mark this combination as being fetched to prevent duplicates
      if (fetchKey) {
        setWeatherDataFetched(prev => new Set(prev.add(fetchKey)));
      }
      
      const weatherData = await WeatherDataService.getWeatherData(location, date);
      
      if (weatherData && (weatherData.sunlightHours || weatherData.windSpeed || weatherData.temperature)) {
        // Only populate if we have actual data and form fields are empty
        const currentValues = form.getValues();
        
        if (!currentValues.sunlightHours && weatherData.sunlightHours) {
          form.setValue('sunlightHours', weatherData.sunlightHours);
        }
        if (!currentValues.windSpeed && weatherData.windSpeed) {
          form.setValue('windSpeed', weatherData.windSpeed);
        }
        if (!currentValues.temperature && weatherData.temperature) {
          form.setValue('temperature', weatherData.temperature);
        }
        
        toast({
          title: "Weather Data Found",
          description: `Suggested weather data for ${location} on ${date} has been loaded.`,
        });
      } else {
        console.log('No useful weather data returned from API');
      }
    } catch (error) {
      console.warn(`Could not fetch weather data for "${location}" on ${date}:`, error instanceof Error ? error.message : error);
      
      // Remove from fetched set on error so it can be retried later
      if (fetchKey) {
        setWeatherDataFetched(prev => {
          const newSet = new Set(prev);
          newSet.delete(fetchKey);
          return newSet;
        });
      }
      
      // Only show error toast if it's not a geocoding issue (to reduce noise)
      if (error instanceof Error && !error.message.includes('No coordinates found')) {
        toast({
          title: "Weather Data Unavailable",
          description: `Could not fetch weather data for ${location}. You can enter weather conditions manually.`,
          variant: "default",
        });
      }
    } finally {
      setWeatherDataLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      console.log('Form values:', values);
      
      // Validate that we have an asset selected
      if (!values.assetId) {
        throw new Error('Please select an energy asset');
      }
      
      // Get asset details for location data
      const selectedAsset = assets.find(asset => asset.assetId === values.assetId);
      if (!selectedAsset) {
        throw new Error('Selected asset not found');
      }
      
      let weatherConditionId: string | null = null;
      
      // Create or update weather data if weather information is provided
      const hasWeatherData = (
        (values.sunlightHours !== '' && values.sunlightHours !== undefined) ||
        (values.windSpeed !== '' && values.windSpeed !== undefined) ||
        (values.temperature !== '' && values.temperature !== undefined)
      );
      
      if (hasWeatherData) {
        try {
          console.log('Creating/updating weather data for location:', selectedAsset.location);
          
          // Use WeatherDataService to properly handle duplicates with upsert pattern
          const weatherData = {
            weatherId: '', // Will be assigned by service
            location: selectedAsset.location.trim(),
            date: values.productionDate,
            sunlightHours: values.sunlightHours !== '' ? Number(values.sunlightHours) : null,
            windSpeed: values.windSpeed !== '' ? Number(values.windSpeed) : null,
            temperature: values.temperature !== '' ? Number(values.temperature) : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // FIXED: Use WeatherDataService.saveWeatherData() instead of direct database insert
          // This method properly handles duplicate key constraints with upsert pattern
          const savedWeatherData = await WeatherDataService.saveWeatherData(weatherData);
          
          weatherConditionId = savedWeatherData.weatherId;
          console.log('Weather data created/updated with ID:', weatherConditionId);
          
          toast({
            title: "Weather Data Saved",
            description: "Weather conditions have been recorded successfully.",
          });
          
        } catch (weatherError) {
          console.error('Error creating weather data:', weatherError);
          toast({
            title: "Weather Data Warning",
            description: "Production data will be saved, but weather data could not be recorded: " + 
                        (weatherError instanceof Error ? weatherError.message : 'Unknown error'),
            variant: "default",
          });
          // Continue with production data creation even if weather fails
        }
      }
      
      // Convert form values to the format expected by the service
      const productionData = {
        asset_id: values.assetId,
        production_date: values.productionDate,
        output_mwh: Number(values.outputMwh),
        weather_condition_id: weatherConditionId,
      };
      
      console.log('Production data to submit:', productionData);
      
      // Create or update the production data
      let result;
      if (isEditing && id) {
        console.log('Updating production data with ID:', id);
        result = await productionDataService.update(id, productionData);
        toast({
          title: "Success",
          description: "Production data updated successfully.",
        });
      } else {
        console.log('Creating new production data');
        result = await productionDataService.create(productionData);
        toast({
          title: "Success", 
          description: "Production data created successfully.",
        });
      }
      
      console.log('Operation result:', result);
      setSuccess(true);
      
      // Navigate back to the list after a short delay to show success message
      setTimeout(() => {
        navigate(getProjectUrl('/production'));
      }, 1500);
      
    } catch (err) {
      console.error('Error saving production data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to save production data: ${errorMessage}`);
      toast({
        title: "Error",
        description: `Failed to save production data: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(getProjectUrl('/production'));
  };

  // Show loading state for initial data fetch
  if (isEditing && loading && !form.getValues().assetId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading production data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Production Data' : 'Add Production Data'}</CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Update the production details for your energy asset' 
            : 'Record new production data for your energy asset'}
          {projectId && (
            <span className="block text-sm text-muted-foreground mt-1">
              Project: {projectId}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Success Alert */}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Production data {isEditing ? 'updated' : 'created'} successfully! Redirecting...
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Energy Asset *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loading || assetsLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an asset" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assetsLoading ? (
                        <SelectItem value="loading" disabled>Loading assets...</SelectItem>
                      ) : assets.length === 0 ? (
                        <SelectItem value="no-assets" disabled>No assets available</SelectItem>
                      ) : (
                        assets.map((asset) => (
                          <SelectItem key={asset.assetId} value={asset.assetId}>
                            {asset.name} ({asset.type}, {asset.capacity} MW) - {asset.location}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the energy asset for which you are recording production
                    {assets.length === 0 && !assetsLoading && (
                      <span className="text-red-600 block mt-1">
                        No assets found. Please create an energy asset first.
                      </span>
                    )}
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
                  <FormLabel>Production Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={loading} />
                  </FormControl>
                  <FormDescription>
                    The date when this production occurred (cannot be in the future)
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
                  <FormLabel>Output (MWh) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0.01" 
                      max="10000"
                      {...field} 
                      disabled={loading} 
                    />
                  </FormControl>
                  <FormDescription>
                    The amount of energy produced in megawatt-hours (MWh)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border p-4 rounded-md bg-blue-50">
              <div className="flex items-center gap-2 mb-4">
                <CloudSun className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium">Weather Conditions</h3>
                {weatherDataLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Weather data helps correlate production with environmental conditions. 
                {!isEditing && " When you select an asset and date, suggested weather data will be loaded automatically."}
                {" All fields are optional."}
              </p>
              
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
                          max="24"
                          {...field} 
                          disabled={loading} 
                          placeholder="e.g. 8.5"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Hours of sunlight (0-24)
                      </FormDescription>
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
                          max="200"
                          {...field} 
                          disabled={loading} 
                          placeholder="e.g. 15.2"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Wind speed in mph (0-200)
                      </FormDescription>
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
                          min="-50"
                          max="70"
                          {...field} 
                          disabled={loading} 
                          placeholder="e.g. 25.0"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Temperature in Celsius (-50 to 70)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {!isEditing && selectedAssetId && productionDate && (
                <div className="mt-4 p-3 bg-blue-100 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Suggested weather data will be loaded automatically when available. 
                    You can modify or add your own weather measurements.
                    {weatherDataLoading && " Loading weather data..."}
                  </p>
                </div>
              )}

            </div>

            {/* Cleanup debounce timeout on unmount */}
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={form.handleSubmit(onSubmit)} 
          disabled={loading || assetsLoading || success}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Success!
            </>
          ) : (
            isEditing ? 'Update Production Data' : 'Create Production Data'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductionDataFormEnhanced;
