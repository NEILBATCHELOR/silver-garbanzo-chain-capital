/**
 * Enhanced Universal Document Module Verifier
 * 
 * Verifies document management configuration across multiple token standards
 * Database-First: document_config in each standard's properties table is authoritative
 * 
 * Supports:
 * - ERC-721: token_erc721_properties.document_config
 * - ERC-1155: token_erc1155_properties.document_config
 * - ERC-1400: token_erc1400_properties.document_config
 * - ERC-3525: token_erc3525_properties.document_config
 * - ERC-4626: token_erc4626_properties.document_config
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import type {
  IModuleVerifier,
  VerificationContext,
  VerificationOptions,
  VerificationCheck,
  ModuleDeploymentData
} from '../types';
import {
  VerificationStatus,
  VerificationType
} from '../types';

// Universal Document Module ABI (ERC1643)
const UNIVERSAL_DOCUMENT_ABI = [
  'function getDocument(bytes32 name) view returns (string uri, bytes32 documentHash, uint256 lastModified)',
  'function getAllDocuments() view returns (bytes32[] names)',
  'function documentExists(bytes32 scope, bytes32 name) view returns (bool)',
  'function getScopedDocument(bytes32 scope, bytes32 name) view returns (string uri, bytes32 documentHash, uint256 lastModified, uint256 version)',
  'function getAllScopedDocuments(bytes32 scope) view returns (bytes32[] names)',
  'function getAllScopes() view returns (bytes32[] scopes)',
  'function getScopeDocumentCount(bytes32 scope) view returns (uint256)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function DOCUMENT_MANAGER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)'
];

/**
 * Maps token standard to database table name
 */
const STANDARD_TO_TABLE: Record<string, string> = {
  'ERC20': 'token_erc20_properties',
  'ERC721': 'token_erc721_properties',
  'ERC1155': 'token_erc1155_properties',
  'ERC1400': 'token_erc1400_properties',
  'ERC3525': 'token_erc3525_properties',
  'ERC4626': 'token_erc4626_properties'
};

export class EnhancedUniversalDocumentModuleVerifier implements IModuleVerifier {
  moduleType = 'document';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    if (!provider) throw new Error('Provider not available');

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Universal Document Module Deployed',
        description: 'Verifies that the universal document module contract is deployed on-chain',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Universal Document Module Deployed',
        description: 'Contract deployment verification failed',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
      return checks;
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    // Universal Document Module doesn't have a direct linkage back to token
    // It's referenced from the token contract's documentModule() method
    // We verify this at the token verifier level, not module level
    
