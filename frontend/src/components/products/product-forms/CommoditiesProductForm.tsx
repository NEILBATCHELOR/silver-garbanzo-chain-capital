/**
 * Form component for commodities products
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { CommoditiesProduct } from '@/types/products';
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

interface CommoditiesProductFormProps {
  defaultValues?: Partial<CommoditiesProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function CommoditiesProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: CommoditiesProductFormProps) {
  // Format dates for the form and handle JSON fields
  const formattedDefaultValues = {
    ...defaultValues,
    contractIssueDate: defaultValues?.contractIssueDate ? new Date(defaultValues.contractIssueDate) : null,
    expirationDate: defaultValues?.expirationDate ? new Date(defaultValues.expirationDate) : null,
    // Format arrays for form display
    deliveryMonths: Array.isArray(defaultValues?.deliveryMonths) ? defaultValues.deliveryMonths.join(', ') : defaultValues?.deliveryMonths || '',
    productionInventoryLevels: Array.isArray(defaultValues?.productionInventoryLevels) ? JSON.stringify(defaultValues.productionInventoryLevels, null, 2) : defaultValues?.productionInventoryLevels || '',
    // Convert complex objects to JSON strings for the form
    rollHistoryJson: defaultValues?.rollHistory 
      ? JSON.stringify(defaultValues.rollHistory, null, 2) 
      : '',
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
    console.log('CommoditiesProductForm handleSubmit called with data:', data);
    
    // Transform comma-separated strings to arrays and JSON
    let deliveryMonthsArray = null;
    if (data.deliveryMonths) {
      const months = data.deliveryMonths.split(',').map((month: string) => month.trim()).filter((month: string) => month !== '');
      deliveryMonthsArray = months.length > 0 ? months : null;
    }
    
    let productionInventoryArray = null;
    if (data.productionInventoryLevels) {
      try {
        // Try to parse as JSON first
        productionInventoryArray = JSON.parse(data.productionInventoryLevels);
      } catch (e) {
        // If not JSON, treat as comma-separated values
        const levels = data.productionInventoryLevels.split(',').map((level: string) => parseFloat(level.trim())).filter(level => !isNaN(level));
        productionInventoryArray = levels.length > 0 ? levels : null;
      }
    }
    
    // Parse JSON strings to objects
    let rollHistoryObject = null;
    try {
      rollHistoryObject = data.rollHistoryJson ? JSON.parse(data.rollHistoryJson) : null;
    } catch (error) {
      console.error('Error parsing roll history JSON:', error);
    }

    // Prepare the data for submission
    const formData = {
      ...data,
      deliveryMonths: deliveryMonthsArray,
      productionInventoryLevels: productionInventoryArray,
      rollHistory: rollHistoryObject,
    };

    // Remove the temporary JSON field
    delete formData.rollHistoryJson;

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
                <label className="block text-sm font-medium mb-2">Commodity Name</label>
                <Input {...register('commodityName')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Commodity ID</label>
                <Input {...register('commodityId')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Commodity Type</label>
                <Select onValueChange={(value) => setValue('commodityType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select commodity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Energy">Energy</SelectItem>
                    <SelectItem value="Metals">Metals</SelectItem>
                    <SelectItem value="Agriculture">Agriculture</SelectItem>
                    <SelectItem value="Livestock">Livestock</SelectItem>
                    <SelectItem value="Precious Metals">Precious Metals</SelectItem>
                    <SelectItem value="Industrial Metals">Industrial Metals</SelectItem>
                    <SelectItem value="Soft Commodities">Soft Commodities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Exchange</label>
                <Select onValueChange={(value) => setValue('exchange', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exchange" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CME">CME Group</SelectItem>
                    <SelectItem value="ICE">Intercontinental Exchange</SelectItem>
                    <SelectItem value="LME">London Metal Exchange</SelectItem>
                    <SelectItem value="COMEX">COMEX</SelectItem>
                    <SelectItem value="NYMEX">NYMEX</SelectItem>
                    <SelectItem value="CBOT">Chicago Board of Trade</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Currency</label>
                <Select onValueChange={(value) => setValue('currency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
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
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contract Details</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Unit of Measure</label>
                <Input {...register('unitOfMeasure')} placeholder="e.g., barrel, ounce, bushel" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Contract Size</label>
                <Input type="number" {...register('contractSize')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Grade/Quality</label>
                <Input {...register('gradeQuality')} placeholder="e.g., Light Sweet Crude, 99.9% pure" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Liquidity Metric</label>
                <Input type="number" {...register('liquidityMetric')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select onValueChange={(value) => setValue('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Rolled">Rolled</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Settled">Settled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Delivery & Logistics</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Delivery Months (comma-separated)</label>
                <Textarea {...register('deliveryMonths')} placeholder="Jan, Mar, May, Jul, Sep, Nov" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Storage/Delivery Costs</label>
                <Input type="number" {...register('storageDeliveryCosts')} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Market Data</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Production/Inventory Levels</label>
                <Textarea 
                  {...register('productionInventoryLevels')} 
                  placeholder='[1000000, 950000, 1100000] or JSON format'
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Target Raise</label>
                <Input type="number" {...register('targetRaise')} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Important Dates</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Contract Issue Date</label>
                <DatePicker
                  date={watch('contractIssueDate')}
                  onSelect={(date) => setValue('contractIssueDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Expiration Date</label>
                <DatePicker
                  date={watch('expirationDate')}
                  onSelect={(date) => setValue('expirationDate', date)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Roll History (JSON Format)</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Roll History</label>
              <Textarea 
                {...register('rollHistoryJson')}
                rows={4}
                placeholder='[{"date": "2025-03-15", "fromContract": "CLM25", "toContract": "CLN25", "rollCost": 0.15}]'
              />
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
            'Save Commodities Details'
          )}
        </Button>
      </div>
    </form>
  );
}
