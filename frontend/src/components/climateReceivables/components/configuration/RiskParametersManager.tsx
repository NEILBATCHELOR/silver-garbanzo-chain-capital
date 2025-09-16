import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Settings, RefreshCw, Save, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ClimateConfigurationService, 
  RiskWeights, 
  RiskThresholds, 
  RiskParameters 
} from '../../services/climateConfigurationService';

interface RiskParametersManagerProps {
  onConfigurationChange?: () => void;
}

export const RiskParametersManager: React.FC<RiskParametersManagerProps> = ({
  onConfigurationChange
}) => {
  // State management
  const [weights, setWeights] = useState<RiskWeights>({
    creditRating: 0.35,
    financialHealth: 0.25,
    productionVariability: 0.20,
    marketConditions: 0.10,
    policyImpact: 0.10
  });

  const [thresholds, setThresholds] = useState<RiskThresholds>({
    production: { low: 0.1, medium: 0.25, high: 0.50 },
    market: { volatilityLow: 0.1, volatilityMedium: 0.2, volatilityHigh: 0.35 },
    credit: { investmentGrade: 40, speculativeGrade: 65, highRisk: 85 }
  });

  const [parameters, setParameters] = useState<RiskParameters>({
    baseDiscountRate: 2.0,
    maxDiscountRate: 12.0,
    minDiscountRate: 1.0,
    confidenceBase: 80,
    confidenceRealTimeBonus: 15
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
   * Load current configuration from database
   */
  const loadConfiguration = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [weightsData, thresholdsData, parametersData] = await Promise.all([
        ClimateConfigurationService.getRiskWeights(),
        ClimateConfigurationService.getRiskThresholds(),
        ClimateConfigurationService.getRiskParameters()
      ]);

      setWeights(weightsData);
      setThresholds(thresholdsData);
      setParameters(parametersData);
      setHasChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save configuration to database
   */
  const saveConfiguration = async () => {
    setSaving(true);
    setError(null);

    try {
      await Promise.all([
        ClimateConfigurationService.updateRiskWeights(weights),
        ClimateConfigurationService.updateRiskThresholds(thresholds),
        ClimateConfigurationService.updateRiskParameters(parameters)
      ]);

      setHasChanges(false);
      setLastSaved(new Date());
      onConfigurationChange?.();
      
      // Show success briefly
      setTimeout(() => setSaving(false), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
      setSaving(false);
    }
  };

  /**
   * Reset to default configuration
   */
  const resetToDefaults = async () => {
    if (!confirm('Reset all risk parameters to default values? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await ClimateConfigurationService.resetToDefaults();
      await loadConfiguration();
      onConfigurationChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset to defaults');
    } finally {
      setSaving(false);
    }
  };

  // Weight change handlers
  const updateWeight = (key: keyof RiskWeights, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Threshold change handlers
  const updateProductionThreshold = (key: 'low' | 'medium' | 'high', value: number) => {
    setThresholds(prev => ({
      ...prev,
      production: { ...prev.production, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateMarketThreshold = (key: 'volatilityLow' | 'volatilityMedium' | 'volatilityHigh', value: number) => {
    setThresholds(prev => ({
      ...prev,
      market: { ...prev.market, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateCreditThreshold = (key: 'investmentGrade' | 'speculativeGrade' | 'highRisk', value: number) => {
    setThresholds(prev => ({
      ...prev,
      credit: { ...prev.credit, [key]: value }
    }));
    setHasChanges(true);
  };

  // Parameter change handlers
  const updateParameter = (key: keyof RiskParameters, value: number) => {
    setParameters(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Calculate weight total for validation
  const weightTotal = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const weightsValid = Math.abs(weightTotal - 1.0) < 0.001;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading configuration...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Risk Parameters Configuration</h2>
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
            variant="outline" 
            size="sm" 
            onClick={resetToDefaults}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset to Defaults
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
            Risk weights must sum to 1.0 (currently: {weightTotal.toFixed(3)})
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Weights Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Calculation Weights</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure how much each risk factor contributes to the overall risk score. Total must equal 1.0.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(weights).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={value.toFixed(2)}
                    onChange={(e) => updateWeight(key as keyof RiskWeights, parseFloat(e.target.value))}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">
                    ({(value * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
              <Slider
                value={[value]}
                onValueChange={([newValue]) => updateWeight(key as keyof RiskWeights, newValue)}
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
      </Card>      {/* Risk Thresholds Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Thresholds</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure threshold values that determine risk levels for different factors.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Production Risk Thresholds */}
          <div className="space-y-4">
            <h4 className="font-medium">Production Variability Thresholds</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(thresholds.production).map(([level, value]) => (
                <div key={level} className="space-y-2">
                  <Label className="text-sm capitalize">{level} Risk</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={value.toFixed(2)}
                    onChange={(e) => updateProductionThreshold(level as any, parseFloat(e.target.value))}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Coefficient of variation
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Market Volatility Thresholds */}
          <div className="space-y-4">
            <h4 className="font-medium">Market Volatility Thresholds</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(thresholds.market).map(([key, value]) => {
                const level = key.replace('volatility', '');
                return (
                  <div key={key} className="space-y-2">
                    <Label className="text-sm">{level} Volatility</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={value.toFixed(2)}
                      onChange={(e) => updateMarketThreshold(key as any, parseFloat(e.target.value))}
                      className="text-center"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Volatility ratio
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Credit Risk Thresholds */}
          <div className="space-y-4">
            <h4 className="font-medium">Credit Risk Score Thresholds</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(thresholds.credit).map(([key, value]) => {
                const label = key.replace(/([A-Z])/g, ' $1').trim();
                return (
                  <div key={key} className="space-y-2">
                    <Label className="text-sm">{label}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={value.toString()}
                      onChange={(e) => updateCreditThreshold(key as any, parseFloat(e.target.value))}
                      className="text-center"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Risk score (0-100)
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Parameters Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Calculation Parameters</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure base parameters for discount rate calculation and confidence levels.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Discount Rate Parameters */}
          <div className="space-y-4">
            <h4 className="font-medium">Discount Rate Parameters (%)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Base Discount Rate</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={parameters.baseDiscountRate.toFixed(1)}
                  onChange={(e) => updateParameter('baseDiscountRate', parseFloat(e.target.value))}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Starting discount rate
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Minimum Rate</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={parameters.minDiscountRate.toFixed(1)}
                  onChange={(e) => updateParameter('minDiscountRate', parseFloat(e.target.value))}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Floor rate
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Maximum Rate</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={parameters.maxDiscountRate.toFixed(1)}
                  onChange={(e) => updateParameter('maxDiscountRate', parseFloat(e.target.value))}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Ceiling rate
                </p>
              </div>
            </div>
          </div>

          {/* Confidence Parameters */}
          <div className="space-y-4">
            <h4 className="font-medium">Confidence Level Parameters (%)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Base Confidence</Label>
                <Input
                  type="number"
                  min="50"
                  max="95"
                  step="1"
                  value={parameters.confidenceBase.toString()}
                  onChange={(e) => updateParameter('confidenceBase', parseInt(e.target.value))}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Base confidence level
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Real-time Data Bonus</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  value={parameters.confidenceRealTimeBonus.toString()}
                  onChange={(e) => updateParameter('confidenceRealTimeBonus', parseInt(e.target.value))}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Bonus for real-time data
                </p>
              </div>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Configuration Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Effective Rate Range:</strong> {parameters.minDiscountRate.toFixed(1)}% - {parameters.maxDiscountRate.toFixed(1)}%</p>
                <p><strong>Base Rate:</strong> {parameters.baseDiscountRate.toFixed(1)}%</p>
              </div>
              <div>
                <p><strong>Confidence Range:</strong> {parameters.confidenceBase}% - {Math.min(parameters.confidenceBase + parameters.confidenceRealTimeBonus, 95)}%</p>
                <p><strong>Real-time Bonus:</strong> +{parameters.confidenceRealTimeBonus}%</p>
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
                <span className="text-sm text-orange-700">You have unsaved changes</span>
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
                  Save Configuration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};