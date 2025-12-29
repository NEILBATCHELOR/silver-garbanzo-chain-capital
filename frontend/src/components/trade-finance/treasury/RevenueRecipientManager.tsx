/**
 * Revenue Recipient Manager Component
 * Manage revenue sharing recipients and their allocation percentages
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRevenueRecipients, useAddRecipient, useUpdateRecipient, useRemoveRecipient } from '@/hooks/trade-finance';
import { UserPlus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/utils';

interface RevenueRecipientManagerProps {
  className?: string;
}

export function RevenueRecipientManager({ className }: RevenueRecipientManagerProps) {
  const { data: recipients, isLoading, error, refetch } = useRevenueRecipients();
  const addRecipient = useAddRecipient();
  const updateRecipient = useUpdateRecipient();
  const removeRecipient = useRemoveRecipient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<any>(null);
  const [formData, setFormData] = useState({
    address: '',
    percentage: '',
    notes: ''
  });

  const handleAdd = async () => {
    try {
      await addRecipient.mutateAsync({
        recipientAddress: formData.address,
        allocationPercentage: parseFloat(formData.percentage),
        notes: formData.notes
      });
      toast.success('Recipient added successfully');
      setIsAddDialogOpen(false);
      setFormData({ address: '', percentage: '', notes: '' });
      refetch();
    } catch (error) {
      toast.error('Failed to add recipient');
    }
  };

  const handleUpdate = async () => {
    if (!editingRecipient) return;
    
    try {
      await updateRecipient.mutateAsync({
        id: editingRecipient.id,
        allocationPercentage: parseFloat(formData.percentage),
        notes: formData.notes,
        isActive: editingRecipient.is_active
      });
      toast.success('Recipient updated successfully');
      setEditingRecipient(null);
      setFormData({ address: '', percentage: '', notes: '' });
      refetch();
    } catch (error) {
      toast.error('Failed to update recipient');
    }
  };

  const handleRemove = async (recipientId: string) => {
    if (!confirm('Are you sure you want to remove this recipient?')) return;
    
    try {
      await removeRecipient.mutateAsync(recipientId);
      toast.success('Recipient removed successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to remove recipient');
    }
  };

  const handleToggleActive = async (recipient: any) => {
    try {
      await updateRecipient.mutateAsync({
        id: recipient.id,
        allocationPercentage: recipient.allocation_percentage,
        notes: recipient.notes,
        isActive: !recipient.is_active
      });
      toast.success(`Recipient ${!recipient.is_active ? 'activated' : 'deactivated'}`);
      refetch();
    } catch (error) {
      toast.error('Failed to update recipient status');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Failed to load revenue recipients
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalAllocation = recipients?.reduce(
    (sum: number, r: any) => r.is_active ? sum + r.allocation_percentage : sum,
    0
  ) || 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Revenue Recipients</h3>
          <p className="text-sm text-muted-foreground">
            Total allocation: {totalAllocation.toFixed(2)}%
            {totalAllocation !== 100 && (
              <Badge variant="secondary" className="ml-2">
                {totalAllocation > 100 ? 'Over' : 'Under'}-allocated
              </Badge>
            )}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Recipient
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Revenue Recipient</DialogTitle>
              <DialogDescription>
                Add a new address to receive revenue distribution
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="address">Recipient Address</Label>
                <Input
                  id="address"
                  placeholder="0x..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="percentage">Allocation Percentage</Label>
                <Input
                  id="percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="10.00"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Description or label"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!formData.address || !formData.percentage}>
                Add Recipient
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recipients Table */}
      <Card>
        <CardContent className="pt-6">
          {!recipients || recipients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No revenue recipients configured</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Allocation %</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Received</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((recipient: any) => (
                    <TableRow key={recipient.id}>
                      <TableCell>
                        <code className="text-xs">
                          {recipient.recipient_address.slice(0, 6)}...
                          {recipient.recipient_address.slice(-4)}
                        </code>
                      </TableCell>
                      <TableCell className="font-mono">
                        {recipient.allocation_percentage.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {recipient.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(recipient)}
                        >
                          {recipient.is_active ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono">
                        ${recipient.total_distributed || '0'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRecipient(recipient);
                              setFormData({
                                address: recipient.recipient_address,
                                percentage: recipient.allocation_percentage.toString(),
                                notes: recipient.notes || ''
                              });
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(recipient.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingRecipient} onOpenChange={(open) => !open && setEditingRecipient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Revenue Recipient</DialogTitle>
            <DialogDescription>
              Update allocation percentage and notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-address">Recipient Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                disabled
                className="opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-percentage">Allocation Percentage</Label>
              <Input
                id="edit-percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.percentage}
                onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecipient(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>
              Update Recipient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
