/**
 * DFNS Registration Service
 * 
 * Implements all DFNS registration API endpoints using current API methods
 * Supports token-based authentication (Service Account & PAT tokens)
 * 
 * Registration Endpoints Covered:
 * 1. POST /auth/registration/init - Standard user registration challenge
 * 2. POST /auth/registration - Complete user registration
 * 3. POST /auth/registration/enduser - Complete end user registration with wallets
 * 4. PUT /auth/registration/code - Resend registration email
 * 5. POST /auth/registration/social - Social registration (OAuth/OIDC)
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  // Standard Registration Types
  DfnsUserRegistrationInitRequest,
  DfnsUserRegistrationInitResponse,
  DfnsUserRegistrationRequest,
  DfnsEnhancedUserRegistrationResponse,
  
  // End User Registration Types
  DfnsEndUserRegistrationRequest,
  DfnsEndUserRegistrationResponse,
  
  // Social Registration Types
  DfnsSocialRegistrationRequest,
  DfnsSocialRegistrationResponse,
  
  // Resend Registration Code Types
  DfnsResendRegistrationCodeRequest,
  DfnsResendRegistrationCodeResponse,
  
  // Base Types
  DfnsDelegatedRegistrationResponse,
  DfnsWalletCreationSpec,
  DfnsCredentialInfo,
  DfnsCredentialKind
} from '../../types/dfns/auth';
import type { DfnsNetwork } from '../../types/dfns/wallets';

export interface DfnsRegistrationMetrics {
  totalRegistrations: number;
  successfulRegistrations: number;
  failedRegistrations: number;
  socialRegistrations: number;
  endUserRegistrations: number;
  averageRegistrationTime: number;
  lastRegistrationAt?: string;
}

export interface DfnsRegistrationConfig {
  enableSocialRegistration: boolean;
  enableEndUserRegistration: boolean;
  defaultWalletNetworks: string[];
  requireSecondFactor: boolean;
  allowedCredentialKinds: DfnsCredentialKind[];
}

export class DfnsRegistrationService {
  private metrics: DfnsRegistrationMetrics = {
    totalRegistrations: 0,
    successfulRegistrations: 0,
    failedRegistrations: 0,
    socialRegistrations: 0,
    endUserRegistrations: 0,
    averageRegistrationTime: 0
  };

  private config: DfnsRegistrationConfig = {
    enableSocialRegistration: true,
    enableEndUserRegistration: true,
    defaultWalletNetworks: ['Ethereum', 'Bitcoin', 'Solana'],
    requireSecondFactor: false,
    allowedCredentialKinds: ['Fido2', 'Key', 'PasswordProtectedKey', 'RecoveryKey']
  };

  constructor(private workingClient: WorkingDfnsClient) {}

  // ================================
  // 1. STANDARD USER REGISTRATION
  // ================================

  /**
   * Create User Registration Challenge (POST /auth/registration/init)
   * 
   * Starts a user registration session for users who received a registration email.
   * Returns a challenge that needs to be signed to complete registration.
   * 
   * @param request - Registration initialization request
   * @returns Promise<DfnsUserRegistrationInitResponse>
   */
  async initUserRegistration(
    request: DfnsUserRegistrationInitRequest
  ): Promise<DfnsUserRegistrationInitResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Initiating user registration for:', request.username);
      
      const response = await this.workingClient.makeRequest<DfnsUserRegistrationInitResponse>(
        'POST',
        '/auth/registration/init',
        request
      );

      this.updateMetrics(startTime, true);
      
      console.log('✅ User registration challenge created successfully');
      console.log('📋 Supported credential kinds:', response.supportedCredentialKinds);
      console.log('🔑 Challenge generated for user:', response.user.id);
      
      return response;
    } catch (error) {
      this.updateMetrics(startTime, false);
      console.error('❌ Failed to create user registration challenge:', error);
      throw error;
    }
  }

  /**
   * Complete User Registration (POST /auth/registration)
   * 
   * Completes the user registration process and creates the user's initial credentials.
   * Requires a signed challenge from initUserRegistration.
   * 
   * @param request - User registration completion request
   * @param temporaryAuthToken - Temporary auth token from init step
   * @returns Promise<DfnsEnhancedUserRegistrationResponse>
   */
  async completeUserRegistration(
    request: DfnsUserRegistrationRequest,
    temporaryAuthToken: string
  ): Promise<DfnsEnhancedUserRegistrationResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Completing user registration with credential kind:', request.firstFactor.kind);
      
      const response = await this.workingClient.makeRequest<DfnsEnhancedUserRegistrationResponse>(
        'POST',
        '/auth/registration',
        request
      );

      this.updateMetrics(startTime, true);
      
      console.log('✅ User registration completed successfully');
      console.log('👤 User created:', response.user.id);
      console.log('🔑 Credential created:', response.credential.uuid);
      
      return response;
    } catch (error) {
      this.updateMetrics(startTime, false);
      console.error('❌ Failed to complete user registration:', error);
      throw error;
    }
  }

  // ================================
  // 2. END USER REGISTRATION WITH WALLETS
  // ================================

  /**
   * Complete End User Registration with Wallets (POST /auth/registration/enduser)
   * 
   * Completes registration and automatically creates wallets for the user.
   * This is typically used for end-user applications where wallets are needed immediately.
   * 
   * @param request - End user registration request with wallet specifications
   * @param temporaryAuthToken - Temporary auth token from init step
   * @returns Promise<DfnsEndUserRegistrationResponse>
   */
  async completeEndUserRegistration(
    request: DfnsEndUserRegistrationRequest,
    temporaryAuthToken: string
  ): Promise<DfnsEndUserRegistrationResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Completing end user registration with wallets:', request.wallets.length);
      console.log('💰 Wallet networks:', request.wallets.map(w => w.network).join(', '));
      
      const response = await this.workingClient.makeRequest<DfnsEndUserRegistrationResponse>(
        'POST',
        '/auth/registration/enduser',
        request
      );

      this.updateMetrics(startTime, true);
      this.metrics.endUserRegistrations++;
      
      console.log('✅ End user registration completed successfully');
      console.log('👤 User created:', response.user.id);
      console.log('🔑 Credential created:', response.credential.uuid);
      console.log('💰 Wallets created:', response.wallets.length);
      console.log('📋 Wallet addresses:', response.wallets.map(w => `${w.network}: ${w.address}`));
      
      return response;
    } catch (error) {
      this.updateMetrics(startTime, false);
      console.error('❌ Failed to complete end user registration:', error);
      throw error;
    }
  }

  // ================================
  // 3. SOCIAL REGISTRATION (OAuth/OIDC)
  // ================================

  /**
   * Social Registration (POST /auth/registration/social)
   * 
   * Starts a user registration session using OAuth/OIDC identity tokens.
   * Supports Google, Apple, and other OIDC-compliant providers.
   * 
   * @param request - Social registration request with ID token
   * @returns Promise<DfnsSocialRegistrationResponse>
   */
  async socialRegistration(
    request: DfnsSocialRegistrationRequest
  ): Promise<DfnsSocialRegistrationResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.config.enableSocialRegistration) {
        throw new Error('Social registration is disabled in configuration');
      }
      
      console.log('🔄 Starting social registration with provider:', request.socialLoginProviderKind);
      
      const response = await this.workingClient.makeRequest<DfnsSocialRegistrationResponse>(
        'POST',
        '/auth/registration/social',
        request
      );

      this.updateMetrics(startTime, true);
      this.metrics.socialRegistrations++;
      
      console.log('✅ Social registration challenge created successfully');
      console.log('👤 User identified:', response.user.displayName);
      console.log('🔑 Challenge generated for social user:', response.user.id);
      console.log('📋 Supported credential kinds:', response.supportedCredentialKinds);
      
      return response;
    } catch (error) {
      this.updateMetrics(startTime, false);
      console.error('❌ Failed to create social registration challenge:', error);
      throw error;
    }
  }

  // ================================
  // 4. RESEND REGISTRATION EMAIL
  // ================================

  /**
   * Resend Registration Email (PUT /auth/registration/code)
   * 
   * Sends the user a new registration code. The previous registration code will be invalidated.
   * Use this when users didn't receive their registration email or the code expired.
   * 
   * @param request - Resend registration code request
   * @returns Promise<DfnsResendRegistrationCodeResponse>
   */
  async resendRegistrationCode(
    request: DfnsResendRegistrationCodeRequest
  ): Promise<DfnsResendRegistrationCodeResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Resending registration code to:', request.username);
      
      const response = await this.workingClient.makeRequest<DfnsResendRegistrationCodeResponse>(
        'PUT',
        '/auth/registration/code',
        request
      );

      console.log('✅ Registration code resent successfully');
      console.log('📧 New registration email sent to:', request.username);
      
      return response;
    } catch (error) {
      console.error('❌ Failed to resend registration code:', error);
      throw error;
    }
  }

  // ================================
  // CONVENIENCE METHODS & HELPERS
  // ================================

  /**
   * Create End User Registration with Default Wallets
   * 
   * Convenience method that creates end user registration with default wallet networks.
   * Useful for applications that want to provide a standard set of wallets.
   * 
   * @param credentials - User credentials
   * @param temporaryAuthToken - Temporary auth token
   * @param customNetworks - Optional custom networks (overrides default)
   * @returns Promise<DfnsEndUserRegistrationResponse>
   */
  async createEndUserWithDefaultWallets(
    credentials: {
      firstFactorCredential: DfnsCredentialInfo;
      secondFactorCredential?: DfnsCredentialInfo;
      recoveryCredential?: DfnsCredentialInfo;
    },
    temporaryAuthToken: string,
    customNetworks?: string[]
  ): Promise<DfnsEndUserRegistrationResponse> {
    const networks = customNetworks || this.config.defaultWalletNetworks;
    const wallets: DfnsWalletCreationSpec[] = networks.map(network => ({
      network: network as DfnsNetwork,
      name: `${network} Wallet`
    }));

    console.log('🎯 Creating end user with default wallets:', networks.join(', '));

    return this.completeEndUserRegistration({
      ...credentials,
      wallets
    }, temporaryAuthToken);
  }

  /**
   * Validate Registration Challenge Response
   * 
   * Helper method to validate that a registration challenge response is complete
   * and has all required fields before attempting completion.
   * 
   * @param response - Registration challenge response
   * @returns boolean - Whether the response is valid for completion
   */
  validateRegistrationChallenge(response: DfnsDelegatedRegistrationResponse): boolean {
    const isValid = !!(
      response.temporaryAuthenticationToken &&
      response.challenge &&
      response.user?.id &&
      response.supportedCredentialKinds?.firstFactor?.length
    );

    if (!isValid) {
      console.warn('⚠️ Invalid registration challenge response:', {
        hasToken: !!response.temporaryAuthenticationToken,
        hasChallenge: !!response.challenge,
        hasUser: !!response.user?.id,
        hasCredentialKinds: !!response.supportedCredentialKinds?.firstFactor?.length
      });
    }

    return isValid;
  }

  /**
   * Get Supported Credential Kinds
   * 
   * Returns the list of credential kinds that are supported by this service
   * based on current configuration.
   * 
   * @returns DfnsCredentialKind[] - Array of supported credential kinds
   */
  getSupportedCredentialKinds(): DfnsCredentialKind[] {
    return [...this.config.allowedCredentialKinds];
  }

  /**
   * Check if Social Registration is Enabled
   * 
   * @returns boolean - Whether social registration is enabled
   */
  isSocialRegistrationEnabled(): boolean {
    return this.config.enableSocialRegistration;
  }

  /**
   * Check if End User Registration is Enabled
   * 
   * @returns boolean - Whether end user registration is enabled
   */
  isEndUserRegistrationEnabled(): boolean {
    return this.config.enableEndUserRegistration;
  }

  /**
   * Get Default Wallet Networks
   * 
   * @returns string[] - Array of default wallet networks
   */
  getDefaultWalletNetworks(): string[] {
    return [...this.config.defaultWalletNetworks];
  }

  // ================================
  // CONFIGURATION MANAGEMENT
  // ================================

  /**
   * Update Registration Configuration
   * 
   * @param newConfig - Partial configuration to update
   */
  updateConfig(newConfig: Partial<DfnsRegistrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Registration service configuration updated:', newConfig);
  }

  /**
   * Get Current Configuration
   * 
   * @returns DfnsRegistrationConfig - Current configuration
   */
  getConfig(): DfnsRegistrationConfig {
    return { ...this.config };
  }

  // ================================
  // METRICS & MONITORING
  // ================================

  /**
   * Get Registration Metrics
   * 
   * @returns DfnsRegistrationMetrics - Current service metrics
   */
  getMetrics(): DfnsRegistrationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get Registration Success Rate
   * 
   * @returns number - Success rate percentage (0-100)
   */
  getSuccessRate(): number {
    if (this.metrics.totalRegistrations === 0) return 0;
    return (this.metrics.successfulRegistrations / this.metrics.totalRegistrations) * 100;
  }

  /**
   * Reset Metrics
   * 
   * Resets all metrics to zero. Useful for testing or periodic metric resets.
   */
  resetMetrics(): void {
    this.metrics = {
      totalRegistrations: 0,
      successfulRegistrations: 0,
      failedRegistrations: 0,
      socialRegistrations: 0,
      endUserRegistrations: 0,
      averageRegistrationTime: 0
    };
    console.log('📊 Registration metrics reset');
  }

  /**
   * Update Metrics
   * 
   * Internal method to update metrics after registration operations
   * 
   * @param startTime - Operation start time in milliseconds
   * @param success - Whether the operation was successful
   */
  private updateMetrics(startTime: number, success: boolean): void {
    const duration = Date.now() - startTime;
    
    this.metrics.totalRegistrations++;
    
    if (success) {
      this.metrics.successfulRegistrations++;
      this.metrics.lastRegistrationAt = new Date().toISOString();
    } else {
      this.metrics.failedRegistrations++;
    }
    
    // Update average registration time
    const totalTime = this.metrics.averageRegistrationTime * (this.metrics.totalRegistrations - 1) + duration;
    this.metrics.averageRegistrationTime = totalTime / this.metrics.totalRegistrations;
  }

  /**
   * Get Service Status
   * 
   * @returns Object with service status information
   */
  getServiceStatus() {
    return {
      isReady: this.workingClient.isConfigured(),
      metrics: this.getMetrics(),
      config: this.getConfig(),
      successRate: this.getSuccessRate(),
      features: {
        socialRegistration: this.config.enableSocialRegistration,
        endUserRegistration: this.config.enableEndUserRegistration,
        supportedCredentials: this.config.allowedCredentialKinds.length,
        defaultNetworks: this.config.defaultWalletNetworks.length
      }
    };
  }
}
