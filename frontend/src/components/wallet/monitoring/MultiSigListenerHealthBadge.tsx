/**
 * Multi-Sig Listener Health Badge Component
 * 
 * PURPOSE:
 * - Display real-time health status of multi-sig event listeners
 * - Show active/inactive counts and total events processed
 * - Alert on errors or inactive listeners
 * 
 * USAGE:
 * ```typescript
 * import { MultiSigListenerHealthBadge } from '@/components/wallet/monitoring';
 * 
 * function Dashboard() {
 *   const { health } = useMultiSigEventListeners(user?.id);
 *   return <MultiSigListenerHealthBadge health={health} />;
 * }
 * ```
 */

import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Activity, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { HealthReport } from '@/services/wallet/multiSig';

// ============================================================================
// COMPONENT
// ============================================================================

interface MultiSigListenerHealthBadgeProps {
  health: HealthReport | null;
  className?: string;
}

export function MultiSigListenerHealthBadge({
  health,
  className
}: MultiSigListenerHealthBadgeProps) {
  if (!health || health.totalListeners === 0) {
    return null; // Don't show if no listeners
  }

  const hasErrors = health.listenersWithErrors > 0;
  const hasInactive = health.inactiveListeners > 0;
  const isHealthy = !hasErrors && !hasInactive && health.activeListeners > 0;

  const badgeVariant = isHealthy ? 'default' : hasErrors ? 'destructive' : 'secondary';
  const Icon = isHealthy ? CheckCircle2 : hasErrors ? XCircle : AlertCircle;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge variant={badgeVariant} className={`cursor-pointer ${className}`}>
          <Activity className="w-3 h-3 mr-1" />
          <span className="text-xs">
            {health.activeListeners} Listeners
          </span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Multi-Sig Event Listeners</h4>
            <Icon className={`w-4 h-4 ${
              isHealthy ? 'text-green-500' : 
              hasErrors ? 'text-red-500' : 
              'text-yellow-500'
            }`} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Active</span>
              <span className="font-medium">{health.activeListeners}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Inactive</span>
              <span className="font-medium">{health.inactiveListeners}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Events</span>
              <span className="font-medium">{health.totalEventsProcessed}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Errors</span>
              <span className="font-medium">{health.listenersWithErrors}</span>
            </div>
          </div>

          {/* Listener Details */}
          {health.details.length > 0 && (
            <div className="border-t pt-2">
              <div className="text-xs text-muted-foreground mb-2">Listener Status</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {health.details.map((listener) => (
                  <div
                    key={listener.walletId}
                    className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${
                        listener.isListening ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span className="font-mono text-[10px] truncate max-w-[120px]">
                        {listener.walletId.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {listener.eventsProcessed} events
                      </span>
                      {listener.errors.length > 0 && (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Details */}
          {hasErrors && (
            <div className="border-t pt-2">
              <div className="text-xs text-muted-foreground mb-1">Recent Errors</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {health.details
                  .filter(l => l.errors.length > 0)
                  .map(listener => (
                    <div key={listener.walletId} className="text-xs text-red-600">
                      {listener.errors[listener.errors.length - 1]}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
