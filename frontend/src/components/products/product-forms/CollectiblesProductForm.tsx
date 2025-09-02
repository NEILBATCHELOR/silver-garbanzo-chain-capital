/**
 * Form component for collectibles products
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { CollectiblesProduct } from '@/types/products';
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

interface CollectiblesProductFormProps {
  defaultValues?: Partial<CollectiblesProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

function CollectiblesProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: CollectiblesProductFormProps) {
  // Format dates for the form
  const formattedDefaultValues = {
    ...defaultValues,
    acquisitionDate: defaultValues?.acquisitionDate ? new Date(defaultValues.acquisitionDate) : null,
    appraisalDate: defaultValues?.appraisalDate ? new Date(defaultValues.appraisalDate) : null,
    saleDate: defaultValues?.saleDate ? new Date(defaultValues.saleDate) : null,
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
    console.log('CollectiblesProductForm handleSubmit called with data:', data);
    
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
                    <SelectItem value="Art">Art</SelectItem>
                    <SelectItem value="Wine">Wine</SelectItem>
                    <SelectItem value="Watches">Watches</SelectItem>
                    <SelectItem value="Jewelry">Jewelry</SelectItem>
                    <SelectItem value="Classic Cars">Classic Cars</SelectItem>
                    <SelectItem value="Stamps">Stamps</SelectItem>
                    <SelectItem value="Coins">Coins</SelectItem>
                    <SelectItem value="Sports Memorabilia">Sports Memorabilia</SelectItem>
                    <SelectItem value="NFTs">NFTs</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Asset ID</label>
                <Input {...register('assetId')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea {...register('description')} rows={3} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Condition</label>
                <Select onValueChange={(value) => setValue('condition', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mint">Mint</SelectItem>
                    <SelectItem value="Near Mint">Near Mint</SelectItem>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Owner</label>
                <Input {...register('owner')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select onValueChange={(value) => setValue('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Held">Held</SelectItem>
                    <SelectItem value="For Sale">For Sale</SelectItem>
                    <SelectItem value="Sold">Sold</SelectItem>
                    <SelectItem value="On Display">On Display</SelectItem>
                    <SelectItem value="In Storage">In Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Financial Information</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Purchase Price</label>
                <Input type="number" {...register('purchasePrice')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Current Value</label>
                <Input type="number" {...register('currentValue')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Insurance Coverage Amount</label>
                <Input type="number" {...register('insuranceDetails')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Sale Price</label>
                <Input type="number" {...register('salePrice')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Target Raise</label>
                <Input type="number" {...register('targetRaise')} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Acquisition</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Acquisition Date</label>
                <DatePicker
                  date={watch('acquisitionDate')}
                  onSelect={(date) => setValue('acquisitionDate', date)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Appraisal & Sale</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Appraisal Date</label>
                <DatePicker
                  date={watch('appraisalDate')}
                  onSelect={(date) => setValue('appraisalDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Sale Date</label>
                <DatePicker
                  date={watch('saleDate')}
                  onSelect={(date) => setValue('saleDate', date)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Storage</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Storage Location</label>
                <Input {...register('location')} />
              </div>
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

export default CollectiblesProductForm;
