/**
 * DFNS SDK Client - Official SDK implementation
 * This replaces the custom DfnsManager.ts with official SDK
 */

import { DfnsApiClient } from '@dfns/sdk';
import { AsymmetricKeySigner } from '@dfns/sdk-keysigner';
import { WebAuthnSigner } from '@dfns/sdk-browser';
import type { DfnsClientConfig } from '@/types/dfns';
import { EnhancedDfnsAuth } from './enhanced-auth';

export interface DfnsSDKConfig {
  appId: string;
  baseUrl: string;
  serviceAccount?: {
    privateKey: string;
    credentialId: string;
  };
  webAuthn?: {
    rpId: string;
    origin: string;
  };
}

export class DfnsSDKClient {
  private client: DfnsApiClient;
  private webAuthnSigner?: WebAuthnSigner;
  private isAuthenticated = false;
  private config: DfnsSDKConfig;
  private enhancedAuth: EnhancedDfnsAuth;

  constructor(config: DfnsSDKConfig) {
    this.config = config;
    this.enhancedAuth = new EnhancedDfnsAuth();
    
    if (config.serviceAccount?.privateKey && config.serviceAccount?.credentialId) {
      // Service Account authentication
      this.client = new DfnsApiClient({
        appId: config.appId,
        baseUrl: config.baseUrl,
        signer: new AsymmetricKeySigner({
          privateKey: config.serviceAccount.privateKey,
          credId: config.serviceAccount.credentialId,
        })
      });
      this.isAuthenticated = true;
    } else {
      // Delegated authentication (configured later)
      this.client = new DfnsApiClient({
        appId: config.appId,
        baseUrl: config.baseUrl,
      });
    }
  }

  // ===== Enhanced Authentication Methods (Phase 2) =====

