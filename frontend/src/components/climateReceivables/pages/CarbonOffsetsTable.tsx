import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
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

import { CarbonOffset, CarbonOffsetStatus } from '../types';

interface CarbonOffsetsTableProps {
  data: CarbonOffset[];
  loading: boolean;
  onEdit: (offset: CarbonOffset) => void;
  onDelete: (offsetId: string) => void;
  formatCurrency: (amount: number) => string;
  getStatusBadgeVariant: (status: CarbonOffsetStatus) => any;
}

export function CarbonOffsetsTable({
  data,
  loading,
  onEdit,
  onDelete,
  formatCurrency,
  getStatusBadgeVariant,
}: CarbonOffsetsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-pulse">Loading carbon offsets...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No carbon offsets found</p>
      </div>
    );
  }

  const formatOffsetType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString()} tCO2e`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Price/Ton</TableHead>
            <TableHead>Total Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verification</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((offset) => (
            <TableRow key={offset.offsetId}>
              <TableCell className="font-medium">
                {formatOffsetType(offset.type)}
              </TableCell>
              <TableCell>
                {formatAmount(offset.amount)}
              </TableCell>
              <TableCell>
                {formatCurrency(offset.pricePerTon)}
              </TableCell>
              <TableCell>
                {formatCurrency(offset.totalValue)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(offset.status)}>
                  {offset.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{offset.verificationStandard || 'Not specified'}</div>
                  {offset.verificationDate && (
                    <div className="text-xs text-muted-foreground">
                      {formatDate(offset.verificationDate)}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {formatDate(offset.expirationDate)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(offset)}
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
                        <AlertDialogTitle>Delete Carbon Offset</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this carbon offset? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(offset.offsetId)}
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
