/**
 * Form component for structured products
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { StructuredProduct } from '@/types/products';
import { EnhancedStructuredProduct } from '@/types/products/enhancedProducts';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import DatePickerWithState from '@/components/ui/date-picker-with-state';

interface StructuredProductFormProps {
  defaultValues?: Partial<EnhancedStructuredProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function StructuredProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: StructuredProductFormProps) {
  // Format dates for the form and handle JSON fields
  const formattedDefaultValues = {
    ...defaultValues,
    issueDate: defaultValues?.issueDate ? new Date(defaultValues.issueDate) : null,
    maturityDate: defaultValues?.maturityDate ? new Date(defaultValues.maturityDate) : null,
    redemptionDate: defaultValues?.redemptionDate ? new Date(defaultValues.redemptionDate) : null,
    // Format array for form display
    underlyingAssets: Array.isArray(defaultValues?.underlyingAssets) ? defaultValues.underlyingAssets.join(', ') : defaultValues?.underlyingAssets || '',
    // Format JSON fields for editing
    complexFeaturesJson: defaultValues?.complexFeatures 
      ? JSON.stringify(defaultValues.complexFeatures, null, 2) 
      : '',
    eventHistoryJson: defaultValues?.eventHistory 
      ? JSON.stringify(defaultValues.eventHistory, null, 2) 
      : '',
    valuationHistoryJson: defaultValues?.valuationHistory 
      ? JSON.stringify(defaultValues.valuationHistory, null, 2) 
      : '',
    monitoringTriggersJson: defaultValues?.monitoringTriggers 
      ? JSON.stringify(defaultValues.monitoringTriggers, null, 2) 
      : '',
  };
  
  // Initialize form without validation
  const form = useForm({
    defaultValues: formattedDefaultValues as any,
  });

  // Handle form submission
  const handleSubmit = async (data: any) => {
    console.log('StructuredProductForm handleSubmit called with data:', data);
    
    // Transform the underlying assets string to an array for PostgreSQL
    let underlyingAssetsArray = null;
    if (data.underlyingAssets) {
      const assets = data.underlyingAssets.split(',').map((asset: string) => asset.trim()).filter((asset: string) => asset !== '');
      underlyingAssetsArray = assets.length > 0 ? assets : null;
    }

    // Parse JSON fields
    let complexFeaturesObject = null;
    let eventHistoryObject = null;
    let valuationHistoryObject = null;
    let monitoringTriggersObject = null;
    
    if (data.complexFeaturesJson) {
      try {
        complexFeaturesObject = JSON.parse(data.complexFeaturesJson);
      } catch (error) {
        console.error('Error parsing complex features JSON:', error);
      }
    }
    
    if (data.eventHistoryJson) {
      try {
        eventHistoryObject = JSON.parse(data.eventHistoryJson);
      } catch (error) {
        console.error('Error parsing event history JSON:', error);
      }
    }
    
    if (data.valuationHistoryJson) {
      try {
        valuationHistoryObject = JSON.parse(data.valuationHistoryJson);
      } catch (error) {
        console.error('Error parsing valuation history JSON:', error);
      }
    }
    
    if (data.monitoringTriggersJson) {
      try {
        monitoringTriggersObject = JSON.parse(data.monitoringTriggersJson);
      } catch (error) {
        console.error('Error parsing monitoring triggers JSON:', error);
      }
    }

    // Prepare the data for submission
    const formData = {
      ...data,
      underlyingAssets: underlyingAssetsArray,
      complexFeatures: complexFeaturesObject,
      eventHistory: eventHistoryObject,
      valuationHistory: valuationHistoryObject,
      monitoringTriggers: monitoringTriggersObject,
    };

    // Remove temporary JSON fields
    delete formData.complexFeaturesJson;
    delete formData.eventHistoryJson;
    delete formData.valuationHistoryJson;
    delete formData.monitoringTriggersJson;

    console.log('Calling onSubmit with formData:', formData);
    try {
      await onSubmit(formData);
      console.log('onSubmit completed successfully');
    } catch (error) {
      console.error('Error in onSubmit:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product ID (e.g., ISIN/CUSIP)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="issuer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issuer</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
                          <SelectItem value="CHF">CHF</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Matured">Matured</SelectItem>
                          <SelectItem value="Called">Called</SelectItem>
                          <SelectItem value="Suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Financial Terms</h3>
                
                <FormField
                  control={form.control}
                  name="underlyingAssets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Underlying Assets (comma-separated)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="payoffStructure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payoff Structure</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payoff structure" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Capital-Protected">Capital-Protected</SelectItem>
                          <SelectItem value="Autocallable">Autocallable</SelectItem>
                          <SelectItem value="Reverse Convertible">Reverse Convertible</SelectItem>
                          <SelectItem value="Barrier Option">Barrier Option</SelectItem>
                          <SelectItem value="Twin-Win">Twin-Win</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="barrierLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barrier Level (%)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="couponRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Rate (%)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="strikePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strike Price</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="protectionLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protection Level (%)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="nominalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nominal Amount</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Important Dates</h3>
                
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Issue Date</FormLabel>
                      <DatePickerWithState
                        date={field.value as Date | undefined}
                        setDate={(date) => field.onChange(date)}
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maturityDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Maturity Date</FormLabel>
                      <DatePickerWithState
                        date={field.value as Date | undefined}
                        setDate={(date) => field.onChange(date)}
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="redemptionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Redemption Date</FormLabel>
                      <DatePickerWithState
                        date={field.value as Date | undefined}
                        setDate={(date) => field.onChange(date)}
                      />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Risk & Target</h3>
                
                <FormField
                  control={form.control}
                  name="riskIndicators"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Score (0-10)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="10" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="riskRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Rating (1-5)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select risk rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 - Very Low Risk</SelectItem>
                          <SelectItem value="2">2 - Low Risk</SelectItem>
                          <SelectItem value="3">3 - Medium Risk</SelectItem>
                          <SelectItem value="4">4 - High Risk</SelectItem>
                          <SelectItem value="5">5 - Very High Risk</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="targetRaise"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Raise</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Marketing & Distribution</h3>
                
                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="distributionStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distribution Strategy</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select distribution strategy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Private Placement">Private Placement</SelectItem>
                          <SelectItem value="Public Offering">Public Offering</SelectItem>
                          <SelectItem value="Wealth Management">Wealth Management</SelectItem>
                          <SelectItem value="Retail Banking">Retail Banking</SelectItem>
                          <SelectItem value="Direct Sales">Direct Sales</SelectItem>
                          <SelectItem value="Third-Party Distribution">Third-Party Distribution</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Complex Features & History (JSON Format)</h3>
              <p className="text-sm text-muted-foreground">Enter complex data as JSON objects.</p>
              
              <FormField
                control={form.control}
                name="complexFeaturesJson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complex Features</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        rows={4}
                        placeholder='{"participationRate": 65, "airbagFeature": true, "barrierType": "European"}'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="eventHistoryJson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event History</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        rows={4}
                        placeholder='[{"date": "2024-01-15", "event": "Product Launch", "details": "Initial issuance completed"}]'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="valuationHistoryJson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valuation History</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        rows={4}
                        placeholder='[{"date": "2024-01-31", "value": 102.5, "method": "mark-to-market"}]'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="monitoringTriggersJson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monitoring Triggers</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        rows={4}
                        placeholder='{"barrierBreach": {"threshold": 60, "action": "early_redemption"}, "volatilityLimit": 25}'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Product Details'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}