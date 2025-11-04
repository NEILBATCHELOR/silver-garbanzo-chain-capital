// Module Selection Card Component
// Provides user-friendly feature toggles with automatic address resolution

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, Info } from 'lucide-react';
import { useModuleRegistry } from '@/services/modules';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface ModuleSelectionCardProps {
  network: string;
  tokenStandard: 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400';
  environment?: string;
  onChange?: (selection: any) => void;
  disabled?: boolean;
}

/**
 * Feature metadata for display
 */
const FEATURE_INFO: Record<string, { label: string; description: string; }> = {
  compliance: {
    label: 'KYC/AML Compliance',
    description: 'Enforce KYC verification and compliance checks on transfers'
  },
  vesting: {
    label: 'Token Vesting',
    description: 'Lock tokens with customizable vesting schedules'
  },
  fees: {
    label: 'Transfer Fees',
    description: 'Charge fees on token transfers with configurable rates'
  },
  permit: {
    label: 'Permit (EIP-2612)',
    description: 'Enable gasless approvals via off-chain signatures'
  },
  snapshot: {
    label: 'Balance Snapshots',
    description: 'Capture token balances at specific points in time'
  },
  flashMint: {
    label: 'Flash Minting',
    description: 'Enable flash loans with instant mint and burn'
  },
  votes: {
    label: 'Governance Votes',
    description: 'Add voting power for governance proposals'
  },
  timelock: {
    label: 'Timelock Controller',
    description: 'Delay administrative actions with timelock'
  },
  payableToken: {
    label: 'Payable Token',
    description: 'Allow ETH to be sent alongside token transfers'
  },
  temporaryApproval: {
    label: 'Temporary Approvals',
    description: 'Approvals that expire after a set duration'
  }
};

export const ModuleSelectionCard: React.FC<ModuleSelectionCardProps> = ({
  network,
  tokenStandard,
  environment = 'testnet',
  onChange,
  disabled = false
}) => {
  const {
    selection,
    availableFeatures,
    isLoading,
    error,
    toggleFeature,
    getResolvedAddresses
  } = useModuleRegistry({ network, tokenStandard, environment });

  // Use ref to avoid onChange dependency causing infinite loops
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  // Track if this is the first render to avoid calling onChange on mount
  const isFirstRender = React.useRef(true);

  // Notify parent of changes (skip first render to avoid initialization loops)
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (onChangeRef.current) {
      onChangeRef.current(selection);
    }
  }, [selection]); // Only depend on selection, not onChange

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extension Modules</CardTitle>
          <CardDescription>Loading available modules...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extension Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Extension Modules</CardTitle>
            <CardDescription>
              Select features to enhance your token. Module addresses are resolved automatically.
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {availableFeatures.length} available
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Universal Modules */}
        {availableFeatures.some(f => ['compliance', 'vesting', 'fees'].includes(f)) && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Universal Modules
            </h4>
            
            {availableFeatures.includes('compliance') && (
              <ModuleToggle
                feature="compliance"
                info={FEATURE_INFO.compliance}
                checked={selection.compliance || false}
                onToggle={() => toggleFeature('compliance')}
                disabled={disabled}
              />
            )}
            
            {availableFeatures.includes('vesting') && (
              <ModuleToggle
                feature="vesting"
                info={FEATURE_INFO.vesting}
                checked={selection.vesting || false}
                onToggle={() => toggleFeature('vesting')}
                disabled={disabled}
              />
            )}
            
            {availableFeatures.includes('fees') && (
              <ModuleToggle
                feature="fees"
                info={FEATURE_INFO.fees}
                checked={selection.fees || false}
                onToggle={() => toggleFeature('fees')}
                disabled={disabled}
              />
            )}
          </div>
        )}

        {/* ERC20-Specific Modules */}
        {tokenStandard === 'erc20' && availableFeatures.length > 3 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">
              ERC20 Extensions
            </h4>
            
            {availableFeatures.includes('permit') && (
              <ModuleToggle
                feature="permit"
                info={FEATURE_INFO.permit}
                checked={selection.permit || false}
                onToggle={() => toggleFeature('permit')}
                disabled={disabled}
              />
            )}
            
            {availableFeatures.includes('snapshot') && (
              <ModuleToggle
                feature="snapshot"
                info={FEATURE_INFO.snapshot}
                checked={selection.snapshot || false}
                onToggle={() => toggleFeature('snapshot')}
                disabled={disabled}
              />
            )}
            
            {availableFeatures.includes('flashMint') && (
              <ModuleToggle
                feature="flashMint"
                info={FEATURE_INFO.flashMint}
                checked={selection.flashMint || false}
                onToggle={() => toggleFeature('flashMint')}
                disabled={disabled}
              />
            )}
            
            {availableFeatures.includes('votes') && (
              <ModuleToggle
                feature="votes"
                info={FEATURE_INFO.votes}
                checked={selection.votes || false}
                onToggle={() => toggleFeature('votes')}
                disabled={disabled}
              />
            )}
            
            {availableFeatures.includes('timelock') && (
              <ModuleToggle
                feature="timelock"
                info={FEATURE_INFO.timelock}
                checked={selection.timelock || false}
                onToggle={() => toggleFeature('timelock')}
                disabled={disabled}
              />
            )}
            
            {availableFeatures.includes('payableToken') && (
              <ModuleToggle
                feature="payableToken"
                info={FEATURE_INFO.payableToken}
                checked={selection.payableToken || false}
                onToggle={() => toggleFeature('payableToken')}
                disabled={disabled}
              />
            )}
            
            {availableFeatures.includes('temporaryApproval') && (
              <ModuleToggle
                feature="temporaryApproval"
                info={FEATURE_INFO.temporaryApproval}
                checked={selection.temporaryApproval || false}
                onToggle={() => toggleFeature('temporaryApproval')}
                disabled={disabled}
              />
            )}
          </div>
        )}

        {/* Selected Count */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {Object.values(selection).filter(Boolean).length} module(s) selected
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Module addresses are automatically resolved based on your network selection.
            You never need to enter contract addresses manually.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

/**
 * Individual module toggle component
 */
interface ModuleToggleProps {
  feature: string;
  info: { label: string; description: string; };
  checked: boolean;
  onToggle: () => void;
  disabled: boolean;
}

const ModuleToggle: React.FC<ModuleToggleProps> = ({
  feature,
  info,
  checked,
  onToggle,
  disabled
}) => {
  return (
    <div className="flex items-start justify-between space-x-4 p-4 border rounded-lg">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Label htmlFor={feature} className="text-sm font-medium">
            {info.label}
          </Label>
          {checked && (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {info.description}
        </p>
      </div>
      <Switch
        id={feature}
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
};
