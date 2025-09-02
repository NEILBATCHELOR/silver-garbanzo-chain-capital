import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoCircledIcon, PlusIcon, TrashIcon, TriangleUpIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface PerformanceMetric {
  id?: string;
  metricDate: string;
  totalAssets: string;
  sharePrice: string;
  apy: string;
  dailyYield: string;
  benchmarkPerformance: string;
  totalFeesCollected: string;
  newDeposits: string;
  withdrawals: string;
  netFlow: string;
  sharpeRatio: string;
  volatility: string;
  maxDrawdown: string;
}

interface ERC4626PerformanceMetricsFormProps {
  metrics: PerformanceMetric[];
  onChange: (metrics: PerformanceMetric[]) => void;
  enableTracking: boolean;
  onEnableTrackingChange: (enabled: boolean) => void;
  benchmarkTrackingEnabled: boolean;
  onBenchmarkTrackingEnabledChange: (enabled: boolean) => void;
  benchmarkIndex: string;
  onBenchmarkIndexChange: (index: string) => void;
  performanceHistoryRetention: number;
  onPerformanceHistoryRetentionChange: (days: number) => void;
}

/**
 * Form for managing performance metrics configuration (token_erc4626_performance_metrics table)
 * Handles tracking settings and manual metric entry for vault performance
 */
