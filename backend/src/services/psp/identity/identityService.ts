/**
 * PSP Identity Service
 * 
 * Manages KYB (Know Your Business) and KYC (Know Your Customer) verification.
 * Handles case creation, status tracking, and data updates with Warp Identity API.
 * 
 * Features:
 * - Business and individual verification
 * - PII encryption for sensitive data
 * - Status synchronization with Warp
 * - Verification result tracking
 * - Re-verification support
 */

import { Prisma, psp_identity_cases } from '@/infrastructure/database/generated/index';
import { BaseService } from '../../BaseService';
import { logger } from '@/utils/logger';
import { PSPEncryptionService } from '../security/pspEncryptionService';
import { WarpClientService } from '../auth/warpClientService';
import { ServiceResult } from '@/types/api';

export interface BusinessData {
  name?: string;
  legalName: string;
  description: string;
  taxId: string;
  registrationNumber: string;
  industry?: string;
  phoneNumber?: string;
  email: string;
  website?: string;
  legalEntityType: string;
  incorporationDate: string;
  stateOfFormation: string;
  countryOfFormation: string;
  registeredAddress: Address;
  physicalAddress: Address;
}

export interface PersonData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  ssn?: string;
  idNumber?: string;
  birthdate?: string;
  employmentStatus?: string;
  industry?: string;
  occupation?: string;
  annualIncome?: number;
  incomeSource?: string;
  wealthSource?: string;
  address: Address;
  role: string;
}