  /**
   * Enhanced WebAuthn authentication with proper user action signing
   */
  async authenticateWithWebAuthn(username: string): Promise<void> {
    try {
      await this.enhancedAuth.authenticateWithWebAuthn(username);
      this.client = this.enhancedAuth.getClient();
      this.isAuthenticated = true;
    } catch (error) {
      throw new Error(`Enhanced WebAuthn authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Enhanced service account authentication with token management
   */
  async authenticateServiceAccount(serviceAccountId: string, privateKey: string): Promise<void> {
    try {
      await this.enhancedAuth.authenticateServiceAccount(serviceAccountId, privateKey);
      this.client = this.enhancedAuth.getClient();
      this.isAuthenticated = true;
    } catch (error) {
      throw new Error(`Enhanced service account authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Register passkey with enhanced credential management
   */
  async registerPasskey(
    username: string,
    displayName: string,
    credentialName: string,
    registrationCode: string
  ): Promise<any> {
    try {
      return await this.enhancedAuth.registerPasskey(username, displayName, credentialName, registrationCode);
    } catch (error) {
      throw new Error(`Passkey registration failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create recovery credential for account recovery
   */
  async createRecoveryCredential(name: string): Promise<any> {
    try {
      return await this.enhancedAuth.createRecoveryCredential(name);
    } catch (error) {
      throw new Error(`Recovery credential creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Initiate account recovery
   */
  async initiateAccountRecovery(username: string, recoveryCredentialId: string): Promise<any> {
    try {
      return await this.enhancedAuth.initiateAccountRecovery(username, recoveryCredentialId);
    } catch (error) {
      throw new Error(`Account recovery initiation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Register a new delegated user
   */
  async registerDelegatedUser(email: string, kind: 'EndUser' = 'EndUser'): Promise<any> {
    try {
      // Use createUser method instead of delegatedRegistration
      return await this.client.auth.createUser({
        body: {
          email,
          kind: kind as any,
        }
      });
    } catch (error) {
      throw new Error(`Delegated registration failed: ${(error as Error).message}`);
    }
  }

  /**
   * Login delegated user
   */
  async loginDelegatedUser(username: string): Promise<any> {
    try {
      return await this.client.auth.delegatedLogin({
        body: {
          username
        }
      });
    } catch (error) {
      throw new Error(`Delegated login failed: ${(error as Error).message}`);
    }
  }

  // ===== Enhanced Wallet Operations with User Action Signing =====

  async createWallet(params: any) {
    await this.enhancedAuth.ensureValidToken();
    return this.client.wallets.createWallet({ body: params });
  }

  async getWallet(walletId: string) {
    return this.client.wallets.getWallet({ walletId });
  }

  async listWallets(params?: any) {
    return this.client.wallets.listWallets(params);
  }

  async transferAsset(walletId: string, params: any) {
    await this.enhancedAuth.ensureValidToken();
    return this.client.wallets.transferAsset({
      walletId,
      body: params
    });
  }

  async getWalletAssets(walletId: string) {
    return this.client.wallets.getWalletAssets({ walletId });
  }

  async getWalletNfts(walletId: string) {
    return this.client.wallets.getWalletNfts({ walletId });
  }

  async getWalletHistory(walletId: string, params?: any) {
    return this.client.wallets.getWalletHistory({ walletId, ...params });
  }

  // ===== Key Operations =====

  async createKey(params: any) {
    return this.client.keys.createKey({ body: params });
  }

  async getKey(keyId: string) {
    return this.client.keys.getKey({ keyId });
  }

  async listKeys(params?: any) {
    return this.client.keys.listKeys(params);
  }

  async generateSignature(keyId: string, params: any) {
    return this.client.keys.generateSignature({
      keyId,
      body: params
    });
  }

  // ===== Policy Operations =====

  async createPolicy(params: any) {
    return this.client.policies.createPolicy({ body: params });
  }

  async getPolicy(policyId: string) {
    return this.client.policies.getPolicy({ policyId });
  }

  async listPolicies(params?: any) {
    return this.client.policies.listPolicies(params);
  }

  async updatePolicy(policyId: string, params: any) {
    return this.client.policies.updatePolicy({
      policyId,
      body: params
    });
  }

  async listApprovals(params?: any) {
    return this.client.policies.listApprovals(params);
  }

  async createApprovalDecision(approvalId: string, params: any) {
    return this.client.policies.createApprovalDecision({
      approvalId,
      body: params
    });
  }

  // ===== User Management =====

  async listUsers(params?: any) {
    return this.client.auth.listUsers(params);
  }

  async createUser(params: any) {
    return this.client.auth.createUser({ body: params });
  }

  async getUser(userId: string) {
    return this.client.auth.getUser({ userId });
  }

  async activateUser(userId: string) {
    return this.client.auth.activateUser({ userId });
  }

  async deactivateUser(userId: string) {
    return this.client.auth.deactivateUser({ userId });
  }

  // ===== Permission Operations =====

  async listPermissions(params?: any) {
    return this.client.permissions.listPermissions(params);
  }

  async createPermission(params: any) {
    return this.client.permissions.createPermission({ body: params });
  }

  async getPermission(permissionId: string) {
    return this.client.permissions.getPermission({ permissionId });
  }

  async updatePermission(permissionId: string, params: any) {
    return this.client.permissions.updatePermission({
      permissionId,
      body: params
    });
  }

  async createPermissionAssignment(params: any) {
    const { permissionId, ...bodyParams } = params;
    return this.client.permissions.createAssignment({ 
      permissionId,
      body: bodyParams 
    });
  }

  async revokePermissionAssignment(assignmentId: string) {
    // Note: revokeAssignment may not exist in current SDK version
    // Use an alternative method or implement custom logic
    throw new Error('revokeAssignment method not available in current SDK version');
  }

  // ===== Webhook Operations =====

  async listWebhooks(params?: any) {
    return this.client.webhooks.listWebhooks(params);
  }

  async createWebhook(params: any) {
    return this.client.webhooks.createWebhook({ body: params });
  }

  async getWebhook(webhookId: string) {
    return this.client.webhooks.getWebhook({ webhookId });
  }

  async updateWebhook(webhookId: string, params: any) {
    return this.client.webhooks.updateWebhook({
      webhookId,
      body: params
    });
  }

  async deleteWebhook(webhookId: string) {
    return this.client.webhooks.deleteWebhook({ webhookId });
  }

  // ===== Enhanced Status and Configuration =====

  /**
   * Check if client is ready and authenticated with enhanced validation
   */
  isReady(): boolean {
    return this.isAuthenticated && this.enhancedAuth.isAuthenticated();
  }

  /**
   * Get enhanced authentication information
   */
  getAuthInfo(): any {
    return this.enhancedAuth.getAuthInfo();
  }

  /**
   * Enhanced logout with proper cleanup
   */
  logout(): void {
    this.isAuthenticated = false;
    this.webAuthnSigner = undefined;
    this.enhancedAuth.logout();
    
    // Recreate client without authentication
    this.client = new DfnsApiClient({
      appId: this.config.appId,
      baseUrl: this.config.baseUrl,
    });
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<void> {
    await this.enhancedAuth.refreshToken();
    this.client = this.enhancedAuth.getClient();
  }

  /**
   * Get the underlying DFNS API client
   */
  getClient(): DfnsApiClient {
    return this.client;
  }

  /**
   * Get configuration
   */
  getConfig(): DfnsSDKConfig {
    return this.config;
  }
}
