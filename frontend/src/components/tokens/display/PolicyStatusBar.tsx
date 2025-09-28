/**
 * Policy Status Bar Component
 * Shows real-time policy status and compliance information
 */

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';
import { cn } from '@/utils/utils';

interface PolicyMetrics {
  activePolicies: number;
  complianceScore: number;
  recentViolations: number;
  pendingApprovals: number;
  lastUpdated: string;
}

interface PolicyStatusBarProps {
  tokenId?: string;
  className?: string;
  compact?: boolean;
}

export const PolicyStatusBar: React.FC<PolicyStatusBarProps> = ({
  tokenId,
  className,
  compact = false
}) => {
  const [metrics, setMetrics] = useState<PolicyMetrics>({
    activePolicies: 0,
    complianceScore: 100,
    recentViolations: 0,
    pendingApprovals: 0,
    lastUpdated: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);
  const { supabase } = useSupabase();

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [tokenId]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      // Load active policies
      const { data: policies } = await supabase
        .from('rules')
        .select('rule_id')
        .eq('status', 'active')
        .eq('rule_type', 'policy');
      
      // Load recent violations (last 24 hours)
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const { data: violations } = await supabase
        .from('policy_violations')
        .select('id')
        .gte('created_at', yesterday)
        .eq('resolved', false);
      
      // Load pending approvals
      const { data: approvals } = await supabase
        .from('approval_requests')
        .select('id')
        .eq('status', 'pending');
      
      // Calculate compliance score (simplified)
      const totalOperations = 100; // This would come from actual data
      const violationCount = violations?.length || 0;
      const complianceScore = Math.max(0, Math.min(100, 
        Math.round(((totalOperations - violationCount) / totalOperations) * 100)
      ));
      
      setMetrics({
        activePolicies: policies?.length || 0,
        complianceScore,
        recentViolations: violationCount,
        pendingApprovals: approvals?.length || 0,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to load policy metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-4 w-4" />;
    if (score >= 70) return <AlertTriangle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-4 p-2 border rounded-lg bg-background", className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{metrics.activePolicies}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Active Policies</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger>
              <div className={cn("flex items-center gap-2", getComplianceColor(metrics.complianceScore))}>
                {getComplianceIcon(metrics.complianceScore)}
                <span className="text-sm font-medium">{metrics.complianceScore}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Compliance Score</TooltipContent>
          </Tooltip>

          {metrics.recentViolations > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="destructive" className="text-xs">
                  {metrics.recentViolations} violations
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Recent Policy Violations (24h)</TooltipContent>
            </Tooltip>
          )}

          {metrics.pendingApprovals > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="text-xs">
                  {metrics.pendingApprovals} pending
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Pending Approvals</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Policy Status
        </h3>
        <span className="text-xs text-muted-foreground">
          Updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Policies */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Active Policies</span>
            <Info className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{metrics.activePolicies}</div>
          <Badge variant="outline" className="text-xs">
            Enforced
          </Badge>
        </div>

        {/* Compliance Score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Compliance</span>
            {metrics.complianceScore >= 90 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
          </div>
          <div className={cn("text-2xl font-bold flex items-center gap-2", getComplianceColor(metrics.complianceScore))}>
            {metrics.complianceScore}%
            {getComplianceIcon(metrics.complianceScore)}
          </div>
          <Progress value={metrics.complianceScore} className="h-1" />
        </div>

        {/* Recent Violations */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Violations (24h)</span>
            <AlertTriangle className="h-3 w-3 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold">
            {metrics.recentViolations}
          </div>
          {metrics.recentViolations > 0 ? (
            <Badge variant="destructive" className="text-xs">
              Action Required
            </Badge>
          ) : (
            <Badge variant="success" className="text-xs">
              Clear
            </Badge>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Pending</span>
            <Info className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {metrics.pendingApprovals}
          </div>
          {metrics.pendingApprovals > 0 ? (
            <Badge variant="secondary" className="text-xs">
              Awaiting Review
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              None
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t flex gap-2">
        <button 
          className="text-xs text-primary hover:underline"
          onClick={() => window.location.href = '/rules'}
        >
          View Policies
        </button>
        <span className="text-xs text-muted-foreground">•</span>
        <button 
          className="text-xs text-primary hover:underline"
          onClick={() => window.location.href = '/compliance'}
        >
          Compliance Report
        </button>
        {metrics.recentViolations > 0 && (
          <>
            <span className="text-xs text-muted-foreground">•</span>
            <button 
              className="text-xs text-destructive hover:underline"
              onClick={() => window.location.href = '/violations'}
            >
              Review Violations
            </button>
          </>
        )}
      </div>
    </Card>
  );
};
