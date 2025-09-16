import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, BarChart3, RefreshCw, Save, Calendar, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ClimateConfigurationService,
  ForecastingParameters 
} from '../../services/climateConfigurationService';

interface CashFlowForecastingManagerProps {
  onConfigurationChange?: () => void;
}

export const CashFlowForecastingManager: React.FC<CashFlowForecastingManagerProps> = ({
  onConfigurationChange
}) => {
  // State management
  const [parameters, setParameters] = useState<ForecastingParameters>({
    seasonalFactors: {
      January: 0.85,
      February: 0.88,
      March: 0.95,
      April: 1.05,
      May: 1.15,
      June: 1.20,
      July: 1.25,
      August: 1.20,
      September: 1.10,
      October: 1.05,
      November: 0.95,
      December: 0.90
    },
    growthRateDefault: 0.015,
    forecastingWeights: {
      historical: 0.20,
      seasonal: 0.12,
      trend: 0.25,
      market: 0.30
    }
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  /**
   * Load current forecasting parameters
   */
  const loadConfiguration = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Since ForecastingParameters is not yet implemented in the service,
      // we'll use default values for now
      console.log('Loading forecasting parameters...');
      
      // Default seasonal factors based on typical renewable energy production
      setParameters({
        seasonalFactors: {
          January: 0.85,
          February: 0.88,
          March: 0.95,
          April: 1.05,
          May: 1.15,
          June: 1.20,
          July: 1.25,
          August: 1.20,
          September: 1.10,
          October: 1.05,
          November: 0.95,
          December: 0.90
        },
        growthRateDefault: 0.015,
        forecastingWeights: {
          historical: 0.20,
          seasonal: 0.12,
          trend: 0.25,
          market: 0.30
        }
      });
      
      setHasChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forecasting parameters');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save forecasting parameters
   */
  const saveConfiguration = async () => {
    setSaving(true);
    setError(null);

    try {
      // Since ForecastingParameters is not yet implemented in the service,
      // we'll simulate the save operation
      console.log('Saving forecasting parameters:', parameters);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasChanges(false);
      setLastSaved(new Date());
      onConfigurationChange?.();
      
      // Show success briefly
      setTimeout(() => setSaving(false), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save forecasting parameters');
      setSaving(false);
    }
  };

  /**
   * Update seasonal factor for a specific month
   */
  const updateSeasonalFactor = (month: string, value: number) => {
    setParameters(prev => ({
      ...prev,
      seasonalFactors: {
        ...prev.seasonalFactors,
        [month]: value
      }
    }));
    setHasChanges(true);
  };

  /**
   * Update forecasting weight
   */
  const updateWeight = (key: keyof typeof parameters.forecastingWeights, value: number) => {
    setParameters(prev => ({
      ...prev,
      forecastingWeights: {
        ...prev.forecastingWeights,
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  /**
   * Update growth rate
   */
  const updateGrowthRate = (value: number) => {
    setParameters(prev => ({
      ...prev,
      growthRateDefault: value
    }));
    setHasChanges(true);
  };

  /**
   * Reset seasonal factors to defaults
   */
  const resetSeasonalFactors = () => {
    if (!confirm('Reset seasonal factors to default values?')) {
      return;
    }

    setParameters(prev => ({
      ...prev,
      seasonalFactors: {
        January: 0.85,
        February: 0.88,
        March: 0.95,
        April: 1.05,
        May: 1.15,
        June: 1.20,
        July: 1.25,
        August: 1.20,
        September: 1.10,
        October: 1.05,
        November: 0.95,
        December: 0.90
      }
    }));
    setHasChanges(true);
  };

  // Calculate weight totals for validation
  const weightTotal = Object.values(parameters.forecastingWeights).reduce((sum, weight) => sum + weight, 0);
  const weightsValid = Math.abs(weightTotal - 1.0) < 0.001;

  // Calculate seasonal factor statistics
  const seasonalValues = Object.values(parameters.seasonalFactors);
  const avgSeasonal = seasonalValues.reduce((sum, val) => sum + val, 0) / seasonalValues.length;
  const maxSeasonal = Math.max(...seasonalValues);
  const minSeasonal = Math.min(...seasonalValues);

  const months = Object.keys(parameters.seasonalFactors);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading forecasting parameters...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Cash Flow Forecasting Parameters</h2>
          {hasChanges && <Badge variant="secondary">Unsaved Changes</Badge>}
        </div>
        <div className="flex items-center space-x-2">
          {lastSaved && (
            <span className="text-sm text-muted-foreground">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadConfiguration}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button 
            onClick={saveConfiguration}
            disabled={!hasChanges || !weightsValid || saving}
            className="min-w-[100px]"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Weights validation alert */}
      {!weightsValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Forecasting weights must sum to 1.0 (currently: {weightTotal.toFixed(3)})
          </AlertDescription>
        </Alert>
      )}

      {/* Forecasting Weights Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Forecasting Model Weights</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure how much each factor contributes to cash flow forecasting. Total must equal 1.0.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(parameters.forecastingWeights).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()} Analysis
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={value.toFixed(2)}
                    onChange={(e) => updateWeight(key as keyof typeof parameters.forecastingWeights, parseFloat(e.target.value))}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">
                    ({(value * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
              <Slider
                value={[value]}
                onValueChange={([newValue]) => updateWeight(key as keyof typeof parameters.forecastingWeights, newValue)}
                max={1}
                min={0}
                step={0.01}
                className="w-full"
              />
            </div>
          ))}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total Weight:</span>
              <span className={`font-mono ${weightsValid ? 'text-green-600' : 'text-red-600'}`}>
                {weightTotal.toFixed(3)} ({(weightTotal * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth Rate Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Default Growth Rate</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure the default growth rate used when specific historical data is unavailable.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Monthly Growth Rate</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="0"
                  max="0.1"
                  step="0.001"
                  value={parameters.growthRateDefault.toFixed(3)}
                  onChange={(e) => updateGrowthRate(parseFloat(e.target.value))}
                  className="w-24 text-center"
                />
                <span className="text-sm text-muted-foreground">
                  ({(parameters.growthRateDefault * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <Slider
              value={[parameters.growthRateDefault]}
              onValueChange={([newValue]) => updateGrowthRate(newValue)}
              max={0.1}
              min={0}
              step={0.001}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Annualized rate: {(parameters.growthRateDefault * 12 * 100).toFixed(1)}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Factors Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Seasonal Adjustment Factors</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure monthly multipliers for seasonal variations in renewable energy production.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={resetSeasonalFactors}>
              Reset to Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Seasonal Factors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {months.map((month) => (
              <div key={month} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{month}</Label>
                  <Input
                    type="number"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={parameters.seasonalFactors[month].toFixed(2)}
                    onChange={(e) => updateSeasonalFactor(month, parseFloat(e.target.value))}
                    className="w-20 text-center"
                  />
                </div>
                <Slider
                  value={[parameters.seasonalFactors[month]]}
                  onValueChange={([newValue]) => updateSeasonalFactor(month, newValue)}
                  max={1.5}
                  min={0.5}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-center text-muted-foreground">
                  {parameters.seasonalFactors[month] > 1.0 
                    ? `+${((parameters.seasonalFactors[month] - 1) * 100).toFixed(0)}%`
                    : `-${((1 - parameters.seasonalFactors[month]) * 100).toFixed(0)}%`}
                </p>
              </div>
            ))}
          </div>

          {/* Seasonal Statistics */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-3">Seasonal Factor Statistics</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p><strong>Average Factor:</strong> {avgSeasonal.toFixed(2)}</p>
                <p><strong>Peak Month:</strong> {months.find(m => parameters.seasonalFactors[m] === maxSeasonal)} ({maxSeasonal.toFixed(2)})</p>
              </div>
              <div>
                <p><strong>Low Month:</strong> {months.find(m => parameters.seasonalFactors[m] === minSeasonal)} ({minSeasonal.toFixed(2)})</p>
                <p><strong>Seasonal Range:</strong> {((maxSeasonal - minSeasonal) * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p><strong>Peak vs Low:</strong> {(maxSeasonal / minSeasonal).toFixed(2)}x</p>
                <p><strong>Volatility:</strong> {(Math.sqrt(seasonalValues.reduce((sum, val) => sum + Math.pow(val - avgSeasonal, 2), 0) / seasonalValues.length) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Forecasting Model Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Model Composition</h4>
              <div className="text-sm space-y-1">
                <p>Historical Data: {(parameters.forecastingWeights.historical * 100).toFixed(0)}%</p>
                <p>Seasonal Adjustment: {(parameters.forecastingWeights.seasonal * 100).toFixed(0)}%</p>
                <p>Trend Analysis: {(parameters.forecastingWeights.trend * 100).toFixed(0)}%</p>
                <p>Market Conditions: {(parameters.forecastingWeights.market * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Key Parameters</h4>
              <div className="text-sm space-y-1">
                <p>Monthly Growth: {(parameters.growthRateDefault * 100).toFixed(1)}%</p>
                <p>Annualized Growth: {(parameters.growthRateDefault * 12 * 100).toFixed(1)}%</p>
                <p>Seasonal Peak: {months.find(m => parameters.seasonalFactors[m] === maxSeasonal)} ({maxSeasonal.toFixed(2)})</p>
                <p>Seasonal Low: {months.find(m => parameters.seasonalFactors[m] === minSeasonal)} ({minSeasonal.toFixed(2)})</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Summary */}
      {hasChanges && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-700">You have unsaved changes to forecasting parameters</span>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={loadConfiguration}>
                  Discard Changes
                </Button>
                <Button 
                  size="sm" 
                  onClick={saveConfiguration} 
                  disabled={!weightsValid || saving}
                >
                  Save Parameters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};