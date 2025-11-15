/**
 * Compact Constraint Summary
 * A condensed view of redemption constraints for embedding in forms/dashboards
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield,
  Percent,
  Clock,
  Calendar,
  Info,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import type { RedemptionConstraints } from '@/infrastructure/redemption/rules/types';

interface ConstraintSummaryProps {
  constraints: RedemptionConstraints;
  compact?: boolean;
  showIcons?: boolean;
  className?: string;
}

export const ConstraintSummary: React.FC<ConstraintSummaryProps> = ({
  constraints,
  compact = false,
  showIcons = true,
  className = ''
}) => {
  const hasConstraints = 
    constraints.maxRedemptionPercentage !== undefined ||
    constraints.minHoldingPeriod !== undefined ||
    constraints.maxRedemptionsPerPeriod !== undefined;

  if (!hasConstraints) {
    return (
      <Alert className={className}>
        <Info className="h-4 w-4" />
        <AlertDescription>No active constraints</AlertDescription>
      </Alert>
    );
  }

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {constraints.maxRedemptionPercentage !== undefined && (
          <Badge variant="secondary" className="flex items-center gap-1">
            {showIcons && <Percent className="h-3 w-3" />}
            Max {constraints.maxRedemptionPercentage}%
          </Badge>
        )}
        {constraints.minHoldingPeriod !== undefined && (
          <Badge variant="secondary" className="flex items-center gap-1">
            {showIcons && <Clock className="h-3 w-3" />}
            {constraints.minHoldingPeriod}d hold
          </Badge>
        )}
        {constraints.maxRedemptionsPerPeriod !== undefined && (
          <Badge variant="secondary" className="flex items-center gap-1">
            {showIcons && <Calendar className="h-3 w-3" />}
            {constraints.maxRedemptionsPerPeriod}x per {constraints.periodDays || 30}d
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {constraints.maxRedemptionPercentage !== undefined && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            {showIcons && <Percent className="h-4 w-4" />}
            <span>Max Percentage</span>
          </div>
          <Badge variant="secondary">{constraints.maxRedemptionPercentage}%</Badge>
        </div>
      )}
      {constraints.minHoldingPeriod !== undefined && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            {showIcons && <Clock className="h-4 w-4" />}
            <span>Min Holding Period</span>
          </div>
          <Badge variant="secondary">{constraints.minHoldingPeriod} days</Badge>
        </div>
      )}
      {constraints.maxRedemptionsPerPeriod !== undefined && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            {showIcons && <Calendar className="h-4 w-4" />}
            <span>Frequency Limit</span>
          </div>
          <Badge variant="secondary">
            {constraints.maxRedemptionsPerPeriod}x per {constraints.periodDays || 30} days
          </Badge>
        </div>
      )}
    </div>
  );
};

interface ConstraintValidationSummaryProps {
  isValid: boolean;
  violations: Array<{ rule: string; message: string }>;
  warnings: string[];
  compact?: boolean;
  className?: string;
}

export const ConstraintValidationSummary: React.FC<ConstraintValidationSummaryProps> = ({
  isValid,
  violations,
  warnings,
  compact = false,
  className = ''
}) => {
  if (isValid && warnings.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-green-600 text-sm ${className}`}>
        <CheckCircle className="h-4 w-4" />
        <span>All constraints satisfied</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={className}>
        {!isValid && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {violations.length} violation{violations.length !== 1 ? 's' : ''}
          </Badge>
        )}
        {warnings.length > 0 && isValid && (
          <Badge variant="secondary" className="flex items-center gap-1 bg-amber-100 text-amber-800">
            <Info className="h-3 w-3" />
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {!isValid && violations.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">
              {violations.length} Constraint Violation{violations.length !== 1 ? 's' : ''}
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {violations.map((v, idx) => (
                <li key={idx}>
                  <strong>{v.rule}:</strong> {v.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {warnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="font-semibold mb-1">
              {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ConstraintSummary;
