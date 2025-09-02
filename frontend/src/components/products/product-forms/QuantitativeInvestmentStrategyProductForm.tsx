/**
 * Form component for quantitative investment strategy products
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { QuantitativeInvestmentStrategyProduct } from '@/types/products';
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
import { Checkbox } from '@/components/ui/checkbox';

interface QuantitativeInvestmentStrategyProductFormProps {
  defaultValues?: Partial<QuantitativeInvestmentStrategyProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function QuantitativeInvestmentStrategyProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: QuantitativeInvestmentStrategyProductFormProps) {
  // Format dates and complex types for the form
  const formattedDefaultValues = {
    ...defaultValues,
    inceptionDate: defaultValues?.inceptionDate ? new Date(defaultValues.inceptionDate) : null,
    terminationDate: defaultValues?.terminationDate ? new Date(defaultValues.terminationDate) : null,
    // Format arrays for form display
    underlyingAssets: Array.isArray(defaultValues?.underlyingAssets) ? defaultValues.underlyingAssets.join(', ') : defaultValues?.underlyingAssets || '',
    dataSources: Array.isArray(defaultValues?.dataSources) ? defaultValues.dataSources.join(', ') : defaultValues?.dataSources || '',
    // Convert JSON objects to strings for the form
    parametersJson: defaultValues?.parameters ? JSON.stringify(defaultValues.parameters, null, 2) : '',
    backtestHistoryJson: defaultValues?.backtestHistory ? JSON.stringify(defaultValues.backtestHistory, null, 2) : '',
    adjustmentHistoryJson: defaultValues?.adjustmentHistory ? JSON.stringify(defaultValues.adjustmentHistory, null, 2) : '',
    performanceAttributionJson: defaultValues?.performanceAttribution ? JSON.stringify(defaultValues.performanceAttribution, null, 2) : '',
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
    console.log('QuantitativeInvestmentStrategyProductForm handleSubmit called with data:', data);
    
    // Process arrays for PostgreSQL
    let underlyingAssetsArray = null;
    if (data.underlyingAssets) {
      const assets = data.underlyingAssets.split(',').map((asset: string) => asset.trim()).filter((asset: string) => asset !== '');
      underlyingAssetsArray = assets.length > 0 ? assets : null;
    }
    
    let dataSourcesArray = null;
    if (data.dataSources) {
      const sources = data.dataSources.split(',').map((source: string) => source.trim()).filter((source: string) => source !== '');
      dataSourcesArray = sources.length > 0 ? sources : null;
    }
    
    // Parse JSON strings to objects
    let parametersObject, backtestHistoryObject, adjustmentHistoryObject, performanceAttributionObject;
    
    try {
      parametersObject = data.parametersJson ? JSON.parse(data.parametersJson) : null;
      backtestHistoryObject = data.backtestHistoryJson ? JSON.parse(data.backtestHistoryJson) : null;
      adjustmentHistoryObject = data.adjustmentHistoryJson ? JSON.parse(data.adjustmentHistoryJson) : null;
      performanceAttributionObject = data.performanceAttributionJson ? JSON.parse(data.performanceAttributionJson) : null;
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }

    // Prepare the data for submission
    const formData = {
      ...data,
      underlyingAssets: underlyingAssetsArray,
      dataSources: dataSourcesArray,
      parameters: parametersObject,
      backtestHistory: backtestHistoryObject,
      adjustmentHistory: adjustmentHistoryObject,
      performanceAttribution: performanceAttributionObject,
    };

    // Remove the temporary JSON and array fields
    delete formData.parametersJson;
    delete formData.backtestHistoryJson;
    delete formData.adjustmentHistoryJson;
    delete formData.performanceAttributionJson;

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
                <label className="block text-sm font-medium mb-2">Strategy Name</label>
                <Input {...register('strategyName')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Strategy ID</label>
                <Input {...register('strategyId')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Strategy Type</label>
                <Select onValueChange={(value) => setValue('strategyType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quantitative">Quantitative</SelectItem>
                    <SelectItem value="Statistical Arbitrage">Statistical Arbitrage</SelectItem>
                    <SelectItem value="Market Neutral">Market Neutral</SelectItem>
                    <SelectItem value="Long/Short Equity">Long/Short Equity</SelectItem>
                    <SelectItem value="Risk Parity">Risk Parity</SelectItem>
                    <SelectItem value="Factor Investing">Factor Investing</SelectItem>
                    <SelectItem value="Algorithmic Trading">Algorithmic Trading</SelectItem>
                    <SelectItem value="High Frequency">High Frequency</SelectItem>
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
              
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select onValueChange={(value) => setValue('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Backtesting">Backtesting</SelectItem>
                    <SelectItem value="Paper Trading">Paper Trading</SelectItem>
                    <SelectItem value="Live">Live</SelectItem>
                    <SelectItem value="Paused">Paused</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  checked={watch('machineLearningFlags') || false}
                  onCheckedChange={(checked) => setValue('machineLearningFlags', checked)}
                />
                <label className="text-sm font-medium">Uses Machine Learning</label>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Strategy Details</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Risk Metrics</label>
                <Input type="number" step="0.01" {...register('riskMetrics')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Benchmark</label>
                <Input {...register('benchmark')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Target Raise</label>
                <Input type="number" {...register('targetRaise')} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Underlying Assets (comma-separated)</label>
                <Textarea {...register('underlyingAssets')} placeholder="SPY, QQQ, IWM, VTI" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Data Sources (comma-separated)</label>
                <Textarea {...register('dataSources')} placeholder="Bloomberg, Reuters, Yahoo Finance" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Important Dates</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Inception Date</label>
                <DatePickerWithState
                  date={watch('inceptionDate')}
                  setDate={(date) => setValue('inceptionDate', date)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Termination Date</label>
                <DatePickerWithState
                  date={watch('terminationDate')}
                  setDate={(date) => setValue('terminationDate', date)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Parameters (JSON)</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Strategy Parameters</label>
                <Textarea 
                  {...register('parametersJson')}
                  rows={4}
                  placeholder='{"lookbackPeriod": 20, "rebalanceFreq": "monthly", "riskTarget": 0.15}'
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Historical Data (JSON Format)</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Backtest History</label>
              <Textarea 
                {...register('backtestHistoryJson')}
                rows={4}
                placeholder='{"returns": [0.02, 0.015, 0.008], "sharpeRatio": 1.5, "maxDrawdown": 0.08}'
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Adjustment History</label>
              <Textarea 
                {...register('adjustmentHistoryJson')}
                rows={4}
                placeholder='[{"date": "2025-01-15", "change": "Increased position sizing", "reason": "Market volatility decreased"}]'
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Performance Attribution</label>
              <Textarea 
                {...register('performanceAttributionJson')}
                rows={4}
                placeholder='{"factorReturns": {"momentum": 0.03, "value": 0.01, "quality": 0.02}}'
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Target & Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Backtesting">Backtesting</SelectItem>
                    <SelectItem value="Live Trading">Live Trading</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
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
            'Save Strategy Details'
          )}
        </Button>
      </div>
    </form>
  );
}
