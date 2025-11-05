# Module Services Architecture - CORRECTED Flow

## 🎯 Understanding the Proper Flow

### Two-Phase Deployment Model

#### **Phase 1: Template Deployment (Done Once)**
```
1. Deploy master contract TEMPLATE
2. Deploy module TEMPLATES  
3. Configure factory with template addresses
4. Save templates to database (contract_masters table)
```
**Who does this**: Platform admin/developer
**How often**: Once per network/environment
**Stored in**: `contract_masters` table

#### **Phase 2: Instance Deployment (Done Per Token)**
```
5. User designs token with selected modules
6. Factory deploys master INSTANCE from template
7. Factory deploys module INSTANCES from templates
8. Configure instances with user's specific settings
9. Save instances to database (tokens, token_modules tables)
```
**Who does this**: End user via UI
**How often**: Every token creation
**Stored in**: `tokens`, `token_modules` tables

---

## 🏗️ Correct Architecture

### Layer 1: Template Management (Admin/Setup)

**File**: `/services/modules/TemplateDeploymentService.ts` (NEW)

```typescript
/**
 * Template Deployment Service
 * 
 * Deploys TEMPLATES (masters) that will be cloned for each token
 * This is done ONCE per network/environment by platform admins
 */

export class TemplateDeploymentService {
  /**
   * Deploy master contract template
   * Saves to contract_masters table
   */
  static async deployMasterTemplate(
    tokenStandard: 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400',
    network: string,
    environment: string,
    deployer: ethers.Wallet
  ): Promise<string> {
    // Deploy template
    const factory = new ethers.ContractFactory(abi, bytecode, deployer);
    const template = await factory.deploy();
    await template.deployed();
    
    // Save to contract_masters
    await supabase.from('contract_masters').insert({
      contract_type: `${tokenStandard}_master`,
      contract_address: template.address,
      network,
      environment,
      abi,
      version: '1.0.0',
      is_active: true,
      is_template: true // Flag as template
    });
    
    return template.address;
  }

  /**
   * Deploy module template
   * Saves to contract_masters table
   */
  static async deployModuleTemplate(
    moduleType: string,
    network: string,
    environment: string,
    deployer: ethers.Wallet
  ): Promise<string> {
    // Deploy template
    const factory = new ethers.ContractFactory(abi, bytecode, deployer);
    const template = await factory.deploy();
    await template.deployed();
    
    // Save to contract_masters
    await supabase.from('contract_masters').insert({
      contract_type: `${moduleType}_module`,
      contract_address: template.address,
      network,
      environment,
      abi,
      version: '1.0.0',
      is_active: true,
      is_template: true // Flag as template
    });
    
    return template.address;
  }

  /**
   * Deploy factory contract
   * Configures with template addresses
   */
  static async deployFactory(
    network: string,
    environment: string,
    deployer: ethers.Wallet,
    templateAddresses: {
      masterTemplates: Record<string, string>; // erc20 => address
      moduleTemplates: Record<string, string>; // vesting => address
    }
  ): Promise<string> {
    // Deploy factory
    const factoryFactory = new ethers.ContractFactory(abi, bytecode, deployer);
    const factory = await factoryFactory.deploy();
    await factory.deployed();
    
    // Configure factory with template addresses
    for (const [standard, address] of Object.entries(templateAddresses.masterTemplates)) {
      await factory.registerMasterTemplate(standard, address);
    }
    
    for (const [module, address] of Object.entries(templateAddresses.moduleTemplates)) {
      await factory.registerModuleTemplate(module, address);
    }
    
    // Save factory to contract_masters
    await supabase.from('contract_masters').insert({
      contract_type: 'factory',
      contract_address: factory.address,
      network,
      environment,
      abi,
      version: '1.0.0',
      is_active: true,
      contract_details: {
        masterTemplates: templateAddresses.masterTemplates,
        moduleTemplates: templateAddresses.moduleTemplates
      }
    });
    
    return factory.address;
  }
}
```

---

### Layer 2: Instance Deployment (User Token Creation)

