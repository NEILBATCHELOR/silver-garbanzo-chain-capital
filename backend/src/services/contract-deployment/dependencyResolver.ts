/**
 * Dependency Resolver Service
 * Manages contract dependencies and generates constructor arguments
 */

import { ContractType, DeploymentResult } from './types';

export interface ContractDependencies {
  contractType: ContractType;
  constructorParams: ConstructorParam[];
}

export interface ConstructorParam {
  name: string;
  type: 'address' | 'uint256' | 'string' | 'bool' | 'bytes';
  dependsOn?: ContractType; // If address, which contract provides it
  defaultValue?: any; // Fallback if dependency not deployed
  required: boolean;
}

export class DependencyResolver {
  private deployedAddresses: Map<ContractType, string> = new Map();

  /**
   * Track a successfully deployed contract
   */
  recordDeployment(contractType: ContractType, address: string): void {
    this.deployedAddresses.set(contractType, address);
  }

  /**
   * Get deployed address for a contract type
   */
  getAddress(contractType: ContractType): string | undefined {
    return this.deployedAddresses.get(contractType);
  }

  /**
   * Check if all dependencies for a contract are deployed
   */
  canDeploy(contractType: ContractType): { canDeploy: boolean; missing: ContractType[] } {
    const deps = this.getDependencies(contractType);
    const missing: ContractType[] = [];

    for (const param of deps.constructorParams) {
      if (param.required && param.dependsOn && !this.deployedAddresses.has(param.dependsOn)) {
        missing.push(param.dependsOn);
      }
    }

    return { canDeploy: missing.length === 0, missing };
  }

  /**
   * Generate constructor arguments for a contract
   */
  generateConstructorArgs(contractType: ContractType): any[] {
    const deps = this.getDependencies(contractType);
    const args: any[] = [];

    for (const param of deps.constructorParams) {
      if (param.dependsOn) {
        const address = this.deployedAddresses.get(param.dependsOn);
        if (!address && param.required) {
          throw new Error(
            `Cannot deploy ${contractType}: missing dependency ${param.dependsOn}`
          );
        }
        args.push(address || param.defaultValue || '0x0000000000000000000000000000000000000000');
      } else {
        args.push(param.defaultValue);
      }
    }

    return args;
  }

