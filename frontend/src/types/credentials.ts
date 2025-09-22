/**
 * Project Credentials Types
 * 
 * Types for managing secure credentials and key vault configurations
 */

export interface ProjectCredential {
  id: string;
  name: string;
  service: 'aws_kms' | 'azure_keyvault' | 'google_kms' | 'local';
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface KeyVaultConfig {
  provider: 'aws' | 'azure' | 'google' | 'local';
  region?: string;
  vaultName?: string;
  keyRingName?: string;
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    projectId?: string;
    keyFile?: string;
  };
}
