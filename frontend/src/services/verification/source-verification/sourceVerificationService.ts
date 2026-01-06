// /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/src/services/verification/source-verification/sourceVerificationService.ts

import { supabase } from '@/infrastructure/supabaseClient';
import { BlockscoutClient } from './explorers/blockscoutClient';
import { ConstructorArgsEncoder } from './encoders/constructorArgsEncoder';
import { ContractPathResolver } from './utils/contractPathResolver';
import { sourceCodeLoader } from './utils/sourceCodeLoader';
import type {
  SourceVerificationResult,
  SourceVerificationStatus,
  PhaseVerificationResults
} from './types';

/**
 * Main Source Verification Service
 * 
 * Orchestrates verification of entire deployments:
 * - Phase 1: Token Contract
 * - Phase 2: Modules
 * 
 * Matches bash script behavior exactly:
 * - Checks if already verified
 * - Respects rate limits
 * - Stores results in database
 * - Console output matching bash script
 */
export class SourceVerificationService {
  private clients: Map<string, BlockscoutClient> = new Map();
  private pathResolver = new ContractPathResolver();
  
  // Statistics (matches bash script counters)
  private total = 0;
  private verified = 0;
  private failed = 0;
  private skipped = 0;
  
  constructor() {
    this.initializeClients();
  }
  
  /**
   * Verify complete deployment (token + all modules)
   * 
   * Matches bash script's phase structure:
   * PHASE 1: TOKEN CONTRACT
   * PHASE 2: MODULES
   */
  async verifyCompleteDeployment(tokenId: string): Promise<{
    phases: PhaseVerificationResults[];
    summary: {
      total: number;
      verified: number;
      failed: number;
      skipped: number;
      successRate: number;
    };
  }> {
    // Reset counters
    this.total = 0;
    this.verified = 0;
    this.failed = 0;
    this.skipped = 0;
    
    console.log('═══════════════════════════════════════════════');
    console.log('     SOURCE CODE VERIFICATION - START');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    
    // Get deployment data from database
    const deployment = await this.getDeploymentData(tokenId);
    
    if (!deployment) {
      throw new Error(`Deployment not found for token: ${tokenId}`);
    }
    
    const client = this.clients.get(deployment.network);
    
    if (!client) {
      throw new Error(`No block explorer client configured for network: ${deployment.network}`);
    }
    
    const phases: PhaseVerificationResults[] = [];
    
    // PHASE 1: Token Contract
    console.log('═══════════════════════════════════════════════');
    console.log('           PHASE 1: TOKEN CONTRACT              ');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    
    const phase1 = await this.verifyPhase1Token(deployment, client);
    phases.push(phase1);
    
    // PHASE 2: Modules
    console.log('═══════════════════════════════════════════════');
    console.log('              PHASE 2: MODULES                  ');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    
    const phase2 = await this.verifyPhase2Modules(deployment, client);
    phases.push(phase2);
    
    // Calculate summary
    const successRate = this.total > 0 
      ? Math.round((this.verified / this.total) * 100) 
      : 0;
    
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('       VERIFICATION COMPLETE - ALL PHASES       ');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('📊 Final Summary:');
    console.log(`  Total Attempted:  ${this.total}`);
    console.log(`  ✅ Verified:       ${this.verified}`);
    console.log(`  ❌ Failed:         ${this.failed}`);
    console.log(`  ⏭️  Skipped:        ${this.skipped}`);
    console.log(`  Success Rate:    ${successRate}%`);
    console.log('');
    
    return {
      phases,
      summary: {
        total: this.total,
        verified: this.verified,
        failed: this.failed,
        skipped: this.skipped,
        successRate
      }
    };
  }
  
  /**
   * PHASE 1: Verify Token Contract
   */
  private async verifyPhase1Token(
    deployment: any,
    client: BlockscoutClient
  ): Promise<PhaseVerificationResults> {
    const results: Array<{
      name: string;
      address: string;
      result: SourceVerificationResult;
    }> = [];
    
    let verified = 0;
    let failed = 0;
    let skipped = 0;
    
    // Get contract path based on standard
    const contractPath = this.pathResolver.getTokenPath(deployment.standard);
    
    const tokenName = `${deployment.standard} Token`;
    
    console.log(`  🔍 Verifying: ${tokenName}`);
    console.log(`     Address: ${deployment.contractAddress}`);
    
    this.total++;
    
    // Check if deployed
    if (!deployment.contractAddress || deployment.contractAddress === '0x0000000000000000000000000000000000000000') {
      console.log(`     ⏭️  Not deployed`);
      console.log('');
      skipped++;
      this.skipped++;
      
      results.push({
        name: tokenName,
        address: deployment.contractAddress,
        result: {
          success: false,
          status: 'not_verified' as SourceVerificationStatus,
          message: 'Token contract not deployed'
        }
      });
    } else {
      // Load source code
      const sourceCode = await this.loadSourceCode(contractPath);
      
      // Verify via Blockscout
      const result = await client.verifyContract({
        contractAddress: deployment.contractAddress,
        contractPath,
        sourceCode,
        compilerVersion: 'v0.8.19+commit.7dd6d404',
        optimizationEnabled: true,
        optimizationRuns: 200,
        network: deployment.network
      });
      
      results.push({
        name: tokenName,
        address: deployment.contractAddress,
        result
      });
      
      if (result.success) {
        if (result.status === 'already_verified') {
          console.log(`     ⏭️  Already verified`);
        } else {
          console.log(`     ✅ Verified`);
        }
        verified++;
        this.verified++;
        
        // Update database
        await this.updateTokenVerificationStatus(deployment.tokenId, true, result);
      } else {
        console.log(`     ❌ FAILED: ${result.message}`);
        failed++;
        this.failed++;
        
        // Update database with failure
        await this.updateTokenVerificationStatus(deployment.tokenId, false, result);
      }
      
      console.log('');
      
      // Rate limit (matches sleep 2)
      await client.rateLimit();
    }
    
    return {
      phase: 'Token Contract',
      total: 1,
      verified,
      failed,
      skipped,
      contracts: results
    };
  }
  
