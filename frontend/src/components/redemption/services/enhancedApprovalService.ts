// Enhanced approval service with rule compliance integration
// Ensures no redemption request can be approved without meeting business rules
// Extends the base ApprovalService with rule validation

import { approvalService, ApprovalService } from './approvalService';
import { ruleComplianceService } from './ruleComplianceService';
import type { 
  ApprovalResponse,
  SubmitApprovalInput,
  ApprovalRecord,
  ApprovalRequest
} from '../types';

export class EnhancedApprovalService extends ApprovalService {
  /**
   * Enhanced submitApproval method that includes rule compliance validation
   */
  async submitApproval(input: SubmitApprovalInput): Promise<ApprovalResponse> {
    try {
      console.log('🔍 [EnhancedApprovalService] Validating rule compliance before approval:', input.approvalRequestId);

      // Only validate rule compliance for approval decisions
      if (input.decision === 'approved') {
        // Get project ID for the redemption request
        const projectId = await this.getProjectIdForRedemption(input.approvalRequestId);
        
        if (!projectId) {
          return {
            success: false,
            error: 'Unable to determine project for redemption request - compliance validation failed'
          };
        }

        // Validate rule compliance before allowing approval
        const complianceCheck = await ruleComplianceService.canApproveRedemption(
          input.approvalRequestId,
          projectId
        );

        if (!complianceCheck.canApprove) {
          console.error('❌ [EnhancedApprovalService] Rule compliance validation failed:', complianceCheck.reason);
          
          // Store the validation results in the database
          if (complianceCheck.validationResult) {
            await ruleComplianceService.storeValidationResults(
              input.approvalRequestId,
              complianceCheck.validationResult
            );
          }

          return {
            success: false,
            error: `Cannot approve redemption: ${complianceCheck.reason}`,
            validationDetails: complianceCheck.validationResult
          };
        }

        console.log('✅ [EnhancedApprovalService] Rule compliance validation passed');
        
        // Store successful validation results
        if (complianceCheck.validationResult) {
          await ruleComplianceService.storeValidationResults(
            input.approvalRequestId,
            complianceCheck.validationResult
          );
        }
      }

      // Proceed with the normal approval process
      const result = await super.submitApproval(input);
      
      if (result.success && input.decision === 'approved') {
        console.log('✅ [EnhancedApprovalService] Redemption approved after rule compliance validation');
      } else if (result.success && input.decision === 'rejected') {
        console.log('❌ [EnhancedApprovalService] Redemption rejected by approver');
      }

      return result;
    } catch (error) {
      console.error('❌ [EnhancedApprovalService] Error in enhanced approval process:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during enhanced approval process'
      };
    }
  }

  /**
   * Get project ID for a redemption request
   */
  private async getProjectIdForRedemption(redemptionId: string): Promise<string | null> {
    try {
      const { supabase } = await import('@/infrastructure/supabaseClient');
      
      const { data, error } = await supabase
        .from('redemption_requests')
        .select('project_id')
        .eq('id', redemptionId)
        .single();

      if (error || !data) {
        console.error('Failed to get project ID for redemption:', error);
        return null;
      }

      return data.project_id;
    } catch (error) {
      console.error('Error getting project ID for redemption:', error);
      return null;
    }
  }

  /**
   * Pre-validate redemption compliance before creating approval request
   */
  async createApprovalRequestWithValidation(
    redemptionId: string, 
    requiredApprovers: string[],
    projectId: string
  ): Promise<{
    success: boolean;
    data?: ApprovalRequest;
    error?: string;
    complianceIssues?: string[];
  }> {
    try {
      // First check rule compliance
      const complianceCheck = await ruleComplianceService.canApproveRedemption(
        redemptionId,
        projectId
      );

      const complianceIssues: string[] = [];
      
      if (!complianceCheck.canApprove) {
        if (complianceCheck.validationResult) {
          const criticalViolations = complianceCheck.validationResult.violations.filter(
            v => v.severity === 'CRITICAL' && v.blockingApproval
          );
          complianceIssues.push(...criticalViolations.map(v => v.description));
          
          // Store validation results
          await ruleComplianceService.storeValidationResults(
            redemptionId,
            complianceCheck.validationResult
          );
        }
        
        if (complianceIssues.length === 0) {
          complianceIssues.push(complianceCheck.reason || 'Rule compliance validation failed');
        }
      }

      // Create the approval request even if there are compliance issues
      // This allows approvers to see the issues and potentially override or reject
      const result = await super.createApprovalRequest(redemptionId, requiredApprovers);

      return {
        ...result,
        complianceIssues: complianceIssues.length > 0 ? complianceIssues : undefined
      };
    } catch (error) {
      console.error('Error creating approval request with validation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get redemption compliance status for approver dashboard
   */
  async getRedemptionComplianceStatus(redemptionId: string): Promise<{
    success: boolean;
    data?: {
      isCompliant: boolean;
      violations: any[];
      canApprove: boolean;
      reason?: string;
    };
    error?: string;
  }> {
    try {
      const projectId = await this.getProjectIdForRedemption(redemptionId);
      
      if (!projectId) {
        return {
          success: false,
          error: 'Unable to determine project for compliance check'
        };
      }

      const complianceCheck = await ruleComplianceService.canApproveRedemption(
        redemptionId,
        projectId
      );

      return {
        success: true,
        data: {
          isCompliant: complianceCheck.validationResult?.isCompliant || false,
          violations: complianceCheck.validationResult?.violations || [],
          canApprove: complianceCheck.canApprove,
          reason: complianceCheck.reason
        }
      };
    } catch (error) {
      console.error('Error getting compliance status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Bulk approval with rule compliance validation
   */
  async submitBulkApprovals(approvals: Array<{
    redemptionId: string;
    decision: 'approved' | 'rejected';
    comments?: string;
  }>): Promise<{
    success: boolean;
    data?: {
      processed: number;
      failed: number;
      complianceFailures: number;
      results: Array<{
        redemptionId: string;
        success: boolean;
        error?: string;
        complianceIssues?: string[];
      }>;
    };
    error?: string;
  }> {
    try {
      const results: Array<{
        redemptionId: string;
        success: boolean;
        error?: string;
        complianceIssues?: string[];
      }> = [];

      let processed = 0;
      let failed = 0;
      let complianceFailures = 0;

      // Process each approval individually with compliance checking
      for (const approval of approvals) {
        try {
          const result = await this.submitApproval({
            approvalRequestId: approval.redemptionId,
            decision: approval.decision,
            comments: approval.comments
          });

          if (result.success) {
            processed++;
            results.push({
              redemptionId: approval.redemptionId,
              success: true
            });
          } else {
            failed++;
            
            // Check if this was a compliance failure
            const isComplianceFailure = result.error?.includes('rule compliance') || 
                                       result.error?.includes('Cannot approve redemption');
            
            if (isComplianceFailure) {
              complianceFailures++;
            }

            results.push({
              redemptionId: approval.redemptionId,
              success: false,
              error: result.error,
              complianceIssues: isComplianceFailure ? [result.error || 'Compliance validation failed'] : undefined
            });
          }
        } catch (error) {
          failed++;
          results.push({
            redemptionId: approval.redemptionId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          });
        }
      }

      return { 
        success: true, 
        data: {
          processed,
          failed,
          complianceFailures,
          results
        }
      };
    } catch (error) {
      console.error('Error in bulk approval with compliance checking:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
}

// Export singleton instance
export const enhancedApprovalService = new EnhancedApprovalService();
export default enhancedApprovalService;