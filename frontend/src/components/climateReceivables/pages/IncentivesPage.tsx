import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Filter, Download, RefreshCw, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import { ClimateIncentivesService } from '../services/climateIncentivesService';
import { ClimateIncentive, IncentiveType, IncentiveStatus } from '../types';
import { IncentivesTable } from './IncentivesTable';
import { IncentiveForm } from './IncentiveForm';
import BulkIncentivesUpload from '../BulkIncentivesUpload';

interface IncentivesPageProps {
  className?: string;
}

export function IncentivesPage({ className }: IncentivesPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  
  const [incentives, setIncentives] = useState<ClimateIncentive[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingIncentive, setEditingIncentive] = useState<ClimateIncentive | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
  });

  useEffect(() => {
    loadIncentives();
    loadSummary();
  }, [projectId, filters]);

  const loadIncentives = async () => {
    try {
      setLoading(true);
      const data = await ClimateIncentivesService.getIncentives({
        projectId,
        type: filters.type ? (filters.type as IncentiveType) : undefined,
        status: filters.status ? (filters.status as IncentiveStatus) : undefined,
      });
      setIncentives(data);
    } catch (error) {
      console.error('Error loading incentives:', error);
      toast({
        title: 'Error',
        description: 'Failed to load incentives',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const summaryData = await ClimateIncentivesService.getIncentivesSummary(projectId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleCreateSuccess = (newIncentive: ClimateIncentive) => {
    setIncentives(prev => [newIncentive, ...prev]);
    setSummary(null); // Force refresh
    loadSummary();
    setShowCreateDialog(false);
    toast({
      title: 'Success',
      description: 'Incentive created successfully',
    });
  };

  const handleEditSuccess = (updatedIncentive: ClimateIncentive) => {
    setIncentives(prev => 
      prev.map(inc => 
        inc.incentiveId === updatedIncentive.incentiveId ? updatedIncentive : inc
      )
    );
    setSummary(null);
    loadSummary();
    setEditingIncentive(null);
    toast({
      title: 'Success',
      description: 'Incentive updated successfully',
    });
  };

  const handleDelete = async (incentiveId: string) => {
    try {
      await ClimateIncentivesService.deleteIncentive(incentiveId);
      setIncentives(prev => prev.filter(inc => inc.incentiveId !== incentiveId));
      loadSummary();
      toast({
        title: 'Success',
        description: 'Incentive deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting incentive:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete incentive',
        variant: 'destructive',
      });
    }
  };

  const clearFilters = () => {
    setFilters({ type: '', status: '' });
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
          <h1 className="text-3xl font-bold tracking-tight">Climate Incentives</h1>
          <p className="text-muted-foreground">
            Manage renewable energy incentives, tax credits, and RECs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadIncentives} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Bulk Upload</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Incentives</DialogTitle>
              </DialogHeader>
              {projectId && (
                <BulkIncentivesUpload 
                  projectId={projectId} 
                  onUploadComplete={() => {
                    loadIncentives();
                    setIsUploadModalOpen(false);
                  }}
                  onCancel={() => setIsUploadModalOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Incentive
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Incentives</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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
              <Label htmlFor="type-filter">Type</Label>
              <Select 
                value={filters.type || undefined} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value || '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(IncentiveType).map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select 
                value={filters.status || undefined} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
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
          <CardTitle>Incentives</CardTitle>
          <CardDescription>
            {incentives.length} incentive{incentives.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IncentivesTable
            data={incentives}
            loading={loading}
            onEdit={setEditingIncentive}
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
            <DialogTitle>Create New Incentive</DialogTitle>
            <DialogDescription>
              Add a new climate incentive, tax credit, or REC to the project
            </DialogDescription>
          </DialogHeader>
          <IncentiveForm
            projectId={projectId}
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingIncentive} onOpenChange={() => setEditingIncentive(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Incentive</DialogTitle>
            <DialogDescription>
              Update the incentive details
            </DialogDescription>
          </DialogHeader>
          <IncentiveForm
            projectId={projectId}
            incentive={editingIncentive}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditingIncentive(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