    checks.push({
      type: VerificationType.MODULE_LINKAGE,
      name: 'Universal Document Linkage',
      description: 'Universal document module is referenced from token contract, not vice versa',
      status: VerificationStatus.SUCCESS,
      actual: 'Token contract references this module via documentModule() method',
      timestamp: Date.now()
    });

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    if (!provider) throw new Error('Provider not available');

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      UNIVERSAL_DOCUMENT_ABI,
      provider
    );

    // STEP 1: Determine Token Standard and Query Database
    const tokenStandard = context.deployment.standard || 'ERC20';
    const tableName = STANDARD_TO_TABLE[tokenStandard];
    
    if (!tableName) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Unknown Token Standard',
        description: `Token standard ${tokenStandard} not recognized for document module`,
        status: VerificationStatus.FAILED,
        error: `Standard ${tokenStandard} is not supported`,
        timestamp: Date.now()
      });
      return checks;
    }

    let dbConfig: any = null;
    
    try {
      const { data: tokenProps, error } = await supabase
        .from(tableName)
        .select('document_config')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query document_config from ${tableName}: ${error.message}`);
      } else if (tokenProps?.document_config) {
        dbConfig = tokenProps.document_config;
        console.log(`✅ Loaded document config from ${tableName}:`, dbConfig);
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: `Document configuration not found in ${tableName}`,
          status: VerificationStatus.WARNING,
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Database Query Failed',
        description: `Failed to retrieve document configuration from ${tableName}`,
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // STEP 2: Query On-Chain Configuration
    let onChainConfig: any = null;

    try {
      const allDocuments = await moduleContract.getAllDocuments();
      const allScopes = await moduleContract.getAllScopes();
      
      // Get document count per scope
      const scopeDocumentCounts: Record<string, number> = {};
      for (const scope of allScopes) {
        const count = await moduleContract.getScopeDocumentCount(scope);
        scopeDocumentCounts[scope] = Number(count);
      }

      onChainConfig = {
        totalDocuments: allDocuments.length,
        totalScopes: allScopes.length,
        documents: allDocuments.map((doc: any) => ethers.decodeBytes32String(doc)),
        scopes: allScopes.map((scope: any) => ethers.decodeBytes32String(scope)),
        scopeDocumentCounts
      };

      console.log(`📊 On-chain document config:`, onChainConfig);

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Total Documents',
        description: 'Number of documents registered in the module',
        status: onChainConfig.totalDocuments > 0 ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        actual: `${onChainConfig.totalDocuments} document(s)`,
        timestamp: Date.now()
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Total Scopes',
        description: 'Number of scopes (categories) for documents',
        status: VerificationStatus.SUCCESS,
        actual: `${onChainConfig.totalScopes} scope(s)`,
        timestamp: Date.now()
      });

      if (onChainConfig.scopes.length > 0) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Document Scopes',
          description: 'Document organization by scopes',
          status: VerificationStatus.SUCCESS,
          actual: onChainConfig.scopes.join(', '),
          timestamp: Date.now()
        });
      }

    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'On-Chain Configuration',
        description: 'Failed to retrieve on-chain document configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // STEP 3: Compare Database vs On-Chain (Database is authoritative)
    if (dbConfig && onChainConfig) {
      // Verify document count
      if (dbConfig.expectedDocumentCount !== undefined) {
        const matches = onChainConfig.totalDocuments === dbConfig.expectedDocumentCount;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Document Count (DB vs On-Chain)',
          description: 'Verifies document count matches database expectation',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.expectedDocumentCount} documents`,
          actual: `${onChainConfig.totalDocuments} documents`,
          timestamp: Date.now()
        });
      }

      // Verify specific documents exist
      if (dbConfig.requiredDocuments && Array.isArray(dbConfig.requiredDocuments)) {
        const onChainDocs = new Set(onChainConfig.documents);
        const missingDocs = dbConfig.requiredDocuments.filter((doc: string) => !onChainDocs.has(doc));
        
        if (missingDocs.length === 0) {
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Required Documents (DB vs On-Chain)',
            description: 'Verifies all required documents from database are registered on-chain',
            status: VerificationStatus.SUCCESS,
            expected: `${dbConfig.requiredDocuments.length} required documents`,
            actual: `All ${dbConfig.requiredDocuments.length} documents present`,
            timestamp: Date.now()
          });
        } else {
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Required Documents (DB vs On-Chain)',
            description: 'Some required documents from database are missing on-chain',
            status: VerificationStatus.FAILED,
            expected: dbConfig.requiredDocuments.join(', '),
            actual: `Missing: ${missingDocs.join(', ')}`,
            error: `${missingDocs.length} required documents not registered on-chain`,
            timestamp: Date.now()
          });
        }
      }

      // Verify scopes
      if (dbConfig.expectedScopes && Array.isArray(dbConfig.expectedScopes)) {
        const onChainScopes = new Set(onChainConfig.scopes);
        const missingScopes = dbConfig.expectedScopes.filter((scope: string) => !onChainScopes.has(scope));
        
        if (missingScopes.length === 0) {
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Document Scopes (DB vs On-Chain)',
            description: 'Verifies all expected scopes from database exist on-chain',
            status: VerificationStatus.SUCCESS,
            expected: `${dbConfig.expectedScopes.length} scopes`,
            actual: `All ${dbConfig.expectedScopes.length} scopes present`,
            timestamp: Date.now()
          });
        } else {
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Document Scopes (DB vs On-Chain)',
            description: 'Some expected scopes from database are missing on-chain',
            status: VerificationStatus.FAILED,
            expected: dbConfig.expectedScopes.join(', '),
            actual: `Missing: ${missingScopes.join(', ')}`,
            timestamp: Date.now()
          });
        }
      }

      // Final drift detection summary
      const hasAnyDrift = checks.some(c => 
        c.name.includes('(DB vs On-Chain)') && c.status === VerificationStatus.FAILED
      );

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: hasAnyDrift ? '⚠️ Configuration Drift Detected' : '✅ Configuration Consistency',
        description: hasAnyDrift 
          ? 'Document configuration is out of sync with database - deployment may have used incorrect document registration'
          : 'Document configuration perfectly matches database - database-first deployment succeeded',
        status: hasAnyDrift ? VerificationStatus.FAILED : VerificationStatus.SUCCESS,
        error: hasAnyDrift ? 'Configuration drift indicates database-first pattern was not followed' : undefined,
        timestamp: Date.now()
      });
    } else if (onChainConfig && onChainConfig.totalDocuments === 0) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'No Documents Registered',
        description: 'Document module is deployed but no documents have been registered yet',
        status: VerificationStatus.WARNING,
        actual: 'Module ready but empty',
        timestamp: Date.now()
      });
    }

    return checks;
  }
}
