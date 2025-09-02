import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Coins,
  Users,
  Plus,
  RefreshCw,
  User,
  Eye,
  Wallet,
  CheckCircle,
  DollarSign,
  Activity,
  FileText,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/utils/shared/utils';

// Types
interface RedemptionRequest {
  id: string;
  tokenAmount: number;
  tokenSymbol?: string;
  tokenType: string;
  usdcAmount?: number;
  conversionRate?: number;
  status: string;
  submittedAt: string;
  redemptionType: 'standard' | 'interval';
  isBulkRedemption?: boolean;
  investorCount?: number;
  investorName?: string;
  investorId?: string;
  sourceWallet?: string;
  destinationWallet?: string;
  requiredApprovals: number;
  validatedAt?: string;
  approvedAt?: string;
  executedAt?: string;
  settledAt?: string;
  notes?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectionTimestamp?: string;
}

interface RedemptionRecentRequestsProps {
  redemptions: RedemptionRequest[];
  loading?: boolean;
  maxDisplay?: number;
  totalCount: number;
  onCreateRedemption?: () => void;
  onViewDetails?: (requestId: string) => void;
  onViewAllRequests?: () => void;
  className?: string;
}

export const RedemptionRecentRequests: React.FC<RedemptionRecentRequestsProps> = ({
  redemptions,
  loading = false,
  maxDisplay = 5,
  totalCount,
  onCreateRedemption,
  onViewDetails,
  onViewAllRequests,
  className
}) => {
  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'settled':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className={cn("border-none shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Recent Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : redemptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No redemption requests found</p>
            {onCreateRedemption && (
              <Button 
                onClick={onCreateRedemption} 
                variant="outline" 
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Request
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {redemptions.slice(0, maxDisplay).map((redemption) => (
              <div
                key={redemption.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Header row with main info and status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-base">
                        {redemption.tokenAmount.toLocaleString()}
                        <span className="ml-1 text-primary font-bold">
                          {redemption.tokenSymbol || redemption.tokenType}
                        </span>
                      </span>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                      >
                        {redemption.redemptionType === 'standard' ? 'Standard' : 'Interval Fund'}
                      </Badge>
                      {redemption.isBulkRedemption && (
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Bulk ({redemption.investorCount || 1})
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Value: <span className="font-medium text-green-600">{formatCurrency(redemption.usdcAmount || 0)} USDC</span>
                      {redemption.conversionRate && redemption.conversionRate !== 1 && (
                        <span className="ml-2">
                          @ {redemption.conversionRate.toFixed(3)} rate
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge 
                      className={getStatusColor(redemption.status)}
                      variant="outline"
                    >
                      {redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(redemption.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Investor Information Row */}
                <div className="mb-3 p-2 bg-muted/30 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {redemption.investorName || 'Unknown Investor'}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          ID: {redemption.investorId ? redemption.investorId.slice(0, 8) + '...' : 'N/A'}
                        </span>
                      </div>
                    </div>
                    {onViewDetails && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => onViewDetails(redemption.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {/* Left column */}
                  <div className="space-y-2">
                    {redemption.sourceWallet && (
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">From:</span>
                        <span className="font-mono text-xs">
                          {redemption.sourceWallet.slice(0, 6)}...{redemption.sourceWallet.slice(-4)}
                        </span>
                      </div>
                    )}
                    {redemption.requiredApprovals > 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Approvals:</span>
                        <span className="font-medium">
                          {redemption.requiredApprovals} required
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right column */}
                  <div className="space-y-2">
                    {redemption.destinationWallet && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">To:</span>
                        <span className="font-mono text-xs">
                          {redemption.destinationWallet.slice(0, 6)}...{redemption.destinationWallet.slice(-4)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Activity className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Request ID:</span>
                      <span className="font-mono text-xs">
                        {redemption.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status timeline indicators */}
                {(redemption.validatedAt || redemption.approvedAt || redemption.executedAt || redemption.settledAt) && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {redemption.validatedAt && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-blue-500" />
                          <span>Validated {new Date(redemption.validatedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {redemption.approvedAt && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>Approved {new Date(redemption.approvedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {redemption.executedAt && (
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-purple-500" />
                          <span>Executed {new Date(redemption.executedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {redemption.settledAt && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>Settled {new Date(redemption.settledAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes or rejection reason */}
                {(redemption.notes || redemption.rejectionReason) && (
                  <div className="mt-3 pt-3 border-t">
                    {redemption.rejectionReason && (
                      <div className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <span className="text-red-600 font-medium">Rejection Reason:</span>
                          <p className="text-red-600">{redemption.rejectionReason}</p>
                          {redemption.rejectedBy && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Rejected by {redemption.rejectedBy}
                              {redemption.rejectionTimestamp && (
                                <span> on {new Date(redemption.rejectionTimestamp).toLocaleDateString()}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {redemption.notes && !redemption.rejectionReason && (
                      <div className="flex items-start gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-muted-foreground">Notes:</span>
                          <p className="text-muted-foreground">{redemption.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {redemptions.length > maxDisplay && onViewAllRequests && (
              <div className="text-center pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onViewAllRequests}
                >
                  View All Requests ({totalCount})
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RedemptionRecentRequests;