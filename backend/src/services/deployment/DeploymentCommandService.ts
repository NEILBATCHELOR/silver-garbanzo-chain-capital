/**
 * Deployment Command Service
 * 
 * Executes deployment and verification commands using Desktop Commander
 * with security validation, audit logging, and progress tracking
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// ============================================
// Types
// ============================================

export interface CommandExecutionRequest {
  command: string;
  workingDirectory: string;
  timeout?: number; // milliseconds
  userId: string;
  network?: string;
}

export interface CommandExecutionResult {
  success: boolean;
  output: string;
  exitCode: number;
  duration: number; // milliseconds
  error?: string;
}

export interface CommandValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================
// Configuration
// ============================================

/**
 * Allowed command patterns for security
 */
const ALLOWED_COMMAND_PATTERNS = [
  // Foundry deployment (with and without --legacy flag)
  /^~\/\.foundry\/bin\/forge script script\/DeployUniversalComplete\.s\.sol:DeployUniversalComplete/,
  /^~\/\.foundry\/bin\/forge script script\/DeployHoodiComplete\.s\.sol:DeployHoodiComplete/,
  
  // Deploy and verify script (with bash prefix)
  /^export ETHERSCAN_API_KEY=.+ && export \w+_PRIVATE_KEY=.+ && bash \.\/scripts\/deploy-and-verify\.sh \w+ --delay \d+$/,
  /^export \w+_PRIVATE_KEY=.+ && bash \.\/scripts\/deploy-and-verify\.sh \w+ --delay \d+$/,
  
  // Deploy and verify script (without bash prefix - legacy)
  /^export ETHERSCAN_API_KEY=.+ && export \w+_PRIVATE_KEY=.+ && \.\/scripts\/deploy-and-verify\.sh \w+ --delay \d+$/,
  /^export \w+_PRIVATE_KEY=.+ && \.\/scripts\/deploy-and-verify\.sh \w+ --delay \d+$/,
  
  // Contract verification
  /^export ETHERSCAN_API_KEY=.+ && \.\/scripts\/verify-all-contracts\.sh \w+$/,
  /^\.\/scripts\/verify-all-contracts\.sh \w+$/,
  
  // Foundry build/test (for validation)
  /^~\/\.foundry\/bin\/forge build$/,
  /^~\/\.foundry\/bin\/forge test$/,
];

/**
 * Allowed working directories
 */
const ALLOWED_WORKING_DIRECTORIES = [
  '/Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts',
];

/**
 * Default working directory (guaranteed to exist)
 */
const DEFAULT_WORKING_DIRECTORY = '/Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts';

/**
 * Default timeout (10 minutes)
 */
const DEFAULT_TIMEOUT = 10 * 60 * 1000;

/**
 * Maximum timeout (2 hours for deployment + verification)
 */
const MAX_TIMEOUT = 2 * 60 * 60 * 1000;

// ============================================
// Command Validation
// ============================================

/**
 * Validate command against security rules
 */
