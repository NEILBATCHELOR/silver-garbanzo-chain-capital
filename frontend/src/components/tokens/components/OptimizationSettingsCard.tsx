import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2 } from 'lucide-react';

export type DeploymentStrategy = 'auto' | 'direct' | 'chunked' | 'batched';

export interface OptimizationConfiguration {
  enabled: boolean;
  strategy: DeploymentStrategy;
}

interface OptimizationSettingsCardProps {
  useOptimization: boolean;
  deploymentStrategy: DeploymentStrategy;
  onOptimizationChange: (enabled: boolean) => void;
  onStrategyChange: (strategy: DeploymentStrategy) => void;
  disabled?: boolean;
}

/**
 * Optimization Settings Card
 * 
 * Handles deployment optimization and strategy selection.
 * Provides options for gas savings and reliability improvements.
 * 
 * @component
 */
export const OptimizationSettingsCard: React.FC<OptimizationSettingsCardProps> = React.memo(({
  useOptimization,
  deploymentStrategy,
  onOptimizationChange,
  onStrategyChange,
  disabled = false
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Deployment Optimization
        </CardTitle>
        <CardDescription>
          Configure deployment optimization and gas saving strategies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-base">Enable Optimization</Label>
            <p className="text-sm text-muted-foreground">
              Use advanced optimization for gas savings and reliability
            </p>
          </div>
          <Switch
            checked={useOptimization}
            onCheckedChange={onOptimizationChange}
            disabled={disabled}
          />
        </div>
        
        {useOptimization && (
          <div className="space-y-2">
            <Label htmlFor="strategy">Deployment Strategy</Label>
            <Select 
              value={deploymentStrategy} 
              onValueChange={onStrategyChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect (Recommended)</SelectItem>
                <SelectItem value="direct">Direct Deployment</SelectItem>
                <SelectItem value="batched">Batched Deployment</SelectItem>
                <SelectItem value="chunked">Chunked Deployment</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Auto-detect analyzes your token configuration and chooses the optimal strategy
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

OptimizationSettingsCard.displayName = 'OptimizationSettingsCard';
