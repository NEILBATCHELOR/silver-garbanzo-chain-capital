/**
 * KYB (Know Your Business) Service
 * 
 * Handles business verification for PSP identity cases.
 * Creates and manages business verification workflows with Warp API.
 */

import { PrismaClient, Prisma } from '@/infrastructure/database/generated/index';
import { WarpApiClient } from '@/infrastructure/warp';
import { PSPEncryptionService } from '../security';
import { CaseManagementService } from './case-management.service';
import { logger } from '@/utils/logger';
import {
  PSPIdentityCase,
  PSPServiceResult,
  BusinessData,
  PersonData,
  CreateIdentityCaseRequest,
  EncryptedReference,
  PIIType
} from '@/types/psp';

/**
 * Parameters for creating a business verification case
 */
export interface CreateBusinessCaseParams {
  projectId: string;
  business: BusinessData;
  persons: PersonData[]; // Beneficial owners and control persons
}

/**
 * Parameters for updating business information
 */
export interface UpdateBusinessParams {
  caseId: string;
  businessId: string;
  updates: Partial<BusinessData>;
}

/**
 * Parameters for adding a beneficial owner
 */
export interface AddBeneficialOwnerParams {
  caseId: string;
  person: PersonData;
}

/**
 * KYB Service
 * Manages business verification workflows
 */
export class KYBService {
  private caseManagement: CaseManagementService;

  constructor(
    private readonly db: PrismaClient,
    private readonly warpClient: WarpApiClient
  ) {
    this.caseManagement = new CaseManagementService(db, warpClient);
  }

