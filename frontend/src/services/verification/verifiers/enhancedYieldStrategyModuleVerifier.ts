/**
 * Enhanced ERC4626 Yield Strategy Module Verifier
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import type { IModuleVerifier, VerificationContext, VerificationOptions, VerificationCheck, ModuleDeploymentData } from '../types';
import { VerificationStatus, VerificationType } from '../types';

const ERC4626_YIELD_STRATEGY_ABI = [
  'function vault() view returns (address)',
  'function getActiveStrategies() view returns (uint256[])',
  'function getTotalYield() view returns (uint256)',
  'function getAPY(uint256 strategyId) view returns (uint256)'
];

export class EnhancedYieldStrategyModuleVerifier implements IModuleVerifier {
  moduleType = 'yield_strategy';

  async verifyDeployment(module: ModuleDeploymentData, context: VerificationContext, options: VerificationOptions): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    if (!provider) throw new Error('Provider not available');

    try {
      const code = await provider.getCode(module.moduleAddress);
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Yield Strategy Module Deployed',
        description: 'Verify module is deployed at expected address',
        status: code !== '0x' ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Deployment Failed',
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
    const moduleContract = new ethers.Contract(module.moduleAddress, ERC4626_YIELD_STRATEGY_ABI, provider);

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
    const moduleContract = new ethers.Contract(module.moduleAddress, ERC4626_YIELD_STRATEGY_ABI, provider);

    try {
      const { data } = await supabase.from('token_erc4626_properties').select('yield_strategy_config').eq('token_id', context.deployment.tokenId).maybeSingle();
      const dbConfig = data?.yield_strategy_config;

      const [strategies, totalYield] = await Promise.all([moduleContract.getActiveStrategies(), moduleContract.getTotalYield()]);
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Active Strategies',
        description: 'Yield strategy status and performance',
        status: VerificationStatus.SUCCESS,
        actual: `${strategies.length} strategies, Total Yield: ${totalYield.toString()}`,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Config Check Failed',
        description: 'Failed to read yield strategy configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}
