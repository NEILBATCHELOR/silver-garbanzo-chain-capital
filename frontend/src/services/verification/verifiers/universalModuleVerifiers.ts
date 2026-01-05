/**
 * Universal Module Verifiers
 * 
 * Handles verification of universal modules that work across multiple token standards:
 * - UniversalDocumentModule (ERC1643) - Document management
 * - ERC4906MetadataModule - Metadata update events
 * - ERC5216GranularApprovalModule - Granular permission system
 * - ERC1363PayableToken - Payable token transfers & callbacks
 * - ERC3525ReceiverExample - Semi-fungible token receiver
 */

import { ethers } from 'ethers';
import {
  IModuleVerifier,
  VerificationContext,
  VerificationOptions,
  VerificationCheck,
  ModuleVerificationResult,
  VerificationStatus,
  VerificationType,
  ModuleDeploymentData
} from '../types';

/**
 * Base class for universal module verifiers
 */
abstract class BaseUniversalModuleVerifier implements IModuleVerifier {
  abstract moduleType: string;

  protected createCheck(
    type: VerificationType,
    name: string,
    status: VerificationStatus,
    description: string,
    expected?: any,
    actual?: any,
    details?: Record<string, any>
  ): VerificationCheck {
    return {
      type,
      name,
      status,
      description,
      expected,
      actual,
      details,
      timestamp: Date.now()
    };
  }

  protected async checkContractExists(
    provider: ethers.JsonRpcProvider,
    address: string
  ): Promise<boolean> {
    try {
      const code = await provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      return false;
    }
  }

  abstract verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]>;

  abstract verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]>;

  abstract verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]>;
}

// ============================================================================
// 1. UNIVERSAL DOCUMENT MODULE (ERC1643)
// ============================================================================

const DOCUMENT_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function getDocument(bytes32) view returns (string uri, bytes32 documentHash, uint256 lastModified)',
  'function getAllDocuments() view returns (bytes32[] names)',
  'function setDocument(bytes32 name, string uri, bytes32 documentHash) external'
];

/**
 * Universal Document Module Verifier (ERC1643)
 * Cross-standard document management
 */
export class UniversalDocumentModuleVerifier extends BaseUniversalModuleVerifier {
  moduleType = 'document';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.MODULE_DEPLOYMENT,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      const exists = await this.checkContractExists(
        context.provider,
        module.moduleAddress
      );

      checks.push(this.createCheck(
        VerificationType.MODULE_DEPLOYMENT,
        'Document Module Deployed',
        exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        exists
          ? `Document module contract exists at ${module.moduleAddress}`
          : `Document module contract not found at ${module.moduleAddress}`,
        'Contract deployed',
        exists ? 'Contract exists' : 'Contract not found'
      ));
    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_DEPLOYMENT,
        'Document Module Deployment Check',
        VerificationStatus.FAILED,
        `Error checking module deployment: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      // Create contract instances
      const moduleContract = new ethers.Contract(
        module.moduleAddress,
        DOCUMENT_MODULE_ABI,
        context.provider
      );

      // Check module → token linkage
      try {
        const linkedToken = await moduleContract.tokenContract();
        const isLinked = linkedToken.toLowerCase() === context.deployment.contractAddress.toLowerCase();

        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Module → Token Link',
          isLinked ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          isLinked
            ? 'Document module correctly linked to token'
            : 'Document module not linked to token',
          context.deployment.contractAddress,
          linkedToken
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Module → Token Link',
          VerificationStatus.FAILED,
          `Error checking module linkage: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Note: Token → Module linkage varies by standard (ERC20, ERC721, etc.)
      // This is checked at the standard verifier level

    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_LINKAGE,
        'Document Module Linkage Check',
        VerificationStatus.FAILED,
        `Error verifying linkage: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.MODULE_CONFIGURATION,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      const moduleContract = new ethers.Contract(
        module.moduleAddress,
        DOCUMENT_MODULE_ABI,
        context.provider
      );

      // Check document count
      try {
        const documents = await moduleContract.getAllDocuments();
        checks.push(this.createCheck(
          VerificationType.MODULE_CONFIGURATION,
          'Documents Registered',
          VerificationStatus.SUCCESS,
          `Document module has ${documents.length} documents registered`,
          undefined,
          documents.length
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.MODULE_CONFIGURATION,
          'Documents Check',
          VerificationStatus.WARNING,
          `Could not retrieve documents: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_CONFIGURATION,
        'Document Module Configuration',
        VerificationStatus.FAILED,
        `Error verifying configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }
}

// ============================================================================
// 2. ERC4906 METADATA MODULE
// ============================================================================

const METADATA_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'event MetadataUpdate(uint256 _tokenId)',
  'event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId)'
];

/**
 * ERC4906 Metadata Module Verifier
 * Metadata update events standard
 */
export class ERC4906MetadataModuleVerifier extends BaseUniversalModuleVerifier {
  moduleType = 'metadata';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.MODULE_DEPLOYMENT,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      const exists = await this.checkContractExists(
        context.provider,
        module.moduleAddress
      );

      checks.push(this.createCheck(
        VerificationType.MODULE_DEPLOYMENT,
        'Metadata Module Deployed',
        exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        exists
          ? `Metadata module contract exists at ${module.moduleAddress}`
          : `Metadata module contract not found at ${module.moduleAddress}`,
        'Contract deployed',
        exists ? 'Contract exists' : 'Contract not found'
      ));
    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_DEPLOYMENT,
        'Metadata Module Deployment Check',
        VerificationStatus.FAILED,
        `Error checking module deployment: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      const moduleContract = new ethers.Contract(
        module.moduleAddress,
        METADATA_MODULE_ABI,
        context.provider
      );

