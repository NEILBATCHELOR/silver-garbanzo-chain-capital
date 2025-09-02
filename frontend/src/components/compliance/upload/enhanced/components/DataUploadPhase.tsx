/**
 * Data Upload Phase Component
 * 
 * Reusable component for handling data upload (Phase 1)
 * Supports both CSV and XLSX with drag/drop, validation, and preview
 */

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  Check,
  X,
  Loader2,
  FileSpreadsheet,
  Info,
  XCircle,
  CheckCircle
} from 'lucide-react';
import { enhancedUploadService } from '../services';
import { validationService } from '../services';
import { useUploadValidation } from '../hooks';
import type {
  UploadEntityType,
  UploadFileFormat,
  DataUploadConfig,
  DataUploadResult,
  UploadProgress
} from '../types/uploadTypes';
import type { ValidationError } from '../types/validationTypes';

export interface DataUploadPhaseProps {
  entityType: UploadEntityType;
  config?: Partial<DataUploadConfig>;
  onComplete?: (result: DataUploadResult) => void;
  onProgress?: (progress: UploadProgress) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export const DataUploadPhase: React.FC<DataUploadPhaseProps> = ({
  entityType,
  config = {},
  onComplete,
  onProgress,
  onCancel,
  disabled = false
}) => {
  // State
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileFormat, setFileFormat] = useState<UploadFileFormat>('csv');
  const [hasHeaders, setHasHeaders] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([]);
  const [uploadResult, setUploadResult] = useState<DataUploadResult | null>(null);
  
  // Validation options
  const [validationMode, setValidationMode] = useState<'strict' | 'lenient' | 'quick' | 'bypass'>('lenient');
  const [showValidationOptions, setShowValidationOptions] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Default config
  const defaultConfig: DataUploadConfig = {
    entityType,
    fileFormat,
    hasHeaders,
    batchSize: 100,
    allowDuplicates: true,
    duplicateAction: 'update',
    validation: {
      strictMode: validationMode === 'strict',
      lenientMode: validationMode === 'lenient',
      bypassValidation: validationMode === 'bypass',
      quickValidation: validationMode === 'quick',
      requiredFields: entityType === 'investor' ? ['name', 'email'] : ['name'],
      customValidators: {},
      dataTransformers: {}
    }
  };

  const finalConfig = { ...defaultConfig, ...config, fileFormat, hasHeaders };

