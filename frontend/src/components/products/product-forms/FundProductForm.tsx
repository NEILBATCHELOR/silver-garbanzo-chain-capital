/**
 * Form component for fund products (ETFs, Mutual Funds, ETPs)
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { FundProduct } from '@/types/products';
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
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import DatePickerWithState from '@/components/ui/date-picker-with-state';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FundProductFormProps {
  defaultValues?: Partial<FundProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function FundProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: FundProductFormProps) {
  // Format dates and complex types for the form
  const formattedDefaultValues = {
    ...defaultValues,
    inceptionDate: defaultValues?.inceptionDate ? new Date(defaultValues.inceptionDate) : null,
    closureLiquidationDate: defaultValues?.closureLiquidationDate ? new Date(defaultValues.closureLiquidationDate) : null,
    // Format complex types
    holdings: defaultValues?.holdings ? JSON.stringify(defaultValues.holdings, null, 2) : '',
    creationRedemptionHistory: defaultValues?.creationRedemptionHistory ? JSON.stringify(defaultValues.creationRedemptionHistory, null, 2) : '',
    performanceHistory: defaultValues?.performanceHistory ? JSON.stringify(defaultValues.performanceHistory, null, 2) : '',
    flowData: defaultValues?.flowData ? JSON.stringify(defaultValues.flowData, null, 2) : '',
    // Handle potential array fields
    sectorFocus: Array.isArray(defaultValues?.sectorFocus) 
      ? defaultValues.sectorFocus.join(', ')
      : defaultValues?.sectorFocus || '',
    geographicFocus: Array.isArray(defaultValues?.geographicFocus)
      ? defaultValues.geographicFocus.join(', ')
      : defaultValues?.geographicFocus || '',
  };

  // Initialize form without validation
  const form = useForm({
    defaultValues: formattedDefaultValues as any,
  });

  // Handle form submission
  const handleSubmit = async (data: any) => {
    console.log('FundProductForm handleSubmit called with data:', data);
    
    // Convert arrays back from comma-separated strings
    let sectorFocusArray = null;
    if (data.sectorFocus) {
      const sectors = data.sectorFocus.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '');
      sectorFocusArray = sectors.length > 0 ? sectors : null;
    }
    
    let geographicFocusArray = null;
    if (data.geographicFocus) {
      const geographies = data.geographicFocus.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '');
      geographicFocusArray = geographies.length > 0 ? geographies : null;
    }
    
    // Parse JSON fields
    let holdingsObject = null;
    if (data.holdings) {
      try {
        holdingsObject = JSON.parse(data.holdings);
      } catch (error) {
        console.error('Error parsing holdings JSON:', error);
      }
    }
    
    let creationRedemptionHistoryObject = null;
    if (data.creationRedemptionHistory) {
      try {
        creationRedemptionHistoryObject = JSON.parse(data.creationRedemptionHistory);
      } catch (error) {
        console.error('Error parsing creation/redemption history JSON:', error);
      }
    }
    
    let performanceHistoryObject = null;
    if (data.performanceHistory) {
      try {
        performanceHistoryObject = JSON.parse(data.performanceHistory);
      } catch (error) {
        console.error('Error parsing performance history JSON:', error);
      }
    }
    
    let flowDataObject = null;
    if (data.flowData) {
      try {
        flowDataObject = JSON.parse(data.flowData);
      } catch (error) {
        console.error('Error parsing flow data JSON:', error);
      }
    }

    // Prepare the data for submission
    const formData = {
      ...data,
      sectorFocus: sectorFocusArray,
      geographicFocus: geographicFocusArray,
      holdings: holdingsObject,
      creationRedemptionHistory: creationRedemptionHistoryObject,
      performanceHistory: performanceHistoryObject,
      flowData: flowDataObject,
    };

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
        {/* Basic Fund Information */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Fund Information</h3>
              
              <FormField
                control={form.control}
                name="fundName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fund Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fundTicker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fund Ticker</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fundType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fund Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fund type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ETF">ETF</SelectItem>
                        <SelectItem value="Mutual Fund">Mutual Fund</SelectItem>
                        <SelectItem value="ETP">ETP</SelectItem>
                        <SelectItem value="Index Fund">Index Fund</SelectItem>
                        <SelectItem value="Hedge Fund">Hedge Fund</SelectItem>
                        <SelectItem value="Closed-End Fund">Closed-End Fund</SelectItem>
                        <SelectItem value="Open-End Fund">Open-End Fund</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
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
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Closed to New Investors">Closed to New Investors</SelectItem>
                        <SelectItem value="Liquidating">Liquidating</SelectItem>
                        <SelectItem value="Suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Metrics */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Financial Metrics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="netAssetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Net Asset Value (NAV)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="assetsUnderManagement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assets Under Management (AUM)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="expenseRatio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Ratio (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="trackingError"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Error (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
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
            </div>
          </CardContent>
        </Card>

        {/* Key Information */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Key Information</h3>
              
              <FormField
                control={form.control}
                name="benchmarkIndex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Benchmark Index</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="distributionFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distribution Frequency</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Semi-Annually">Semi-Annually</SelectItem>
                        <SelectItem value="Annually">Annually</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sectorFocus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sector Focus (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder="Technology, Healthcare, Financial Services"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="geographicFocus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Geographic Focus (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder="US, Europe, Asia Pacific"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fundVintageYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fund Vintage Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value || ''} placeholder="2024" />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="investmentStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment Stage</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select investment stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Early Stage">Early Stage</SelectItem>
                        <SelectItem value="Growth Stage">Growth Stage</SelectItem>
                        <SelectItem value="Late Stage">Late Stage</SelectItem>
                        <SelectItem value="Mature">Mature</SelectItem>
                        <SelectItem value="All Stages">All Stages</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Important Dates */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Important Dates</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="inceptionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Inception Date</FormLabel>
                      <DatePickerWithState
                        date={field.value as Date | undefined}
                        setDate={(date) => field.onChange(date)}
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="closureLiquidationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Closure/Liquidation Date</FormLabel>
                      <DatePickerWithState
                        date={field.value as Date | undefined}
                        setDate={(date) => field.onChange(date)}
                      />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Holdings and History */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Holdings and History (JSON Format)</h3>
              
              <FormField
                control={form.control}
                name="holdings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holdings</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder='[{"security": "AAPL", "weight": 0.05, "shares": 1000}]'
                        rows={4}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="creationRedemptionHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Creation/Redemption History</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder='[{"date": "2024-01-15", "type": "creation", "units": 50000}]'
                        rows={4}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="performanceHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Performance History</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder='[{"date": "2024-01-31", "nav": 100.50, "return": 0.005}]'
                        rows={4}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="flowData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Flow Data</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder='[{"date": "2024-01-31", "inflows": 1000000, "outflows": 500000}]'
                        rows={4}
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
              'Save Fund Details'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}