**File**: `/services/modules/InstanceDeploymentService.ts` (REFACTORED)

```typescript
/**
 * Instance Deployment Service
 * 
 * Deploys INSTANCES from templates for user's specific token
 * Uses factory to clone templates
 */

export class InstanceDeploymentService {
  /**
   * Deploy master contract instance from template
   * 
   * @returns Instance address (NEW contract for this token)
   */
  static async deployMasterInstance(
    tokenStandard: 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400',
    tokenParams: {
      name: string;
      symbol: string;
      decimals: number;
      totalSupply: string;
    },
    network: string,
    environment: string,
    deployer: ethers.Wallet
  ): Promise<{
    instanceAddress: string;
    templateAddress: string;
    deploymentTxHash: string;
  }> {
    // Get factory
    const factory = await this.getFactory(network, environment);
    
    // Get template address
    const templateAddress = await this.getTemplateAddress(
      `${tokenStandard}_master`,
      network,
      environment
    );
    
    // Deploy instance from template (factory clones template)
    const tx = await factory.deployMasterInstance(
      templateAddress,
      tokenParams.name,
      tokenParams.symbol,
      tokenParams.decimals,
      tokenParams.totalSupply
    );
    
    const receipt = await tx.wait();
    const instanceAddress = this.extractAddressFromEvent(receipt, 'MasterDeployed');
    
    return {
      instanceAddress,
      templateAddress,
      deploymentTxHash: receipt.transactionHash
    };
  }

  /**
   * Deploy module instances from templates
   * 
   * @returns Instance addresses (NEW contracts for this token)
   */
  static async deployModuleInstances(
    masterInstanceAddress: string,
    moduleSelection: ModuleSelection,
    network: string,
    environment: string,
    deployer: ethers.Wallet
  ): Promise<Array<{
    moduleType: string;
    instanceAddress: string;
    templateAddress: string;
    deploymentTxHash: string;
  }>> {
    const deployed = [];
    const factory = await this.getFactory(network, environment);
    
    // Deploy each selected module instance
    for (const [moduleType, isSelected] of Object.entries(moduleSelection)) {
      if (isSelected) {
        // Get template address
        const templateAddress = await this.getTemplateAddress(
          `${moduleType}_module`,
          network,
          environment
        );
        
        // Deploy instance from template
        const tx = await factory.deployModuleInstance(
          templateAddress,
          masterInstanceAddress
        );
        
        const receipt = await tx.wait();
        const instanceAddress = this.extractAddressFromEvent(receipt, 'ModuleDeployed');
        
        deployed.push({
          moduleType,
          instanceAddress,
          templateAddress,
          deploymentTxHash: receipt.transactionHash
        });
      }
    }
    
    return deployed;
  }

  /**
   * Get factory contract
   */
  private static async getFactory(
    network: string,
    environment: string
  ): Promise<ethers.Contract> {
    const { data } = await supabase
      .from('contract_masters')
      .select('contract_address, abi')
      .eq('contract_type', 'factory')
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .single();
    
    return new ethers.Contract(data.contract_address, data.abi, deployer);
  }

  /**
   * Get template address from contract_masters
   */
  private static async getTemplateAddress(
    contractType: string,
    network: string,
    environment: string
  ): Promise<string> {
    const { data } = await supabase
      .from('contract_masters')
      .select('contract_address')
      .eq('contract_type', contractType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_template', true)
      .eq('is_active', true)
      .single();
    
    return data.contract_address;
  }

  private static extractAddressFromEvent(receipt: any, eventName: string): string {
    // Extract address from deployment event
    const event = receipt.events.find((e: any) => e.event === eventName);
    return event.args.instanceAddress;
  }
}
```

---

### Layer 3: Instance Configuration (User Specific Settings)

**File**: `/services/modules/InstanceConfigurationService.ts` (NEW)

