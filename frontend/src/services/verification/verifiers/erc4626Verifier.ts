/**
 * ERC4626 Token Verifier
 * 
 * Handles verification of ERC4626 tokenized vaults including:
 * - ERC4626 standard compliance (shares, assets)
 * - Vault configuration (asset, shares, conversion rates)
 * - Module verification (fees, withdrawal queue, yield strategy, etc.)
 * - Advanced standards: ERC7540 (async), ERC7535 (native), ERC7575 (multi-asset)
 * - Router verification
 */

import { ethers } from 'ethers';
import { TokenStandard } from '@/types/core/centralModels';
import {
  ITokenStandardVerifier,
  IModuleVerifier,
  VerificationContext,
  VerificationOptions,
  VerificationCheck,
  ModuleVerificationResult,
  VerificationStatus,
  VerificationType,
  ModuleDeploymentData
} from '../types';

// ERC4626 ABI (tokenized vault standard)
const ERC4626_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function asset() view returns (address)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function convertToShares(uint256 assets) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function maxDeposit(address) view returns (uint256)',
  'function maxMint(address) view returns (uint256)',
  'function maxWithdraw(address owner) view returns (uint256)',
  'function maxRedeem(address owner) view returns (uint256)',
  'function previewDeposit(uint256 assets) view returns (uint256)',
  'function previewMint(uint256 shares) view returns (uint256)',
  'function previewWithdraw(uint256 assets) view returns (uint256)',
  'function previewRedeem(uint256 shares) view returns (uint256)',
  // Module linkages
  'function feeStrategyModule() view returns (address)',
  'function withdrawalQueueModule() view returns (address)',
  'function yieldStrategyModule() view returns (address)',
  'function asyncVaultModule() view returns (address)',
  'function nativeVaultModule() view returns (address)',
  'function multiAssetVaultModule() view returns (address)'
];

// Fee Strategy Module ABI
const FEE_STRATEGY_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function performanceFee() view returns (uint256)',
  'function managementFee() view returns (uint256)',
  'function entryFee() view returns (uint256)',
  'function exitFee() view returns (uint256)',
  'function feeRecipient() view returns (address)',
  'function getFeeConfig() view returns (tuple(uint256 performanceFee, uint256 managementFee, uint256 entryFee, uint256 exitFee, address feeRecipient, bool enabled))'
];

// Withdrawal Queue Module ABI
const WITHDRAWAL_QUEUE_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function getQueueLength() view returns (uint256)',
  'function getWithdrawalRequest(uint256 requestId) view returns (tuple(address owner, uint256 shares, uint256 timestamp, bool claimed))',
  'function totalQueuedWithdrawals() view returns (uint256)'
];

// Yield Strategy Module ABI
const YIELD_STRATEGY_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function strategy() view returns (address)',
  'function totalInvested() view returns (uint256)',
  'function lastHarvestTimestamp() view returns (uint256)',
  'function autoCompoundEnabled() view returns (bool)'
];

// ERC7540 Async Vault Module ABI
const ASYNC_VAULT_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function requestDeposit(uint256 assets, address receiver, address owner) returns (uint256)',
  'function requestRedeem(uint256 shares, address receiver, address owner) returns (uint256)',
  'function pendingDepositRequest(uint256 requestId, address controller) view returns (uint256 assets)',
  'function pendingRedeemRequest(uint256 requestId, address controller) view returns (uint256 shares)',
  'function claimableDepositRequest(uint256 requestId, address controller) view returns (uint256 shares)',
  'function claimableRedeemRequest(uint256 requestId, address controller) view returns (uint256 assets)'
];

// ERC7535 Native Vault Module ABI
const NATIVE_VAULT_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function depositNative(address receiver) payable returns (uint256 shares)',
  'function withdrawNative(uint256 assets, address receiver, address owner) returns (uint256 shares)',
  'function nativeAsset() view returns (address)'
];

