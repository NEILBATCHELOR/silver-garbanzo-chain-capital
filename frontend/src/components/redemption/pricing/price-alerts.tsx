/**
 * Price Alert Components
 * 
 * Alert components for price-related issues:
 * - PriceDeviationAlert: Warns when price deviates excessively
 * - StaleDataWarning: Alerts when exchange rate data is stale
 * 
 * @priority Low (Future)
 * @usage Dashboard, admin notifications, redemption flow
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, RefreshCw, AlertCircle, X } from 'lucide-react';
import { cn } from '@/utils/utils';

// ============================================================================
// PRICE DEVIATION ALERT
// ============================================================================

interface PriceDeviationAlertProps {
  tokenId: string;
  sources: Array<{
    provider: string;
    rate: number;
  }>;
  threshold: number;
  deviation: number;
  onAcknowledge?: () => void;
  onManualReview?: () => void;
  className?: string;
}

export function PriceDeviationAlert({
  tokenId,
  sources,
  threshold,
  deviation,
  onAcknowledge,
  onManualReview,
  className
}: PriceDeviationAlertProps) {
  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(rate);
  };

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>Price Deviation Detected</span>
        <Badge variant="destructive" className="ml-2">
          {deviation.toFixed(1)}% deviation
        </Badge>
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          Exchange rate sources are reporting conflicting prices exceeding the
          {threshold}% deviation threshold. Manual review recommended.
        </p>

        {/* Source Comparison */}
        <div className="mt-3 space-y-2">
          <div className="text-sm font-medium">Conflicting Sources:</div>
          <div className="space-y-1">
            {sources.map((source, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm bg-destructive/10 px-3 py-2 rounded"
              >
                <span className="font-medium capitalize">{source.provider}</span>
                <span className="font-mono">{formatRate(source.rate)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          {onManualReview && (
            <Button
              variant="default"
              size="sm"
              onClick={onManualReview}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Manual Review
            </Button>
          )}
          {onAcknowledge && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAcknowledge}
            >
              Acknowledge
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// STALE DATA WARNING
// ============================================================================

interface StaleDataWarningProps {
  tokenId: string;
  lastUpdate: string;
  staleThreshold: number; // in minutes
  onRetry?: () => Promise<void>;
  onUseManualRate?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function StaleDataWarning({
  tokenId,
  lastUpdate,
  staleThreshold,
  onRetry,
  onUseManualRate,
  onDismiss,
  className
}: StaleDataWarningProps) {
  const [retrying, setRetrying] = React.useState(false);

  const calculateAge = () => {
    const now = Date.now();
    const then = new Date(lastUpdate).getTime();
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    return minutes;
  };

  const formatLastUpdate = () => {
    const age = calculateAge();
    if (age < 60) return `${age} minutes ago`;
    const hours = Math.floor(age / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const age = calculateAge();
  const severity = age > staleThreshold * 2 ? 'destructive' : 'default';

  return (
    <Alert variant={severity} className={className}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Clock className="h-4 w-4 mt-0.5" />
          <div className="space-y-2 flex-1">
            <AlertTitle className="flex items-center gap-2">
              Stale Exchange Rate Data
              <Badge variant={severity === 'destructive' ? 'destructive' : 'secondary'}>
                {formatLastUpdate()}
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <p className="mb-3">
                Exchange rate was last updated {formatLastUpdate()}. The data may be
                outdated and could affect redemption accuracy.
              </p>

              {/* Metadata */}
              <div className="text-xs text-muted-foreground mb-3">
                <div>Token ID: {tokenId}</div>
                <div>Stale Threshold: {staleThreshold} minutes</div>
                <div>Current Age: {age} minutes</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {onRetry && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleRetry}
                    disabled={retrying}
                  >
                    {retrying ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry Update
                      </>
                    )}
                  </Button>
                )}
                {onUseManualRate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onUseManualRate}
                  >
                    Use Manual Rate
                  </Button>
                )}
              </div>
            </AlertDescription>
          </div>
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}

// ============================================================================
// COMBINED PRICE HEALTH ALERT
// ============================================================================

interface PriceHealthStatus {
  isHealthy: boolean;
  hasDeviation: boolean;
  isStale: boolean;
  deviationDetails?: {
    sources: Array<{ provider: string; rate: number }>;
    threshold: number;
    deviation: number;
  };
  staleDetails?: {
    lastUpdate: string;
    age: number;
    threshold: number;
  };
}

interface PriceHealthAlertProps {
  tokenId: string;
  status: PriceHealthStatus;
  onResolve?: () => void;
  className?: string;
}

export function PriceHealthAlert({
  tokenId,
  status,
  onResolve,
  className
}: PriceHealthAlertProps) {
  if (status.isHealthy) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {status.hasDeviation && status.deviationDetails && (
        <PriceDeviationAlert
          tokenId={tokenId}
          sources={status.deviationDetails.sources}
          threshold={status.deviationDetails.threshold}
          deviation={status.deviationDetails.deviation}
          onAcknowledge={onResolve}
        />
      )}

      {status.isStale && status.staleDetails && (
        <StaleDataWarning
          tokenId={tokenId}
          lastUpdate={status.staleDetails.lastUpdate}
          staleThreshold={status.staleDetails.threshold}
          onDismiss={onResolve}
        />
      )}
    </div>
  );
}

// ============================================================================
// PRICE ALERT BANNER (Compact)
// ============================================================================

interface PriceAlertBannerProps {
  type: 'deviation' | 'stale' | 'error';
  message: string;
  severity?: 'warning' | 'error';
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function PriceAlertBanner({
  type,
  message,
  severity = 'warning',
  onAction,
  actionLabel = 'Resolve',
  className
}: PriceAlertBannerProps) {
  const icons = {
    deviation: AlertTriangle,
    stale: Clock,
    error: AlertCircle
  };

  const Icon = icons[type];

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 border rounded-lg',
        severity === 'error'
          ? 'bg-destructive/10 border-destructive text-destructive'
          : 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onAction && (
        <Button
          variant={severity === 'error' ? 'destructive' : 'default'}
          size="sm"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
