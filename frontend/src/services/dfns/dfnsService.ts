/**
 * DFNS Service
 * 
 * Main orchestrator service for DFNS integration
 */

import { DfnsClient, getDfnsClient } from '../../infrastructure/dfns/client';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsCredentialManager } from '../../infrastructure/dfns/auth/credentialManager';
import { DfnsSessionManager } from '../../infrastructure/dfns/auth/sessionManager';
import { DfnsAuthService } from './authService';
import { DfnsUserActionService } from './userActionService';
import { DfnsWalletService } from './walletService';
import { DfnsUserService } from './userService';
import { DfnsServiceAccountService } from './serviceAccountService';
import { PersonalAccessTokenService } from './personalAccessTokenService';
import { DfnsCredentialService } from './credentialService';
import { DfnsUserRecoveryService } from './userRecoveryService';
import { DfnsTransactionService } from './transactionService';
import { DfnsWebhookService } from './webhookService';
import { DfnsFeeSponsorService } from './feeSponsorService';
import { DfnsFiatService } from './fiatService';
import { DfnsKeyService } from './keyService';
import { DfnsPolicyService } from './policyService';
import { DfnsPermissionService } from './permissionService';
import type { DfnsSdkConfig } from '../../types/dfns';
import { DfnsError } from '../../types/dfns/errors';

export class DfnsService {
  private client: DfnsClient;
  private authClient: DfnsAuthClient;
  private credentialManager: DfnsCredentialManager;
  private sessionManager: DfnsSessionManager;
  
  // Service instances
  private authService: DfnsAuthService;
  private userActionService: DfnsUserActionService;
  private walletService: DfnsWalletService;
  private userService: DfnsUserService;
  private serviceAccountService: DfnsServiceAccountService;
  private personalAccessTokenService: PersonalAccessTokenService;
  private credentialService: DfnsCredentialService;
  private userRecoveryService: DfnsUserRecoveryService;
  private transactionService: DfnsTransactionService;
  private webhookService: DfnsWebhookService;
  private feeSponsorService: DfnsFeeSponsorService;
  private fiatService: DfnsFiatService;
  private keyService: DfnsKeyService;
  private policyService: DfnsPolicyService;
  private permissionService: DfnsPermissionService;
  
  private isInitialized = false;
  private initializationError: Error | null = null;