```typescript
/**
 * Instance Configuration Service
 * 
 * Configures deployed INSTANCES with user's specific settings
 * This happens AFTER instances are deployed
 */

export class InstanceConfigurationService {
  /**
   * Configure master instance
   */
  static async configureMasterInstance(
    instanceAddress: string,
    tokenStandard: string,
    config: {
      owner: string;
      features: string[];
      // ... other master-level configs
    },
    deployer: ethers.Wallet
  ): Promise<string[]> {
    const txHashes: string[] = [];
    
    // Get instance contract
    const instance = new ethers.Contract(
      instanceAddress,
      await this.getMasterABI(tokenStandard),
      deployer
    );
    
    // Set owner
    const tx1 = await instance.transferOwnership(config.owner);
    txHashes.push((await tx1.wait()).transactionHash);
    
    // Enable features
    for (const feature of config.features) {
      const tx = await instance.enableFeature(feature);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    return txHashes;
  }

  /**
   * Configure module instances with user's specific settings
   */
  static async configureModuleInstances(
    deployedModules: Array<{
      moduleType: string;
      instanceAddress: string;
    }>,
    moduleConfigs: CompleteModuleConfiguration,
    deployer: ethers.Wallet
  ): Promise<Array<{
    moduleType: string;
    configured: boolean;
    transactionHashes: string[];
    error?: string;
  }>> {
    const results = [];
    
    for (const { moduleType, instanceAddress } of deployedModules) {
      const config = (moduleConfigs as any)[moduleType];
      
      if (config) {
        const result = await this.configureModuleInstance(
          instanceAddress,
          moduleType,
          config,
          deployer
        );
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Configure a single module instance
   */
  private static async configureModuleInstance(
    instanceAddress: string,
    moduleType: string,
    config: any,
    deployer: ethers.Wallet
  ): Promise<{
    moduleType: string;
    configured: boolean;
    transactionHashes: string[];
    error?: string;
  }> {
    try {
      const txHashes: string[] = [];
      
      // Get module contract
      const module = new ethers.Contract(
        instanceAddress,
        await this.getModuleABI(moduleType),
        deployer
      );
      
      // Configure based on module type
      switch (moduleType) {
        case 'vesting':
          for (const schedule of config.schedules || []) {
            const tx = await module.createVestingSchedule(
              schedule.beneficiary,
              ethers.utils.parseUnits(schedule.amount, 18),
              schedule.startTime,
              schedule.cliffDuration,
              schedule.vestingDuration,
              schedule.revocable,
              ethers.utils.formatBytes32String(schedule.category)
            );
            txHashes.push((await tx.wait()).transactionHash);
          }
          break;
          
        case 'document':
          for (const doc of config.documents || []) {
            const tx = await module.setDocument(
              ethers.utils.formatBytes32String(doc.name),
              doc.uri,
              doc.hash
            );
            txHashes.push((await tx.wait()).transactionHash);
          }
          break;
          
        // ... other module types
      }
      
      return {
        moduleType,
        configured: true,
        transactionHashes: txHashes
      };
      
    } catch (error: any) {
      return {
        moduleType,
        configured: false,
        transactionHashes: [],
        error: error.message
      };
    }
  }

  private static async getMasterABI(tokenStandard: string): Promise<any> {
    const { data } = await supabase
      .from('contract_masters')
      .select('abi')
      .eq('contract_type', `${tokenStandard}_master`)
      .eq('is_template', true)
      .single();
    return data.abi;
  }

  private static async getModuleABI(moduleType: string): Promise<any> {
    const { data } = await supabase
      .from('contract_masters')
      .select('abi')
      .eq('contract_type', `${moduleType}_module`)
      .eq('is_template', true)
      .single();
    return data.abi;
  }
}
```

---

### Layer 4: Orchestration (Full Flow)

**File**: `/services/tokens/deployment/tokenDeploymentOrchestrator.ts`

