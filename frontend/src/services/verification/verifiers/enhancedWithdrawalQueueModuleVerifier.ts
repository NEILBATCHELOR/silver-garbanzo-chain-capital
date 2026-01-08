/**
 * Enhanced ERC4626 Withdrawal Queue Module Verifier
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import type { IModuleVerifier, VerificationContext, VerificationOptions, VerificationCheck, ModuleDeploymentData } from '../types';
import { VerificationStatus, VerificationType } from '../types';

const ERC4626_WITHDRAWAL_QUEUE_ABI = [
  'function vault() view returns (address)',
  'function getLiquidityBuffer() view returns (uint256)',
  'function getMinWithdrawalAmount() view returns (uint256)',
  'function getMaxWithdrawalAmount() view returns (uint256)',
  'function getPendingCount() view returns (uint256)',
  'function getTotalQueuedShares() view returns (uint256)'
];

export class EnhancedWithdrawalQueueModuleVerifier implements IModuleVerifier {
  moduleType = 'withdrawal_queue';

  async verifyDeployment(module: ModuleDeploymentData, context: VerificationContext, options: VerificationOptions): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    if (!provider) throw new Error('Provider not available');

    try {
      const code = await provider.getCode(module.moduleAddress);
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Withdrawal Queue Module Deployed',
        description: 'Verify module is deployed at expected address',
        status: code !== '0x' ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Deployment Check Failed',
        description: 'Failed to verify module deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }
    return checks;
  }

  async verifyLinkage(module: ModuleDeploymentData, context: VerificationContext, options: VerificationOptions): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const moduleContract = new ethers.Contract(module.moduleAddress, ERC4626_WITHDRAWAL_QUEUE_ABI, provider);

    try {
      const vaultAddress = await moduleContract.vault();
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Module → Vault Link',
        description: 'Verify module.vault points to vault contract',
        status: vaultAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase() ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Linkage Failed',
        description: 'Failed to verify module-vault linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }
    return checks;
  }

  async verifyConfiguration(module: ModuleDeploymentData, context: VerificationContext, options: VerificationOptions): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const moduleContract = new ethers.Contract(module.moduleAddress, ERC4626_WITHDRAWAL_QUEUE_ABI, provider);

    let dbConfig: any = null;
    try {
      const { data } = await supabase.from('token_erc4626_properties').select('withdrawal_queue_config').eq('token_id', context.deployment.tokenId).maybeSingle();
      dbConfig = data?.withdrawal_queue_config;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'DB Query Failed',
        description: 'Failed to retrieve configuration from database',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    let onChainConfig: any = null;
    try {
      const [liquidityBuffer, minAmount, maxAmount, pendingCount, totalQueued] = await Promise.all([
        moduleContract.getLiquidityBuffer(),
        moduleContract.getMinWithdrawalAmount(),
        moduleContract.getMaxWithdrawalAmount(),
        moduleContract.getPendingCount(),
        moduleContract.getTotalQueuedShares()
      ]);

      onChainConfig = { liquidityBuffer: liquidityBuffer.toString(), minWithdrawalAmount: minAmount.toString(), maxWithdrawalAmount: maxAmount.toString(), pendingCount: Number(pendingCount), totalQueuedShares: totalQueued.toString() };
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Queue Status',
        description: 'Withdrawal queue operational status',
        status: VerificationStatus.SUCCESS,
        actual: `Pending: ${onChainConfig.pendingCount}, Queued Shares: ${onChainConfig.totalQueuedShares}`,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'On-Chain Config Failed',
        description: 'Failed to read on-chain withdrawal queue configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    if (dbConfig && onChainConfig) {
      if (dbConfig.liquidityBuffer) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Liquidity Buffer (DB vs On-Chain)',
          description: 'Verify liquidity buffer matches database',
          status: onChainConfig.liquidityBuffer === dbConfig.liquidityBuffer.toString() ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          timestamp: Date.now()
        });
      }
      if (dbConfig.minWithdrawalAmount) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Min Withdrawal (DB vs On-Chain)',
          description: 'Verify minimum withdrawal amount matches database',
          status: onChainConfig.minWithdrawalAmount === dbConfig.minWithdrawalAmount.toString() ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          timestamp: Date.now()
        });
      }
    }

    return checks;
  }
}