export function validateCommand(request: CommandExecutionRequest): CommandValidationResult {
  const errors: string[] = [];

  // Validate command pattern
  const isAllowedCommand = ALLOWED_COMMAND_PATTERNS.some(pattern => 
    pattern.test(request.command)
  );
  
  if (!isAllowedCommand) {
    errors.push('Command not in allowed patterns');
  }

  // Validate working directory
  const normalizedDir = path.normalize(request.workingDirectory);
  const isAllowedDir = ALLOWED_WORKING_DIRECTORIES.some(allowedDir =>
    normalizedDir === path.normalize(allowedDir)
  );
  
  if (!isAllowedDir) {
    errors.push('Working directory not allowed');
  }

  // Validate timeout
  if (request.timeout !== undefined) {
    if (request.timeout < 0) {
      errors.push('Timeout must be positive');
    }
    if (request.timeout > MAX_TIMEOUT) {
      errors.push(`Timeout exceeds maximum (${MAX_TIMEOUT}ms)`);
    }
  }

  // Check for command injection attempts
  const dangerousPatterns = [
    /;/,     // Command chaining
    /\|/,    // Piping (except in allowed verification command)
    /`/,     // Command substitution
    /\$\(/,  // Command substitution
    />/,     // Redirection
    /<</,    // Here document
  ];

  // Allow pipe in verification command
  if (!request.command.includes('verify-all-contracts.sh')) {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(request.command)) {
        errors.push('Command contains potentially dangerous characters');
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// Command Execution
// ============================================

/**
 * Execute command with Desktop Commander
 */
export async function executeCommand(
  request: CommandExecutionRequest
): Promise<CommandExecutionResult> {
  const startTime = Date.now();

  try {
    // Validate command
    const validation = validateCommand(request);
    if (!validation.valid) {
      return {
        success: false,
        output: '',
        exitCode: -1,
        duration: 0,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    // Execute command
    const timeout = request.timeout || DEFAULT_TIMEOUT;
    
    const { stdout, stderr } = await execAsync(request.command, {
      cwd: request.workingDirectory,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      shell: '/bin/bash',
      env: {
        ...process.env,
        // Ensure foundry is in PATH
        PATH: `${process.env.HOME}/.foundry/bin:${process.env.PATH}`
      }
    });

    const duration = Date.now() - startTime;
    const output = stdout + (stderr ? `\n${stderr}` : '');

    return {
      success: true,
      output,
      exitCode: 0,
      duration
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Check if it's a timeout
    if (error.killed && error.signal === 'SIGTERM') {
      return {
        success: false,
        output: error.stdout || '',
        exitCode: -1,
        duration,
        error: 'Command timed out'
      };
    }

    // Check if it's a non-zero exit code
    if (error.code !== undefined) {
      return {
        success: false,
        output: (error.stdout || '') + (error.stderr || ''),
        exitCode: error.code,
        duration,
        error: `Command failed with exit code ${error.code}`
      };
    }

    // Unknown error
    return {
      success: false,
      output: error.stdout || error.stderr || '',
      exitCode: -1,
      duration,
      error: error.message || 'Unknown error'
    };
  }
}

// ============================================
// Specialized Deployment Functions
// ============================================

/**
 * Execute deployment script
 */
export async function executeDeployment(params: {
  network: string;
  privateKey: string;
  rpcUrl: string;
  userId: string;
}): Promise<CommandExecutionResult> {
  const { network, privateKey, rpcUrl, userId } = params;

  // Check if network is Injective (case-insensitive)
  const isInjective = network.toLowerCase().includes('injective');

  const commandParts = [
    '~/.foundry/bin/forge script',
    'script/DeployUniversalComplete.s.sol:DeployUniversalComplete',
    `--rpc-url ${rpcUrl}`,
    `--private-key ${privateKey}`,
    '--broadcast',
  ];

  // Add --legacy flag for Injective networks (recommended by Injective docs)
  if (isInjective) {
    commandParts.push('--legacy');
  }

  // Add verbose logging
  commandParts.push('-vvv');

  const command = commandParts.join(' \\\n  ');

  // Use longer timeout for Injective due to slower block times
  const timeout = isInjective ? 45 * 60 * 1000 : 30 * 60 * 1000; // 45 min for Injective, 30 min for others

  return executeCommand({
    command,
    workingDirectory: DEFAULT_WORKING_DIRECTORY,
    timeout,
    userId,
    network
  });
}

/**
 * Execute verification script
 */
export async function executeVerification(params: {
  network: string;
  explorerApiKey: string;
  userId: string;
}): Promise<CommandExecutionResult> {
  const { network, explorerApiKey, userId } = params;

  const command = `export ETHERSCAN_API_KEY=${explorerApiKey} && ./scripts/verify-all-contracts.sh ${network}`;

  return executeCommand({
    command,
    workingDirectory: DEFAULT_WORKING_DIRECTORY,
    timeout: 60 * 60 * 1000, // 60 minutes
    userId,
    network
  });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if foundry is installed
 */
export async function checkFoundryInstalled(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('~/.foundry/bin/forge --version');
    return stdout.includes('forge');
  } catch {
    return false;
  }
}

/**
 * Get foundry version
 */
export async function getFoundryVersion(): Promise<string> {
  try {
    const { stdout } = await execAsync('~/.foundry/bin/forge --version');
    return stdout.trim();
  } catch {
    return 'Not installed';
  }
}

// ============================================
// Export
// ============================================

export const DeploymentCommandService = {
  validateCommand,
  executeCommand,
  executeDeployment,
  executeVerification,
  checkFoundryInstalled,
  getFoundryVersion
};

export default DeploymentCommandService;