  constructor(config?: Partial<DfnsSdkConfig>) {
    // Initialize core infrastructure
    this.client = getDfnsClient(config);
    this.authClient = new DfnsAuthClient(this.client);
    this.credentialManager = new DfnsCredentialManager(this.client);
    this.sessionManager = new DfnsSessionManager();
    
    // Initialize services
    this.authService = new DfnsAuthService(
      this.authClient,
      this.credentialManager,
      this.sessionManager
    );
    this.userActionService = new DfnsUserActionService(
      this.authClient,
      this.credentialManager,
      this.sessionManager
    );
    this.walletService = new DfnsWalletService(this.client, this.userActionService);
    this.userService = new DfnsUserService(this.client);
    this.serviceAccountService = new DfnsServiceAccountService(this.authClient);
    this.personalAccessTokenService = new PersonalAccessTokenService(
      this.authClient,
      this.userActionService
    );
    this.credentialService = new DfnsCredentialService(
      this.authClient,
      this.userActionService
    );
    this.userRecoveryService = new DfnsUserRecoveryService(
      this.authClient
    );
    this.transactionService = new DfnsTransactionService(
      this.authClient,
      this.userActionService
    );
    this.webhookService = new DfnsWebhookService(
      this.client,
      this.authClient,
      this.userActionService
    );
    this.feeSponsorService = new DfnsFeeSponsorService(
      this.authClient,
      this.userActionService
    );
    this.fiatService = new DfnsFiatService(this.client);
    this.keyService = new DfnsKeyService(
      this.authClient,
      this.userActionService
    );
    this.policyService = new DfnsPolicyService(
      this.client,
      this.authClient,
      this.userActionService
    );
    this.permissionService = new DfnsPermissionService(
      this.client,
      this.userActionService
    );
    
    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize the DFNS service with graceful error handling
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Check authentication status
      const authStatus = this.credentialManager.getAuthStatus();
      console.log('DFNS Authentication Status:', authStatus);

      // Initialize the client based on available authentication
      if (authStatus.isAuthenticated) {
        if (authStatus.method === 'PAT') {
          // Initialize with PAT token
          await this.client.initialize();
          console.log('DFNS service initialized with PAT token');
        } else if (authStatus.method === 'WebAuthn') {
          // Initialize with stored WebAuthn credentials
          await this.client.initialize(
            this.credentialManager,
            this.authService.createUserActionSigner()
          );
          console.log('DFNS service initialized with WebAuthn credentials');
        }
      } else {
        // No authentication available - initialize in limited mode
        console.warn('DFNS service initialized in limited mode - no authentication credentials available');
        console.log('Available operations: Registration, login, credential creation');
      }

      this.isInitialized = true;
      this.initializationError = null;
    } catch (error) {
      this.initializationError = error as Error;
      console.error('DFNS service initialization failed:', error);
      
      // Don't throw the error - allow the service to be used in limited mode
      this.isInitialized = true;
    }
  }

  /**
   * Get authentication service
   */
  getAuthService(): DfnsAuthService {
    this.ensureInitialized();
    return this.authService;
  }

  /**
   * Get user action service
   */
  getUserActionService(): DfnsUserActionService {
    this.ensureInitialized();
    return this.userActionService;
  }

  /**
   * Get wallet service
   */
  getWalletService(): DfnsWalletService {
    this.ensureInitialized();
    return this.walletService;
  }

  /**
   * Get user service
   */
  getUserService(): DfnsUserService {
    this.ensureInitialized();
    return this.userService;
  }

  /**
   * Get service account service
   */
  getServiceAccountService(): DfnsServiceAccountService {
    this.ensureInitialized();
    return this.serviceAccountService;
  }

  /**
   * Get personal access token service
   */
  getPersonalAccessTokenService(): PersonalAccessTokenService {
    this.ensureInitialized();
    return this.personalAccessTokenService;
  }

  /**
   * Get credential service
   */
  getCredentialService(): DfnsCredentialService {
    this.ensureInitialized();
    return this.credentialService;
  }

  /**
   * Get user recovery service
   */
  getUserRecoveryService(): DfnsUserRecoveryService {
    this.ensureInitialized();
    return this.userRecoveryService;
  }

  /**
   * Get transaction service
   */
  getTransactionService(): DfnsTransactionService {
    this.ensureInitialized();
    return this.transactionService;
  }

  /**
   * Get webhook service
   */
  getWebhookService(): DfnsWebhookService {
    this.ensureInitialized();
    return this.webhookService;
  }

  /**
   * Get fee sponsor service
   */
  getFeeSponsorService(): DfnsFeeSponsorService {
    this.ensureInitialized();
    return this.feeSponsorService;
  }

  /**
   * Get fiat service
   */
  getFiatService(): DfnsFiatService {
    this.ensureInitialized();
    return this.fiatService;
  }

  /**
   * Get key service
   */
  getKeyService(): DfnsKeyService {
    this.ensureInitialized();
    return this.keyService;
  }

  /**
   * Get policy service
   */
  getPolicyService(): DfnsPolicyService {
    this.ensureInitialized();
    return this.policyService;
  }

  /**
   * Get permission service
   */
  getPermissionService(): DfnsPermissionService {
    this.ensureInitialized();
    return this.permissionService;
  }

  /**
   * Get session manager
   */
  getSessionManager(): DfnsSessionManager {
    return this.sessionManager;
  }

  /**
   * Get credential manager
   */
  getCredentialManager(): DfnsCredentialManager {
    return this.credentialManager;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.client.isAuthenticated();
  }

  /**
   * Check if service is ready for operations
   */
  isReady(): boolean {
    return this.isInitialized && this.client.isReady();
  }

  /**
   * Check if service is in limited mode (no authentication)
   */
  isLimitedMode(): boolean {
    return this.isInitialized && !this.isAuthenticated();
  }

  /**
   * Get initialization error if any
   */
  getInitializationError(): Error | null {
    return this.initializationError;
  }

  /**
   * Get current user from session or environment
   */
  getCurrentUser() {
    // Try to get from client first (environment variables)
    const envUser = this.client.getCurrentUser();
    if (envUser) {
      return envUser;
    }

    // Fallback to session
    const session = this.sessionManager.getCurrentSession();
    return session ? { id: session.user_id } : null;
  }

  /**
   * Get authentication status and details
   */
  getAuthenticationStatus() {
    const authStatus = this.credentialManager.getAuthStatus();
    const currentUser = this.getCurrentUser();
    
    return {
      ...authStatus,
      user: currentUser,
      isReady: this.isReady(),
      isLimitedMode: this.isLimitedMode(),
      initializationError: this.initializationError?.message,
      credentialCount: 0, // Default value, use getAuthenticationStatusAsync for actual count
    };
  }
  
  /**
   * Get authentication status with credential count (async version)
   */
  async getAuthenticationStatusAsync() {
    const authStatus = this.credentialManager.getAuthStatus();
    const currentUser = this.getCurrentUser();
    
    // Get credential count if authenticated
    let credentialCount = 0;
    if (authStatus.isAuthenticated) {
      try {
        const credentials = await this.credentialService.listCredentials();
        credentialCount = credentials.items.length;
      } catch (error) {
        console.warn('Failed to get credential count:', error);
      }
    }
    
    return {
      ...authStatus,
      user: currentUser,
      isReady: this.isReady(),
      isLimitedMode: this.isLimitedMode(),
      initializationError: this.initializationError?.message,
      credentialCount,
    };
  }

  /**
   * Setup event listeners for automatic token refresh
   */
  private setupEventListeners(): void {
    window.addEventListener('dfns:token-refresh-needed', async (event: any) => {
      try {
        const { refreshToken } = event.detail;
        if (refreshToken && this.isAuthenticated()) {
          await this.authService.refreshToken(refreshToken);
        }
      } catch (error) {
        console.error('Automatic token refresh failed:', error);
        // Emit event for UI to handle re-authentication
        window.dispatchEvent(new CustomEvent('dfns:authentication-required'));
      }
    });

    // Handle authentication required events
    window.addEventListener('dfns:authentication-required', () => {
      this.sessionManager.clearSession();
    });
  }

  /**
   * Ensure service is initialized (but don't throw errors)
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new DfnsError('DFNS service not initialized', 'SERVICE_NOT_INITIALIZED');
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.sessionManager.destroy();
    this.client.destroy();
    this.isInitialized = false;
    this.initializationError = null;
  }
}

// Global service instance
let globalDfnsService: DfnsService | null = null;

/**
 * Get or create the global DFNS service instance
 */
export function getDfnsService(config?: Partial<DfnsSdkConfig>): DfnsService {
  if (!globalDfnsService) {
    globalDfnsService = new DfnsService(config);
  }
  return globalDfnsService;
}

/**
 * Initialize the global DFNS service with graceful error handling
 */
export async function initializeDfnsService(config?: Partial<DfnsSdkConfig>): Promise<DfnsService> {
  const service = getDfnsService(config);
  await service.initialize();
  return service;
}

/**
 * Reset the global service instance (useful for testing)
 */
export function resetDfnsService(): void {
  if (globalDfnsService) {
    globalDfnsService.destroy();
    globalDfnsService = null;
  }
}