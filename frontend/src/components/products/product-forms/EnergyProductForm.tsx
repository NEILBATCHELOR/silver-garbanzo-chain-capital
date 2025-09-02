/**
 * Form component for energy products
 */

import React from 'react';
import { ProjectType } from '@/types/projects/projectTypes';
import { useForm } from 'react-hook-form';
import { EnergyProduct } from '@/types/products';
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

interface EnergyProductFormProps {
  defaultValues?: Partial<EnergyProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
  energyType?: ProjectType.ENERGY | ProjectType.SOLAR_WIND_CLIMATE;
}

export default function EnergyProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  energyType,
  onCancel
}: EnergyProductFormProps) {
  // Format dates and arrays for the form
  const formattedDefaultValues = {
    ...defaultValues,
    expectedOnlineDate: defaultValues?.expectedOnlineDate ? new Date(defaultValues.expectedOnlineDate) : null,
    decommissionDate: defaultValues?.decommissionDate ? new Date(defaultValues.decommissionDate) : null,
    // Convert complex objects to JSON strings for the form
    financialDataJson: defaultValues?.financialData 
      ? JSON.stringify(defaultValues.financialData, null, 2) 
      : '',
    performanceMetricsJson: defaultValues?.performanceMetrics 
      ? JSON.stringify(defaultValues.performanceMetrics, null, 2) 
      : '',
    timelineDataJson: defaultValues?.timelineData 
      ? JSON.stringify(defaultValues.timelineData, null, 2) 
      : '',
    // Format arrays for form display
    regulatoryApprovalsJson: defaultValues?.regulatoryApprovals 
      ? Array.isArray(defaultValues.regulatoryApprovals) 
        ? JSON.stringify(defaultValues.regulatoryApprovals, null, 2)
        : defaultValues.regulatoryApprovals
      : '',
  };
  
  // Initialize form without validation
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: formattedDefaultValues as any,
  });

  // Handle form submission
  const handleFormSubmit = async (data: any) => {
    console.log('EnergyProductForm handleSubmit called with data:', data);
    
    // Transform empty strings to undefined for optional fields
    const transformedData = {
      ...data,
      // Convert empty strings to undefined for proper database storage
      projectId: data.projectId === '' ? undefined : data.projectId,
      projectType: data.projectType === 'none' ? undefined : data.projectType,
      projectStatus: data.projectStatus === 'none' ? undefined : data.projectStatus,
      siteId: data.siteId === '' ? undefined : data.siteId,
      siteLocation: data.siteLocation === '' ? undefined : data.siteLocation,
      owner: data.owner === '' ? undefined : data.owner,
      electricityPurchaser: data.electricityPurchaser === '' ? undefined : data.electricityPurchaser,
      landType: data.landType === 'none' ? undefined : data.landType,
      regulatoryCompliance: data.regulatoryCompliance === '' ? undefined : data.regulatoryCompliance,
      fieldServiceLogs: data.fieldServiceLogs === '' ? undefined : data.fieldServiceLogs,
      powerPurchaseAgreements: data.powerPurchaseAgreements === '' ? undefined : data.powerPurchaseAgreements,
      status: data.status === 'none' ? undefined : data.status,
      financialDataJson: data.financialDataJson === '' ? undefined : data.financialDataJson,
      performanceMetricsJson: data.performanceMetricsJson === '' ? undefined : data.performanceMetricsJson,
      timelineDataJson: data.timelineDataJson === '' ? undefined : data.timelineDataJson,
      regulatoryApprovalsJson: data.regulatoryApprovalsJson === '' ? undefined : data.regulatoryApprovalsJson,
    };
    
    // Parse JSON strings to objects
    let financialDataObject, performanceMetricsObject, timelineDataObject, regulatoryApprovalsArray;
    
    try {
      financialDataObject = transformedData.financialDataJson ? JSON.parse(transformedData.financialDataJson) : null;
      performanceMetricsObject = transformedData.performanceMetricsJson ? JSON.parse(transformedData.performanceMetricsJson) : null;
      timelineDataObject = transformedData.timelineDataJson ? JSON.parse(transformedData.timelineDataJson) : null;
      
      // Handle regulatory approvals as an array if it's in JSON format
      if (transformedData.regulatoryApprovalsJson) {
        try {
          regulatoryApprovalsArray = JSON.parse(transformedData.regulatoryApprovalsJson);
        } catch (e) {
          // If parsing fails, assume it's a comma-separated string
          const approvals = transformedData.regulatoryApprovalsJson.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '');
          regulatoryApprovalsArray = approvals.length > 0 ? approvals : null;
        }
      } else {
        regulatoryApprovalsArray = null;
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }

    // Prepare the data for submission
    const formData = {
      ...transformedData,
      financialData: financialDataObject,
      performanceMetrics: performanceMetricsObject,
      timelineData: timelineDataObject,
      regulatoryApprovals: regulatoryApprovalsArray,
    };

    // Remove the temporary JSON fields
    delete formData.financialDataJson;
    delete formData.performanceMetricsJson;
    delete formData.timelineDataJson;
    delete formData.regulatoryApprovalsJson;

    console.log('Calling onSubmit with formData:', formData);
    try {
      await onSubmit(formData);
      console.log('onSubmit completed successfully');
    } catch (error) {
      console.error('Error in onSubmit:', error);
    }
  };

  // Get appropriate title based on energy type
  const getTitle = () => {
    if (energyType === ProjectType.SOLAR_WIND_CLIMATE) {
      return "Solar, Wind & Climate Project";
    }
    return "Energy Project";
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Project Name</label>
                <Input {...register('projectName')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Project Identifier</label>
                <Input {...register('projectIdentifier')} placeholder="Unique project identifier code" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Project ID</label>
                <Input {...register('projectId')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Project Type</label>
                <Select onValueChange={(value) => setValue('projectType', value === 'none' ? undefined : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Solar">Solar</SelectItem>
                    <SelectItem value="Wind">Wind</SelectItem>
                    <SelectItem value="Hydro">Hydro</SelectItem>
                    <SelectItem value="Geothermal">Geothermal</SelectItem>
                    <SelectItem value="Biomass">Biomass</SelectItem>
                    <SelectItem value="Battery Storage">Battery Storage</SelectItem>
                    <SelectItem value="Carbon Capture">Carbon Capture</SelectItem>
                    <SelectItem value="Climate Receivable">Climate Receivable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Owner</label>
                <Input {...register('owner')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select onValueChange={(value) => setValue('status', value === 'none' ? undefined : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Project Status</label>
                <Select onValueChange={(value) => setValue('projectStatus', value === 'none' ? undefined : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Construction">Construction</SelectItem>
                    <SelectItem value="Operating">Operating</SelectItem>
                    <SelectItem value="Decommissioning">Decommissioning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Project Specifications</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Capacity</label>
                  <Input type="number" {...register('capacity')} />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Project Capacity (MW)</label>
                  <Input type="number" {...register('projectCapacityMw')} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Site Location</label>
                <Input {...register('siteLocation')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Site ID</label>
                <Input {...register('siteId')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Land Type</label>
                <Select onValueChange={(value) => setValue('landType', value === 'none' ? undefined : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select land type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Brownfield">Brownfield</SelectItem>
                    <SelectItem value="Greenfield">Greenfield</SelectItem>
                    <SelectItem value="Agricultural">Agricultural</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Residential">Residential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Energy Output Purchaser</label>
                <Input {...register('electricityPurchaser')} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Environmental & Regulatory</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Carbon Offset Potential (tCO2e)</label>
                <Input type="number" {...register('carbonOffsetPotential')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Regulatory Compliance</label>
                <Textarea {...register('regulatoryCompliance')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Regulatory Approvals</label>
                <Textarea 
                  {...register('regulatoryApprovalsJson')} 
                  placeholder='["Environmental Impact Assessment", "Land Use Permit", "Grid Connection Agreement"]'
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Financial & Contracts</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Receivable Amount</label>
                <Input type="number" {...register('receivableAmount')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Power Purchase Agreements</label>
                <Textarea {...register('powerPurchaseAgreements')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Target Raise</label>
                <Input type="number" {...register('targetRaise')} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Important Dates</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Expected Online Date</label>
                <DatePickerWithState
                  date={watch('expectedOnlineDate')}
                  setDate={(date) => setValue('expectedOnlineDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Decommission Date</label>
                <DatePickerWithState
                  date={watch('decommissionDate')}
                  setDate={(date) => setValue('decommissionDate', date)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Complex Data (JSON Format)</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Financial Data (JSON)</label>
              <Textarea 
                {...register('financialDataJson')}
                rows={4}
                placeholder='{"capex": 5000000, "opex": 200000, "roi": 0.12}'
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Performance Metrics (JSON)</label>
              <Textarea 
                {...register('performanceMetricsJson')}
                rows={4}
                placeholder='{"availability": 0.98, "efficiency": 0.85, "capacityFactor": 0.32}'
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Timeline Data (JSON)</label>
              <Textarea 
                {...register('timelineDataJson')}
                rows={4}
                placeholder='[{"date": "2025-01-15", "milestone": "Permitting Completed"}, {"date": "2025-06-30", "milestone": "Construction Start"}]'
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Field Service Logs</label>
              <Textarea 
                {...register('fieldServiceLogs')}
                rows={4}
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
            `Save ${getTitle()} Details`
          )}
        </Button>
      </div>
    </form>
  );
}
