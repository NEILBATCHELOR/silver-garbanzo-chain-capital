/**
 * Grace Period Countdown Component
 * Shows real-time countdown for margin calls before liquidation
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useUserMarginCalls, useResolveMarginCall } from '@/hooks/trade-finance';
import { cn } from '@/utils/utils';
import { formatEther } from 'viem';

interface GracePeriodCountdownProps {
  className?: string;
  onAddCollateral?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function GracePeriodCountdown({ className, onAddCollateral }: GracePeriodCountdownProps) {
  const { data: marginCalls, isLoading } = useUserMarginCalls();
  const [timeRemaining, setTimeRemaining] = useState<Record<string, TimeRemaining>>({});

  // Calculate time remaining for each margin call
  useEffect(() => {
    if (!marginCalls || marginCalls.length === 0) return;

    const calculateTimeRemaining = (endDate: string): TimeRemaining => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const difference = end - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        total: difference,
      };
    };

    const updateTimers = () => {
      const newTimeRemaining: Record<string, TimeRemaining> = {};
      marginCalls
        .filter(call => call.status === 'ACTIVE')
        .forEach(call => {
          newTimeRemaining[call.id] = calculateTimeRemaining(call.grace_period_end);
        });
      setTimeRemaining(newTimeRemaining);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);

    return () => clearInterval(interval);
  }, [marginCalls]);

  if (isLoading) {
    return null;
  }

  const activeMarginCalls = marginCalls?.filter(call => call.status === 'ACTIVE') || [];

  if (activeMarginCalls.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {activeMarginCalls.map(call => {
        const time = timeRemaining[call.id];
        if (!time) return null;

        const totalGracePeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const percentageRemaining = (time.total / totalGracePeriod) * 100;
        
        const urgency = 
          percentageRemaining < 10 ? 'critical' :
          percentageRemaining < 25 ? 'high' :
          'medium';

        const expired = time.total <= 0;

        return (
          <Card key={call.id} className={cn(
            'border-2',
            expired && 'border-destructive',
            urgency === 'critical' && !expired && 'border-destructive/50',
            urgency === 'high' && 'border-orange-500/50',
            urgency === 'medium' && 'border-yellow-500/50'
          )}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className={cn(
                    'h-5 w-5',
                    expired && 'text-destructive animate-pulse',
                    urgency === 'critical' && !expired && 'text-destructive',
                    urgency === 'high' && 'text-orange-500',
                    urgency === 'medium' && 'text-yellow-500'
                  )} />
                  {expired ? 'Grace Period Expired' : 'Grace Period Active'}
                </CardTitle>
                <Badge
                  variant={
                    expired ? 'destructive' :
                    urgency === 'critical' ? 'destructive' :
                    urgency === 'high' ? 'secondary' :
                    'default'
                  }
                >
                  {expired ? 'EXPIRED' : urgency.toUpperCase()}
                </Badge>
              </div>
              <CardDescription>
                Health Factor: {call.health_factor.toFixed(3)} | 
                Required Collateral: {formatEther(BigInt(call.required_collateral))}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!expired ? (
                <>
                  {/* Alert */}
                  <Alert variant={urgency === 'critical' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>
                      {urgency === 'critical' ? 'URGENT: Immediate Action Required' :
                       urgency === 'high' ? 'Action Required Soon' :
                       'Add Collateral to Avoid Liquidation'}
                    </AlertTitle>
                    <AlertDescription>
                      You have {time.total > 3600000 ? `${time.days}d ${time.hours}h` : 
                                time.total > 60000 ? `${time.hours}h ${time.minutes}m` :
                                `${time.minutes}m ${time.seconds}s`} to add collateral before your position may be liquidated.
                    </AlertDescription>
                  </Alert>

                  {/* Countdown Display */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-lg bg-secondary">
                      <div className={cn(
                        'text-3xl font-bold',
                        urgency === 'critical' && 'text-destructive'
                      )}>
                        {time.days}
                      </div>
                      <div className="text-xs text-muted-foreground">Days</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary">
                      <div className={cn(
                        'text-3xl font-bold',
                        urgency === 'critical' && 'text-destructive'
                      )}>
                        {time.hours}
                      </div>
                      <div className="text-xs text-muted-foreground">Hours</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary">
                      <div className={cn(
                        'text-3xl font-bold',
                        urgency === 'critical' && 'text-destructive'
                      )}>
                        {time.minutes}
                      </div>
                      <div className="text-xs text-muted-foreground">Minutes</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary">
                      <div className={cn(
                        'text-3xl font-bold',
                        urgency === 'critical' && 'text-destructive animate-pulse'
                      )}>
                        {time.seconds}
                      </div>
                      <div className="text-xs text-muted-foreground">Seconds</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time Remaining</span>
                      <span className={cn(
                        'font-medium',
                        urgency === 'critical' && 'text-destructive'
                      )}>
                        {percentageRemaining.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={percentageRemaining} 
                      className={cn(
                        'h-3',
                        urgency === 'critical' && '[&>div]:bg-destructive'
                      )}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={onAddCollateral}
                      className="flex-1"
                      variant={urgency === 'critical' ? 'destructive' : 'default'}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Add Collateral Now
                    </Button>
                    <Button variant="outline" className="flex-1">
                      View Options
                    </Button>
                  </div>
                </>
              ) : (
                /* Expired State */
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Grace Period Has Expired</AlertTitle>
                  <AlertDescription>
                    Your position is now eligible for liquidation. Liquidators may execute liquidation at any time.
                    Add collateral immediately to restore your health factor.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