const ERC4626PerformanceMetricsForm: React.FC<ERC4626PerformanceMetricsFormProps> = ({
  metrics,
  onChange,
  enableTracking,
  onEnableTrackingChange,
  benchmarkTrackingEnabled,
  onBenchmarkTrackingEnabledChange,
  benchmarkIndex,
  onBenchmarkIndexChange,
  performanceHistoryRetention,
  onPerformanceHistoryRetentionChange,
}) => {
  const [localMetrics, setLocalMetrics] = useState<PerformanceMetric[]>(metrics || []);

  useEffect(() => {
    setLocalMetrics(metrics || []);
  }, [metrics]);

  const handleMetricChange = (index: number, field: keyof PerformanceMetric, value: any) => {
    const updatedMetrics = [...localMetrics];
    updatedMetrics[index] = { ...updatedMetrics[index], [field]: value };
    setLocalMetrics(updatedMetrics);
    onChange(updatedMetrics);
  };

  const addMetric = () => {
    const today = new Date().toISOString().split('T')[0];
    const newMetric: PerformanceMetric = {
      metricDate: today,
      totalAssets: '',
      sharePrice: '',
      apy: '',
      dailyYield: '',
      benchmarkPerformance: '',
      totalFeesCollected: '',
      newDeposits: '',
      withdrawals: '',
      netFlow: '',
      sharpeRatio: '',
      volatility: '',
      maxDrawdown: '',
    };
    
    const updatedMetrics = [...localMetrics, newMetric];
    setLocalMetrics(updatedMetrics);
    onChange(updatedMetrics);
  };

  const removeMetric = (index: number) => {
    const updatedMetrics = localMetrics.filter((_, i) => i !== index);
    setLocalMetrics(updatedMetrics);
    onChange(updatedMetrics);
  };

  const calculateNetFlow = (metric: PerformanceMetric) => {
    const deposits = parseFloat(metric.newDeposits) || 0;
    const withdrawals = parseFloat(metric.withdrawals) || 0;
    return (deposits - withdrawals).toString();
  };

  const getPerformanceIndicator = (value: string, isGood: 'higher' | 'lower' = 'higher') => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;
    
    if (isGood === 'higher') {
      return numValue > 0 ? 'positive' : numValue < 0 ? 'negative' : 'neutral';
    } else {
      return numValue < 0 ? 'positive' : numValue > 0 ? 'negative' : 'neutral';
    }
  };

  const commonBenchmarks = [
    { value: 'SP500', label: 'S&P 500' },
    { value: 'NASDAQ', label: 'NASDAQ Composite' },
    { value: 'DXY', label: 'US Dollar Index' },
    { value: 'BTC', label: 'Bitcoin' },
    { value: 'ETH', label: 'Ethereum' },
    { value: 'AAVE', label: 'Aave Protocol' },
    { value: 'COMP', label: 'Compound Protocol' },
    { value: 'CRV', label: 'Curve Protocol' },
    { value: 'SUSHI', label: 'SushiSwap' },
    { value: 'UNI', label: 'Uniswap' },
    { value: 'TREASURY_10Y', label: '10-Year Treasury' },
    { value: 'TREASURY_2Y', label: '2-Year Treasury' },
    { value: 'FEDERAL_FUNDS', label: 'Federal Funds Rate' },
    { value: 'CUSTOM', label: 'Custom Benchmark' },
  ];

  return (
    <div className="space-y-6">
      {/* Performance Tracking Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TriangleUpIcon className="h-5 w-5 mr-2" />
            Performance Tracking Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="performanceTracking"
                checked={enableTracking}
                onCheckedChange={onEnableTrackingChange}
              />
              <Label htmlFor="performanceTracking" className="flex items-center">
                Enable Performance Tracking
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoCircledIcon className="h-4 w-4 ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-80">Automatically track and record vault performance metrics</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="benchmarkTracking"
                checked={benchmarkTrackingEnabled}
                onCheckedChange={onBenchmarkTrackingEnabledChange}
              />
              <Label htmlFor="benchmarkTracking" className="flex items-center">
                Benchmark Tracking
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoCircledIcon className="h-4 w-4 ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-80">Compare vault performance against a benchmark index</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
            </div>
          </div>

          {benchmarkTrackingEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="benchmarkIndex">Benchmark Index</Label>
                <Select value={benchmarkIndex} onValueChange={onBenchmarkIndexChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select benchmark" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonBenchmarks.map((benchmark) => (
                      <SelectItem key={benchmark.value} value={benchmark.value}>
                        {benchmark.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {benchmarkIndex === 'CUSTOM' && (
                  <Input
                    placeholder="Enter custom benchmark symbol"
                    value={benchmarkIndex}
                    onChange={(e) => onBenchmarkIndexChange(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="performanceHistoryRetention">History Retention (Days)</Label>
                <Input
                  id="performanceHistoryRetention"
                  type="number"
                  min="1"
                  max="3650"
                  value={performanceHistoryRetention}
                  onChange={(e) => onPerformanceHistoryRetentionChange(parseInt(e.target.value) || 365)}
                  placeholder="365"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Performance Metrics Data
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {localMetrics.length} Records
              </Badge>
              <Button onClick={addMetric} size="sm" variant="outline">
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Metric
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!enableTracking && localMetrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Performance tracking is disabled and no manual metrics are recorded.</p>
              <p className="text-sm">Enable tracking or add manual metrics to monitor vault performance.</p>
            </div>
          ) : localMetrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No performance metrics recorded yet.</p>
              <p className="text-sm">Metrics will be automatically recorded when tracking is enabled.</p>
            </div>
          ) : (
            localMetrics.map((metric, index) => (
              <Card key={index} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Metric Record - {new Date(metric.metricDate).toLocaleDateString()}
                    </CardTitle>
                    <Button
                      onClick={() => removeMetric(index)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Date and Core Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`metricDate-${index}`}>Date</Label>
                      <Input
                        id={`metricDate-${index}`}
                        type="date"
                        value={metric.metricDate}
                        onChange={(e) => handleMetricChange(index, 'metricDate', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`totalAssets-${index}`}>Total Assets</Label>
                      <Input
                        id={`totalAssets-${index}`}
                        type="number"
                        step="0.01"
                        value={metric.totalAssets}
                        onChange={(e) => handleMetricChange(index, 'totalAssets', e.target.value)}
                        placeholder="1000000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`sharePrice-${index}`}>Share Price</Label>
                      <Input
                        id={`sharePrice-${index}`}
                        type="number"
                        step="0.000001"
                        value={metric.sharePrice}
                        onChange={(e) => handleMetricChange(index, 'sharePrice', e.target.value)}
                        placeholder="1.000000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`apy-${index}`} className="flex items-center">
                        APY (%)
                        {getPerformanceIndicator(metric.apy) && (
                          <Badge 
                            variant={getPerformanceIndicator(metric.apy) === 'positive' ? 'default' : 'destructive'}
                            className="ml-1 text-xs"
                          >
                            {parseFloat(metric.apy) > 0 ? '↑' : '↓'}
                          </Badge>
                        )}
                      </Label>
                      <Input
                        id={`apy-${index}`}
                        type="number"
                        step="0.01"
                        value={metric.apy}
                        onChange={(e) => handleMetricChange(index, 'apy', e.target.value)}
                        placeholder="8.50"
                      />
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`dailyYield-${index}`}>Daily Yield (%)</Label>
                      <Input
                        id={`dailyYield-${index}`}
                        type="number"
                        step="0.001"
                        value={metric.dailyYield}
                        onChange={(e) => handleMetricChange(index, 'dailyYield', e.target.value)}
                        placeholder="0.023"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`benchmarkPerformance-${index}`}>Benchmark Performance (%)</Label>
                      <Input
                        id={`benchmarkPerformance-${index}`}
                        type="number"
                        step="0.01"
                        value={metric.benchmarkPerformance}
                        onChange={(e) => handleMetricChange(index, 'benchmarkPerformance', e.target.value)}
                        placeholder="7.20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`totalFeesCollected-${index}`}>Fees Collected</Label>
                      <Input
                        id={`totalFeesCollected-${index}`}
                        type="number"
                        step="0.01"
                        value={metric.totalFeesCollected}
                        onChange={(e) => handleMetricChange(index, 'totalFeesCollected', e.target.value)}
                        placeholder="5000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`volatility-${index}`}>Volatility (%)</Label>
                      <Input
                        id={`volatility-${index}`}
                        type="number"
                        step="0.01"
                        value={metric.volatility}
                        onChange={(e) => handleMetricChange(index, 'volatility', e.target.value)}
                        placeholder="12.5"
                      />
                    </div>
                  </div>

                  {/* Flow Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`newDeposits-${index}`}>New Deposits</Label>
                      <Input
                        id={`newDeposits-${index}`}
                        type="number"
                        step="0.01"
                        value={metric.newDeposits}
                        onChange={(e) => {
                          handleMetricChange(index, 'newDeposits', e.target.value);
                          // Auto-calculate net flow
                          const updatedMetric = { ...metric, newDeposits: e.target.value };
                          handleMetricChange(index, 'netFlow', calculateNetFlow(updatedMetric));
                        }}
                        placeholder="50000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`withdrawals-${index}`}>Withdrawals</Label>
                      <Input
                        id={`withdrawals-${index}`}
                        type="number"
                        step="0.01"
                        value={metric.withdrawals}
                        onChange={(e) => {
                          handleMetricChange(index, 'withdrawals', e.target.value);
                          // Auto-calculate net flow
                          const updatedMetric = { ...metric, withdrawals: e.target.value };
                          handleMetricChange(index, 'netFlow', calculateNetFlow(updatedMetric));
                        }}
                        placeholder="25000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`netFlow-${index}`} className="flex items-center">
                        Net Flow (Auto-calculated)
                        {getPerformanceIndicator(metric.netFlow) && (
                          <Badge 
                            variant={getPerformanceIndicator(metric.netFlow) === 'positive' ? 'default' : 'destructive'}
                            className="ml-1 text-xs"
                          >
                            {parseFloat(metric.netFlow) > 0 ? '↑' : '↓'}
                          </Badge>
                        )}
                      </Label>
                      <Input
                        id={`netFlow-${index}`}
                        type="number"
                        value={metric.netFlow}
                        disabled
                        placeholder="Auto-calculated"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`sharpeRatio-${index}`}>Sharpe Ratio</Label>
                      <Input
                        id={`sharpeRatio-${index}`}
                        type="number"
                        step="0.01"
                        value={metric.sharpeRatio}
                        onChange={(e) => handleMetricChange(index, 'sharpeRatio', e.target.value)}
                        placeholder="1.25"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`maxDrawdown-${index}`} className="flex items-center">
                        Max Drawdown (%)
                        {getPerformanceIndicator(metric.maxDrawdown, 'lower') && (
                          <Badge 
                            variant={getPerformanceIndicator(metric.maxDrawdown, 'lower') === 'positive' ? 'default' : 'destructive'}
                            className="ml-1 text-xs"
                          >
                            {parseFloat(metric.maxDrawdown) < 0 ? '↓' : '↑'}
                          </Badge>
                        )}
                      </Label>
                      <Input
                        id={`maxDrawdown-${index}`}
                        type="number"
                        step="0.01"
                        value={metric.maxDrawdown}
                        onChange={(e) => handleMetricChange(index, 'maxDrawdown', e.target.value)}
                        placeholder="-5.2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {localMetrics.length > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
              <h4 className="font-medium text-orange-900 mb-2">Performance Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-orange-800">
                <div>
                  <p className="font-medium">Total Records:</p>
                  <p>{localMetrics.length}</p>
                </div>
                <div>
                  <p className="font-medium">Latest APY:</p>
                  <p>{localMetrics[localMetrics.length - 1]?.apy || 'N/A'}%</p>
                </div>
                <div>
                  <p className="font-medium">Date Range:</p>
                  <p>
                    {localMetrics.length > 0 && 
                      `${new Date(localMetrics[0].metricDate).toLocaleDateString()} - ${new Date(localMetrics[localMetrics.length - 1].metricDate).toLocaleDateString()}`
                    }
                  </p>
                </div>
                <div>
                  <p className="font-medium">Tracking Status:</p>
                  <p>{enableTracking ? 'Enabled' : 'Manual'}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ERC4626PerformanceMetricsForm;