/**
 * Template Deployment Service
 * 
 * Deploys TEMPLATES (masters) that will be cloned for each token
 * This is done ONCE per network/environment by platform admins
 * 
 * CRITICAL: This service is for ADMIN use only - deploys the master contracts
 * that will be used as templates for cloning instances per token.
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';

// Factory contract interface for proper TypeScript typing
interface IFactoryContract extends ethers.BaseContract {
  registerMasterTemplate(standard: string, templateAddress: string): Promise<ethers.ContractTransactionResponse>;
  registerModuleTemplate(moduleType: string, templateAddress: string): Promise<ethers.ContractTransactionResponse>;
}

interface TemplateDeploymentResult {
  templateAddress: string;
  contractType: string;
  deploymentTxHash: string;
  network: string;
  environment: string;
}

interface FactoryConfiguration {
  factoryAddress: string;
  masterTemplates: Record<string, string>; // standard => template address
  moduleTemplates: Record<string, string>; // moduleType => template address
}

/**
 * Service for deploying contract templates (admin operation)
 * Templates are deployed once and stored in contract_masters table
 */
export class TemplateDeploymentService {
  /**
   * Deploy master contract template
   * Saves to contract_masters table with is_template=true
   */
  static async deployMasterTemplate(
    tokenStandard: 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400',
    network: string,
    environment: string,
    deployer: ethers.Wallet,
    abi: any,
    bytecode: string
  ): Promise<TemplateDeploymentResult> {
    console.log(`Deploying ${tokenStandard} master template on ${network}...`);
    
    // Deploy template contract
    const factory = new ethers.ContractFactory(abi, bytecode, deployer);
    const template = await factory.deploy();
    await template.waitForDeployment();
    
    const deploymentTx = template.deploymentTransaction();
    const receipt = await deploymentTx?.wait();
    
    const templateAddress = await template.getAddress();
    console.log(`Template deployed at: ${templateAddress}`);
    
    // Save to contract_masters with is_template flag
    const { error } = await supabase
      .from('contract_masters')
      .insert({
        contract_type: `${tokenStandard}_master`,
        contract_address: templateAddress,
        network,
        environment,
        abi,
        version: '1.0.0',
        abi_version: '1.0.0',
        is_active: true,
        is_template: true, // Critical flag for templates
        deployed_at: new Date().toISOString(),
        contract_details: {
          tokenStandard,
          deploymentType: 'template',
          cloneable: true
        }
      });
    
    if (error) {
      throw new Error(`Failed to save template to database: ${error.message}`);
    }
    
    return {
      templateAddress,
      contractType: `${tokenStandard}_master`,
      deploymentTxHash: receipt?.hash || '',
      network,
      environment
    };
  }

  /**
   * Deploy module template
   * Saves to contract_masters table with is_template=true
   */
  static async deployModuleTemplate(
    moduleType: string,
    network: string,
    environment: string,
    deployer: ethers.Wallet,
    abi: any,
    bytecode: string
  ): Promise<TemplateDeploymentResult> {
    console.log(`Deploying ${moduleType} module template on ${network}...`);
    
    // Deploy template contract
    const factory = new ethers.ContractFactory(abi, bytecode, deployer);
    const template = await factory.deploy();
    await template.waitForDeployment();
    
    const deploymentTx = template.deploymentTransaction();
    const receipt = await deploymentTx?.wait();
    
    const templateAddress = await template.getAddress();
    console.log(`Module template deployed at: ${templateAddress}`);
    
    // Save to contract_masters with is_template flag
    const { error } = await supabase
      .from('contract_masters')
      .insert({
        contract_type: `${moduleType}_module`,
        contract_address: templateAddress,
        network,
        environment,
        abi,
        version: '1.0.0',
        abi_version: '1.0.0',
        is_active: true,
        is_template: true, // Critical flag for templates
        deployed_at: new Date().toISOString(),
        contract_details: {
          moduleType,
          deploymentType: 'template',
          cloneable: true
        }
      });
    
    if (error) {
      throw new Error(`Failed to save module template to database: ${error.message}`);
    }
    
    return {
      templateAddress,
      contractType: `${moduleType}_module`,
      deploymentTxHash: receipt?.hash || '',
      network,
      environment
    };
  }

