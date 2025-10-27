/**
 * KYC (Know Your Customer) Service
 * 
 * Handles individual verification for PSP identity cases.
 * Creates and manages individual verification workflows with Warp API.
 */

import { PrismaClient, Prisma } from '@/infrastructure/database/generated/index';
import { WarpApiClient } from '@/infrastructure/warp';
import { PSPEncryptionService } from '../security';
import { CaseManagementService } from './case-management.service';
import { logger } from '@/utils/logger';
import {
  PSPIdentityCase,
  PSPServiceResult,
  PersonData,
  EncryptedReference,
  PIIType
} from '@/types/psp';

/**
 * Parameters for creating an individual verification case
 */
export interface CreateIndividualCaseParams {
  projectId: string;
  person: PersonData;
}

/**
 * Parameters for updating person information
 */
export interface UpdatePersonParams {
  caseId: string;
  personId: string;
  updates: Partial<PersonData>;
}

/**
 * KYC Service
 * Manages individual verification workflows
 */
export class KYCService {
  private caseManagement: CaseManagementService;

  constructor(
    private readonly db: PrismaClient,
    private readonly warpClient: WarpApiClient
  ) {
    this.caseManagement = new CaseManagementService(db, warpClient);
  }

  /**
   * Create a new individual verification case
   * Encrypts PII data, stores in local DB, and submits to Warp
   */
  async createIndividualCase(
    params: CreateIndividualCaseParams
  ): Promise<PSPServiceResult<PSPIdentityCase>> {
    try {
      logger.info({
        projectId: params.projectId,
        personName: `${params.person.firstName} ${params.person.lastName}`
      }, 'Creating individual verification case');

      const encryptedPerson = await this.encryptPersonData(
        params.projectId,
        params.person
      );

      const caseRecord = await this.db.psp_identity_cases.create({
        data: {
          project_id: params.projectId,
          case_type: 'individual',
          status: 'pending',
          persons_data: [encryptedPerson] as any,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      const warpPayload = {
        persons: [await this.preparePersonForWarp(params.person)]
      };

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
      }, 'Individual case created and submitted to Warp');

      return {
        success: true,
        data: await this.getCaseWithDecryption(updatedCase.id)
      };

    } catch (error) {
      logger.error({ params, error }, 'Error creating individual case');
      return {
        success: false,
        error: {
          code: 'CREATE_CASE_ERROR',
          message: 'Failed to create individual verification case',
          details: error
        }
      };
    }
  }

  /**
   * Update person information in an existing case
   * Used for re-verification after initial rejection
   */
  async updatePerson(
    params: UpdatePersonParams
  ): Promise<PSPServiceResult<PersonData>> {
    try {
      logger.info({
        caseId: params.caseId,
        personId: params.personId
      }, 'Updating person information');

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

      const personsData = caseRecord.persons_data as PersonData[] | null;
      if (!personsData || personsData.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_PERSON_DATA',
            message: 'Case does not contain person data'
          }
        };
      }

      const personIndex = personsData.findIndex(
        (p: any) => p.id === params.personId || p.email === params.updates.email
      );

      if (personIndex === -1) {
        return {
          success: false,
          error: {
            code: 'PERSON_NOT_FOUND',
            message: `Person ${params.personId} not found in case`
          }
        };
      }

      const existingPerson = personsData[personIndex];
      
      if (!existingPerson) {
        return {
          success: false,
          error: {
            code: 'PERSON_NOT_FOUND',
            message: `Person not found at index ${personIndex}`
          }
        };
      }
      
      // Ensure all required PersonData fields are present
      const updatedPersonData: PersonData = {
        ...existingPerson,
        ...params.updates,
        email: params.updates.email || existingPerson.email,
        address: params.updates.address || existingPerson.address,
        role: params.updates.role || existingPerson.role
      };

      const encryptedPerson = await this.encryptPersonData(
        caseRecord.project_id,
        updatedPersonData
      );

      const updatedPersonsData = [...personsData];
      updatedPersonsData[personIndex] = encryptedPerson;

      const warpPayload = await this.preparePersonForWarp(updatedPersonData);

      const warpResponse = await this.warpClient.patch(
        `/identity/cases/${caseRecord.warp_case_id}/persons/${params.personId}`,
        warpPayload
      );

      if (!warpResponse.success) {
        return {
          success: false,
          error: {
            code: 'WARP_UPDATE_FAILED',
            message: 'Failed to update person in Warp',
            details: warpResponse.error
          }
        };
      }

      await this.db.psp_identity_cases.update({
        where: { id: params.caseId },
        data: {
          persons_data: updatedPersonsData as any,
          status: 'in_review',
          updated_at: new Date()
        }
      });

      logger.info({
        caseId: params.caseId,
        personId: params.personId
      }, 'Person information updated');

      return {
        success: true,
        data: updatedPersonData
      };

    } catch (error) {
      logger.error({ params, error }, 'Error updating person');
      return {
        success: false,
        error: {
          code: 'UPDATE_PERSON_ERROR',
          message: 'Failed to update person information',
          details: error
        }
      };
    }
  }

  /**
   * Get person details from a case
   */
  async getPerson(
    caseId: string,
    personId: string
  ): Promise<PSPServiceResult<PersonData>> {
    try {
      const caseResult = await this.caseManagement.getCase(caseId, false);

      if (!caseResult.success || !caseResult.data) {
        return {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: `Case ${caseId} not found`
          }
        };
      }

      const personsData = caseResult.data.persons_data;
      if (!personsData || personsData.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_PERSON_DATA',
            message: 'Case does not contain person data'
          }
        };
      }

      const person = personsData.find(
        (p: any) => p.id === personId || p.email === personId
      );

      if (!person) {
        return {
          success: false,
          error: {
            code: 'PERSON_NOT_FOUND',
            message: `Person ${personId} not found in case`
          }
        };
      }

      return {
        success: true,
        data: person
      };

    } catch (error) {
      logger.error({ caseId, personId, error }, 'Error getting person');
      return {
        success: false,
        error: {
          code: 'GET_PERSON_ERROR',
          message: 'Failed to retrieve person information',
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
   * Get case with decrypted data
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
