/**
 * Source Code Loader Service
 * Loads Solidity source code from the contracts directory
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { ContractType, CONTRACT_FILE_NAMES } from './types';

export interface SourceCodeData {
    sourceCode: string;
    licenseType: string;
    contractName: string;
}

export class SourceCodeLoader {
    private readonly contractsPath: string;

    constructor(contractsPath?: string) {
        // Default to foundry-contracts/src directory
        this.contractsPath = contractsPath || join(
            process.cwd(),
            '..',
            'frontend',
            'foundry-contracts',
            'src'
        );
    }

    /**
     * Load source code for a contract by contract type
     */
    async loadSourceCode(contractType: ContractType): Promise<SourceCodeData> {
        const contractName = CONTRACT_FILE_NAMES[contractType];
        if (!contractName) {
            throw new Error(`Unknown contract type: ${contractType}`);
        }

        const sourceFilePath = this.getSourceFilePath(contractName);

        try {
            const sourceCode = await readFile(sourceFilePath, 'utf-8');
            const licenseType = this.extractLicenseType(sourceCode);

            return {
                sourceCode,
                licenseType,
                contractName,
            };
        } catch (error) {
            throw new Error(
                `Failed to load source code for ${contractName}: ${error instanceof Error ? error.message : 'Unknown error'
                }`
            );
        }
    }

    /**
     * Load multiple source codes
     */
    async loadSourceCodes(
        contractTypes: ContractType[]
    ): Promise<Map<ContractType, SourceCodeData>> {
        const sourceCodeMap = new Map<ContractType, SourceCodeData>();

        for (const contractType of contractTypes) {
            try {
                const sourceData = await this.loadSourceCode(contractType);
                sourceCodeMap.set(contractType, sourceData);
            } catch (error) {
                console.warn(
                    `Warning: Could not load source code for ${contractType}:`,
                    error
                );
                // Continue with other contracts even if one fails
            }
        }

        return sourceCodeMap;
    }

    /**
     * Extract SPDX license identifier from source code
     */
    private extractLicenseType(sourceCode: string): string {
        // Match SPDX-License-Identifier: <LICENSE>
        const spdxMatch = sourceCode.match(
            /SPDX-License-Identifier:\s*([^\s\n]+)/i
        );

        if (spdxMatch && spdxMatch[1]) {
            return spdxMatch[1].trim();
        }

        // Default to empty string if no license found
        return '';
    }

    /**
     * Get source file path for a contract
     * Determines the subdirectory based on contract type
     */
    private getSourceFilePath(contractName: string): string {
        // Map contract names to their subdirectories
        const directoryMap: Record<string, string> = {
            // Masters
            ERC20Master: 'masters',
            ERC721Master: 'masters',
            ERC1155Master: 'masters',
            ERC3525Master: 'masters',
            ERC4626Master: 'masters',
            ERC1400Master: 'masters',

            // Factories
            ERC20Factory: 'factories',
            ERC721Factory: 'factories',
            ERC1155Factory: 'factories',
            ERC3525Factory: 'factories',
            ERC4626Factory: 'factories',
            ERC1400Factory: 'factories',
            ERC20ExtensionFactory: 'factories',
            ERC721ExtensionFactory: 'factories',
            ERC1155ExtensionFactory: 'factories',
            ERC3525ExtensionFactory: 'factories',
            ERC4626ExtensionFactory: 'factories',
            ERC1400ExtensionFactory: 'factories',
            UniversalExtensionFactory: 'factories',

            // Infrastructure
            ExtensionRegistry: 'factories',
            TokenRegistry: 'registry',
            PolicyEngine: 'policy',
            UpgradeGovernor: 'governance',
            BeaconProxyFactory: 'deployers/beacon',
            MultiSigWalletFactory: 'wallets',
        };

        const subdirectory = directoryMap[contractName] || '';
        return join(this.contractsPath, subdirectory, `${contractName}.sol`);
    }
}