```typescript
/**
 * Token Deployment Orchestrator
 * 
 * Orchestrates the complete instance deployment + configuration flow
 * Assumes templates are already deployed and configured in factory
 */

export class TokenDeploymentOrchestrator {
  /**
   * Complete token deployment flow
   * 
   * FLOW:
   * 1. Deploy master INSTANCE from template (via factory)
   * 2. Deploy module INSTANCES from templates (via factory)
   * 3. Save instances to database
   * 4. Configure master instance
   * 5. Configure module instances
   * 6. Update database with configuration results
   */
  static async deployToken(
    params: {
      // Token details
      tokenId: string;
      name: string;
      symbol: string;
      decimals: number;
      totalSupply: string;
      tokenStandard: 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400';
      
      // Module selection
      moduleSelection: ModuleSelection;
      moduleConfigs: CompleteModuleConfiguration;
      
      // Deployment params
      network: string;
      environment: string;
      deployer: ethers.Wallet;
    },
    onProgress?: (step: string, current: number, total: number) => void
  ): Promise<{
    success: boolean;
    masterInstance: {
      address: string;
      templateAddress: string;
      deploymentTxHash: string;
    };
    moduleInstances: Array<{
      moduleType: string;
      instanceAddress: string;
      templateAddress: string;
      deploymentTxHash: string;
    }>;
    configurationResults: Array<{
      moduleType: string;
      configured: boolean;
      transactionHashes: string[];
    }>;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      // Step 1: Deploy master INSTANCE from template
      onProgress?.('Deploying token contract instance', 1, 5);
      
      const masterInstance = await InstanceDeploymentService.deployMasterInstance(
        params.tokenStandard,
        {
          name: params.name,
          symbol: params.symbol,
          decimals: params.decimals,
          totalSupply: params.totalSupply
        },
        params.network,
        params.environment,
        params.deployer
      );
      
      // Step 2: Deploy module INSTANCES from templates
      onProgress?.('Deploying module instances', 2, 5);
      
      const moduleInstances = await InstanceDeploymentService.deployModuleInstances(
        masterInstance.instanceAddress,
        params.moduleSelection,
        params.network,
        params.environment,
        params.deployer
      );
      
      // Step 3: Save instances to database
      onProgress?.('Saving deployment to database', 3, 5);
      
      await this.saveMasterInstanceToDatabase(params.tokenId, masterInstance);
      await this.saveModuleInstancesToDatabase(params.tokenId, moduleInstances);
      
      // Step 4: Configure master instance
      onProgress?.('Configuring token contract', 4, 5);
      
      await InstanceConfigurationService.configureMasterInstance(
        masterInstance.instanceAddress,
        params.tokenStandard,
        {
          owner: await params.deployer.getAddress(),
          features: [] // Extract from params
        },
        params.deployer
      );
      
      // Step 5: Configure module instances
      onProgress?.('Configuring modules', 5, 5);
      
      const configurationResults = await InstanceConfigurationService.configureModuleInstances(
        moduleInstances,
        params.moduleConfigs,
        params.deployer
      );
      
      // Step 6: Update database with configuration
      await this.updateConfigurationResults(params.tokenId, configurationResults);
      
      return {
        success: errors.length === 0,
        masterInstance,
        moduleInstances,
        configurationResults,
        errors
      };
      
    } catch (error: any) {
      errors.push(error.message);
      throw error;
    }
  }

  private static async saveMasterInstanceToDatabase(
    tokenId: string,
    masterInstance: {
      instanceAddress: string;
      templateAddress: string;
      deploymentTxHash: string;
    }
  ): Promise<void> {
    await supabase
      .from('token_deployments')
      .insert({
        token_id: tokenId,
        contract_address: masterInstance.instanceAddress,
        transaction_hash: masterInstance.deploymentTxHash,
        master_address: masterInstance.templateAddress,
        deployed_at: new Date().toISOString(),
        status: 'SUCCESSFUL'
      });
  }

  private static async saveModuleInstancesToDatabase(
    tokenId: string,
    moduleInstances: Array<{
      moduleType: string;
      instanceAddress: string;
      templateAddress: string;
      deploymentTxHash: string;
    }>
  ): Promise<void> {
    const records = moduleInstances.map(m => ({
      token_id: tokenId,
      module_type: m.moduleType,
      module_address: m.instanceAddress,
      master_address: m.templateAddress,
      deployment_tx_hash: m.deploymentTxHash,
      is_active: true,
      deployed_at: new Date().toISOString()
    }));
    
    await supabase.from('token_modules').insert(records);
  }

  private static async updateConfigurationResults(
    tokenId: string,
    results: Array<{
      moduleType: string;
      configured: boolean;
      transactionHashes: string[];
    }>
  ): Promise<void> {
    // Update token_modules with configuration status
    for (const result of results) {
      await supabase
        .from('token_modules')
        .update({
          configuration_status: result.configured ? 'CONFIGURED' : 'FAILED',
          configuration_tx_hashes: result.transactionHashes
        })
        .eq('token_id', tokenId)
        .eq('module_type', result.moduleType);
    }
  }
}
```

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: TEMPLATE DEPLOYMENT (Done Once by Admin)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Deploy ERC20 Master Template          → contract_masters   │
│  2. Deploy ERC721 Master Template         → contract_masters   │
│  3. Deploy Vesting Module Template        → contract_masters   │
│  4. Deploy Document Module Template       → contract_masters   │
│  5. Deploy [Other Module] Templates       → contract_masters   │
│  6. Deploy Factory Contract               → contract_masters   │
│  7. Configure Factory with Templates      → factory.register() │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: INSTANCE DEPLOYMENT (Done Per Token by User)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User selects: ERC20 + Vesting + Document                      │
│                                                                 │
│  1. Factory.deployMasterInstance()                             │
│     ├─ Clones ERC20 template                                   │
│     └─ Returns NEW instance address     → tokens table         │
│                                                                 │
│  2. Factory.deployModuleInstance(vesting)                      │
│     ├─ Clones Vesting template                                 │
│     └─ Returns NEW instance address     → token_modules table  │
│                                                                 │
│  3. Factory.deployModuleInstance(document)                     │
│     ├─ Clones Document template                                │
│     └─ Returns NEW instance address     → token_modules table  │
│                                                                 │
│  4. Configure Master Instance                                  │
│     └─ masterInstance.setOwner(), enableFeatures()             │
│                                                                 │
│  5. Configure Vesting Instance                                 │
│     └─ vestingInstance.createVestingSchedule(...)              │
│                                                                 │
│  6. Configure Document Instance                                │
│     └─ documentInstance.setDocument(...)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Final File Structure

