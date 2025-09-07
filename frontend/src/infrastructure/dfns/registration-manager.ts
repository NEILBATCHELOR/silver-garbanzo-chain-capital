/**
 * DFNS Registration Manager - Complete user registration API implementation
 * 
 * This service implements all DFNS registration endpoints:
 * - POST /auth/registration/init - Initiate user registration
 * - POST /auth/registration - Complete user registration  
 * - POST /auth/registration/enduser - End-user registration with wallets
 * - PUT /auth/registration/code - Resend registration codes
 * - POST /auth/registration/social - Social registration
 */

import { DfnsApiClient } from './client';
import { DFNS_CONFIG } from './config';
import type {
  RegistrationChallenge,
  RegistrationEvent,
  CompleteRegistrationRequest,
  EndUserRegistrationRequest,
  SocialRegistrationRequest,
  RegistrationCodeRequest,
  RegistrationInitRequest,
  RegistrationResult,
  WalletSpec
} from '@/types/dfns/registration';

export class DfnsRegistrationManager {
  private client: DfnsApiClient;

  constructor(config = DFNS_CONFIG) {
    this.client = new DfnsApiClient(config);
  }

  /**
   * Initiate user registration (POST /auth/registration/init)
   * 
   * @param request Registration initiation request
   * @returns Registration challenge for completing registration
   */
  async initiateRegistration(request: RegistrationInitRequest): Promise<RegistrationChallenge> {
    try {
      const response = await this.client.post<RegistrationChallenge>('/auth/registration/init', {
        username: request.username,
        registrationCode: request.registrationCode,
        orgId: request.orgId
      });

      return response.data;
    } catch (error) {
      console.error('Failed to initiate registration:', error);
      throw this.enhanceRegistrationError(error, 'initiate_registration');
    }
  }

  /**
   * Complete user registration (POST /auth/registration)
   * 
   * @param request Complete registration request with credentials
   * @returns Registration result with user information
   */
  async completeRegistration(request: CompleteRegistrationRequest): Promise<RegistrationResult> {
    try {
      const response = await this.client.post<RegistrationResult>('/auth/registration', {
        challengeIdentifier: request.challengeIdentifier,
        firstFactor: request.firstFactor,
        secondFactor: request.secondFactor,
        recoveryCredential: request.recoveryCredential
      });

      return response.data;
    } catch (error) {
      console.error('Failed to complete registration:', error);
      throw this.enhanceRegistrationError(error, 'complete_registration');
    }
  }

  /**
   * Complete end-user registration with automatic wallet creation (POST /auth/registration/enduser)
   * 
   * @param request End-user registration request
   * @returns Registration result with user and wallet information
   */
  async completeEndUserRegistration(request: EndUserRegistrationRequest): Promise<RegistrationResult> {
    try {
      const response = await this.client.post<RegistrationResult>('/auth/registration/enduser', {
        challengeIdentifier: request.challengeIdentifier,
        firstFactor: request.firstFactor,
        secondFactor: request.secondFactor,
        recoveryCredential: request.recoveryCredential,
        wallets: request.wallets || []
      });

      return response.data;
    } catch (error) {
      console.error('Failed to complete end-user registration:', error);
      throw this.enhanceRegistrationError(error, 'complete_enduser_registration');
    }
  }

  /**
   * Resend registration code (PUT /auth/registration/code)
   * 
   * @param request Registration code resend request
   * @returns Success confirmation
   */
  async resendRegistrationCode(request: RegistrationCodeRequest): Promise<{ success: boolean }> {
    try {
      await this.client.put('/auth/registration/code', {
        username: request.username,
        orgId: request.orgId
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to resend registration code:', error);
      throw this.enhanceRegistrationError(error, 'resend_registration_code');
    }
  }

  /**
   * Social registration (POST /auth/registration/social)
   * 
   * @param request Social registration request
   * @returns Registration result with user information
   */
  async initiateSocialRegistration(request: SocialRegistrationRequest): Promise<RegistrationResult> {
    try {
      const response = await this.client.post<RegistrationResult>('/auth/registration/social', {
        idToken: request.idToken,
        providerKind: request.providerKind,
        orgId: request.orgId
      });

      return response.data;
    } catch (error) {
      console.error('Failed to initiate social registration:', error);
      throw this.enhanceRegistrationError(error, 'social_registration');
    }
  }

  /**
   * Check if username is available
   * 
   * @param username Username to check
   * @param orgId Organization ID
   * @returns Availability status
   */
  async checkUsernameAvailability(username: string, orgId?: string): Promise<{ available: boolean; reason?: string }> {
    try {
      // This would typically be a custom endpoint or part of init
      // For now, we'll try the init endpoint with a test
      await this.client.post('/auth/registration/init', {
        username,
        registrationCode: 'test-availability-check',
        orgId
      });
      
      return { available: true };
    } catch (error: any) {
      if (error?.code === 'UserAlreadyExists') {
        return { available: false, reason: 'Username already taken' };
      }
      if (error?.code === 'InvalidRegistrationCode') {
        return { available: true }; // Username is available, just bad code
      }
      return { available: false, reason: 'Unable to verify availability' };
    }
  }

  /**
   * Validate registration code
   * 
   * @param code Registration code to validate
   * @param orgId Organization ID
   * @returns Validation result
   */
  async validateRegistrationCode(code: string, orgId?: string): Promise<{ valid: boolean; expiresAt?: string }> {
    // This would typically be a separate endpoint
    // For now, implement as part of the registration flow validation
    return { valid: true }; // Placeholder implementation
  }

  /**
   * Get registration configuration for organization
   * 
   * @param orgId Organization ID
   * @returns Registration configuration
   */
  async getRegistrationConfig(orgId?: string): Promise<{
    allowedCredentialKinds: string[];
    requiresRecoveryCredential: boolean;
    allowsSecondFactor: boolean;
    socialProviders: string[];
  }> {
    // This would typically come from organization settings
    return {
      allowedCredentialKinds: ['Fido2', 'Key', 'PasswordProtectedKey'],
      requiresRecoveryCredential: true,
      allowsSecondFactor: true,
      socialProviders: ['Google', 'GitHub', 'Microsoft']
    };
  }

  /**
   * Enhanced error handling for registration operations
   */
  private enhanceRegistrationError(error: any, operation: string): Error {
    const errorMessage = error?.message || 'Unknown registration error';
    const errorCode = error?.code || 'REGISTRATION_ERROR';
    
    const enhancedError = new Error(`[DFNS Registration - ${operation}] ${errorMessage}`);
    (enhancedError as any).code = errorCode;
    (enhancedError as any).operation = operation;
    (enhancedError as any).originalError = error;
    
    return enhancedError;
  }
}

export default DfnsRegistrationManager;
