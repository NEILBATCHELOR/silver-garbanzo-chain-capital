import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Workflow, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Clock,
  CheckSquare,
  XCircle,
  Activity,
  Zap,
  Coins,
  Rocket,
  Pause,
  Package,
  ArrowRight,
  Info,
  User,
  Calendar
} from "lucide-react";
import { TokenStatus } from '@/types/core/centralModels';
import { UnifiedTokenData } from '../utils/token-display-utils';
import { 
  getStatusWorkflowInfo, 
  updateTokenStatus, 
  STATUS_DISPLAY_NAMES, 
  STATUS_DESCRIPTIONS 
} from '../../services/tokenStatusService';
import { format } from 'date-fns';

interface StatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: UnifiedTokenData;
  onStatusUpdate?: (updatedToken: UnifiedTokenData) => void;
}
const StatusTransitionDialog: React.FC<StatusTransitionDialogProps> = ({
  open,
  onOpenChange,
  token,
  onStatusUpdate
}) => {
  const [selectedStatus, setSelectedStatus] = useState<TokenStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get workflow information
  const workflowInfo = getStatusWorkflowInfo(token);

  // Get appropriate icon for each status (no emojis)
  const getStatusIcon = (status: TokenStatus) => {
    const iconProps = { className: "h-4 w-4" };
    
    switch (status) {
      case TokenStatus.DRAFT:
        return <FileText {...iconProps} className="h-4 w-4 text-gray-500" />;
      case TokenStatus.REVIEW:
      case TokenStatus.UNDER_REVIEW:
        return <Clock {...iconProps} className="h-4 w-4 text-yellow-500" />;
      case TokenStatus.APPROVED:
        return <CheckSquare {...iconProps} className="h-4 w-4 text-green-500" />;
      case TokenStatus.REJECTED:
        return <XCircle {...iconProps} className="h-4 w-4 text-red-500" />;
      case TokenStatus.READY_TO_MINT:
        return <Zap {...iconProps} className="h-4 w-4 text-orange-500" />;
      case TokenStatus.MINTED:
        return <Coins {...iconProps} className="h-4 w-4 text-blue-500" />;
      case TokenStatus.DEPLOYED:
        return <Rocket {...iconProps} className="h-4 w-4 text-purple-500" />;
      case TokenStatus.PAUSED:
        return <Pause {...iconProps} className="h-4 w-4 text-amber-500" />;
      case TokenStatus.DISTRIBUTED:
        return <Package {...iconProps} className="h-4 w-4 text-teal-500" />;
      default:
        return <Activity {...iconProps} className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get status color for badges
  const getStatusColor = (status: TokenStatus): string => {
    switch (status) {
      case TokenStatus.DRAFT:
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case TokenStatus.REVIEW:
      case TokenStatus.UNDER_REVIEW:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case TokenStatus.APPROVED:
        return 'bg-green-100 text-green-700 border-green-200';
      case TokenStatus.REJECTED:
        return 'bg-red-100 text-red-700 border-red-200';
      case TokenStatus.READY_TO_MINT:
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case TokenStatus.MINTED:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case TokenStatus.DEPLOYED:
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case TokenStatus.PAUSED:
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case TokenStatus.DISTRIBUTED:
        return 'bg-teal-100 text-teal-700 border-teal-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus) {
      setError('Please select a status to transition to');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      console.log('Updating token status:', {
        tokenId: token.id,
        fromStatus: token.status,
        toStatus: selectedStatus,
        tokenName: token.name
      });

      const result = await updateTokenStatus(
        token.id,
        selectedStatus as TokenStatus,
        undefined, // userId - could be passed from auth context
        notes || undefined
      );

      if (result.success) {
        console.log('Token status updated successfully:', {
          tokenId: token.id,
          newStatus: selectedStatus,
          previousStatus: result.data?.previousStatus
        });
        
        setSuccess(true);
        
        // Call the parent callback with updated token data
        if (onStatusUpdate && result.data) {
          onStatusUpdate({
            ...token,
            status: selectedStatus as TokenStatus,
            updated_at: new Date().toISOString()
          });
        }
        
        // Auto-close after success
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        console.error('Failed to update token status:', result.error);
        setError(result.error || 'Failed to update token status');
      }
    } catch (err: any) {
      console.error('Error updating token status:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setSelectedStatus('');
    setNotes('');
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  // Success state rendering
  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-8 space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Status Updated Successfully</h3>
              <p className="text-muted-foreground">
                <strong>{token.name}</strong> status has been updated to{' '}
                <Badge className={getStatusColor(selectedStatus as TokenStatus)}>
                  {getStatusIcon(selectedStatus as TokenStatus)}
                  <span className="ml-1">{STATUS_DISPLAY_NAMES[selectedStatus as TokenStatus]}</span>
                </Badge>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main dialog content
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-2">
              <Workflow className="h-5 w-5 text-indigo-600" />
            </div>
            Update Token Status
          </DialogTitle>
          <DialogDescription className="text-base">
            Change the workflow status for{' '}
            <strong className="text-foreground">{token.name} ({token.symbol})</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Token Information Summary */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-medium flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Token Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Standard:</span>
                    <span className="ml-2 font-medium">{token.standard}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Blockchain:</span>
                    <span className="ml-2 font-medium">{token.blockchain || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(token.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(token.updated_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Current Status
            </h4>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(workflowInfo.currentStatus)}
                <div>
                  <Badge className={getStatusColor(workflowInfo.currentStatus)}>
                    {workflowInfo.displayName}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {workflowInfo.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-3">
            <Label htmlFor="status-select" className="text-base font-medium flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Select New Status
            </Label>
            <Select 
              value={selectedStatus} 
              onValueChange={(value: string) => setSelectedStatus(value as TokenStatus | '')}
              disabled={isUpdating}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Choose the next status for this token..." />
              </SelectTrigger>
              <SelectContent>
                {workflowInfo.availableTransitions.map((status) => (
                  <SelectItem key={status} value={status} className="py-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status)}
                      <div>
                        <div className="font-medium">{STATUS_DISPLAY_NAMES[status]}</div>
                        <div className="text-xs text-muted-foreground">
                          {STATUS_DESCRIPTIONS[status]}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Status Preview */}
          {selectedStatus && (
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  {getStatusIcon(selectedStatus as TokenStatus)}
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-blue-900">
                    Transitioning to: {STATUS_DISPLAY_NAMES[selectedStatus as TokenStatus]}
                  </h5>
                  <p className="text-sm text-blue-700 mt-1">
                    {STATUS_DESCRIPTIONS[selectedStatus as TokenStatus]}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-base font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any comments or reasons for this status change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isUpdating}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              These notes will be recorded in the audit log for compliance and tracking purposes.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">{error}</AlertDescription>
            </Alert>
          )}

          {/* Warning for Final Status */}
          {selectedStatus === TokenStatus.DISTRIBUTED && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Warning:</strong> Distributed is a final status. Once set, no further status changes will be possible.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-3 pt-6">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isUpdating}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleStatusUpdate}
            disabled={!selectedStatus || isUpdating}
            className="min-w-[140px]"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Update Status
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatusTransitionDialog;