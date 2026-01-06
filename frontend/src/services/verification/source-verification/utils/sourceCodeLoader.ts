// /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/src/services/verification/source-verification/utils/sourceCodeLoader.ts

import fs from 'fs';
import path from 'path';

/**
 * Source Code Loader
 * 
 * Loads Solidity source code from foundry-contracts directory
 * 
 * Future enhancements:
 * - Implement source flattening for multi-file contracts
 * - Handle import statements
 * - Support JSON standard input format
 */
export class SourceCodeLoader {
  private readonly contractsRoot = '/Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts';
  
  /**
   * Load source code for a contract
   * 
   * @param contractPath - Path like "src/masters/ERC20Master.sol:ERC20Master"
   * @returns Source code as string
   */
  async loadSource(contractPath: string): Promise<string> {
    // Extract file path (before the colon)
    const filePath = contractPath.split(':')[0];
    const fullPath = path.join(this.contractsRoot, filePath);
    
    try {
      // Read file synchronously for now
      // In browser environment, this would need to be preloaded or use a different approach
      const sourceCode = fs.readFileSync(fullPath, 'utf-8');
      return sourceCode;
    } catch (error: any) {
      throw new Error(`Failed to load source code from ${filePath}: ${error.message}`);
    }
  }
  
  /**
   * Load compiler settings from foundry.toml
   * 
   * Returns default settings for now
   */
  async getCompilerSettings(): Promise<{
    version: string;
    optimizationEnabled: boolean;
    optimizationRuns: number;
  }> {
    // For now, return hardcoded settings that match our foundry.toml
    return {
      version: 'v0.8.19+commit.7dd6d404',
      optimizationEnabled: true,
      optimizationRuns: 200
    };
  }
  
  /**
   * Check if source file exists
   */
  async sourceExists(contractPath: string): Promise<boolean> {
    const filePath = contractPath.split(':')[0];
    const fullPath = path.join(this.contractsRoot, filePath);
    
    try {
      return fs.existsSync(fullPath);
    } catch {
      return false;
    }
  }
}

// Export singleton
export const sourceCodeLoader = new SourceCodeLoader();
