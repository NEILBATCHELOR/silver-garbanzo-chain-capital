import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, TrendingUp, RefreshCw, Save, Database, Activity } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ClimateConfigurationService,
  MarketDataConfig 
} from '../../services/climateConfigurationService';

interface MarketDataConfigManagerProps {
  onConfigurationChange?: () => void;
}

export const MarketDataConfigManager: React.FC<MarketDataConfigManagerProps> = ({
  onConfigurationChange
}) => {
  // State management
  const [config, setConfig] = useState<MarketDataConfig>({
    baselineTreasury10Y: 2.5,
    treasurySensitivity: 0.8,
    baselineIGSpread: 150,
    cacheRefreshMinutes: 15,
    dataQualityThreshold: 0.8
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Market data status simulation (would be real API calls in production)
  const [marketDataStatus, setMarketDataStatus] = useState({
    treasuryRates: { status: 'active', lastUpdate: new Date(), health: 92 },
    igSpreads: { status: 'active', lastUpdate: new Date(), health: 88 },
    cacheUsage: { status: 'healthy', usage: 67 },
    apiHealth: { status: 'operational', responseTime: 245 }
  });

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
    // Simulate periodic status updates
    const interval = setInterval(updateMarketStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Load current market data configuration
   */
  const loadConfiguration = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Since MarketDataConfig is not yet implemented in the service,
      // we'll use placeholder logic for now
      console.log('Loading market data configuration...');
      
      // Simulate loading from database
      setConfig({
        baselineTreasury10Y: 2.5,
        treasurySensitivity: 0.8,
        baselineIGSpread: 150,
        cacheRefreshMinutes: 15,
        dataQualityThreshold: 0.8
      });
      
      setHasChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market data configuration');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save market data configuration
   */
  const saveConfiguration = async () => {
    setSaving(true);
    setError(null);

    try {
      // Since MarketDataConfig is not yet implemented in the service,
      // we'll simulate the save operation
      console.log('Saving market data configuration:', config);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasChanges(false);
      setLastSaved(new Date());
      onConfigurationChange?.();
      
      // Show success briefly
      setTimeout(() => setSaving(false), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save market data configuration');
      setSaving(false);
    }
  };

  /**
   * Update configuration field
   */
  const updateConfig = (field: keyof MarketDataConfig, value: number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  /**
   * Update market data status (simulation)
   */
  const updateMarketStatus = () => {
    setMarketDataStatus(prev => ({
      ...prev,
      treasuryRates: {
        ...prev.treasuryRates,
        health: Math.max(85, Math.min(95, prev.treasuryRates.health + (Math.random() - 0.5) * 10))
      },
      igSpreads: {
        ...prev.igSpreads,
        health: Math.max(80, Math.min(95, prev.igSpreads.health + (Math.random() - 0.5) * 10))
      },
      cacheUsage: {
        ...prev.cacheUsage,
        usage: Math.max(50, Math.min(90, prev.cacheUsage.usage + (Math.random() - 0.5) * 20))
      },
      apiHealth: {
        ...prev.apiHealth,
        responseTime: Math.max(150, Math.min(500, prev.apiHealth.responseTime + (Math.random() - 0.5) * 100))
      }
    }));
  };

  /**
   * Force cache refresh (simulation)
   */
  const refreshCache = async () => {
    setError(null);
    try {
      console.log('Forcing cache refresh...');
      // Simulate cache refresh
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMarketDataStatus(prev => ({
        ...prev,
        treasuryRates: { ...prev.treasuryRates, lastUpdate: new Date(), health: 95 },
        igSpreads: { ...prev.igSpreads, lastUpdate: new Date(), health: 92 },
        cacheUsage: { ...prev.cacheUsage, usage: 45 }
      }));
      
      console.log('Cache refresh completed');
    } catch (err) {
      setError('Failed to refresh cache');
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600';
    if (health >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBgColor = (health: number) => {
    if (health >= 90) return 'bg-green-100';
    if (health >= 75) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading market data configuration...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Market Data Configuration</h2>
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
            onClick={refreshCache}
          >
            <Database className="h-4 w-4 mr-1" />
            Refresh Cache
          </Button>
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
            disabled={!hasChanges || saving}
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

      {/* Market Data Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Market Data Health Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Treasury Rates */}
            <div className={`p-3 rounded-lg ${getHealthBgColor(marketDataStatus.treasuryRates.health)}`}>
              <h4 className="font-medium text-sm">Treasury Rates</h4>
              <div className={`text-2xl font-bold ${getHealthColor(marketDataStatus.treasuryRates.health)}`}>
                {marketDataStatus.treasuryRates.health}%
              </div>
              <p className="text-xs text-muted-foreground">
                Updated: {marketDataStatus.treasuryRates.lastUpdate.toLocaleTimeString()}
              </p>
            </div>

            {/* IG Spreads */}
            <div className={`p-3 rounded-lg ${getHealthBgColor(marketDataStatus.igSpreads.health)}`}>
              <h4 className="font-medium text-sm">IG Spreads</h4>
              <div className={`text-2xl font-bold ${getHealthColor(marketDataStatus.igSpreads.health)}`}>
                {marketDataStatus.igSpreads.health}%
              </div>
              <p className="text-xs text-muted-foreground">
                Updated: {marketDataStatus.igSpreads.lastUpdate.toLocaleTimeString()}
              </p>
            </div>

            {/* Cache Usage */}
            <div className="p-3 rounded-lg bg-blue-100">
              <h4 className="font-medium text-sm">Cache Usage</h4>
              <div className="text-2xl font-bold text-blue-600">
                {marketDataStatus.cacheUsage.usage}%
              </div>
              <Progress value={marketDataStatus.cacheUsage.usage} className="mt-1 h-2" />
            </div>

            {/* API Response Time */}
            <div className="p-3 rounded-lg bg-purple-100">
              <h4 className="font-medium text-sm">API Response</h4>
              <div className="text-2xl font-bold text-purple-600">
                {marketDataStatus.apiHealth.responseTime}ms
              </div>
              <p className="text-xs text-muted-foreground">Average response time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Data Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Baseline Market Parameters</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure baseline values and sensitivities for market data calculations.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Treasury Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Baseline 10Y Treasury Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={config.baselineTreasury10Y.toFixed(1)}
                onChange={(e) => updateConfig('baselineTreasury10Y', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Base 10-year Treasury rate for calculations
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Treasury Sensitivity Factor</Label>
              <Input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={config.treasurySensitivity.toFixed(1)}
                onChange={(e) => updateConfig('treasurySensitivity', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                How sensitive rates are to Treasury changes
              </p>
            </div>
          </div>

          {/* Spread Parameters */}
          <div className="space-y-2">
            <Label>Baseline Investment Grade Spread (bps)</Label>
            <Input
              type="number"
              min="50"
              max="500"
              step="5"
              value={config.baselineIGSpread.toString()}
              onChange={(e) => updateConfig('baselineIGSpread', parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Base spread over Treasury for investment grade credits
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cache and Data Quality Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Cache and Data Quality Settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure cache refresh intervals and data quality thresholds.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Cache Refresh Interval (minutes)</Label>
              <Input
                type="number"
                min="1"
                max="60"
                step="1"
                value={config.cacheRefreshMinutes.toString()}
                onChange={(e) => updateConfig('cacheRefreshMinutes', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                How often to refresh cached market data
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Data Quality Threshold</Label>
              <Input
                type="number"
                min="0.5"
                max="1.0"
                step="0.05"
                value={config.dataQualityThreshold.toFixed(2)}
                onChange={(e) => updateConfig('dataQualityThreshold', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Minimum data quality score to accept data
              </p>
            </div>
          </div>

          {/* Current Settings Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-3">Configuration Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p><strong>Treasury Base:</strong> {config.baselineTreasury10Y.toFixed(1)}%</p>
                <p><strong>Sensitivity:</strong> {config.treasurySensitivity.toFixed(1)}x</p>
                <p><strong>IG Spread:</strong> {config.baselineIGSpread} bps</p>
              </div>
              <div className="space-y-2">
                <p><strong>Cache Refresh:</strong> Every {config.cacheRefreshMinutes} minutes</p>
                <p><strong>Quality Threshold:</strong> {(config.dataQualityThreshold * 100).toFixed(0)}%</p>
                <p><strong>Effective Rate:</strong> {(config.baselineTreasury10Y + config.baselineIGSpread / 100).toFixed(2)}%</p>
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
                <span className="text-sm text-orange-700">You have unsaved changes to market data configuration</span>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={loadConfiguration}>
                  Discard Changes
                </Button>
                <Button size="sm" onClick={saveConfiguration} disabled={saving}>
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