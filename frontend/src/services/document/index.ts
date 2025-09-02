// Document services exports
export { 
  uploadDocument, 
  getDocuments, 
  updateDocumentStatus, 
  deleteDocument, 
  getDocumentTemplates,
  updateJsonMetadata
} from './documentStorage';

export { EnhancedIssuerDocumentUploadService } from './enhancedIssuerDocumentUploadService';

// Re-export for convenience
export type {
  DocumentMetadata
} from './documentStorage';