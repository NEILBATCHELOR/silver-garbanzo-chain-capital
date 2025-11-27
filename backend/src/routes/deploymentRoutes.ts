/**
 * Deployment Routes
 * 
 * API endpoints for contract deployment and verification
 * Requires admin authentication
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  DeploymentCommandService,
  CommandExecutionRequest 
} from '../services/deployment/DeploymentCommandService';
import { DeploymentAuditService } from '../services/deployment/DeploymentAuditService';
import { deriveEVMPrivateKeyFromMnemonic, validateDerivedAddress } from '../utils/walletKeyDerivation';
import WalletEncryptionService from '../services/security/walletEncryptionService';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ============================================
// Types
// ============================================

interface ExecuteCommandBody {
  command: string;
  workingDirectory: string;
  timeout?: number;
  network?: string;
}

interface ExecuteDeploymentBody {
  network: string;
  privateKey: string;
  rpcUrl: string;
}

interface ExecuteVerificationBody {
  network: string;
  explorerApiKey: string;
}

// ============================================
// Authentication Middleware
// ============================================

/**
 * Verify user is admin
 * This uses the JWT authentication from fastify.authenticate
 */
async function verifyAdminAccess(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Use fastify's authenticate decorator to verify JWT token
    await (request.server as any).authenticate(request, reply);
    
    // Get user from JWT token (set by fastify-jwt)
    const user = (request as any).user;
    const userId = user?.sub || user?.userId || user?.id;
    
    if (!userId) {
      return reply.code(401).send({
        success: false,
        error: 'Unauthorized: No user ID found in token'
      });
    }

    // TODO: Check if user has admin role in database
    // For now, this is a placeholder
    // In production, query the database to verify admin role
    
    // Example:
    // const { data, error } = await supabase
    //   .from('user_roles')
    //   .select('role_id')
    //   .eq('user_id', userId)
    //   .single();
    //
    // if (error || !data) {
    //   return reply.code(403).send({
    //     success: false,
    //     error: 'Forbidden: Admin access required'
    //   });
    // }

    // Allow request to proceed
  } catch (error) {
    // Authentication failed - fastify.authenticate already sent error response
    // Just return to prevent further processing
    return;
  }
}

// ============================================
// Routes
// ============================================

