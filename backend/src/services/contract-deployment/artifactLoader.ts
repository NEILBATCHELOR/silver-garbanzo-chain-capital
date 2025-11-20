/**
 * Contract Artifact Loader
 * Loads compiled contract artifacts from Foundry output directory
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { ContractArtifact, ContractType, CONTRACT_FILE_NAMES } from './types';

export class ArtifactLoader {
  private readonly artifactsPath: string;

  constructor(artifactsPath?: string) {
    // Default to foundry-contracts/out directory
    this.artifactsPath = artifactsPath || join(
      process.cwd(),
      '..',
      'frontend',
      'foundry-contracts',
      'out'
    );
  }

  async loadArtifact(contractType: ContractType): Promise<ContractArtifact> {
    const contractName = CONTRACT_FILE_NAMES[contractType];
    if (!contractName) {
      throw new Error(`Unknown contract type: ${contractType}`);
    }

    const artifactPath = join(
      this.artifactsPath,
      `${contractName}.sol`,
      `${contractName}.json`
    );

    try {
      const data = await readFile(artifactPath, 'utf-8');
      const artifact = JSON.parse(data);

      // Parse metadata if it exists as a JSON string
      let metadata = artifact.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.warn(`Could not parse metadata for ${contractName}`);
          metadata = undefined;
        }
      }

      return {
        abi: artifact.abi || [],
        bytecode: artifact.bytecode || { object: '0x' },
        deployedBytecode: artifact.deployedBytecode,
        metadata,
      };
    } catch (error) {
      throw new Error(
        `Failed to load artifact for ${contractName}: ${error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Load multiple artifacts
   */
  async loadArtifacts(
    contractTypes: ContractType[]
  ): Promise<Map<ContractType, ContractArtifact>> {
    const artifacts = new Map<ContractType, ContractArtifact>();

    for (const contractType of contractTypes) {
      const artifact = await this.loadArtifact(contractType);
      artifacts.set(contractType, artifact);
    }

    return artifacts;
  }

  /**
   * Validate artifact has deployable bytecode
   */
  validateArtifact(artifact: ContractArtifact): boolean {
    if (!artifact.bytecode || !artifact.bytecode.object) {
      return false;
    }

    if (artifact.bytecode.object === '0x' || artifact.bytecode.object.length < 3) {
      return false;
    }

    // Check for unlinked libraries
    if (
      artifact.bytecode.linkReferences &&
      Object.keys(artifact.bytecode.linkReferences).length > 0
    ) {
      console.warn('Warning: Contract has unlinked library references');
      return false;
    }

    return true;
  }
}
