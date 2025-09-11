/**
 * DFNS Service
 * 
 * Main orchestrator service for DFNS integration
 * Updated to use current DFNS API methods and authentication patterns
 */

import { getWorkingDfnsClient, WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsAuthenticationService } from './authenticationService';
import { DfnsUserActionSigningService } from './userActionSigningService';
import { DfnsRequestService } from './requestService';
import { DfnsCredentialService } from './credentialService';
import { DfnsCredentialManagementService } from './credentialManagementService';
import { DfnsDelegatedAuthenticationService } from './delegatedAuthenticationService';
import { DfnsDelegatedUserManagementService } from './delegatedUserManagementService';
import { DfnsUserManagementService } from './userManagementService';
import { DfnsServiceAccountManagementService } from './serviceAccountManagementService';
import { DfnsPersonalAccessTokenManagementService } from './personalAccessTokenManagementService';
import { EnhancedDfnsUserManagementService } from './enhancedUserManagementService';
import { getDfnsDatabaseSyncService, DfnsDatabaseSyncService } from './databaseSyncService';
import { DfnsRegistrationService } from './registrationService';
import { DfnsLoginService } from './loginService';
import { DfnsNetworksService } from './networksService';
import { DfnsValidatorsService } from './validatorsService';
import { DfnsUserRecoveryService } from './userRecoveryService';
import { DfnsWalletService, getDfnsWalletService } from './walletService';
import { DfnsWalletAssetsService, getDfnsWalletAssetsService } from './walletAssetsService';
import { DfnsWalletTagsService, getDfnsWalletTagsService } from './walletTagsService';
import { DfnsWalletTransfersService, getDfnsWalletTransfersService } from './walletTransfersService';
import { DfnsTransactionBroadcastService, getDfnsTransactionBroadcastService } from './transactionBroadcastService';
import { DfnsSignatureGenerationService, getDfnsSignatureGenerationService } from './signatureGenerationService';
import { DfnsKeySignatureGenerationService, getDfnsKeySignatureGenerationService } from './keySignatureServices';
import { DfnsAdvancedWalletService, getDfnsAdvancedWalletService } from './advancedWalletService';
import { DfnsWalletSignatureService, getDfnsWalletSignatureService } from './walletSignatureService';
import { DfnsFeeSponsorService, getDfnsFeeSponsorService } from './feeSponsorService';
import { DfnsKeyService, getDfnsKeyService } from './keyService';
import { DfnsKeyImportService, getDfnsKeyImportService } from './keyImportService';
import { DfnsKeyExportService, getDfnsKeyExportService } from './keyExportService';
import { DfnsKeyDerivationService, getDfnsKeyDerivationService } from './keyDerivationService';
import { DfnsPolicyService, getDfnsPolicyService } from './policyService';
import { DfnsPolicyApprovalService, getDfnsPolicyApprovalService } from './policyApprovalService';
import { DfnsPolicyEngineService, getDfnsPolicyEngineService } from './policyEngineService';
import { DfnsPermissionsService, getDfnsPermissionsService } from './permissionsService';
import { DfnsPermissionAssignmentsService, getDfnsPermissionAssignmentsService } from './permissionAssignmentsService';
import { DfnsWebhookService, getDfnsWebhookService } from './webhookService';
import { DfnsWebhookEventsService, getDfnsWebhookEventsService } from './webhookEventsService';
import { DfnsError } from '../../types/dfns/errors';

export class DfnsService {
  private workingClient: WorkingDfnsClient;
  
  // Core service instances (current DFNS API)
  private authenticationService: DfnsAuthenticationService;
  private userActionSigningService: DfnsUserActionSigningService;
  private requestService: DfnsRequestService;
  private credentialService: DfnsCredentialService;
  private credentialManagementService: DfnsCredentialManagementService;
  
  // Delegated authentication services (NEW)
  private delegatedAuthenticationService: DfnsDelegatedAuthenticationService;
  private delegatedUserManagementService: DfnsDelegatedUserManagementService;
  
  // User Management services (CURRENT DFNS API)
  private userManagementService: DfnsUserManagementService;
  private serviceAccountManagementService: DfnsServiceAccountManagementService;
  private personalAccessTokenManagementService: DfnsPersonalAccessTokenManagementService;
  private enhancedUserManagementService: EnhancedDfnsUserManagementService;
  private databaseSyncService: DfnsDatabaseSyncService;
  
  // Registration and Login services (NEW)
  private registrationService: DfnsRegistrationService;
  private loginService: DfnsLoginService;
  
  // User Recovery service (NEW)
  private userRecoveryService: DfnsUserRecoveryService;
  
  // Networks API services (NEW)
  private networksService: DfnsNetworksService;
  private validatorsService: DfnsValidatorsService;
  
  // Wallet services (NEW)
  private walletService: DfnsWalletService;
  private walletAssetsService: DfnsWalletAssetsService;
  private walletTagsService: DfnsWalletTagsService;
  private walletTransfersService: DfnsWalletTransfersService;
  private transactionBroadcastService: DfnsTransactionBroadcastService;
  
  // Advanced Wallet & Signature services (NEW)
  private signatureGenerationService: DfnsSignatureGenerationService;
  private keySignatureGenerationService: DfnsKeySignatureGenerationService;
  private advancedWalletService: DfnsAdvancedWalletService;
  private walletSignatureService: DfnsWalletSignatureService;
  
  // Fee Sponsor service (NEW)
  private feeSponsorService: DfnsFeeSponsorService;
  
  // Key service (NEW - Current DFNS Keys API)
  private keyService: DfnsKeyService;
  
  // Advanced Key services (NEW - Enterprise Advanced Keys APIs)
  private keyImportService: DfnsKeyImportService;
  private keyExportService: DfnsKeyExportService;
  private keyDerivationService: DfnsKeyDerivationService;
  
  // Policy Engine services (NEW)
  private policyService: DfnsPolicyService;
  private policyApprovalService: DfnsPolicyApprovalService;
  private policyEngineService: DfnsPolicyEngineService;
  
  // Permissions services (NEW)
  private permissionsService: DfnsPermissionsService;
  private permissionAssignmentsService: DfnsPermissionAssignmentsService;
  
  // Webhook services (NEW)
  private webhookService: DfnsWebhookService;
  private webhookEventsService: DfnsWebhookEventsService;
  
  private isInitialized = false;
  private initializationError: Error | null = null;

