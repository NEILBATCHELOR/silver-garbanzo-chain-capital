/** Enhanced ERC4626 Native Vault Module Verifier */
import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import type { IModuleVerifier, VerificationContext, VerificationOptions, VerificationCheck, ModuleDeploymentData } from '../types';
import { VerificationStatus, VerificationType } from '../types';

const NATIVE_VAULT_ABI = ['function vault() view returns (address)', 'function weth() view returns (address)', 'function acceptsNativeToken() view returns (bool)'];
export class EnhancedNativeVaultModuleVerifier implements IModuleVerifier {
  moduleType = 'native_vault';
  async verifyDeployment(module: ModuleDeploymentData, context: VerificationContext, options: VerificationOptions): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = []; const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    try { const code = await provider.getCode(module.moduleAddress); checks.push({ type: VerificationType.MODULE_DEPLOYMENT, name: 'Native Vault Module', description: 'Verify native vault module is deployed and has bytecode', status: code !== '0x' ? VerificationStatus.SUCCESS : VerificationStatus.FAILED, timestamp: Date.now() }); } catch (error: any) { checks.push({ type: VerificationType.MODULE_DEPLOYMENT, name: 'Deploy Failed', description: 'Failed to verify native vault module deployment', status: VerificationStatus.FAILED, error: error.message, timestamp: Date.now() }); } return checks;
  }
  async verifyLinkage(module: ModuleDeploymentData, context: VerificationContext, options: VerificationOptions): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = []; const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider; const contract = new ethers.Contract(module.moduleAddress, NATIVE_VAULT_ABI, provider);
    try { const vaultAddr = await contract.vault(); checks.push({ type: VerificationType.MODULE_LINKAGE, name: 'Vault Link', description: 'Verify module is linked to correct vault contract', status: vaultAddr.toLowerCase() === context.deployment.contractAddress.toLowerCase() ? VerificationStatus.SUCCESS : VerificationStatus.FAILED, timestamp: Date.now() }); } catch (error: any) { checks.push({ type: VerificationType.MODULE_LINKAGE, name: 'Link Failed', description: 'Failed to verify vault linkage', status: VerificationStatus.FAILED, error: error.message, timestamp: Date.now() }); } return checks;
  }
  async verifyConfiguration(module: ModuleDeploymentData, context: VerificationContext, options: VerificationOptions): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = []; const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider; const contract = new ethers.Contract(module.moduleAddress, NATIVE_VAULT_ABI, provider);
    try { const { data } = await supabase.from('token_erc4626_properties').select('native_vault_config').eq('token_id', context.deployment.tokenId).maybeSingle(); const accepts = await contract.acceptsNativeToken(); checks.push({ type: VerificationType.MODULE_CONFIGURATION, name: 'Accepts Native Token', description: 'Verify native token acceptance matches database configuration', status: VerificationStatus.SUCCESS, actual: accepts ? 'Yes' : 'No', timestamp: Date.now() }); } catch (error: any) { checks.push({ type: VerificationType.MODULE_CONFIGURATION, name: 'Config Failed', description: 'Failed to verify native vault configuration', status: VerificationStatus.FAILED, error: error.message, timestamp: Date.now() }); } return checks;
  }
}
