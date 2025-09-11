import crypto from 'crypto';
import { DfnsCredentialService } from './credentialService';
import { DfnsUserActionSigningService } from './userActionSigningService';
import { Credential as KeyCredential, DfnsError } from '../../types/dfns';

/**
 * DFNS Key Credential Service
 * Handles private key generation and User Action Signing for Service Accounts
 * 
 * This service enables server-side User Action Signing using generated private keys.
 * Suitable for Service Accounts and automated operations.
 */
export class DfnsKeyCredentialService {
  private credentialService: DfnsCredentialService;
  private userActionService: DfnsUserActionSigningService;

  constructor(
    credentialService: DfnsCredentialService,
    userActionService: DfnsUserActionSigningService
  ) {
    this.credentialService = credentialService;
    this.userActionService = userActionService;
  }

  /**
   * Generate a new Ed25519 keypair for DFNS Key Credentials
   */
  public generateEd25519KeyPair(): {
    privateKey: string;
    publicKey: string;
    algorithm: 'Ed25519';
  } {
    const keyPair = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    return {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      algorithm: 'Ed25519'
    };
  }

  /**
   * Generate a new ECDSA P-256 keypair for DFNS Key Credentials
   */
  public generateECDSAKeyPair(): {
    privateKey: string;
    publicKey: string;
    algorithm: 'ECDSA';
  } {
    const keyPair = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1', // P-256
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    return {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      algorithm: 'ECDSA'
    };
  }

  /**
   * Create a Key Credential in DFNS using generated keypair
   */
  public async createKeyCredential(
    credentialName: string,
    algorithm: 'Ed25519' | 'ECDSA' = 'Ed25519'
  ): Promise<{
    credential: any; // Use any for now to avoid type issues with API response
    privateKey: string;
    publicKey: string;
  }> {
    try {
      console.log(`🔐 Creating ${algorithm} Key Credential for DFNS...`);

      // Generate keypair based on algorithm
      const keyPair = algorithm === 'Ed25519' 
        ? this.generateEd25519KeyPair()
        : this.generateECDSAKeyPair();

      // Map algorithm for DFNS API (Ed25519 -> EDDSA)
      const dfnsAlgorithm = algorithm === 'Ed25519' ? 'EDDSA' : algorithm;

      // Create credential in DFNS
      const credential = await this.credentialService.createKeyCredential(
        credentialName,
        keyPair.publicKey,
        dfnsAlgorithm
      );

      console.log('✅ Key Credential created successfully!');
      console.log(`📋 Credential ID: ${credential.id}`);
      console.log(`🔑 Algorithm: ${algorithm}`);
      console.log('⚠️ IMPORTANT: Store private key securely!');

      return {
        credential,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey
      };

    } catch (error) {
      console.error('❌ Failed to create Key Credential:', error);
      throw error;
    }
  }

  /**
   * Sign a User Action using private key
   */
  public async signUserActionWithKey(
    userActionPayload: string,
    httpMethod: 'POST' | 'PUT' | 'DELETE' | 'GET',
    httpPath: string,
    privateKey: string,
    credentialId: string,
    algorithm: 'EDDSA' | 'ECDSA' = 'EDDSA'
  ): Promise<string> {
    try {
      console.log('🔐 Starting User Action Signing with Key Credential...');

      const userActionToken = await this.userActionService.signUserAction({
        userActionPayload,
        userActionHttpMethod: httpMethod,
        userActionHttpPath: httpPath
      }, privateKey, credentialId, algorithm);

      console.log('✅ User Action signed successfully with Key Credential!');
      return userActionToken;

    } catch (error) {
      console.error('❌ Key Credential User Action Signing failed:', error);
      throw error;
    }
  }

  /**
   * Securely store private key (implement based on your security requirements)
   */
  public storePrivateKeySecurely(credentialId: string, privateKey: string): {
    stored: boolean;
    storageMethod: string;
    warning: string;
  } {
    // THIS IS A BASIC EXAMPLE - IMPLEMENT PROPER SECURE STORAGE
    // Options include:
    // 1. Environment variables (for server-side)
    // 2. Hardware Security Modules (HSMs)
    // 3. Key management services (AWS KMS, Azure Key Vault, etc.)
    // 4. Encrypted local storage with user-provided password

    try {
      // Basic localStorage storage (NOT RECOMMENDED FOR PRODUCTION)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`dfns_key_${credentialId}`, privateKey);
        return {
          stored: true,
          storageMethod: 'localStorage',
          warning: 'INSECURE: Using localStorage for demo only. Use HSM/KMS in production!'
        };
      }

      // Server-side: Could store in environment variable or HSM
      process.env[`DFNS_PRIVATE_KEY_${credentialId.toUpperCase()}`] = privateKey;
      return {
        stored: true,
        storageMethod: 'environment',
        warning: 'ENVIRONMENT: Ensure environment variables are secured in production!'
      };

    } catch (error) {
      return {
        stored: false,
        storageMethod: 'none',
        warning: 'FAILED: Could not store private key securely!'
      };
    }
  }

  /**
   * Retrieve securely stored private key
   */
  public retrievePrivateKey(credentialId: string): string | null {
    try {
      // Try localStorage first (browser)
      if (typeof window !== 'undefined') {
        return localStorage.getItem(`dfns_key_${credentialId}`);
      }

      // Try environment variable (server)
      return process.env[`DFNS_PRIVATE_KEY_${credentialId.toUpperCase()}`] || null;

    } catch (error) {
      console.error('Failed to retrieve private key:', error);
      return null;
    }
  }

  /**
   * Test Key Credential signing end-to-end
   */
  public async testKeyCredentialSigning(
    privateKey: string,
    credentialId: string,
    algorithm: 'EDDSA' | 'ECDSA' = 'EDDSA'
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Test payload
      const testPayload = JSON.stringify({ test: 'key-credential-signing' });
      
      const userActionToken = await this.signUserActionWithKey(
        testPayload,
        'POST',
        '/test/key-credential',
        privateKey,
        credentialId,
        algorithm
      );

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
