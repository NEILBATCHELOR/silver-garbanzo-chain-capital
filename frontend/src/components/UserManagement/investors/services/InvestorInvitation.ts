import { serviceRoleClient } from '@/infrastructure/database/service-role/service-role-client';
import { InvestorInviteRequest, BulkInviteRequest, BulkInviteProgress, InvestorInfo } from '../types/index';

/**
 * Service to handle email invitations for investor users
 */
export class InvestorInvitationService {
  /**
   * Send a one-off invitation email to an investor user
   */
  async sendInvestorInvite(request: InvestorInviteRequest): Promise<boolean> {
    try {
      // Use Supabase auth to generate and send an invitation
      const { data, error } = await serviceRoleClient.generateInviteLink({
        email: request.email,
        data: {
          name: request.name,
          profileType: 'investor',
          investorId: request.investorId,
        },
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        console.error("Error generating invitation link:", error);
        throw error;
      }

      console.log("Invitation sent successfully for investor:", request.investorId);
      return true;
    } catch (error) {
      console.error("Error sending investor invite:", error);
      throw error;
    }
  }

  /**
   * Send bulk invitations to multiple investors with delay
   * This function implements rate limiting to prevent being blocked by email providers
   */
  async sendBulkInvites(
    request: BulkInviteRequest,
    progressCallback?: (progress: BulkInviteProgress) => void
  ): Promise<BulkInviteProgress> {
    // Ensure request has the expected structure
    if (!request.investorInfo || typeof request.investorInfo !== 'object') {
      throw new Error('investorInfo mapping is required for bulk invites');
    }
    const delaySeconds = request.delaySeconds || 5;
    const progress: BulkInviteProgress = {
      total: request.investorIds.length,
      completed: 0,
      failed: 0,
      errors: [],
    };

    // Batch size for processing - process in smaller batches with progress updates
    const batchSize = 10;
    
    // Process in batches
    for (let i = 0; i < request.investorIds.length; i += batchSize) {
      const batch = request.investorIds.slice(i, i + batchSize);
      
      // Process each investor in the batch sequentially
      for (const investorId of batch) {
        try {
          // Get investor details from the mapping
          const investorInfoMap = request.investorInfo as Record<string, InvestorInfo>;
          const investorInfo = investorInfoMap[investorId];
          
          if (!investorInfo) {
            throw new Error("Investor information not provided");
          }
          
          progress.current = investorInfo.name;
          progressCallback?.(progress);

          // Send invite
          await this.sendInvestorInvite({
            investorId,
            userId: investorInfo.userId,
            email: investorInfo.email,
            name: investorInfo.name,
          });

          progress.completed++;
        } catch (error) {
          progress.failed++;
          const investorInfoMap = request.investorInfo as Record<string, InvestorInfo>;
          progress.errors.push({
            investorId,
            investorName: investorInfoMap[investorId]?.name || 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        progressCallback?.(progress);

        // Add delay between sends (except for the last one in the entire process)
        if (i + batch.indexOf(investorId) < request.investorIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
      }
    }

    progress.current = undefined;
    return progress;
  }

  /**
   * Resend an invitation to a single investor
   */
  async resendInvitation(investorId: string, email: string, name: string): Promise<boolean> {
    try {
      // For resends, we use the same invitation function but with a specific message
      const { data, error } = await serviceRoleClient.generateInviteLink({
        email: email,
        data: {
          name: name,
          profileType: 'investor',
          investorId: investorId,
          isResend: true,
        },
        redirectTo: `${window.location.origin}/auth/callback?resend=true`,
      });

      if (error) {
        console.error("Error generating resend invitation link:", error);
        throw error;
      }

      console.log("Invitation resent successfully for investor:", investorId);
      return true;
    } catch (error) {
      console.error("Error resending investor invite:", error);
      throw error;
    }
  }
}

export const investorInvitationService = new InvestorInvitationService();