/**
 * Case Management Service
 * 
 * Shared logic for managing KYB/KYC identity verification cases.
 * Handles case lifecycle, status synchronization, and webhook processing.
 */

import { PrismaClient, Prisma } from '@/infrastructure/database/generated/index';
import { WarpApiClient } from '@/infrastructure/warp';
import { PSPEncryptionService } from '../security';
import { logger } from '@/utils/logger';
import {
  PSPIdentityCase,
  PSPServiceResult,
  IdentityCaseStatus,
  IdentityCaseType,
  BusinessData,
  PersonData,
  WarpWebhookEventPayload,
  EncryptedReference,
  PIIType
} from '@/types/psp';

/**
 * Filters for querying identity cases
 */
export interface CaseFilters {
  projectId: string;
  caseType?: IdentityCaseType;
  status?: IdentityCaseStatus;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Case Management Service
 * Handles shared operations for identity verification cases
 */
export class CaseManagementService {
  constructor(
    private readonly db: PrismaClient,
    private readonly warpClient: WarpApiClient
  ) {}

  /**
   * Get a single identity case by ID
   * Retrieves from local database and optionally syncs with Warp
   */
  async getCase(
    caseId: string,
    syncWithWarp: boolean = false
  ): Promise<PSPServiceResult<PSPIdentityCase>> {
    try {
      if (syncWithWarp) {
        await this.syncCaseStatus(caseId);
      }

      const caseRecord = await this.db.psp_identity_cases.findUnique({
        where: { id: caseId }
      });

      if (!caseRecord) {
        return {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: `Identity case ${caseId} not found`
          }
        };
      }

      const decryptedCase = await this.decryptCaseData(caseRecord);

      return {
        success: true,
        data: this.transformDbCaseToType(decryptedCase)
      };

    } catch (error) {
      logger.error({ caseId, error }, 'Error getting identity case');
      return {
        success: false,
        error: {
          code: 'GET_CASE_ERROR',
          message: 'Failed to retrieve identity case',
          details: error
        }
      };
    }
  }

  /**
   * List identity cases with filters
   */
  async listCases(filters: CaseFilters): Promise<PSPServiceResult<PSPIdentityCase[]>> {
    try {
      const where: Prisma.psp_identity_casesWhereInput = {
        project_id: filters.projectId
      };

      if (filters.caseType) {
        where.case_type = filters.caseType;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.created_at = {};
        if (filters.dateFrom) {
          where.created_at.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.created_at.lte = filters.dateTo;
        }
      }

      const cases = await this.db.psp_identity_cases.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0
      });

      const decryptedCases = await Promise.all(
        cases.map(c => this.decryptCaseData(c))
      );

