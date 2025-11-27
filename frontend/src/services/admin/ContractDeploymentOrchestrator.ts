/**
 * Contract Deployment Orchestrator Service
 * 
 * Orchestrates the complete deployment workflow:
 * 1. Deploy contracts using Foundry
 * 2. Wait for block explorer indexing
 * 3. Verify contracts on block explorer
 * 4. Import to database
 * 
 * Network-agnostic design supporting any EVM chain
 */

import { CHAIN_IDS, CHAIN_INFO, getChainInfo } from '@/infrastructure/web3/utils/chainIds';
import { getRpcUrl } from '@/infrastructure/web3/rpc/rpc-config';

// ============================================
// Types
// ============================================

export interface DeploymentConfig {
  network: string; // e.g., 'hoodi', 'sepolia', 'mainnet'
  environment: 'mainnet' | 'testnet';
  deployerPrivateKey: string; // Encrypted in production
  superAdminAddress: string; // Address for Super Admin role (from user_addresses)
  waitMinutes?: number; // Wait time before verification (default: 45)
  rpcUrl?: string; // Optional override
  explorerApiKey?: string; // Block explorer API key
}

export interface DeploymentResult {
  success: boolean;
  deploymentFile: string; // Path to deployment JSON
  contracts: Record<string, string>; // contract_key -> address
  transactionHashes: string[];
  timestamp: string;
  network: string;
  chainId: number;
  error?: string;
}

export interface VerificationResult {
  success: boolean;
  verified: number;
  failed: number;
  skipped: number;
  total: number;
  explorerUrl: string;
  error?: string;
}

export interface DeploymentStatus {
  phase: 'idle' | 'deploying' | 'waiting' | 'verifying' | 'importing' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
  deploymentResult?: DeploymentResult;
  verificationResult?: VerificationResult;
  error?: string;
}

// ============================================
// Configuration
// ============================================

/**
 * Get network configuration for deployment
 */
export function getNetworkConfig(network: string): {
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  explorerApiUrl: string;
  isTestnet: boolean;
} | null {
  // Try to find chain by name
  const chainId = CHAIN_IDS[network as keyof typeof CHAIN_IDS];
  if (!chainId) {
    console.error(`Unknown network: ${network}`);
    return null;
  }

  const chainInfo = getChainInfo(chainId);
  if (!chainInfo) {
    console.error(`No chain info for ${network} (${chainId})`);
    return null;
  }

  // Get RPC URL
  const isTestnet = chainInfo.type === 'testnet';
  const rpcUrl = getRpcUrl(network, isTestnet);

  // Construct explorer API URL from explorer URL
  const explorerUrl = chainInfo.explorer || '';
  const explorerApiUrl = explorerUrl ? `${explorerUrl}/api` : '';

  return {
    chainId,
    rpcUrl,
    explorerUrl,
    explorerApiUrl,
    isTestnet
  };
}

/**
 * Get all deployable networks
 */
export function getDeployableNetworks(): Array<{
  network: string;
  chainId: number;
  name: string;
  type: 'mainnet' | 'testnet';
  explorer: string;
}> {
  const networks = Object.entries(CHAIN_IDS).map(([network, chainId]) => {
    const info = getChainInfo(chainId);
    if (!info) return null;

    return {
      network,
      chainId,
      name: info.name,
      type: info.type,
      explorer: info.explorer || ''
    };
  });

  return networks.filter(Boolean) as Array<{
    network: string;
    chainId: number;
    name: string;
    type: 'mainnet' | 'testnet';
    explorer: string;
  }>;
}

// ============================================
// Deployment Commands
// ============================================

/**
 * Build deployment command for Foundry
 */
export function buildDeploymentCommand(config: DeploymentConfig): string {
  const networkConfig = getNetworkConfig(config.network);
  if (!networkConfig) {
    throw new Error(`Invalid network: ${config.network}`);
  }

  const rpcUrl = config.rpcUrl || networkConfig.rpcUrl;
  
  // Command structure:
  // ~/.foundry/bin/forge script script/DeployUniversalComplete.s.sol:DeployUniversalComplete \
  //   --rpc-url <RPC_URL> \
  //   --private-key <PRIVATE_KEY> \
  //   --broadcast \
  //   -vvv
  
  const command = [
    '~/.foundry/bin/forge script',
    'script/DeployUniversalComplete.s.sol:DeployUniversalComplete',
    `--rpc-url ${rpcUrl}`,
    `--private-key ${config.deployerPrivateKey}`,
    '--broadcast',
    '-vvv'
  ].join(' \\\n  ');

  return command;
}

