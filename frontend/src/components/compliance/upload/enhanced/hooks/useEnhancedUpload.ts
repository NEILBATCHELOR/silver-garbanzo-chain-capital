/**
 * Enhanced Upload Hook
 * 
 * Main hook for managing upload state and orchestrating the upload process
 * Handles both data and document upload phases with progress tracking
 */

import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { enhancedUploadService, integrationService } from '../services';
import type {
  UploadSession,
  UploadEntityType,
  UploadPhase,
  UploadProgress,
  DataUploadConfig,
  DocumentUploadConfig,
  DataUploadResult,
  DocumentUploadResult,
  UploadDocument,
  UploadEventHandlers
} from '../types/uploadTypes';
import type { Investor, Organization } from '@/types/core/centralModels';

export interface UseEnhancedUploadOptions {
  entityType: UploadEntityType;
  dataConfig?: Partial<DataUploadConfig>;
  documentConfig?: Partial<DocumentUploadConfig>;
  eventHandlers?: UploadEventHandlers;
  autoAdvancePhases?: boolean;
}

export interface UseEnhancedUploadReturn {
  // State
  session: UploadSession | null;
  currentPhase: UploadPhase;
  isUploading: boolean;
  progress: UploadProgress | null;
  entities: (Investor | Organization)[];
  documents: UploadDocument[];
  
  // Data upload
  uploadData: (file: File) => Promise<DataUploadResult>;
  
  // Document upload
  uploadDocuments: (documents: UploadDocument[]) => Promise<DocumentUploadResult>;
  
  // Template download
  downloadTemplate: (format: 'csv' | 'xlsx') => void;
  
  // Phase management
  advanceToDocuments: () => void;
  completeUpload: () => void;
  resetUpload: () => void;
  
  // Session management (aliases for backward compatibility)
  startSession: () => UploadSession;
  completeSession: () => void;
  resetSession: () => void;
  
  // Document management
  addDocuments: (files: File[]) => UploadDocument[];
  removeDocument: (index: number) => void;
  updateDocumentType: (index: number, documentType: string) => void;
  linkDocumentToEntity: (documentIndex: number, entityId: string) => void;
  
  // Validation & linking
  categorizeDocuments: (files: File[]) => Promise<UploadDocument[]>;
  autoLinkDocuments: () => Promise<void>;
  
  // Results
  dataResult: DataUploadResult | null;
  documentResult: DocumentUploadResult | null;
  
  // Error handling
  lastError: string | null;
  clearError: () => void;
}