      return {
        success: true,
        data: decryptedCases.map(c => this.transformDbCaseToType(c))
      };

    } catch (error) {
      logger.error({ filters, error }, 'Error listing identity cases');
      return {
        success: false,
        error: {
          code: 'LIST_CASES_ERROR',
          message: 'Failed to list identity cases',
          details: error
        }
      };
    }
  }

  /**
   * Sync case status from Warp API to local database
   */
  async syncCaseStatus(caseId: string): Promise<PSPServiceResult<PSPIdentityCase>> {
    try {
      const caseRecord = await this.db.psp_identity_cases.findUnique({
        where: { id: caseId }
      });

      if (!caseRecord) {
        return {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: `Identity case ${caseId} not found`
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

      const warpResponse = await this.warpClient.get(
        `/identity/cases/${caseRecord.warp_case_id}`
      );

      if (!warpResponse.success) {
        return {
          success: false,
          error: {
            code: 'WARP_API_ERROR',
            message: 'Failed to fetch case status from Warp',
            details: warpResponse.error
          }
        };
      }

      const warpCaseData = warpResponse.data;
      const newStatus = warpCaseData.status as IdentityCaseStatus;
      const statusChanged = caseRecord.status !== newStatus;

      const updates: Prisma.psp_identity_casesUpdateInput = {
        status: newStatus,
        verification_results: warpCaseData.verification_results || Prisma.JsonNull,
        next_steps: warpCaseData.next_steps || [],
        missing_fields: warpCaseData.missing_fields || [],
        rejection_reasons: warpCaseData.rejection_reasons || [],
        updated_at: new Date()
      };

      if (newStatus === 'approved' && !caseRecord.approved_at) {
        updates.approved_at = new Date();
      } else if (newStatus === 'rejected' && !caseRecord.rejected_at) {
        updates.rejected_at = new Date();
      }

      const updatedCase = await this.db.psp_identity_cases.update({
        where: { id: caseId },
        data: updates
      });

      if (statusChanged) {
        logger.info({
          caseId,
          oldStatus: caseRecord.status,
          newStatus
        }, 'Case status updated from Warp');
      }

      const decryptedCase = await this.decryptCaseData(updatedCase);

      return {
        success: true,
        data: this.transformDbCaseToType(decryptedCase)
      };

    } catch (error) {
      logger.error({ caseId, error }, 'Error syncing case status');
      return {
        success: false,
        error: {
          code: 'SYNC_STATUS_ERROR',
          message: 'Failed to sync case status from Warp',
          details: error
        }
      };
    }
  }

  /**
   * Deactivate an identity case
   * Deactivates in both Warp and local database
   */
  async deactivateCase(caseId: string): Promise<PSPServiceResult<void>> {
    try {
      const caseRecord = await this.db.psp_identity_cases.findUnique({
        where: { id: caseId }
      });

      if (!caseRecord) {
        return {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: `Identity case ${caseId} not found`
          }
        };
      }

      if (caseRecord.warp_case_id) {
        const warpResponse = await this.warpClient.delete(
          `/identity/cases/${caseRecord.warp_case_id}`
        );

        if (!warpResponse.success) {
          logger.warn({
            caseId,
            warpCaseId: caseRecord.warp_case_id,
            error: warpResponse.error
          }, 'Failed to deactivate case in Warp, continuing with local deactivation');
        }
      }

      await this.db.psp_identity_cases.update({
        where: { id: caseId },
        data: {
          status: 'rejected',
          updated_at: new Date()
        }
      });

      logger.info({ caseId }, 'Case deactivated');

      return {
        success: true
      };

    } catch (error) {
      logger.error({ caseId, error }, 'Error deactivating case');
      return {
        success: false,
        error: {
          code: 'DEACTIVATE_ERROR',
          message: 'Failed to deactivate identity case',
          details: error
        }
      };
    }
  }

  /**
   * Handle webhook event for case status change
   * Processes Business.approved, Business.rejected, Business.review_required events
   */
  async handleCaseWebhook(event: WarpWebhookEventPayload): Promise<void> {
    try {
      logger.info({
        eventId: event.id,
        eventName: event.eventName
      }, 'Processing case webhook event');

      if (!event.resources || event.resources.length === 0) {
        logger.warn({ event }, 'Webhook event missing resources');
        return;
      }

      const caseUrl = event.resources[0];
      if (!caseUrl) {
        logger.warn({ event }, 'Webhook event has empty resource URL');
        return;
      }
      
      const warpCaseId = caseUrl.split('/').pop();

      if (!warpCaseId) {
        logger.warn({
          eventId: event.id,
          caseUrl
        }, 'Could not extract case ID from webhook resource URL');
        return;
      }

      const caseRecord = await this.db.psp_identity_cases.findFirst({
        where: { warp_case_id: warpCaseId }
      });

      if (!caseRecord) {
        logger.warn({
          eventId: event.id,
          warpCaseId
        }, 'Case not found for webhook event');
        return;
      }

      await this.syncCaseStatus(caseRecord.id);

      logger.info({
        eventId: event.id,
        caseId: caseRecord.id,
        warpCaseId
      }, 'Successfully processed case webhook');

    } catch (error) {
      logger.error({ event, error }, 'Error handling case webhook');
      throw error;
    }
  }

  /**
   * Decrypt sensitive PII data in a case record
   * @private
   */
  private async decryptCaseData(
    caseRecord: any
  ): Promise<any> {
    try {
      const decryptedRecord = { ...caseRecord };

      if (caseRecord.business_data) {
        const businessData = caseRecord.business_data as any;
        const decryptedBusiness = { ...businessData };

        if (businessData.taxId && typeof businessData.taxId === 'object') {
          const taxIdRef = businessData.taxId as EncryptedReference;
          decryptedBusiness.taxId = await PSPEncryptionService.decryptPII(taxIdRef.vault_id);
        }

        if (businessData.registrationNumber && typeof businessData.registrationNumber === 'object') {
          const regNumRef = businessData.registrationNumber as EncryptedReference;
          decryptedBusiness.registrationNumber = await PSPEncryptionService.decryptPII(regNumRef.vault_id);
        }

        decryptedRecord.business_data = decryptedBusiness;
      }

      if (caseRecord.persons_data && Array.isArray(caseRecord.persons_data)) {
        const personsData = caseRecord.persons_data as any[];
        const decryptedPersons = await Promise.all(
          personsData.map(async (person) => {
            const decryptedPerson = { ...person };

            if (person.ssn && typeof person.ssn === 'object') {
              const ssnRef = person.ssn as EncryptedReference;
              decryptedPerson.ssn = await PSPEncryptionService.decryptPII(ssnRef.vault_id);
            }

            if (person.idNumber && typeof person.idNumber === 'object') {
              const idRef = person.idNumber as EncryptedReference;
              decryptedPerson.idNumber = await PSPEncryptionService.decryptPII(idRef.vault_id);
            }

            return decryptedPerson;
          })
        );

        decryptedRecord.persons_data = decryptedPersons;
      }

      return decryptedRecord;

    } catch (error) {
      logger.error({ caseId: caseRecord.id, error }, 'Error decrypting case data');
      throw error;
    }
  }

  /**
   * Transform database case record to PSPIdentityCase type
   * @private
   */
  private transformDbCaseToType(dbCase: any): PSPIdentityCase {
    return {
      id: dbCase.id,
      project_id: dbCase.project_id,
      warp_case_id: dbCase.warp_case_id || undefined,
      case_type: dbCase.case_type as IdentityCaseType,
      status: dbCase.status as IdentityCaseStatus,
      business_data: dbCase.business_data as BusinessData | undefined,
      persons_data: dbCase.persons_data as PersonData[] | undefined,
      verification_results: dbCase.verification_results || undefined,
      next_steps: dbCase.next_steps || undefined,
      missing_fields: dbCase.missing_fields || undefined,
      rejection_reasons: dbCase.rejection_reasons || undefined,
      submitted_at: dbCase.submitted_at || undefined,
      approved_at: dbCase.approved_at || undefined,
      rejected_at: dbCase.rejected_at || undefined,
      created_at: dbCase.created_at,
      updated_at: dbCase.updated_at
    };
  }
}
