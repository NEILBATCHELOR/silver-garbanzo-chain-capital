/**
 * Form component for asset backed products
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { AssetBackedProduct } from '@/types/products';
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
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';

interface AssetBackedProductFormProps {
  defaultValues?: Partial<AssetBackedProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function AssetBackedProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: AssetBackedProductFormProps) {
  // Format dates and ensure all form values are properly initialized
  const formattedDefaultValues = {
    ...defaultValues,
    originationDate: defaultValues?.originationDate ? new Date(defaultValues.originationDate) : null,
    maturityDate: defaultValues?.maturityDate ? new Date(defaultValues.maturityDate) : null,
    demandResolutionDate: defaultValues?.demandResolutionDate ? new Date(defaultValues.demandResolutionDate) : null,
    // Initialize boolean values explicitly to prevent uncontrolled/controlled component warnings
    modificationIndicator: defaultValues?.modificationIndicator ?? false,
    // Format metadata dates for form display
    createdAt: defaultValues?.createdAt ? new Date(defaultValues.createdAt).toISOString().slice(0, 16) : '',
    updatedAt: defaultValues?.updatedAt ? new Date(defaultValues.updatedAt).toISOString().slice(0, 16) : '',
  };
  
  // Initialize form without validation
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: formattedDefaultValues as any,
  });

  // Handle form submission
  const handleFormSubmit = async (data: any) => {
    console.log('AssetBackedProductForm handleSubmit called with data:', data);
    
    // Prepare the data for submission
    const formData = {
      ...data
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Asset Type</label>
                <Select onValueChange={(value) => setValue('assetType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Invoice">Invoice</SelectItem>
                    <SelectItem value="Trade Receivable">Trade Receivable</SelectItem>
                    <SelectItem value="Mortgage">Mortgage</SelectItem>
                    <SelectItem value="Auto Loan">Auto Loan</SelectItem>
                    <SelectItem value="Student Loan">Student Loan</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Equipment Lease">Equipment Lease</SelectItem>
                    <SelectItem value="ABS Pool">ABS Pool</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Asset Number</label>
                <Input {...register('assetNumber')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Lien Position</label>
                <Select onValueChange={(value) => setValue('lienPosition', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lien position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Senior">Senior</SelectItem>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Mezzanine">Mezzanine</SelectItem>
                    <SelectItem value="Subordinated">Subordinated</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Debtor Credit Quality</label>
                <Select onValueChange={(value) => setValue('debtorCreditQuality', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select credit quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AAA">AAA</SelectItem>
                    <SelectItem value="AA">AA</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="BBB">BBB</SelectItem>
                    <SelectItem value="BB">BB</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="CCC">CCC</SelectItem>
                    <SelectItem value="CC">CC</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="Not Rated">Not Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select onValueChange={(value) => setValue('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Defaulted">Defaulted</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Repurchased">Repurchased</SelectItem>
                    <SelectItem value="Restructured">Restructured</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Financial Terms</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Original Amount</label>
                <Input type="number" {...register('originalAmount')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Current Balance</label>
                <Input type="number" {...register('currentBalance')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Interest Rate (%)</label>
                <Input type="number" step="0.01" {...register('interestRate')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Accrual Type</label>
                <Select onValueChange={(value) => setValue('accrualType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select accrual type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Simple">Simple</SelectItem>
                    <SelectItem value="Compound">Compound</SelectItem>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Payment Frequency</label>
                <Select onValueChange={(value) => setValue('paymentFrequency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Semi-Annually">Semi-Annually</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                    <SelectItem value="At Maturity">At Maturity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Prepayment Penalty</label>
                <Input type="number" {...register('prepaymentPenalty')} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Performance</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Days Past Due</label>
                <Input type="number" {...register('delinquencyStatus')} />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  checked={watch('modificationIndicator') || false}
                  onCheckedChange={(checked) => setValue('modificationIndicator', checked)}
                />
                <label className="text-sm font-medium">Has Been Modified</label>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Recovery Rate (%)</label>
                <Input type="number" step="0.01" min="0" max="100" {...register('recoveryRatePercentage')} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Collection</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Collection Period (days)</label>
                <Input type="number" {...register('collectionPeriodDays')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Diversification Metrics</label>
                <Input {...register('diversificationMetrics')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Target Raise</label>
                <Input type="number" {...register('targetRaise')} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Important Dates</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Origination Date</label>
                <DatePicker
                  date={watch('originationDate')}
                  onSelect={(date) => setValue('originationDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Maturity Date</label>
                <DatePicker
                  date={watch('maturityDate')}
                  onSelect={(date) => setValue('maturityDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Demand Resolution Date</label>
                <DatePicker
                  date={watch('demandResolutionDate')}
                  onSelect={(date) => setValue('demandResolutionDate', date)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Resolution</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Repurchase Amount</label>
              <Input type="number" {...register('repurchaseAmount')} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Repurchaser</label>
              <Input {...register('repurchaser')} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Record Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Created At</label>
                <Input 
                  {...register('createdAt')} 
                  type="datetime-local"
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Updated At</label>
                <Input 
                  {...register('updatedAt')} 
                  type="datetime-local"
                  disabled
                  className="bg-muted"
                />
              </div>
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
            'Save Product Details'
          )}
        </Button>
      </div>
    </form>
  );
}
