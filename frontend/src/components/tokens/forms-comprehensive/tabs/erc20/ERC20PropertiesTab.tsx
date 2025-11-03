// ERC20 Properties Tab Component
// Handles token_erc20_properties table with complete field coverage

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus, Minus } from 'lucide-react';

import { TokenERC20PropertiesData, ConfigMode } from '../../types';
import { ModuleSelectionCard } from '../../ui/ModuleSelectionCard';

interface ERC20PropertiesTabProps {
  data: TokenERC20PropertiesData | TokenERC20PropertiesData[];
  validationErrors: Record<string, string[]>;
  isModified: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting: boolean;
  network?: string;
  environment?: string;
}

export const ERC20PropertiesTab: React.FC<ERC20PropertiesTabProps> = ({
  data,
  validationErrors,
  isModified,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting,
  network = 'hoodi',
  environment = 'testnet'
}) => {
  // Handle single record for properties table
  const propertiesData = Array.isArray(data) ? (data[0] || {}) : data;

  const handleFieldChange = (field: string, value: any) => {
    onFieldChange(field, value, 0);
  };

  const getFieldError = (field: string): string[] => {
    return validationErrors[`0.${field}`] || validationErrors[field] || [];
  };

  const hasFieldError = (field: string): boolean => {
    return getFieldError(field).length > 0;
  };

  // Handle JSON field updates
  const handleJsonFieldChange = (parentField: string, subField: string, value: any) => {
    const currentValue = propertiesData[parentField] || {};
    const updatedValue = {
      ...currentValue,
      [subField]: value
    };
    handleFieldChange(parentField, updatedValue);
  };

  return (
    <div className="space-y-6">
      {/* Basic Supply Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Supply Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Initial Supply */}
            <div className="space-y-2">
              <Label htmlFor="initial_supply" className="text-sm font-medium">
                Initial Supply
              </Label>
              <Input
                id="initial_supply"
                value={propertiesData.initial_supply || ''}
                onChange={(e) => handleFieldChange('initial_supply', e.target.value)}
                placeholder="Enter initial supply"
                className={hasFieldError('initial_supply') ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {hasFieldError('initial_supply') && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {getFieldError('initial_supply').join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Cap (Maximum Supply) */}
            <div className="space-y-2">
              <Label htmlFor="cap" className="text-sm font-medium">
                Maximum Supply (Cap)
              </Label>
              <Input
                id="cap"
                value={propertiesData.cap || ''}
                onChange={(e) => handleFieldChange('cap', e.target.value)}
                placeholder="Enter maximum supply (0 for unlimited)"
                className={hasFieldError('cap') ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {hasFieldError('cap') && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {getFieldError('cap').join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Features */}
      <Card>
        <CardHeader>
          <CardTitle>Token Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mintable */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="is_mintable" className="text-sm font-medium">
                  Mintable
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow creating new tokens after deployment
                </p>
              </div>
              <Switch
                id="is_mintable"
                checked={propertiesData.is_mintable || false}
                onCheckedChange={(checked) => handleFieldChange('is_mintable', checked)}
                disabled={isSubmitting}
              />
            </div>

            {/* Burnable */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="is_burnable" className="text-sm font-medium">
                  Burnable
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow permanently destroying tokens
                </p>
              </div>
              <Switch
                id="is_burnable"
                checked={propertiesData.is_burnable || false}
                onCheckedChange={(checked) => handleFieldChange('is_burnable', checked)}
                disabled={isSubmitting}
              />
            </div>

            {/* Pausable */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="is_pausable" className="text-sm font-medium">
                  Pausable
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow pausing all token transfers
                </p>
              </div>
              <Switch
                id="is_pausable"
                checked={propertiesData.is_pausable || false}
                onCheckedChange={(checked) => handleFieldChange('is_pausable', checked)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Features (Max Mode) */}
      {configMode === 'max' && (
        <>
          <Separator />
          
          {/* Token Type and Access Control */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Token Type */}
                <div className="space-y-2">
                  <Label htmlFor="token_type" className="text-sm font-medium">
                    Token Type
                  </Label>
                  <Select
                    value={propertiesData.token_type || ''}
                    onValueChange={(value) => handleFieldChange('token_type', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select token type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utility">Utility Token</SelectItem>
                      <SelectItem value="governance">Governance Token</SelectItem>
                      <SelectItem value="stablecoin">Stablecoin</SelectItem>
                      <SelectItem value="reward">Reward Token</SelectItem>
                      <SelectItem value="wrapped">Wrapped Token</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Access Control */}
                <div className="space-y-2">
                  <Label htmlFor="access_control" className="text-sm font-medium">
                    Access Control
                  </Label>
                  <Select
                    value={propertiesData.access_control || ''}
                    onValueChange={(value) => handleFieldChange('access_control', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select access control" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner Only</SelectItem>
                      <SelectItem value="role_based">Role-Based</SelectItem>
                      <SelectItem value="multisig">Multi-Signature</SelectItem>
                      <SelectItem value="dao">DAO Governance</SelectItem>
                      <SelectItem value="none">No Access Control</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Allow Management */}
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-1">
                    <Label htmlFor="allow_management" className="text-sm font-medium">
                      Management Functions
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable administrative functions
                    </p>
                  </div>
                  <Switch
                    id="allow_management"
                    checked={propertiesData.allow_management || false}
                    onCheckedChange={(checked) => handleFieldChange('allow_management', checked)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Permit (EIP-2612) */}
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-1">
                    <Label htmlFor="permit" className="text-sm font-medium">
                      Permit (EIP-2612)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable gasless approvals
                    </p>
                  </div>
                  <Switch
                    id="permit"
                    checked={propertiesData.permit || false}
                    onCheckedChange={(checked) => handleFieldChange('permit', checked)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Snapshot */}
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-1">
                    <Label htmlFor="snapshot" className="text-sm font-medium">
                      Snapshot
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable balance snapshots
                    </p>
                  </div>
                  <Switch
                    id="snapshot"
                    checked={propertiesData.snapshot || false}
                    onCheckedChange={(checked) => handleFieldChange('snapshot', checked)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complex Features */}
          <Card>
            <CardHeader>
              <CardTitle>Complex Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Fee on Transfer */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Fee on Transfer</Label>
                  <Switch
                    checked={!!(propertiesData.fee_on_transfer && Object.keys(propertiesData.fee_on_transfer).length > 0)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleFieldChange('fee_on_transfer', { enabled: true, percentage: 0.1 });
                      } else {
                        handleFieldChange('fee_on_transfer', null);
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </div>
                
                {propertiesData.fee_on_transfer && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-xs">Fee Percentage</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={propertiesData.fee_on_transfer?.percentage || 0}
                        onChange={(e) => handleJsonFieldChange('fee_on_transfer', 'percentage', parseFloat(e.target.value))}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Fee Recipient</Label>
                      <Input
                        value={propertiesData.fee_on_transfer?.recipient || ''}
                        onChange={(e) => handleJsonFieldChange('fee_on_transfer', 'recipient', e.target.value)}
                        placeholder="0x..."
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Rebasing */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Rebasing Token</Label>
                  <Switch
                    checked={!!(propertiesData.rebasing && Object.keys(propertiesData.rebasing).length > 0)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleFieldChange('rebasing', { enabled: true, type: 'positive' });
                      } else {
                        handleFieldChange('rebasing', null);
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </div>
                
                {propertiesData.rebasing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-xs">Rebase Type</Label>
                      <Select
                        value={propertiesData.rebasing?.type || 'positive'}
                        onValueChange={(value) => handleJsonFieldChange('rebasing', 'type', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive">Positive Rebase</SelectItem>
                          <SelectItem value="negative">Negative Rebase</SelectItem>
                          <SelectItem value="neutral">Neutral Rebase</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Rebase Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={propertiesData.rebasing?.rate || 0}
                        onChange={(e) => handleJsonFieldChange('rebasing', 'rate', parseFloat(e.target.value))}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Governance Features */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Governance Features</Label>
                  <Switch
                    checked={!!(propertiesData.governance_features && Object.keys(propertiesData.governance_features).length > 0)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleFieldChange('governance_features', { enabled: true, voting_delay: 1, voting_period: 7 });
                      } else {
                        handleFieldChange('governance_features', null);
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </div>
                
                {propertiesData.governance_features && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-xs">Voting Delay (blocks)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={propertiesData.governance_features?.voting_delay || 1}
                        onChange={(e) => handleJsonFieldChange('governance_features', 'voting_delay', parseInt(e.target.value))}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Voting Period (days)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={propertiesData.governance_features?.voting_period || 7}
                        onChange={(e) => handleJsonFieldChange('governance_features', 'voting_period', parseInt(e.target.value))}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Proposal Threshold</Label>
                      <Input
                        value={propertiesData.governance_features?.proposal_threshold || ''}
                        onChange={(e) => handleJsonFieldChange('governance_features', 'proposal_threshold', e.target.value)}
                        placeholder="Minimum tokens to propose"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 🆕 Extension Modules */}
      <ModuleSelectionCard
        network={network}
        tokenStandard="erc20"
        environment={environment}
        onChange={(selection) => handleFieldChange('moduleSelection', selection)}
        disabled={isSubmitting}
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">ERC-20 Properties:</span>
          {isModified ? (
            <Badge variant="outline" className="text-yellow-600">Modified</Badge>
          ) : (
            <Badge variant="outline" className="text-green-600">Saved</Badge>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onValidate}
          disabled={isSubmitting}
        >
          Validate
        </Button>
      </div>
    </div>
  );
};

export default ERC20PropertiesTab;