// ERC7575 Multi-Asset Vault Module ABI
const MULTI_ASSET_VAULT_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function assets() view returns (address[])',
  'function targetWeights() view returns (uint256[])',
  'function currentWeights() view returns (uint256[])',
  'function rebalanceThreshold() view returns (uint256)',
  'function lastRebalanceTimestamp() view returns (uint256)'
];

// Router Module ABI
const ROUTER_MODULE_ABI = [
  'function enabled() view returns (bool)',
  'function batchDeposit(address[] vaults, uint256[] amounts) returns (uint256[] shares)',
  'function batchWithdraw(address[] vaults, uint256[] amounts) returns (uint256[] assets)',
  'function supportedVaults() view returns (address[])'
];

/**
 * Fee Strategy Module Verifier
 */
class ERC4626FeeStrategyModuleVerifier implements IModuleVerifier {
  moduleType = 'feeStrategy';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Fee Strategy Module Deployed',
        description: 'Verify fee strategy module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Fee Strategy Module Deployed',
        description: 'Failed to check module deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC4626_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      FEE_STRATEGY_MODULE_ABI,
      provider
    );

    // Check Vault → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.feeStrategyModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault → Fee Strategy Link',
        description: 'Verify vault points to fee strategy module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault → Fee Strategy Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check Module → Vault linkage
    try {
      const linkedTokenAddress = await moduleContract.tokenContract();
      const matches = linkedTokenAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Fee Strategy → Vault Link',
        description: 'Verify module points back to vault',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Fee Strategy → Vault Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const moduleContract = new ethers.Contract(module.moduleAddress, FEE_STRATEGY_MODULE_ABI, provider);

    // Check fee configuration
    try {
      const feeConfig = await moduleContract.getFeeConfig();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Fee Configuration',
        description: 'Verify fee settings',
        status: VerificationStatus.SUCCESS,
        actual: {
          performanceFee: feeConfig.performanceFee.toString(),
          managementFee: feeConfig.managementFee.toString(),
          entryFee: feeConfig.entryFee.toString(),
          exitFee: feeConfig.exitFee.toString(),
          feeRecipient: feeConfig.feeRecipient,
          enabled: feeConfig.enabled
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Fee Configuration',
        description: 'Failed to check fee configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

/**
 * Withdrawal Queue Module Verifier
 */
class ERC4626WithdrawalQueueModuleVerifier implements IModuleVerifier {
  moduleType = 'withdrawalQueue';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Withdrawal Queue Module Deployed',
        description: 'Verify withdrawal queue module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Withdrawal Queue Module Deployed',
        description: 'Failed to check module deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC4626_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      WITHDRAWAL_QUEUE_MODULE_ABI,
      provider
    );

    // Check Vault → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.withdrawalQueueModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault → Withdrawal Queue Link',
        description: 'Verify vault points to withdrawal queue module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault → Withdrawal Queue Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check Module → Vault linkage
    try {
      const linkedTokenAddress = await moduleContract.tokenContract();
      const matches = linkedTokenAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Withdrawal Queue → Vault Link',
        description: 'Verify module points back to vault',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Withdrawal Queue → Vault Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const moduleContract = new ethers.Contract(module.moduleAddress, WITHDRAWAL_QUEUE_MODULE_ABI, provider);

    // Check queue status
    try {
      const queueLength = await moduleContract.getQueueLength();
      const totalQueued = await moduleContract.totalQueuedWithdrawals();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Withdrawal Queue Status',
        description: 'Verify queue state',
        status: VerificationStatus.SUCCESS,
        actual: {
          queueLength: queueLength.toString(),
          totalQueued: totalQueued.toString()
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Withdrawal Queue Status',
        description: 'Failed to check queue status',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}
/**
 * Yield Strategy Module Verifier
 */
class ERC4626YieldStrategyModuleVerifier implements IModuleVerifier {
  moduleType = 'yieldStrategy';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Yield Strategy Module Deployed',
        description: 'Verify yield strategy module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Yield Strategy Module Deployed',
        description: 'Failed to check module deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC4626_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      YIELD_STRATEGY_MODULE_ABI,
      provider
    );

    // Check Vault → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.yieldStrategyModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault → Yield Strategy Link',
        description: 'Verify vault points to yield strategy module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault → Yield Strategy Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check Module → Vault linkage
    try {
      const linkedTokenAddress = await moduleContract.tokenContract();
      const matches = linkedTokenAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Yield Strategy → Vault Link',
        description: 'Verify module points back to vault',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Yield Strategy → Vault Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const moduleContract = new ethers.Contract(module.moduleAddress, YIELD_STRATEGY_MODULE_ABI, provider);

    // Check strategy configuration
    try {
      const strategy = await moduleContract.strategy();
      const totalInvested = await moduleContract.totalInvested();
      const lastHarvest = await moduleContract.lastHarvestTimestamp();
      const autoCompound = await moduleContract.autoCompoundEnabled();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Yield Strategy Configuration',
        description: 'Verify yield strategy settings',
        status: VerificationStatus.SUCCESS,
        actual: {
          strategy,
          totalInvested: totalInvested.toString(),
          lastHarvest: lastHarvest.toString(),
          autoCompound
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Yield Strategy Configuration',
        description: 'Failed to check strategy configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

/**
 * ERC7540 Async Vault Module Verifier
 */
class ERC7540AsyncVaultModuleVerifier implements IModuleVerifier {
  moduleType = 'asyncVault';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Async Vault Module Deployed',
        description: 'Verify ERC7540 async vault module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Async Vault Module Deployed',
        description: 'Failed to check module deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC4626_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      ASYNC_VAULT_MODULE_ABI,
      provider
    );

    // Check Vault → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.asyncVaultModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault → Async Module Link',
        description: 'Verify vault points to async vault module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault → Async Module Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check Module → Vault linkage
    try {
      const linkedTokenAddress = await moduleContract.tokenContract();
      const matches = linkedTokenAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Async Module → Vault Link',
        description: 'Verify module points back to vault',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Async Module → Vault Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const moduleContract = new ethers.Contract(module.moduleAddress, ASYNC_VAULT_MODULE_ABI, provider);

    // Check enabled status
    try {
      const isEnabled = await moduleContract.enabled();
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Async Vault Enabled',
        description: 'Verify async vault module is active',
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: isEnabled,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Async Vault Enabled',
        description: 'Failed to check enabled status',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

/**
 * ERC7535 Native Vault Module Verifier
 */
class ERC7535NativeVaultModuleVerifier implements IModuleVerifier {
  moduleType = 'nativeVault';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Native Vault Module Deployed',
        description: 'Verify ERC7535 native vault module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Native Vault Module Deployed',
        description: 'Failed to check module deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC4626_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      NATIVE_VAULT_MODULE_ABI,
      provider
    );

    // Check Vault → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.nativeVaultModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault → Native Module Link',
        description: 'Verify vault points to native vault module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault → Native Module Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check Module → Vault linkage
    try {
      const linkedTokenAddress = await moduleContract.tokenContract();
      const matches = linkedTokenAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Native Module → Vault Link',
        description: 'Verify module points back to vault',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Native Module → Vault Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const moduleContract = new ethers.Contract(module.moduleAddress, NATIVE_VAULT_MODULE_ABI, provider);

    // Check native asset configuration
    try {
      const nativeAsset = await moduleContract.nativeAsset();
      const isEnabled = await moduleContract.enabled();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Native Vault Configuration',
        description: 'Verify native vault settings',
        status: VerificationStatus.SUCCESS,
        actual: {
          nativeAsset,
          enabled: isEnabled
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Native Vault Configuration',
        description: 'Failed to check native vault configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

/**
 * ERC7575 Multi-Asset Vault Module Verifier
 */
class ERC7575MultiAssetVaultModuleVerifier implements IModuleVerifier {
  moduleType = 'multiAssetVault';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Multi-Asset Vault Module Deployed',
        description: 'Verify ERC7575 multi-asset vault module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Multi-Asset Vault Module Deployed',
        description: 'Failed to check module deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC4626_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      MULTI_ASSET_VAULT_MODULE_ABI,
      provider
    );

    // Check Vault → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.multiAssetVaultModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault → Multi-Asset Module Link',
        description: 'Verify vault points to multi-asset vault module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault → Multi-Asset Module Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check Module → Vault linkage
    try {
      const linkedTokenAddress = await moduleContract.tokenContract();
      const matches = linkedTokenAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Multi-Asset Module → Vault Link',
        description: 'Verify module points back to vault',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Multi-Asset Module → Vault Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const moduleContract = new ethers.Contract(module.moduleAddress, MULTI_ASSET_VAULT_MODULE_ABI, provider);

    // Check multi-asset configuration
    try {
      const assets = await moduleContract.assets();
      const targetWeights = await moduleContract.targetWeights();
      const currentWeights = await moduleContract.currentWeights();
      const rebalanceThreshold = await moduleContract.rebalanceThreshold();
      const lastRebalance = await moduleContract.lastRebalanceTimestamp();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Multi-Asset Vault Configuration',
        description: 'Verify multi-asset vault settings',
        status: VerificationStatus.SUCCESS,
        actual: {
          assets,
          targetWeights: targetWeights.map((w: any) => w.toString()),
          currentWeights: currentWeights.map((w: any) => w.toString()),
          rebalanceThreshold: rebalanceThreshold.toString(),
          lastRebalance: lastRebalance.toString()
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Multi-Asset Vault Configuration',
        description: 'Failed to check multi-asset configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

/**
 * Router Module Verifier
 */
class ERC4626RouterModuleVerifier implements IModuleVerifier {
  moduleType = 'router';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Router Module Deployed',
        description: 'Verify router module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Router Module Deployed',
        description: 'Failed to check module deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const moduleContract = new ethers.Contract(module.moduleAddress, ROUTER_MODULE_ABI, provider);

    // Check if current vault is supported
    try {
      const supportedVaults = await moduleContract.supportedVaults();
      const isSupported = supportedVaults.some((v: string) => 
        v.toLowerCase() === context.deployment.contractAddress.toLowerCase()
      );

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault Supported by Router',
        description: 'Verify vault is registered in router',
        status: isSupported ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: 'Vault registered',
        actual: isSupported ? 'Registered' : 'Not registered',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vault Supported by Router',
        description: 'Failed to check router registration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const moduleContract = new ethers.Contract(module.moduleAddress, ROUTER_MODULE_ABI, provider);

    // Check router status
    try {
      const isEnabled = await moduleContract.enabled();
      const supportedVaults = await moduleContract.supportedVaults();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Router Configuration',
        description: 'Verify router settings',
        status: VerificationStatus.SUCCESS,
        actual: {
          enabled: isEnabled,
          supportedVaultsCount: supportedVaults.length
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Router Configuration',
        description: 'Failed to check router configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

/**
 * Main ERC4626 Vault Verifier
 */
export class ERC4626Verifier implements ITokenStandardVerifier {
  standard = TokenStandard.ERC4626;
  private moduleVerifiers: Map<string, IModuleVerifier>;

  constructor() {
    this.moduleVerifiers = new Map();
    
    // Register all ERC4626 module verifiers
    this.moduleVerifiers.set('feeStrategy', new ERC4626FeeStrategyModuleVerifier());
    this.moduleVerifiers.set('withdrawalQueue', new ERC4626WithdrawalQueueModuleVerifier());
    this.moduleVerifiers.set('yieldStrategy', new ERC4626YieldStrategyModuleVerifier());
    this.moduleVerifiers.set('asyncVault', new ERC7540AsyncVaultModuleVerifier());
    this.moduleVerifiers.set('nativeVault', new ERC7535NativeVaultModuleVerifier());
    this.moduleVerifiers.set('multiAssetVault', new ERC7575MultiAssetVaultModuleVerifier());
    this.moduleVerifiers.set('router', new ERC4626RouterModuleVerifier());
  }

  /**
   * Verify ERC4626 vault deployment and configuration
   */
  async verifyToken(
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    if (!provider) {
      throw new Error('Provider not available');
    }

    const vaultContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC4626_ABI,
      provider
    );

    // Check 1: Contract exists
    try {
      const code = await provider.getCode(context.deployment.contractAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.TOKEN_DEPLOYMENT,
        name: 'Vault Contract Deployed',
        description: 'Verify vault bytecode exists on-chain',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract bytecode exists',
        actual: exists ? 'Contract deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) {
        return checks;
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_DEPLOYMENT,
        name: 'Vault Contract Deployed',
        description: 'Failed to check deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
      return checks;
    }

    // Check 2: Vault name
    try {
      const name = await vaultContract.name();
      const expected = context.expectedConfiguration?.name;

      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Vault Name',
        description: 'Verify vault name matches configuration',
        status: !expected || name === expected ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected,
        actual: name,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Vault Name',
        description: 'Failed to read vault name',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check 3: Vault symbol
    try {
      const symbol = await vaultContract.symbol();
      const expected = context.expectedConfiguration?.symbol;

      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Vault Symbol',
        description: 'Verify vault symbol matches configuration',
        status: !expected || symbol === expected ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected,
        actual: symbol,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Vault Symbol',
        description: 'Failed to read vault symbol',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check 4: Asset address
    try {
      const asset = await vaultContract.asset();

      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Vault Asset',
        description: 'Verify vault underlying asset',
        status: VerificationStatus.SUCCESS,
        actual: asset,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Vault Asset',
        description: 'Failed to read vault asset',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check 5: Total assets
    try {
      const totalAssets = await vaultContract.totalAssets();

      checks.push({
        type: VerificationType.TOKEN_STATE,
        name: 'Total Assets',
        description: 'Verify vault total assets',
        status: VerificationStatus.SUCCESS,
        actual: ethers.formatUnits(totalAssets, 18),
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_STATE,
        name: 'Total Assets',
        description: 'Failed to read total assets',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  /**
   * Verify vault modules
   */
  async verifyModules(
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<ModuleVerificationResult[]> {
    const results: ModuleVerificationResult[] = [];

    for (const module of context.modules) {
      const verifier = this.moduleVerifiers.get(module.moduleType);

      if (!verifier) {
        results.push({
          moduleType: module.moduleType,
          moduleAddress: module.moduleAddress,
          deploymentVerified: false,
          linkageVerified: false,
          configurationVerified: false,
          checks: [{
            type: VerificationType.MODULE_DEPLOYMENT,
            name: 'Module Verifier',
            description: `No verifier available for module type: ${module.moduleType}`,
            status: VerificationStatus.SKIPPED,
            timestamp: Date.now()
          }],
          issues: [`No verifier for ${module.moduleType}`],
          warnings: []
        });
        continue;
      }

      const deploymentChecks = await verifier.verifyDeployment(module, context, options);
      const linkageChecks = await verifier.verifyLinkage(module, context, options);
      const configChecks = await verifier.verifyConfiguration(module, context, options);

      const allChecks = [...deploymentChecks, ...linkageChecks, ...configChecks];
      const deploymentVerified = deploymentChecks.every(c => c.status === VerificationStatus.SUCCESS);
      const linkageVerified = linkageChecks.every(c => c.status === VerificationStatus.SUCCESS);
      const configurationVerified = configChecks.every(c => 
        c.status === VerificationStatus.SUCCESS || c.status === VerificationStatus.WARNING
      );

      const issues = allChecks
        .filter(c => c.status === VerificationStatus.FAILED)
        .map(c => c.error || c.description);

      const warnings = allChecks
        .filter(c => c.status === VerificationStatus.WARNING)
        .map(c => c.description);

      results.push({
        moduleType: module.moduleType,
        moduleAddress: module.moduleAddress,
        deploymentVerified,
        linkageVerified,
        configurationVerified,
        checks: allChecks,
        issues,
        warnings
      });
    }

    return results;
  }
}
