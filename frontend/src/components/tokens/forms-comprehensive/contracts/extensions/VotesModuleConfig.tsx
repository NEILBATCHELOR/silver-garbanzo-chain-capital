/**
 * Votes Module Configuration Component
 * ✅ ENHANCED: Complete governance voting configuration
 * Adds voting power and delegation with customizable governance parameters
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Vote, Users } from 'lucide-react';
import type { ModuleConfigProps, VotesModuleConfig } from '../types';

export function VotesModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<VotesModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        ...config,
        enabled: false
      });
    } else {
      onChange({
        enabled: true,
        votingDelay: config.votingDelay || 0, // Default: immediate
        votingPeriod: config.votingPeriod || 50400, // Default: ~1 week (Ethereum blocks)
        proposalThreshold: config.proposalThreshold || '0',
        quorumPercentage: config.quorumPercentage || 4, // Default: 4%
        delegatesEnabled: config.delegatesEnabled !== false // Default: true
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Votes Module (Governance)</Label>
          <p className="text-xs text-muted-foreground">
            Enable governance voting with customizable parameters
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {config.enabled && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Tokens become governance tokens with voting power (1 token = 1 vote by default). 
              Includes vote delegation and historical voting power tracking.
            </AlertDescription>
          </Alert>

          {/* Voting Parameters */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Vote className="h-4 w-4" />
                Voting Parameters
              </Label>

              <div className="grid grid-cols-2 gap-4">
                {/* Voting Delay */}
                <div className="space-y-2">
                  <Label className="text-xs">Voting Delay (blocks)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={config.votingDelay || 0}
                    onChange={(e) => onChange({
                      ...config,
                      votingDelay: parseInt(e.target.value) || 0
                    })}
                    disabled={disabled}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Blocks between proposal and vote start (~{((config.votingDelay || 0) * 12 / 3600).toFixed(1)} hours)
                  </p>
                </div>

                {/* Voting Period */}
                <div className="space-y-2">
                  <Label className="text-xs">Voting Period (blocks)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={config.votingPeriod || 50400}
                    onChange={(e) => onChange({
                      ...config,
                      votingPeriod: parseInt(e.target.value) || 50400
                    })}
                    disabled={disabled}
                    placeholder="50400"
                  />
                  <p className="text-xs text-muted-foreground">
                    Duration of voting (~{((config.votingPeriod || 50400) * 12 / 3600 / 24).toFixed(1)} days)
                  </p>
                </div>

                {/* Proposal Threshold */}
                <div className="space-y-2">
                  <Label className="text-xs">Proposal Threshold (tokens)</Label>
                  <Input
                    value={config.proposalThreshold || '0'}
                    onChange={(e) => onChange({
                      ...config,
                      proposalThreshold: e.target.value
                    })}
                    disabled={disabled}
                    placeholder="0"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum tokens needed to create a proposal (0 = anyone can propose)
                  </p>
                </div>

                {/* Quorum Percentage */}
                <div className="space-y-2">
                  <Label className="text-xs">Quorum (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={config.quorumPercentage || 4}
                    onChange={(e) => onChange({
                      ...config,
                      quorumPercentage: parseFloat(e.target.value) || 4
                    })}
                    disabled={disabled}
                    placeholder="4"
                  />
                  <p className="text-xs text-muted-foreground">
                    % of total supply needed for a valid vote
                  </p>
                </div>
              </div>

              {/* Common Values Helper */}
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                <p className="font-medium mb-1">Common values (Ethereum mainnet):</p>
                <ul className="list-disc list-inside pl-2 space-y-0.5">
                  <li>1 day = ~7,200 blocks</li>
                  <li>1 week = ~50,400 blocks</li>
                  <li>Typical delay: 0-7,200 blocks</li>
                  <li>Typical period: 50,400-100,800 blocks (1-2 weeks)</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Delegation */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Vote Delegation
              </Label>

              <div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="delegatesEnabled"
                    checked={config.delegatesEnabled !== false}
                    onChange={(e) => onChange({
                      ...config,
                      delegatesEnabled: e.target.checked
                    })}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="delegatesEnabled" className="text-xs font-normal cursor-pointer">
                    Enable Vote Delegation
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground pl-6 mt-1">
                  Token holders can delegate their voting power to other addresses
                </p>
              </div>
            </div>
          </Card>

          {/* Governance Example */}
          <Card className="p-4 bg-primary/10">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Governance Flow Example</Label>
              <div className="text-xs space-y-1">
                <p className="font-medium">For a governance proposal:</p>
                <ol className="list-decimal list-inside pl-2 space-y-0.5">
                  <li>Proposer needs ≥{config.proposalThreshold || '0'} tokens to create proposal</li>
                  <li>Wait {config.votingDelay || 0} blocks before voting opens (~{((config.votingDelay || 0) * 12 / 3600).toFixed(1)} hours)</li>
                  <li>Voting open for {config.votingPeriod || 50400} blocks (~{((config.votingPeriod || 50400) * 12 / 3600 / 24).toFixed(1)} days)</li>
                  <li>Need {config.quorumPercentage || 4}% quorum for valid result</li>
                  {config.delegatesEnabled !== false && (
                    <li>Token holders can delegate votes to representatives</li>
                  )}
                </ol>
              </div>
            </div>
          </Card>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Governance parameters will be configured 
              automatically during deployment. These settings can typically be changed later through 
              governance proposals.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