  // Validation hook
  const {
    isValidating,
    validationErrors,
    validationWarnings,
    hasErrors,
    hasWarnings,
    validRowCount,
    invalidRowCount,
    validateData,
    clearValidation
  } = useUploadValidation({ 
    entityType,
    bypassValidation: finalConfig.validation.bypassValidation,
    lenientMode: finalConfig.validation.lenientMode,
    strictMode: finalConfig.validation.strictMode,
    quickValidation: finalConfig.validation.quickValidation
  });

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || !e.dataTransfer.files?.[0]) return;

    const droppedFile = e.dataTransfer.files[0];
    const extension = droppedFile.name.split('.').pop()?.toLowerCase();
    
    if (['csv', 'xlsx', 'xls'].includes(extension || '')) {
      setFile(droppedFile);
      setFileFormat(extension === 'csv' ? 'csv' : 'xlsx');
      validateAndPreviewFile(droppedFile, extension === 'csv' ? 'csv' : 'xlsx');
    }
  }, [disabled]);

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files?.[0]) return;

    const selectedFile = e.target.files[0];
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (['csv', 'xlsx', 'xls'].includes(extension || '')) {
      setFile(selectedFile);
      setFileFormat(extension === 'csv' ? 'csv' : 'xlsx');
      validateAndPreviewFile(selectedFile, extension === 'csv' ? 'csv' : 'xlsx');
    }
  }, [disabled]);

  // Validate and preview file
  const validateAndPreviewFile = useCallback(async (
    fileToProcess: File, 
    format: UploadFileFormat
  ) => {
    try {
      clearValidation();
      setParsedData([]);
      
      // Parse file
      const data = await enhancedUploadService.parseFile(fileToProcess, format, hasHeaders);
      setParsedData(data);
      
      // Validate data
      if (data.length > 0) {
        await validateData(data);
      }
    } catch (error) {
      console.error('File validation failed:', error);
    }
  }, [hasHeaders, validateData, clearValidation]);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!file || hasErrors || isUploading) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const progressHandler = (progress: UploadProgress) => {
        setUploadProgress(progress.percentage);
        onProgress?.(progress);
      };

      const result = await enhancedUploadService.uploadData(
        file,
        finalConfig,
        progressHandler
      );

      setUploadResult(result);
      onComplete?.(result);

    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [file, hasErrors, isUploading, finalConfig, onProgress, onComplete]);

  // Download template
  const downloadTemplate = useCallback((format: UploadFileFormat) => {
    enhancedUploadService.generateTemplate(entityType, format);
  }, [entityType]);

  // Clear file
  const clearFile = useCallback(() => {
    setFile(null);
    setParsedData([]);
    setUploadResult(null);
    clearValidation();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [clearValidation]);

  // Download validation errors as CSV
  const downloadValidationErrorsCSV = useCallback(() => {
    if (parsedData.length > 0) {
      validationService.downloadValidationErrorsCSV(
        validationErrors,
        validationWarnings,
        parsedData,
        entityType
      );
    }
  }, [validationErrors, validationWarnings, parsedData, entityType]);

  // Download validation errors as Excel
  const downloadValidationErrorsExcel = useCallback(() => {
    if (parsedData.length > 0) {
      validationService.downloadValidationErrorsExcel(
        validationErrors,
        validationWarnings,
        parsedData,
        entityType
      );
    }
  }, [validationErrors, validationWarnings, parsedData, entityType]);

  // Re-validate when headers setting or validation mode changes
  React.useEffect(() => {
    if (file) {
      validateAndPreviewFile(file, fileFormat);
    }
  }, [hasHeaders, file, fileFormat, validateAndPreviewFile]);

  // Update validation configuration when validation mode changes
  React.useEffect(() => {
    if (parsedData.length > 0) {
      validateData(parsedData);
    }
  }, [validationMode, validateData]);

  const formatLabel = entityType === 'investor' ? 'Investor' : 'Issuer';

  return (
    <Card className="w-full">
      <CardHeader className="pb-4 pt-6">
        <CardTitle className="text-xl font-semibold">
          Upload {formatLabel} Data
        </CardTitle>
        <CardDescription className="mt-2">
          Upload a CSV or Excel file containing {formatLabel.toLowerCase()} information. 
          Download the template to see the required format.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-4">
        {/* Template Downloads */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate('csv')}
                disabled={disabled}
                className="flex items-center space-x-2"
              >
                <Download className="h-3 w-3" />
                <span>Comprehensive CSV</span>
                <Badge variant="secondary" className="text-xs">All Fields</Badge>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate('xlsx')}
                disabled={disabled}
                className="flex items-center space-x-2"
              >
                <Download className="h-3 w-3" />
                <span>Comprehensive Excel</span>
                <Badge variant="secondary" className="text-xs">All Fields</Badge>
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => enhancedUploadService.generateBasicTemplate(entityType, 'csv')}
                disabled={disabled}
                className="flex items-center space-x-2"
              >
                <Download className="h-3 w-3" />
                <span>Basic CSV</span>
                <Badge variant="outline" className="text-xs">Essential Only</Badge>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => enhancedUploadService.generateBasicTemplate(entityType, 'xlsx')}
                disabled={disabled}
                className="flex items-center space-x-2"
              >
                <Download className="h-3 w-3" />
                <span>Basic Excel</span>
                <Badge variant="outline" className="text-xs">Essential Only</Badge>
              </Button>
            </div>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Template Options</AlertTitle>
            <AlertDescription className="text-sm">
              <strong>Comprehensive templates</strong> include ALL {entityType === 'investor' ? '25+' : '18+'} database fields with complete JSON examples for advanced data import.
              <br />
              <strong>Basic templates</strong> include only essential fields for quick setup and easy data entry.
            </AlertDescription>
          </Alert>
        </div>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          {!file ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-medium">
                  Drag & Drop File or Click to Browse
                </h3>
                <p className="text-xs text-muted-foreground">
                  Supports CSV, XLSX, and XLS files
                </p>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                disabled={disabled}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="rounded-full bg-primary/10 p-3">
                {fileFormat === 'csv' ? (
                  <FileText className="h-6 w-6 text-primary" />
                ) : (
                  <FileSpreadsheet className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-medium">{file.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {fileFormat.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {parsedData.length} rows
                  </Badge>
                  {validRowCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {validRowCount} valid
                    </Badge>
                  )}
                  {invalidRowCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {invalidRowCount} invalid
                    </Badge>
                  )}
                </div>
              </div>
              
              {isUploading && (
                <div className="w-full max-w-xs">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-center mt-1 text-muted-foreground">
                    Processing {uploadProgress}%
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  disabled={isUploading || disabled}
                >
                  <X className="mr-2 h-3 w-3" />
                  Clear File
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpload();
                  }}
                  disabled={isUploading || hasErrors || parsedData.length === 0 || disabled}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-3 w-3" />
                      Upload Data
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* File Options */}
        {file && (
          <div className="space-y-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasHeaders"
                  checked={hasHeaders}
                  onCheckedChange={(checked) => setHasHeaders(!!checked)}
                  disabled={isUploading || disabled}
                />
                <Label htmlFor="hasHeaders" className="text-sm">
                  File has header row
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Label className="text-sm font-medium">Format:</Label>
                <Badge variant="outline">
                  {fileFormat.toUpperCase()}
                </Badge>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowValidationOptions(!showValidationOptions)}
                className="flex items-center space-x-2"
                disabled={isUploading || disabled}
              >
                <Info className="h-3 w-3" />
                <span>Validation Options</span>
              </Button>
            </div>
            
            {/* Validation Options */}
            {showValidationOptions && (
              <Card className="p-4 bg-slate-50">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Data Validation Mode</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="lenient"
                        name="validationMode"
                        value="lenient"
                        checked={validationMode === 'lenient'}
                        onChange={(e) => setValidationMode(e.target.value as any)}
                        disabled={isUploading || disabled}
                      />
                      <Label htmlFor="lenient" className="text-sm">
                        <div>
                          <strong>Lenient (Recommended)</strong>
                          <div className="text-xs text-muted-foreground">Accepts most data, converts JSON errors to warnings</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="quick"
                        name="validationMode"
                        value="quick"
                        checked={validationMode === 'quick'}
                        onChange={(e) => setValidationMode(e.target.value as any)}
                        disabled={isUploading || disabled}
                      />
                      <Label htmlFor="quick" className="text-sm">
                        <div>
                          <strong>Quick</strong>
                          <div className="text-xs text-muted-foreground">Only validates required fields (name, email)</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="strict"
                        name="validationMode"
                        value="strict"
                        checked={validationMode === 'strict'}
                        onChange={(e) => setValidationMode(e.target.value as any)}
                        disabled={isUploading || disabled}
                      />
                      <Label htmlFor="strict" className="text-sm">
                        <div>
                          <strong>Strict</strong>
                          <div className="text-xs text-muted-foreground">Full validation with strict rules</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="bypass"
                        name="validationMode"
                        value="bypass"
                        checked={validationMode === 'bypass'}
                        onChange={(e) => setValidationMode(e.target.value as any)}
                        disabled={isUploading || disabled}
                      />
                      <Label htmlFor="bypass" className="text-sm">
                        <div>
                          <strong>Bypass</strong>
                          <div className="text-xs text-muted-foreground">Skip all validation (use with caution)</div>
                        </div>
                      </Label>
                    </div>
                  </div>
                  
                  {validationMode === 'bypass' && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Warning</AlertTitle>
                      <AlertDescription className="text-sm">
                        Bypassing validation may result in invalid data being uploaded to the database. Only use this option if you're confident your data is correctly formatted.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Validation Results */}
        {(hasErrors || hasWarnings) && (
          <div className="space-y-4">
            {hasErrors && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle className="text-base font-medium">
                  Validation Errors ({validationErrors.length})
                </AlertTitle>
                <AlertDescription>
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    {validationErrors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm py-1">
                        Row {error.row}, {error.field}: {error.message}
                      </div>
                    ))}
                    {validationErrors.length > 10 && (
                      <div className="text-sm py-1 font-medium">
                        ... and {validationErrors.length - 10} more errors
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadValidationErrorsCSV()}
                      className="flex items-center space-x-2"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download CSV</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadValidationErrorsExcel()}
                      className="flex items-center space-x-2"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download Excel</span>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {hasWarnings && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-base font-medium">
                  Validation Warnings ({validationWarnings.length})
                </AlertTitle>
                <AlertDescription>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {validationWarnings.slice(0, 5).map((warning, index) => (
                      <div key={index} className="text-sm py-1">
                        Row {warning.row}, {warning.field}: {warning.message}
                      </div>
                    ))}
                    {validationWarnings.length > 5 && (
                      <div className="text-sm py-1 font-medium">
                        ... and {validationWarnings.length - 5} more warnings
                      </div>
                    )}
                  </div>
                  {!hasErrors && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadValidationErrorsCSV()}
                        className="flex items-center space-x-2"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download CSV</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadValidationErrorsExcel()}
                        className="flex items-center space-x-2"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download Excel</span>
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <Alert variant={uploadResult.success ? "default" : "destructive"}>
            {uploadResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>Upload Result</AlertTitle>
            <AlertDescription>
              {uploadResult.success ? (
                `Successfully uploaded ${uploadResult.details?.processed || 0} ${formatLabel.toLowerCase()}(s)`
              ) : (
                uploadResult.error || 'Upload failed'
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Data Preview */}
        {parsedData.length > 0 && (
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Data Preview</TabsTrigger>
              <TabsTrigger value="validation">
                Validation ({validRowCount}/{parsedData.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="space-y-2">
              <div className="rounded-md border overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="bg-muted/30 border-b">
                        {Object.keys(parsedData[0] || {}).slice(0, 6).map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-medium">
                            {key.replace(/_/g, ' ').toUpperCase()}
                          </th>
                        ))}
                        {Object.keys(parsedData[0] || {}).length > 6 && (
                          <th className="px-3 py-2 text-left font-medium">...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 50).map((row, index) => (
                        <tr 
                          key={index} 
                          className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                        >
                          {Object.keys(parsedData[0] || {}).slice(0, 6).map((key) => (
                            <td key={key} className="px-3 py-1.5 max-w-[150px] truncate">
                              {String(row[key] || '')}
                            </td>
                          ))}
                          {Object.keys(parsedData[0] || {}).length > 6 && (
                            <td className="px-3 py-1.5 text-muted-foreground">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {parsedData.length > 50 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing first 50 rows of {parsedData.length} total rows
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="validation" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {validRowCount}
                  </div>
                  <div className="text-sm text-green-700">Valid Rows</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {invalidRowCount}
                  </div>
                  <div className="text-sm text-red-700">Invalid Rows</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {validationWarnings.length}
                  </div>
                  <div className="text-sm text-yellow-700">Warnings</div>
                </div>
              </div>

              {/* Enhanced Error Display */}
              {(hasErrors || hasWarnings) && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Validation Issues</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadValidationErrorsCSV()}
                        className="flex items-center space-x-2"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download All Issues (CSV)</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadValidationErrorsExcel()}
                        className="flex items-center space-x-2"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download All Issues (Excel)</span>
                      </Button>
                    </div>
                  </div>

                  {/* Detailed Error List */}
                  <div className="rounded-md border overflow-hidden">
                    <div className="max-h-[400px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="bg-muted/30 border-b">
                            <th className="px-3 py-2 text-left font-medium">Row</th>
                            <th className="px-3 py-2 text-left font-medium">Severity</th>
                            <th className="px-3 py-2 text-left font-medium">Field</th>
                            <th className="px-3 py-2 text-left font-medium">Current Value</th>
                            <th className="px-3 py-2 text-left font-medium">Issue</th>
                            <th className="px-3 py-2 text-left font-medium">Solution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...validationErrors, ...validationWarnings]
                            .sort((a, b) => a.row - b.row)
                            .slice(0, 100)
                            .map((issue, index) => {
                              const enhanced = validationService.getEnhancedErrorMessage(issue, parsedData[issue.row - 2] || {});
                              return (
                                <tr 
                                  key={index} 
                                  className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50"} ${issue.severity === 'error' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-yellow-500'}`}
                                >
                                  <td className="px-3 py-2 font-medium">{issue.row}</td>
                                  <td className="px-3 py-2">
                                    <Badge 
                                      variant={issue.severity === 'error' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {issue.severity.toUpperCase()}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 font-medium">{issue.field}</td>
                                  <td className="px-3 py-2 max-w-[120px] truncate">
                                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                      {String(issue.value || '(empty)')}
                                    </code>
                                  </td>
                                  <td className="px-3 py-2 max-w-[200px]">
                                    <div className="text-xs text-gray-600">{enhanced.error}</div>
                                  </td>
                                  <td className="px-3 py-2 max-w-[250px]">
                                    <div className="text-xs text-blue-600">{enhanced.solution}</div>
                                    {enhanced.example && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        <strong>Example:</strong> <code className="bg-gray-100 px-1 py-0.5 rounded">{enhanced.example}</code>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {(validationErrors.length + validationWarnings.length) > 100 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Showing first 100 issues of {validationErrors.length + validationWarnings.length} total. 
                      Download the full report to see all issues.
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}



        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={isUploading || disabled}
          >
            Cancel
          </Button>
          {!uploadResult?.success && (
            <Button
              onClick={handleUpload}
              disabled={!file || hasErrors || parsedData.length === 0 || isUploading || disabled}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload ${formatLabel} Data`
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DataUploadPhase;