  constructor() {
    // Initialize with working client (uses environment variables automatically)
    this.workingClient = getWorkingDfnsClient();
    
    // Initialize current DFNS API services
    this.authenticationService = new DfnsAuthenticationService(this.workingClient);
    this.userActionSigningService = new DfnsUserActionSigningService(this.workingClient);
    this.requestService = new DfnsRequestService(this.workingClient);
    this.credentialService = new DfnsCredentialService(this.workingClient);
    this.credentialManagementService = new DfnsCredentialManagementService(this.workingClient);
    
    // Initialize delegated authentication services (NEW)
    this.delegatedAuthenticationService = new DfnsDelegatedAuthenticationService(this.workingClient);
    this.delegatedUserManagementService = new DfnsDelegatedUserManagementService(this.workingClient);
    
    // Initialize User Management services (CURRENT DFNS API)
    this.userManagementService = new DfnsUserManagementService(this.workingClient);
    this.serviceAccountManagementService = new DfnsServiceAccountManagementService(this.workingClient);
    this.personalAccessTokenManagementService = new DfnsPersonalAccessTokenManagementService(this.workingClient);
    this.enhancedUserManagementService = new EnhancedDfnsUserManagementService(this.workingClient);
    this.databaseSyncService = getDfnsDatabaseSyncService();
    
    // Initialize registration and login services (NEW)
    this.registrationService = new DfnsRegistrationService(this.workingClient);
    this.loginService = new DfnsLoginService(this.workingClient);
    
    // Initialize user recovery service (NEW)
    this.userRecoveryService = new DfnsUserRecoveryService(this.workingClient);
    
    // Initialize Networks API services (NEW)
    this.networksService = new DfnsNetworksService(this.workingClient);
    this.validatorsService = new DfnsValidatorsService(this.workingClient);
    
    // Initialize Wallet services (NEW)
    this.walletService = getDfnsWalletService(this.workingClient);
    this.walletAssetsService = getDfnsWalletAssetsService(this.workingClient);
    this.walletTagsService = getDfnsWalletTagsService(this.workingClient);
    this.walletTransfersService = getDfnsWalletTransfersService(this.workingClient);
    this.transactionBroadcastService = getDfnsTransactionBroadcastService(this.workingClient);
    
    // Initialize Advanced Wallet & Signature services (NEW)
    this.signatureGenerationService = getDfnsSignatureGenerationService(this.workingClient);
    this.keySignatureGenerationService = getDfnsKeySignatureGenerationService(this.workingClient);
    this.advancedWalletService = getDfnsAdvancedWalletService(this.workingClient);
    this.walletSignatureService = getDfnsWalletSignatureService(this.workingClient);
    
    // Initialize Fee Sponsor service (NEW)
    this.feeSponsorService = getDfnsFeeSponsorService(this.workingClient);
    
    // Initialize Key service (NEW - Current DFNS Keys API)
    this.keyService = getDfnsKeyService(this.workingClient);
    
    // Initialize Advanced Key services (NEW - Enterprise Advanced Keys APIs)
    this.keyImportService = getDfnsKeyImportService(this.workingClient);
    this.keyExportService = getDfnsKeyExportService(this.workingClient);
    this.keyDerivationService = getDfnsKeyDerivationService(this.workingClient);
    
    // Initialize Policy Engine services (NEW)
    this.policyService = getDfnsPolicyService(this.workingClient);
    this.policyApprovalService = getDfnsPolicyApprovalService(this.workingClient);
    this.policyEngineService = getDfnsPolicyEngineService(this.workingClient);
    
    // Initialize Permissions services (NEW)
    this.permissionsService = getDfnsPermissionsService(this.workingClient);
    this.permissionAssignmentsService = getDfnsPermissionAssignmentsService(this.workingClient);
    
    // Initialize Webhook services (NEW)
    this.webhookService = getDfnsWebhookService(this.workingClient);
    this.webhookEventsService = getDfnsWebhookEventsService(this.workingClient);
    
    // Mark as initialized - WorkingDfnsClient handles auth automatically
    this.isInitialized = true;
  }

  /**
   * Initialize the DFNS service with graceful error handling
   * Note: WorkingDfnsClient handles authentication automatically via environment variables
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Test the connection to verify environment variables are set correctly
      const connectionStatus = await this.workingClient.getConnectionStatus();
      console.log('🔌 DFNS Connection Status:', connectionStatus);

      if (connectionStatus.connected) {
        console.log(`✅ DFNS service initialized successfully using ${connectionStatus.authMethod}`);
        console.log(`📊 Connected with ${connectionStatus.walletsCount} wallets`);
        
        // Test authentication service
        const authStatus = await this.authenticationService.getAuthenticationStatus();
        console.log('🔐 Authentication Status:', {
          method: authStatus.method,
          authenticated: authStatus.isAuthenticated,
          user: authStatus.user?.username || 'Unknown'
        });
      } else {
        console.warn('⚠️ DFNS service initialized with connection issues:', connectionStatus.error);
        console.log('💡 Please check your environment variables (VITE_DFNS_SERVICE_ACCOUNT_TOKEN, VITE_DFNS_PERSONAL_ACCESS_TOKEN, etc.)');
      }

      this.isInitialized = true;
      this.initializationError = null;
    } catch (error) {
      this.initializationError = error as Error;
      console.error('❌ DFNS service initialization failed:', error);
      
      // Don't throw the error - allow the service to be used in limited mode
      this.isInitialized = true;
    }
  }

  // ==============================================
  // CURRENT DFNS API SERVICES
  // ==============================================

  /**
   * Get authentication service (current DFNS API)
   */
  getAuthenticationService(): DfnsAuthenticationService {
    this.ensureInitialized();
    return this.authenticationService;
  }

  /**
   * Get user action signing service (current DFNS API)
   */
  getUserActionSigningService(): DfnsUserActionSigningService {
    this.ensureInitialized();
    return this.userActionSigningService;
  }

  /**
   * Get request service (current DFNS API)
   */
  getRequestService(): DfnsRequestService {
    this.ensureInitialized();
    return this.requestService;
  }

  /**
   * Get credential service (current DFNS API)
   */
  getCredentialService(): DfnsCredentialService {
    this.ensureInitialized();
    return this.credentialService;
  }

  /**
   * Get credential management service (current DFNS API - 2024)
   */
  getCredentialManagementService(): DfnsCredentialManagementService {
    this.ensureInitialized();
    return this.credentialManagementService;
  }

  /**
   * Get delegated authentication service (NEW)
   */
  getDelegatedAuthenticationService(): DfnsDelegatedAuthenticationService {
    this.ensureInitialized();
    return this.delegatedAuthenticationService;
  }

  /**
   * Get delegated user management service (NEW)
   */
  getDelegatedUserManagementService(): DfnsDelegatedUserManagementService {
    this.ensureInitialized();
    return this.delegatedUserManagementService;
  }

  /**
   * Get user management service (CURRENT DFNS API)
   */
  getUserManagementService(): DfnsUserManagementService {
    this.ensureInitialized();
    return this.userManagementService;
  }

  /**
   * Get service account management service (CURRENT DFNS API)
   */
  getServiceAccountManagementService(): DfnsServiceAccountManagementService {
    this.ensureInitialized();
    return this.serviceAccountManagementService;
  }

  /**
   * Get personal access token management service (CURRENT DFNS API)
   */
  getPersonalAccessTokenManagementService(): DfnsPersonalAccessTokenManagementService {
    this.ensureInitialized();
    return this.personalAccessTokenManagementService;
  }

  /**
   * Get enhanced user management service (CURRENT DFNS API + Database Integration)
   */
  getEnhancedUserManagementService(): EnhancedDfnsUserManagementService {
    this.ensureInitialized();
    return this.enhancedUserManagementService;
  }

  /**
   * Get database synchronization service
   */
  getDatabaseSyncService(): DfnsDatabaseSyncService {
    this.ensureInitialized();
    return this.databaseSyncService;
  }

  /**
   * Get registration service (NEW)
   */
  getRegistrationService(): DfnsRegistrationService {
    this.ensureInitialized();
    return this.registrationService;
  }

  /**
   * Get login service (NEW)
   */
  getLoginService(): DfnsLoginService {
    this.ensureInitialized();
    return this.loginService;
  }

  /**
   * Get user recovery service (NEW)
   */
  getUserRecoveryService(): DfnsUserRecoveryService {
    this.ensureInitialized();
    return this.userRecoveryService;
  }

  /**
   * Get networks service (NEW)
   */
  getNetworksService(): DfnsNetworksService {
    this.ensureInitialized();
    return this.networksService;
  }

  /**
   * Get validators service (NEW)
   */
  getValidatorsService(): DfnsValidatorsService {
    this.ensureInitialized();
    return this.validatorsService;
  }

  // ==============================================
  // WALLET SERVICES (NEW)
  // ==============================================

  /**
   * Get wallet service - Core wallet operations
   */
  getWalletService(): DfnsWalletService {
    this.ensureInitialized();
    return this.walletService;
  }

