/**
 * Integration Service
 * 
 * Handles integration between data upload and document upload phases
 * Links documents to uploaded entities and manages cross-phase workflows
 */

import { supabase } from '@/infrastructure/database/client';
import type { UploadDocumentType, InvestorDocumentType, IssuerDocumentType } from '@/types/core/documentTypes';
import type { Investor, Organization } from '@/types/core/centralModels';
import type {
  UploadDocument,
  UploadEntityType,
  UploadSession
} from '../types/uploadTypes';

export interface EntityLinkingOptions {
  autoLinkByEmail?: boolean;
  autoLinkByName?: boolean;
  requireManualSelection?: boolean;
  defaultDocumentTypes?: UploadDocumentType[];
}

export interface EntityDocumentLink {
  entityId: string;
  entityType: UploadEntityType;
  entityName: string;
  entityEmail?: string;
  documentCount: number;
  documents: UploadDocument[];
  linkingStatus: 'pending' | 'linked' | 'failed';
}

export interface DocumentCategorization {
  suggestedType: UploadDocumentType;
  confidence: number;
  reasoning: string;
  alternatives: Array<{ type: UploadDocumentType; confidence: number }>;
}

export class IntegrationService {
  private static instance: IntegrationService;

  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  /**
   * Link documents to uploaded entities
   */
  public async linkDocumentsToEntities(
    entities: (Investor | Organization)[],
    documents: File[],
    entityType: UploadEntityType,
    options: EntityLinkingOptions = {}
  ): Promise<EntityDocumentLink[]> {
    const links: EntityDocumentLink[] = [];

    // Create entity document links
    for (const entity of entities) {
      const entityId = entityType === 'investor' 
        ? (entity as Investor).id! 
        : (entity as Organization).id!;

      const entityName = entity.name;
      const entityEmail = entityType === 'investor' 
        ? (entity as Investor).email 
        : (entity as Organization).contactEmail;

      const link: EntityDocumentLink = {
        entityId,
        entityType,
        entityName,
        entityEmail,
        documentCount: 0,
        documents: [],
        linkingStatus: 'pending'
      };

      // Auto-link documents if enabled
      if (options.autoLinkByEmail && entityEmail) {
        const linkedDocs = await this.findDocumentsByEmail(documents, entityEmail);
        link.documents.push(...linkedDocs);
      }

      if (options.autoLinkByName) {
        const linkedDocs = await this.findDocumentsByName(documents, entityName);
        link.documents.push(...linkedDocs);
      }

      link.documentCount = link.documents.length;
      link.linkingStatus = link.documents.length > 0 ? 'linked' : 'pending';

      links.push(link);
    }

    return links;
  }

  /**
   * Find documents that match entity email
   */
  private async findDocumentsByEmail(
    documents: File[],
    email: string
  ): Promise<UploadDocument[]> {
    const matchedDocs: UploadDocument[] = [];

    for (const file of documents) {
      // Check if filename contains email
      if (file.name.toLowerCase().includes(email.toLowerCase())) {
        const uploadDoc: UploadDocument = {
          file,
          documentType: await this.categorizeDocument(file),
          status: 'pending',
          progress: 0,
          metadata: {
            linkingReason: 'email_match',
            originalEmail: email
          }
        };
        matchedDocs.push(uploadDoc);
      }
    }

    return matchedDocs;
  }

  /**
   * Find documents that match entity name
   */
  private async findDocumentsByName(
    documents: File[],
    name: string
  ): Promise<UploadDocument[]> {
    const matchedDocs: UploadDocument[] = [];
    const normalizedName = this.normalizeName(name);

    for (const file of documents) {
      const normalizedFilename = this.normalizeName(file.name);
      
      // Check if filename contains normalized name
      if (normalizedFilename.includes(normalizedName) || 
          normalizedName.includes(normalizedFilename)) {
        const uploadDoc: UploadDocument = {
          file,
          documentType: await this.categorizeDocument(file),
          status: 'pending',
          progress: 0,
          metadata: {
            linkingReason: 'name_match',
            originalName: name
          }
        };
        matchedDocs.push(uploadDoc);
      }
    }

    return matchedDocs;
  }