/**
 * Build verification command for Foundry
 */
export function buildVerificationCommand(
  network: string,
  explorerApiKey: string
): string {
  // Command structure:
  // export ETHERSCAN_API_KEY=<API_KEY> && \
  // ./scripts/verify-all-contracts.sh <network>
  
  const command = [
    `export ETHERSCAN_API_KEY=${explorerApiKey}`,
    `./scripts/verify-all-contracts.sh ${network}`
  ].join(' && \\\n');

  return command;
}

/**
 * Get deployment file path
 */
export function getDeploymentFilePath(network: string): string {
  return `deployments/${network}-complete.json`;
}

/**
 * Get timestamp-based backup file path
 */
export function getBackupFilePath(network: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `deployments/${network}-complete-${timestamp}.json`;
}

// ============================================
// Deployment Workflow
// ============================================

/**
 * Execute deployment workflow
 * 
 * NOTE: This is a client-side orchestration function.
 * Actual command execution must be done via backend API or MCP tools.
 */
export async function executeDeploymentWorkflow(
  config: DeploymentConfig,
  onStatusChange: (status: DeploymentStatus) => void
): Promise<DeploymentResult> {
  const networkConfig = getNetworkConfig(config.network);
  if (!networkConfig) {
    throw new Error(`Invalid network: ${config.network}`);
  }

  try {
    // Phase 1: Deploy
    onStatusChange({
      phase: 'deploying',
      message: `Deploying contracts to ${config.network}...`,
      progress: 10
    });

    // This would call backend API or MCP tool to execute:
    // const deployCommand = buildDeploymentCommand(config);
    // const deployResult = await executeCommand(deployCommand);
    
    // For now, return placeholder
    throw new Error('Deployment execution requires backend API integration');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    onStatusChange({
      phase: 'error',
      message: errorMessage,
      progress: 0,
      error: errorMessage
    });
    throw error;
  }
}

/**
 * Calculate wait time in milliseconds
 */
export function calculateWaitTime(minutes: number = 45): number {
  return minutes * 60 * 1000;
}

/**
 * Format wait time for display
 */
export function formatWaitTime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}${seconds > 0 ? ` ${seconds}s` : ''}`;
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

// ============================================
// Validation
// ============================================

/**
 * Validate deployment configuration
 */
export function validateDeploymentConfig(config: DeploymentConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate network
  const networkConfig = getNetworkConfig(config.network);
  if (!networkConfig) {
    errors.push(`Invalid network: ${config.network}`);
  }

  // Validate private key format (should be 0x-prefixed hex)
  if (!config.deployerPrivateKey) {
    errors.push('Deployer private key is required');
  } else if (!/^0x[0-9a-fA-F]{64}$/.test(config.deployerPrivateKey)) {
    errors.push('Invalid private key format (must be 0x-prefixed 64 hex characters)');
  }

  // Validate wait time
  if (config.waitMinutes !== undefined) {
    if (config.waitMinutes < 0 || config.waitMinutes > 120) {
      errors.push('Wait time must be between 0 and 120 minutes');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if deployment file exists
 */
export async function checkDeploymentFileExists(network: string): Promise<boolean> {
  // This would use filesystem API or backend check
  // For now, return false
  return false;
}

// ============================================
// Export Everything
// ============================================

export const ContractDeploymentOrchestrator = {
  // Configuration
  getNetworkConfig,
  getDeployableNetworks,
  
  // Commands
  buildDeploymentCommand,
  buildVerificationCommand,
  getDeploymentFilePath,
  getBackupFilePath,
  
  // Workflow
  executeDeploymentWorkflow,
  calculateWaitTime,
  formatWaitTime,
  
  // Validation
  validateDeploymentConfig,
  checkDeploymentFileExists
};

export default ContractDeploymentOrchestrator;
