/**
 * Document Upload Phase Component
 * 
 * Reusable component for handling document upload (Phase 2)
 * Links documents to uploaded entities with automatic categorization
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  FileText,
  X,
  Loader2,
  Link,
  UnlinkIcon,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  Users,
  Building
} from 'lucide-react';
import { integrationService } from '../services';
import type { UploadDocumentType, ExtendedDocumentType } from '@/types/core/documentTypes';
import type { Investor, Organization } from '@/types/core/centralModels';
import type {
  UploadEntityType,
  UploadDocument,
  DocumentUploadConfig,
  DocumentUploadResult,
  UploadProgress
} from '../types/uploadTypes';
import type { EntityDocumentLink } from '../services/integrationService';

export interface DocumentUploadPhaseProps {
  entityType: UploadEntityType;
  entities: (Investor | Organization)[];
  config?: Partial<DocumentUploadConfig>;
  onComplete?: (result: DocumentUploadResult) => void;
  onProgress?: (progress: UploadProgress) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export const DocumentUploadPhase: React.FC<DocumentUploadPhaseProps> = ({
  entityType,
  entities,
  config = {},
  onComplete,
  onProgress,
  onCancel,
  disabled = false
}) => {
  // State
  const [isDragging, setIsDragging] = useState(false);
  const [documents, setDocuments] = useState<UploadDocument[]>([]);
  const [entityLinks, setEntityLinks] = useState<EntityDocumentLink[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<DocumentUploadResult | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [autoLinking, setAutoLinking] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default config
  const defaultConfig: DocumentUploadConfig = {
    allowedTypes: integrationService.getRecommendedDocumentTypes(entityType),
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 50,
    generateThumbnails: true,
    generatePreviews: true,
    concurrentUploads: 3,
    autoLink: true
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Computed values
  const linkedDocuments = useMemo(
    () => documents.filter(doc => doc.entityId),
    [documents]
  );

  const unlinkedDocuments = useMemo(
    () => documents.filter(doc => !doc.entityId),
    [documents]
  );

  const totalDocuments = documents.length;
  const totalLinked = linkedDocuments.length;

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

    if (disabled || !e.dataTransfer.files) return;

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  }, [disabled]);

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;

    const files = Array.from(e.target.files);
    handleFileSelection(files);
  }, [disabled]);

  // Handle file selection
  const handleFileSelection = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Filter valid files
    const validFiles = files.filter(file => {
      const isValidSize = file.size <= finalConfig.maxFileSize;
      const isValidType = file.type.startsWith('image/') || 
                         file.type === 'application/pdf' ||
                         file.type.includes('document') ||
                         file.type.includes('spreadsheet');
      return isValidSize && isValidType;
    });

    if (validFiles.length === 0) {
      return;
    }

    // Check file limit
    if (documents.length + validFiles.length > finalConfig.maxFiles) {
      return;
    }

    try {
      // Categorize documents
      const newDocuments: UploadDocument[] = [];
      
      for (const file of validFiles) {
        const documentType = await integrationService.categorizeDocument(file);
        
        newDocuments.push({
          file,
          documentType,
          status: 'pending',
          progress: 0,
          metadata: {
            originalName: file.name,
            fileSize: file.size,
            uploadedAt: new Date().toISOString()
          }
        });
      }

      setDocuments(prev => [...prev, ...newDocuments]);

      // Auto-link if enabled and entities exist
      if (finalConfig.autoLink && entities.length > 0) {
        await autoLinkDocuments([...documents, ...newDocuments]);
      }

    } catch (error) {
      console.error('Error processing files:', error);
    }
  }, [documents, entities, finalConfig.maxFileSize, finalConfig.maxFiles, finalConfig.autoLink]);

  // Auto-link documents to entities
  const autoLinkDocuments = useCallback(async (docsToLink?: UploadDocument[]) => {
    if (entities.length === 0) return;

    setAutoLinking(true);
    
    try {
      const targetDocs = docsToLink || documents;
      const files = targetDocs.map(doc => doc.file);
      
      const links = await integrationService.linkDocumentsToEntities(
        entities,
        files,
        entityType,
        {
          autoLinkByEmail: true,
          autoLinkByName: true,
          requireManualSelection: false
        }
      );

      setEntityLinks(links);

      // Update documents with entity links
      setDocuments(prev => prev.map(doc => {
        const link = links.find(el => 
          el.documents.some(d => d.file.name === doc.file.name)
        );
        
        if (link) {
          return {
            ...doc,
            entityId: link.entityId,
            metadata: {
              ...doc.metadata,
              linkedEntityName: link.entityName,
              linkingReason: 'auto_linked'
            }
          };
        }
        
        return doc;
      }));

    } catch (error) {
      console.error('Auto-linking failed:', error);
    } finally {
      setAutoLinking(false);
    }
  }, [entities, documents, entityType]);

  // Remove document
  const removeDocument = useCallback((index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update document type
  const updateDocumentType = useCallback((index: number, documentType: UploadDocumentType) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, documentType } : doc
    ));
  }, []);

  // Link document to entity
  const linkDocumentToEntity = useCallback((documentIndex: number, entityId: string) => {
    const entity = entities.find(e => {
      const id = entityType === 'investor' ? (e as Investor).id : (e as Organization).id;
      return id === entityId;
    });

    setDocuments(prev => prev.map((doc, i) => 
      i === documentIndex ? {
        ...doc,
        entityId,
        metadata: {
          ...doc.metadata,
          linkedEntityName: entity?.name,
          linkingReason: 'manual'
        }
      } : doc
    ));
  }, [entities, entityType]);

  // Upload documents
  const handleUpload = useCallback(async () => {
    if (documents.length === 0 || isUploading) return;

    // Validate all documents have entity links
    const unlinked = documents.filter(doc => !doc.entityId);
    if (unlinked.length > 0) {
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const progressHandler = (progress: UploadProgress) => {
        setUploadProgress(progress.percentage);
        onProgress?.(progress);
      };

      // Update documents status to uploading
      setDocuments(prev => prev.map(doc => ({
        ...doc,
        status: 'uploading' as const
      })));

      // Use the enhanced upload service
      const { enhancedUploadService } = await import('../services');
      const result = await enhancedUploadService.uploadDocuments(
        documents,
        finalConfig,
        progressHandler
      );

      setUploadResult(result);

      if (result.success) {
        // Update documents with upload results
        setDocuments(prev => prev.map(doc => {
          const uploaded = result.data?.documents.find(d => d.file.name === doc.file.name);
          return uploaded ? { ...doc, ...uploaded, status: 'completed' as const } : doc;
        }));
      }

      onComplete?.(result);

    } catch (error) {
      console.error('Upload failed:', error);
      setDocuments(prev => prev.map(doc => ({
        ...doc,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : 'Upload failed'
      })));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [documents, isUploading, finalConfig, onProgress, onComplete]);

  // Clear all documents
  const clearDocuments = useCallback(() => {
    setDocuments([]);
    setEntityLinks([]);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatLabel = entityType === 'investor' ? 'Investor' : 'Issuer';

  return (
    <Card className="w-full">
      <CardHeader className="pb-4 pt-6">
        <CardTitle className="text-xl font-semibold">
          Upload {formatLabel} Documents
        </CardTitle>
        <CardDescription className="mt-2">
          Upload supporting documents for your {formatLabel.toLowerCase()}s. 
          Documents will be automatically categorized and linked to entities.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-4">
        {/* Entity Summary */}
        {entities.length > 0 && (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertTitle>Ready to Link Documents</AlertTitle>
            <AlertDescription>
              You have {entities.length} {formatLabel.toLowerCase()}(s) available for document linking.
              {totalLinked > 0 && ` ${totalLinked} of ${totalDocuments} documents are currently linked.`}
            </AlertDescription>
          </Alert>
        )}

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
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium">
                Drag & Drop Documents or Click to Browse
              </h3>
              <p className="text-xs text-muted-foreground">
                Supports PDF, images, and office documents (max {Math.round(finalConfig.maxFileSize / 1024 / 1024)}MB per file)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Document Management */}
        {documents.length > 0 && (
          <div className="space-y-4">
            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading documents...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => autoLinkDocuments()}
                  disabled={entities.length === 0 || autoLinking || isUploading || disabled}
                >
                  {autoLinking ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Auto-linking...
                    </>
                  ) : (
                    <>
                      <Link className="mr-2 h-3 w-3" />
                      Auto-link Documents
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDocuments}
                  disabled={isUploading || disabled}
                >
                  <X className="mr-2 h-3 w-3" />
                  Clear All
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {totalDocuments} documents
                </Badge>
                <Badge variant={totalLinked === totalDocuments ? "default" : "secondary"}>
                  {totalLinked} linked
                </Badge>
              </div>
            </div>

            {/* Document Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">
                  All Documents ({totalDocuments})
                </TabsTrigger>
                <TabsTrigger value="linked">
                  Linked ({totalLinked})
                </TabsTrigger>
                <TabsTrigger value="unlinked">
                  Unlinked ({unlinkedDocuments.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <DocumentList
                  documents={documents}
                  entities={entities}
                  entityType={entityType}
                  onRemove={removeDocument}
                  onUpdateType={updateDocumentType}
                  onLinkEntity={linkDocumentToEntity}
                  disabled={isUploading || disabled}
                />
              </TabsContent>
              
              <TabsContent value="linked" className="mt-4">
                <DocumentList
                  documents={linkedDocuments}
                  entities={entities}
                  entityType={entityType}
                  onRemove={removeDocument}
                  onUpdateType={updateDocumentType}
                  onLinkEntity={linkDocumentToEntity}
                  disabled={isUploading || disabled}
                />
              </TabsContent>
              
              <TabsContent value="unlinked" className="mt-4">
                <DocumentList
                  documents={unlinkedDocuments}
                  entities={entities}
                  entityType={entityType}
                  onRemove={removeDocument}
                  onUpdateType={updateDocumentType}
                  onLinkEntity={linkDocumentToEntity}
                  disabled={isUploading || disabled}
                  showLinkingHelp
                />
              </TabsContent>
            </Tabs>
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
                `Successfully uploaded ${uploadResult.data?.documents.length || 0} document(s)`
              ) : (
                uploadResult.error || 'Document upload failed'
              )}
            </AlertDescription>
          </Alert>
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
              disabled={
                documents.length === 0 || 
                unlinkedDocuments.length > 0 || 
                isUploading || 
                disabled
              }
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload ${totalDocuments} Document(s)`
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Document List Component
interface DocumentListProps {
  documents: UploadDocument[];
  entities: (Investor | Organization)[];
  entityType: UploadEntityType;
  onRemove: (index: number) => void;
  onUpdateType: (index: number, type: UploadDocumentType) => void;
  onLinkEntity: (docIndex: number, entityId: string) => void;
  disabled?: boolean;
  showLinkingHelp?: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  entities,
  entityType,
  onRemove,
  onUpdateType,
  onLinkEntity,
  disabled = false,
  showLinkingHelp = false
}) => {
  const documentTypes = integrationService.getRecommendedDocumentTypes(entityType);

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {showLinkingHelp ? (
          <div className="space-y-2">
            <UnlinkIcon className="h-8 w-8 mx-auto" />
            <p>No unlinked documents</p>
            <p className="text-xs">All documents are linked to entities</p>
          </div>
        ) : (
          <div className="space-y-2">
            <FileText className="h-8 w-8 mx-auto" />
            <p>No documents uploaded</p>
            <p className="text-xs">Drag and drop files to get started</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showLinkingHelp && documents.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Link Required</AlertTitle>
          <AlertDescription>
            These documents need to be linked to {entityType}s before upload.
            Use the dropdown below each document or click "Auto-link Documents".
          </AlertDescription>
        </Alert>
      )}
      
      {documents.map((doc, index) => {
        const linkedEntity = entities.find(e => {
          const id = entityType === 'investor' ? (e as Investor).id : (e as Organization).id;
          return id === doc.entityId;
        });

        return (
          <Card key={index} className="p-4">
            <div className="flex items-start justify-between space-x-4">
              <div className="flex items-start space-x-3 flex-1">
                <div className="rounded-full bg-primary/10 p-2">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium truncate">
                      {doc.file.name}
                    </h4>
                    <Badge 
                      variant={doc.status === 'completed' ? 'default' : 
                               doc.status === 'failed' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {doc.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {Math.round(doc.file.size / 1024)} KB
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <Select
                      value={doc.documentType}
                      onValueChange={(value) => onUpdateType(index, value as UploadDocumentType)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-6 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map(type => (
                          <SelectItem key={type} value={type} className="text-xs">
                            {type.replace(/_/g, ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {doc.entityId && linkedEntity && (
                    <div className="flex items-center space-x-1 mt-2">
                      <Link className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">
                        Linked to {linkedEntity.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                {!doc.entityId && (
                  <Select
                    value={doc.entityId || ''}
                    onValueChange={(value) => onLinkEntity(index, value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-8 w-48 text-xs">
                      <SelectValue placeholder={`Select ${entityType}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map(entity => {
                        const id = entityType === 'investor' ? (entity as Investor).id : (entity as Organization).id;
                        return (
                          <SelectItem key={id} value={id!} className="text-xs">
                            <div className="flex items-center space-x-2">
                              {entityType === 'investor' ? (
                                <Users className="h-3 w-3" />
                              ) : (
                                <Building className="h-3 w-3" />
                              )}
                              <span>{entity.name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemove(index)}
                  disabled={disabled}
                  className="h-8"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default DocumentUploadPhase;
