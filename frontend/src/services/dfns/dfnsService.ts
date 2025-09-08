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
    this.walletService = new DfnsWalletService(this.client);
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
   * Initialize the DFNS service
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Initialize the client with credential provider
      await this.client.initialize(
        this.credentialManager,
        this.authService.createUserActionSigner()
      );

      this.isInitialized = true;
    } catch (error) {
      throw new DfnsError(`Failed to initialize DFNS service: ${error}`, 'INITIALIZATION_ERROR');
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
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.sessionManager.isAuthenticated();
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.client.isReady();
  }

  /**
   * Get current user from session
   */
  getCurrentUser() {
    const session = this.sessionManager.getCurrentSession();
    return session ? { id: session.user_id } : null;
  }

  /**
   * Setup event listeners for automatic token refresh
   */
  private setupEventListeners(): void {
    window.addEventListener('dfns:token-refresh-needed', async (event: any) => {
      try {
        const { refreshToken } = event.detail;
        if (refreshToken) {
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
   * Ensure service is initialized
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
 * Initialize the global DFNS service
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