  /**
   * Create a new business verification case
   * Encrypts PII data, stores in local DB, and submits to Warp
   */
  async createBusinessCase(
    params: CreateBusinessCaseParams
  ): Promise<PSPServiceResult<PSPIdentityCase>> {
    try {
      logger.info({
        projectId: params.projectId,
        businessName: params.business.legalName
      }, 'Creating business verification case');

      if (!params.persons || params.persons.length === 0) {
        return {
          success: false,
          error: {
            code: 'MISSING_PERSONS',
            message: 'At least one beneficial owner or control person is required for business verification'
          }
        };
      }

      const encryptedBusiness = await this.encryptBusinessData(
        params.projectId,
        params.business
      );

      const encryptedPersons = await Promise.all(
        params.persons.map(person => 
          this.encryptPersonData(params.projectId, person)
        )
      );

      const caseRecord = await this.db.psp_identity_cases.create({
        data: {
          project_id: params.projectId,
          case_type: 'business',
          status: 'pending',
          business_data: encryptedBusiness as any,
          persons_data: encryptedPersons as any,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      const warpPayload = await this.prepareWarpPayload(
        params.business,
        params.persons
      );

      const warpResponse = await this.warpClient.post('/identity/cases', warpPayload);

      if (!warpResponse.success) {
        await this.db.psp_identity_cases.update({
          where: { id: caseRecord.id },
          data: {
            status: 'rejected',
            rejection_reasons: [warpResponse.error?.message || 'Failed to submit to Warp'],
            updated_at: new Date()
          }
        });

        return {
          success: false,
          error: {
            code: 'WARP_SUBMISSION_FAILED',
            message: 'Failed to submit case to Warp',
            details: warpResponse.error
          }
        };
      }

      const warpCaseId = warpResponse.data?.case_id || warpResponse.data?.id;

      const updatedCase = await this.db.psp_identity_cases.update({
        where: { id: caseRecord.id },
        data: {
          warp_case_id: warpCaseId,
          status: 'in_review',
          submitted_at: new Date(),
          updated_at: new Date()
        }
      });

      logger.info({
        caseId: caseRecord.id,
        warpCaseId
      }, 'Business case created and submitted to Warp');

      return {
        success: true,
        data: await this.getCaseWithDecryption(updatedCase.id)
      };

    } catch (error) {
      logger.error({ params, error }, 'Error creating business case');
      return {
        success: false,
        error: {
          code: 'CREATE_CASE_ERROR',
          message: 'Failed to create business verification case',
          details: error
        }
      };
    }
  }

  /**
   * Update business information in an existing case
   * Used for re-verification after initial rejection
   */
  async updateBusiness(
    params: UpdateBusinessParams
  ): Promise<PSPServiceResult<PSPIdentityCase>> {
    try {
      logger.info({
        caseId: params.caseId,
        businessId: params.businessId
      }, 'Updating business information');

      const caseRecord = await this.db.psp_identity_cases.findUnique({
        where: { id: params.caseId }
      });

      if (!caseRecord) {
        return {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: `Case ${params.caseId} not found`
          }
        };
      }

      if (!caseRecord.warp_case_id) {
        return {
          success: false,
          error: {
            code: 'NO_WARP_CASE_ID',
            message: 'Case has not been submitted to Warp yet'
          }
        };
      }

      const existingBusiness = caseRecord.business_data as BusinessData | null;
      if (!existingBusiness) {
        return {
          success: false,
          error: {
            code: 'NO_BUSINESS_DATA',
            message: 'Case does not contain business data'
          }
        };
      }

      const updatedBusiness = {
        ...existingBusiness,
        ...params.updates
      };

      const encryptedBusiness = await this.encryptBusinessData(
        caseRecord.project_id,
        updatedBusiness
      );

      const warpPayload = await this.prepareBusinessForWarp(updatedBusiness);

      const warpResponse = await this.warpClient.patch(
        `/identity/cases/${caseRecord.warp_case_id}/businesses/${params.businessId}`,
        warpPayload
      );

      if (!warpResponse.success) {
        return {
          success: false,
          error: {
            code: 'WARP_UPDATE_FAILED',
            message: 'Failed to update business in Warp',
            details: warpResponse.error
          }
        };
      }

      const updatedCase = await this.db.psp_identity_cases.update({
        where: { id: params.caseId },
        data: {
          business_data: encryptedBusiness as any,
          status: 'in_review',
          updated_at: new Date()
        }
      });

      logger.info({
        caseId: params.caseId,
        businessId: params.businessId
      }, 'Business information updated');

      return {
        success: true,
        data: await this.getCaseWithDecryption(updatedCase.id)
      };

    } catch (error) {
      logger.error({ params, error }, 'Error updating business');
      return {
        success: false,
        error: {
          code: 'UPDATE_BUSINESS_ERROR',
          message: 'Failed to update business information',
          details: error
        }
      };
    }
  }

  /**
   * Add a beneficial owner to an existing case
   */
  async addBeneficialOwner(
    params: AddBeneficialOwnerParams
  ): Promise<PSPServiceResult<PSPIdentityCase>> {
    try {
      logger.info({ caseId: params.caseId }, 'Adding beneficial owner');

      const caseRecord = await this.db.psp_identity_cases.findUnique({
        where: { id: params.caseId }
      });

      if (!caseRecord) {
        return {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: `Case ${params.caseId} not found`
          }
        };
      }

      const existingPersons = ((caseRecord.persons_data as unknown) as PersonData[]) || [];
      const encryptedPerson = await this.encryptPersonData(
        caseRecord.project_id,
        params.person
      );

      const updatedPersons = [...existingPersons, encryptedPerson];

      await this.db.psp_identity_cases.update({
        where: { id: params.caseId },
        data: {
          persons_data: updatedPersons as any,
          updated_at: new Date()
        }
      });

      if (caseRecord.warp_case_id) {
        const warpPersonPayload = await this.preparePersonForWarp(params.person);
        await this.warpClient.post(
          `/identity/cases/${caseRecord.warp_case_id}/persons`,
          warpPersonPayload
        );
      }

      logger.info({ caseId: params.caseId }, 'Beneficial owner added');

      return {
        success: true,
        data: await this.getCaseWithDecryption(params.caseId)
      };

    } catch (error) {
      logger.error({ params, error }, 'Error adding beneficial owner');
      return {
        success: false,
        error: {
          code: 'ADD_OWNER_ERROR',
          message: 'Failed to add beneficial owner',
          details: error
        }
      };
    }
  }

  /**
   * Re-submit a case for verification after corrections
   */
  async resubmitForVerification(
    caseId: string
  ): Promise<PSPServiceResult<PSPIdentityCase>> {
    try {
      logger.info({ caseId }, 'Re-submitting case for verification');

      const result = await this.caseManagement.syncCaseStatus(caseId);

      if (!result.success) {
        return result;
      }

      logger.info({ caseId }, 'Case re-submitted successfully');

      return result;

    } catch (error) {
      logger.error({ caseId, error }, 'Error re-submitting case');
      return {
        success: false,
        error: {
          code: 'RESUBMIT_ERROR',
          message: 'Failed to re-submit case for verification',
          details: error
        }
      };
    }
  }

  /**
   * Encrypt sensitive business data fields (tax ID, registration number)
   * @private
   */
  private async encryptBusinessData(
    projectId: string,
    business: BusinessData
  ): Promise<BusinessData> {
    const encrypted = { ...business };

    if (business.taxId) {
      const taxIdRef = await PSPEncryptionService.encryptPII(
        business.taxId,
        projectId,
        'tax_id',
        'system'
      );
      encrypted.taxId = taxIdRef as any;
    }

    if (business.registrationNumber) {
      const regNumRef = await PSPEncryptionService.encryptPII(
        business.registrationNumber,
        projectId,
        'tax_id',
        'system'
      );
      encrypted.registrationNumber = regNumRef as any;
    }

    return encrypted;
  }

  /**
   * Encrypt sensitive person data fields (SSN, ID number)
   * @private
   */
  private async encryptPersonData(
    projectId: string,
    person: PersonData
  ): Promise<PersonData> {
    const encrypted = { ...person };

    if (person.ssn) {
      const ssnRef = await PSPEncryptionService.encryptPII(
        person.ssn,
        projectId,
        'ssn',
        'system'
      );
      encrypted.ssn = ssnRef as any;
    }

    if (person.idNumber) {
      const idRef = await PSPEncryptionService.encryptPII(
        person.idNumber,
        projectId,
        'id_number',
        'system'
      );
      encrypted.idNumber = idRef as any;
    }

    return encrypted;
  }

  /**
   * Prepare Warp API payload with decrypted data
   * @private
   */
  private async prepareWarpPayload(
    business: BusinessData,
    persons: PersonData[]
  ): Promise<any> {
    const decryptedBusiness = await this.prepareBusinessForWarp(business);
    const decryptedPersons = await Promise.all(
      persons.map(p => this.preparePersonForWarp(p))
    );

    return {
      business: decryptedBusiness,
      persons: decryptedPersons
    };
  }

  /**
   * Prepare business data for Warp (decrypt if needed)
   * @private
   */
  private async prepareBusinessForWarp(business: BusinessData): Promise<any> {
    const prepared = { ...business };

    if (typeof business.taxId === 'object') {
      const ref = business.taxId as unknown as EncryptedReference;
      prepared.taxId = await PSPEncryptionService.decryptPII(ref.vault_id);
    }

    if (typeof business.registrationNumber === 'object') {
      const ref = business.registrationNumber as unknown as EncryptedReference;
      prepared.registrationNumber = await PSPEncryptionService.decryptPII(ref.vault_id);
    }

    return prepared;
  }

  /**
   * Prepare person data for Warp (decrypt if needed)
   * @private
   */
  private async preparePersonForWarp(person: PersonData): Promise<any> {
    const prepared = { ...person };

    if (typeof person.ssn === 'object') {
      const ref = person.ssn as unknown as EncryptedReference;
      prepared.ssn = await PSPEncryptionService.decryptPII(ref.vault_id);
    }

    if (typeof person.idNumber === 'object') {
      const ref = person.idNumber as unknown as EncryptedReference;
      prepared.idNumber = await PSPEncryptionService.decryptPII(ref.vault_id);
    }

    return prepared;
  }

  /**
   * Get case with decryption
   * @private
   */
  private async getCaseWithDecryption(caseId: string): Promise<PSPIdentityCase> {
    const result = await this.caseManagement.getCase(caseId, false);
    if (!result.success || !result.data) {
      throw new Error(`Failed to retrieve case ${caseId}`);
    }
    return result.data;
  }
}