export const useEnhancedUpload = (options: UseEnhancedUploadOptions): UseEnhancedUploadReturn => {
  const { toast } = useToast();
  
  // State
  const [session, setSession] = useState<UploadSession | null>(null);
  const [currentPhase, setCurrentPhase] = useState<UploadPhase>('data');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [entities, setEntities] = useState<(Investor | Organization)[]>([]);
  const [documents, setDocuments] = useState<UploadDocument[]>([]);
  const [dataResult, setDataResult] = useState<DataUploadResult | null>(null);
  const [documentResult, setDocumentResult] = useState<DocumentUploadResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Refs for event handlers
  const eventHandlersRef = useRef(options.eventHandlers);
  eventHandlersRef.current = options.eventHandlers;

  // Default configurations
  const defaultDataConfig: DataUploadConfig = {
    entityType: options.entityType,
    fileFormat: 'csv',
    hasHeaders: true,
    batchSize: 100,
    allowDuplicates: true,
    duplicateAction: 'update',
    validation: {
      strictMode: false,
      requiredFields: options.entityType === 'investor' ? ['name', 'email'] : ['name'],
      customValidators: {},
      dataTransformers: {}
    }
  };

  const defaultDocumentConfig: DocumentUploadConfig = {
    allowedTypes: integrationService.getRecommendedDocumentTypes(options.entityType),
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 50,
    generateThumbnails: true,
    generatePreviews: true,
    concurrentUploads: 3,
    autoLink: true
  };

  const dataConfig = { ...defaultDataConfig, ...options.dataConfig };
  const documentConfig = { ...defaultDocumentConfig, ...options.documentConfig };

  // Progress handler
  const handleProgress = useCallback((newProgress: UploadProgress) => {
    setProgress(newProgress);
    eventHandlersRef.current?.onProgress?.(newProgress);
  }, []);

  // Error handler
  const handleError = useCallback((error: Error, context: string) => {
    const errorMessage = `${context}: ${error.message}`;
    setLastError(errorMessage);
    setIsUploading(false);
    
    toast({
      title: 'Upload Error',
      description: errorMessage,
      variant: 'destructive'
    });
    
    eventHandlersRef.current?.onError?.(error, context);
  }, [toast]);

  // Upload data (Phase 1)
  const uploadData = useCallback(async (file: File): Promise<DataUploadResult> => {
    try {
      setIsUploading(true);
      setLastError(null);
      setCurrentPhase('data');

      // Create session if needed
      let currentSession = session;
      if (!currentSession) {
        currentSession = enhancedUploadService.createSession(options.entityType);
        setSession(currentSession);
      }

      // Upload data
      const result = await enhancedUploadService.uploadData(
        file,
        dataConfig,
        handleProgress
      );

      setDataResult(result);

      if (result.success && result.data) {
        setEntities(result.data.entities);
        
        // Handle validation errors
        if (result.data.validationErrors.length > 0) {
          eventHandlersRef.current?.onValidationError?.(result.data.validationErrors);
        }

        // Handle duplicates
        if (result.data.duplicateHandling.length > 0) {
          eventHandlersRef.current?.onDuplicateFound?.(result.data.duplicateHandling);
        }

        toast({
          title: 'Data Upload Complete',
          description: `Successfully processed ${result.data.entities.length} ${options.entityType}(s)`,
          variant: 'default'
        });

        // Auto-advance to documents phase if enabled
        if (options.autoAdvancePhases) {
          setCurrentPhase('documents');
        }

        eventHandlersRef.current?.onPhaseComplete?.('data', result);
      } else {
        throw new Error(result.error || 'Data upload failed');
      }

      return result;

    } catch (error) {
      const errorResult: DataUploadResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: { entities: [], validationErrors: [], duplicateHandling: [] }
      };
      
      setDataResult(errorResult);
      handleError(error as Error, 'Data upload');
      return errorResult;
    } finally {
      setIsUploading(false);
    }
  }, [session, options.entityType, options.autoAdvancePhases, dataConfig, handleProgress, handleError, toast]);

  // Upload documents (Phase 2)
  const uploadDocuments = useCallback(async (docsToUpload: UploadDocument[]): Promise<DocumentUploadResult> => {
    try {
      setIsUploading(true);
      setLastError(null);
      setCurrentPhase('documents');

      // Validate document links
      const { valid, invalid } = await integrationService.validateDocumentLinks(
        docsToUpload,
        options.entityType
      );

      if (invalid.length > 0) {
        toast({
          title: 'Document Validation Warning',
          description: `${invalid.length} document(s) have invalid entity links`,
          variant: 'destructive'
        });
      }

      // Upload valid documents
      const result = await enhancedUploadService.uploadDocuments(
        valid,
        documentConfig,
        handleProgress
      );

      setDocumentResult(result);

      if (result.success) {
        // Update documents state with results
        setDocuments(prev => prev.map(doc => {
          const uploaded = result.data?.documents.find(d => d.file.name === doc.file.name);
          return uploaded || doc;
        }));

        toast({
          title: 'Document Upload Complete',
          description: `Successfully uploaded ${result.data?.documents.length || 0} document(s)`,
          variant: 'default'
        });

        eventHandlersRef.current?.onPhaseComplete?.('documents', result);
      } else {
        throw new Error(result.error || 'Document upload failed');
      }

      return result;

    } catch (error) {
      const errorResult: DocumentUploadResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: { documents: [], failed: [] }
      };
      
      setDocumentResult(errorResult);
      handleError(error as Error, 'Document upload');
      return errorResult;
    } finally {
      setIsUploading(false);
    }
  }, [options.entityType, documentConfig, handleProgress, handleError, toast]);

  // Download template
  const downloadTemplate = useCallback((format: 'csv' | 'xlsx') => {
    try {
      enhancedUploadService.generateTemplate(options.entityType, format);
      
      toast({
        title: 'Template Downloaded',
        description: `${options.entityType} template downloaded successfully`,
        variant: 'default'
      });
    } catch (error) {
      handleError(error as Error, 'Template download');
    }
  }, [options.entityType, handleError, toast]);

  // Phase management
  const advanceToDocuments = useCallback(() => {
    if (entities.length === 0) {
      toast({
        title: 'Cannot Advance',
        description: 'Please upload data first before adding documents',
        variant: 'destructive'
      });
      return;
    }
    
    setCurrentPhase('documents');
  }, [entities.length, toast]);

  const completeUpload = useCallback(() => {
    if (session) {
      const completedSession = enhancedUploadService.completeSession();
      setSession(completedSession);
      setCurrentPhase('complete');
      
      eventHandlersRef.current?.onComplete?.(completedSession!);
      
      toast({
        title: 'Upload Complete',
        description: 'All upload phases completed successfully',
        variant: 'default'
      });
    }
  }, [session, toast]);

  const resetUpload = useCallback(() => {
    setSession(null);
    setCurrentPhase('data');
    setIsUploading(false);
    setProgress(null);
    setEntities([]);
    setDocuments([]);
    setDataResult(null);
    setDocumentResult(null);
    setLastError(null);
  }, []);

  // Document management
  const addDocuments = useCallback((files: File[]): UploadDocument[] => {
    const newDocs = files.map(file => ({
      file,
      documentType: 'other' as const,
      status: 'pending' as const,
      progress: 0
    }));

    setDocuments(prev => [...prev, ...newDocs]);
    return newDocs;
  }, []);

  const removeDocument = useCallback((index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateDocumentType = useCallback((index: number, documentType: string) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, documentType: documentType as any } : doc
    ));
  }, []);

  const linkDocumentToEntity = useCallback((documentIndex: number, entityId: string) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === documentIndex ? { ...doc, entityId } : doc
    ));
  }, []);

  // Document categorization and linking
  const categorizeDocuments = useCallback(async (files: File[]): Promise<UploadDocument[]> => {
    const categorizedDocs: UploadDocument[] = [];

    for (const file of files) {
      const documentType = await integrationService.categorizeDocument(file);
      categorizedDocs.push({
        file,
        documentType,
        status: 'pending',
        progress: 0
      });
    }

    setDocuments(prev => [...prev, ...categorizedDocs]);
    return categorizedDocs;
  }, []);

  const autoLinkDocuments = useCallback(async () => {
    if (entities.length === 0 || documents.length === 0) return;

    try {
      const entityLinks = await integrationService.linkDocumentsToEntities(
        entities,
        documents.map(d => d.file),
        options.entityType,
        {
          autoLinkByEmail: true,
          autoLinkByName: true,
          requireManualSelection: false
        }
      );

      // Update documents with entity links
      setDocuments(prev => prev.map(doc => {
        const link = entityLinks.find(el => 
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

      const linkedCount = entityLinks.reduce((acc, link) => acc + link.documents.length, 0);
      
      toast({
        title: 'Auto-Linking Complete',
        description: `Automatically linked ${linkedCount} document(s)`,
        variant: 'default'
      });

    } catch (error) {
      handleError(error as Error, 'Auto-linking documents');
    }
  }, [entities, documents, options.entityType, handleError, toast]);

  // Session management (aliases for backward compatibility)
  const startSession = useCallback((): UploadSession => {
    if (!session) {
      const newSession = enhancedUploadService.createSession(options.entityType);
      setSession(newSession);
      return newSession;
    }
    return session;
  }, [session, options.entityType]);

  const completeSession = useCallback(() => {
    completeUpload();
  }, [completeUpload]);

  const resetSession = useCallback(() => {
    resetUpload();
  }, [resetUpload]);

  // Error management
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    // State
    session,
    currentPhase,
    isUploading,
    progress,
    entities,
    documents,
    
    // Data upload
    uploadData,
    
    // Document upload
    uploadDocuments,
    
    // Template download
    downloadTemplate,
    
    // Phase management
    advanceToDocuments,
    completeUpload,
    resetUpload,
    
    // Session management (aliases for backward compatibility)
    startSession,
    completeSession,
    resetSession,
    
    // Document management
    addDocuments,
    removeDocument,
    updateDocumentType,
    linkDocumentToEntity,
    
    // Validation & linking
    categorizeDocuments,
    autoLinkDocuments,
    
    // Results
    dataResult,
    documentResult,
    
    // Error handling
    lastError,
    clearError
  };
};
