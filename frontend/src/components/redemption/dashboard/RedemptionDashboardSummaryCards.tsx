import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  Activity
} from 'lucide-react';
import { cn } from '@/utils/shared/utils';

interface RedemptionDashboardSummaryCardsProps {
  totalCount: number;
  totalValue: number;
  settledCount: number;
  settledValue: number;
  pendingCount: number;
  approvedCount: number;
  processingCount: number;
  rejectedCount: number;
  completionRate: number;
  loading?: boolean;
  className?: string;
}

// Format currency helper
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const RedemptionDashboardSummaryCards: React.FC<RedemptionDashboardSummaryCardsProps> = ({
  totalCount,
  totalValue,
  settledCount,
  settledValue,
  pendingCount,
  approvedCount,
  processingCount,
  rejectedCount,
  completionRate,
  loading = false,
  className
}) => {
  // Loading skeleton
  if (loading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {/* Total Requests Card */}
      <Card className="overflow-hidden border-none shadow-sm">
        <CardHeader className="p-4 pb-2 space-y-1.5">
          <div className="flex justify-between items-start">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <div className="p-1.5 rounded-md bg-[#2563eb]/10">
              <Users className="h-4 w-4 text-[#2563eb]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold">{totalCount}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>Active: {totalCount - settledCount - rejectedCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Total Value Card */}
      <Card className="overflow-hidden border-none shadow-sm">
        <CardHeader className="p-4 pb-2 space-y-1.5">
          <div className="flex justify-between items-start">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <div className="p-1.5 rounded-md bg-[#2563eb]/10">
              <DollarSign className="h-4 w-4 text-[#2563eb]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>Settled: {formatCurrency(settledValue)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals Card */}
      <Card className="overflow-hidden border-none shadow-sm">
        <CardHeader className="p-4 pb-2 space-y-1.5">
          <div className="flex justify-between items-start">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <div className="p-1.5 rounded-md bg-[#2563eb]/10">
              {(pendingCount + approvedCount) > 0 ? (
                <Clock className="h-4 w-4 text-[#2563eb]" />
              ) : (
                <CheckCircle className="h-4 w-4 text-[#2563eb]" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold">{pendingCount + approvedCount}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>Pending: {pendingCount} | Approved: {approvedCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Processing Card */}
      <Card className="overflow-hidden border-none shadow-sm">
        <CardHeader className="p-4 pb-2 space-y-1.5">
          <div className="flex justify-between items-start">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <div className="p-1.5 rounded-md bg-[#2563eb]/10">
              <Activity className="h-4 w-4 text-[#2563eb]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold">{processingCount}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>Completion Rate: {completionRate}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RedemptionDashboardSummaryCards;