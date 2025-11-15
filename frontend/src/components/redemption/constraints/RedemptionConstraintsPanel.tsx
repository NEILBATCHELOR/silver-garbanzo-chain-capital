/**
 * Redemption Constraints Panel
 * Displays redemption constraints (percentage limits, holding periods, frequency limits)
 * Integrates with Stage 9 RedemptionConstraints infrastructure
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Shield,
  Percent,
  Clock,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign,
  Lock
} from 'lucide-react';
import { useRedemptionConstraints } from '@/infrastructure/redemption/rules/hooks';
import type { RedemptionConstraints, ConstraintValidation } from '@/infrastructure/redemption/rules/types';

interface ConstraintsPanelProps {
  tokenId: string;
  currentAmount?: bigint;
  showValidation?: boolean;
  className?: string;
}

export const RedemptionConstraintsPanel: React.FC<ConstraintsPanelProps> = ({
  tokenId,
  currentAmount,
  showValidation = true,
  className
}) => {
  const [constraints, setConstraints] = useState<RedemptionConstraints | null>(null);
  const [validation, setValidation] = useState<ConstraintValidation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getConstraints, validateConstraint } = useRedemptionConstraints();

  useEffect(() => {
    loadConstraints();
  }, [tokenId]);

  useEffect(() => {
    if (constraints && currentAmount && showValidation) {
      validateCurrentAmount();
    }
  }, [constraints, currentAmount, showValidation]);

  const loadConstraints = async () => {
    setIsLoading(true);
    try {
      const result = await getConstraints(tokenId);
      setConstraints(result);
    } catch (error) {
      console.error('Error loading constraints:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateCurrentAmount = async () => {
    if (!constraints || !currentAmount) return;

    try {
      // Create mock request for validation
      const mockRequest = {
        id: 'validation',
        investorId: 'test',
        tokenId,
        tokenAddress: '', // Add empty tokenAddress for validation purposes
        amount: currentAmount,
        targetCurrency: 'USDC' as const,
        requestedAt: new Date().toISOString(),
        status: 'draft' as const,
        metadata: {
          investorWallet: '',
          projectWallet: '',
          currentBalance: '0',
          availableBalance: '0',
          lockStatus: {
            isLocked: false,
            lockedAmount: 0n,
            unlockDate: null
          },
          complianceChecks: [],
          priorityLevel: 'standard' as const
        }
      };

      const result = await validateConstraint(mockRequest, 'percentage');
      setValidation(result);
    } catch (error) {
      console.error('Error validating amount:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Redemption Constraints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!constraints) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Redemption Constraints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No constraints configured for this token. Default constraints will apply.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          Redemption Constraints
        </CardTitle>
        <CardDescription>
          Active limits and requirements for token redemption
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Alert */}
        {showValidation && validation && !validation.valid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Constraint Violation:</strong> {validation.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Percentage Limit */}
        {constraints.maxRedemptionPercentage !== undefined && (
          <PercentageLimitDisplay
            maxPercentage={constraints.maxRedemptionPercentage}
            currentPercentage={validation?.metadata?.percentage as number}
            validation={validation}
          />
        )}

        <Separator />

        {/* Holding Period */}
        {constraints.minHoldingPeriod !== undefined && (
          <HoldingPeriodDisplay
            minDays={constraints.minHoldingPeriod}
            currentDays={validation?.metadata?.holdingDays as number}
          />
        )}

        <Separator />

        {/* Frequency Limit */}
        {constraints.maxRedemptionsPerPeriod !== undefined && (
          <FrequencyLimitDisplay
            maxRedemptions={constraints.maxRedemptionsPerPeriod}
            periodDays={constraints.periodDays || 30}
            currentCount={validation?.metadata?.redemptionCount as number}
          />
        )}

        <Separator />

        {/* Amount Limits */}
        {(constraints.minRedemptionAmount !== undefined || constraints.maxRedemptionAmount !== undefined) && (
          <AmountLimitsDisplay
            minAmount={constraints.minRedemptionAmount}
            maxAmount={constraints.maxRedemptionAmount}
            currentAmount={currentAmount}
          />
        )}

        {/* Lockup Period */}
        {constraints.minHoldingPeriod !== undefined && (
          <>
            <Separator />
            <LockupPeriodDisplay lockupDays={constraints.minHoldingPeriod} />
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Individual Constraint Display Components
// ============================================================================

interface PercentageLimitDisplayProps {
  maxPercentage: number;
  currentPercentage?: number;
  validation?: ConstraintValidation | null;
}

const PercentageLimitDisplay: React.FC<PercentageLimitDisplayProps> = ({
  maxPercentage,
  currentPercentage,
  validation
}) => {
  const percentage = currentPercentage || 0;
  const isOverLimit = percentage > maxPercentage;
  const progressValue = Math.min((percentage / maxPercentage) * 100, 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-50">
            <Percent className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-sm">Maximum Redemption Percentage</div>
            <div className="text-xs text-gray-500">Per redemption window</div>
          </div>
        </div>
        <Badge variant={isOverLimit ? "destructive" : "default"}>
          {maxPercentage}%
        </Badge>
      </div>

      {currentPercentage !== undefined && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Current Request</span>
            <span className={`font-medium ${isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
              {percentage.toFixed(2)}%
            </span>
          </div>
          <Progress 
            value={progressValue} 
            className={`h-2 ${isOverLimit ? 'bg-red-100' : 'bg-green-100'}`}
          />
          {isOverLimit && (
            <div className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Exceeds maximum allowed percentage
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
        <Info className="h-3 w-3 inline mr-1" />
        This limit prevents any single redemption from exceeding {maxPercentage}% of total supply.
      </div>
    </div>
  );
};

interface HoldingPeriodDisplayProps {
  minDays: number;
  currentDays?: number;
}

const HoldingPeriodDisplay: React.FC<HoldingPeriodDisplayProps> = ({
  minDays,
  currentDays
}) => {
  const meetsRequirement = currentDays !== undefined && currentDays >= minDays;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-sm">Minimum Holding Period</div>
            <div className="text-xs text-gray-500">Required before redemption</div>
          </div>
        </div>
        <Badge variant="secondary">
          {minDays} days
        </Badge>
      </div>

      {currentDays !== undefined && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Your Holding Period</span>
            <span className={`font-medium ${meetsRequirement ? 'text-green-600' : 'text-amber-600'}`}>
              {currentDays} days
            </span>
          </div>
          <div className="flex items-center gap-2">
            {meetsRequirement ? (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Meets holding period requirement
              </div>
            ) : (
              <div className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {minDays - currentDays} days remaining
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
        <Info className="h-3 w-3 inline mr-1" />
        Tokens must be held for at least {minDays} days before they can be redeemed.
      </div>
    </div>
  );
};

interface FrequencyLimitDisplayProps {
  maxRedemptions: number;
  periodDays: number;
  currentCount?: number;
}

const FrequencyLimitDisplay: React.FC<FrequencyLimitDisplayProps> = ({
  maxRedemptions,
  periodDays,
  currentCount
}) => {
  const count = currentCount || 0;
  const isAtLimit = count >= maxRedemptions;
  const remaining = Math.max(0, maxRedemptions - count);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-50">
            <Calendar className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <div className="font-medium text-sm">Redemption Frequency Limit</div>
            <div className="text-xs text-gray-500">Per {periodDays}-day period</div>
          </div>
        </div>
        <Badge variant={isAtLimit ? "destructive" : "secondary"}>
          {maxRedemptions} max
        </Badge>
      </div>

      {currentCount !== undefined && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Redemptions Used</span>
            <span className={`font-medium ${isAtLimit ? 'text-red-600' : 'text-green-600'}`}>
              {count} / {maxRedemptions}
            </span>
          </div>
          <Progress 
            value={(count / maxRedemptions) * 100} 
            className="h-2"
          />
          {isAtLimit ? (
            <div className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Frequency limit reached
            </div>
          ) : (
            <div className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {remaining} redemption{remaining !== 1 ? 's' : ''} remaining
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
        <Info className="h-3 w-3 inline mr-1" />
        Maximum of {maxRedemptions} redemption{maxRedemptions !== 1 ? 's' : ''} allowed per {periodDays}-day rolling period.
      </div>
    </div>
  );
};

interface AmountLimitsDisplayProps {
  minAmount?: bigint;
  maxAmount?: bigint;
  currentAmount?: bigint;
}

const AmountLimitsDisplay: React.FC<AmountLimitsDisplayProps> = ({
  minAmount,
  maxAmount,
  currentAmount
}) => {
  const formatAmount = (amount: bigint) => {
    return (Number(amount) / 1e18).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const current = currentAmount ? Number(currentAmount) : 0;
  const min = minAmount ? Number(minAmount) : 0;
  const max = maxAmount ? Number(maxAmount) : Number.MAX_SAFE_INTEGER;

  const isBelowMin = minAmount !== undefined && current > 0 && current < min;
  const isAboveMax = maxAmount !== undefined && current > max;
  const isValid = !isBelowMin && !isAboveMax;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-amber-50">
          <DollarSign className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <div className="font-medium text-sm">Amount Limits</div>
          <div className="text-xs text-gray-500">Minimum and maximum redemption amounts</div>
        </div>
      </div>

      <div className="space-y-2">
        {minAmount !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Minimum</span>
            <span className="font-medium">{formatAmount(minAmount)} tokens</span>
          </div>
        )}
        
        {maxAmount !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Maximum</span>
            <span className="font-medium">{formatAmount(maxAmount)} tokens</span>
          </div>
        )}

        {currentAmount !== undefined && currentAmount > 0n && (
          <>
            <Separator className="my-2" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Your Request</span>
              <span className={`font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(currentAmount)} tokens
              </span>
            </div>
            {isBelowMin && (
              <div className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Below minimum amount
              </div>
            )}
            {isAboveMax && (
              <div className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Exceeds maximum amount
              </div>
            )}
            {isValid && (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Within allowed limits
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface LockupPeriodDisplayProps {
  lockupDays: number;
}

const LockupPeriodDisplay: React.FC<LockupPeriodDisplayProps> = ({
  lockupDays
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-50">
            <Lock className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <div className="font-medium text-sm">Lockup Period</div>
            <div className="text-xs text-gray-500">Tokens locked after purchase</div>
          </div>
        </div>
        <Badge variant="destructive">
          {lockupDays} days
        </Badge>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
        <Info className="h-3 w-3 inline mr-1" />
        New token purchases are locked for {lockupDays} days before they become eligible for redemption.
      </div>
    </div>
  );
};

export default RedemptionConstraintsPanel;
