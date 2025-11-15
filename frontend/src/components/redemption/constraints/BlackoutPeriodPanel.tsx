/**
 * Blackout Period Panel Component
 * Manages blackout periods for redemption operations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/shared/use-toast';
import { AlertCircle, Plus, Calendar, Ban } from 'lucide-react';
import { BlackoutPeriodManager } from '@/infrastructure/redemption/services/BlackoutPeriodManager';
import type { BlackoutPeriod } from '@/infrastructure/redemption/types/blackout';

interface BlackoutPeriodPanelProps {
  projectId: string;
}

export function BlackoutPeriodPanel({ projectId }: BlackoutPeriodPanelProps) {
  const [blackoutPeriods, setBlackoutPeriods] = useState<BlackoutPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const manager = new BlackoutPeriodManager();

  useEffect(() => {
    loadBlackoutPeriods();
  }, [projectId]);

  const loadBlackoutPeriods = async () => {
    try {
      setLoading(true);
      const periods = await manager.getBlackoutPeriods(projectId);
      setBlackoutPeriods(periods);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load blackout periods',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlackout = async (formData: {
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    try {
      await manager.createBlackoutPeriod({
        projectId,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        reason: formData.reason,
      });

      toast({
        title: 'Success',
        description: 'Blackout period created successfully',
      });

      setIsCreateOpen(false);
      await loadBlackoutPeriods();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create blackout period',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    try {
      if (currentlyActive) {
        await manager.deactivateBlackoutPeriod(id);
        toast({
          title: 'Deactivated',
          description: 'Blackout period has been deactivated',
        });
      } else {
        await manager.activateBlackoutPeriod(id);
        toast({
          title: 'Activated',
          description: 'Blackout period has been activated',
        });
      }
      await loadBlackoutPeriods();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to toggle blackout period',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blackout period?')) {
      return;
    }

    try {
      await manager.deleteBlackoutPeriod(id);
      toast({
        title: 'Deleted',
        description: 'Blackout period has been deleted',
      });
      await loadBlackoutPeriods();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete blackout period',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Blackout Periods
            </CardTitle>
            <CardDescription>
              Manage periods when redemptions are not allowed
            </CardDescription>
          </div>
          <CreateBlackoutDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            onCreate={handleCreateBlackout}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : blackoutPeriods.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No blackout periods configured
          </div>
        ) : (
          <div className="space-y-4">
            {blackoutPeriods.map((period) => (
              <BlackoutPeriodCard
                key={period.id}
                period={period}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface BlackoutPeriodCardProps {
  period: BlackoutPeriod;
  onToggleActive: (id: string, currentlyActive: boolean) => void;
  onDelete: (id: string) => void;
}

function BlackoutPeriodCard({ period, onToggleActive, onDelete }: BlackoutPeriodCardProps) {
  const isActive = period.active && new Date() < new Date(period.endDate);
  const isPast = new Date() > new Date(period.endDate);
  const isFuture = new Date() < new Date(period.startDate);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {new Date(period.startDate).toLocaleDateString()} -{' '}
              {new Date(period.endDate).toLocaleDateString()}
            </span>
          </div>
          {period.reason && (
            <p className="text-sm text-muted-foreground">{period.reason}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPast && <Badge variant="secondary">Past</Badge>}
          {isFuture && <Badge variant="outline">Upcoming</Badge>}
          {isActive && <Badge variant="destructive">Active</Badge>}
          {!period.active && <Badge variant="secondary">Inactive</Badge>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Affected:</span>
        <div className="flex gap-1">
          {period.affectedOperations.map((op) => (
            <Badge key={op} variant="outline" className="text-xs">
              {op}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleActive(period.id, period.active)}
        >
          {period.active ? 'Deactivate' : 'Activate'}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(period.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

interface CreateBlackoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { startDate: string; endDate: string; reason: string }) => void;
}

function CreateBlackoutDialog({ open, onOpenChange, onCreate }: CreateBlackoutDialogProps) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    setFormData({ startDate: '', endDate: '', reason: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Blackout Period
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Blackout Period</DialogTitle>
            <DialogDescription>
              Set a period during which redemptions will not be allowed
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="e.g., System maintenance, regulatory compliance, etc."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Blackout Period</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
