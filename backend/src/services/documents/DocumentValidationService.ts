import { 
  Document,
  DocumentValidationResult,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentStatus,
  DocumentType,
  EntityType,
  DocumentCategory,
  FileValidationOptions,
  DocumentTemplate,
  WorkflowStatus
} from '@/types/document-service'

/**
 * Document Validation Service
 * 
 * Provides comprehensive validation for document operations including:
 * - Field validation and business rules
 * - File validation (size, type, content)
 * - Compliance and regulatory validation
 * - Entity-specific validation rules
 * - Template-based validation
 */
export class DocumentValidationService {

  // Default file validation settings
  private readonly DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly DEFAULT_ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];
  private readonly DEFAULT_ALLOWED_EXTENSIONS = [
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', 
    '.xls', '.xlsx', '.txt', '.csv'
  ];

  // Required fields by document type
  private readonly REQUIRED_FIELDS_BY_TYPE: Record<string, string[]> = {
    [DocumentType.CERTIFICATE_INCORPORATION]: ['name', 'type', 'entity_id', 'entity_type', 'file_url'],
    [DocumentType.FINANCIAL_STATEMENTS]: ['name', 'type', 'entity_id', 'entity_type', 'file_url', 'expiry_date'],
    [DocumentType.DIRECTOR_LIST]: ['name', 'type', 'entity_id', 'entity_type', 'file_url'],
    [DocumentType.SHAREHOLDER_REGISTER]: ['name', 'type', 'entity_id', 'entity_type', 'file_url'],
    [DocumentType.REGULATORY_STATUS]: ['name', 'type', 'entity_id', 'entity_type', 'file_url', 'expiry_date']
  };

  // Entity-specific validation rules
  private readonly ENTITY_VALIDATION_RULES: Record<string, any> = {
    [EntityType.PROJECT]: {
      required_categories: [DocumentCategory.LEGAL, DocumentCategory.COMPLIANCE],
      max_documents_per_type: 5
    },
    [EntityType.INVESTOR]: {
      required_types: [DocumentType.AML_KYC_DESCRIPTION],
      max_documents_per_type: 3
    },
    [EntityType.ISSUER]: {
      required_types: [
        DocumentType.CERTIFICATE_INCORPORATION,
        DocumentType.DIRECTOR_LIST,
        DocumentType.SHAREHOLDER_REGISTER
      ],
      max_documents_per_type: 2
    }
  };

  /**
   * Validate document creation request
   */
  validateDocumentCreation(data: CreateDocumentRequest): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic field validation
    const fieldValidation = this.validateRequiredFields(data);
    if (!fieldValidation.isValid) {
      errors.push(...fieldValidation.errors);
    }

    // Document type validation
    const typeValidation = this.validateDocumentType(data.type, data);
    if (!typeValidation.isValid) {
      errors.push(...typeValidation.errors);
      warnings.push(...typeValidation.warnings);
    }

    // Entity validation
    const entityValidation = this.validateEntityType(data.entity_type, data.entity_id);
    if (!entityValidation.isValid) {
      errors.push(...entityValidation.errors);
    }

    // Metadata validation
    if (data.metadata) {
      const metadataValidation = this.validateMetadata(data.metadata);
      if (!metadataValidation.isValid) {
        warnings.push(...metadataValidation.errors);
      }
    }

    // Expiry date validation
    if (data.expiry_date) {
      const expiryValidation = this.validateExpiryDate(data.expiry_date);
      if (!expiryValidation.isValid) {
        errors.push(...expiryValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingFields: fieldValidation.missingFields,
      invalidFields: this.getInvalidFields(data)
    };
  }

  /**
   * Validate document update request
   */
  validateDocumentUpdate(documentId: string, data: UpdateDocumentRequest, existingDocument?: Document): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Status transition validation
    if (data.status && existingDocument) {
      const statusValidation = this.validateStatusTransition(existingDocument.status, data.status);
      if (!statusValidation.isValid) {
        errors.push(...statusValidation.errors);
      }
    }

    // Version validation
    if (data.version && existingDocument) {
      if (data.version < existingDocument.version!) {
        errors.push('Cannot downgrade document version');
      }
    }

    // Expiry date validation
    if (data.expiry_date) {
      const expiryValidation = this.validateExpiryDate(data.expiry_date);
      if (!expiryValidation.isValid) {
        errors.push(...expiryValidation.errors);
      }
    }

    // Metadata validation
    if (data.metadata) {
      const metadataValidation = this.validateMetadata(data.metadata);
      if (!metadataValidation.isValid) {
        warnings.push(...metadataValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate file upload
   */
  validateFileUpload(
    file: Buffer | Uint8Array,
    fileName: string,
    fileType: string,
    options: FileValidationOptions = {}
  ): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const maxSize = options.maxSize || this.DEFAULT_MAX_FILE_SIZE;
    const allowedTypes = options.allowedTypes || this.DEFAULT_ALLOWED_TYPES;
    const allowedExtensions = options.allowedExtensions || this.DEFAULT_ALLOWED_EXTENSIONS;

    // File size validation
    if (file.byteLength > maxSize) {
      errors.push(`File size ${file.byteLength} exceeds maximum allowed size of ${maxSize} bytes`);
    }

    // File type validation
    if (!allowedTypes.includes(fileType)) {
      errors.push(`File type ${fileType} is not allowed`);
    }

    // File extension validation
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed`);
    }

    // File name validation
    if (fileName.length > 255) {
      errors.push('File name is too long (maximum 255 characters)');
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(fileName.replace(/\s/g, '_'))) {
      warnings.push('File name contains special characters that may cause issues');
    }

    // Content validation
    const contentValidation = this.validateFileContent(file, fileType);
    if (!contentValidation.isValid) {
      errors.push(...contentValidation.errors);
      warnings.push(...contentValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate compliance requirements
   */
  validateComplianceRequirements(document: Document, entityType: string): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Entity-specific compliance rules
    const rules = this.ENTITY_VALIDATION_RULES[entityType];
    
    if (rules) {
      // Check required document types
      if (rules.required_types && !rules.required_types.includes(document.type)) {
        warnings.push(`Document type ${document.type} is not typically required for ${entityType}`);
      }

      // Check required categories
      if (rules.required_categories && document.category && !rules.required_categories.includes(document.category)) {
        warnings.push(`Document category ${document.category} may not meet compliance requirements`);
      }
    }

    // Check expiry requirements for specific types
    const expiryRequiredTypes = [
      DocumentType.FINANCIAL_STATEMENTS,
      DocumentType.REGULATORY_STATUS
    ];

    if (expiryRequiredTypes.includes(document.type as DocumentType) && !document.expiry_date) {
      errors.push(`Document type ${document.type} requires an expiry date`);
    }

    // Check if document is expired
    if (document.expiry_date && new Date(document.expiry_date) < new Date()) {
      errors.push('Document has expired and needs to be renewed');
    }

    // Check if document is expiring soon (30 days)
    if (document.expiry_date) {
      const daysUntilExpiry = Math.ceil((new Date(document.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        warnings.push(`Document expires in ${daysUntilExpiry} days`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate workflow requirements
   */
  validateWorkflowRequirements(document: Document, requiredSigners: string[]): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if workflow is required for document type
    const workflowRequiredTypes = [
      DocumentType.CERTIFICATE_INCORPORATION,
      DocumentType.FINANCIAL_STATEMENTS,
      DocumentType.REGULATORY_STATUS
    ];

    if (workflowRequiredTypes.includes(document.type as DocumentType)) {
      if (!requiredSigners || requiredSigners.length === 0) {
        errors.push(`Document type ${document.type} requires workflow approval`);
      }

      if (requiredSigners && requiredSigners.length < 2) {
        warnings.push('Consider requiring multiple approvers for enhanced security');
      }
    }

    // Validate signer IDs format
    if (requiredSigners) {
      const invalidSigners = requiredSigners.filter(signer => 
        !signer || typeof signer !== 'string' || !/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(signer)
      );

      if (invalidSigners.length > 0) {
        errors.push('Invalid signer IDs provided');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate template compliance
   */
  validateTemplateCompliance(document: Document, template: DocumentTemplate): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields from template
    template.required_fields.forEach(field => {
      if (!document[field as keyof Document] && !document.metadata?.[field]) {
        errors.push(`Required field '${field}' is missing`);
      }
    });

    // Validate against template rules
    if (template.validation_rules) {
      const ruleValidation = this.validateAgainstRules(document, template.validation_rules);
      if (!ruleValidation.isValid) {
        errors.push(...ruleValidation.errors);
        warnings.push(...ruleValidation.warnings);
      }
    }

    // Check if document type matches template
    if (document.type !== template.document_type) {
      errors.push(`Document type ${document.type} does not match template type ${template.document_type}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // === Private Helper Methods ===

  private validateRequiredFields(data: CreateDocumentRequest): DocumentValidationResult & { missingFields?: string[] } {
    const baseRequiredFields = ['name', 'type', 'entity_id', 'entity_type'];
    const typeSpecificFields = this.REQUIRED_FIELDS_BY_TYPE[data.type] || baseRequiredFields;
    
    const missingFields = typeSpecificFields.filter(field => 
      !data[field as keyof CreateDocumentRequest] || 
      data[field as keyof CreateDocumentRequest] === ''
    );

    return {
      isValid: missingFields.length === 0,
      errors: missingFields.length > 0 ? [`Missing required fields: ${missingFields.join(', ')}`] : [],
      warnings: [],
      missingFields
    };
  }

  private validateDocumentType(type: string, data: CreateDocumentRequest): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if it's a valid document type
    const validTypes = Object.values(DocumentType);
    if (!validTypes.includes(type as DocumentType) && !type.startsWith('custom_')) {
      warnings.push(`Document type '${type}' is not a standard type`);
    }

    // Type-specific validation
    switch (type as DocumentType) {
      case DocumentType.FINANCIAL_STATEMENTS:
        if (!data.expiry_date) {
          errors.push('Financial statements require an expiry date');
        }
        break;
        
      case DocumentType.CERTIFICATE_INCORPORATION:
        if (data.entity_type !== EntityType.ISSUER && data.entity_type !== EntityType.ORGANIZATION) {
          errors.push('Certificate of incorporation is only valid for issuers and organizations');
        }
        break;
        
      case DocumentType.AML_KYC_DESCRIPTION:
        if (data.entity_type !== EntityType.INVESTOR) {
          warnings.push('AML/KYC documents are typically associated with investors');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateEntityType(entityType: string, entityId: string): DocumentValidationResult {
    const errors: string[] = [];
    const validEntityTypes = Object.values(EntityType);

    if (!validEntityTypes.includes(entityType as EntityType)) {
      errors.push(`Invalid entity type: ${entityType}`);
    }

    // Validate entity ID format (UUID)
    if (!/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(entityId)) {
      errors.push('Invalid entity ID format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private validateMetadata(metadata: any): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for sensitive information in metadata
    const sensitiveFields = ['password', 'secret', 'key', 'token', 'ssn', 'credit_card'];
    const metadataString = JSON.stringify(metadata).toLowerCase();
    
    sensitiveFields.forEach(field => {
      if (metadataString.includes(field)) {
        warnings.push(`Metadata may contain sensitive information: ${field}`);
      }
    });

    // Check metadata size (should not be too large)
    if (JSON.stringify(metadata).length > 10000) {
      warnings.push('Metadata is very large and may impact performance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateExpiryDate(expiryDate: Date | string): DocumentValidationResult {
    const errors: string[] = [];
    const expiry = new Date(expiryDate);
    const now = new Date();

    if (isNaN(expiry.getTime())) {
      errors.push('Invalid expiry date format');
    } else if (expiry <= now) {
      errors.push('Expiry date must be in the future');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private validateStatusTransition(currentStatus: DocumentStatus | string, newStatus: DocumentStatus | string): DocumentValidationResult {
    const errors: string[] = [];

    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      [DocumentStatus.PENDING]: [DocumentStatus.APPROVED, DocumentStatus.REJECTED],
      [DocumentStatus.APPROVED]: [DocumentStatus.EXPIRED],
      [DocumentStatus.REJECTED]: [DocumentStatus.PENDING],
      [DocumentStatus.EXPIRED]: [DocumentStatus.PENDING]
    };

    const allowedNextStatuses = validTransitions[currentStatus] || [];
    
    if (currentStatus !== newStatus && !allowedNextStatuses.includes(newStatus)) {
      errors.push(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private validateFileContent(file: Buffer | Uint8Array, fileType: string): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic file signature validation
    const fileBuffer = file instanceof Buffer ? file : Buffer.from(file);
    
    // PDF validation
    if (fileType === 'application/pdf') {
      if (!fileBuffer.toString('utf8', 0, 4).includes('%PDF')) {
        errors.push('File does not appear to be a valid PDF');
      }
    }

    // Image validation
    if (fileType.startsWith('image/')) {
      const signatures = {
        'image/jpeg': [0xFF, 0xD8, 0xFF],
        'image/png': [0x89, 0x50, 0x4E, 0x47],
        'image/gif': [0x47, 0x49, 0x46]
      };

      const signature = signatures[fileType as keyof typeof signatures];
      if (signature) {
        const match = signature.every((byte, index) => fileBuffer[index] === byte);
        if (!match) {
          errors.push(`File does not appear to be a valid ${fileType}`);
        }
      }
    }

    // Check for minimum file size (empty files)
    if (fileBuffer.length < 100) {
      warnings.push('File appears to be very small and may be empty or corrupted');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateAgainstRules(document: Document, rules: Record<string, any>): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Implement rule-based validation logic here
    // This would be expanded based on specific business rules

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private getInvalidFields(data: CreateDocumentRequest): Record<string, string> {
    const invalidFields: Record<string, string> = {};

    // Email validation if present in metadata
    if (data.metadata?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.metadata.email)) {
      invalidFields.email = 'Invalid email format';
    }

    // URL validation
    if (data.file_url) {
      try {
        new URL(data.file_url);
      } catch {
        invalidFields.file_url = 'Invalid URL format';
      }
    }

    return invalidFields;
  }
}