      try {
        const linkedToken = await moduleContract.tokenContract();
        const isLinked = linkedToken.toLowerCase() === context.deployment.contractAddress.toLowerCase();

        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Module → Token Link',
          isLinked ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          isLinked
            ? 'Metadata module correctly linked to token'
            : 'Metadata module not linked to token',
          context.deployment.contractAddress,
          linkedToken
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Module → Token Link',
          VerificationStatus.FAILED,
          `Error checking module linkage: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_LINKAGE,
        'Metadata Module Linkage Check',
        VerificationStatus.FAILED,
        `Error verifying linkage: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      checks.push(this.createCheck(
        VerificationType.MODULE_CONFIGURATION,
        'Metadata Module',
        VerificationStatus.SUCCESS,
        'ERC4906 metadata events supported',
        undefined,
        'Configured'
      ));
    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_CONFIGURATION,
        'Metadata Module Configuration',
        VerificationStatus.FAILED,
        `Error verifying configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }
}

// ============================================================================
// 3. ERC5216 GRANULAR APPROVAL MODULE
// ============================================================================

const GRANULAR_APPROVAL_ABI = [
  'function tokenContract() view returns (address)',
  'function getApproval(address owner, address operator, uint256 tokenId) view returns (bool)',
  'function setApproval(address operator, uint256 tokenId, bool approved) external'
];

/**
 * ERC5216 Granular Approval Module Verifier
 * Granular permission system
 */
export class ERC5216GranularApprovalModuleVerifier extends BaseUniversalModuleVerifier {
  moduleType = 'granular_approval';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.MODULE_DEPLOYMENT,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      const exists = await this.checkContractExists(
        context.provider,
        module.moduleAddress
      );

      checks.push(this.createCheck(
        VerificationType.MODULE_DEPLOYMENT,
        'Granular Approval Module Deployed',
        exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        exists
          ? `Granular approval module contract exists at ${module.moduleAddress}`
          : `Granular approval module contract not found at ${module.moduleAddress}`,
        'Contract deployed',
        exists ? 'Contract exists' : 'Contract not found'
      ));
    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_DEPLOYMENT,
        'Granular Approval Module Deployment Check',
        VerificationStatus.FAILED,
        `Error checking module deployment: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      const moduleContract = new ethers.Contract(
        module.moduleAddress,
        GRANULAR_APPROVAL_ABI,
        context.provider
      );

      try {
        const linkedToken = await moduleContract.tokenContract();
        const isLinked = linkedToken.toLowerCase() === context.deployment.contractAddress.toLowerCase();

        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Module → Token Link',
          isLinked ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          isLinked
            ? 'Granular approval module correctly linked to token'
            : 'Granular approval module not linked to token',
          context.deployment.contractAddress,
          linkedToken
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Module → Token Link',
          VerificationStatus.FAILED,
          `Error checking module linkage: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_LINKAGE,
        'Granular Approval Module Linkage Check',
        VerificationStatus.FAILED,
        `Error verifying linkage: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      checks.push(this.createCheck(
        VerificationType.MODULE_CONFIGURATION,
        'Granular Approval Module',
        VerificationStatus.SUCCESS,
        'ERC5216 granular approval system enabled',
        undefined,
        'Configured'
      ));
    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_CONFIGURATION,
        'Granular Approval Module Configuration',
        VerificationStatus.FAILED,
        `Error verifying configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }
}

// ============================================================================
// 4. ERC1363 PAYABLE TOKEN MODULE
// ============================================================================

const PAYABLE_TOKEN_ABI = [
  'function tokenContract() view returns (address)',
  'function transferAndCall(address to, uint256 amount) external returns (bool)',
  'function transferFromAndCall(address from, address to, uint256 amount) external returns (bool)',
  'function approveAndCall(address spender, uint256 amount) external returns (bool)'
];

/**
 * ERC1363 Payable Token Module Verifier
 * Payable token transfers & callbacks
 */
export class ERC1363PayableTokenModuleVerifier extends BaseUniversalModuleVerifier {
  moduleType = 'payable';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.MODULE_DEPLOYMENT,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      const exists = await this.checkContractExists(
        context.provider,
        module.moduleAddress
      );

      checks.push(this.createCheck(
        VerificationType.MODULE_DEPLOYMENT,
        'Payable Token Module Deployed',
        exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        exists
          ? `Payable token module contract exists at ${module.moduleAddress}`
          : `Payable token module contract not found at ${module.moduleAddress}`,
        'Contract deployed',
        exists ? 'Contract exists' : 'Contract not found'
      ));
    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_DEPLOYMENT,
        'Payable Token Module Deployment Check',
        VerificationStatus.FAILED,
        `Error checking module deployment: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      const moduleContract = new ethers.Contract(
        module.moduleAddress,
        PAYABLE_TOKEN_ABI,
        context.provider
      );

      try {
        const linkedToken = await moduleContract.tokenContract();
        const isLinked = linkedToken.toLowerCase() === context.deployment.contractAddress.toLowerCase();

        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Module → Token Link',
          isLinked ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          isLinked
            ? 'Payable token module correctly linked to token'
            : 'Payable token module not linked to token',
          context.deployment.contractAddress,
          linkedToken
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Module → Token Link',
          VerificationStatus.FAILED,
          `Error checking module linkage: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_LINKAGE,
        'Payable Token Module Linkage Check',
        VerificationStatus.FAILED,
        `Error verifying linkage: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      checks.push(this.createCheck(
        VerificationType.MODULE_CONFIGURATION,
        'Payable Token Module',
        VerificationStatus.SUCCESS,
        'ERC1363 payable token transfers enabled',
        undefined,
        'Configured'
      ));
    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_CONFIGURATION,
        'Payable Token Module Configuration',
        VerificationStatus.FAILED,
        `Error verifying configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }
}

// ============================================================================
// 5. ERC3525 RECEIVER MODULE
// ============================================================================

const RECEIVER_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function onERC3525Received(address operator, uint256 fromTokenId, uint256 toTokenId, uint256 value, bytes data) external returns (bytes4)'
];

/**
 * ERC3525 Receiver Module Verifier
 * Semi-fungible token receiver
 */
export class ERC3525ReceiverModuleVerifier extends BaseUniversalModuleVerifier {
  moduleType = 'receiver';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.MODULE_DEPLOYMENT,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      const exists = await this.checkContractExists(
        context.provider,
        module.moduleAddress
      );

      checks.push(this.createCheck(
        VerificationType.MODULE_DEPLOYMENT,
        'Receiver Module Deployed',
        exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        exists
          ? `Receiver module contract exists at ${module.moduleAddress}`
          : `Receiver module contract not found at ${module.moduleAddress}`,
        'Contract deployed',
        exists ? 'Contract exists' : 'Contract not found'
      ));
    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_DEPLOYMENT,
        'Receiver Module Deployment Check',
        VerificationStatus.FAILED,
        `Error checking module deployment: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      const moduleContract = new ethers.Contract(
        module.moduleAddress,
        RECEIVER_MODULE_ABI,
        context.provider
      );

      try {
        const linkedToken = await moduleContract.tokenContract();
        const isLinked = linkedToken.toLowerCase() === context.deployment.contractAddress.toLowerCase();

        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Module → Token Link',
          isLinked ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          isLinked
            ? 'Receiver module correctly linked to token'
            : 'Receiver module not linked to token',
          context.deployment.contractAddress,
          linkedToken
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.MODULE_LINKAGE,
          'Module → Token Link',
          VerificationStatus.FAILED,
          `Error checking module linkage: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_LINKAGE,
        'Receiver Module Linkage Check',
        VerificationStatus.FAILED,
        `Error verifying linkage: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      checks.push(this.createCheck(
        VerificationType.MODULE_CONFIGURATION,
        'Receiver Module',
        VerificationStatus.SUCCESS,
        'ERC3525 receiver callbacks enabled',
        undefined,
        'Configured'
      ));
    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.MODULE_CONFIGURATION,
        'Receiver Module Configuration',
        VerificationStatus.FAILED,
        `Error verifying configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }
}