  /**
   * Get wallet assets service - Asset balances, NFTs, history
   */
  getWalletAssetsService(): DfnsWalletAssetsService {
    this.ensureInitialized();
    return this.walletAssetsService;
  }

  /**
   * Get wallet tags service - Wallet tagging operations
   */
  getWalletTagsService(): DfnsWalletTagsService {
    this.ensureInitialized();
    return this.walletTagsService;
  }

  /**
   * Get wallet transfers service - Asset transfer operations
   */
  getWalletTransfersService(): DfnsWalletTransfersService {
    this.ensureInitialized();
    return this.walletTransfersService;
  }

  /**
   * Get transaction broadcast service - Cross-chain transaction broadcasting
   */
  getTransactionBroadcastService(): DfnsTransactionBroadcastService {
    this.ensureInitialized();
    return this.transactionBroadcastService;
  }

  // ==============================================
  // ADVANCED WALLET & SIGNATURE SERVICES (NEW)
  // ==============================================

  /**
   * Get signature generation service - Multi-chain signature generation
   */
  getSignatureGenerationService(): DfnsSignatureGenerationService {
    this.ensureInitialized();
    return this.signatureGenerationService;
  }

  /**
   * Get key signature generation service - Multi-chain key-based signature generation
   */
  getKeySignatureGenerationService(): DfnsKeySignatureGenerationService {
    this.ensureInitialized();
    return this.keySignatureGenerationService;
  }

  /**
   * Get advanced wallet service - Wallet import and advanced operations
   */
  getAdvancedWalletService(): DfnsAdvancedWalletService {
    this.ensureInitialized();
    return this.advancedWalletService;
  }

  /**
   * Get wallet signature service - Direct wallet signature operations
   */
  getWalletSignatureService(): DfnsWalletSignatureService {
    this.ensureInitialized();
    return this.walletSignatureService;
  }

  // ==============================================
  // FEE SPONSOR SERVICE (NEW)
  // ==============================================

  /**
   * Get fee sponsor service - Gasless transaction sponsorship
   */
  getFeeSponsorService(): DfnsFeeSponsorService {
    this.ensureInitialized();
    return this.feeSponsorService;
  }

  /**
   * Get key service - Cryptographic key management (Current DFNS Keys API)
   */
  getKeyService(): DfnsKeyService {
    this.ensureInitialized();
    return this.keyService;
  }

  /**
   * Get key import service - Import external keys (Advanced Keys API - Enterprise)
   */
  getKeyImportService(): DfnsKeyImportService {
    this.ensureInitialized();
    return this.keyImportService;
  }

  /**
   * Get key export service - Export keys for backup/migration (Advanced Keys API - Enterprise)
   */
  getKeyExportService(): DfnsKeyExportService {
    this.ensureInitialized();
    return this.keyExportService;
  }

  /**
   * Get key derivation service - Deterministic key derivation (Advanced Keys API - Enterprise)
   */
  getKeyDerivationService(): DfnsKeyDerivationService {
    this.ensureInitialized();
    return this.keyDerivationService;
  }

  // ==============================================
  // POLICY ENGINE SERVICES (NEW)
  // ==============================================

  /**
   * Get policy service - Core policy CRUD operations
   */
  getPolicyService(): DfnsPolicyService {
    this.ensureInitialized();
    return this.policyService;
  }

  /**
   * Get policy approval service - Approval workflow operations
   */
  getPolicyApprovalService(): DfnsPolicyApprovalService {
    this.ensureInitialized();
    return this.policyApprovalService;
  }

  /**
   * Get policy engine service - Main policy engine orchestrator
   */
  getPolicyEngineService(): DfnsPolicyEngineService {
    this.ensureInitialized();
    return this.policyEngineService;
  }

  // ==============================================
  // PERMISSIONS SERVICES (NEW)
  // ==============================================

  /**
   * Get permissions service - Core permission CRUD operations
   */
  getPermissionsService(): DfnsPermissionsService {
    this.ensureInitialized();
    return this.permissionsService;
  }

  /**
   * Get permission assignments service - Permission assignment operations
   */
  getPermissionAssignmentsService(): DfnsPermissionAssignmentsService {
    this.ensureInitialized();
    return this.permissionAssignmentsService;
  }

  // ==============================================
  // WEBHOOK SERVICES (NEW)
  // ==============================================

  /**
   * Get webhook service - Core webhook CRUD operations
   */
  getWebhookService(): DfnsWebhookService {
    this.ensureInitialized();
    return this.webhookService;
  }

  /**
   * Get webhook events service - Event monitoring and analytics
   */
  getWebhookEventsService(): DfnsWebhookEventsService {
    this.ensureInitialized();
    return this.webhookEventsService;
  }

