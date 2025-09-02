import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Filter, RefreshCw, Leaf, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import { CarbonOffsetsService } from '../services/carbonOffsetsService';
import { CarbonOffset, CarbonOffsetType, CarbonOffsetStatus } from '../types';
import { CarbonOffsetsTable } from './CarbonOffsetsTable';
import { CarbonOffsetForm } from './CarbonOffsetForm';
import BulkCarbonOffsetsUpload from '../BulkCarbonOffsetsUpload';

interface CarbonOffsetsPageProps {
  className?: string;
}

export function CarbonOffsetsPage({ className }: CarbonOffsetsPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  
  const [offsets, setOffsets] = useState<CarbonOffset[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingOffset, setEditingOffset] = useState<CarbonOffset | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    verificationStandard: '',
  });

  useEffect(() => {
    loadOffsets();
    loadSummary();
  }, [projectId, filters]);

  const loadOffsets = async () => {
    try {
      setLoading(true);
      const data = await CarbonOffsetsService.getOffsets({
        projectId,
        type: filters.type ? (filters.type as CarbonOffsetType) : undefined,
        status: filters.status ? (filters.status as CarbonOffsetStatus) : undefined,
        verificationStandard: filters.verificationStandard || undefined,
      });
      setOffsets(data);
    } catch (error) {
      console.error('Error loading carbon offsets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load carbon offsets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const summaryData = await CarbonOffsetsService.getOffsetsSummary(projectId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleCreateSuccess = (newOffset: CarbonOffset) => {
    setOffsets(prev => [newOffset, ...prev]);
    setSummary(null);
    loadSummary();
    setShowCreateDialog(false);
    toast({
      title: 'Success',
      description: 'Carbon offset created successfully',
    });
  };

  const handleEditSuccess = (updatedOffset: CarbonOffset) => {
    setOffsets(prev => 
      prev.map(offset => 
        offset.offsetId === updatedOffset.offsetId ? updatedOffset : offset
      )
    );
    setSummary(null);
    loadSummary();
    setEditingOffset(null);
    toast({
      title: 'Success',
      description: 'Carbon offset updated successfully',
    });
  };

  const handleDelete = async (offsetId: string) => {
    try {
      await CarbonOffsetsService.deleteOffset(offsetId);
      setOffsets(prev => prev.filter(offset => offset.offsetId !== offsetId));
      loadSummary();
      toast({
        title: 'Success',
        description: 'Carbon offset deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting carbon offset:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete carbon offset',
        variant: 'destructive',
      });
    }
  };

  const clearFilters = () => {
    setFilters({ type: '', status: '', verificationStandard: '' });
  };

  const getStatusBadgeVariant = (status: CarbonOffsetStatus) => {
    switch (status) {
      case CarbonOffsetStatus.VERIFIED:
        return 'default';
      case CarbonOffsetStatus.PENDING:
        return 'outline';
      case CarbonOffsetStatus.RETIRED:
        return 'secondary';
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
          <h1 className="text-3xl font-bold tracking-tight">Carbon Offsets</h1>
          <p className="text-muted-foreground">
            Manage carbon offset credits and environmental impact certificates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadOffsets} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Bulk Upload</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Carbon Offsets</DialogTitle>
              </DialogHeader>
              {projectId && (
                <BulkCarbonOffsetsUpload 
                  projectId={projectId} 
                  onUploadComplete={() => {
                    loadOffsets();
                    setIsUploadModalOpen(false);
                  }}
                  onCancel={() => setIsUploadModalOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Carbon Offset
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Offsets</CardTitle>
              <Leaf className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalCount}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalAmount.toLocaleString()} tCO2e
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
              <p className="text-xs text-muted-foreground">
                ${summary.averagePricePerTon.toFixed(2)}/tCO2e avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.byStatus[CarbonOffsetStatus.VERIFIED] || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.byStatus[CarbonOffsetStatus.PENDING] || 0}</div>
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
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="type-filter">Type</Label>
              <Select 
                value={filters.type} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CarbonOffsetType).map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                  {Object.values(CarbonOffsetStatus).map(status => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="standard-filter">Verification Standard</Label>
              <Select 
                value={filters.verificationStandard} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, verificationStandard: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All standards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VCS">VCS (Verified Carbon Standard)</SelectItem>
                  <SelectItem value="Gold Standard">Gold Standard</SelectItem>
                  <SelectItem value="CDM">CDM (Clean Development Mechanism)</SelectItem>
                  <SelectItem value="CAR">CAR (Climate Action Reserve)</SelectItem>
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
          <CardTitle>Carbon Offsets</CardTitle>
          <CardDescription>
            {offsets.length} offset{offsets.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CarbonOffsetsTable
            data={offsets}
            loading={loading}
            onEdit={setEditingOffset}
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
            <DialogTitle>Create New Carbon Offset</DialogTitle>
            <DialogDescription>
              Add a new carbon offset credit to the project
            </DialogDescription>
          </DialogHeader>
          <CarbonOffsetForm
            projectId={projectId}
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingOffset} onOpenChange={() => setEditingOffset(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Carbon Offset</DialogTitle>
            <DialogDescription>
              Update the carbon offset details
            </DialogDescription>
          </DialogHeader>
          <CarbonOffsetForm
            projectId={projectId}
            carbonOffset={editingOffset}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditingOffset(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
