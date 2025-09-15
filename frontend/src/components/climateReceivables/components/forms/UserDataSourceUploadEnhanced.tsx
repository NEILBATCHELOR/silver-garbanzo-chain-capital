import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Download,
  Eye,
  Loader2,
  FileSpreadsheet,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { UserDataSourceService } from '../../../../services/climateReceivables/userDataSourceService';
import type { UserDataSource } from '../../../../services/climateReceivables/userDataSourceService';

interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  sourceId?: string;
  error?: string;
}

interface UserDataSourceUploadEnhancedProps {
  onUploadComplete?: (sourceId: string, source: UserDataSource) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

const SUPPORTED_FORMATS = ['csv', 'xlsx', 'json', 'xml', 'pdf'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const SOURCE_TYPES = [
  { 
    value: 'credit_report', 
    label: 'Credit Report', 
    description: 'Credit ratings and financial assessments',
    templateName: 'credit_report_template.csv'
  },
  { 
    value: 'financial_statement', 
    label: 'Financial Statement', 
    description: 'Balance sheets, income statements, cash flow',
    templateName: 'financial_statement_template.csv'
  },
  { 
    value: 'market_data', 
    label: 'Market Data', 
    description: 'Pricing, trends, and market intelligence',
    templateName: 'market_data_template.csv'
  },
  { 
    value: 'custom', 
    label: 'Custom Data', 
    description: 'Other relevant business data',
    templateName: 'custom_data_template.csv'
  },
];

const REFRESH_FREQUENCIES = [
  { value: 'manual', label: 'Manual Only' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

// Template data for each source type
const TEMPLATE_DATA = {
  credit_report: [
    {
      payer_name: 'Sample Electric Utility Co',
      credit_rating: 'A',
      credit_score: 750,
      payment_history_score: 85,
      debt_to_equity: 0.4,
      current_ratio: 1.5,
      cash_flow_rating: 'Good',
      public_records: 0,
      on_time_rate: 0.95,
      average_delay_days: 2,
      credit_utilization: 0.25,
      last_updated: '2025-01-15'
    }
  ],
  financial_statement: [
    {
      company_name: 'Green Energy Solutions Inc',
      reporting_period: '2024-Q4',
      total_revenue: 50000000,
      net_income: 8500000,
      total_assets: 120000000,
      total_liabilities: 45000000,
      cash_flow_operations: 12000000,
      debt_to_equity: 0.35,
      current_ratio: 1.8,
      return_on_assets: 0.071,
      return_on_equity: 0.113,
      profit_margin: 0.17,
      last_updated: '2025-01-15'
    }
  ],
  market_data: [
    {
      asset_type: 'Renewable Energy Certificate',
      market_price: 45.50,
      price_currency: 'USD',
      volume_traded: 15000,
      market_volatility: 0.12,
      bid_price: 45.25,
      ask_price: 45.75,
      price_change_24h: 2.3,
      trading_date: '2025-01-15',
      exchange_name: 'Green Markets Exchange',
      last_updated: '2025-01-15T10:30:00Z'
    }
  ],
  custom: [
    {
      entity_name: 'Custom Entity Name',
      data_category: 'Risk Assessment',
      metric_name: 'ESG Score',
      metric_value: 78.5,
      unit_of_measure: 'Percentage',
      collection_date: '2025-01-15',
      source_system: 'Internal Analytics',
      confidence_level: 0.85,
      notes: 'Sample custom data entry',
      last_updated: '2025-01-15'
    }
  ]
};

export default function UserDataSourceUploadEnhanced({ 
  onUploadComplete, 
  onUploadError,
  className = '' 
}: UserDataSourceUploadEnhancedProps) {
  const [uploads, setUploads] = useState<FileUploadProgress[]>([]);
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState<'credit_report' | 'financial_statement' | 'market_data' | 'custom'>('credit_report');
  const [refreshFrequency, setRefreshFrequency] = useState<'manual' | 'daily' | 'weekly' | 'monthly'>('manual');
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension)) {
      return `Unsupported file format. Supported: ${SUPPORTED_FORMATS.join(', ')}`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 50MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
    }

    return null;
  };

  const downloadTemplate = useCallback((templateType: string) => {
    const selectedType = SOURCE_TYPES.find(type => type.value === templateType);
    if (!selectedType) return;

    const templateData = TEMPLATE_DATA[templateType as keyof typeof TEMPLATE_DATA];
    
    // Convert to CSV
    if (templateData.length > 0) {
      const headers = Object.keys(templateData[0]);
      const csvContent = [
        headers.join(','),
        ...templateData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Wrap strings containing commas in quotes
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : String(value);
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = selectedType.templateName;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads: FileUploadProgress[] = [];
    
    for (const file of acceptedFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        newUploads.push({
          file,
          progress: 0,
          status: 'error',
          error: validationError,
        });
        continue;
      }

      newUploads.push({
        file,
        progress: 0,
        status: 'uploading',
      });
    }

    setUploads(prev => [...prev, ...newUploads]);

    // Process valid files
    for (const upload of newUploads.filter(u => u.status !== 'error')) {
      await processFileUpload(upload);
    }
  }, [sourceType, sourceName, refreshFrequency, fieldMappings]);

  const processFileUpload = async (upload: FileUploadProgress) => {
    try {
      setIsProcessing(true);

      // Update progress to show upload starting
      updateUpload(upload.file, { progress: 10, status: 'uploading' });

      const sourceId = await UserDataSourceService.uploadDataSource(
        upload.file,
        {
          sourceName: sourceName || upload.file.name,
          sourceType,
          refreshFrequency,
          fieldMappings,
          metadata: {
            originalFileName: upload.file.name,
            uploadedAt: new Date().toISOString(),
            fileSize: upload.file.size,
          },
        }
      );

      // Update progress to show processing
      updateUpload(upload.file, { 
        progress: 50, 
        status: 'processing', 
        sourceId 
      });

      // Wait for processing to complete (simulated progress)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get the processed data source
      const source = await UserDataSourceService.getDataSource(sourceId);
      
      updateUpload(upload.file, { 
        progress: 100, 
        status: 'completed',
        sourceId 
      });

      if (onUploadComplete && source) {
        onUploadComplete(sourceId, source);
      }

    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      updateUpload(upload.file, { 
        progress: 0, 
        status: 'error', 
        error: errorMessage 
      });

      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const updateUpload = (file: File, updates: Partial<FileUploadProgress>) => {
    setUploads(prev => prev.map(upload => 
      upload.file === file 
        ? { ...upload, ...updates }
        : upload
    ));
  };

  const removeUpload = (file: File) => {
    setUploads(prev => prev.filter(upload => upload.file !== file));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json'],
      'text/xml': ['.xml'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    maxSize: MAX_FILE_SIZE,
  });

  const getStatusIcon = (status: FileUploadProgress['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: FileUploadProgress['status']) => {
    switch (status) {
      case 'uploading': return 'blue';
      case 'processing': return 'yellow';
      case 'completed': return 'green';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="templates">Download Templates</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          {/* Upload Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Climate Data Sources
              </CardTitle>
              <CardDescription>
                Upload credit reports, financial statements, market data, or custom files to enhance risk assessments.
                Supported formats: CSV, Excel, JSON, XML, PDF (max 50MB per file)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Source Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceName">Data Source Name</Label>
                  <Input
                    id="sourceName"
                    placeholder="e.g., Q1 2024 Credit Reports"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sourceType">Data Source Type</Label>
                  <Select value={sourceType} onValueChange={(value: any) => setSourceType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-gray-500">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refreshFrequency">Refresh Frequency</Label>
                <Select value={refreshFrequency} onValueChange={(value: any) => setRefreshFrequency(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {REFRESH_FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Template Download Button */}
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>Need a template? Download the data format template for your selected source type.</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate(sourceType)}
                      className="ml-4"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>

              {/* File Drop Zone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive 
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <input {...getInputProps()} ref={fileInputRef} />
                <div className="space-y-3">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-lg font-medium">
                      {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                    </p>
                    <p className="text-sm text-gray-500">
                      or click to browse files
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    Supports: CSV, Excel, JSON, XML, PDF • Max 50MB per file
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Progress</CardTitle>
                <CardDescription>
                  {uploads.length} file(s) • {uploads.filter(u => u.status === 'completed').length} completed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploads.map((upload, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getStatusIcon(upload.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {upload.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(upload.file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-${getStatusColor(upload.status)}-600 border-${getStatusColor(upload.status)}-200`}
                        >
                          {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUpload(upload.file)}
                          disabled={upload.status === 'uploading' || upload.status === 'processing'}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {upload.status !== 'error' && (
                      <Progress 
                        value={upload.progress} 
                        className="w-full"
                      />
                    )}

                    {upload.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {upload.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {upload.status === 'completed' && upload.sourceId && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/climate-receivables/data-sources/${upload.sourceId}`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
            {uploads.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setUploads([])}
                disabled={isProcessing}
              >
                Clear All
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Download Data Templates
              </CardTitle>
              <CardDescription>
                Download CSV templates with sample data to ensure your uploads match the expected format.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SOURCE_TYPES.map((sourceType) => (
                  <Card key={sourceType.value} className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-medium">{sourceType.label}</h3>
                        <p className="text-sm text-gray-500 mt-1">{sourceType.description}</p>
                      </div>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadTemplate(sourceType.value)}
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download {sourceType.label} Template
                        </Button>
                        <div className="text-xs text-gray-400">
                          Includes sample data and required column headers
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Template Information */}
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Template Guidelines:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Keep column headers exactly as shown in templates</li>
                      <li>• Date formats should be YYYY-MM-DD</li>
                      <li>• Numbers should not include currency symbols or commas</li>
                      <li>• Required fields must have values in every row</li>
                      <li>• Remove sample data rows before uploading your data</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
