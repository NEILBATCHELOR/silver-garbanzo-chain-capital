/**
 * Constraint Configuration Editor
 * Allows admins to configure redemption constraints for a token
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  Shield,
  Save,
  RefreshCw,
  Info,
  AlertTriangle
} from 'lucide-react';
import { useRedemptionConstraints } from '@/infrastructure/redemption/rules/hooks';
import type { RedemptionConstraints } from '@/infrastructure/redemption/rules/types';

interface ConstraintEditorProps {
  tokenId: string;
  onSave?: (constraints: RedemptionConstraints) => void;
  className?: string;
}

export const ConstraintEditor: React.FC<ConstraintEditorProps> = ({
  tokenId,
  onSave,
  className
}) => {
  const { toast } = useToast();
  const { getConstraints, updateConstraints } = useRedemptionConstraints();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<RedemptionConstraints>({
    maxRedemptionPercentage: undefined,
    minHoldingPeriod: undefined,
    maxRedemptionsPerPeriod: undefined,
    periodDays: 30,
    minRedemptionAmount: undefined,
    maxRedemptionAmount: undefined
  });
  const [enabledConstraints, setEnabledConstraints] = useState({
    percentage: false,
    holding: false,
    frequency: false,
    amounts: false,
    lockup: false
  });

  useEffect(() => {
    loadConstraints();
  }, [tokenId]);

  const loadConstraints = async () => {
    setLoading(true);
    try {
      const constraints = await getConstraints(tokenId);
      if (constraints) {
        setFormData(constraints);
        setEnabledConstraints({
          percentage: constraints.maxRedemptionPercentage !== undefined,
          holding: constraints.minHoldingPeriod !== undefined,
          frequency: constraints.maxRedemptionsPerPeriod !== undefined,
          amounts: constraints.minRedemptionAmount !== undefined || constraints.maxRedemptionAmount !== undefined,
          lockup: constraints.minHoldingPeriod !== undefined
        });
      }
    } catch (error) {
      console.error('Error loading constraints:', error);
      toast({
        title: "Error",
        description: "Failed to load constraints",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build constraints object with only enabled constraints
      const constraints: RedemptionConstraints = {};
      
      if (enabledConstraints.percentage && formData.maxRedemptionPercentage !== undefined) {
        constraints.maxRedemptionPercentage = formData.maxRedemptionPercentage;
      }
      
      if (enabledConstraints.holding && formData.minHoldingPeriod !== undefined) {
        constraints.minHoldingPeriod = formData.minHoldingPeriod;
      }
      
      if (enabledConstraints.frequency) {
        constraints.maxRedemptionsPerPeriod = formData.maxRedemptionsPerPeriod;
        constraints.periodDays = formData.periodDays || 30;
      }
      
      if (enabledConstraints.amounts) {
        if (formData.minRedemptionAmount !== undefined) {
          constraints.minRedemptionAmount = formData.minRedemptionAmount;
        }
        if (formData.maxRedemptionAmount !== undefined) {
          constraints.maxRedemptionAmount = formData.maxRedemptionAmount;
        }
      }
      
      if (enabledConstraints.lockup && formData.minHoldingPeriod !== undefined) {
        constraints.minHoldingPeriod = formData.minHoldingPeriod;
      }

      await updateConstraints(tokenId, constraints);
      
      toast({
        title: "Success",
        description: "Constraints updated successfully"
      });
      
      onSave?.(constraints);
    } catch (error) {
      console.error('Error saving constraints:', error);
      toast({
        title: "Error",
        description: "Failed to save constraints",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          Configure Redemption Constraints
        </CardTitle>
        <CardDescription>
          Set limits and requirements for token redemption
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Enable specific constraints and configure their values. Disabled constraints will not be enforced.
          </AlertDescription>
        </Alert>

        {/* Percentage Limit */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-percentage" className="text-base font-semibold">
              Maximum Redemption Percentage
            </Label>
            <Switch
              id="enable-percentage"
              checked={enabledConstraints.percentage}
              onCheckedChange={(checked) => 
                setEnabledConstraints(prev => ({ ...prev, percentage: checked }))
              }
            />
          </div>
          {enabledConstraints.percentage && (
            <div className="space-y-2">
              <Label htmlFor="max-percentage">Maximum % per redemption</Label>
              <Input
                id="max-percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.maxRedemptionPercentage || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  maxRedemptionPercentage: parseFloat(e.target.value) || undefined 
                }))}
                placeholder="e.g., 10"
              />
              <p className="text-xs text-gray-500">
                Prevents any single redemption from exceeding this percentage of total supply
              </p>
            </div>
          )}
        </div>

        {/* Holding Period */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-holding" className="text-base font-semibold">
              Minimum Holding Period
            </Label>
            <Switch
              id="enable-holding"
              checked={enabledConstraints.holding}
              onCheckedChange={(checked) => 
                setEnabledConstraints(prev => ({ ...prev, holding: checked }))
              }
            />
          </div>
          {enabledConstraints.holding && (
            <div className="space-y-2">
              <Label htmlFor="min-holding">Minimum days</Label>
              <Input
                id="min-holding"
                type="number"
                min="0"
                value={formData.minHoldingPeriod || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  minHoldingPeriod: parseInt(e.target.value) || undefined 
                }))}
                placeholder="e.g., 90"
              />
              <p className="text-xs text-gray-500">
                Tokens must be held for at least this many days before redemption
              </p>
            </div>
          )}
        </div>

        {/* Frequency Limit */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-frequency" className="text-base font-semibold">
              Redemption Frequency Limit
            </Label>
            <Switch
              id="enable-frequency"
              checked={enabledConstraints.frequency}
              onCheckedChange={(checked) => 
                setEnabledConstraints(prev => ({ ...prev, frequency: checked }))
              }
            />
          </div>
          {enabledConstraints.frequency && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="max-redemptions">Maximum redemptions</Label>
                  <Input
                    id="max-redemptions"
                    type="number"
                    min="1"
                    value={formData.maxRedemptionsPerPeriod || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maxRedemptionsPerPeriod: parseInt(e.target.value) || undefined 
                    }))}
                    placeholder="e.g., 4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period-days">Period (days)</Label>
                  <Input
                    id="period-days"
                    type="number"
                    min="1"
                    value={formData.periodDays || 30}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      periodDays: parseInt(e.target.value) || 30 
                    }))}
                    placeholder="e.g., 30"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Limits the number of redemptions allowed within a rolling time period
              </p>
            </div>
          )}
        </div>

        {/* Amount Limits */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-amounts" className="text-base font-semibold">
              Redemption Amount Limits
            </Label>
            <Switch
              id="enable-amounts"
              checked={enabledConstraints.amounts}
              onCheckedChange={(checked) => 
                setEnabledConstraints(prev => ({ ...prev, amounts: checked }))
              }
            />
          </div>
          {enabledConstraints.amounts && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="min-amount">Minimum amount (tokens)</Label>
                <Input
                  id="min-amount"
                  type="number"
                  min="0"
                  step="0.000001"
                  value={formData.minRedemptionAmount ? Number(formData.minRedemptionAmount) / 1e18 : ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    minRedemptionAmount: e.target.value ? BigInt(Math.floor(parseFloat(e.target.value) * 1e18)) : undefined 
                  }))}
                  placeholder="e.g., 100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-amount">Maximum amount (tokens)</Label>
                <Input
                  id="max-amount"
                  type="number"
                  min="0"
                  step="0.000001"
                  value={formData.maxRedemptionAmount ? Number(formData.maxRedemptionAmount) / 1e18 : ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    maxRedemptionAmount: e.target.value ? BigInt(Math.floor(parseFloat(e.target.value) * 1e18)) : undefined 
                  }))}
                  placeholder="e.g., 10000"
                />
              </div>
            </div>
          )}
        </div>

        {/* Lockup Period */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-lockup" className="text-base font-semibold">
              Token Lockup Period
            </Label>
            <Switch
              id="enable-lockup"
              checked={enabledConstraints.lockup}
              onCheckedChange={(checked) => 
                setEnabledConstraints(prev => ({ ...prev, lockup: checked }))
              }
            />
          </div>
          {enabledConstraints.lockup && (
            <div className="space-y-2">
              <Label htmlFor="lockup-days">Lockup days after purchase</Label>
              <Input
                id="lockup-days"
                type="number"
                min="0"
                value={formData.minHoldingPeriod || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  minHoldingPeriod: parseInt(e.target.value) || undefined 
                }))}
                placeholder="e.g., 180"
              />
              <p className="text-xs text-gray-500">
                New token purchases are locked for this many days before becoming eligible for redemption
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={loadConstraints}
            disabled={saving || loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Constraints'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConstraintEditor;