  /**
   * PHASE 2: Verify Modules
   */
  private async verifyPhase2Modules(
    deployment: any,
    client: BlockscoutClient
  ): Promise<PhaseVerificationResults> {
    const results: Array<{
      name: string;
      address: string;
      result: SourceVerificationResult;
    }> = [];
    
    let verified = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const module of deployment.modules || []) {
      const moduleName = `${module.moduleType} Module`;
      
      console.log(`  🔍 Verifying: ${moduleName}`);
      console.log(`     Address: ${module.moduleAddress}`);
      
      this.total++;
      
      // Check if deployed
      if (!module.moduleAddress || module.moduleAddress === '0x0000000000000000000000000000000000000000') {
        console.log(`     ⏭️  Not deployed`);
        console.log('');
        skipped++;
        this.skipped++;
        
        results.push({
          name: moduleName,
          address: module.moduleAddress,
          result: {
            success: false,
            status: 'not_verified' as SourceVerificationStatus,
            message: 'Module not deployed'
          }
        });
        continue;
      }
      
      // Get contract path
      const contractPath = this.pathResolver.getModulePath(module.moduleType);
      
      // Load source code
      const sourceCode = await this.loadSourceCode(contractPath);
      
      // Verify via Blockscout
      const result = await client.verifyContract({
        contractAddress: module.moduleAddress,
        contractPath,
        sourceCode,
        compilerVersion: 'v0.8.19+commit.7dd6d404',
        optimizationEnabled: true,
        optimizationRuns: 200,
        network: deployment.network
      });
      
      results.push({
        name: moduleName,
        address: module.moduleAddress,
        result
      });
      
      if (result.success) {
        if (result.status === 'already_verified') {
          console.log(`     ⏭️  Already verified`);
        } else {
          console.log(`     ✅ Verified`);
        }
        verified++;
        this.verified++;
        
        // Update database
        await this.updateModuleVerificationStatus(module.moduleId, true, result);
      } else {
        console.log(`     ❌ FAILED: ${result.message}`);
        failed++;
        this.failed++;
        
        // Update database with failure
        await this.updateModuleVerificationStatus(module.moduleId, false, result);
      }
      
      console.log('');
      
      // Rate limit (matches sleep 2)
      await client.rateLimit();
    }
    
    return {
      phase: 'Modules',
      total: deployment.modules?.length || 0,
      verified,
      failed,
      skipped,
      contracts: results
    };
  }
  
  /**
   * Get deployment data from database
   */
  private async getDeploymentData(tokenId: string) {
    const { data: deployment, error } = await supabase
      .from('token_deployments')
      .select(`
        *,
        token_modules (
          id,
          module_type,
          module_address,
          configuration
        )
      `)
      .eq('token_id', tokenId)
      .single();
    
    if (error) {
      console.error('Error fetching deployment:', error);
      return null;
    }
    
    return {
      tokenId,
      contractAddress: deployment.contract_address,
      standard: deployment.standard,
      network: deployment.network,
      modules: (deployment.token_modules || []).map((m: any) => ({
        moduleId: m.id,
        moduleType: m.module_type,
        moduleAddress: m.module_address,
        configuration: m.configuration
      }))
    };
  }
  
  /**
   * Load Solidity source code from foundry-contracts
   * 
   * Uses sourceCodeLoader utility
   */
  private async loadSourceCode(contractPath: string): Promise<string> {
    return await sourceCodeLoader.loadSource(contractPath);
  }
  
  /**
   * Update token verification status in database
   */
  private async updateTokenVerificationStatus(
    tokenId: string,
    verified: boolean,
    result: SourceVerificationResult
  ): Promise<void> {
    const { error } = await supabase
      .from('token_deployments')
      .update({
        source_verified: verified,
        source_verification_status: result.status,
        block_explorer_url: result.explorerUrl,
        source_verification_attempts: 1, // Increment this if retrying
        last_source_verification_attempt: new Date().toISOString()
      })
      .eq('token_id', tokenId);
    
    if (error) {
      console.error('Error updating token verification status:', error);
    }
  }
  
  /**
   * Update module verification status in database
   */
  private async updateModuleVerificationStatus(
    moduleId: string,
    verified: boolean,
    result: SourceVerificationResult
  ): Promise<void> {
    const { error } = await supabase
      .from('token_modules')
      .update({
        source_verified: verified,
        source_verification_status: result.status,
        block_explorer_url: result.explorerUrl,
        source_verification_attempts: 1,
        last_source_verification_attempt: new Date().toISOString()
      })
      .eq('id', moduleId);
    
    if (error) {
      console.error('Error updating module verification status:', error);
    }
  }
  
  /**
   * Initialize block explorer clients for each network
   */
  private initializeClients(): void {
    // Hoodi - Blockscout
    this.clients.set('hoodi', new BlockscoutClient({
      name: 'Hoodi Blockscout',
      apiUrl: 'https://eth-hoodi.blockscout.com/api',
      rateLimit: 30 // 30 requests per minute (2 second delays)
    }));
    
    // Add more networks as needed
    // Ethereum Sepolia, Polygon, etc.
  }
}

// Export singleton
export const sourceVerificationService = new SourceVerificationService();
