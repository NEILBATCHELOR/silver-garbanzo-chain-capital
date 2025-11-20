/**
 * Deployment Orchestration Service
 * Main service that coordinates contract deployment workflow
 */

import { v4 as uuidv4 } from 'uuid';
import { ArtifactLoader } from './artifactLoader';
import { ContractDeployer } from './contractDeployer';
import { DatabaseService } from './databaseService';
import { SourceCodeLoader } from './sourceCodeLoader';
import { DependencyResolver } from './dependencyResolver';
import { WalletEncryptionService } from '../security/walletEncryptionService';
import {
  DeploymentRequest,
  DeploymentResponse,
  DeploymentResult,
  DeploymentProgress,
  ContractType,
  DEPLOYMENT_ORDER,
} from './types';

export class DeploymentOrchestrator {
  private artifactLoader: ArtifactLoader;
  private databaseService: DatabaseService;
  private progressMap: Map<string, DeploymentProgress>;

  constructor(
    artifactsPath?: string,
    supabaseUrl?: string,
    supabaseKey?: string
  ) {
    this.artifactLoader = new ArtifactLoader(artifactsPath);
    this.databaseService = new DatabaseService(
      supabaseUrl || process.env.SUPABASE_URL || '',
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    this.progressMap = new Map();
  }

  /**
   * Main deployment entry point
   */
  async deployContracts(
    request: DeploymentRequest,
    userId: string,
    encryptedPrivateKey: string
  ): Promise<DeploymentResponse> {
    const deploymentId = uuidv4();
    const startTime = new Date().toISOString();

    // Initialize progress tracking
    this.progressMap.set(deploymentId, {
      deploymentId,
      status: 'pending',
      completedCount: 0,
      totalCount: request.contracts.length,
      results: [],
      startedAt: startTime,
    });

    try {
      // Step 1: Decrypt wallet private key
      const privateKey = await WalletEncryptionService.decrypt(encryptedPrivateKey);

      // Step 2: Get RPC URL for network
      const rpcUrl = this.getRpcUrl(request.network);

      // Step 3: Initialize deployer
      const deployer = new ContractDeployer(rpcUrl, privateKey, request.network);
      const deployerAddress = deployer.getDeployerAddress();

      // Step 3a: Initialize dependency resolver
      const dependencyResolver = new DependencyResolver();

      // Step 4: Sort contracts by deployment order
      const sortedContracts = this.sortContractsByDeploymentOrder(
        request.contracts.map((c) => c.contractType)
      );

      // Step 5: Load all artifacts
      this.updateProgress(deploymentId, {
        status: 'deploying',
        currentStep: 'Loading contract artifacts...',
      });

      const artifacts = await this.artifactLoader.loadArtifacts(sortedContracts);

      // Step 5a: Load source code for all contracts
      this.updateProgress(deploymentId, {
        currentStep: 'Loading contract source code...',
      });

      const sourceCodeLoader = new SourceCodeLoader();
      const sourceCodeMap = await sourceCodeLoader.loadSourceCodes(sortedContracts);

      // Step 6: Deploy contracts in order
      const results: DeploymentResult[] = [];
      let totalGasUsed = BigInt(0);
      let totalCostWei = BigInt(0);

      for (const contractType of sortedContracts) {
        this.updateProgress(deploymentId, {
          currentContract: contractType,
          currentStep: `Deploying ${contractType}...`,
        });

        const artifact = artifacts.get(contractType);
        if (!artifact) {
          results.push({
            success: false,
            contractType,
            error: 'Artifact not found',
            verificationStatus: 'not_requested',
          });
          continue;
        }

        // Validate artifact
        if (!this.artifactLoader.validateArtifact(artifact)) {
          results.push({
            success: false,
            contractType,
            error: 'Invalid artifact or unlinked libraries',
            verificationStatus: 'not_requested',
          });
          continue;
        }

        // Check dependencies
        const { canDeploy, missing } = dependencyResolver.canDeploy(contractType);
        if (!canDeploy) {
          results.push({
            success: false,
            contractType,
            error: `Missing dependencies: ${missing.join(', ')}`,
            verificationStatus: 'not_requested',
          });
          console.warn(`⚠️  Skipping ${contractType}: missing ${missing.join(', ')}`);
          continue;
        }

        // Get deployment args - use provided args or generate from dependencies
        const contractItem = request.contracts.find(
          (c) => c.contractType === contractType
        );
        let deployArgs = contractItem?.deployArgs;
        
        // If no args provided, generate from dependencies
        if (!deployArgs || deployArgs.length === 0) {
          try {
            deployArgs = dependencyResolver.generateConstructorArgs(contractType);
            
            // Special case: UpgradeGovernor needs at least one upgrader address
            if (contractType === 'upgrade_governor' && Array.isArray(deployArgs[0]) && deployArgs[0].length === 0) {
              // Use deployer address as the default upgrader
              deployArgs[0] = [deployerAddress];
              console.log(`📝 Using deployer as default upgrader for UpgradeGovernor: ${deployerAddress}`);
            }
            
            console.log(`📦 Generated constructor args for ${contractType}:`, deployArgs);
          } catch (error) {
            results.push({
              success: false,
              contractType,
              error: error instanceof Error ? error.message : 'Failed to generate constructor args',
              verificationStatus: 'not_requested',
            });
            continue;
          }
        }

        // Deploy contract
        const result = await deployer.deployContract(
          contractType,
          artifact,
          deployArgs,
          request.gasSettings
        );

        results.push(result);

        // If successful, record deployment in dependency resolver
        if (result.success && result.address) {
          dependencyResolver.recordDeployment(contractType, result.address);
        }

        // Update totals
        if (result.success && result.gasUsed) {
          totalGasUsed += BigInt(result.gasUsed);
          if (result.deploymentCost) {
            totalCostWei += BigInt(
              Math.floor(parseFloat(result.deploymentCost) * 1e18)
            );
          }
        }

        // Step 7: Update database if deployment successful
        if (result.success) {
          try {
            const sourceCodeData = sourceCodeMap.get(contractType) || null;
            await this.databaseService.upsertContractMaster(
              result,
              artifact,
              sourceCodeData,
              request.network,
              request.environment,
              userId
            );
          } catch (error) {
            console.error('Failed to update database:', error);
            result.error = `Deployed but database update failed: ${error instanceof Error ? error.message : 'Unknown error'
              }`;
          }
        }

        this.updateProgress(deploymentId, {
          completedCount: results.length,
          results,
        });
      }

      // Step 8: Build response
      this.updateProgress(deploymentId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      return {
        deploymentId,
        results,
        totalGasUsed: totalGasUsed.toString(),
        totalCost: (Number(totalCostWei) / 1e18).toFixed(6),
        timestamp: startTime,
        deployer: deployerAddress,
      };
    } catch (error) {
      this.updateProgress(deploymentId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Deployment failed',
        completedAt: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Get deployment progress
   */
  getProgress(deploymentId: string): DeploymentProgress | null {
    return this.progressMap.get(deploymentId) || null;
  }

  /**
   * Clear old progress entries (cleanup)
   */
  clearProgress(deploymentId: string): void {
    this.progressMap.delete(deploymentId);
  }

  /**
   * Sort contracts by deployment order
   */
  private sortContractsByDeploymentOrder(
    contracts: ContractType[]
  ): ContractType[] {
    return contracts.sort((a, b) => {
      const aIndex = DEPLOYMENT_ORDER.indexOf(a);
      const bIndex = DEPLOYMENT_ORDER.indexOf(b);

      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  }

  /**
   * Update progress tracking
   */
  private updateProgress(
    deploymentId: string,
    updates: Partial<DeploymentProgress>
  ): void {
    const current = this.progressMap.get(deploymentId);
    if (current) {
      this.progressMap.set(deploymentId, { ...current, ...updates });
    }
  }

  /**
   * Get RPC URL for network
   */
  private getRpcUrl(network: string): string {
    // Map network names to environment variable RPC URLs
    const rpcUrls: Record<string, string> = {
      // Ethereum networks
      hoodi: process.env.HOODI_RPC_URL || 'https://rpc.hoodi.xyz',
      ethereum: process.env.ETHEREUM_RPC_URL || '',
      mainnet: process.env.MAINNET_RPC_URL || process.env.ETHEREUM_RPC_URL || '',
      sepolia: process.env.SEPOLIA_RPC_URL || '',
      holesky: process.env.HOLESKY_RPC_URL || '',

      // L2 networks
      polygon: process.env.POLYGON_RPC_URL || '',
      amoy: process.env.AMOY_RPC_URL || '',
      arbitrum: process.env.ARBITRUM_RPC_URL || '',
      'arbitrum-sepolia': process.env.ARBITRUM_SEPOLIA_RPC_URL || '',
      optimism: process.env.OPTIMISM_RPC_URL || '',
      'optimism-sepolia': process.env.OPTIMISM_SEPOLIA_RPC_URL || '',
      base: process.env.BASE_RPC_URL || '',
      'base-sepolia': process.env.BASE_SEPOLIA_RPC_URL || '',
      zksync: process.env.ZKSYNC_RPC_URL || '',
      'zksync-sepolia': process.env.ZKSYNC_SEPOLIA_RPC_URL || '',

      // Other EVM chains
      bsc: process.env.BSC_RPC_URL || '',
      'bsc-testnet': process.env.BSC_TESTNET_URL || '',
      avalanche: process.env.AVALANCHE_RPC_URL || '',
      'avalanche-testnet': process.env.AVALANCHE_TESTNET_RPC_URL || '',

      // Non-EVM chains (Injective - use PublicNode for compatibility)
      injective: process.env.INJECTIVE_RPC_URL || 'https://injective-rpc.publicnode.com:443',
      'injective-testnet': process.env.INJECTIVE_TESTNET_RPC_URL || 'https://injective-testnet-rpc.publicnode.com:443',
      solana: process.env.SOLANA_RPC_URL || '',
      'solana-devnet': process.env.SOLANA_DEVNET_RPC_URL || '',
      aptos: process.env.APTOS_RPC_URL || '',
      'aptos-testnet': process.env.APTOS_TESTNET_RPC_URL || '',
      sui: process.env.SUI_RPC_URL || '',
      'sui-testnet': process.env.SUI_TESTNET_RPC_URL || '',
      near: process.env.NEAR_RPC_URL || '',
      'near-testnet': process.env.NEAR_TESTNET_RPC_URL || '',
    };

    const rpcUrl = rpcUrls[network.toLowerCase()];

    // Debug logging
    console.log('🔍 getRpcUrl Debug:', {
      network,
      networkLower: network.toLowerCase(),
      rpcUrl,
      hasEnvVar: !!process.env.INJECTIVE_RPC_URL,
      envVarValue: process.env.INJECTIVE_RPC_URL,
    });

    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for network: ${network}`);
    }

    return rpcUrl;
  }
}
