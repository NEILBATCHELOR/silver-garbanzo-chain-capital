import React from 'react';
import { Edit, Trash2, Zap } from 'lucide-react';
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

interface RecTableProps {
  data: ClimateIncentive[];
  loading: boolean;
  onEdit: (rec: ClimateIncentive) => void;
  onDelete: (recId: string) => void;
  formatCurrency: (amount: number) => string;
  getStatusBadgeVariant: (status: IncentiveStatus) => any;
}

export function RecTable({
  data,
  loading,
  onEdit,
  onDelete,
  formatCurrency,
  getStatusBadgeVariant,
}: RecTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-pulse">Loading RECs...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-8">
        <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No RECs found</p>
        <p className="text-sm text-muted-foreground">Create your first Renewable Energy Certificate</p>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-600" />
                REC Details
              </div>
            </TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expected Receipt</TableHead>
            <TableHead>Asset ID</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((rec) => (
            <TableRow key={rec.incentiveId}>
              <TableCell className="font-medium">
                <div>
                  <div className="font-medium">Renewable Energy Certificate</div>
                  <div className="text-sm text-muted-foreground">
                    ID: {rec.incentiveId.substring(0, 8)}...
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{formatCurrency(rec.amount)}</div>
                <div className="text-sm text-muted-foreground">
                  Market rate
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(rec.status)}>
                  {rec.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {formatDate(rec.expectedReceiptDate)}
                </div>
              </TableCell>
              <TableCell>
                <code className="text-xs text-muted-foreground">
                  {rec.assetId ? rec.assetId.substring(0, 8) + '...' : 'None'}
                </code>
              </TableCell>
              <TableCell>
                {formatDate(rec.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(rec)}
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
                        <AlertDialogTitle>Delete REC</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this Renewable Energy Certificate? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(rec.incentiveId)}
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