  /**
   * Automatically categorize document based on filename and content
   */
  public async categorizeDocument(file: File): Promise<UploadDocumentType> {
    const categorization = await this.suggestDocumentType(file);
    return categorization.suggestedType;
  }

  /**
   * Suggest document type with confidence scores
   */
  public async suggestDocumentType(file: File): Promise<DocumentCategorization> {
    const filename = file.name.toLowerCase();
    const extension = filename.split('.').pop() || '';

    // Document type patterns
    const patterns: Array<{ type: UploadDocumentType; patterns: string[]; confidence: number }> = [
      {
        type: 'passport',
        patterns: ['passport', 'pp', 'travel_document'],
        confidence: 0.9
      },
      {
        type: 'drivers_license',
        patterns: ['license', 'dl', 'driving', 'driver'],
        confidence: 0.85
      },
      {
        type: 'utility_bill',
        patterns: ['utility', 'bill', 'electric', 'gas', 'water', 'internet'],
        confidence: 0.8
      },
      {
        type: 'bank_statement',
        patterns: ['bank', 'statement', 'account', 'balance'],
        confidence: 0.85
      },
      {
        type: 'proof_of_address',
        patterns: ['address', 'proof', 'residence', 'residency'],
        confidence: 0.8
      },
      {
        type: 'tax_document',
        patterns: ['tax', 'w2', 'w-2', '1099', 'tax_return', 'irs'],
        confidence: 0.9
      },
      {
        type: 'financial_statement',
        patterns: ['financial', 'balance_sheet', 'income', 'statement'],
        confidence: 0.85
      },
      {
        type: 'articles_of_incorporation',
        patterns: ['incorporation', 'articles', 'certificate', 'registration'],
        confidence: 0.9
      },
      {
        type: 'operating_agreement',
        patterns: ['operating', 'agreement', 'bylaws', 'charter'],
        confidence: 0.85
      },
      {
        type: 'board_resolution',
        patterns: ['board', 'resolution', 'minutes', 'director'],
        confidence: 0.8
      }
    ];

    let bestMatch = patterns[0];
    let bestScore = 0;
    const alternatives: Array<{ type: UploadDocumentType; confidence: number }> = [];

    // Check filename patterns
    for (const pattern of patterns) {
      let score = 0;
      
      for (const keyword of pattern.patterns) {
        if (filename.includes(keyword)) {
          score += pattern.confidence;
        }
      }

      if (score > bestScore) {
        if (bestScore > 0) {
          alternatives.push({ type: bestMatch.type, confidence: bestScore });
        }
        bestMatch = pattern;
        bestScore = score;
      } else if (score > 0) {
        alternatives.push({ type: pattern.type, confidence: score });
      }
    }

    // Boost confidence based on file type
    if (['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) {
      bestScore *= 1.1;
    }

    // Default fallback
    if (bestScore === 0) {
      bestMatch = {
        type: 'other',
        patterns: [],
        confidence: 0.5
      };
      bestScore = 0.5;
    }

    return {
      suggestedType: bestMatch.type,
      confidence: Math.min(bestScore, 1.0),
      reasoning: `Matched patterns: ${bestMatch.patterns.join(', ')}`,
      alternatives: alternatives
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3) // Top 3 alternatives
    };
  }

