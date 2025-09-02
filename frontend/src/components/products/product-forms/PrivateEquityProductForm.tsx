/**
 * Form component for private equity products
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { PrivateEquityProduct } from '@/types/products';
import { BaseProductFormProps } from '../interfaces';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DatePickerWithState from '@/components/ui/date-picker-with-state';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface PrivateEquityProductFormProps extends BaseProductFormProps {
  defaultValues?: Partial<PrivateEquityProduct>;
}

export default function PrivateEquityProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: PrivateEquityProductFormProps) {
  // Format dates for the form
  const formattedDefaultValues = {
    ...defaultValues,
    formationDate: defaultValues?.formationDate ? new Date(defaultValues.formationDate) : null,
    investmentDate: defaultValues?.investmentDate ? new Date(defaultValues.investmentDate) : null,
    exitDate: defaultValues?.exitDate ? new Date(defaultValues.exitDate) : null,
  };
  
  // Initialize form without validation
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: formattedDefaultValues as any,
  });

  // Handle form submission
  const handleFormSubmit = async (data: any) => {
    console.log('PrivateEquityProductForm handleSubmit called with data:', data);
    
    // Prepare the data for submission
    const formData = {
      ...data,
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
              <h3 className="text-lg font-semibold">Fund Information</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Fund Name</label>
                <Input {...register('fundName')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Fund ID</label>
                <Input {...register('fundId')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Fund Type</label>
                <Select onValueChange={(value) => setValue('fundType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Venture Capital">Venture Capital</SelectItem>
                    <SelectItem value="Growth Equity">Growth Equity</SelectItem>
                    <SelectItem value="Buyout">Buyout</SelectItem>
                    <SelectItem value="Mezzanine">Mezzanine</SelectItem>
                    <SelectItem value="Distressed">Distressed</SelectItem>
                    <SelectItem value="Fund of Funds">Fund of Funds</SelectItem>
                    <SelectItem value="Secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Fund Size</label>
                <Input type="number" {...register('fundSize')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Fund Vintage Year</label>
                <Input {...register('fundVintageYear')} placeholder="e.g., 2024" />
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
              
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select onValueChange={(value) => setValue('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Fundraising">Fundraising</SelectItem>
                    <SelectItem value="Investing">Investing</SelectItem>
                    <SelectItem value="Harvesting">Harvesting</SelectItem>
                    <SelectItem value="Liquidated">Liquidated</SelectItem>
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
                <label className="block text-sm font-medium mb-2">Commitment Period (months)</label>
                <Input type="number" {...register('commitmentPeriod')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Capital Commitment</label>
                <Input type="number" {...register('capitalCommitment')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Capital Call</label>
                <Input type="number" {...register('capitalCall')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Invested Capital</label>
                <Input type="number" {...register('investedCapital')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Management Fee (%)</label>
                <Input type="number" step="0.01" {...register('managementFee')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Carried Interest (%)</label>
                <Input type="number" step="0.01" {...register('carriedInterest')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Hurdle Rate (%)</label>
                <Input type="number" step="0.01" {...register('hurdleRate')} />
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
              <h3 className="text-lg font-semibold">Performance Metrics</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Internal Rate of Return (%)</label>
                <Input type="number" step="0.01" {...register('internalRateOfReturn')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Net Asset Value</label>
                <Input type="number" {...register('netAssetValue')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Distributed to Paid-In (DPI)</label>
                <Input type="number" step="0.01" {...register('distributedToPaidIn')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Residual Value to Paid-In (RVPI)</label>
                <Input type="number" step="0.01" {...register('residualValueToPaidIn')} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Portfolio Information</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Portfolio Company ID</label>
                <Input {...register('portfolioCompanyId')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Stage of Development</label>
                <Select onValueChange={(value) => setValue('stageOfDevelopment', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Seed">Seed</SelectItem>
                    <SelectItem value="Series A">Series A</SelectItem>
                    <SelectItem value="Series B">Series B</SelectItem>
                    <SelectItem value="Series C">Series C</SelectItem>
                    <SelectItem value="Late Stage">Late Stage</SelectItem>
                    <SelectItem value="Growth">Growth</SelectItem>
                    <SelectItem value="Mature">Mature</SelectItem>
                    <SelectItem value="Turnaround">Turnaround</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Financing Round</label>
                <Select onValueChange={(value) => setValue('financingRound', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select financing round" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pre-Seed">Pre-Seed</SelectItem>
                    <SelectItem value="Seed">Seed</SelectItem>
                    <SelectItem value="Series A">Series A</SelectItem>
                    <SelectItem value="Series B">Series B</SelectItem>
                    <SelectItem value="Series C">Series C</SelectItem>
                    <SelectItem value="Series D+">Series D+</SelectItem>
                    <SelectItem value="Bridge">Bridge</SelectItem>
                    <SelectItem value="Pre-IPO">Pre-IPO</SelectItem>
                    <SelectItem value="Growth">Growth</SelectItem>
                    <SelectItem value="Buyout">Buyout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Investment Amount</label>
                <Input type="number" {...register('investmentAmount')} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Valuation & Ownership</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Valuation Pre-Money</label>
                <Input type="number" {...register('valuationPreMoney')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Valuation Post-Money</label>
                <Input type="number" {...register('valuationPostMoney')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Ownership Percentage (%)</label>
                <Input type="number" step="0.01" {...register('ownershipPercentage')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Investor Type</label>
                <Select onValueChange={(value) => setValue('investorType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select investor type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead Investor">Lead Investor</SelectItem>
                    <SelectItem value="Co-Investor">Co-Investor</SelectItem>
                    <SelectItem value="Follow-on Investor">Follow-on Investor</SelectItem>
                    <SelectItem value="Strategic Investor">Strategic Investor</SelectItem>
                    <SelectItem value="Financial Investor">Financial Investor</SelectItem>
                    <SelectItem value="Angel Investor">Angel Investor</SelectItem>
                    <SelectItem value="Institutional Investor">Institutional Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Exit Mechanism</label>
                <Select onValueChange={(value) => setValue('exitMechanism', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exit mechanism" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IPO">IPO</SelectItem>
                    <SelectItem value="Strategic Sale">Strategic Sale</SelectItem>
                    <SelectItem value="Management Buyout">Management Buyout</SelectItem>
                    <SelectItem value="Secondary Sale">Secondary Sale</SelectItem>
                    <SelectItem value="Write-off">Write-off</SelectItem>
                    <SelectItem value="Merger">Merger</SelectItem>
                    <SelectItem value="Acquisition">Acquisition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Focus Areas</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Investment Stage</label>
                <Select onValueChange={(value) => setValue('investmentStage', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select investment stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Early Stage">Early Stage</SelectItem>
                    <SelectItem value="Growth Stage">Growth Stage</SelectItem>
                    <SelectItem value="Late Stage">Late Stage</SelectItem>
                    <SelectItem value="Buyout">Buyout</SelectItem>
                    <SelectItem value="Turnaround">Turnaround</SelectItem>
                    <SelectItem value="Distressed">Distressed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Sector Focus</label>
                <Select onValueChange={(value) => setValue('sectorFocus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector focus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Financial Services">Financial Services</SelectItem>
                    <SelectItem value="Consumer">Consumer</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Energy">Energy</SelectItem>
                    <SelectItem value="Real Estate">Real Estate</SelectItem>
                    <SelectItem value="Telecommunications">Telecommunications</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Diversified">Diversified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Geographic Focus</label>
                <Input {...register('geographicFocus')} placeholder="e.g., North America, Europe, Asia-Pacific" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Important Dates</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Formation Date</label>
                <DatePickerWithState
                  date={watch('formationDate')}
                  setDate={(date) => setValue('formationDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Investment Date</label>
                <DatePickerWithState
                  date={watch('investmentDate')}
                  setDate={(date) => setValue('investmentDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Exit Date</label>
                <DatePickerWithState
                  date={watch('exitDate')}
                  setDate={(date) => setValue('exitDate', date)}
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
            'Save Private Equity Details'
          )}
        </Button>
      </div>
    </form>
  );
}
