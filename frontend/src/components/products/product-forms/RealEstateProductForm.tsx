/**
 * Form component for real estate products
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { RealEstateProduct } from '@/types/products';
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

interface RealEstateProductFormProps {
  defaultValues?: Partial<RealEstateProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function RealEstateProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: RealEstateProductFormProps) {
  // Format dates and arrays for the form
  const formattedDefaultValues = {
    ...defaultValues,
    acquisitionDate: defaultValues?.acquisitionDate ? new Date(defaultValues.acquisitionDate) : null,
    leaseBeginDate: defaultValues?.leaseBeginDate ? new Date(defaultValues.leaseBeginDate) : null,
    leaseEndDate: defaultValues?.leaseEndDate ? new Date(defaultValues.leaseEndDate) : null,
    startingDate: defaultValues?.startingDate ? new Date(defaultValues.startingDate) : null,
    endingDate: defaultValues?.endingDate ? new Date(defaultValues.endingDate) : null,
    dispositionDate: defaultValues?.dispositionDate ? new Date(defaultValues.dispositionDate) : null,
    // Format arrays for form display
    environmentalCertifications: Array.isArray(defaultValues?.environmentalCertifications) 
      ? defaultValues.environmentalCertifications.join(', ') 
      : defaultValues?.environmentalCertifications || '',
  };
  
  // Initialize form without validation
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: formattedDefaultValues as any,
  });

  // Handle form submission
  const handleFormSubmit = async (data: any) => {
    console.log('RealEstateProductForm handleSubmit called with data:', data);
    
    // Process arrays for PostgreSQL
    let environmentalCertificationsArray = null;
    if (data.environmentalCertifications) {
      const certifications = data.environmentalCertifications.split(',').map((cert: string) => cert.trim()).filter((cert: string) => cert !== '');
      environmentalCertificationsArray = certifications.length > 0 ? certifications : null;
    }
    
    // Prepare the data for submission
    const formData = {
      ...data,
      environmentalCertifications: environmentalCertificationsArray,
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
      {/* Basic Property Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Property Information</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Property Name</label>
              <Input {...register('propertyName')} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Property ID</label>
              <Input {...register('propertyId')} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Property Address</label>
              <Textarea {...register('propertyAddress')} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Property Type</label>
                <Select onValueChange={(value) => setValue('propertyType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Office">Office</SelectItem>
                    <SelectItem value="Multifamily">Multifamily</SelectItem>
                    <SelectItem value="Mixed Use">Mixed Use</SelectItem>
                    <SelectItem value="Land">Land</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Geographic Location</label>
                <Input {...register('geographicLocation')} placeholder="e.g., New York, NY" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Development Stage</label>
                <Select onValueChange={(value) => setValue('developmentStage', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select development stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pre-Development">Pre-Development</SelectItem>
                    <SelectItem value="Under Construction">Under Construction</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Renovation">Renovation</SelectItem>
                    <SelectItem value="Redevelopment">Redevelopment</SelectItem>
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
                    <SelectItem value="Under Contract">Under Contract</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Sold">Sold</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Building Details */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Building Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Building</label>
                <Input {...register('building')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Unit</label>
                <Input {...register('unit')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Area Type</label>
                <Select onValueChange={(value) => setValue('areaType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select area type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gross">Gross</SelectItem>
                    <SelectItem value="Rentable">Rentable</SelectItem>
                    <SelectItem value="Usable">Usable</SelectItem>
                    <SelectItem value="Lot">Lot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Units (sqft/sqm)</label>
                <Input type="number" {...register('units')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Asset Number</label>
                <Input {...register('assetNumber')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Environmental Certifications</label>
                <Input {...register('environmentalCertifications')} placeholder="e.g., LEED, BREEAM, Energy Star" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Financial Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Financial Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Gross Amount</label>
                <Input type="number" {...register('grossAmount')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Taxable Amount</label>
                <Input type="number" {...register('taxableAmount')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Borrowing Rate (%)</label>
                <Input type="number" step="0.01" {...register('borrowingRate')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Target Raise</label>
                <Input type="number" {...register('targetRaise')} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Lease Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lease Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Lease Number</label>
                <Input {...register('leaseNumber')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Tenant</label>
                <Input {...register('tenant')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Lease Manager</label>
                <Input {...register('leaseManager')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Lease Classification</label>
                <Select onValueChange={(value) => setValue('leaseClassification', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lease classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operating">Operating</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Triple Net">Triple Net</SelectItem>
                    <SelectItem value="Gross">Gross</SelectItem>
                    <SelectItem value="Modified Gross">Modified Gross</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Billing Frequency</label>
                <Select onValueChange={(value) => setValue('billingFrequency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                    <SelectItem value="Semi-Annually">Semi-Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div>
                <label className="block text-sm font-medium mb-2">Acquisition Date</label>
                <DatePickerWithState
                  date={watch('acquisitionDate')}
                  setDate={(date) => setValue('acquisitionDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Disposition Date</label>
                <DatePickerWithState
                  date={watch('dispositionDate')}
                  setDate={(date) => setValue('dispositionDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Lease Begin Date</label>
                <DatePickerWithState
                  date={watch('leaseBeginDate')}
                  setDate={(date) => setValue('leaseBeginDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Lease End Date</label>
                <DatePickerWithState
                  date={watch('leaseEndDate')}
                  setDate={(date) => setValue('leaseEndDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Starting Date</label>
                <DatePickerWithState
                  date={watch('startingDate')}
                  setDate={(date) => setValue('startingDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Ending Date</label>
                <DatePickerWithState
                  date={watch('endingDate')}
                  setDate={(date) => setValue('endingDate', date)}
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
            'Save Real Estate Details'
          )}
        </Button>
      </div>
    </form>
  );
}
