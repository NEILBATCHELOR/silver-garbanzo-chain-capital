/**
 * DFNS User Action Service
 * 
 * Handles user action signing flow with database persistence
 */

import type {
  DfnsUserActionChallenge,
  DfnsUserActionSignature,
  DfnsUserActionSignatureResponse,
} from '../../types/dfns';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsCredentialManager } from '../../infrastructure/dfns/auth/credentialManager';
import { DfnsSessionManager } from '../../infrastructure/dfns/auth/sessionManager';
import { DfnsAuthenticationError, DfnsValidationError } from '../../types/dfns/errors';

// Database types for user action challenges
interface UserActionChallengeRecord {
  id: string;
  challenge_id: string;
  user_id: string;
  action_type: string;
  action_data: any;
  challenge: string;
  signature?: string;
  signing_method?: string;
  credential_id?: string;
  status: 'pending' | 'signed' | 'completed' | 'expired' | 'failed';
  expires_at: string;
  verified_at?: string;
  created_at: string;
  updated_at?: string;
}

export class DfnsUserActionService {
  constructor(
    private authClient: DfnsAuthClient,
    private credentialManager: DfnsCredentialManager,
    private sessionManager: DfnsSessionManager
  ) {}

  /**
   * Complete user action signing flow
   * 1. Initiate challenge
   * 2. Sign with WebAuthn
   * 3. Complete signing
   * 4. Return userAction token
   */
  async signUserAction(
    actionKind: string,
    payload: any,
    options?: {
      credentialId?: string;
      persistToDb?: boolean;
    }
  ): Promise<string> {
    const session = this.sessionManager.getCurrentSession();
    if (!session) {
      throw new DfnsAuthenticationError('User must be authenticated');
    }

    try {
      // Step 1: Initiate user action challenge
      const challenge = await this.authClient.initiateUserActionChallenge(actionKind, payload);
      
      // Step 2: Persist challenge to database (optional)
      if (options?.persistToDb !== false) {
        await this.persistChallenge(session.user_id, actionKind, payload, challenge);
      }

      // Step 3: Sign challenge with WebAuthn
      const credentialAssertion = await this.signChallengeWithWebAuthn(
        challenge,
        options?.credentialId
      );

      // Step 4: Create signature object
      const signature = this.authClient.createUserActionSignature(
        challenge.challengeIdentifier,
        credentialAssertion
      );

      // Step 5: Complete signing with DFNS
      const result = await this.authClient.completeUserActionSigning(signature);

      // Step 6: Update database with completion
      if (options?.persistToDb !== false) {
        await this.updateChallengeCompletion(
          challenge.challengeIdentifier,
          signature,
          result.userAction
        );
      }

      return result.userAction;
    } catch (error) {
      // Update database with failure
      if (options?.persistToDb !== false) {
        await this.updateChallengeFailure(actionKind, error);
      }
      
      throw new DfnsAuthenticationError(
        `User action signing failed: ${error}`,
        { actionKind, payload }
      );
    }
  }

  /**
   * Sign challenge using WebAuthn
   */
  private async signChallengeWithWebAuthn(
    challenge: DfnsUserActionChallenge,
    preferredCredentialId?: string
  ): Promise<any> {
    try {
      // Get allowed credentials from challenge
      let allowedCredentials = challenge.allowedCredentials || [];
      
      // Filter to preferred credential if specified
      if (preferredCredentialId) {
        allowedCredentials = allowedCredentials.filter(
          cred => cred.id === preferredCredentialId
        );
        
        if (allowedCredentials.length === 0) {
          throw new DfnsValidationError('Preferred credential not found in allowed credentials');
        }
      }

      // Authenticate with WebAuthn
      const assertion = await this.credentialManager.authenticateWithWebAuthn(
        challenge.challenge,
        allowedCredentials
      );

      return assertion;
    } catch (error) {
      throw new DfnsAuthenticationError(`WebAuthn signing failed: ${error}`);
    }
  }

