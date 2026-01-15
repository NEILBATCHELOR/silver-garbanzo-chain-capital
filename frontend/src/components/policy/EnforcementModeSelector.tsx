/**
 * EnforcementModeSelector.tsx
 * UI component for selecting policy enforcement mode
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Layers, CloudCog, Lock, Zap } from 'lucide-react';
import type { EnforcementMode } from '@/infrastructure/policy/HybridPolicyEngine';

interface EnforcementModeSelectorProps {
  value: EnforcementMode;
  onChange: (mode: EnforcementMode) => void;
  className?: string;
}

export function EnforcementModeSelector({
  value,
  onChange,
  className
}: EnforcementModeSelectorProps) {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-lg">Policy Enforcement Mode</h3>
      </div>
      
      <RadioGroup value={value} onValueChange={(v) => onChange(v as EnforcementMode)}>
        <div className="space-y-3">
          {/* Off-Chain Only */}
          <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <RadioGroupItem value="off-chain-only" id="off-chain" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-600" />
                <Label htmlFor="off-chain" className="font-medium cursor-pointer">
                  Off-Chain Only (Fast)
                </Label>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Fastest validation. All 15 rules supported. No gas costs. Best for high-frequency operations.
              </p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  ~50ms
                </span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  No gas fees
                </span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  15/15 rules
                </span>
              </div>
            </div>
          </div>

          {/* Smart Contract Only */}
          <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <RadioGroupItem value="smart-contract-only" id="smart-contract" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                <Label htmlFor="smart-contract" className="font-medium cursor-pointer">
                  Smart Contract Only (Secure)
                </Label>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                On-chain enforcement. Immutable audit trail. 5 rules supported. Transparent validation.
              </p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  ~2-5s
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Gas fees apply
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  5/15 rules
                </span>
              </div>
            </div>
          </div>

          {/* Oracle Only */}
          <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <RadioGroupItem value="oracle-only" id="oracle" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CloudCog className="h-4 w-4 text-purple-600" />
                <Label htmlFor="oracle" className="font-medium cursor-pointer">
                  Oracle Only (Compliance)
                </Label>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time KYC, AML, and accreditation checks. Compliance-focused validation. Oracle fees apply.
              </p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  ~500ms
                </span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  Oracle fees
                </span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  4/15 rules
                </span>
              </div>
            </div>
          </div>

          {/* Hybrid - All Layers */}
          <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <RadioGroupItem value="hybrid-all" id="hybrid-all" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-orange-600" />
                <Label htmlFor="hybrid-all" className="font-medium cursor-pointer">
                  Hybrid - All Layers (Maximum Security)
                </Label>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Validate across ALL enforcement layers. Most secure option. Higher costs and latency.
              </p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                  ~3-6s
                </span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                  All fees
                </span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                  Multi-layer
                </span>
              </div>
            </div>
          </div>

          {/* Hybrid - Critical Only */}
          <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border-2 border-blue-200">
            <RadioGroupItem value="hybrid-critical" id="hybrid-critical" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <Label htmlFor="hybrid-critical" className="font-medium cursor-pointer">
                  Hybrid - Critical Only (Recommended)
                </Label>
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded ml-auto">
                  RECOMMENDED
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Multi-layer for critical operations (mint, burn, large amounts). Off-chain for routine ops. Best balance of security and performance.
              </p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Adaptive
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Optimal costs
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  15/15 rules
                </span>
              </div>
            </div>
          </div>
        </div>
      </RadioGroup>

      {/* Info footer */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Current Mode:</strong> {getModeDescription(value)}
        </p>
      </div>
    </Card>
  );
}

function getModeDescription(mode: EnforcementMode): string {
  switch (mode) {
    case 'off-chain-only':
      return 'Fast off-chain validation with complete rule coverage';
    case 'smart-contract-only':
      return 'On-chain validation with immutable audit trail';
    case 'oracle-only':
      return 'Compliance-focused validation with real-time data';
    case 'hybrid-all':
      return 'All layers validate every operation';
    case 'hybrid-critical':
      return 'Adaptive security based on operation criticality';
    default:
      return mode;
  }
}
