/**
 * Audit System Information Component
 * Centralized component for audit system coverage and compliance information
 * Moved from ComprehensiveAuditPage.tsx for reusability
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Activity, 
  Shield, 
  Info 
} from 'lucide-react';

interface AuditSystemInfoProps {
  variant?: 'header' | 'footer' | 'card';
  showDescription?: boolean;
  showCoverage?: boolean;
  showCompliance?: boolean;
  className?: string;
}

export function AuditSystemInfo({ 
  variant = 'header',
  showDescription = true,
  showCoverage = true,
  showCompliance = true,
  className = '' 
}: AuditSystemInfoProps) {

  if (variant === 'header') {
    return (
      <div className={className}>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Comprehensive Audit System</h1>
          <Badge variant="secondary" className="text-xs">
            v2.0
          </Badge>
        </div>
        
        {showDescription && (
          <p className="text-lg text-muted-foreground mb-4">
            Complete audit visibility with &gt;95% platform coverage across all layers
          </p>
        )}
        
        {showCoverage && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-700 dark:text-green-400">Frontend Events (100%)</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-700 dark:text-green-400">API Requests (100%)</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-700 dark:text-green-400">Service Operations (100%)</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-700 dark:text-green-400">System Processes (100%)</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-blue-700 dark:text-blue-400">Real-time Monitoring</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`border-t bg-muted/20 ${className}`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span>Comprehensive Audit System v2.0</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>&gt;95% Platform Coverage</span>
              </div>
              {showCompliance && (
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>SOX, GDPR, PCI DSS, ISO 27001 Compliant</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Real-time Monitoring
              </Badge>
              <Badge variant="outline" className="text-xs">
                Auto-refresh: 30s
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`rounded-lg border bg-card text-card-foreground shadow-sm p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Comprehensive Audit System v2.0</h3>
            <p className="text-sm text-muted-foreground">
              Complete audit visibility with &gt;95% platform coverage across all layers
            </p>
          </div>
        </div>
        
        {showCoverage && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Frontend Events (100%)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>API Requests (100%)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Service Operations (100%)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>System Processes (100%)</span>
            </div>
          </div>
        )}
        
        {showCompliance && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>SOX, GDPR, PCI DSS, ISO 27001 Compliant</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default AuditSystemInfo;