/**
 * Votes Module Configuration Component
 * ✅ CORRECTED: All governance parameters are REQUIRED by smart contract
 * Contract expects: admin, tokenName, votingDelay, votingPeriod, proposalThreshold, quorumPercentage
 * 
 * Key Changes:
 * - Made all governance parameters REQUIRED (removed optional)
 * - Added proper validation with min/max constraints
 * - Added sensible defaults for new configurations
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Vote, Users, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
      // Set sensible defaults for all REQUIRED parameters
      onChange({
        enabled: true,
        votingDelay: config.votingDelay ?? 0,            // Default: immediate
        votingPeriod: config.votingPeriod ?? 50400,      // Default: ~1 week (Ethereum blocks)
        proposalThreshold: config.proposalThreshold ?? '0', // Default: anyone can propose
        quorumPercentage: config.quorumPercentage ?? 4,  // Default: 4% quorum
        delegatesEnabled: config.delegatesEnabled !== false // Default: true
      });
    }
  };

  // Validation helpers
  const hasValidationError = (field: keyof VotesModuleConfig): boolean => {
    if (!errors) return false;
    return !!errors[field];
  };

  const getValidationError = (field: keyof VotesModuleConfig): string | undefined => {
    if (!errors) return undefined;
    const error = errors[field];
    // Handle both string and string[] error formats
    return Array.isArray(error) ? error[0] : error;
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
            <AlertDescription className="text-xs">
              Tokens become governance tokens with voting power (1 token = 1 vote by default). 
              Includes vote delegation and historical voting power tracking.
            </AlertDescription>
          </Alert>

          {/* Required Parameters Alert */}
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>All governance parameters are required</strong> for deployment. Please configure
              all settings below before proceeding.
            </AlertDescription>
          </Alert>

          {/* Voting Parameters */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Vote className="h-4 w-4" />
                  Voting Parameters
                </Label>
                <Badge variant="secondary" className="text-xs">
                  All Required
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Voting Delay */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Voting Delay (blocks) * <span className="text-red-500">Required</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={config.votingDelay ?? 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 0) {
                        onChange({
                          ...config,
                          votingDelay: value
                        });
                      }
                    }}
                    disabled={disabled}
                    placeholder="0"
                    className={hasValidationError('votingDelay') ? 'border-red-500' : ''}
                    required
                  />
                  {hasValidationError('votingDelay') && (
                    <p className="text-xs text-red-500">{getValidationError('votingDelay')}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Blocks between proposal and vote start (~{((config.votingDelay ?? 0) * 12 / 3600).toFixed(1)} hours)
                  </p>
                </div>

                {/* Voting Period */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Voting Period (blocks) * <span className="text-red-500">Required</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={config.votingPeriod ?? 50400}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 1) {
                        onChange({
                          ...config,
                          votingPeriod: value
                        });
                      }
                    }}
                    disabled={disabled}
                    placeholder="50400"
                    className={hasValidationError('votingPeriod') ? 'border-red-500' : ''}
                    required
                  />
                  {hasValidationError('votingPeriod') && (
                    <p className="text-xs text-red-500">{getValidationError('votingPeriod')}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Duration of voting (~{((config.votingPeriod ?? 50400) * 12 / 3600 / 24).toFixed(1)} days)
                  </p>
                </div>

                {/* Proposal Threshold */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Proposal Threshold (tokens) * <span className="text-red-500">Required</span>
                  </Label>
                  <Input
                    value={config.proposalThreshold ?? '0'}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers
                      if (/^\d*$/.test(value)) {
                        onChange({
                          ...config,
                          proposalThreshold: value
                        });
                      }
                    }}
                    disabled={disabled}
                    placeholder="0"
                    className={`font-mono ${hasValidationError('proposalThreshold') ? 'border-red-500' : ''}`}
                    required
                  />
                  {hasValidationError('proposalThreshold') && (
                    <p className="text-xs text-red-500">{getValidationError('proposalThreshold')}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Minimum tokens needed to create a proposal (0 = anyone can propose)
                  </p>
                </div>

                {/* Quorum Percentage */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Quorum (%) * <span className="text-red-500">Required</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    value={config.quorumPercentage ?? 4}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0.1 && value <= 100) {
                        onChange({
                          ...config,
                          quorumPercentage: value
                        });
                      }
                    }}
                    disabled={disabled}
                    placeholder="4"
                    className={hasValidationError('quorumPercentage') ? 'border-red-500' : ''}
                    required
                  />
                  {hasValidationError('quorumPercentage') && (
                    <p className="text-xs text-red-500">{getValidationError('quorumPercentage')}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    % of total supply needed for a valid vote (minimum 0.1%, maximum 100%)
                  </p>
                </div>
              </div>

              {/* Common Values Helper */}
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                <p className="font-medium mb-1">Common values (Ethereum mainnet):</p>
                <ul className="list-disc list-inside pl-2 space-y-0.5">
                  <li>1 day = ~7,200 blocks</li>
                  <li>1 week = ~50,400 blocks</li>
                  <li>Typical delay: 0-7,200 blocks (0-24 hours)</li>
                  <li>Typical period: 50,400-100,800 blocks (1-2 weeks)</li>
                  <li>Typical quorum: 4-10% of total supply</li>
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
                  <li>Wait {config.votingDelay ?? 0} blocks before voting opens (~{((config.votingDelay ?? 0) * 12 / 3600).toFixed(1)} hours)</li>
                  <li>Voting open for {config.votingPeriod ?? 50400} blocks (~{((config.votingPeriod ?? 50400) * 12 / 3600 / 24).toFixed(1)} days)</li>
                  <li>Need {config.quorumPercentage ?? 4}% quorum for valid result</li>
                  {config.delegatesEnabled !== false && (
                    <li>Token holders can delegate votes to representatives</li>
                  )}
                </ol>
              </div>
            </div>
          </Card>

          {/* Validation Summary */}
          {config.votingDelay !== undefined && 
           config.votingPeriod !== undefined && 
           config.proposalThreshold !== undefined && 
           config.quorumPercentage !== undefined && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Configuration Complete:</strong> All required governance parameters are set.
                Token will be ready for governance voting upon deployment.
              </AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Governance parameters will be configured 
              automatically during deployment. These settings can typically be changed later through 
              governance proposals if the token has upgradeability enabled.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
