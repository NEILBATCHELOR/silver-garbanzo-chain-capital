import React from 'react';
import { 
  CheckCircle,
  Clock,
  Activity,
  AlertCircle,
  FileText,
  Calendar,
  User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/shared/utils';

// Timeline step types
interface TimelineStep {
  id: string;
  label: string;
  description?: string;
  timestamp?: string;
  status: 'completed' | 'current' | 'pending' | 'cancelled' | 'failed';
  icon?: React.ReactNode;
  details?: string;
  actor?: string; // Who performed the action
}

interface RedemptionRequestTimelineProps {
  steps: TimelineStep[];
  currentStatus?: string;
  vertical?: boolean;
  showIcons?: boolean;
  showTimestamps?: boolean;
  showDetails?: boolean;
  className?: string;
}

// Default timeline steps for redemption process
export const createRedemptionTimeline = (redemption: any): TimelineStep[] => {
  const steps: TimelineStep[] = [
    {
      id: 'submitted',
      label: 'Request Submitted',
      description: 'Redemption request has been submitted for review',
      timestamp: redemption.submittedAt,
      status: 'completed',
      icon: <FileText className="h-4 w-4" />,
      actor: redemption.investorName || 'Investor'
    },
    {
      id: 'validated',
      label: 'Under Review',
      description: 'Request is being reviewed for compliance and eligibility',
      timestamp: redemption.validatedAt,
      status: redemption.validatedAt ? 'completed' : (redemption.status === 'pending' ? 'current' : 'pending'),
      icon: <Clock className="h-4 w-4" />,
      details: 'Compliance and eligibility checks'
    },
    {
      id: 'approved',
      label: 'Approved',
      description: 'Request has been approved and is ready for processing',
      timestamp: redemption.approvedAt,
      status: redemption.approvedAt ? 'completed' : 
              (redemption.status === 'approved' ? 'current' : 
               (redemption.status === 'rejected' ? 'failed' : 'pending')),
      icon: <CheckCircle className="h-4 w-4" />,
      details: redemption.requiredApprovals > 0 ? `${redemption.requiredApprovals} approvals required` : undefined
    },
    {
      id: 'processing',
      label: 'Processing',
      description: 'Tokens are being burned and settlement is in progress',
      timestamp: redemption.executedAt,
      status: redemption.executedAt ? 'completed' : 
              (redemption.status === 'processing' ? 'current' : 'pending'),
      icon: <Activity className="h-4 w-4" />,
      details: 'Token burning and USDC settlement'
    },
    {
      id: 'completed',
      label: 'Completed',
      description: 'Redemption has been completed successfully',
      timestamp: redemption.settledAt,
      status: redemption.settledAt ? 'completed' : 'pending',
      icon: <CheckCircle className="h-4 w-4" />,
      details: redemption.settledAt ? 'USDC transferred to destination wallet' : undefined
    }
  ];

  // Handle rejection
  if (redemption.status === 'rejected') {
    steps.push({
      id: 'rejected',
      label: 'Rejected',
      description: redemption.rejectionReason || 'Request was rejected',
      timestamp: redemption.rejectionTimestamp,
      status: 'failed',
      icon: <AlertCircle className="h-4 w-4" />,
      actor: redemption.rejectedBy,
      details: redemption.rejectionReason
    });
  }

  return steps;
};

export const RedemptionRequestTimeline: React.FC<RedemptionRequestTimelineProps> = ({
  steps,
  currentStatus,
  vertical = true,
  showIcons = true,
  showTimestamps = true,
  showDetails = false,
  className
}) => {
  const getStatusColor = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'current':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'pending':
        return 'text-gray-400 bg-gray-50 border-gray-200';
      case 'cancelled':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'failed':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-400 bg-gray-50 border-gray-200';
    }
  };

  const getConnectorColor = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-300';
      case 'current':
        return 'border-blue-300';
      case 'failed':
        return 'border-red-300';
      default:
        return 'border-gray-200';
    }
  };

  if (vertical) {
    return (
      <div className={cn("relative", className)}>
        {steps.map((step, index) => (
          <div key={step.id} className="relative pb-8 last:pb-0">
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  "absolute top-6 left-4 w-0.5 h-full border-l-2",
                  getConnectorColor(step.status)
                )}
              />
            )}
            
            <div className="relative flex items-start">
              {/* Icon/Status indicator */}
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2",
                getStatusColor(step.status)
              )}>
                {showIcons && step.icon ? (
                  step.icon
                ) : (
                  <div className="w-2 h-2 rounded-full bg-current" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 ml-4 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    {step.label}
                  </h4>
                  {showTimestamps && step.timestamp && (
                    <time className="text-xs text-gray-500">
                      {new Date(step.timestamp).toLocaleDateString()} {new Date(step.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </time>
                  )}
                </div>
                
                {step.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {step.description}
                  </p>
                )}
                
                {step.actor && (
                  <div className="flex items-center gap-1 mt-1">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{step.actor}</span>
                  </div>
                )}
                
                {showDetails && step.details && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {step.details}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Horizontal timeline
  return (
    <div className={cn("flex items-center space-x-4 overflow-x-auto pb-2", className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center space-x-4 flex-shrink-0">
          <div className="flex flex-col items-center space-y-2">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full border-2",
              getStatusColor(step.status)
            )}>
              {showIcons && step.icon ? (
                step.icon
              ) : (
                <div className="w-2 h-2 rounded-full bg-current" />
              )}
            </div>
            
            <div className="text-center">
              <div className="text-xs font-medium text-gray-900">
                {step.label}
              </div>
              {showTimestamps && step.timestamp && (
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(step.timestamp).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div className={cn(
              "flex-1 h-0.5 border-t-2 min-w-12",
              getConnectorColor(steps[index + 1].status)
            )} />
          )}
        </div>
      ))}
    </div>
  );
};

export default RedemptionRequestTimeline;