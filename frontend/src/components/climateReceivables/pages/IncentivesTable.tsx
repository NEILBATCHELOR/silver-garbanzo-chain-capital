import React from 'react';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { ClimateIncentive, IncentiveStatus } from '../types';

interface IncentivesTableProps {
  data: ClimateIncentive[];
  loading: boolean;
  onEdit: (incentive: ClimateIncentive) => void;
  onDelete: (incentiveId: string) => void;
  formatCurrency: (amount: number) => string;
  getStatusBadgeVariant: (status: IncentiveStatus) => any;
}

export function IncentivesTable({
  data,
  loading,
  onEdit,
  onDelete,
  formatCurrency,
  getStatusBadgeVariant,
}: IncentivesTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-pulse">Loading incentives...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No incentives found</p>
      </div>
    );
  }

  const formatIncentiveType = (type: string) => {
    return type.replace('_', ' ').toUpperCase();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expected Receipt</TableHead>
            <TableHead>Asset ID</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((incentive) => (
            <TableRow key={incentive.incentiveId}>
              <TableCell className="font-medium">
                {formatIncentiveType(incentive.type)}
              </TableCell>
              <TableCell>
                {formatCurrency(incentive.amount)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(incentive.status)}>
                  {incentive.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(incentive.expectedReceiptDate)}
              </TableCell>
              <TableCell>
                <code className="text-xs text-muted-foreground">
                  {incentive.assetId ? incentive.assetId.substring(0, 8) + '...' : 'None'}
                </code>
              </TableCell>
              <TableCell>
                {formatDate(incentive.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(incentive)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Incentive</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this incentive? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(incentive.incentiveId)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
