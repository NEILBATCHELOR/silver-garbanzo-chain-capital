/**
 * Form component for equity products
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { EquityProduct } from '@/types/products';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EquityProductFormProps {
  defaultValues?: Partial<EquityProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function EquityProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: EquityProductFormProps) {
  // Format dates in defaultValues
  const formattedDefaultValues = {
    ...defaultValues,
    ipoDate: defaultValues?.ipoDate ? new Date(defaultValues.ipoDate) : null,
    delistingDate: defaultValues?.delistingDate ? new Date(defaultValues.delistingDate) : null,
    acquisitionDisposalDate: defaultValues?.acquisitionDisposalDate ? new Date(defaultValues.acquisitionDisposalDate) : null,
    // Format arrays and complex types
    dilutionProtection: Array.isArray(defaultValues?.dilutionProtection) ? defaultValues.dilutionProtection.join(', ') : defaultValues?.dilutionProtection || '',
    corporateActionsHistory: defaultValues?.corporateActionsHistory ? JSON.stringify(defaultValues.corporateActionsHistory) : '',
    dividendPaymentDates: Array.isArray(defaultValues?.dividendPaymentDates) ? defaultValues.dividendPaymentDates.join(', ') : defaultValues?.dividendPaymentDates || '',
    // Format metadata dates for form display
    createdAt: defaultValues?.createdAt ? new Date(defaultValues.createdAt).toISOString().slice(0, 16) : '',
    updatedAt: defaultValues?.updatedAt ? new Date(defaultValues.updatedAt).toISOString().slice(0, 16) : '',
  };

  // Initialize form without validation
  const form = useForm({
    defaultValues: formattedDefaultValues as any,
  });

  // Handle form submission
  const handleSubmit = async (data: any) => {
    console.log('EquityProductForm handleSubmit called with data:', data);
    
    // Process arrays and complex types
    const processedData = {
      ...data,
    };
    
    // Process dilution protection array for PostgreSQL
    if (data.dilutionProtection && Array.isArray(data.dilutionProtection)) {
      processedData.dilutionProtection = data.dilutionProtection.length > 0 ? data.dilutionProtection : null;
    } else if (typeof data.dilutionProtection === 'string' && data.dilutionProtection.trim()) {
      const dilutionArray = data.dilutionProtection.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '');
      processedData.dilutionProtection = dilutionArray.length > 0 ? dilutionArray : null;
    } else {
      processedData.dilutionProtection = null;
    }
    
    // Process dividend payment dates array for PostgreSQL
    if (data.dividendPaymentDates && Array.isArray(data.dividendPaymentDates)) {
      processedData.dividendPaymentDates = data.dividendPaymentDates.length > 0 ? data.dividendPaymentDates : null;
    } else if (typeof data.dividendPaymentDates === 'string' && data.dividendPaymentDates.trim()) {
      const dividendDatesArray = data.dividendPaymentDates.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '');
      processedData.dividendPaymentDates = dividendDatesArray.length > 0 ? dividendDatesArray : null;
    } else {
      processedData.dividendPaymentDates = null;
    }
    
    // Process JSON field
    try {
      processedData.corporateActionsHistory = data.corporateActionsHistory ? JSON.parse(data.corporateActionsHistory) : null;
    } catch (error) {
      console.error('Error parsing corporate actions history JSON:', error);
      processedData.corporateActionsHistory = null;
    }
    
    console.log('Calling onSubmit with formData:', processedData);
    try {
      await onSubmit(processedData);
      console.log('onSubmit completed successfully');
    } catch (error) {
      console.error('Error in onSubmit:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tickerSymbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticker Symbol</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="exchange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exchange" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NYSE">NYSE</SelectItem>
                        <SelectItem value="NASDAQ">NASDAQ</SelectItem>
                        <SelectItem value="LSE">LSE</SelectItem>
                        <SelectItem value="TSE">TSE</SelectItem>
                        <SelectItem value="Euronext">Euronext</SelectItem>
                        <SelectItem value="ASX">ASX</SelectItem>
                        <SelectItem value="TSX">TSX</SelectItem>
                        <SelectItem value="HKEX">HKEX</SelectItem>
                        <SelectItem value="BSE">BSE</SelectItem>
                        <SelectItem value="SSE">SSE</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sectorIndustry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sector/Industry</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sector" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Financial Services">Financial Services</SelectItem>
                        <SelectItem value="Consumer Goods">Consumer Goods</SelectItem>
                        <SelectItem value="Energy">Energy</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Real Estate">Real Estate</SelectItem>
                        <SelectItem value="Materials">Materials</SelectItem>
                        <SelectItem value="Industrials">Industrials</SelectItem>
                        <SelectItem value="Telecommunications">Telecommunications</SelectItem>
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
                        <SelectItem value="AUD">AUD</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="CHF">CHF</SelectItem>
                        <SelectItem value="HKD">HKD</SelectItem>
                        <SelectItem value="SGD">SGD</SelectItem>
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
                        <SelectItem value="Suspended">Suspended</SelectItem>
                        <SelectItem value="Delisted">Delisted</SelectItem>
                        <SelectItem value="Halted">Halted</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Financial Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="marketCapitalization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market Capitalization</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="authorizedShares"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authorized Shares</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sharesOutstanding"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shares Outstanding</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dividendYield"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dividend Yield (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="earningsPerShare"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Earnings Per Share</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="priceEarningsRatio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price-to-Earnings Ratio</FormLabel>
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

        {/* Important Dates */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Important Dates</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="ipoDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>IPO Date</FormLabel>
                      <DatePickerWithState
                        date={field.value as Date | undefined}
                        setDate={(date) => field.onChange(date)}
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="delistingDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Delisting Date</FormLabel>
                      <DatePickerWithState
                        date={field.value as Date | undefined}
                        setDate={(date) => field.onChange(date)}
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="acquisitionDisposalDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Acquisition/Disposal Date</FormLabel>
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

        {/* Additional Information */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              
              <FormField
                control={form.control}
                name="votingRights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voting Rights</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder="Describe voting rights associated with these shares"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dividendPolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dividend Policy</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder="Describe the company's dividend policy"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="exitStrategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exit Strategy</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder="Describe potential exit strategies"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dilutionProtection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dilution Protection (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder="Anti-dilution provisions, Pre-emptive rights, etc."
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dividendPaymentDates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dividend Payment Dates (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder="2024-03-15, 2024-06-15, 2024-09-15, 2024-12-15"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="corporateActionsHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corporate Actions History (JSON format)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder='[{"type": "dividend", "date": "2024-06-15", "amount": 0.50}]'
                        rows={4}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Record Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="createdAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Created At</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="datetime-local"
                          disabled
                          className="bg-muted"
                          value={field.value || ''}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="updatedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Updated At</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="datetime-local"
                          disabled
                          className="bg-muted"
                          value={field.value || ''}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
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
              'Save Equity Details'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}