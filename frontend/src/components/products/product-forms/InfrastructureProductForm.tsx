/**
 * Form component for infrastructure products
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { InfrastructureProduct } from '@/types/products';
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

interface InfrastructureProductFormProps {
  defaultValues?: Partial<InfrastructureProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function InfrastructureProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: InfrastructureProductFormProps) {
  // Format dates for the form
  const formattedDefaultValues = {
    ...defaultValues,
    designDate: defaultValues?.designDate ? new Date(defaultValues.designDate) : null,
    procurementDate: defaultValues?.procurementDate ? new Date(defaultValues.procurementDate) : null,
    rehabilitationDate: defaultValues?.rehabilitationDate ? new Date(defaultValues.rehabilitationDate) : null,
    replacementDate: defaultValues?.replacementDate ? new Date(defaultValues.replacementDate) : null,
    inspectionDate: defaultValues?.inspectionDate ? new Date(defaultValues.inspectionDate) : null,
    // Convert complex objects to JSON strings for the form
    performanceMetricsJson: defaultValues?.performanceMetrics 
      ? JSON.stringify(defaultValues.performanceMetrics, null, 2) 
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
    console.log('InfrastructureProductForm handleSubmit called with data:', data);
    
    // Parse JSON strings to objects for PostgreSQL JSONB column
    let performanceMetricsObject = null;
    if (data.performanceMetricsJson) {
      try {
        performanceMetricsObject = JSON.parse(data.performanceMetricsJson);
      } catch (error) {
        console.error('Error parsing performance metrics JSON:', error);
      }
    }

    // Prepare the data for submission
    const formData = {
      ...data,
      performanceMetrics: performanceMetricsObject,
    };

    // Remove the temporary JSON fields
    delete formData.performanceMetricsJson;

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
                    <SelectItem value="Bridge">Bridge</SelectItem>
                    <SelectItem value="Tunnel">Tunnel</SelectItem>
                    <SelectItem value="Road">Road</SelectItem>
                    <SelectItem value="Railway">Railway</SelectItem>
                    <SelectItem value="Port">Port</SelectItem>
                    <SelectItem value="Airport">Airport</SelectItem>
                    <SelectItem value="Water Treatment">Water Treatment</SelectItem>
                    <SelectItem value="Waste Management">Waste Management</SelectItem>
                    <SelectItem value="Telecommunications">Telecommunications</SelectItem>
                    <SelectItem value="Data Center">Data Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Asset ID</label>
                <Input {...register('assetId')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Age (years)</label>
                <Input type="number" {...register('age')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select onValueChange={(value) => setValue('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Operational">Operational</SelectItem>
                    <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="Under Construction">Under Construction</SelectItem>
                    <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Condition & Performance</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Condition Score (1-5)</label>
                <Select onValueChange={(value) => setValue('conditionScore', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition score" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Fair</SelectItem>
                    <SelectItem value="3">3 - Average</SelectItem>
                    <SelectItem value="4">4 - Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Maintenance Backlog (items)</label>
                <Input type="number" {...register('maintenanceBacklog')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Mean Time Between Failure (days)</label>
                <Input type="number" {...register('meanTimeBetweenFailure')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Safety Incidents</label>
                <Input type="number" {...register('safetyIncidents')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Cost of Replacement</label>
                <Input type="number" {...register('costOfReplacement')} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Design & Procurement</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Design Date</label>
                <DatePicker
                  date={watch('designDate')}
                  onSelect={(date) => setValue('designDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Procurement Date</label>
                <DatePicker
                  date={watch('procurementDate')}
                  onSelect={(date) => setValue('procurementDate', date)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Maintenance & Inspection</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Rehabilitation Date</label>
                <DatePicker
                  date={watch('rehabilitationDate')}
                  onSelect={(date) => setValue('rehabilitationDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Last Inspection Date</label>
                <DatePicker
                  date={watch('inspectionDate')}
                  onSelect={(date) => setValue('inspectionDate', date)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Future</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Planned Replacement Date</label>
                <DatePicker
                  date={watch('replacementDate')}
                  onSelect={(date) => setValue('replacementDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Target Raise</label>
                <Input type="number" {...register('targetRaise')} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Performance Metrics (JSON Format)</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Performance Metrics (JSON)</label>
              <Textarea 
                {...register('performanceMetricsJson')}
                rows={5}
                placeholder='{"availability": 0.98, "reliabilityIndex": 0.95, "maintenanceCostPerYear": 250000}'
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
            'Save Infrastructure Details'
          )}
        </Button>
      </div>
    </form>
  );
}
