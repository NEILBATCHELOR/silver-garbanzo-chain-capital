/**
 * Form component for bond products
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { BondProduct } from '@/types/products';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BondProductFormProps {
  defaultValues?: Partial<BondProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function BondProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: BondProductFormProps) {
  // Format dates and complex types in defaultValues
  const formattedDefaultValues = {
    ...defaultValues,
    issueDate: defaultValues?.issueDate ? new Date(defaultValues.issueDate) : null,
    maturityDate: defaultValues?.maturityDate ? new Date(defaultValues.maturityDate) : null,
    redemptionCallDate: defaultValues?.redemptionCallDate ? new Date(defaultValues.redemptionCallDate) : null,
    callDate: defaultValues?.callDate ? new Date(defaultValues.callDate) : null,
    callPutDates: Array.isArray(defaultValues?.callPutDates) 
      ? defaultValues.callPutDates.join(', ')
      : defaultValues?.callPutDates || '',
    couponPaymentHistory: defaultValues?.couponPaymentHistory ? JSON.stringify(defaultValues.couponPaymentHistory) : '',
  };

  // Initialize form without validation
  const form = useForm({
    defaultValues: formattedDefaultValues as any,
  });

  // Handle form submission
  const handleSubmit = async (data: any) => {
    console.log('BondProductForm handleSubmit called with data:', data);
    
    // Process arrays and complex types
    const processedData = {
      ...data,
    };
    
    // Process call/put dates array for PostgreSQL
    if (data.callPutDates && Array.isArray(data.callPutDates)) {
      processedData.callPutDates = data.callPutDates.length > 0 ? data.callPutDates : null;
    } else if (typeof data.callPutDates === 'string' && data.callPutDates.trim()) {
      const callPutDatesArray = data.callPutDates.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '');
      processedData.callPutDates = callPutDatesArray.length > 0 ? callPutDatesArray : null;
    } else {
      processedData.callPutDates = null;
    }
    
    // Process JSON field
    try {
      processedData.couponPaymentHistory = data.couponPaymentHistory ? JSON.parse(data.couponPaymentHistory) : null;
    } catch (error) {
      console.error('Error parsing coupon payment history JSON:', error);
      processedData.couponPaymentHistory = null;
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
                name="bondIdentifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bond Identifier (ISIN/CUSIP)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="issuerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuer Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bondType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bond Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bond type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Government">Government</SelectItem>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                        <SelectItem value="Municipal">Municipal</SelectItem>
                        <SelectItem value="Zero-Coupon">Zero-Coupon</SelectItem>
                        <SelectItem value="Convertible">Convertible</SelectItem>
                        <SelectItem value="High-Yield">High-Yield</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="creditRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Rating</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select credit rating" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AAA">AAA</SelectItem>
                        <SelectItem value="AA+">AA+</SelectItem>
                        <SelectItem value="AA">AA</SelectItem>
                        <SelectItem value="AA-">AA-</SelectItem>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="BBB+">BBB+</SelectItem>
                        <SelectItem value="BBB">BBB</SelectItem>
                        <SelectItem value="BBB-">BBB-</SelectItem>
                        <SelectItem value="BB+">BB+</SelectItem>
                        <SelectItem value="BB">BB</SelectItem>
                        <SelectItem value="BB-">BB-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="CCC">CCC</SelectItem>
                        <SelectItem value="CC">CC</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
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
                        <SelectItem value="CHF">CHF</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
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
                        <SelectItem value="Outstanding">Outstanding</SelectItem>
                        <SelectItem value="Matured">Matured</SelectItem>
                        <SelectItem value="Called">Called</SelectItem>
                        <SelectItem value="Defaulted">Defaulted</SelectItem>
                        <SelectItem value="Redeemed">Redeemed</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Terms */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Financial Terms</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="couponRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Rate (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="faceValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Face Value</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="yieldToMaturity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yield to Maturity (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (years)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="accruedInterest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accrued Interest</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="couponFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Frequency</FormLabel>
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
                          <SelectItem value="Annual">Annual</SelectItem>
                          <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Zero-Coupon">Zero-Coupon</SelectItem>
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
            </div>
          </CardContent>
        </Card>

        {/* Call Features */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Call Features</h3>
              
              <FormField
                control={form.control}
                name="callableFlag"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Callable Bond</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Can this bond be called before maturity?
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="callableFeatures"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Callable Features Available</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Does this bond have special callable features?
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="callPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Call Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bondIsinCusip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bond ISIN/CUSIP</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Additional identifier for bond" />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="callPutDates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Call/Put Dates (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder="2024-06-01, 2025-06-01, 2026-06-01"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Important Dates</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  name="callDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Call Date</FormLabel>
                      <DatePickerWithState
                        date={field.value as Date | undefined}
                        setDate={(date) => field.onChange(date)}
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="redemptionCallDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Redemption/Call Date</FormLabel>
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
                name="securityCollateral"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security/Collateral</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder="Describe the security or collateral backing the bond"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="couponPaymentHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coupon Payment History (JSON format)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder='[{"date": "2024-06-01", "amount": 500}, {"date": "2024-12-01", "amount": 500}]'
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
              'Save Bond Details'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}