import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Zap, AlertCircle } from 'lucide-react';
import GasEstimatorEIP1559, { EIP1559FeeData } from '@/components/tokens/components/transactions/GasEstimatorEIP1559';
import { FeePriority } from '@/services/blockchain/FeeEstimator';
import type { GasConfiguration } from '@/hooks/useGasEstimation';

interface GasConfigurationCardProps {
  blockchain: string;
  gasConfig: GasConfiguration;
  onGasConfigChange: (config: GasConfiguration) => void;
  disabled?: boolean;
  onGasPriceChange?: (gasPrice: string) => void;
  onGasLimitChange?: (gasLimit: number) => void;
  onMaxFeePerGasChange?: (maxFeePerGas: string) => void;
  onMaxPriorityFeePerGasChange?: (maxPriorityFeePerGas: string) => void;
}

/**
 * Gas Configuration Card
 * 
 * Handles gas price and limit configuration for token deployment.
 * Supports both automatic estimation (EIP-1559) and manual configuration.
 * 
 * @component
 */
export const GasConfigurationCard: React.FC<GasConfigurationCardProps> = React.memo(({
  blockchain,
  gasConfig,
  onGasConfigChange,
  disabled = false,
  onGasPriceChange,
  onGasLimitChange,
  onMaxFeePerGasChange,
  onMaxPriorityFeePerGasChange
}) => {
  const [showGasConfig, setShowGasConfig] = useState(false);
  const [estimatedData, setEstimatedData] = useState<EIP1559FeeData | null>(null);
  
  // Get network-specific gas recommendations
  const getGasRecommendation = () => {
    const recommendations: Record<string, { price: string; limit: number; note: string }> = {
      ethereum: { price: '20-50', limit: 3000000, note: 'Mainnet: 20-50 Gwei typical' },
      polygon: { price: '30-100', limit: 3000000, note: 'Polygon: 30-100 Gwei typical' },
      base: { price: '1-5', limit: 3000000, note: 'Base: 1-5 Gwei typical' },
      arbitrum: { price: '1-5', limit: 3000000, note: 'Arbitrum: 1-5 Gwei typical' },
      optimism: { price: '1-5', limit: 3000000, note: 'Optimism: 1-5 Gwei typical' },
      avalanche: { price: '25-50', limit: 3000000, note: 'Avalanche: 25-50 Gwei typical' },
      bsc: { price: '3-5', limit: 3000000, note: 'BSC: 3-5 Gwei typical' }
    };
    
    return recommendations[blockchain] || { price: '20', limit: 3000000, note: 'Default: 20 Gwei' };
  };
  
  // Handle gas estimation updates
  const handleGasEstimate = (feeData: EIP1559FeeData, isManualMode: boolean = false) => {
    setEstimatedData(feeData);
    
    const supportsEIP1559 = !!(feeData.maxFeePerGas && feeData.maxPriorityFeePerGas);
    
    // If in manual mode or user switched to manual config, don't auto-update
    if (isManualMode || gasConfig.mode === 'manual') {
      return;
    }
    
    if (supportsEIP1559) {
      const maxFeeGwei = (Number(feeData.maxFeePerGas) / 1e9).toFixed(2);
      const priorityFeeGwei = (Number(feeData.maxPriorityFeePerGas) / 1e9).toFixed(2);
      
      const newConfig: GasConfiguration = {
        ...gasConfig,
        maxFeePerGas: maxFeeGwei,
        maxPriorityFeePerGas: priorityFeeGwei,
        gasPrice: maxFeeGwei,
        isEIP1559: true
      };
      
      onGasConfigChange(newConfig);
      onMaxFeePerGasChange?.(maxFeeGwei);
      onMaxPriorityFeePerGasChange?.(priorityFeeGwei);
      onGasPriceChange?.(maxFeeGwei);
    } else {
      if (feeData.gasPrice) {
        const gasPriceGwei = (Number(feeData.gasPrice) / 1e9).toFixed(2);
        
        const newConfig: GasConfiguration = {
          ...gasConfig,
          gasPrice: gasPriceGwei,
          isEIP1559: false
        };
        
        onGasConfigChange(newConfig);
        onGasPriceChange?.(gasPriceGwei);
      }
    }
  };
  
  // Handle mode change
  const handleModeChange = (isEstimator: boolean) => {
    const newConfig: GasConfiguration = {
      ...gasConfig,
      mode: isEstimator ? 'estimator' : 'manual'
    };
    onGasConfigChange(newConfig);
  };
  
  // Manual gas price change
  const handleGasPriceInput = (value: string) => {
    const newConfig: GasConfiguration = {
      ...gasConfig,
      gasPrice: value,
      mode: 'manual'
    };
    onGasConfigChange(newConfig);
    onGasPriceChange?.(value);
  };
  
  // Manual gas limit change
  const handleGasLimitInput = (value: number) => {
    const newConfig: GasConfiguration = {
      ...gasConfig,
      gasLimit: value,
      mode: 'manual'
    };
    onGasConfigChange(newConfig);
    onGasLimitChange?.(value);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Gas Configuration
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGasConfig(!showGasConfig)}
          >
            {showGasConfig ? 'Hide Details' : 'Show Details'}
          </Button>
        </CardTitle>
        <CardDescription>
          Configure gas price and limit for the deployment transaction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gas Configuration Mode Selector */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-base">Automatic Gas Estimation</Label>
            <p className="text-sm text-muted-foreground">
              Automatically estimate optimal gas fees based on network conditions
            </p>
          </div>
          <Switch
            checked={gasConfig.mode === 'estimator'}
            onCheckedChange={handleModeChange}
            disabled={disabled}
          />
        </div>
        
        {gasConfig.mode === 'estimator' ? (
          // Automatic Gas Estimation
          <div className="space-y-4">
            <GasEstimatorEIP1559
              blockchain={blockchain}
              onSelectFeeData={handleGasEstimate}
              defaultPriority={FeePriority.MEDIUM}
              showAdvanced={true}
            />
            
            {estimatedData && showGasConfig && (
              <div className="pt-4 space-y-2">
                <Separator />
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {gasConfig.isEIP1559 ? (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">Max Fee Per Gas</Label>
                        <div className="text-sm font-medium">{gasConfig.maxFeePerGas} Gwei</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Max Priority Fee</Label>
                        <div className="text-sm font-medium">{gasConfig.maxPriorityFeePerGas} Gwei</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">Estimated Gas Price</Label>
                        <div className="text-sm font-medium">{gasConfig.gasPrice} Gwei</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Gas Limit</Label>
                        <div className="text-sm font-medium">{gasConfig.gasLimit.toLocaleString()}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Manual Gas Configuration
          <div className="space-y-4">
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-800 dark:text-amber-300">
                Manual Configuration
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                {getGasRecommendation().note}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="gasPrice">Gas Price (Gwei)</Label>
              <Input
                id="gasPrice"
                type="number"
                step="1"
                min="0"
                value={gasConfig.gasPrice}
                onChange={(e) => handleGasPriceInput(e.target.value)}
                disabled={disabled}
                placeholder="20"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: {getGasRecommendation().price} Gwei for {blockchain}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gasLimit">Gas Limit</Label>
              <Input
                id="gasLimit"
                type="number"
                step="100000"
                min="21000"
                value={gasConfig.gasLimit}
                onChange={(e) => handleGasLimitInput(parseInt(e.target.value) || 3000000)}
                disabled={disabled}
                placeholder="3000000"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: {getGasRecommendation().limit.toLocaleString()} for token deployment
              </p>
            </div>
            
            {showGasConfig && (
              <div className="pt-2">
                <Separator className="mb-4" />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Cost:</span>
                    <span className="font-medium">
                      {((parseFloat(gasConfig.gasPrice) * gasConfig.gasLimit) / 1e9).toFixed(6)} {blockchain.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * Actual cost may vary based on network conditions and transaction execution
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

GasConfigurationCard.displayName = 'GasConfigurationCard';
