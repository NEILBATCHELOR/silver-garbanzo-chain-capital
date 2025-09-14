import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  MoreHorizontal,
  Download,
  Eye,
  Settings,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  Database,
} from 'lucide-react';
import { UserDataSourceService } from '../../../../services/climateReceivables/userDataSourceService';
import type { UserDataSource, DataExtractionResult } from '../../../../services/climateReceivables/userDataSourceService';

interface DataSourceManagerProps {
  onSourceSelect?: (source: UserDataSource) => void;
  className?: string;
}

interface DataSourceWithStats extends UserDataSource {
  qualityScore?: number;
  recordCount?: number;
  lastValidation?: string;
  processingTime?: number;
}

export default function DataSourceManager({ onSourceSelect, className = '' }: DataSourceManagerProps) {
  const [sources, setSources] = useState<DataSourceWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<DataSourceWithStats | null>(null);
  const [processingSourceIds, setProcessingSourceIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDataSources();
  }, []);

  const loadDataSources = async () => {
    try {
      setLoading(true);
      setError(null);

      const userSources = await UserDataSourceService.getUserDataSources();
      
      // Enhance sources with additional stats
      const enhancedSources = await Promise.all(
        userSources.map(async (source) => {
          try {
            // Get processing stats and quality metrics
            const stats = await UserDataSourceService.getDataSourceStats(source.source_id);
            return {
              ...source,
              qualityScore: stats?.quality_score || 0,
              recordCount: stats?.record_count || 0,
              lastValidation: stats?.last_validation,
              processingTime: stats?.processing_time_ms,
            } as DataSourceWithStats;
          } catch (error) {
            // If stats fetch fails, return source with defaults
            return {
              ...source,
              qualityScore: 0,
              recordCount: 0,
            } as DataSourceWithStats;
          }
        })
      );

      setSources(enhancedSources);
    } catch (error) {
      console.error('Failed to load data sources:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data sources');
    } finally {
      setLoading(false);
    }
  };

  const handleReprocessSource = async (sourceId: string) => {
    try {
      setProcessingSourceIds(prev => new Set(prev.add(sourceId)));
      
      const result = await UserDataSourceService.processDataSource(sourceId);
      
      if (result.success) {
        // Refresh the sources list to get updated stats
        await loadDataSources();
      } else {
        setError(`Processing failed: ${result.validation_errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Reprocessing failed:', error);
      setError(error instanceof Error ? error.message : 'Processing failed');
    } finally {
      setProcessingSourceIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(sourceId);
        return newSet;
      });
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this data source? This action cannot be undone.')) {
      return;
    }

    try {
      await UserDataSourceService.deleteDataSource(sourceId);
      setSources(prev => prev.filter(source => source.source_id !== sourceId));
    } catch (error) {
      console.error('Delete failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete data source');
    }
  };

  const handleToggleActive = async (sourceId: string, isActive: boolean) => {
    try {
      await UserDataSourceService.updateDataSourceStatus(sourceId, isActive ? 'active' : 'inactive');
      setSources(prev => prev.map(source => 
        source.source_id === sourceId 
          ? { ...source, is_active: isActive }
          : source
      ));
    } catch (error) {
      console.error('Status update failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to update source status');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary', icon: Clock, color: 'text-yellow-600' },
      processing: { variant: 'secondary', icon: RefreshCw, color: 'text-blue-600' },
      completed: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      error: { variant: 'destructive', icon: AlertCircle, color: 'text-red-600' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getSourceTypeLabel = (type: string) => {
    const typeLabels = {
      credit_report: 'Credit Report',
      financial_statement: 'Financial Statement',
      market_data: 'Market Data',
      custom: 'Custom Data',
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading data sources...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Climate Data Sources
              </CardTitle>
              <CardDescription>
                Manage uploaded data sources for enhanced risk assessments
              </CardDescription>
            </div>
            <Button variant="outline" onClick={loadDataSources}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {sources.length === 0 ? (
          <CardContent>
            <div className="text-center py-8">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Data Sources</h3>
              <p className="text-gray-500 mb-4">
                Upload your first data source to enhance climate risk assessments
              </p>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Data Source
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((source) => {
                    const isProcessing = processingSourceIds.has(source.source_id);
                    
                    return (
                      <TableRow key={source.source_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <div>
                              <div className="font-medium">{source.source_name}</div>
                              <div className="text-xs text-gray-500 capitalize">
                                {source.data_format} • {source.refresh_frequency}
                              </div>
                            </div>
                            {!source.is_active && (
                              <Badge variant="outline" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getSourceTypeLabel(source.source_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isProcessing ? (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Processing
                            </Badge>
                          ) : (
                            getStatusBadge(source.processing_status || 'pending')
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={source.qualityScore || 0} className="w-16 h-2" />
                            <span className="text-xs text-gray-600">
                              {source.qualityScore || 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {source.recordCount?.toLocaleString() || '0'}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatFileSize(source.file_size)}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatDate(source.last_processed || source.upload_date)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem 
                                onClick={() => setSelectedSource(source)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleReprocessSource(source.source_id)}
                                disabled={isProcessing}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reprocess
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(source.source_id, !source.is_active)}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                {source.is_active ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteSource(source.source_id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Data Source Details Dialog */}
      <Dialog open={!!selectedSource} onOpenChange={() => setSelectedSource(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedSource?.source_name}
            </DialogTitle>
            <DialogDescription>
              Data source details and processing information
            </DialogDescription>
          </DialogHeader>

          {selectedSource && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Source Type</h4>
                  <Badge variant="outline">
                    {getSourceTypeLabel(selectedSource.source_type)}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Data Format</h4>
                  <Badge variant="outline" className="uppercase">
                    {selectedSource.data_format}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">File Size</h4>
                  <p className="text-sm">{formatFileSize(selectedSource.file_size)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Refresh Frequency</h4>
                  <p className="text-sm capitalize">{selectedSource.refresh_frequency}</p>
                </div>
              </div>

              {/* Processing Status */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Processing Status</h4>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(selectedSource.processing_status || 'pending')}
                    <div className="text-sm">
                      <p>Status: {selectedSource.processing_status}</p>
                      {selectedSource.processingTime && (
                        <p className="text-gray-600">
                          Processing time: {selectedSource.processingTime}ms
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {selectedSource.qualityScore || 0}%
                    </div>
                    <div className="text-xs text-gray-600">Quality Score</div>
                  </div>
                </div>
              </div>

              {/* Validation Errors */}
              {selectedSource.validation_errors && selectedSource.validation_errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Validation Issues</h4>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedSource.validation_errors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Timeline</h4>
                <div className="text-sm space-y-1">
                  <p>Uploaded: {formatDate(selectedSource.upload_date)}</p>
                  {selectedSource.last_processed && (
                    <p>Last processed: {formatDate(selectedSource.last_processed)}</p>
                  )}
                </div>
              </div>

              {/* Data Schema Preview */}
              {selectedSource.data_schema && Object.keys(selectedSource.data_schema).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Data Schema</h4>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(selectedSource.data_schema, null, 2)}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleReprocessSource(selectedSource.source_id)}
                  disabled={processingSourceIds.has(selectedSource.source_id)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reprocess Data
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
