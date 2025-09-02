/**
 * Organization Assignment Import/Export Component
 * UI for CSV import/export of organization assignments
 */

import React, { useState, useRef } from 'react';
import { Download, Upload, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Services
import OrganizationAssignmentImportExportService, { 
  type ImportResult,
  type ExportOptions
} from './organizationAssignmentImportExportService';
import type { AdvancedFilterOptions } from './AdvancedOrganizationFilters';

interface OrganizationAssignmentImportExportProps {
  exportFilters?: AdvancedFilterOptions;
  onImportComplete?: (result: ImportResult) => void;
  onExportComplete?: (recordCount: number) => void;
}

const OrganizationAssignmentImportExport: React.FC<OrganizationAssignmentImportExportProps> = ({
  exportFilters = {},
  onImportComplete,
  onExportComplete
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeHeaders: true,
    format: 'csv',
    ...exportFilters
  });
  const [exporting, setExporting] = useState(false);

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [csvContent, setCsvContent] = useState<string>('');
  const [importOptions, setImportOptions] = useState({
    hasHeaders: true,
    mode: 'replace' as 'replace' | 'merge' | 'append',
    validateOnly: false
  });
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    rowCount: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: '', description: '', action: () => {} });

  const handleExport = async () => {
    try {
      setExporting(true);

      const result = await OrganizationAssignmentImportExportService.exportToCSV(exportOptions);

      // Download the file
      OrganizationAssignmentImportExportService.downloadCSV(result.csvContent, result.filename);

      toast({
        title: 'Export Complete',
        description: `Successfully exported ${result.recordCount} organization assignments to ${result.filename}`,
      });

      setExportOpen(false);
      onExportComplete?.(result.recordCount);
    } catch (error) {
      console.error('Failed to export assignments:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export assignments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      validateCSV(content);
    };
    reader.readAsText(file);
  };

  const validateCSV = (content: string) => {
    try {
      const result = OrganizationAssignmentImportExportService.validateCSVFormat(content);
      setValidationResult(result);
      
      if (result.hasHeaders !== importOptions.hasHeaders) {
        setImportOptions(prev => ({ ...prev, hasHeaders: result.hasHeaders }));
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        rowCount: 0
      });
    }
  };

  const handleImport = async () => {
    if (!csvContent) {
      toast({
        title: 'No Data',
        description: 'Please upload a CSV file first.',
        variant: 'destructive',
      });
      return;
    }

    if (validationResult && !validationResult.isValid) {
      toast({
        title: 'Invalid CSV',
        description: 'Please fix the validation errors before importing.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setImporting(true);

      const result = await OrganizationAssignmentImportExportService.importFromCSV(csvContent, importOptions);
      setImportResult(result);

      if (result.success) {
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${result.successfulImports} of ${result.totalRows} assignments.`,
        });
      } else {
        toast({
          title: 'Import Partial Success',
          description: `Imported ${result.successfulImports} of ${result.totalRows} assignments. ${result.failedImports} failed.`,
          variant: 'destructive',
        });
      }

      onImportComplete?.(result);
    } catch (error) {
      console.error('Failed to import assignments:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import assignments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = OrganizationAssignmentImportExportService.generateImportTemplate();
    OrganizationAssignmentImportExportService.downloadCSV(template, 'organization-assignments-template.csv');
    
    toast({
      title: 'Template Downloaded',
      description: 'CSV template downloaded successfully. Use this as a reference for your import file.',
    });
  };

  const resetImport = () => {
    setCsvContent('');
    setValidationResult(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Import / Export
        </CardTitle>
        <CardDescription>
          Import and export organization assignments via CSV files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {/* Export Dialog */}
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Export Organization Assignments</DialogTitle>
                <DialogDescription>
                  Export assignment data to a CSV file with current filters applied.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-headers"
                    checked={exportOptions.includeHeaders}
                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeHeaders: checked }))}
                  />
                  <Label htmlFor="include-headers">Include column headers</Label>
                </div>

                <div className="space-y-2">
                  <Label>File Format</Label>
                  <Select 
                    value={exportOptions.format || 'csv'} 
                    onValueChange={(value) => setExportOptions(prev => ({ ...prev, format: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="json">JSON (.json)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {Object.keys(exportFilters).length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium mb-2">Active Filters:</div>
                    <div className="flex flex-wrap gap-1">
                      {exportFilters.searchQuery && (
                        <Badge variant="secondary" className="text-xs">
                          Search: {exportFilters.searchQuery}
                        </Badge>
                      )}
                      {exportFilters.assignmentMode && (
                        <Badge variant="secondary" className="text-xs">
                          Mode: {exportFilters.assignmentMode}
                        </Badge>
                      )}
                      {exportFilters.userIds?.length && (
                        <Badge variant="secondary" className="text-xs">
                          Users: {exportFilters.userIds.length}
                        </Badge>
                      )}
                      {exportFilters.organizationIds?.length && (
                        <Badge variant="secondary" className="text-xs">
                          Organizations: {exportFilters.organizationIds.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setExportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleExport} disabled={exporting}>
                  {exporting ? 'Exporting...' : 'Export'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Import Dialog */}
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Organization Assignments</DialogTitle>
                <DialogDescription>
                  Import assignment data from a CSV file. Use the template for correct format.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="paste">Paste Data</TabsTrigger>
                  <TabsTrigger value="template">Template</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label>CSV File</Label>
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="flex-1 text-sm"
                      />
                      <Button variant="outline" size="sm" onClick={resetImport}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="paste" className="space-y-4">
                  <div className="space-y-2">
                    <Label>CSV Data</Label>
                    <Textarea
                      value={csvContent}
                      onChange={(e) => {
                        setCsvContent(e.target.value);
                        if (e.target.value) {
                          validateCSV(e.target.value);
                        } else {
                          setValidationResult(null);
                        }
                      }}
                      placeholder="Paste your CSV data here..."
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="template" className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    Download a CSV template with the correct format and sample data:
                  </div>
                  <Button onClick={downloadTemplate} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    The template includes column headers and sample rows. Replace the sample data with your actual assignment data.
                  </div>
                </TabsContent>
              </Tabs>

              {/* Import Options */}
              {csvContent && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="has-headers"
                        checked={importOptions.hasHeaders}
                        onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, hasHeaders: checked }))}
                      />
                      <Label htmlFor="has-headers">First row contains headers</Label>
                    </div>

                    <div className="space-y-2">
                      <Label>Import Mode</Label>
                      <Select 
                        value={importOptions.mode} 
                        onValueChange={(value) => setImportOptions(prev => ({ ...prev, mode: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="replace">Replace - Remove existing assignments and add new ones</SelectItem>
                          <SelectItem value="merge">Merge - Update existing and add new assignments</SelectItem>
                          <SelectItem value="append">Append - Add new assignments only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Validation Results */}
                  {validationResult && (
                    <div className={`p-3 rounded-lg ${validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {validationResult.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">
                          {validationResult.isValid ? 'Validation Passed' : 'Validation Failed'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        Found {validationResult.rowCount} data rows
                      </div>

                      {validationResult.errors.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-red-600">Errors:</div>
                          <div className="max-h-32 overflow-y-auto">
                            {validationResult.errors.map((error, index) => (
                              <div key={index} className="text-xs text-red-600">
                                • {error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Import Results */}
                  {importResult && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="text-sm font-medium mb-2">Import Results:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Total Rows: {importResult.totalRows}</div>
                        <div>Successful: {importResult.successfulImports}</div>
                        <div>Failed: {importResult.failedImports}</div>
                        <div>Users Processed: {importResult.summary.usersProcessed}</div>
                      </div>
                      
                      {importResult.errors.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium text-red-600 mb-1">Errors:</div>
                          <div className="max-h-24 overflow-y-auto">
                            {importResult.errors.slice(0, 5).map((error, index) => (
                              <div key={index} className="text-xs text-red-600">
                                Row {error.row}: {error.error}
                              </div>
                            ))}
                            {importResult.errors.length > 5 && (
                              <div className="text-xs text-muted-foreground">
                                ... and {importResult.errors.length - 5} more errors
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setImportOpen(false)}>
                  Cancel
                </Button>
                {csvContent && validationResult?.isValid && (
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? 'Importing...' : 'Import Assignments'}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrganizationAssignmentImportExport;
