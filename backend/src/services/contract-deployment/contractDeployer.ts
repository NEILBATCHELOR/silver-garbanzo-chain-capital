/**
 * Contract Deployer Service
 * Handles deploying contracts to blockchain networks using ethers.js
 */

import { ethers, Contract, ContractFactory } from 'ethers';
import { ContractArtifact, ContractType, DeploymentResult } from './types';
import { isUUPSContract, getUUPSInitParams, deployUUPSContract } from './uupsDeployer';

export class ContractDeployer {
  private provider: ethers.Provider;
  private signer: ethers.Wallet;
  private network: string;

  constructor(rpcUrl: string, privateKey: string, network?: string) {
    // Create provider with custom configuration for non-standard EVM chains
    this.provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
      staticNetwork: true, // Don't attempt network detection
      batchMaxCount: 1, // Disable batching for compatibility
    });

    this.network = network || 'unknown';

    // Debug private key format
    console.log('🔑 Private Key Debug:', {
      length: privateKey?.length,
      hasPrefix: privateKey?.startsWith('0x'),
      isHex: /^(0x)?[0-9a-fA-F]+$/.test(privateKey || ''),
      expectedLength: 64, // without 0x
      actualLengthWithoutPrefix: privateKey?.replace('0x', '').length,
    });

    // Ensure private key has 0x prefix for ethers.js
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    this.signer = new ethers.Wallet(formattedKey, this.provider);
  }

  /**
   * Deploy a single contract
   */
  async deployContract(
    contractType: ContractType,
    artifact: ContractArtifact,
    deployArgs: any[] = [],
    gasSettings?: {
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
      gasLimit?: string;
    }
  ): Promise<DeploymentResult> {
    try {
      console.log(`Deploying ${contractType}...`);

      // Check if this is a UUPS contract
      if (isUUPSContract(contractType)) {
        return await this.deployUUPSContractWithProxy(
          contractType,
          artifact,
          gasSettings
        );
      }

      // Standard contract deployment
      return await this.deployStandardContract(
        contractType,
        artifact,
        deployArgs,
        gasSettings
      );
    } catch (error) {
      console.error(`❌ Failed to deploy ${contractType}:`, error);

      return {
        success: false,
        contractType,
        error: error instanceof Error ? error.message : 'Deployment failed',
        verificationStatus: 'not_requested',
      };
    }
  }

  /**
   * Deploy a UUPS upgradeable contract with proxy
   */
  private async deployUUPSContractWithProxy(
    contractType: ContractType,
    artifact: ContractArtifact,
    gasSettings?: {
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
      gasLimit?: string;
    }
  ): Promise<DeploymentResult> {
    console.log(`📦 Deploying UUPS contract: ${contractType} with proxy...`);

    // Create contract factory for implementation
    const factory = new ContractFactory(
      artifact.abi,
      artifact.bytecode.object,
      this.signer
    );

    // Prepare deployment transaction options
    const txOptions: any = {};
    if (gasSettings?.maxFeePerGas) {
      txOptions.maxFeePerGas = ethers.parseUnits(gasSettings.maxFeePerGas, 'gwei');
    }
    if (gasSettings?.maxPriorityFeePerGas) {
      txOptions.maxPriorityFeePerGas = ethers.parseUnits(
        gasSettings.maxPriorityFeePerGas,
        'gwei'
      );
    }
    if (gasSettings?.gasLimit) {
      txOptions.gasLimit = BigInt(gasSettings.gasLimit);
    }

    // Deploy implementation (without constructor args, will be initialized via proxy)
    const implementation = await factory.deploy(txOptions);

    // Get initialization params
    const initParams = getUUPSInitParams(contractType, this.signer.address);

    // Deploy proxy and initialize
    const { proxyAddress } = await deployUUPSContract(
      implementation as Contract,
      initParams,
      this.signer
    );

    // Get deployment transaction (from implementation)
    const deploymentTx = implementation.deploymentTransaction();
    if (!deploymentTx) {
      throw new Error('Deployment transaction not found');
    }

    // Wait for transaction receipt
    const receipt = await deploymentTx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    const gasUsed = receipt.gasUsed.toString();
    const effectiveGasPrice = receipt.gasPrice || BigInt(0);
    const deploymentCost = ethers.formatEther(
      receipt.gasUsed * effectiveGasPrice
    );

    console.log(`✅ ${contractType} UUPS proxy deployed at: ${proxyAddress}`);
    console.log(`   Implementation: ${await implementation.getAddress()}`);
    console.log(`   Gas used: ${gasUsed}`);
    console.log(`   Cost: ${deploymentCost} ETH`);

    // Encode initialization arguments
    const constructorArguments = this.encodeConstructorArgs(
      artifact.abi,
      initParams.args
    );

    return {
      success: true,
      contractType,
      address: proxyAddress, // Return proxy address as the contract address
      transactionHash: receipt.hash,
      gasUsed,
      deploymentCost,
      constructorArguments,
      verificationStatus: 'not_requested',
    };
  }

  /**
   * Deploy a standard (non-UUPS) contract
   */
  private async deployStandardContract(
    contractType: ContractType,
    artifact: ContractArtifact,
    deployArgs: any[] = [],
    gasSettings?: {
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
      gasLimit?: string;
    }
  ): Promise<DeploymentResult> {
    // Create contract factory
    const factory = new ContractFactory(
      artifact.abi,
      artifact.bytecode.object,
      this.signer
    );

    // Prepare deployment transaction options
    const txOptions: any = {};
    if (gasSettings?.maxFeePerGas) {
      txOptions.maxFeePerGas = ethers.parseUnits(gasSettings.maxFeePerGas, 'gwei');
    }
    if (gasSettings?.maxPriorityFeePerGas) {
      txOptions.maxPriorityFeePerGas = ethers.parseUnits(
        gasSettings.maxPriorityFeePerGas,
        'gwei'
      );
    }
    if (gasSettings?.gasLimit) {
      txOptions.gasLimit = BigInt(gasSettings.gasLimit);
    }

    // Deploy contract
    const contract = await factory.deploy(...deployArgs, txOptions);
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction();

    if (!deploymentTx) {
      throw new Error('Deployment transaction not found');
    }

    // Wait for transaction receipt
    const receipt = await deploymentTx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    const gasUsed = receipt.gasUsed.toString();
    const effectiveGasPrice = receipt.gasPrice || BigInt(0);
    const deploymentCost = ethers.formatEther(
      receipt.gasUsed * effectiveGasPrice
    );

    console.log(`✅ ${contractType} deployed at: ${address}`);
    console.log(`   Gas used: ${gasUsed}`);
    console.log(`   Cost: ${deploymentCost} ETH`);

    // Encode constructor arguments for verification
    const constructorArguments = deployArgs.length > 0
      ? this.encodeConstructorArgs(artifact.abi, deployArgs)
      : '';

    return {
      success: true,
      contractType,
      address,
      transactionHash: receipt.hash,
      gasUsed,
      deploymentCost,
      constructorArguments,
      verificationStatus: 'not_requested',
    };
  }

  /**
   * Encode constructor arguments for verification
   */
  private encodeConstructorArgs(abi: any[], args: any[]): string {
    try {
      // Find constructor in ABI
      const constructor = abi.find((item) => item.type === 'constructor');
      if (!constructor || !constructor.inputs || constructor.inputs.length === 0) {
        return '';
      }

      // Encode the arguments
      const iface = new ethers.Interface(abi);
      const encoded = iface.encodeDeploy(args);

      // Remove the bytecode prefix, return only constructor args
      // The encodeDeploy includes bytecode + constructor args
      // We only want the constructor args part
      return encoded.slice(2); // Remove '0x' prefix
    } catch (error) {
      console.warn('Failed to encode constructor arguments:', error);
      return '';
    }
  }

  /**
   * Get current gas price estimates
   */
  async getGasEstimates(): Promise<{
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  }> {
    const feeData = await this.provider.getFeeData();

    return {
      maxFeePerGas: feeData.maxFeePerGas
        ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei')
        : '0',
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei')
        : '0',
    };
  }

  /**
   * Get deployer address
   */
  getDeployerAddress(): string {
    return this.signer.address;
  }

  /**
   * Get current network
   */
  async getNetwork(): Promise<ethers.Network> {
    return this.provider.getNetwork();
  }

  /**
   * Verify deployed contract bytecode matches artifact
   */
  async verifyDeployedBytecode(
    address: string,
    artifact: ContractArtifact
  ): Promise<boolean> {
    try {
      const deployedCode = await this.provider.getCode(address);
      const expectedCode = artifact.deployedBytecode?.object || '';

      // Remove metadata hash for comparison (last 53 bytes)
      const deployedCodeTrimmed = deployedCode.slice(0, -106);
      const expectedCodeTrimmed = expectedCode.slice(0, -106);

      return deployedCodeTrimmed === expectedCodeTrimmed;
    } catch (error) {
      console.error('Failed to verify bytecode:', error);
      return false;
    }
  }
}
