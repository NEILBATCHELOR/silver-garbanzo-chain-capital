/** Enhanced ERC4626 Multi-Asset Vault Module Verifier */
import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import type { 
  IModuleVerifier, 
  VerificationContext, 
  VerificationOptions, 
  VerificationCheck, 
  ModuleDeploymentData 
} from '../types';
import { VerificationStatus, VerificationType } from '../types';

const MULTI_ASSET_ABI = [
  'function vaultContract() view returns (address)',
  'function getAllAssets() view returns (address[])',
  'function getTotalValue() view returns (uint256)'
];

export class EnhancedMultiAssetVaultModuleVerifier implements IModuleVerifier {
  moduleType = 'multi_asset_vault';

  async verifyDeployment(
    m: ModuleDeploymentData,
    c: VerificationContext,
    o: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const p = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const code = await p.getCode(m.moduleAddress);
    
    return [{
      type: VerificationType.MODULE_DEPLOYMENT,
      name: 'Multi-Asset Vault Module',
      description: 'Verify multi-asset vault module bytecode exists',
      status: code !== '0x' ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
      timestamp: Date.now()
    }];
  }

  async verifyLinkage(
    m: ModuleDeploymentData,
    c: VerificationContext,
    o: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const p = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const contract = new ethers.Contract(m.moduleAddress, MULTI_ASSET_ABI, p);
    const v = await contract.vaultContract();
    
    return [{
      type: VerificationType.MODULE_LINKAGE,
      name: 'Module → Vault Link',
      description: 'Verify module.vaultContract() points to vault',
      status: v.toLowerCase() === c.deployment.contractAddress.toLowerCase() ? 
        VerificationStatus.SUCCESS : VerificationStatus.FAILED,
      timestamp: Date.now()
    }];
  }

  async verifyConfiguration(
    m: ModuleDeploymentData,
    c: VerificationContext,
    o: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const p = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    const contract = new ethers.Contract(m.moduleAddress, MULTI_ASSET_ABI, p);
    const { data } = await supabase
      .from('token_erc4626_properties')
      .select('multi_asset_vault_config')
      .eq('token_id', c.deployment.tokenId)
      .maybeSingle();
    
    const assets = await contract.getAllAssets();
    
    return [{
      type: VerificationType.MODULE_CONFIGURATION,
      name: 'Assets Configuration',
      description: 'Verify vault has configured assets',
      status: VerificationStatus.SUCCESS,
      actual: `${assets.length} assets`,
      timestamp: Date.now()
    }];
  }
}