export interface Address {
  street1: string;
  street2?: string;
  district?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CreateCaseRequest {
  projectId: string;
  caseType: 'individual' | 'business';
  businessData?: BusinessData;
  personsData: PersonData[];
}

export interface IdentityCaseResponse {
  id: string;
  projectId: string;
  warpCaseId: string | null;
  caseType: 'individual' | 'business';
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'review_required';
  businessData?: Record<string, unknown>;
  personsData?: Record<string, unknown>[];
  verificationResults?: Record<string, unknown>;
  nextSteps?: string[];
  missingFields?: string[];
  rejectionReasons?: string[];
  submittedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class IdentityService extends BaseService {
  constructor() {
    super('Identity');
  }

  /**
   * Create a new KYB/KYC case
   * Encrypts sensitive PII data before submission
   */
  async createCase(
    request: CreateCaseRequest,
    environment: 'sandbox' | 'production',
    userId: string = 'system'
  ): Promise<IdentityCaseResponse> {
    this.logInfo('Creating identity case', { 
      projectId: request.projectId,
      caseType: request.caseType 
    });

    try {
      // Encrypt sensitive PII data
      const encryptedBusiness = request.businessData 
        ? await this.encryptBusinessData(request.businessData, request.projectId, userId)
        : undefined;

      const encryptedPersons = await Promise.all(
        request.personsData.map(person => 
          this.encryptPersonData(person, request.projectId, userId)
        )
      );

      // Prepare payload for Warp API
      const warpPayload: any = {
        business: encryptedBusiness,
        persons: encryptedPersons
      };

      // Submit to Warp Identity API
      const warpClient = await WarpClientService.getClientForProject(
        request.projectId,
        environment
      );

      const warpResponse = await warpClient.post('/identity/cases', warpPayload);
      const warpCaseId = warpResponse.data.case_id || warpResponse.data.id;

      // Store case in database using BaseService
      const result: ServiceResult<psp_identity_cases> = await this.createEntity(this.db.psp_identity_cases, {
        project_id: request.projectId,
        warp_case_id: warpCaseId,
        case_type: request.caseType,
        status: 'pending',
        business_data: encryptedBusiness as Prisma.InputJsonValue,
        persons_data: encryptedPersons as Prisma.InputJsonValue,
        submitted_at: new Date()
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create case');
      }

      this.logInfo('Identity case created successfully', { 
        caseId: result.data.id,
        warpCaseId 
      });

      return this.toCaseResponse(result.data);
    } catch (error) {
      this.logError('Failed to create identity case', { error, request });
      throw error;
    }
  }

  /**
   * Get case details
   */
  async getCase(caseId: string): Promise<IdentityCaseResponse | null> {
    const result: ServiceResult<psp_identity_cases> = await this.findById(this.db.psp_identity_cases, caseId);
    if (!result.success || !result.data) return null;
    return this.toCaseResponse(result.data);
  }

  /**
   * List cases for a project
   */
  async listCases(
    projectId: string,
    options: {
      caseType?: 'individual' | 'business';
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<IdentityCaseResponse[]> {
    const where: Prisma.psp_identity_casesWhereInput = {
      project_id: projectId
    };

    if (options.caseType) {
      where.case_type = options.caseType;
    }

    if (options.status) {
      where.status = options.status;
    }

    const records = await this.db.psp_identity_cases.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0
    });

    return records.map(r => this.toCaseResponse(r));
  }

  /**
   * Sync case status from Warp API
   */
  async syncCaseStatus(
    caseId: string,
    environment: 'sandbox' | 'production'
  ): Promise<IdentityCaseResponse> {
    this.logInfo('Syncing case status', { caseId });

    const findResult: ServiceResult<psp_identity_cases> = await this.findById(this.db.psp_identity_cases, caseId);
    if (!findResult.success || !findResult.data) {
      throw new Error('Case not found');
    }
    const record = findResult.data;

    if (!record.warp_case_id) {
      throw new Error('Case not submitted to Warp');
    }

    try {
      // Get status from Warp API
      const warpClient = await WarpClientService.getClientForProject(
        record.project_id,
        environment
      );

      const warpResponse = await warpClient.get(`/identity/cases/${record.warp_case_id}`);
      const warpData = warpResponse.data;

      // Update local record
      const updateData: Prisma.psp_identity_casesUpdateInput = {
        status: warpData.status,
        verification_results: warpData.verification_results as Prisma.InputJsonValue,
        next_steps: warpData.next_steps || [],
        missing_fields: warpData.missing_fields || [],
        rejection_reasons: warpData.rejection_reasons || [],
        updated_at: new Date()
      };

      // Update timestamps based on status
      if (warpData.status === 'approved' && !record.approved_at) {
        updateData.approved_at = new Date();
      } else if (warpData.status === 'rejected' && !record.rejected_at) {
        updateData.rejected_at = new Date();
      }

      const updateResult: ServiceResult<psp_identity_cases> = await this.updateEntity(this.db.psp_identity_cases, caseId, updateData);
      if (!updateResult.success || !updateResult.data) {
        throw new Error(updateResult.error || 'Failed to update case');
      }

      this.logInfo('Case status synced successfully', { 
        caseId,
        status: warpData.status 
      });

      return this.toCaseResponse(updateResult.data);
    } catch (error) {
      this.logError('Failed to sync case status', { error, caseId });
      throw error;
    }
  }

  /**
   * Update person information in a case
   */
  async updatePerson(
    caseId: string,
    personId: string,
    updates: Partial<PersonData>,
    environment: 'sandbox' | 'production',
    userId: string = 'system'
  ): Promise<IdentityCaseResponse> {
    this.logInfo('Updating person in case', { caseId, personId });

    const findResult: ServiceResult<psp_identity_cases> = await this.findById(this.db.psp_identity_cases, caseId);
    if (!findResult.success || !findResult.data) {
      throw new Error('Case not found');
    }
    const record = findResult.data;

    if (!record.warp_case_id) {
      throw new Error('Case not submitted to Warp');
    }

    try {
      // Encrypt sensitive data in updates
      const encryptedUpdates = await this.encryptPersonData(
        updates as PersonData,
        record.project_id,
        userId
      );

      // Update in Warp API
      const warpClient = await WarpClientService.getClientForProject(
        record.project_id,
        environment
      );

      await warpClient.patch(
        `/identity/cases/${record.warp_case_id}/persons/${personId}`,
        encryptedUpdates
      );

      // Update local persons_data
      const personsData = (record.persons_data as any[]) || [];
      const personIndex = personsData.findIndex((p: any) => p.id === personId);
      
      if (personIndex >= 0) {
        personsData[personIndex] = {
          ...personsData[personIndex],
          ...encryptedUpdates
        };
      }

      const updateResult: ServiceResult<psp_identity_cases> = await this.updateEntity(this.db.psp_identity_cases, caseId, {
        persons_data: personsData as Prisma.InputJsonValue,
        updated_at: new Date()
      });

      if (!updateResult.success || !updateResult.data) {
        throw new Error(updateResult.error || 'Failed to update person');
      }

      this.logInfo('Person updated successfully', { caseId, personId });

      return this.toCaseResponse(updateResult.data);
    } catch (error) {
      this.logError('Failed to update person', { error, caseId, personId });
      throw error;
    }
  }

  /**
   * Update business information in a case
   */
  async updateBusiness(
    caseId: string,
    businessId: string,
    updates: Partial<BusinessData>,
    environment: 'sandbox' | 'production',
    userId: string = 'system'
  ): Promise<IdentityCaseResponse> {
    this.logInfo('Updating business in case', { caseId, businessId });

    const findResult: ServiceResult<psp_identity_cases> = await this.findById(this.db.psp_identity_cases, caseId);
    if (!findResult.success || !findResult.data) {
      throw new Error('Case not found');
    }
    const record = findResult.data;

    if (!record.warp_case_id) {
      throw new Error('Case not submitted to Warp');
    }

    try {
      // Encrypt sensitive data in updates
      const encryptedUpdates = await this.encryptBusinessData(
        updates as BusinessData,
        record.project_id,
        userId
      );

      // Update in Warp API
      const warpClient = await WarpClientService.getClientForProject(
        record.project_id,
        environment
      );

      await warpClient.patch(
        `/identity/cases/${record.warp_case_id}/businesses/${businessId}`,
        encryptedUpdates
      );

      // Update local business_data
      const businessData = (record.business_data as Record<string, unknown>) || {};
      const updatedBusinessData = {
        ...businessData,
        ...encryptedUpdates
      };

      const updateResult: ServiceResult<psp_identity_cases> = await this.updateEntity(this.db.psp_identity_cases, caseId, {
        business_data: updatedBusinessData as Prisma.InputJsonValue,
        updated_at: new Date()
      });

      if (!updateResult.success || !updateResult.data) {
        throw new Error(updateResult.error || 'Failed to update business');
      }

      this.logInfo('Business updated successfully', { caseId, businessId });

      return this.toCaseResponse(updateResult.data);
    } catch (error) {
      this.logError('Failed to update business', { error, caseId, businessId });
      throw error;
    }
  }

  /**
   * Deactivate a case
   */
  async deactivateCase(
    caseId: string,
    environment: 'sandbox' | 'production'
  ): Promise<void> {
    this.logInfo('Deactivating case', { caseId });

    const findResult: ServiceResult<psp_identity_cases> = await this.findById(this.db.psp_identity_cases, caseId);
    if (!findResult.success || !findResult.data) {
      throw new Error('Case not found');
    }
    const record = findResult.data;

    if (!record.warp_case_id) {
      throw new Error('Case not submitted to Warp');
    }

    try {
      // Deactivate in Warp API
      const warpClient = await WarpClientService.getClientForProject(
        record.project_id,
        environment
      );

      await warpClient.delete(`/identity/cases/${record.warp_case_id}`);

      // Update local record
      await this.updateEntity(this.db.psp_identity_cases, caseId, {
        status: 'rejected',
        rejection_reasons: ['Case deactivated by user'],
        rejected_at: new Date(),
        updated_at: new Date()
      });

      this.logInfo('Case deactivated successfully', { caseId });
    } catch (error) {
      this.logError('Failed to deactivate case', { error, caseId });
      throw error;
    }
  }

  /**
   * Encrypt sensitive business data
   */
  private async encryptBusinessData(
    business: BusinessData,
    projectId: string,
    userId: string
  ): Promise<Record<string, unknown>> {
    const encrypted: Record<string, unknown> = { ...business };

    // Encrypt tax ID
    if (business.taxId) {
      const vault = await PSPEncryptionService.encryptPII(
        business.taxId,
        projectId,
        'tax_id',
        userId
      );
      encrypted.taxId = vault.vaultId;
      encrypted.taxIdVaultId = vault.vaultId;
    }

    return encrypted;
  }

  /**
   * Encrypt sensitive person data
   */
  private async encryptPersonData(
    person: PersonData,
    projectId: string,
    userId: string
  ): Promise<Record<string, unknown>> {
    const encrypted: Record<string, unknown> = { ...person };

    // Encrypt SSN
    if (person.ssn) {
      const vault = await PSPEncryptionService.encryptPII(
        person.ssn,
        projectId,
        'ssn',
        userId
      );
      encrypted.ssn = vault.vaultId;
      encrypted.ssnVaultId = vault.vaultId;
    }

    // Encrypt ID number
    if (person.idNumber) {
      const vault = await PSPEncryptionService.encryptPII(
        person.idNumber,
        projectId,
        'id_number',
        userId
      );
      encrypted.idNumber = vault.vaultId;
      encrypted.idNumberVaultId = vault.vaultId;
    }

    return encrypted;
  }

  /**
   * Convert database record to response format
   */
  private toCaseResponse(record: psp_identity_cases): IdentityCaseResponse {
    return {
      id: record.id,
      projectId: record.project_id,
      warpCaseId: record.warp_case_id,
      caseType: record.case_type as 'individual' | 'business',
      status: record.status as any,
      businessData: record.business_data as Record<string, unknown> | undefined,
      personsData: record.persons_data as Record<string, unknown>[] | undefined,
      verificationResults: record.verification_results as Record<string, unknown> | undefined,
      nextSteps: record.next_steps || undefined,
      missingFields: record.missing_fields || undefined,
      rejectionReasons: record.rejection_reasons || undefined,
      submittedAt: record.submitted_at,
      approvedAt: record.approved_at,
      rejectedAt: record.rejected_at,
      createdAt: record.created_at || new Date(),
      updatedAt: record.updated_at || new Date()
    };
  }
}

export default IdentityService;