  /**
   * Create upload documents from files with entity linking
   */
  public createUploadDocuments(
    files: File[],
    entityLinks: EntityDocumentLink[]
  ): UploadDocument[] {
    const uploadDocs: UploadDocument[] = [];

    for (const file of files) {
      // Find which entity this document should be linked to
      const linkedEntity = entityLinks.find(link => 
        link.documents.some(doc => doc.file.name === file.name)
      );

      const uploadDoc: UploadDocument = {
        file,
        documentType: 'other', // Will be updated by categorization
        entityId: linkedEntity?.entityId,
        status: 'pending',
        progress: 0,
        metadata: {
          linkedEntityName: linkedEntity?.entityName,
          linkedEntityType: linkedEntity?.entityType
        }
      };

      uploadDocs.push(uploadDoc);
    }

    return uploadDocs;
  }

  /**
   * Update document entity links
   */
  public updateDocumentLinks(
    documents: UploadDocument[],
    entityId: string,
    documentType?: UploadDocumentType
  ): UploadDocument[] {
    return documents.map(doc => ({
      ...doc,
      entityId,
      documentType: documentType || doc.documentType,
      metadata: {
        ...doc.metadata,
        linkUpdated: new Date().toISOString()
      }
    }));
  }

  /**
   * Validate document-entity relationships
   */
  public async validateDocumentLinks(
    documents: UploadDocument[],
    entityType: UploadEntityType
  ): Promise<{ valid: UploadDocument[]; invalid: UploadDocument[] }> {
    const valid: UploadDocument[] = [];
    const invalid: UploadDocument[] = [];

    for (const doc of documents) {
      if (!doc.entityId) {
        invalid.push(doc);
        continue;
      }

      // Verify entity exists
      const tableName = entityType === 'investor' ? 'investors' : 'organizations';
      const idField = entityType === 'investor' ? 'investor_id' : 'id';

      const { data, error } = await supabase
        .from(tableName)
        .select(idField)
        .eq(idField, doc.entityId)
        .single();

      if (error || !data) {
        invalid.push(doc);
      } else {
        valid.push(doc);
      }
    }

    return { valid, invalid };
  }

  /**
   * Get document type suggestions for entity type
   */
  public getRecommendedDocumentTypes(entityType: UploadEntityType): UploadDocumentType[] {
    if (entityType === 'investor') {
      return [
        'passport',
        'drivers_license',
        'national_id',
        'proof_of_address',
        'bank_statement',
        'investment_agreement',
        'accreditation_letter',
        'tax_document',
        'other'
      ] as InvestorDocumentType[];
    } else {
      return [
        'articles_of_incorporation',
        'bylaws',
        'operating_agreement',
        'certificate_of_good_standing',
        'tax_exemption_letter',
        'financial_statements',
        'audit_report',
        'board_resolution',
        'power_of_attorney',
        'legal_opinion',
        'prospectus',
        'offering_memorandum',
        'regulatory_filing',
        'compliance_certificate',
        'other'
      ] as IssuerDocumentType[];
    }
  }

  /**
   * Generate upload session summary
   */
  public generateSessionSummary(session: UploadSession): {
    dataPhase: { total: number; processed: number; failed: number };
    documentPhase: { total: number; completed: number; failed: number };
    entities: { created: number; updated: number };
    documents: { uploaded: number; failed: number };
  } {
    const documentStats = session.documents.reduce(
      (acc, doc) => {
        if (doc.status === 'completed') acc.completed++;
        else if (doc.status === 'failed') acc.failed++;
        return acc;
      },
      { completed: 0, failed: 0 }
    );

    return {
      dataPhase: {
        total: session.totalRecords,
        processed: session.processedRecords,
        failed: session.failedRecords
      },
      documentPhase: {
        total: session.documents.length,
        completed: documentStats.completed,
        failed: documentStats.failed
      },
      entities: {
        created: session.processedRecords - session.failedRecords,
        updated: 0 // Will be updated based on duplicate handling
      },
      documents: {
        uploaded: documentStats.completed,
        failed: documentStats.failed
      }
    };
  }

  /**
   * Normalize name for matching
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
}

// Export singleton instance
export const integrationService = IntegrationService.getInstance();