  /**
   * Deploy factory contract and configure with template addresses
   * Factory will use these templates to clone instances per token
   */
  static async deployFactory(
    network: string,
    environment: string,
    deployer: ethers.Wallet,
    factoryAbi: any,
    factoryBytecode: string,
    templateAddresses: {
      masterTemplates: Record<string, string>; // erc20 => template address
      moduleTemplates: Record<string, string>; // vesting => template address
    }
  ): Promise<FactoryConfiguration> {
    console.log(`Deploying factory contract on ${network}...`);
    
    // Deploy factory
    const factoryFactory = new ethers.ContractFactory(factoryAbi, factoryBytecode, deployer);
    const factoryContract = await factoryFactory.deploy();
    await factoryContract.waitForDeployment();
    
    const factoryAddress = await factoryContract.getAddress();
    console.log(`Factory deployed at: ${factoryAddress}`);
    
    // Cast to typed interface for proper method calls
    const factory = factoryContract as unknown as IFactoryContract;
    
    // Configure factory with master templates
    console.log('Registering master templates in factory...');
    for (const [standard, templateAddress] of Object.entries(templateAddresses.masterTemplates)) {
      const tx = await factory.registerMasterTemplate(standard, templateAddress);
      await tx.wait();
      console.log(`  ✅ Registered ${standard} master template: ${templateAddress}`);
    }
    
    // Configure factory with module templates
    console.log('Registering module templates in factory...');
    for (const [moduleType, templateAddress] of Object.entries(templateAddresses.moduleTemplates)) {
      const tx = await factory.registerModuleTemplate(moduleType, templateAddress);
      await tx.wait();
      console.log(`  ✅ Registered ${moduleType} module template: ${templateAddress}`);
    }
    
    // Save factory to contract_masters
    const { error } = await supabase
      .from('contract_masters')
      .insert({
        contract_type: 'factory',
        contract_address: factoryAddress,
        network,
        environment,
        abi: factoryAbi,
        version: '1.0.0',
        abi_version: '1.0.0',
        is_active: true,
        is_template: false,
        deployed_at: new Date().toISOString(),
        contract_details: {
          masterTemplates: templateAddresses.masterTemplates,
          moduleTemplates: templateAddresses.moduleTemplates,
          deploymentType: 'factory'
        }
      });
    
    if (error) {
      throw new Error(`Failed to save factory to database: ${error.message}`);
    }
    
    console.log('✅ Factory configured and saved to database');
    
    return {
      factoryAddress,
      masterTemplates: templateAddresses.masterTemplates,
      moduleTemplates: templateAddresses.moduleTemplates
    };
  }

  /**
   * Get template address from contract_masters
   * Used internally to retrieve template addresses for factory configuration
   */
  private static async getTemplateAddress(
    contractType: string,
    network: string,
    environment: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('contract_address')
      .eq('contract_type', contractType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_template', true)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      throw new Error(`Template not found: ${contractType} on ${network}/${environment}`);
    }
    
    return data.contract_address;
  }

  /**
   * Verify factory configuration
   * Checks that all required templates are registered in the factory
   */
  static async verifyFactoryConfiguration(
    factoryAddress: string,
    network: string,
    environment: string
  ): Promise<{
    isValid: boolean;
    missingTemplates: string[];
    registeredTemplates: string[];
  }> {
    // Get factory from database
    const { data: factoryData, error: factoryError } = await supabase
      .from('contract_masters')
      .select('contract_details, abi')
      .eq('contract_type', 'factory')
      .eq('contract_address', factoryAddress)
      .eq('network', network)
      .eq('environment', environment)
      .single();
    
    if (factoryError || !factoryData) {
      throw new Error(`Factory not found: ${factoryAddress}`);
    }
    
    // Get all templates from database
    const { data: templates, error: templatesError } = await supabase
      .from('contract_masters')
      .select('contract_type, contract_address')
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_template', true)
      .eq('is_active', true);
    
    if (templatesError) {
      throw new Error(`Failed to fetch templates: ${templatesError.message}`);
    }
    
    const registeredTemplates: string[] = [];
    const missingTemplates: string[] = [];
    
    // Check each template
    for (const template of templates || []) {
      const isRegistered = (factoryData.contract_details as any)?.masterTemplates?.[template.contract_type] ||
                          (factoryData.contract_details as any)?.moduleTemplates?.[template.contract_type];
      
      if (isRegistered) {
        registeredTemplates.push(template.contract_type);
      } else {
        missingTemplates.push(template.contract_type);
      }
    }
    
    return {
      isValid: missingTemplates.length === 0,
      missingTemplates,
      registeredTemplates
    };
  }

  /**
   * List all deployed templates for a network/environment
   * Useful for admin dashboard
   */
  static async listDeployedTemplates(
    network: string,
    environment: string
  ): Promise<Array<{
    contractType: string;
    templateAddress: string;
    deployedAt: string;
    version: string;
  }>> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('contract_type, contract_address, deployed_at, version')
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_template', true)
      .eq('is_active', true)
      .order('deployed_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }
    
    return (data || []).map(t => ({
      contractType: t.contract_type,
      templateAddress: t.contract_address,
      deployedAt: t.deployed_at,
      version: t.version
    }));
  }
}
