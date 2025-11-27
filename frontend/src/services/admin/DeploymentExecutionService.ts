/**
 * Deployment Execution Service
 * 
 * Executes contract deployments via backend API
 * Handles the complete workflow:
 * 1. Deploy contracts via forge script
 * 2. Wait for block explorer indexing
 * 3. Verify contracts
 * 4. Return deployment artifacts for import
 */

import {
  DeploymentConfig,
  DeploymentResult,
  DeploymentStatus,
  ContractDeploymentOrchestrator
} from './ContractDeploymentOrchestrator';
import { supabase } from '@/infrastructure/database/client';

// ============================================
// Types
// ============================================

interface ApiDeploymentResponse {
  success: boolean;
  output: string;
  exitCode: number;
  duration: number;
  deploymentFile?: string;
  error?: string;
}

// ============================================
// Deployment Execution
// ============================================

/**
 * Execute complete deployment workflow via backend API
 */
export async function executeCompleteDeploymentWorkflow(
  config: DeploymentConfig,
  onStatusChange: (status: DeploymentStatus) => void
): Promise<DeploymentResult> {
  const networkConfig = ContractDeploymentOrchestrator.getNetworkConfig(config.network);
  if (!networkConfig) {
    throw new Error(`Invalid network: ${config.network}`);
  }

  console.group('🚀 Contract Deployment Workflow');
  console.log('📋 Configuration:', {
    network: config.network,
    chainId: networkConfig.chainId,
    environment: config.environment,
    waitMinutes: config.waitMinutes,
    hasExplorerKey: !!config.explorerApiKey
  });

  try {
    // Phase 1: Start Deployment
    console.log('📦 Phase 1: Starting deployment...');
    onStatusChange({
      phase: 'deploying',
      message: `Starting deployment to ${config.network}...`,
      progress: 10
    });

    // Get current session for authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Not authenticated. Please log in and try again.');
    }

    console.log('🔑 Authentication successful');

    // Call backend API with authentication
    console.log('📡 Calling backend API: /api/deployment/deploy-and-verify');
    const apiPayload = {
      network: config.network,
      privateKey: config.deployerPrivateKey.substring(0, 8) + '...[REDACTED]',
      superAdminAddress: config.superAdminAddress,
      explorerApiKey: config.explorerApiKey ? '[CONFIGURED]' : '[NOT SET]',
      waitMinutes: config.waitMinutes || 45
    };
    console.log('📤 Request payload:', apiPayload);

    const response = await fetch('/api/deployment/deploy-and-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        network: config.network,
        privateKey: config.deployerPrivateKey,
        superAdminAddress: config.superAdminAddress,
        explorerApiKey: config.explorerApiKey,
        waitMinutes: config.waitMinutes || 45
      })
    });

    console.log(`📥 API Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      // Check if response has a body before trying to parse
      const contentType = response.headers.get('content-type');
      let errorData: any = {};
      
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json();
        } catch (e) {
          console.error('Failed to parse error response as JSON:', e);
        }
      }
      
      // Handle specific status codes
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      console.error('❌ API Error Response:', errorData);
      throw new Error(errorData.error || `API request failed: ${response.statusText}`);
    }

    const apiResult: ApiDeploymentResponse = await response.json();
    console.log('✅ API Response received:', {
      success: apiResult.success,
      exitCode: apiResult.exitCode,
      duration: `${apiResult.duration}ms`,
      outputLength: apiResult.output?.length || 0,
      errorLength: apiResult.error?.length || 0,
      deploymentFile: apiResult.deploymentFile
    });

    if (!apiResult.success) {
      console.error('❌ Deployment failed!');
      console.error('Exit Code:', apiResult.exitCode);
      if (apiResult.error) {
        console.error('Error Message:', apiResult.error);
      }
      if (apiResult.output) {
        console.group('📜 Full Deployment Output');
        console.log(apiResult.output);
        console.groupEnd();
      }
      
      // Create detailed error message
      let detailedError = apiResult.error || 'Deployment failed';
      if (apiResult.output) {
        // Extract key error lines from output
        const errorLines = apiResult.output
          .split('\n')
          .filter(line => 
            line.includes('Error:') || 
            line.includes('❌') || 
            line.includes('failed') ||
            line.includes('Revert')
          )
          .slice(0, 5); // First 5 error lines
        
        if (errorLines.length > 0) {
          detailedError += '\n\nKey errors:\n' + errorLines.join('\n');
        }
      }
      
      throw new Error(detailedError);
    }

    console.log('✅ Deployment command completed successfully');

    // Phase 2: Deployment in progress
    console.log('⏳ Phase 2: Processing deployment output...');
    onStatusChange({
      phase: 'deploying',
      message: 'Deployment executing...',
      progress: 40
    });

    // Phase 3: Wait complete
    console.log('⏸️  Phase 3: Waiting for block explorer indexing...');
    onStatusChange({
      phase: 'waiting',
      message: 'Waiting for block explorer indexing...',
      progress: 60
    });

    // Phase 4: Verification (if applicable)
    if (config.explorerApiKey) {
      console.log('🔍 Phase 4: Verifying contracts...');
      onStatusChange({
        phase: 'verifying',
        message: 'Verifying contracts...',
        progress: 80
      });
    }

    // Phase 5: Complete
    const result: DeploymentResult = {
      success: true,
      deploymentFile: apiResult.deploymentFile || `${config.network}-complete.json`,
      contracts: {}, // Would be parsed from deployment file
      transactionHashes: [], // Would be parsed from output
      timestamp: new Date().toISOString(),
      network: config.network,
      chainId: networkConfig.chainId
    };

    console.log('🎉 Phase 5: Deployment workflow complete!');
    console.log('📦 Result:', result);
    console.groupEnd();

    onStatusChange({
      phase: 'complete',
      message: 'Deployment workflow complete!',
      progress: 100,
      deploymentResult: result
    });

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('💥 Deployment workflow failed!');
    console.error('Error:', errorMessage);
    console.groupEnd();
    
    onStatusChange({
      phase: 'error',
      message: errorMessage,
      progress: 0,
      error: errorMessage
    });
    throw error;
  }
}

// ============================================
// Exports
// ============================================

export const DeploymentExecutionService = {
  executeCompleteDeploymentWorkflow
};

export default DeploymentExecutionService;