```
/services/modules/
├── TemplateDeploymentService.ts     🆕 Deploy templates (admin)
├── InstanceDeploymentService.ts     🔄 Deploy instances (refactored)
├── InstanceConfigurationService.ts  🆕 Configure instances
├── ModuleRegistryService.ts         ✅ Query contract_masters
├── useModuleRegistry.ts             ✅ React hook
└── index.ts                         🔄 Updated exports

/services/tokens/deployment/
├── tokenDeploymentOrchestrator.ts   🆕 Orchestrate full flow
└── index.ts                         🔄 Updated exports

/types/modules/
├── ModuleTypes.ts                   ✅ Keep as-is
└── index.ts                         ✅ Keep as-is

DELETE:
❌ /services/tokens/deployment/configureExtensions.ts
❌ /components/tokens/services/enhancedModuleDeploymentService.ts
```

---

## ✅ Summary

### Key Concepts
1. **Templates** (Masters) = Deployed once, stored in `contract_masters`
2. **Instances** = Cloned from templates per token
3. **Factory** = Orchestrates cloning of templates
4. **Configuration** = Applied to instances after deployment

### Services
1. **TemplateDeploymentService** (Admin) - Deploy templates once
2. **InstanceDeploymentService** (User) - Clone instances from templates
3. **InstanceConfigurationService** (User) - Configure cloned instances
4. **TokenDeploymentOrchestrator** (User) - Orchestrate steps 2-3

### Database Tables
1. **contract_masters** - Stores templates (is_template=true)
2. **tokens** - Stores token instances
3. **token_modules** - Stores module instances (links to templates via master_address)

---

**Does this match your intended flow?**
