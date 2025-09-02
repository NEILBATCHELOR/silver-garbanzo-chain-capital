import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Filter, RefreshCw, Zap, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import { ClimateIncentivesService } from '../services/climateIncentivesService';
import { ClimateIncentive, IncentiveType, IncentiveStatus } from '../types';
import { RecTable } from './RecTable';
import { RecForm } from './RecForm';

interface RecsPageProps {
  className?: string;
}

export function RecsPage({ className }: RecsPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  
  const [recs, setRecs] = useState<ClimateIncentive[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRec, setEditingRec] = useState<ClimateIncentive | null>(null);
  const [filters, setFilters] = useState({
    status: '',
  });

  useEffect(() => {
    loadRecs();
    loadSummary();
  }, [projectId, filters]);

  const loadRecs = async () => {
    try {
      setLoading(true);
      // Load only REC type incentives
      const data = await ClimateIncentivesService.getIncentives({
        projectId,
        type: IncentiveType.REC, // Filter for RECs only
        status: filters.status ? (filters.status as IncentiveStatus) : undefined,
      });
      setRecs(data);
    } catch (error) {
      console.error('Error loading RECs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load RECs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const summaryData = await ClimateIncentivesService.getIncentivesSummary(projectId);
      // Extract REC-specific data from the summary
      const recSummary = {
        totalCount: summaryData.byType[IncentiveType.REC]?.count || 0,
        totalAmount: summaryData.byType[IncentiveType.REC]?.amount || 0,
        byStatus: summaryData.byStatus,
      };
      setSummary(recSummary);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleCreateSuccess = (newRec: ClimateIncentive) => {
    setRecs(prev => [newRec, ...prev]);
    setSummary(null);
    loadSummary();
    setShowCreateDialog(false);
    toast({
      title: 'Success',
      description: 'REC created successfully',
    });
  };

  const handleEditSuccess = (updatedRec: ClimateIncentive) => {
    setRecs(prev => 
      prev.map(rec => 
        rec.incentiveId === updatedRec.incentiveId ? updatedRec : rec
      )
    );
    setSummary(null);
    loadSummary();
    setEditingRec(null);
    toast({
      title: 'Success',
      description: 'REC updated successfully',
    });
  };

  const handleDelete = async (recId: string) => {
    try {
      await ClimateIncentivesService.deleteIncentive(recId);
      setRecs(prev => prev.filter(rec => rec.incentiveId !== recId));
      loadSummary();
      toast({
        title: 'Success',
        description: 'REC deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting REC:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete REC',
        variant: 'destructive',
      });
    }
  };

  const clearFilters = () => {
    setFilters({ status: '' });
  };

  const getStatusBadgeVariant = (status: IncentiveStatus) => {
    switch (status) {
      case IncentiveStatus.RECEIVED:
        return 'default';
      case IncentiveStatus.APPROVED:
        return 'secondary';
      case IncentiveStatus.PENDING:
        return 'outline';
      case IncentiveStatus.REJECTED:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Renewable Energy Certificates</h1>
          <p className="text-muted-foreground">
            Manage Renewable Energy Certificates (RECs) and green energy credits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadRecs} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add REC
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total RECs</CardTitle>
              <Zap className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalCount}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summary.totalAmount)} total value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.byStatus[IncentiveStatus.PENDING] || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.byStatus[IncentiveStatus.APPROVED] || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Received</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.byStatus[IncentiveStatus.RECEIVED] || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(IncentiveStatus).map(status => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Renewable Energy Certificates</CardTitle>
          <CardDescription>
            {recs.length} REC{recs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecTable
            data={recs}
            loading={loading}
            onEdit={setEditingRec}
            onDelete={handleDelete}
            formatCurrency={formatCurrency}
            getStatusBadgeVariant={getStatusBadgeVariant}
          />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New REC</DialogTitle>
            <DialogDescription>
              Add a new Renewable Energy Certificate to the project
            </DialogDescription>
          </DialogHeader>
          <RecForm
            projectId={projectId}
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingRec} onOpenChange={() => setEditingRec(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit REC</DialogTitle>
            <DialogDescription>
              Update the REC details
            </DialogDescription>
          </DialogHeader>
          <RecForm
            projectId={projectId}
            rec={editingRec}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditingRec(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