  /**
   * Persist challenge to database
   */
  private async persistChallenge(
    userId: string,
    actionType: string,
    actionData: any,
    challenge: DfnsUserActionChallenge
  ): Promise<void> {
    try {
      // In a real implementation, this would use your database client
      // For now, we'll use a placeholder implementation
      const challengeRecord: Partial<UserActionChallengeRecord> = {
        challenge_id: challenge.challengeIdentifier,
        user_id: userId,
        action_type: actionType,
        action_data: actionData,
        challenge: challenge.challenge,
        status: 'pending',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        created_at: new Date().toISOString(),
      };

      // TODO: Implement actual database persistence
      console.log('Persisting user action challenge:', challengeRecord);
    } catch (error) {
      console.warn('Failed to persist challenge to database:', error);
      // Don't throw - database persistence is optional
    }
  }

  /**
   * Update challenge with completion data
   */
  private async updateChallengeCompletion(
    challengeIdentifier: string,
    signature: DfnsUserActionSignature,
    userActionToken: string
  ): Promise<void> {
    try {
      const updateData = {
        signature: JSON.stringify(signature),
        signing_method: signature.firstFactor.kind,
        credential_id: signature.firstFactor.credentialAssertion?.credId,
        status: 'completed' as const,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // TODO: Implement actual database update
      console.log('Updating challenge completion:', { challengeIdentifier, ...updateData });
    } catch (error) {
      console.warn('Failed to update challenge completion:', error);
      // Don't throw - database updates are optional
    }
  }

  /**
   * Update challenge with failure data
   */
  private async updateChallengeFailure(actionKind: string, error: any): Promise<void> {
    try {
      const updateData = {
        status: 'failed' as const,
        updated_at: new Date().toISOString(),
      };

      // TODO: Implement actual database update
      console.log('Updating challenge failure:', { actionKind, error: error.toString(), ...updateData });
    } catch (dbError) {
      console.warn('Failed to update challenge failure:', dbError);
      // Don't throw - database updates are optional
    }
  }

  /**
   * Get user action challenges from database
   */
  async getUserActionChallenges(
    userId?: string,
    status?: UserActionChallengeRecord['status'],
    limit: number = 50
  ): Promise<UserActionChallengeRecord[]> {
    try {
      const session = this.sessionManager.getCurrentSession();
      const targetUserId = userId || session?.user_id;
      
      if (!targetUserId) {
        throw new DfnsAuthenticationError('User ID required');
      }

      // TODO: Implement actual database query
      console.log('Querying user action challenges:', { targetUserId, status, limit });
      
      // Return empty array for now
      return [];
    } catch (error) {
      throw new DfnsAuthenticationError(`Failed to get user action challenges: ${error}`);
    }
  }

  /**
   * Clean up expired challenges
   */
  async cleanupExpiredChallenges(): Promise<number> {
    try {
      // TODO: Implement actual database cleanup
      console.log('Cleaning up expired challenges');
      
      return 0; // Return count of cleaned up challenges
    } catch (error) {
      console.warn('Failed to cleanup expired challenges:', error);
      return 0;
    }
  }

  /**
   * Validate user action signature
   */
  validateSignature(signature: DfnsUserActionSignature): boolean {
    try {
      // Basic validation
      if (!signature.challengeIdentifier) {
        return false;
      }

      if (!signature.firstFactor || !signature.firstFactor.kind) {
        return false;
      }

      if (!signature.firstFactor.credentialAssertion) {
        return false;
      }

      // Validate credential assertion based on kind
      const assertion = signature.firstFactor.credentialAssertion;
      switch (signature.firstFactor.kind) {
        case 'Fido2':
          return !!(assertion.credId && assertion.clientData && assertion.signature);
        case 'Key':
        case 'PasswordProtectedKey':
          return !!(assertion.credId && assertion.clientData && assertion.signature);
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }
}