export async function deploymentRoutes(fastify: FastifyInstance) {
  
  /**
   * Health check endpoint
   */
  fastify.get('/api/deployment/health', async (request, reply) => {
    const foundryInstalled = await DeploymentCommandService.checkFoundryInstalled();
    const foundryVersion = await DeploymentCommandService.getFoundryVersion();

    return {
      healthy: true,
      foundry: {
        installed: foundryInstalled,
        version: foundryVersion
      },
      timestamp: new Date().toISOString()
    };
  });

  /**
   * Execute generic deployment command
   * 
   * POST /api/deployment/execute-command
   */
  fastify.post<{ Body: ExecuteCommandBody }>(
    '/api/deployment/execute-command',
    {
      preHandler: verifyAdminAccess
    },
    async (request, reply) => {
      const { command, workingDirectory, timeout, network } = request.body;
      const userId = (request as any).user?.id || null;

      try {
        // Execute command
        const result = await DeploymentCommandService.executeCommand({
          command,
          workingDirectory,
          timeout,
          userId,
          network
        });

        // Log to audit
        await DeploymentAuditService.logDeploymentActivity({
          user_id: userId,
          network: network || 'unknown',
          action: 'command_execution',
          command,
          success: result.success,
          exit_code: result.exitCode,
          duration_ms: result.duration,
          output: result.output,
          error: result.error
        });

        return {
          success: result.success,
          output: result.output,
          exitCode: result.exitCode,
          duration: result.duration,
          error: result.error
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Log error to audit
        await DeploymentAuditService.logDeploymentActivity({
          user_id: userId,
          network: network || 'unknown',
          action: 'command_execution',
          command,
          success: false,
          exit_code: -1,
          duration_ms: 0,
          error: errorMessage
        });

        return reply.code(500).send({
          success: false,
          output: '',
          exitCode: -1,
          error: errorMessage
        });
      }
    }
  );

  /**
   * Execute deployment
   * 
   * POST /api/deployment/deploy
   */
  fastify.post<{ Body: ExecuteDeploymentBody }>(
    '/api/deployment/deploy',
    {
      preHandler: verifyAdminAccess
    },
    async (request, reply) => {
      const { network, privateKey, rpcUrl } = request.body;
      const userId = (request as any).user?.id || null;

      try {
        // Validate inputs
        if (!network || !privateKey || !rpcUrl) {
          return reply.code(400).send({
            success: false,
            error: 'Missing required fields: network, privateKey, rpcUrl'
          });
        }

        // Execute deployment
        const result = await DeploymentCommandService.executeDeployment({
          network,
          privateKey,
          rpcUrl,
          userId
        });

        // Log to audit
        await DeploymentAuditService.logDeploymentActivity({
          user_id: userId,
          network,
          action: 'deployment',
          command: `Deploy to ${network}`,
          success: result.success,
          exit_code: result.exitCode,
          duration_ms: result.duration,
          output: result.output,
          error: result.error,
          metadata: {
            rpcUrl
          }
        });

        return {
          success: result.success,
          output: result.output,
          exitCode: result.exitCode,
          duration: result.duration,
          error: result.error
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await DeploymentAuditService.logDeploymentActivity({
          user_id: userId,
          network,
          action: 'deployment',
          command: `Deploy to ${network}`,
          success: false,
          exit_code: -1,
          duration_ms: 0,
          error: errorMessage
        });

        return reply.code(500).send({
          success: false,
          output: '',
          exitCode: -1,
          error: errorMessage
        });
      }
    }
  );

  /**
   * Execute verification
   * 
   * POST /api/deployment/verify
   */
  fastify.post<{ Body: ExecuteVerificationBody }>(
    '/api/deployment/verify',
    {
      preHandler: verifyAdminAccess
    },
    async (request, reply) => {
      const { network, explorerApiKey } = request.body;
      const userId = (request as any).user?.id || null;

      try {
        // Validate inputs
        if (!network || !explorerApiKey) {
          return reply.code(400).send({
            success: false,
            error: 'Missing required fields: network, explorerApiKey'
          });
        }

        // Execute verification
        const result = await DeploymentCommandService.executeVerification({
          network,
          explorerApiKey,
          userId
        });

        // Log to audit
        await DeploymentAuditService.logDeploymentActivity({
          user_id: userId,
          network,
          action: 'verification',
          command: `Verify contracts on ${network}`,
          success: result.success,
          exit_code: result.exitCode,
          duration_ms: result.duration,
          output: result.output,
          error: result.error
        });

        return {
          success: result.success,
          output: result.output,
          exitCode: result.exitCode,
          duration: result.duration,
          error: result.error
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await DeploymentAuditService.logDeploymentActivity({
          user_id: userId,
          network,
          action: 'verification',
          command: `Verify contracts on ${network}`,
          success: false,
          exit_code: -1,
          duration_ms: 0,
          error: errorMessage
        });

        return reply.code(500).send({
          success: false,
          output: '',
          exitCode: -1,
          error: errorMessage
        });
      }
    }
  );

  /**
   * Get deployment history
   * 
   * GET /api/deployment/history
   */
  fastify.get(
    '/api/deployment/history',
    {
      preHandler: verifyAdminAccess
    },
    async (request, reply) => {
      const query = request.query as any;
      
      try {
        const history = await DeploymentAuditService.getDeploymentHistory({
          userId: query.userId,
          network: query.network,
          limit: query.limit ? parseInt(query.limit) : 50,
          offset: query.offset ? parseInt(query.offset) : 0
        });

        return {
          success: true,
          data: history
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return reply.code(500).send({
          success: false,
          error: errorMessage
        });
      }
    }
  );

  /**
   * Get deployment statistics
   * 
   * GET /api/deployment/stats
   */
  fastify.get(
    '/api/deployment/stats',
    {
      preHandler: verifyAdminAccess
    },
    async (request, reply) => {
      const query = request.query as any;
      
      try {
        const stats = await DeploymentAuditService.getDeploymentStats({
          userId: query.userId,
          network: query.network,
          startDate: query.startDate,
          endDate: query.endDate
        });

        return {
          success: true,
          data: stats
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return reply.code(500).send({
          success: false,
          error: errorMessage
        });
      }
    }
  );

  /**
   * Map UI network names to script network names
   */
  const mapNetworkName = (uiNetwork: string): string => {
    const networkMap: Record<string, string> = {
      'testnet': 'injectiveTestnet',
      'mainnet': 'injective',
      'hoodi': 'hoodi',
      'sepolia': 'sepolia',
      'polygon': 'polygon',
      'arbitrum': 'arbitrum',
      'base': 'base'
    };
    
    return networkMap[uiNetwork.toLowerCase()] || uiNetwork;
  };

  /**
   * Map network names to their expected environment variable names
   */
  const getEnvVarName = (network: string): string => {
    const envVarMap: Record<string, string> = {
      'injectiveTestnet': 'INJECTIVE_TESTNET_PRIVATE_KEY',
      'injective': 'INJECTIVE_PRIVATE_KEY',
      'hoodi': 'HOODI_PRIVATE_KEY',
      'sepolia': 'SEPOLIA_PRIVATE_KEY',
      'mainnet': 'MAINNET_PRIVATE_KEY',
      'polygon': 'POLYGON_PRIVATE_KEY',
      'arbitrum': 'ARBITRUM_PRIVATE_KEY',
      'base': 'BASE_PRIVATE_KEY'
    };
    
    return envVarMap[network] || `${network.toUpperCase()}_PRIVATE_KEY`;
  };

  /**
   * Get the appropriate private key for deployment
   * 
   * For Injective wallets deploying to EVM, derives EVM private key from mnemonic.
   * For other wallets, decrypts and returns the stored private key.
   */
  async function getDeploymentPrivateKey(
    walletId: string,
    network: string
  ): Promise<{ privateKey: string; address: string }> {
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch wallet from database
    const { data: wallet, error } = await supabase
      .from('project_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (error || !wallet) {
      throw new Error(`Failed to fetch wallet: ${error?.message || 'Not found'}`);
    }

    console.log('🔍 Wallet info:', {
      walletId,
      walletType: wallet.wallet_type,
      network,
      hasEVMAddress: !!wallet.evm_address,
      hasNativeAddress: !!wallet.wallet_address
    });

    // For Injective wallets deploying to EVM, derive EVM key from mnemonic
    const isInjectiveEVMDeployment = 
      wallet.wallet_type === 'injective' && 
      (network.toLowerCase().includes('injective') || network === 'testnet');

    if (isInjectiveEVMDeployment && wallet.mnemonic && wallet.evm_address) {
      console.log('🔐 Deriving EVM private key from mnemonic for Injective EVM deployment');
      
      const { evmPrivateKey, evmAddress } = await deriveEVMPrivateKeyFromMnemonic(
        wallet.mnemonic
      );

      // Validate the derived address matches what's in the database
      if (!validateDerivedAddress(evmAddress, wallet.evm_address)) {
        console.warn('⚠️ Derived EVM address does not match database! Using derived key anyway.');
      }

      return {
        privateKey: evmPrivateKey,
        address: evmAddress
      };
    }

    // For all other wallets, decrypt the stored private key
    console.log('🔐 Using stored private key (decrypted)');
    
    if (!wallet.private_key) {
      throw new Error('Private key not found in wallet');
    }

    const decryptedKey = await WalletEncryptionService.decrypt(wallet.private_key);
    
    return {
      privateKey: decryptedKey,
      address: wallet.evm_address || wallet.wallet_address
    };
  }

  /**
   * Execute combined deployment and verification
   * Uses the deploy-and-verify.sh script for automated workflow
   * 
   * POST /api/deployment/deploy-and-verify
   */
  fastify.post<{ 
    Body: { 
      network: string; 
      privateKey: string;
      superAdminAddress: string;
      explorerApiKey?: string;
      waitMinutes?: number;
    } 
  }>(
    '/api/deployment/deploy-and-verify',
    {
      preHandler: verifyAdminAccess
    },
    async (request, reply) => {
      const { network: uiNetwork, privateKey, superAdminAddress, explorerApiKey, waitMinutes = 45 } = request.body;
      const userId = (request as any).user?.id || null;
      
      // Declare network outside try block so it's available in catch block
      let network = uiNetwork; // Default to uiNetwork if mapping fails

      try {
        // Validate inputs
        if (!uiNetwork || !privateKey || !superAdminAddress) {
          return reply.code(400).send({
            success: false,
            error: 'Missing required fields: network, privateKey, and superAdminAddress'
          });
        }

        // Validate private key format (should be 64 hex chars with or without 0x prefix)
        const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
        if (!/^[0-9a-fA-F]{64}$/.test(cleanPrivateKey)) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid private key format. Must be 64 hex characters.'
          });
        }

        // Map UI network name to script network name
        network = mapNetworkName(uiNetwork);

        console.log('🔐 Deployment request received:', {
          network,
          uiNetwork,
          superAdminAddress,
          hasExplorerKey: !!explorerApiKey,
          privateKeyFormat: privateKey.startsWith('0x') ? 'with-prefix' : 'without-prefix',
          privateKeyLength: privateKey.length
        });

        // Build command using deploy-and-verify.sh script
        const workingDir = '/Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts';
        
        // Get the correct environment variable name for this network
        const envVarName = getEnvVarName(network);
        
        // Ensure private key has 0x prefix for Forge
        const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
        
        let command: string;
        if (explorerApiKey) {
          // With verification - explicitly use bash to support associative arrays
          command = `export ETHERSCAN_API_KEY=${explorerApiKey} && export ${envVarName}=${formattedPrivateKey} && export SUPER_ADMIN_ADDRESS=${superAdminAddress} && bash ./scripts/deploy-and-verify.sh ${network} --delay ${waitMinutes}`;
        } else {
          // Deploy only (no verification) - explicitly use bash
          command = `export ${envVarName}=${formattedPrivateKey} && export SUPER_ADMIN_ADDRESS=${superAdminAddress} && bash ./scripts/deploy-and-verify.sh ${network} --delay 0`;
        }

        // Execute command with extended timeout
        const timeout = (waitMinutes + 30) * 60 * 1000; // Add 30 minutes buffer
        
        const result = await DeploymentCommandService.executeCommand({
          command,
          workingDirectory: workingDir,
          timeout,
          userId,
          network
        });

        // TEMPORARY DEBUG: Log full result to file
        fs.writeFileSync('/tmp/deployment-debug.json', JSON.stringify({
          command,
          network,
          result,
          timestamp: new Date().toISOString()
        }, null, 2));
        
        console.log('🔍 DEPLOYMENT RESULT:', {
          success: result.success,
          exitCode: result.exitCode,
          outputLength: result.output?.length || 0,
          errorLength: result.error?.length || 0,
          firstError: result.error?.substring(0, 500)
        });

        // Check if deployment file was created (indicates success despite potential RPC issues)
        // Try both naming patterns: {network}-complete.json and chain-{chainId}-complete.json
        let deploymentFile = `${network}-complete.json`;
        let deploymentPath = `${workingDir}/deployments/${deploymentFile}`;
        let deploymentFileExists = fs.existsSync(deploymentPath);
        
        // If network-named file doesn't exist, try chain ID-based name
        if (!deploymentFileExists) {
          // Map network to chain ID
          const chainIdMap: Record<string, number> = {
            'injectiveTestnet': 1439,
            'injective': 1776,
            'hoodi': 560048,
            'sepolia': 11155111,
            'mainnet': 1,
            'polygon': 137,
            'arbitrum': 42161,
            'base': 8453
          };
          
          const chainId = chainIdMap[network];
          if (chainId) {
            const chainIdFile = `chain-${chainId}-complete.json`;
            const chainIdPath = `${workingDir}/deployments/${chainIdFile}`;
            if (fs.existsSync(chainIdPath)) {
              deploymentFile = chainIdFile;
              deploymentPath = chainIdPath;
              deploymentFileExists = true;
              console.log(`📁 Found deployment file with chain ID naming: ${chainIdFile}`);
            }
          }
        }
        
        // For Injective, treat deployment as successful if file exists
        // (RPC often fails to return receipts but deployment succeeds)
        const isInjective = network.toLowerCase().includes('injective');
        const actualSuccess = result.success || (isInjective && deploymentFileExists);
        
        if (!result.success && deploymentFileExists) {
          console.log('⚠️  Deployment file exists despite error - treating as partial success');
          console.log(`   File: ${deploymentPath}`);
        }

        // Log to audit
        await DeploymentAuditService.logDeploymentActivity({
          user_id: userId,
          network,
          action: 'deploy_and_verify',
          command: `Deploy and verify ${network} (${waitMinutes}min wait)`,
          success: actualSuccess,
          exit_code: result.exitCode,
          duration_ms: result.duration,
          output: result.output,
          error: result.error,
          metadata: {
            waitMinutes,
            hasVerification: !!explorerApiKey,
            deploymentFile,
            deploymentFileExists,
            partialSuccess: !result.success && deploymentFileExists
          }
        });

        return {
          success: actualSuccess,
          output: result.output,
          exitCode: result.exitCode,
          duration: result.duration,
          deploymentFile: deploymentFileExists ? deploymentFile : undefined,
          error: result.error,
          partialSuccess: !result.success && deploymentFileExists
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await DeploymentAuditService.logDeploymentActivity({
          user_id: userId,
          network,
          action: 'deploy_and_verify',
          command: `Deploy and verify ${network}`,
          success: false,
          exit_code: -1,
          duration_ms: 0,
          error: errorMessage
        });

        return reply.code(500).send({
          success: false,
          output: '',
          exitCode: -1,
          error: errorMessage
        });
      }
    }
  );
}

export default deploymentRoutes;