  /**
   * Get dependency configuration for each contract type
   */
  private getDependencies(contractType: ContractType): ContractDependencies {
    const deps: Record<string, ContractDependencies> = {
      // ============ Phase 1: Infrastructure (No Dependencies) ============
      policy_registry: {
        contractType: 'policy_registry',
        constructorParams: [],
      },
      token_registry: {
        contractType: 'token_registry',
        constructorParams: [],
      },
      factory_registry: {
        contractType: 'factory_registry',
        constructorParams: [],
      },
      extension_registry: {
        contractType: 'extension_registry',
        constructorParams: [],
      },

      // ============ Phase 2: Governance ============
      upgrade_governor: {
        contractType: 'upgrade_governor',
        constructorParams: [
          {
            name: 'upgraders',
            type: 'address',
            required: false,
            defaultValue: [], // Will be populated with deployer address at runtime
          },
          {
            name: 'requiredApprovals',
            type: 'uint256',
            required: false,
            defaultValue: 1,
          },
          {
            name: 'timeLockDuration',
            type: 'uint256',
            required: false,
            defaultValue: 86400, // 24 hours default
          },
        ],
      },
      policy_engine: {
        contractType: 'policy_engine',
        constructorParams: [
          {
            name: 'policyRegistry',
            type: 'address',
            dependsOn: 'policy_registry',
            required: true,
          },
        ],
      },

      // ============ Phase 3: Masters (No Dependencies) ============
      erc20_master: {
        contractType: 'erc20_master',
        constructorParams: [],
      },
      erc721_master: {
        contractType: 'erc721_master',
        constructorParams: [],
      },
      erc1155_master: {
        contractType: 'erc1155_master',
        constructorParams: [],
      },
      erc3525_master: {
        contractType: 'erc3525_master',
        constructorParams: [],
      },
      erc4626_master: {
        contractType: 'erc4626_master',
        constructorParams: [],
      },
      erc1400_master: {
        contractType: 'erc1400_master',
        constructorParams: [],
      },
      erc20_rebasing_master: {
        contractType: 'erc20_rebasing_master',
        constructorParams: [],
      },

      // ============ Phase 4: Extension Factories ============
      erc20_extension_factory: {
        contractType: 'erc20_extension_factory',
        constructorParams: [
          {
            name: 'extensionRegistry',
            type: 'address',
            dependsOn: 'extension_registry',
            required: true,
          },
          {
            name: 'policyEngine',
            type: 'address',
            dependsOn: 'policy_engine',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'upgradeGovernor',
            type: 'address',
            dependsOn: 'upgrade_governor',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },
      erc721_extension_factory: {
        contractType: 'erc721_extension_factory',
        constructorParams: [
          {
            name: 'extensionRegistry',
            type: 'address',
            dependsOn: 'extension_registry',
            required: true,
          },
          {
            name: 'policyEngine',
            type: 'address',
            dependsOn: 'policy_engine',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'upgradeGovernor',
            type: 'address',
            dependsOn: 'upgrade_governor',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },
      erc1155_extension_factory: {
        contractType: 'erc1155_extension_factory',
        constructorParams: [
          {
            name: 'extensionRegistry',
            type: 'address',
            dependsOn: 'extension_registry',
            required: true,
          },
          {
            name: 'policyEngine',
            type: 'address',
            dependsOn: 'policy_engine',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'upgradeGovernor',
            type: 'address',
            dependsOn: 'upgrade_governor',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },
      erc3525_extension_factory: {
        contractType: 'erc3525_extension_factory',
        constructorParams: [
          {
            name: 'extensionRegistry',
            type: 'address',
            dependsOn: 'extension_registry',
            required: true,
          },
          {
            name: 'policyEngine',
            type: 'address',
            dependsOn: 'policy_engine',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'upgradeGovernor',
            type: 'address',
            dependsOn: 'upgrade_governor',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },
      erc4626_extension_factory: {
        contractType: 'erc4626_extension_factory',
        constructorParams: [
          {
            name: 'extensionRegistry',
            type: 'address',
            dependsOn: 'extension_registry',
            required: true,
          },
          {
            name: 'policyEngine',
            type: 'address',
            dependsOn: 'policy_engine',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'upgradeGovernor',
            type: 'address',
            dependsOn: 'upgrade_governor',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },
      erc1400_extension_factory: {
        contractType: 'erc1400_extension_factory',
        constructorParams: [
          {
            name: 'extensionRegistry',
            type: 'address',
            dependsOn: 'extension_registry',
            required: true,
          },
          {
            name: 'policyEngine',
            type: 'address',
            dependsOn: 'policy_engine',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'upgradeGovernor',
            type: 'address',
            dependsOn: 'upgrade_governor',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },

      // ============ Phase 5: Token Factories ============
      erc20_factory: {
        contractType: 'erc20_factory',
        constructorParams: [
          {
            name: 'erc20Master',
            type: 'address',
            dependsOn: 'erc20_master',
            required: true,
          },
          {
            name: 'erc20RebasingMaster',
            type: 'address',
            dependsOn: 'erc20_rebasing_master',
            required: true,
          },
          {
            name: 'erc20Beacon',
            type: 'address',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'erc20RebasingBeacon',
            type: 'address',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'extensionFactory',
            type: 'address',
            dependsOn: 'erc20_extension_factory',
            required: true,
          },
          {
            name: 'policyEngine',
            type: 'address',
            dependsOn: 'policy_engine',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'tokenRegistry',
            type: 'address',
            dependsOn: 'token_registry',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'factoryRegistry',
            type: 'address',
            dependsOn: 'factory_registry',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },
      erc721_factory: {
        contractType: 'erc721_factory',
        constructorParams: [
          {
            name: 'erc721Master',
            type: 'address',
            dependsOn: 'erc721_master',
            required: true,
          },
          {
            name: 'erc721Beacon',
            type: 'address',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'extensionFactory',
            type: 'address',
            dependsOn: 'erc721_extension_factory',
            required: true,
          },
          {
            name: 'policyEngine',
            type: 'address',
            dependsOn: 'policy_engine',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'tokenRegistry',
            type: 'address',
            dependsOn: 'token_registry',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'factoryRegistry',
            type: 'address',
            dependsOn: 'factory_registry',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },
      erc1155_factory: {
        contractType: 'erc1155_factory',
        constructorParams: [
          {
            name: 'erc1155Master',
            type: 'address',
            dependsOn: 'erc1155_master',
            required: true,
          },
          {
            name: 'erc1155Beacon',
            type: 'address',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'extensionFactory',
            type: 'address',
            dependsOn: 'erc1155_extension_factory',
            required: true,
          },
          {
            name: 'policyEngine',
            type: 'address',
            dependsOn: 'policy_engine',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'tokenRegistry',
            type: 'address',
            dependsOn: 'token_registry',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'factoryRegistry',
            type: 'address',
            dependsOn: 'factory_registry',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },
      erc3525_factory: {
        contractType: 'erc3525_factory',
        constructorParams: [
          {
            name: 'erc3525Master',
            type: 'address',
            dependsOn: 'erc3525_master',
            required: true,
          },
          {
            name: 'erc3525Beacon',
            type: 'address',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'extensionFactory',
            type: 'address',
            dependsOn: 'erc3525_extension_factory',
            required: true,
          },
          {
            name: 'policyEngine',
            type: 'address',
            dependsOn: 'policy_engine',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'tokenRegistry',
            type: 'address',
            dependsOn: 'token_registry',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'factoryRegistry',
            type: 'address',
            dependsOn: 'factory_registry',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },
      erc4626_factory: {
        contractType: 'erc4626_factory',
        constructorParams: [
          {
            name: 'erc4626Master',
            type: 'address',
            dependsOn: 'erc4626_master',
            required: true,
          },
          {
            name: 'erc4626Beacon',
            type: 'address',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'extensionFactory',
            type: 'address',
            dependsOn: 'erc4626_extension_factory',
            required: true,
          },
          {
            name: 'policyEngine',
            type: 'address',
            dependsOn: 'policy_engine',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'tokenRegistry',
            type: 'address',
            dependsOn: 'token_registry',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'factoryRegistry',
            type: 'address',
            dependsOn: 'factory_registry',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },
      erc1400_factory: {
        contractType: 'erc1400_factory',
        constructorParams: [
          {
            name: 'erc1400Master',
            type: 'address',
            dependsOn: 'erc1400_master',
            required: true,
          },
          {
            name: 'erc1400Beacon',
            type: 'address',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'extensionFactory',
            type: 'address',
            dependsOn: 'erc1400_extension_factory',
            required: true,
          },
          {
            name: 'policyEngine',
            type: 'address',
            dependsOn: 'policy_engine',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'tokenRegistry',
            type: 'address',
            dependsOn: 'token_registry',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
          {
            name: 'factoryRegistry',
            type: 'address',
            dependsOn: 'factory_registry',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },

      // ============ Universal Extension Factory ============
      universal_extension_factory: {
        contractType: 'universal_extension_factory',
        constructorParams: [
          {
            name: 'extensionRegistry',
            type: 'address',
            dependsOn: 'extension_registry',
            required: true,
          },
        ],
      },

      // ============ Beacon Proxy Factory ============
      beacon_proxy_factory: {
        contractType: 'beacon_proxy_factory',
        constructorParams: [
          {
            name: 'upgradeGovernor',
            type: 'address',
            dependsOn: 'upgrade_governor',
            required: false,
            defaultValue: '0x0000000000000000000000000000000000000000',
          },
        ],
      },

      // ============ MultiSig Wallet Factory ============
      multisig_wallet_factory: {
        contractType: 'multisig_wallet_factory',
        constructorParams: [], // No dependencies
      },
    };

    const config = deps[contractType];
    if (!config) {
      return {
        contractType,
        constructorParams: [],
      };
    }

    return config;
  }

  /**
   * Clear all tracked deployments (for testing)
   */
  clear(): void {
    this.deployedAddresses.clear();
  }
}
