/**
 * Form component for private debt products
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { PrivateDebtProduct } from '@/types/products';
import { EnhancedPrivateDebtProduct } from '@/types/products/enhancedProducts';
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

interface PrivateDebtProductFormProps {
  defaultValues?: Partial<EnhancedPrivateDebtProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function PrivateDebtProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: PrivateDebtProductFormProps) {
  // Format dates for the form
  const formattedDefaultValues = {
    ...defaultValues,
    executionDate: defaultValues?.executionDate ? new Date(defaultValues.executionDate) : null,
    // Convert complex objects to JSON strings for the form
    financialMetricsJson: defaultValues?.financialMetrics 
      ? JSON.stringify(defaultValues.financialMetrics, null, 2) 
      : '',
    portfolioPerformanceMetricsJson: defaultValues?.portfolioPerformanceMetrics 
      ? JSON.stringify(defaultValues.portfolioPerformanceMetrics, null, 2) 
      : '',
    diversificationMetricsJson: defaultValues?.diversificationMetrics
      ? JSON.stringify(defaultValues.diversificationMetrics, null, 2)
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
    console.log('PrivateDebtProductForm handleSubmit called with data:', data);
    
    // Parse JSON strings to objects
    let financialMetricsObject, portfolioPerformanceMetricsObject, diversificationMetricsObject;
    
    try {
      financialMetricsObject = data.financialMetricsJson ? JSON.parse(data.financialMetricsJson) : null;
      portfolioPerformanceMetricsObject = data.portfolioPerformanceMetricsJson ? JSON.parse(data.portfolioPerformanceMetricsJson) : null;
      diversificationMetricsObject = data.diversificationMetricsJson ? JSON.parse(data.diversificationMetricsJson) : null;
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }

    // Prepare the data for submission
    const formData = {
      ...data,
      financialMetrics: financialMetricsObject,
      portfolioPerformanceMetrics: portfolioPerformanceMetricsObject,
      diversificationMetrics: diversificationMetricsObject,
    };

    // Remove the temporary JSON fields
    delete formData.financialMetricsJson;
    delete formData.portfolioPerformanceMetricsJson;
    delete formData.diversificationMetricsJson;

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
                <label className="block text-sm font-medium mb-2">Company Name</label>
                <Input {...register('companyName')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Deal ID</label>
                <Input {...register('dealId')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Industry Sector</label>
                <Select onValueChange={(value) => setValue('industrySector', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Financial Services">Financial Services</SelectItem>
                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Energy">Energy</SelectItem>
                    <SelectItem value="Real Estate">Real Estate</SelectItem>
                    <SelectItem value="Transportation">Transportation</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Opportunity Source</label>
                <Select onValueChange={(value) => setValue('opportunitySource', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select opportunity source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Network">Network</SelectItem>
                    <SelectItem value="Market Research">Market Research</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Direct Approach">Direct Approach</SelectItem>
                    <SelectItem value="Investment Bank">Investment Bank</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
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
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Deal Details</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Deal Size</label>
                <Input type="number" {...register('dealSize')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Valuation Amount</label>
                <Input type="number" {...register('valuationAmount')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Risk Profile</label>
                <Select onValueChange={(value) => setValue('riskProfile', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Very High">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Monitoring Frequency (months)</label>
                <Input type="number" {...register('monitoringFrequency')} />
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
              <h3 className="text-lg font-semibold">Credit & Recovery Details</h3>
              
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
                    <SelectItem value="Not Rated">Not Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Collection Period (days)</label>
                <Input type="number" {...register('collectionPeriodDays')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Recovery Rate (%)</label>
                <Input type="number" step="0.01" min="0" max="100" {...register('recoveryRatePercentage')} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Process Status</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Screening Status</label>
                <Select onValueChange={(value) => setValue('screeningStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select screening status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Due Diligence Status</label>
                <Select onValueChange={(value) => setValue('dueDiligenceStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select due diligence status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Issues Identified">Issues Identified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Transaction Status</label>
                <Select onValueChange={(value) => setValue('transactionStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Negotiating">Negotiating</SelectItem>
                    <SelectItem value="Executed">Executed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Details</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Execution Date</label>
                <DatePickerWithState
                  date={watch('executionDate')}
                  setDate={(date) => setValue('executionDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Advisory Service Type</label>
                <Select onValueChange={(value) => setValue('advisoryServiceType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select advisory service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Strategic Planning">Strategic Planning</SelectItem>
                    <SelectItem value="Financial Advisory">Financial Advisory</SelectItem>
                    <SelectItem value="Operational Improvement">Operational Improvement</SelectItem>
                    <SelectItem value="Risk Management">Risk Management</SelectItem>
                    <SelectItem value="Exit Strategy">Exit Strategy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Outcome</label>
                <Select onValueChange={(value) => setValue('outcome', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Successful">Successful</SelectItem>
                    <SelectItem value="Partial Success">Partial Success</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Ongoing">Ongoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Deal Structure & Metrics</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Deal Structure Details</label>
              <Textarea {...register('dealStructureDetails')} rows={3} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Financial Metrics (JSON)</label>
              <Textarea 
                {...register('financialMetricsJson')}
                rows={4}
                placeholder='{"ebitda": 5000000, "debtToEquity": 0.6, "interestCoverage": 3.2}'
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Portfolio Performance Metrics (JSON)</label>
              <Textarea 
                {...register('portfolioPerformanceMetricsJson')}
                rows={4}
                placeholder='{"irr": 0.15, "moic": 2.1, "cashYield": 0.08}'
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Diversification Metrics (JSON)</label>
              <Textarea 
                {...register('diversificationMetricsJson')}
                rows={4}
                placeholder='{"industryDiversification": 0.8, "geographicDiversification": 0.6}'
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Credit & Collection Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium mb-2">Collection Period (days)</label>
                <Input type="number" {...register('collectionPeriodDays')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Recovery Rate (%)</label>
                <Input type="number" step="0.01" min="0" max="100" {...register('recoveryRatePercentage')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Target Raise</label>
                <Input type="number" {...register('targetRaise')} />
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
                    <SelectItem value="Restructured">Restructured</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Written Off">Written Off</SelectItem>
                  </SelectContent>
                </Select>
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
            'Save Private Debt Details'
          )}
        </Button>
      </div>
    </form>
  );
}