  // ==============================================
  // CONVENIENCE METHODS & ALIASES
  // ==============================================

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const status = await this.authenticationService.getAuthenticationStatus();
      return status.isAuthenticated;
    } catch {
      return false;
    }
  }

  /**
   * Alias methods for component compatibility
   */
  
  // Transaction service alias (uses transaction broadcast service)
  getTransactionService() {
    return this.getTransactionBroadcastService();
  }

  // User service alias (uses key service for user operations)
  getUserService() {
    return this.getKeyService();
  }

  // Permission service alias (uses permissions service)
  getPermissionService() {
    return this.getPermissionsService();
  }

  // Auth service alias (uses authentication service)
  getAuthService() {
    return this.getAuthenticationService();
  }

  // Service account service alias
  getServiceAccountService() {
    return this.getServiceAccountManagementService();
  }

  // Personal access token service alias
  getPersonalAccessTokenService() {
    return this.getPersonalAccessTokenManagementService();
  }

  // User action service alias
  getUserActionService() {
    return this.getUserActionSigningService();
  }

  // Session manager alias (uses authentication service)
  getSessionManager() {
    return this.getAuthenticationService();
  }

  // Current user getter (uses authentication service)
  async getCurrentUser() {
    const authStatus = await this.authenticationService.getAuthenticationStatus();
    return authStatus.user;
  }

  // Authentication status getter (sync version for backward compatibility)
  getAuthenticationStatus() {
    return this.authenticationService.getAuthenticationStatus();
  }

  // ==============================================
  // WALLET CONVENIENCE METHODS
  // ==============================================

  /**
   * Create wallet with User Action Signing
   * 
   * @param network - Blockchain network
   * @param name - Optional wallet name
   * @param userActionToken - Required for User Action Signing
   * @returns Created wallet
   */
  async createWallet(
    network: string,
    name?: string,
    userActionToken?: string
  ) {
    return this.walletService.createWallet({
      network: network as any,
      name
    }, userActionToken, { syncToDatabase: true });
  }

  /**
   * Get wallet with complete overview (assets, NFTs, recent activity)
   * 
   * @param walletId - Wallet ID
   * @returns Complete wallet overview
   */
  async getWalletOverview(walletId: string) {
    const [wallet, overview] = await Promise.all([
      this.walletService.getWallet(walletId),
      this.walletAssetsService.getWalletOverview(walletId)
    ]);

    return {
      wallet,
      ...overview
    };
  }

  /**
   * Transfer native asset with User Action Signing
   * 
   * @param walletId - Source wallet ID
   * @param to - Destination address
   * @param amount - Amount in smallest unit
   * @param userActionToken - Required for User Action Signing
   * @returns Transfer request
   */
  async transferNativeAsset(
    walletId: string,
    to: string,
    amount: string,
    userActionToken?: string
  ) {
    return this.walletTransfersService.transferNativeAsset(
      walletId, to, amount, userActionToken, { syncToDatabase: true }
    );
  }

  /**
   * Get wallet statistics for dashboard
   * 
   * @param walletId - Wallet ID
   * @returns Wallet statistics
   */
  async getWalletStatistics(walletId: string) {
    const [assets, transfers, tags] = await Promise.allSettled([
      this.walletAssetsService.getWalletAssets(walletId, true),
      this.walletTransfersService.getTransferStatistics(walletId),
      this.walletTagsService.getWalletTags(walletId)
    ]);

    return {
      assets: assets.status === 'fulfilled' ? assets.value : null,
      transfers: transfers.status === 'fulfilled' ? transfers.value : null,
      tags: tags.status === 'fulfilled' ? tags.value : [],
      hasData: assets.status === 'fulfilled' || transfers.status === 'fulfilled'
    };
  }

  // ==============================================
  // TRANSACTION BROADCAST CONVENIENCE METHODS
  // ==============================================

  /**
   * Broadcast EVM transaction with User Action Signing
   * 
   * @param walletId - Wallet ID
   * @param transaction - Hex string or transaction JSON
   * @param userActionToken - Required for User Action Signing
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastEvmTransaction(
    walletId: string,
    transaction: string | object,
    userActionToken?: string,
    options: { externalId?: string; syncToDatabase?: boolean } = {}
  ) {
    return this.transactionBroadcastService.broadcastEvmTransaction(
      walletId, 
      transaction, 
      { userActionToken, ...options }
    );
  }

  /**
   * Broadcast Bitcoin PSBT transaction
   * 
   * @param walletId - Wallet ID
   * @param psbt - Hex encoded PSBT
   * @param userActionToken - Required for User Action Signing
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastBitcoinTransaction(
    walletId: string,
    psbt: string,
    userActionToken?: string,
    options: { externalId?: string; syncToDatabase?: boolean } = {}
  ) {
    return this.transactionBroadcastService.broadcastBitcoinTransaction(
      walletId, 
      psbt, 
      { userActionToken, ...options }
    );
  }

  /**
   * Broadcast Solana transaction
   * 
   * @param walletId - Wallet ID
   * @param transaction - Hex encoded unsigned transaction
   * @param userActionToken - Required for User Action Signing
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastSolanaTransaction(
    walletId: string,
    transaction: string,
    userActionToken?: string,
    options: { externalId?: string; syncToDatabase?: boolean } = {}
  ) {
    return this.transactionBroadcastService.broadcastSolanaTransaction(
      walletId, 
      transaction, 
      { userActionToken, ...options }
    );
  }

  /**
   * Get transaction request by ID
   * 
   * @param walletId - Wallet ID
   * @param transactionId - Transaction request ID
   * @returns Transaction request details
   */
  async getTransactionRequest(walletId: string, transactionId: string) {
    return this.transactionBroadcastService.getTransactionRequest(walletId, transactionId);
  }

  /**
   * Get transaction statistics for wallet
   * 
   * @param walletId - Wallet ID
   * @returns Transaction statistics
   */
  async getTransactionStatistics(walletId: string) {
    return this.transactionBroadcastService.getTransactionStatistics(walletId);
  }

  /**
   * Get pending transactions for wallet
   * 
   * @param walletId - Wallet ID
   * @returns Pending transaction requests
   */
  async getPendingTransactions(walletId: string) {
    return this.transactionBroadcastService.getPendingTransactions(walletId);
  }

  /**
   * Get recent transactions for wallet
   * 
   * @param walletId - Wallet ID
   * @param count - Number of recent transactions (default: 10)
   * @returns Recent transaction requests
   */
  async getRecentTransactions(walletId: string, count: number = 10) {
    return this.transactionBroadcastService.getRecentTransactions(walletId, count);
  }

  // ==============================================
  // SIGNATURE CONVENIENCE METHODS
  // ==============================================

  /**
   * Generate EVM transaction signature with User Action Signing
   * 
   * @param walletId - Wallet ID
   * @param transaction - Hex-encoded unsigned transaction
   * @param userActionToken - Required User Action token
   * @returns Signature response
   */
  async signEvmTransaction(
    walletId: string,
    transaction: string,
    userActionToken?: string
  ) {
    return this.signatureGenerationService.signEvmTransaction(walletId, transaction, userActionToken);
  }

  /**
   * Generate EVM message signature with User Action Signing
   * 
   * @param walletId - Wallet ID
   * @param message - Hex-encoded message
   * @param userActionToken - Required User Action token
   * @returns Signature response
   */
  async signEvmMessage(
    walletId: string,
    message: string,
    userActionToken?: string
  ) {
    return this.signatureGenerationService.signEvmMessage(walletId, message, userActionToken);
  }

  /**
   * Generate EIP-712 typed data signature with User Action Signing
   * 
   * @param walletId - Wallet ID
   * @param typedData - EIP-712 typed data structure
   * @param userActionToken - Required User Action token
   * @returns Signature response
   */
  async signEip712TypedData(
    walletId: string,
    typedData: {
      types: Record<string, Array<{ name: string; type: string }>>;
      domain: any;
      message: Record<string, any>;
    },
    userActionToken?: string
  ) {
    return this.signatureGenerationService.signEip712TypedData(walletId, typedData, userActionToken);
  }

  /**
   * Generate Bitcoin PSBT signature with User Action Signing
   * 
   * @param walletId - Wallet ID
   * @param psbt - Hex-encoded PSBT
   * @param userActionToken - Required User Action token
   * @returns Signature response
   */
  async signBitcoinPsbt(
    walletId: string,
    psbt: string,
    userActionToken?: string
  ) {
    return this.signatureGenerationService.signBitcoinPsbt(walletId, psbt, userActionToken);
  }

  /**
   * Get signature statistics for wallet
   * 
   * @param walletId - Wallet ID
   * @returns Signature statistics
   */
  async getSignatureStatistics(walletId: string) {
    return this.signatureGenerationService.getSignatureStatistics(walletId);
  }

  /**
   * Get pending signature requests for wallet
   * 
   * @param walletId - Wallet ID
   * @returns Pending signature requests
   */
  async getPendingSignatures(walletId: string) {
    return this.signatureGenerationService.getPendingSignatures(walletId);
  }

  // ==============================================
  // KEY SIGNATURE CONVENIENCE METHODS (NEW)
  // ==============================================

  /**
   * Sign hash with cryptographic key (universal method)
   * 
   * @param keyId - Key ID
   * @param hash - 32-byte hash in hex format
   * @param taprootMerkleRoot - Optional merkle root for Schnorr keys
   * @param userActionToken - Required User Action token
   * @returns Signature response
   */
  async signHashWithKey(
    keyId: string,
    hash: string,
    taprootMerkleRoot?: string,
    userActionToken?: string
  ) {
    return this.keySignatureGenerationService.signHash(keyId, hash, taprootMerkleRoot, userActionToken);
  }

  /**
   * Sign EVM transaction with cryptographic key
   * 
   * @param keyId - Key ID
   * @param transaction - Hex-encoded unsigned transaction
   * @param userActionToken - Required User Action token
   * @returns Signature response
   */
  async signEvmTransactionWithKey(
    keyId: string,
    transaction: string,
    userActionToken?: string
  ) {
    return this.keySignatureGenerationService.signEvmTransaction(keyId, transaction, userActionToken);
  }

  /**
   * Sign EVM message with cryptographic key
   * 
   * @param keyId - Key ID
   * @param message - Hex-encoded message
   * @param userActionToken - Required User Action token
   * @returns Signature response
   */
  async signEvmMessageWithKey(
    keyId: string,
    message: string,
    userActionToken?: string
  ) {
    return this.keySignatureGenerationService.signEvmMessage(keyId, message, userActionToken);
  }

  /**
   * Sign Bitcoin PSBT with cryptographic key
   * 
   * @param keyId - Key ID
   * @param psbt - Hex-encoded PSBT
   * @param userActionToken - Required User Action token
   * @returns Signature response
   */
  async signBitcoinPsbtWithKey(
    keyId: string,
    psbt: string,
    userActionToken?: string
  ) {
    return this.keySignatureGenerationService.signBitcoinPsbt(keyId, psbt, userActionToken);
  }

  /**
   * Sign Solana transaction with cryptographic key
   * 
   * @param keyId - Key ID
   * @param transaction - Hex-encoded unsigned transaction
   * @param userActionToken - Required User Action token
   * @returns Signature response
   */
  async signSolanaTransactionWithKey(
    keyId: string,
    transaction: string,
    userActionToken?: string
  ) {
    return this.keySignatureGenerationService.signSolanaTransaction(keyId, transaction, userActionToken);
  }

  /**
   * Get key signature statistics
   * 
   * @param keyId - Key ID
   * @returns Key signature statistics
   */
  async getKeySignatureStatistics(keyId: string) {
    return this.keySignatureGenerationService.getKeySignatureStatistics(keyId);
  }

  /**
   * Get pending key signature requests
   * 
   * @param keyId - Key ID
   * @returns Pending key signature requests
   */
  async getPendingKeySignatures(keyId: string) {
    return this.keySignatureGenerationService.getPendingKeySignatures(keyId);
  }

  // ==============================================
  // FEE SPONSOR CONVENIENCE METHODS
  // ==============================================

  /**
   * Create fee sponsor with User Action Signing
   * 
   * @param walletId - Wallet ID to use as sponsor
   * @param userActionToken - Required for User Action Signing
   * @param autoActivate - Automatically activate after creation
   * @returns Created fee sponsor
   */
  async createFeeSponsor(
    walletId: string,
    userActionToken?: string,
    autoActivate: boolean = true
  ) {
    return this.feeSponsorService.createFeeSponsor(
      { walletId },
      userActionToken,
      { syncToDatabase: true, autoActivate }
    );
  }

  /**
   * Get fee sponsor overview with analytics
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @returns Fee sponsor summary with analytics
   */
  async getFeeSponsorOverview(feeSponsorId: string) {
    return this.feeSponsorService.getFeeSponsorSummary(feeSponsorId, { syncToDatabase: true });
  }

  /**
   * Get all fee sponsors for dashboard
   * 
   * @returns All fee sponsors with analytics
   */
  async getAllFeeSponsorSummaries() {
    const feeSponsors = await this.feeSponsorService.getAllFeeSponsors();
    const summaries = await Promise.allSettled(
      feeSponsors.map(sponsor => 
        this.feeSponsorService.getFeeSponsorSummary(sponsor.id)
      )
    );

    return summaries
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
  }

  /**
   * Toggle fee sponsor activation status
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @param userActionToken - Required for User Action Signing
   * @returns Updated fee sponsor
   */
  async toggleFeeSponsorStatus(feeSponsorId: string, userActionToken?: string) {
    const feeSponsor = await this.feeSponsorService.getFeeSponsor(feeSponsorId);
    
    if (feeSponsor.status === 'Active') {
      return this.feeSponsorService.deactivateFeeSponsor(feeSponsorId, userActionToken, { syncToDatabase: true });
    } else {
      return this.feeSponsorService.activateFeeSponsor(feeSponsorId, userActionToken, { syncToDatabase: true });
    }
  }

  /**
   * Get fee sponsor statistics for dashboard
   * 
   * @returns Aggregated fee sponsor statistics
   */
  async getFeeSponsorStatistics() {
    return this.feeSponsorService.getFeeSponsorStatistics();
  }

  /**
   * Check if network supports fee sponsoring
   * 
   * @param network - Network to check
   * @returns Whether network supports fee sponsoring
   */
  isFeeSponsorSupportedNetwork(network: string) {
    return this.feeSponsorService.isNetworkSupported(network as any);
  }

  /**
   * Get supported networks for fee sponsoring
   * 
   * @returns List of supported networks
   */
  getFeeSponsorSupportedNetworks() {
    return this.feeSponsorService.getSupportedNetworks();
  }

  // ==============================================
  // ADVANCED WALLET CONVENIENCE METHODS
  // ==============================================

  /**
   * Check if wallet import is available for your account
   * 
   * @returns Whether import endpoint is enabled
   */
  async isWalletImportEnabled(): Promise<boolean> {
    return this.advancedWalletService.isImportEnabled();
  }

  /**
   * Get wallet import requirements and status
   * 
   * @returns Import requirements information
   */
  async getWalletImportRequirements() {
    return this.advancedWalletService.getImportRequirements();
  }

  /**
   * Get signer cluster information for wallet import
   * 
   * @returns Signer cluster information
   */
  async getSignerClusterInfo() {
    return this.advancedWalletService.getSignerClusterInfo();
  }

  /**
   * Analyze wallet for import readiness
   * 
   * @param privateKey - Private key to analyze
   * @param network - Target network
   * @returns Analysis result
   */
  analyzeWalletForImport(privateKey: string, network: string) {
    return this.advancedWalletService.analyzeWalletForImport(privateKey, network);
  }

  // ==============================================
  // KEY CONVENIENCE METHODS (NEW)
  // ==============================================

  /**
   * Create cryptographic key with User Action Signing
   * 
   * @param scheme - Key scheme (ECDSA, EdDSA, Schnorr)
   * @param curve - Key curve (secp256k1, ed25519, stark)
   * @param name - Optional key name
   * @param userActionToken - Required for User Action Signing
   * @returns Created key
   */
  async createKey(
    scheme: 'ECDSA' | 'EdDSA' | 'Schnorr',
    curve: 'secp256k1' | 'ed25519' | 'stark',
    name?: string,
    userActionToken?: string
  ) {
    return this.keyService.createKey({
      scheme,
      curve,
      name
    }, userActionToken, { syncToDatabase: true });
  }

  /**
   * Create key optimized for specific network
   * 
   * @param network - Target blockchain network
   * @param name - Optional key name
   * @param userActionToken - Required for User Action Signing
   * @returns Created key with network compatibility info
   */
  async createKeyForNetwork(
    network: string,
    name?: string,
    userActionToken?: string
  ) {
    const recommendedFormat = this.keyService.getRecommendedKeyFormatForNetwork(network);
    if (!recommendedFormat) {
      throw new Error(`Network "${network}" is not supported`);
    }

    return this.keyService.createKey({
      scheme: recommendedFormat.scheme,
      curve: recommendedFormat.curve,
      name: name || `${network} Key`
    }, userActionToken, { syncToDatabase: true });
  }

  /**
   * Get all keys with comprehensive information
   * 
   * @returns All keys with statistics
   */
  async getAllKeysOverview() {
    const [keys, statistics] = await Promise.all([
      this.keyService.getAllKeys(),
      this.keyService.getKeyStatistics()
    ]);

    return {
      keys,
      statistics,
      hasKeys: keys.length > 0
    };
  }

  /**
   * Get keys suitable for wallet creation by network
   * 
   * @param network - Target blockchain network
   * @returns Active keys compatible with the network
   */
  async getKeysForWalletCreation(network: string) {
    const compatibleKeys = await this.keyService.getKeysForNetwork(network);
    return compatibleKeys.filter(key => 
      key.status === 'Active' && key.custodial
    );
  }

  /**
   * Update key name with User Action Signing
   * 
   * @param keyId - Key ID to update
   * @param name - New key name
   * @param userActionToken - Required for User Action Signing
   * @returns Updated key
   */
  async updateKeyName(
    keyId: string,
    name: string,
    userActionToken?: string
  ) {
    return this.keyService.updateKey(keyId, { name }, userActionToken, { syncToDatabase: true });
  }

  /**
   * Delegate key to end user (irreversible)
   * 
   * @param keyId - Key ID to delegate
   * @param userId - End user ID
   * @param userActionToken - Required for User Action Signing
   * @returns Delegated key
   */
  async delegateKeyToUser(
    keyId: string,
    userId: string,
    userActionToken?: string
  ) {
    return this.keyService.delegateKey(keyId, { userId }, userActionToken, { syncToDatabase: true });
  }

  /**
   * Delete key and all associated wallets (irreversible)
   * 
   * @param keyId - Key ID to delete
   * @param userActionToken - Required for User Action Signing
   * @returns Deleted (archived) key
   */
  async deleteKey(
    keyId: string,
    userActionToken?: string
  ) {
    return this.keyService.deleteKey(keyId, userActionToken, { syncToDatabase: true });
  }

  /**
   * Get key statistics for dashboard
   * 
   * @returns Comprehensive key statistics
   */
  async getKeyStatistics() {
    return this.keyService.getKeyStatistics();
  }

  /**
   * Check if a network is supported for key creation
   * 
   * @param network - Network name to check
   * @returns Whether the network is supported
   */
  isNetworkSupportedForKeys(network: string): boolean {
    return this.keyService.getRecommendedKeyFormatForNetwork(network) !== null;
  }

  // ==============================================
  // ADVANCED KEY CONVENIENCE METHODS (ENTERPRISE)
  // ==============================================

  /**
   * Check if key import feature is available
   * 
   * @returns Whether import endpoint is enabled
   */
  async isKeyImportEnabled(): Promise<boolean> {
    return this.keyImportService.isImportEnabled();
  }

  /**
   * Get key import requirements
   * 
   * @returns Import requirements information
   */
  async getKeyImportRequirements() {
    return this.keyImportService.getImportRequirements();
  }

  /**
   * Import a private key into DFNS (ENTERPRISE ONLY)
   * 
   * Note: Requires client-side MPC sharding using DFNS SDK utilities
   * 
   * @param request - Import request with encrypted key shares
   * @param userActionToken - Required User Action token
   * @returns Imported key details
   */
  async importKey(
    request: any, // ImportKeyRequest from keyImportService
    userActionToken?: string
  ) {
    return this.keyImportService.importKey(request, userActionToken, { syncToDatabase: true });
  }

  /**
   * Check if key export feature is available
   * 
   * @returns Whether export endpoint is enabled
   */
  async isKeyExportEnabled(): Promise<boolean> {
    return this.keyExportService.isExportEnabled();
  }

  /**
   * Validate if a key can be exported
   * 
   * @param keyId - Key ID to validate for export
   * @returns Validation result with security warnings
   */
  async validateKeyForExport(keyId: string) {
    return this.keyExportService.validateKeyForExport(keyId);
  }

  /**
   * Export a key from DFNS (ENTERPRISE ONLY)
   * 
   * Note: Requires client-side decryption using DFNS SDK utilities
   * 
   * @param keyId - Key ID to export
   * @param exportContext - Export context with encryption keys
   * @param userActionToken - Required User Action token
   * @returns Export response with encrypted key shares
   */
  async exportKey(
    keyId: string,
    exportContext: any, // ExportContext from keyExportService
    userActionToken?: string,
    disableAfterExport: boolean = false
  ) {
    return this.keyExportService.exportKey(
      keyId,
      exportContext,
      userActionToken,
      { syncToDatabase: true, disableKeyAfterExport: disableAfterExport }
    );
  }

  /**
   * Check if key supports derivation
   * 
   * @param keyId - Key ID to check
   * @returns Whether key supports derivation (DH keys only)
   */
  async isKeyDerivationSupported(keyId: string): Promise<boolean> {
    return this.keyDerivationService.isDerivationSupported(keyId);
  }

  /**
   * Derive output from a Diffie-Hellman key
   * 
   * @param keyId - Diffie-Hellman key ID
   * @param domain - Domain separation tag (hex format)
   * @param seed - Seed value (hex format)
   * @param userActionToken - Required User Action token
   * @returns Derivation output in hex format
   */
  async deriveKey(
    keyId: string,
    domain: string,
    seed: string,
    userActionToken?: string
  ) {
    return this.keyDerivationService.deriveKey(
      keyId,
      { domain, seed },
      userActionToken,
      { syncToDatabase: true, validateInputs: true }
    );
  }

  /**
   * Derive output for application-specific use
   * 
   * @param keyId - Diffie-Hellman key ID
   * @param company - Company name
   * @param application - Application name
   * @param version - Version identifier
   * @param seedInput - Seed input (will be hex-encoded)
   * @param userActionToken - Required User Action token
   * @returns Derivation output
   */
  async deriveKeyForApplication(
    keyId: string,
    company: string,
    application: string,
    version: string,
    seedInput: string | number,
    userActionToken?: string
  ) {
    return this.keyDerivationService.deriveForApplication(
      keyId,
      { company, application, version },
      seedInput,
      userActionToken,
      { syncToDatabase: true }
    );
  }

  /**
   * Get advanced key statistics for dashboard
   * 
   * @returns Combined statistics from all advanced key services
   */
  async getAdvancedKeyStatistics() {
    const [importStats, exportStats, derivationStats] = await Promise.allSettled([
      this.keyImportService.getImportStatistics(),
      this.keyExportService.getExportStatistics(),
      this.keyDerivationService.getDerivationStatistics()
    ]);

    return {
      import: importStats.status === 'fulfilled' ? importStats.value : null,
      export: exportStats.status === 'fulfilled' ? exportStats.value : null,
      derivation: derivationStats.status === 'fulfilled' ? derivationStats.value : null,
      hasData: importStats.status === 'fulfilled' || exportStats.status === 'fulfilled' || derivationStats.status === 'fulfilled'
    };
  }

  /**
   * Get supported networks for key operations
   * 
   * @returns List of supported network names
   */
  getSupportedNetworksForKeys(): string[] {
    return Object.keys(this.keyService.getSupportedNetworksForKeyFormat('ECDSA', 'secp256k1'));
  }

  // ==============================================
  // PERMISSIONS CONVENIENCE METHODS
  // ==============================================

  /**
   * Create permission with User Action Signing
   * 
   * @param name - Permission name
   * @param operations - Permission operations
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Created permission
   */
  async createPermission(
    name: string,
    operations: string[],
    userActionToken?: string,
    options: { description?: string; category?: string; syncToDatabase?: boolean } = {}
  ) {
    return this.permissionsService.createPermission({
      name,
      operations: operations as any,
      description: options.description,
      category: options.category
    }, userActionToken, { syncToDatabase: options.syncToDatabase });
  }

  /**
   * Get all active permissions
   * 
   * @returns Active permissions only
   */
  async getActivePermissions() {
    return this.permissionsService.getActivePermissions();
  }

  /**
   * Assign permission to user, service account, or PAT
   * 
   * @param permissionId - Permission ID
   * @param identityId - Identity ID (user, service account, or PAT)
   * @param identityKind - Type of identity
   * @param userActionToken - Required for User Action Signing
   * @returns Created assignment
   */
  async assignPermission(
    permissionId: string,
    identityId: string,
    identityKind: 'User' | 'ServiceAccount' | 'PersonalAccessToken',
    userActionToken?: string
  ) {
    return this.permissionAssignmentsService.assignPermission(
      permissionId,
      { permissionId, identityId, identityKind },
      userActionToken,
      { syncToDatabase: true }
    );
  }

  /**
   * Check if an identity has a specific permission
   * 
   * @param identityId - Identity ID
   * @param identityKind - Type of identity
   * @param permissionId - Permission ID to check
   * @returns Whether the identity has the permission
   */
  async hasPermission(
    identityId: string,
    identityKind: 'User' | 'ServiceAccount' | 'PersonalAccessToken',
    permissionId: string
  ): Promise<boolean> {
    return this.permissionAssignmentsService.hasPermission(
      identityId,
      identityKind,
      permissionId
    );
  }

  /**
   * Get assignments for a specific user
   * 
   * @param userId - User ID
   * @returns User's permission assignments
   */
  async getUserPermissions(userId: string) {
    return this.permissionAssignmentsService.getAssignmentsForUser(userId);
  }

  /**
   * Get assignments for a specific service account
   * 
   * @param serviceAccountId - Service Account ID
   * @returns Service account's permission assignments
   */
  async getServiceAccountPermissions(serviceAccountId: string) {
    return this.permissionAssignmentsService.getAssignmentsForServiceAccount(serviceAccountId);
  }

  /**
   * Revoke permission assignment
   * 
   * @param assignmentId - Assignment ID to revoke
   * @param userActionToken - Required for User Action Signing
   * @returns Revoked assignment
   */
  async revokePermissionAssignment(
    assignmentId: string,
    userActionToken?: string
  ) {
    return this.permissionAssignmentsService.revokePermissionAssignment(
      assignmentId,
      userActionToken,
      { syncToDatabase: true }
    );
  }

  /**
   * Get permission statistics for dashboard
   * 
   * @returns Comprehensive permission statistics
   */
  async getPermissionStatistics() {
    const [permissionStats, assignmentStats] = await Promise.all([
      this.permissionsService.getPermissionStatistics(),
      this.permissionAssignmentsService.getAssignmentStatistics()
    ]);

    return {
      permissions: permissionStats,
      assignments: assignmentStats,
      hasData: permissionStats.total > 0 || assignmentStats.total > 0
    };
  }

  /**
   * Find permissions by operation
   * 
   * @param operation - Permission operation to search for
   * @returns Permissions containing the operation
   */
  async findPermissionsByOperation(operation: string) {
    return this.permissionsService.findPermissionsByOperation(operation as any);
  }

  /**
   * Bulk assign permission to multiple identities
   * 
   * @param permissionId - Permission ID
   * @param assignments - List of identities to assign to
   * @param userActionToken - Required for User Action Signing
   * @returns Results of all assignments
   */
  async bulkAssignPermission(
    permissionId: string,
    assignments: Array<{ identityId: string; identityKind: 'User' | 'ServiceAccount' | 'PersonalAccessToken' }>,
    userActionToken?: string
  ) {
    return this.permissionAssignmentsService.bulkAssignPermission(
      permissionId,
      assignments,
      userActionToken,
      { syncToDatabase: true, continueOnError: true }
    );
  }

  // ==============================================
  // POLICY ENGINE CONVENIENCE METHODS
  // ==============================================

  /**
   * Create policy with User Action Signing
   * 
   * @param request - Policy creation request
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Created policy
   */
  async createPolicy(
    request: any, // DfnsCreatePolicyRequest
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ) {
    return this.policyService.createPolicy(request, userActionToken, options);
  }

  /**
   * Get policy by ID
   * 
   * @param policyId - DFNS policy ID
   * @returns Policy details
   */
  async getPolicy(policyId: string) {
    return this.policyService.getPolicy(policyId);
  }

  /**
   * Get all active policies
   * 
   * @returns Active policies
   */
  async getActivePolicies() {
    return this.policyService.getActivePolicies();
  }

  /**
   * Get wallet signing policies
   * 
   * @returns Policies for wallet signing activities
   */
  async getWalletSigningPolicies() {
    return this.policyService.getWalletSigningPolicies();
  }

  /**
   * Archive policy with User Action Signing
   * 
   * @param policyId - DFNS policy ID
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Archived policy or change request
   */
  async archivePolicy(
    policyId: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ) {
    return this.policyService.archivePolicy(policyId, userActionToken, options);
  }

  /**
   * Get policy statistics for dashboard
   * 
   * @returns Comprehensive policy statistics
   */
  async getPolicyStatistics() {
    return this.policyService.getPolicyStatistics();
  }

  /**
   * Get approval by ID
   * 
   * @param approvalId - DFNS approval ID
   * @returns Approval details
   */
  async getApproval(approvalId: string) {
    return this.policyApprovalService.getApproval(approvalId);
  }

  /**
   * Approve an approval with User Action Signing
   * 
   * @param approvalId - DFNS approval ID
   * @param reason - Optional reason for approval
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Updated approval
   */
  async approveApproval(
    approvalId: string,
    reason?: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ) {
    return this.policyApprovalService.approveApproval(approvalId, reason, userActionToken, options);
  }

  /**
   * Deny an approval with User Action Signing
   * 
   * @param approvalId - DFNS approval ID
   * @param reason - Optional reason for denial
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Updated approval
   */
  async denyApproval(
    approvalId: string,
    reason?: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ) {
    return this.policyApprovalService.denyApproval(approvalId, reason, userActionToken, options);
  }

  /**
   * Get pending approvals requiring action
   * 
   * @returns Pending approvals
   */
  async getPendingApprovals() {
    return this.policyApprovalService.getPendingApprovals();
  }

  /**
   * Get approvals for a specific user
   * 
   * @param userId - User ID
   * @param type - Filter by initiator or approver
   * @returns User's approvals
   */
  async getApprovalsForUser(userId: string, type: 'initiator' | 'approver' = 'approver') {
    return this.policyApprovalService.getApprovalsForUser(userId, type);
  }

  /**
   * Get approval statistics for dashboard
   * 
   * @returns Comprehensive approval statistics
   */
  async getApprovalStatistics() {
    return this.policyApprovalService.getApprovalStatistics();
  }

  /**
   * Get comprehensive policy engine overview
   * 
   * @returns Complete policy engine dashboard data
   */
  async getPolicyEngineOverview() {
    return this.policyEngineService.getPolicyEngineOverview();
  }

  /**
   * Create policy from template
   * 
   * @param template - Policy template configuration
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Created policy
   */
  async createPolicyFromTemplate(
    template: any, // DfnsPolicyTemplateRequest
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ) {
    return this.policyEngineService.createPolicyFromTemplate(template, userActionToken, options);
  }

  /**
   * Get policy compliance status for wallets
   * 
   * @param walletIds - Wallet IDs to check
   * @returns Compliance analysis for each wallet
   */
  async getWalletPolicyCompliance(walletIds: string[]) {
    return this.policyEngineService.getWalletPolicyCompliance(walletIds);
  }

  /**
   * Get approval queue for user
   * 
   * @param userId - User ID
   * @returns User's approval queue
   */
  async getUserApprovalQueue(userId: string) {
    return this.policyEngineService.getUserApprovalQueue(userId);
  }

  /**
   * Check if service is ready for operations
   */
  isReady(): boolean {
    return this.isInitialized && this.workingClient.isConfigured();
  }

  /**
   * Get current authentication method
   */
  getAuthenticationMethod() {
    return this.workingClient.getAuthMethod();
  }

  /**
   * Get authentication configuration (safe - no secrets)
   */
  getAuthenticationConfig() {
    return this.authenticationService.getAuthenticationConfig();
  }

  /**
   * Get working client instance (for advanced operations)
   */
  getWorkingClient(): WorkingDfnsClient {
    return this.workingClient;
  }

  /**
   * Get comprehensive authentication status
   */
  async getAuthenticationStatusAsync() {
    try {
      const authStatus = await this.authenticationService.getAuthenticationStatus();
      const connectionStatus = await this.workingClient.getConnectionStatus();
      
      return {
        isAuthenticated: authStatus.isAuthenticated,
        connected: connectionStatus.connected,
        method: authStatus.method,
        methodDisplayName: this.authenticationService.getAuthMethodDisplayName(authStatus.method),
        user: authStatus.user,
        isReady: this.isReady(),
        initializationError: this.initializationError?.message,
        authMethod: authStatus.method,
        credentialsCount: connectionStatus.credentialsCount || 0,
        walletsCount: connectionStatus.walletsCount || 0,
        hasCredentialAccess: connectionStatus.hasCredentialAccess,
        error: connectionStatus.error,
        lastValidated: authStatus.lastValidated,
        tokenExpiry: authStatus.tokenExpiry,
        permissions: authStatus.permissions
      };
    } catch (error) {
      return {
        isAuthenticated: false,
        connected: false,
        method: 'NONE' as const,
        methodDisplayName: 'Not Authenticated',
        user: null,
        isReady: this.isReady(),
        initializationError: this.initializationError?.message || (error as Error)?.message,
        error: (error as Error)?.message,
        authMethod: 'NONE' as const,
        credentialsCount: 0,
        walletsCount: 0,
        hasCredentialAccess: false
      };
    }
  }

  /**
   * Test connection with detailed metrics
   */
  async testConnection() {
    try {
      const authTest = await this.authenticationService.testConnection();
      const requestMetrics = this.requestService.getMetrics();
      
      return {
        success: authTest.success,
        method: authTest.method,
        methodDisplayName: this.authenticationService.getAuthMethodDisplayName(authTest.method),
        responseTime: authTest.responseTime,
        requestMetrics: {
          totalRequests: requestMetrics.totalRequests,
          successRate: this.requestService.getSuccessRate(),
          averageResponseTime: requestMetrics.averageResponseTime,
          rateLimitHits: requestMetrics.rateLimitHits,
          authFailures: requestMetrics.authFailures
        },
        details: authTest.details,
        error: authTest.error
      };
    } catch (error) {
      return {
        success: false,
        method: this.workingClient.getAuthMethod(),
        methodDisplayName: 'Connection Failed',
        responseTime: 0,
        requestMetrics: this.requestService.getMetrics(),
        error: error instanceof Error ? error.message : 'Unknown connection error'
      };
    }
  }

  /**
   * Refresh authentication if supported
   */
  async refreshAuthentication(): Promise<boolean> {
    try {
      return await this.authenticationService.refreshAuthentication();
    } catch {
      return false;
    }
  }

  /**
   * Check if User Action Signing is supported
   */
  supportsUserActionSigning(): boolean {
    return this.authenticationService.supportsUserActionSigning();
  }

  /**
   * Get credential statistics (uses current API)
   */
  async getCredentialStats() {
    try {
      return await this.credentialManagementService.getCredentialStats();
    } catch (error) {
      console.error('❌ Failed to get credential stats:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byKind: {}
      };
    }
  }

  /**
   * Check WebAuthn support (uses current API)
   */
  isWebAuthnSupported(): boolean {
    return this.credentialManagementService.isWebAuthnSupported();
  }

  /**
   * Check platform authenticator availability (uses current API)
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    try {
      return await this.credentialManagementService.isPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Get initialization error if any
   */
  getInitializationError(): Error | null {
    return this.initializationError;
  }

  /**
   * Get request metrics
   */
  getRequestMetrics() {
    return this.requestService.getMetrics();
  }

  /**
   * Reset request metrics
   */
  resetRequestMetrics(): void {
    this.requestService.resetMetrics();
  }

  /**
   * Ensure service is initialized (but don't throw errors)
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new DfnsError('DFNS service not initialized', 'SERVICE_NOT_INITIALIZED');
    }
  }

  // ==============================================
  // WEBHOOK CONVENIENCE METHODS
  // ==============================================

  /**
   * Create webhook with User Action Signing
   * 
   * @param url - Webhook endpoint URL
   * @param events - Array of event types to subscribe to
   * @param description - Optional description
   * @param userActionToken - Required for User Action Signing
   * @returns Created webhook
   */
  async createWebhook(
    url: string,
    events: string[],
    description?: string,
    userActionToken?: string
  ) {
    return this.webhookService.createEventWebhook(
      url,
      events as any,
      description,
      userActionToken
    );
  }

  /**
   * Get webhook overview with analytics
   * 
   * @param webhookId - DFNS webhook ID
   * @returns Webhook summary with metrics
   */
  async getWebhookOverview(webhookId: string) {
    return this.webhookService.getWebhookSummary(webhookId);
  }

  /**
   * Get all webhooks for dashboard
   * 
   * @returns Array of webhook summaries
   */
  async getAllWebhookSummaries() {
    return this.webhookService.getAllWebhookSummaries();
  }

  /**
   * Toggle webhook status (enable/disable)
   * 
   * @param webhookId - DFNS webhook ID
   * @param userActionToken - Required for User Action Signing
   * @returns Updated webhook
   */
  async toggleWebhookStatus(webhookId: string, userActionToken?: string) {
    return this.webhookService.toggleWebhookStatus(webhookId, userActionToken);
  }

  /**
   * Get webhook events analytics
   * 
   * @param webhookId - DFNS webhook ID
   * @param days - Number of days to analyze
   * @returns Event analytics
   */
  async getWebhookEventAnalytics(webhookId: string, days: number = 7) {
    return this.webhookEventsService.getWebhookEventAnalytics(webhookId, days);
  }

  /**
   * Get failed webhook events requiring attention
   * 
   * @param webhookId - DFNS webhook ID
   * @returns Failed webhook events
   */
  async getFailedWebhookEvents(webhookId: string) {
    return this.webhookEventsService.getFailedWebhookEvents(webhookId, false);
  }

  /**
   * Get webhook health status
   * 
   * @param webhookId - DFNS webhook ID
   * @returns Health status and metrics
   */
  async getWebhookHealth(webhookId: string) {
    return this.webhookEventsService.getWebhookHealth(webhookId);
  }

  /**
   * Verify webhook signature for security
   * 
   * @param payload - Raw webhook payload
   * @param signature - X-DFNS-WEBHOOK-SIGNATURE header
   * @param secret - Webhook secret
   * @returns Signature verification result
   */
  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ) {
    return this.webhookService.verifyWebhookSignature(payload, signature, secret);
  }

  /**
   * Test webhook connectivity
   * 
   * @param webhookId - DFNS webhook ID
   * @returns Ping response
   */
  async pingWebhook(webhookId: string) {
    return this.webhookService.pingWebhook(webhookId);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.isInitialized = false;
    this.initializationError = null;
  }
}

// Global service instance
let globalDfnsService: DfnsService | null = null;

/**
 * Get or create the global DFNS service instance
 */
export function getDfnsService(): DfnsService {
  if (!globalDfnsService) {
    globalDfnsService = new DfnsService();
    // Set global instance on window object for debugging
    if (typeof window !== 'undefined') {
      (window as any).__dfns_service__ = globalDfnsService;
    }
  }
  return globalDfnsService;
}

/**
 * Initialize the global DFNS service with graceful error handling
 */
export async function initializeDfnsService(): Promise<DfnsService> {
  const service = getDfnsService();
  await service.initialize();
  
  // Log initialization success
  const status = await service.getAuthenticationStatusAsync();
  console.log('🎯 DFNS Service Initialized:', {
    authenticated: status.isAuthenticated,
    method: status.methodDisplayName,
    ready: service.isReady(),
    wallets: status.walletsCount,
    credentials: status.credentialsCount
  });
  
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
  
  if (typeof window !== 'undefined') {
    delete (window as any).__dfns_service__;
  }
}
