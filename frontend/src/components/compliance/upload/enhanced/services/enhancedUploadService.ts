/**
 * Enhanced Upload Service
 * 
 * Main orchestration service for compliance data and document uploads
 * Handles the complete workflow from file parsing to database storage
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '@/infrastructure/database/client';
import { validationService } from './validationService';
import { DocumentStorageService } from '@/components/compliance/operations/documents/services/documentStorage';
import { BatchUploadService } from '@/components/compliance/operations/documents/services/batchUploadService';

import type {
  UploadSession,
  UploadEntityType,
  UploadFileFormat,
  UploadPhase,
  DataUploadResult,
  DocumentUploadResult,
  UploadProgress,
  DataUploadConfig,
  DocumentUploadConfig,
  InvestorTemplateRow,
  IssuerTemplateRow,
  UploadDocument,
  DuplicateHandlingResult
} from '../types/uploadTypes';

import type {
  ValidationError as EnhancedValidationError,
  BatchValidationResult
} from '../types/validationTypes';

import type {
  ValidationError
} from '../types/uploadTypes';

import { mapInvestorToDatabase, mapOrganizationToDatabase } from '@/utils/shared/formatting/typeMappers';
import type { Investor, Organization } from '@/types/core/centralModels';

export class EnhancedUploadService {
  private static instance: EnhancedUploadService;
  private documentStorage: DocumentStorageService;
  private batchUpload: BatchUploadService;
  private currentSession: UploadSession | null = null;
  
  /**
   * Convert enhanced validation errors to upload validation errors
   */
  private convertValidationErrors(errors: EnhancedValidationError[]): ValidationError[] {
    return errors.map(error => ({
      row: error.row,
      field: error.field,
      value: error.value,
      message: error.message,
      severity: error.severity === 'info' ? 'warning' : error.severity as ('error' | 'warning')
    }));
  }

  constructor() {
    this.documentStorage = new DocumentStorageService(supabase);
    this.batchUpload = new BatchUploadService(supabase);
  }

  public static getInstance(): EnhancedUploadService {
    if (!EnhancedUploadService.instance) {
      EnhancedUploadService.instance = new EnhancedUploadService();
    }
    return EnhancedUploadService.instance;
  }

  /**
   * Create a new upload session
   */
  public createSession(entityType: UploadEntityType, metadata?: Record<string, any>): UploadSession {
    this.currentSession = {
      id: this.generateSessionId(),
      entityType,
      phase: 'data',
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      documents: [],
      startedAt: new Date(),
      metadata: metadata || {}
    };
    return this.currentSession;
  }

  /**
   * Parse uploaded file (CSV or XLSX)
   */
  public async parseFile(
    file: File,
    format: UploadFileFormat,
    hasHeaders: boolean = true
  ): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      if (format === 'csv') {
        Papa.parse(file, {
          header: hasHeaders,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim().toLowerCase().replace(/\s+/g, '_'),
          complete: (results) => {
            resolve(results.data as Record<string, any>[]);
          },
          error: (error) => {
            reject(new Error(`CSV parsing failed: ${error.message}`));
          }
        });
      } else if (format === 'xlsx') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
              header: hasHeaders ? undefined : 1,
              defval: ''
            });
            
            // Normalize headers for XLSX
            const normalizedData = jsonData.map((row: any) => {
              const normalizedRow: Record<string, any> = {};
              Object.keys(row).forEach(key => {
                const normalizedKey = key.toString().trim().toLowerCase().replace(/\s+/g, '_');
                normalizedRow[normalizedKey] = row[key];
              });
              return normalizedRow;
            });
            
            resolve(normalizedData);
          } catch (error) {
            reject(new Error(`XLSX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        };
        reader.onerror = () => reject(new Error('File reading failed'));
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error(`Unsupported file format: ${format}`));
      }
    });
  }

  /**
   * Upload and process data (Phase 1)
   */
  public async uploadData(
    file: File,
    config: DataUploadConfig,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DataUploadResult> {
    try {
      // Initialize session if not exists
      if (!this.currentSession) {
        this.createSession(config.entityType);
      }

      // Update session
      this.currentSession!.phase = 'data';

      // Parse file
      const rawData = await this.parseFile(file, config.fileFormat, config.hasHeaders);
      this.currentSession!.totalRecords = rawData.length;

      // Validate data based on validation mode
      let validationResult;
      
      if (config.validation?.bypassValidation) {
        // Bypass validation entirely
        validationResult = validationService.bypassValidation(rawData, config.entityType);
      } else if (config.validation?.quickValidation) {
        // Quick validation - only required fields
        validationResult = await validationService.quickValidate(rawData, config.entityType);
      } else {
        // Standard validation with lenient/strict mode
        const lenientMode = config.validation?.lenientMode || !config.validation?.strictMode;
        const schema = config.entityType === 'investor' 
          ? validationService.createInvestorSchema(lenientMode)
          : validationService.createIssuerSchema(lenientMode);

        validationResult = await validationService.validateBatch(rawData, schema, {
          batchSize: config.batchSize,
          continueOnError: true,
          maxErrors: config.validation?.strictMode ? 100 : 500,
          stopOnFirstError: config.validation?.strictMode ? false : false,
          parallelValidation: false
        });
      }

      // Handle validation errors
      if (validationResult.errors.length > 0 && validationResult.validRows === 0) {
        return {
          success: false,
          error: 'Validation failed - no valid records found',
          data: {
            entities: [],
            validationErrors: this.convertValidationErrors(validationResult.errors),
            duplicateHandling: []
          }
        };
      }

      // Process valid data
      console.log('Starting to process valid data, valid rows:', validationResult.validRows);
      const entities: (Investor | Organization)[] = [];
      const duplicateHandling: DuplicateHandlingResult[] = [];
      let processed = 0;

      // Process in batches
      const batchSize = config.batchSize;
      const batches = this.chunkArray(validationResult.validData, batchSize);
      console.log(`Processing ${batches.length} batches of size ${batchSize}`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} items`);
        
        try {
          const batchResults = await this.processBatch(batch, config, this.currentSession!);
          console.log(`Batch ${i + 1} completed: ${batchResults.entities.length} entities created`);
          entities.push(...batchResults.entities);
          duplicateHandling.push(...batchResults.duplicateHandling);
        } catch (error) {
          console.error(`Error processing batch ${i + 1}:`, error);
          this.currentSession!.failedRecords += batch.length;
        }
        
        processed += batch.length;
        this.currentSession!.processedRecords = processed;

        // Update progress
        if (onProgress) {
          onProgress({
            phase: 'data',
            entityType: config.entityType,
            total: validationResult.validRows,
            completed: processed,
            failed: this.currentSession!.failedRecords,
            percentage: Math.round((processed / validationResult.validRows) * 100),
            currentItem: `Processing batch ${Math.ceil(processed / batchSize)}`
          });
        }
      }
      
      console.log(`Upload completed: ${entities.length} entities created, ${this.currentSession!.failedRecords} failed`);

      return {
        success: true,
        data: {
          entities,
          validationErrors: this.convertValidationErrors(validationResult.errors),
          duplicateHandling
        },
        details: {
          total: rawData.length,
          processed: entities.length,
          failed: this.currentSession!.failedRecords,
          duplicates: duplicateHandling.filter(d => d.action === 'updated').length,
          updated: duplicateHandling.filter(d => d.action === 'updated').length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during upload',
        data: {
          entities: [],
          validationErrors: [],
          duplicateHandling: []
        }
      };
    }
  }

  /**
   * Upload documents (Phase 2)
   */
  public async uploadDocuments(
    documents: UploadDocument[],
    config: DocumentUploadConfig,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DocumentUploadResult> {
    try {
      // Initialize document storage if needed
      await this.documentStorage.initialize({ isPublic: false });

      // Update session
      if (this.currentSession) {
        this.currentSession.phase = 'documents';
        this.currentSession.documents = documents;
      }

      const successfulUploads: UploadDocument[] = [];
      const failedUploads: UploadDocument[] = [];
      let completed = 0;

      // Process documents in concurrent batches
      const batchSize = config.concurrentUploads;
      const batches = this.chunkArray(documents, batchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(async (doc) => {
          try {
            if (!doc.entityId) {
              throw new Error('Document must be linked to an entity');
            }

            // Update document status
            doc.status = 'uploading';
            doc.progress = 0;

            // Upload document
            const result = await this.documentStorage.uploadDocument(
              doc.file,
              doc.documentType,
              doc.entityId,
              {
                generateThumbnail: config.generateThumbnails,
                previewOptions: config.generatePreviews ? {
                  width: 400,
                  height: 300,
                  format: 'webp',
                  quality: 80
                } : undefined
              }
            );

            // Update document with result
            doc.id = result.document.id;
            doc.status = 'completed';
            doc.progress = 100;
            doc.metadata = {
              ...doc.metadata,
              publicUrl: result.publicUrl,
              thumbnailUrl: result.thumbnailUrl
            };

            successfulUploads.push(doc);
            return doc;

          } catch (error) {
            doc.status = 'failed';
            doc.error = error instanceof Error ? error.message : 'Unknown error';
            failedUploads.push(doc);
            return doc;
          }
        });

        // Wait for batch to complete
        await Promise.all(batchPromises);
        completed += batch.length;

        // Update progress
        if (onProgress) {
          onProgress({
            phase: 'documents',
            entityType: this.currentSession?.entityType || 'investor',
            total: documents.length,
            completed,
            failed: failedUploads.length,
            percentage: Math.round((completed / documents.length) * 100),
            currentItem: `Uploading documents... ${completed}/${documents.length}`
          });
        }
      }

      return {
        success: failedUploads.length === 0,
        data: {
          documents: successfulUploads,
          failed: failedUploads.map(doc => ({
            file: doc.file,
            error: doc.error || 'Unknown error',
            retryable: true
          }))
        },
        details: {
          total: documents.length,
          processed: successfulUploads.length,
          failed: failedUploads.length,
          duplicates: 0,
          updated: 0
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during document upload',
        data: {
          documents: [],
          failed: documents.map(doc => ({
            file: doc.file,
            error: 'Batch upload failed',
            retryable: true
          }))
        }
      };
    }
  }

  /**
   * Process a batch of validated data
   */
  private async processBatch(
    batch: Record<string, any>[],
    config: DataUploadConfig,
    session: UploadSession
  ): Promise<{ entities: (Investor | Organization)[]; duplicateHandling: DuplicateHandlingResult[] }> {
    const entities: (Investor | Organization)[] = [];
    const duplicateHandling: DuplicateHandlingResult[] = [];

    for (const row of batch) {
      try {
        if (config.entityType === 'investor') {
          const result = await this.processInvestorRow(row as InvestorTemplateRow, config);
          entities.push(result.entity);
          if (result.duplicateAction) {
            duplicateHandling.push(result.duplicateAction);
          }
        } else {
          const result = await this.processIssuerRow(row as IssuerTemplateRow, config);
          entities.push(result.entity);
          if (result.duplicateAction) {
            duplicateHandling.push(result.duplicateAction);
          }
        }
      } catch (error) {
        session.failedRecords++;
        console.error('Failed to process row:', error);
      }
    }

    return { entities, duplicateHandling };
  }

  /**
   * Process individual investor row with all available fields
   */
  private async processInvestorRow(
    row: InvestorTemplateRow,
    config: DataUploadConfig
  ): Promise<{ entity: Investor; duplicateAction?: DuplicateHandlingResult }> {
    // Convert template row to Investor type with all available fields
    // Using a more flexible type that includes database-specific fields
    const investorData: Record<string, any> = {
      // Basic Information
      name: row.name,
      email: row.email,
      company: row.company,
      type: row.type.toLowerCase() as any,
      notes: row.notes,
      
      // Investor Classification
      investorType: row.investor_type,
      investorStatus: (row.investor_status?.toLowerCase() || 'pending') as any,
      onboardingCompleted: row.onboarding_completed?.toLowerCase() === 'true',
      
      // Wallet & Blockchain
      walletAddress: row.wallet_address,
      
      // KYC Information
      kycStatus: (row.kyc_status?.toLowerCase() || 'not_started') as any,
      kycVerifiedAt: row.kyc_verified_at,
      kycExpiryDate: row.kyc_expiry_date,
      
      // Accreditation
      accreditationStatus: (row.accreditation_status?.toLowerCase() || 'not_started') as any,
      accreditationType: row.accreditation_type,
      accreditationVerifiedAt: row.accreditation_verified_at,
      accreditationExpiresAt: row.accreditation_expires_at,
      
      // Risk Assessment
      riskScore: row.risk_score ? Number(row.risk_score) : undefined,
      
      // Tax & Compliance
      taxResidency: row.tax_residency,
      taxIdNumber: row.tax_id_number,
      lastComplianceCheck: row.last_compliance_check,
      
      // System Fields
      userId: row.user_id,
      lastUpdated: row.lastUpdated
    };

    // Parse JSON fields with better error handling
    if (row.verification_details) {
      try {
        investorData.verification_details = JSON.parse(row.verification_details);
      } catch (e) {
        console.warn(`Invalid verification_details JSON for investor ${row.email}:`, e);
      }
    }

    if (row.risk_factors) {
      try {
        investorData.riskFactors = JSON.parse(row.risk_factors);
      } catch (e) {
        console.warn(`Invalid risk_factors JSON for investor ${row.email}:`, e);
      }
    }

    if (row.risk_assessment) {
      try {
        investorData.riskAssessment = JSON.parse(row.risk_assessment);
      } catch (e) {
        console.warn(`Invalid risk_assessment JSON for investor ${row.email}:`, e);
      }
    }

    if (row.investment_preferences) {
      try {
        investorData.investmentPreferences = JSON.parse(row.investment_preferences);
      } catch (e) {
        console.warn(`Invalid investment_preferences JSON for investor ${row.email}:`, e);
      }
    }

    if (row.profile_data) {
      try {
        investorData.profileData = JSON.parse(row.profile_data);
      } catch (e) {
        console.warn(`Invalid profile_data JSON for investor ${row.email}:`, e);
      }
    }

    // Check for existing investor by email
    const { data: existingInvestor } = await supabase
      .from('investors')
      .select('investor_id, email')
      .eq('email', investorData.email)
      .single();

    let duplicateAction: DuplicateHandlingResult | undefined;

    if (existingInvestor) {
      if (config.duplicateAction === 'skip') {
        throw new Error(`Investor with email ${investorData.email} already exists`);
      } else if (config.duplicateAction === 'update') {
        // Update existing investor
        const dbData = mapInvestorToDatabase(investorData);
        const { data: updatedInvestor, error } = await supabase
          .from('investors')
          .update({
            ...dbData,
            updated_at: new Date().toISOString()
          })
          .eq('investor_id', existingInvestor.investor_id)
          .select()
          .single();

        if (error) throw error;

        duplicateAction = {
          row: 0, // Will be set by caller
          entity: updatedInvestor as any,
          action: 'updated',
          reason: 'Email already exists - updated existing record'
        };

        return { entity: updatedInvestor as any, duplicateAction };
      }
    }

    // Create new investor
    const dbData = mapInvestorToDatabase(investorData);
    const { data: newInvestor, error } = await supabase
      .from('investors')
      .insert({
        ...dbData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    const creationAction: DuplicateHandlingResult = {
      row: 0, // Will be set by caller
      entity: newInvestor as any,
      action: 'created',
      reason: 'New investor created'
    };

    return { entity: newInvestor as any, duplicateAction: creationAction };
  }

  /**
   * Process individual issuer row with enhanced duplicate prevention
   */
  private async processIssuerRow(
    row: IssuerTemplateRow,
    config: DataUploadConfig
  ): Promise<{ entity: Organization; duplicateAction?: DuplicateHandlingResult }> {
    console.log('Processing issuer row:', row);
    
    // Convert template row to Organization type
    const orgData: Partial<Organization> = {
      name: row.name,
      legalName: row.legal_name,
      registrationNumber: row.registration_number,
      registrationDate: row.registration_date,
      taxId: row.tax_id,
      jurisdiction: row.jurisdiction,
      businessType: row.business_type,
      status: (row.status?.toLowerCase() || 'pending') as any,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      website: row.website,
      complianceStatus: (row.compliance_status?.toLowerCase() || 'pending_review') as any,
      onboardingCompleted: row.onboarding_completed?.toLowerCase() === 'true'
    };
    
    console.log('Converted org data:', orgData);

    // Parse JSON fields
    if (row.address) {
      try {
        orgData.address = JSON.parse(row.address);
      } catch (e) {
        // Invalid JSON, skip
      }
    }

    if (row.legal_representatives) {
      try {
        orgData.legalRepresentatives = JSON.parse(row.legal_representatives);
      } catch (e) {
        // Invalid JSON, skip
      }
    }

    // Enhanced duplicate checking: Check by name OR legal name OR registration number
    console.log('Checking for existing organization with name:', orgData.name);
    let existingOrg = null;
    let duplicateField = '';
    
    // First check by name (exact match)
    const { data: nameMatch, error: nameError } = await supabase
      .from('organizations')
      .select('id, name, legal_name, registration_number')
      .eq('name', orgData.name)
      .single();

    if (nameError && nameError.code !== 'PGRST116') {
      console.error('Error checking for existing organization by name:', nameError);
      throw nameError;
    }

    if (nameMatch) {
      existingOrg = nameMatch;
      duplicateField = 'name';
    }

    // If no name match, check by legal name (if provided)
    if (!existingOrg && orgData.legalName) {
      const { data: legalNameMatch, error: legalError } = await supabase
        .from('organizations')
        .select('id, name, legal_name, registration_number')
        .eq('legal_name', orgData.legalName)
        .single();

      if (legalError && legalError.code !== 'PGRST116') {
        console.error('Error checking for existing organization by legal name:', legalError);
        // Don't throw here, just log and continue
      } else if (legalNameMatch) {
        existingOrg = legalNameMatch;
        duplicateField = 'legal_name';
      }
    }

    // If no name/legal name match, check by registration number (if provided)
    if (!existingOrg && orgData.registrationNumber) {
      const { data: regMatch, error: regError } = await supabase
        .from('organizations')
        .select('id, name, legal_name, registration_number')
        .eq('registration_number', orgData.registrationNumber)
        .single();

      if (regError && regError.code !== 'PGRST116') {
        console.error('Error checking for existing organization by registration number:', regError);
        // Don't throw here, just log and continue
      } else if (regMatch) {
        existingOrg = regMatch;
        duplicateField = 'registration_number';
      }
    }

    console.log('Existing organization check result:', existingOrg, 'matched on:', duplicateField);

    let duplicateAction: DuplicateHandlingResult | undefined;

    if (existingOrg) {
      console.log('Found existing organization, allowDuplicates:', config.allowDuplicates, 'duplicateAction:', config.duplicateAction);
      
      // If allowDuplicates is false, always prevent duplicates regardless of action
      if (!config.allowDuplicates) {
        if (config.duplicateAction === 'update') {
          // Update existing organization
          console.log('Updating existing organization (duplicate prevention mode)');
          const dbData = mapOrganizationToDatabase(orgData);
          const { data: updatedOrg, error } = await supabase
            .from('organizations')
            .update({
              ...dbData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingOrg.id)
            .select()
            .single();

          if (error) {
            console.error('Error updating organization:', error);
            throw error;
          }

          console.log('Successfully updated organization:', updatedOrg);
          duplicateAction = {
            row: 0, // Will be set by caller
            entity: updatedOrg as any,
            action: 'updated',
            reason: `${duplicateField} already exists - updated existing record (duplicate prevented)`
          };

          return { entity: updatedOrg as any, duplicateAction };
        } else {
          // Skip duplicate creation entirely
          throw new Error(`Organization already exists (${duplicateField}: ${duplicateField === 'name' ? orgData.name : duplicateField === 'legal_name' ? orgData.legalName : orgData.registrationNumber}). Duplicates are not allowed. Please use the existing organization or enable duplicate updates.`);
        }
      } else {
        // Legacy behavior when allowDuplicates is true
        if (config.duplicateAction === 'skip') {
          throw new Error(`Organization with ${duplicateField} ${duplicateField === 'name' ? orgData.name : duplicateField === 'legal_name' ? orgData.legalName : orgData.registrationNumber} already exists`);
        } else if (config.duplicateAction === 'update') {
          // Update existing organization
          console.log('Updating existing organization');
          const dbData = mapOrganizationToDatabase(orgData);
          const { data: updatedOrg, error } = await supabase
            .from('organizations')
            .update({
              ...dbData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingOrg.id)
            .select()
            .single();

          if (error) {
            console.error('Error updating organization:', error);
            throw error;
          }

          console.log('Successfully updated organization:', updatedOrg);
          duplicateAction = {
            row: 0, // Will be set by caller
            entity: updatedOrg as any,
            action: 'updated',
            reason: `${duplicateField} already exists - updated existing record`
          };

          return { entity: updatedOrg as any, duplicateAction };
        }
      }
    }

    // Create new organization
    console.log('Creating new organization');
    const dbData = mapOrganizationToDatabase(orgData);
    console.log('Database data to insert:', dbData);
    
    const { data: newOrg, error } = await supabase
      .from('organizations')
      .insert({
        ...dbData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting organization:', error);
      console.error('Attempted to insert data:', {
        ...dbData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      throw error;
    }

    console.log('Successfully created organization:', newOrg);

    const creationAction: DuplicateHandlingResult = {
      row: 0, // Will be set by caller
      entity: newOrg as any,
      action: 'created',
      reason: 'New organization created'
    };

    return { entity: newOrg as any, duplicateAction: creationAction };
  }

  /**
   * Complete upload session
   */
  public completeSession(): UploadSession | null {
    if (this.currentSession) {
      this.currentSession.phase = 'complete';
      this.currentSession.completedAt = new Date();
    }
    return this.currentSession;
  }

  /**
   * Get current session
   */
  public getCurrentSession(): UploadSession | null {
    return this.currentSession;
  }

  /**
   * Generate template for download
   */
  public generateTemplate(entityType: UploadEntityType, format: UploadFileFormat): void {
    if (entityType === 'investor') {
      this.generateInvestorTemplate(format);
    } else {
      this.generateIssuerTemplate(format);
    }
  }

  /**
   * Generate basic template with essential fields only
   */
  public generateBasicTemplate(entityType: UploadEntityType, format: UploadFileFormat): void {
    if (entityType === 'investor') {
      this.generateBasicInvestorTemplate(format);
    } else {
      this.generateBasicIssuerTemplate(format);
    }
  }

  /**
   * Generate basic investor template with essential fields only
   */
  private generateBasicInvestorTemplate(format: UploadFileFormat): void {
    const template = [
      {
        // Required Fields
        name: 'John Smith',
        email: 'john.smith@example.com',
        type: 'individual',
        
        // Essential Optional Fields
        company: 'Smith Investments',
        notes: 'Technology sector focus',
        investor_type: 'retail_accredited',
        investor_status: 'active',
        onboarding_completed: 'true',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        kyc_status: 'pending',
        accreditation_status: 'pending',
        accreditation_type: 'income',
        tax_residency: 'US',
        tax_id_number: '123-45-6789'
      },
      {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        type: 'institutional',
        company: 'Pension Fund XYZ',
        investor_type: 'pension_fund',
        investor_status: 'pending',
        onboarding_completed: 'false',
        kyc_status: 'pending',
        accreditation_status: 'approved',
        accreditation_type: 'entity',
        tax_residency: 'US'
      }
    ];

    this.downloadTemplate(template, `investor_basic_template.${format}`, format);
  }

  /**
   * Generate basic issuer template with essential fields only
   */
  private generateBasicIssuerTemplate(format: UploadFileFormat): void {
    const template = [
      {
        // Required Fields
        name: 'TechCorp Solutions Inc',
        
        // Essential Fields
        legal_name: 'TechCorp Solutions Incorporated',
        registration_number: 'DE-123456789',
        registration_date: '2020-03-15',
        tax_id: '12-3456789',
        jurisdiction: 'Delaware',
        business_type: 'Software Technology',
        status: 'active',
        compliance_status: 'compliant',
        onboarding_completed: 'true',
        contact_email: 'legal@techcorp.com',
        contact_phone: '+1-555-0199',
        website: 'https://techcorp.com'
      },
      {
        name: 'Metro Real Estate Fund LP',
        legal_name: 'Metro Real Estate Fund Limited Partnership',
        registration_number: 'TX-987654321',
        jurisdiction: 'Texas',
        business_type: 'Real Estate Investment',
        status: 'pending',
        compliance_status: 'pending_review',
        onboarding_completed: 'false',
        contact_email: 'operations@metrorefund.com',
        contact_phone: '+1-214-555-0100'
      }
    ];

    this.downloadTemplate(template, `issuer_basic_template.${format}`, format);
  }

  /**
   * Generate comprehensive investor template with all available fields
   * Includes ALL database fields with CSV-safe JSON examples
   */
  private generateInvestorTemplate(format: UploadFileFormat): void {
    const template = [
      // Example 1: Individual Accredited Investor (Complete with ALL fields)
      {
        // Basic Information (Required)
        name: 'John Smith',
        email: 'john.smith@example.com',
        type: 'individual',
        
        // Optional Basic Fields
        company: 'Smith Family Trust',
        notes: 'High net worth individual prefers technology investments',
        
        // Investor Classification
        investor_type: 'retail_accredited',
        investor_status: 'active',
        onboarding_completed: 'true',
        
        // Wallet & Blockchain
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        
        // KYC Information
        kyc_status: 'approved',
        kyc_expiry_date: '2025-01-15',
        verification_details: '{"provider":"Jumio","documentType":"passport","verificationLevel":"enhanced","biometricMatch":true,"documentNumber":"P123456789","issuingCountry":"US","verifiedAt":"2024-01-15T10:30:00Z"}',
        
        // Accreditation
        accreditation_status: 'approved',
        accreditation_type: 'income',
        accreditation_expiry_date: '2025-01-15',
        
        // Risk Assessment (Complete JSONB examples)
        risk_assessment: '{"score":25,"level":"low","factors":[{"type":"income","weight":0.3,"value":"high"},{"type":"geography","weight":0.2,"value":"low_risk"},{"type":"employment","weight":0.2,"value":"stable"},{"type":"investment_history","weight":0.3,"value":"experienced"}],"lastUpdated":"2024-01-15T10:30:00Z","methodology":"standard_v2","riskMitigants":["diversified_portfolio","stable_income"]}',
        
        // Investment Preferences (Complete JSONB examples)
        investment_preferences: '{"preferredAssetClasses":["equity","real_estate","alternative"],"riskTolerance":"medium","investmentHorizon":"long_term","preferredGeography":["US","EU","APAC"],"excludedSectors":["tobacco","gambling","weapons"],"minimumInvestment":50000,"maximumInvestment":500000,"liquidityNeeds":"low","esgPreferences":{"importance":"high","criteria":["environmental","social"]}}',
        
        // Profile Data (Complete JSONB examples)
        profile_data: '{"investorSince":"2020-01-15","totalInvestments":15,"averageInvestmentSize":75000,"preferredCommunication":"email","languages":["en","es"],"timezone":"EST","specialRequirements":"ESG focused investments only","investmentExperience":"experienced","netWorth":2500000,"annualIncome":350000,"sourceOfWealth":"business_ownership"}',
        
        // Tax & Compliance
        tax_residency: 'US',
        tax_id_number: '123-45-6789',
        last_compliance_check: '2024-01-15',
        
        // System Fields (leave empty for auto-generation)
        user_id: '',
        lastUpdated: '',
        created_at: '',
        updated_at: '',
        investor_id: ''
      },
      // Example 2: Institutional Investor (Comprehensive)
      {
        name: 'Pension Fund ABC',
        email: 'investments@pensionfund.com',
        type: 'institutional',
        company: 'ABC State Employees Pension Fund',
        notes: 'Large institutional pension fund with conservative investment mandate',
        investor_type: 'pension_fund',
        investor_status: 'active',
        onboarding_completed: 'true',
        wallet_address: '0xabcdef1234567890abcdef1234567890abcdef12',
        kyc_status: 'approved',
        kyc_expiry_date: '2025-12-31',
        verification_details: '{"provider":"Thomson_Reuters","entityType":"pension_fund","verificationLevel":"institutional","regulatoryStatus":"ERISA_covered","registrationNumber":"PF-ABC-2019-001","verifiedAt":"2024-01-10T14:20:00Z","jurisdiction":"Delaware"}',
        accreditation_status: 'approved',
        accreditation_type: 'entity',
        accreditation_expiry_date: '2025-12-31',
        risk_assessment: '{"score":15,"level":"very_low","factors":[{"type":"entity_type","weight":0.4,"value":"institutional"},{"type":"regulation","weight":0.3,"value":"heavily_regulated"},{"type":"size","weight":0.3,"value":"large_aum"}],"lastUpdated":"2024-01-10T14:20:00Z","methodology":"institutional_v1"}',
        investment_preferences: '{"preferredAssetClasses":["fixed_income","alternative","real_estate"],"riskTolerance":"conservative","investmentHorizon":"very_long_term","preferredGeography":["US","developed_markets"],"excludedSectors":[],"minimumInvestment":1000000,"maximumInvestment":50000000,"liquidityNeeds":"medium"}',
        profile_data: '{"aum":5000000000,"beneficiaryCount":45000,"establishedDate":"1985-03-15","investmentCommittee":true,"externalAdvisor":"Goldman Sachs Asset Management","reportingFrequency":"quarterly","fiduciaryStandard":"ERISA"}',
        tax_residency: 'US',
        tax_id_number: '98-7654321',
        last_compliance_check: '2024-01-10',
        user_id: '',
        lastUpdated: '',
        created_at: '',
        updated_at: '',
        investor_id: ''
      },
      // Example 3: Syndicate/SPV (Complex structure with all fields)
      {
        name: 'Tech Syndicate LLC',
        email: 'admin@techsyndicate.com',
        type: 'syndicate',
        company: 'Tech Syndicate LLC (SPV)',
        notes: 'Technology focused investment syndicate for accredited investors',
        investor_type: 'spv_syndicate',
        investor_status: 'active',
        onboarding_completed: 'true',
        wallet_address: '0x9876543210fedcba9876543210fedcba98765432',
        kyc_status: 'approved',
        kyc_expiry_date: '2025-06-30',
        verification_details: '{"provider":"Refinitiv","entityType":"spv","verificationLevel":"enhanced","structureType":"limited_liability_company","parentEntity":"Tech Investment Partners","verifiedAt":"2024-02-01T09:15:00Z","jurisdiction":"Delaware","operatingAgreement":true}',
        accreditation_status: 'approved',
        accreditation_type: 'entity',
        accreditation_expiry_date: '2025-06-30',
        risk_assessment: '{"score":35,"level":"medium","factors":[{"type":"structure","weight":0.3,"value":"complex_spv"},{"type":"investor_base","weight":0.2,"value":"multiple_investors"},{"type":"sector_focus","weight":0.2,"value":"technology"},{"type":"geographic_concentration","weight":0.3,"value":"us_focused"}],"lastUpdated":"2024-02-01T09:15:00Z","methodology":"syndicate_v1"}',
        investment_preferences: '{"preferredAssetClasses":["equity","convertible","venture_debt"],"riskTolerance":"aggressive","investmentHorizon":"medium_term","preferredGeography":["US","EU"],"focusSectors":["technology","healthcare","fintech"],"minimumInvestment":100000,"maximumInvestment":2000000,"liquidityNeeds":"high"}',
        profile_data: '{"syndicateSize":25,"leadSponsor":"Tech Investment Partners","targetSectorExposure":"technology","averageInvestmentHorizon":"3-5 years","distributionPolicy":"reinvestment_preferred","managementFee":"2%","carriedInterest":"20%","preferredDealSize":"10M-50M"}',
        tax_residency: 'US',
        tax_id_number: '87-6543210',
        last_compliance_check: '2024-02-01',
        user_id: '',
        lastUpdated: '',
        created_at: '',
        updated_at: '',
        investor_id: ''
      }
    ];

    this.downloadTemplate(template, `investor_comprehensive_template.${format}`, format);
  }

  /**
   * Generate comprehensive issuer template with all available fields
   * Includes ALL database fields with CSV-safe JSON examples
   */
  private generateIssuerTemplate(format: UploadFileFormat): void {
    const template = [
      // Example 1: Technology Corporation (Complete with ALL fields)
      {
        // Basic Information (Required)
        name: 'TechCorp Solutions Inc',
        
        // Legal Entity Information
        legal_name: 'TechCorp Solutions Incorporated',
        registration_number: 'DE-123456789',
        registration_date: '2020-03-15',
        tax_id: '12-3456789',
        jurisdiction: 'Delaware',
        business_type: 'Software Technology',
        
        // Status & Compliance
        status: 'active',
        compliance_status: 'compliant',
        onboarding_completed: 'true',
        
        // Contact Information
        contact_email: 'legal@techcorp.com',
        contact_phone: '+1-555-0199',
        website: 'https://techcorp.com',
        
        // Complete Address Information (JSONB)
        address: '{"street":"1234 Innovation Drive","suite":"Suite 500","city":"San Francisco","state":"CA","zipCode":"94105","country":"US","type":"headquarters","coordinates":{"lat":37.7749,"lng":-122.4194},"mailReceiving":true,"verified":true}',
        
        // Legal Representatives (JSONB - Complete examples)
        legal_representatives: '[{"name":"Sarah Johnson","title":"Chief Executive Officer","email":"sarah.johnson@techcorp.com","phone":"+1-555-0100","isPrimary":true,"signatureAuthority":true,"boardMember":true,"equityStake":"15%","residency":"US"},{"name":"Michael Chen","title":"Chief Financial Officer","email":"michael.chen@techcorp.com","phone":"+1-555-0101","isPrimary":false,"signatureAuthority":true,"boardMember":true,"equityStake":"8%","residency":"US"},{"name":"Lisa Wang","title":"General Counsel","email":"lisa.wang@techcorp.com","phone":"+1-555-0102","isPrimary":false,"signatureAuthority":false,"boardMember":false,"equityStake":"2%","residency":"US"}]',
        
        // System Fields (leave empty for auto-generation)
        id: '',
        created_at: '',
        updated_at: ''
      },
      // Example 2: Real Estate Fund (Complete institutional structure)
      {
        name: 'Metro Real Estate Fund LP',
        legal_name: 'Metro Real Estate Fund Limited Partnership',
        registration_number: 'TX-987654321',
        registration_date: '2018-06-01',
        tax_id: '76-5432109',
        jurisdiction: 'Texas',
        business_type: 'Real Estate Investment',
        status: 'active',
        compliance_status: 'compliant',
        onboarding_completed: 'true',
        contact_email: 'operations@metrorefund.com',
        contact_phone: '+1-214-555-0100',
        website: 'https://metrorefund.com',
        address: '{"street":"5678 Commerce Street","suite":"Floor 25","city":"Dallas","state":"TX","zipCode":"75201","country":"US","type":"principal_office","additionalOffices":[{"city":"Houston","state":"TX","type":"regional"},{"city":"Austin","state":"TX","type":"regional"}]}',
        legal_representatives: '[{"name":"Robert Davis","title":"Managing Partner","email":"robert.davis@metrorefund.com","phone":"+1-214-555-0110","isPrimary":true,"signatureAuthority":true,"partnershipInterest":"25%","residency":"TX"},{"name":"Jennifer Martinez","title":"Chief Investment Officer","email":"jennifer.martinez@metrorefund.com","phone":"+1-214-555-0111","isPrimary":false,"signatureAuthority":true,"partnershipInterest":"15%","residency":"TX"}]',
        id: '',
        created_at: '',
        updated_at: ''
      },
      // Example 3: International Entity (Complex offshore structure)
      {
        name: 'Global Ventures Cayman Ltd',
        legal_name: 'Global Ventures (Cayman Islands) Limited',
        registration_number: 'KY-456789123',
        registration_date: '2019-11-20',
        tax_id: 'KY-TAX-456789',
        jurisdiction: 'Cayman Islands',
        business_type: 'Investment Holding Company',
        status: 'active',
        compliance_status: 'compliant',
        onboarding_completed: 'true',
        contact_email: 'compliance@globalventures.ky',
        contact_phone: '+1-345-949-0000',
        website: 'https://globalventures.ky',
        address: '{"street":"Clifton House, 75 Fort Street","city":"George Town","territory":"Grand Cayman","postalCode":"KY1-1108","country":"KY","type":"registered_office","jurisdiction":"Cayman Islands","timeZone":"EST","regulatoryAuthority":"CIMA"}',
        legal_representatives: '[{"name":"James Robertson","title":"Managing Director","email":"james.robertson@globalventures.ky","phone":"+1-345-949-0001","isPrimary":true,"residency":"Cayman Islands","signatureAuthority":true,"directorSince":"2019-11-20","nationality":"British"},{"name":"Maria Santos","title":"Chief Compliance Officer","email":"maria.santos@globalventures.ky","phone":"+1-345-949-0002","isPrimary":false,"residency":"Cayman Islands","signatureAuthority":false,"directorSince":"2020-01-15","nationality":"Caymanian"},{"name":"David Kim","title":"Investment Director","email":"david.kim@globalventures.ky","phone":"+1-345-949-0003","isPrimary":false,"residency":"Singapore","signatureAuthority":true,"directorSince":"2020-06-01","nationality":"Singaporean"}]',
        id: '',
        created_at: '',
        updated_at: ''
      }
    ];

    this.downloadTemplate(template, `issuer_comprehensive_template.${format}`, format);
  }

  /**
   * Download template file
   */
  private downloadTemplate(data: any[], filename: string, format: UploadFileFormat): void {
    if (format === 'csv') {
      const csvContent = Papa.unparse(data);
      this.downloadFile(csvContent, filename, 'text/csv');
    } else {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
      XLSX.writeFile(workbook, filename);
    }
  }

  /**
   * Download file helper
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Utility methods
   */
  private generateSessionId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export singleton instance
export const enhancedUploadService = EnhancedUploadService.getInstance();
