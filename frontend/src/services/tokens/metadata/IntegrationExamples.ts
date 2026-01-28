/**
 * Token Metadata + Deployment Integration Examples
 * 
 * Complete working examples for integrating TokenMetadataService
 * with Token2022DeploymentService
 */

import { TokenMetadataService } from '@/services/tokens/metadata/TokenMetadataService';
import { token2022DeploymentService } from '@/services/wallet/solana/Token2022DeploymentService';
import type {
  Token2022Config,
  Token2022DeploymentOptions,
  Token2022DeploymentResult
} from '@/services/wallet/solana/Token2022DeploymentService';
import type {
  CreateMetadataInput,
  TokenMetadataRecord
} from '@/services/tokens/metadata/TokenMetadataService';

// ============================================================================
// EXAMPLE 1: Universal Framework Autocallable
// ============================================================================

export async function deployAutocallableWithUniversalMetadata(
  projectId: string,
  userId: string,
  walletPrivateKey: string
): Promise<Token2022DeploymentResult> {
  
  // Step 1: Define universal framework metadata
  const universalData = {
    // Basic Info
    name: 'S&P 500 Autocallable Note',
    symbol: 'SPX-AC-001',
    uri: 'https://metadata.chaincapital.io/spx-autocallable-001.json',
    description: 'Quarterly autocallable note linked to S&P 500 Index',
    
    // Classification
    assetClass: 'structured_product',
    productCategory: 'autocallable',
    productSubtype: 'worst_of',
    
    // Product Details
    issuer: 'Chain Capital',
    jurisdiction: 'US',
    issueDate: '2025-01-28',
    maturityDate: '2026-01-28',
    currency: 'USD',
    decimals: 6,
    
    // Underlyings
    underlyings: [{
      type: 'equity_index',
      identifier: 'SPX',
      name: 'S&P 500 Index',
      initialPrice: '5800.00',
      oracleAddress: 'oracle-address-here',
      oracleProvider: 'pyth',
      weight: 1.0
    }],
    
    // Barriers
    barriers: {
      barriers: [{
        barrierType: 'autocall_barrier',
        level: '100',
        direction: 'above',
        observationType: 'discrete',
        breached: false
      }]
    },
    
    // Coupons
    coupons: {
      coupons: [{
        couponType: 'conditional',
        rate: '12.00',
        frequency: 'quarterly',
        conditional: true
      }],
      memoryFeature: true
    },
    
    // Settlement
    settlement: {
      settlementType: 'physical',
      settlementMethod: 'token_delivery',
      settlementDays: 2,
      redemptionVault: 'vault-address-here',
      collateral: {
        collateralType: 'multi_asset',
        collateralRatio: '120',
        collateralVault: 'collateral-vault-address'
      }
    },
    
    // Observation
    observation: {
      observationType: 'discrete',
      valuationMethod: 'closing_price',
      observationFrequency: 'quarterly'
    },
    
    // Oracles
    oracles: [{
      purpose: 'underlying_price',
      provider: 'pyth',
      oracleAddress: 'oracle-address-here',
      updateFrequency: 'real_time'
    }],
    
    // Payoff Structure
    payoffStructure: {
      payoffType: 'autocallable',
      returnCalculation: 'percentage_change',
      memoryFeature: true
    },
    
    // URIs
    prospectusUri: 'https://docs.chaincapital.io/prospectus/spx-ac-001.pdf',
    termSheetUri: 'https://docs.chaincapital.io/termsheet/spx-ac-001.pdf'
  };
  
  // Step 2: Convert to metadata input and save
  const metadataInput = TokenMetadataService.createMetadataFromUniversal(
    universalData,
    projectId
  );
  
  console.log('Saving metadata to database...');
  const metadataResult = await TokenMetadataService.saveMetadata(metadataInput);
  
  if (!metadataResult.success) {
    throw new Error(`Failed to save metadata: ${metadataResult.error}`);
  }
  
  const metadataId = metadataResult.data!.id;
  console.log('✅ Metadata saved:', metadataId);
  
  // Step 3: Configure Token-2022 deployment
  const token2022Config: Token2022Config = {
    name: universalData.name,
    symbol: universalData.symbol,
    uri: universalData.uri,
    decimals: universalData.decimals,
    initialSupply: 1000000, // 1M tokens
    
    // Enable metadata extension
    enableMetadata: true,
    metadata: {
      name: universalData.name,
      symbol: universalData.symbol,
      uri: universalData.uri,
      additionalMetadata: new Map([
        ['assetClass', universalData.assetClass],
        ['productCategory', universalData.productCategory],
        ['issuer', universalData.issuer]
      ])
    },
    
    // Optional: Enable other extensions
    enableTransferFee: false,
    enableNonTransferable: false
  };
  
  const deploymentOptions: Token2022DeploymentOptions = {
    network: 'devnet',
    projectId,
    userId,
    walletPrivateKey
  };
  
  // Step 4: Deploy with metadata link
  console.log('Deploying token to Solana...');
  const deployResult = await token2022DeploymentService.deployToken2022WithMetadata(
    token2022Config,
    deploymentOptions,
    metadataId
  );
  
  if (deployResult.success) {
    console.log('✅ Token deployed successfully!');
    console.log('   Token Address:', deployResult.tokenAddress);
    console.log('   Token ID:', deployResult.tokenId);
    console.log('   Transaction:', deployResult.transactionHash);
    console.log('   Metadata ID:', metadataId);
    console.log('   Network:', deployResult.networkUsed);
    console.log('   Extensions:', deployResult.extensions);
  } else {
    console.error('❌ Deployment failed:', deployResult.errors);
  }
  
  return deployResult;
}

// ============================================================================
// EXAMPLE 2: Enumeration-Based Capital Protected Note
// ============================================================================

export async function deployCapitalProtectedNoteWithEnumeration(
  projectId: string,
  userId: string,
  walletPrivateKey: string
): Promise<Token2022DeploymentResult> {
  
  // Step 1: Define enumeration-based form data
  const enumerationFormData = {
    // Basic Info
    name: 'EUR/USD Capital Protected Note',
    symbol: 'EURUSD-CPN-001',
    uri: 'https://metadata.chaincapital.io/eurusd-cpn-001.json',
    description: '100% capital protected note on EUR/USD',
    
    // Enumeration-specific fields
    underlying_type: 'fx_pair',
    underlying_identifier: 'EUR/USD',
    underlying_name: 'Euro / US Dollar',
    
    capital_protection_type: 'full',
    capital_protection_level: '100',
    
    participation_rate: '80',
    participation_side: 'upside',
    
    maturity_date: '2026-01-28',
    issue_date: '2025-01-28',
    
    settlement_type: 'cash',
    settlement_currency: 'USD',
    
    barrier_type: 'none',
    coupon_type: 'none',
    
    // URIs
    prospectus_uri: 'https://docs.chaincapital.io/prospectus/eurusd-cpn-001.pdf',
    termsheet_uri: 'https://docs.chaincapital.io/termsheet/eurusd-cpn-001.pdf'
  };
  
  // Step 2: Convert to metadata input and save
  const metadataInput = TokenMetadataService.createMetadataFromEnumeration(
    enumerationFormData,
    'structured_product',
    'capital_protected',
    projectId
  );
  
  console.log('Saving enumeration-based metadata...');
  const metadataResult = await TokenMetadataService.saveMetadata(metadataInput);
  
  if (!metadataResult.success) {
    throw new Error(`Failed to save metadata: ${metadataResult.error}`);
  }
  
  const metadataId = metadataResult.data!.id;
  console.log('✅ Metadata saved:', metadataId);
  
  // Step 3: Configure Token-2022 deployment
  const token2022Config: Token2022Config = {
    name: enumerationFormData.name,
    symbol: enumerationFormData.symbol,
    uri: enumerationFormData.uri,
    decimals: 6,
    initialSupply: 500000,
    
    enableMetadata: true,
    metadata: {
      name: enumerationFormData.name,
      symbol: enumerationFormData.symbol,
      uri: enumerationFormData.uri
    }
  };
  
  const deploymentOptions: Token2022DeploymentOptions = {
    network: 'devnet',
    projectId,
    userId,
    walletPrivateKey
  };
  
  // Step 4: Deploy
  const deployResult = await token2022DeploymentService.deployToken2022WithMetadata(
    token2022Config,
    deploymentOptions,
    metadataId
  );
  
  return deployResult;
}

// ============================================================================
// EXAMPLE 3: Query and List Metadata
// ============================================================================

export async function listStructuredProductMetadata(
  projectId?: string
): Promise<void> {
  
  // List by asset class
  console.log('\n📊 Structured Products:');
  const structuredProducts = await TokenMetadataService.listByAssetClass(
    'structured_product',
    20
  );
  
  if (structuredProducts.success && structuredProducts.data) {
    structuredProducts.data.forEach(metadata => {
      console.log(`  - ${metadata.symbol}: ${metadata.name}`);
      console.log(`    Type: ${metadata.instrument_type}`);
      console.log(`    Deployed: ${metadata.token_id ? 'Yes' : 'No'}`);
      console.log(`    Created: ${metadata.created_at}`);
    });
  }
  
  // List by project (if projectId provided)
  if (projectId) {
    console.log('\n📁 Project Tokens:');
    const projectTokens = await TokenMetadataService.listByProject(projectId, 10);
    
    if (projectTokens.success && projectTokens.data) {
      projectTokens.data.forEach(metadata => {
        console.log(`  - ${metadata.symbol}: ${metadata.name}`);
      });
    }
  }
  
  // List by instrument type
  console.log('\n🎯 Autocallable Products:');
  const autocallables = await TokenMetadataService.listByInstrumentType(
    'autocallable',
    10
  );
  
  if (autocallables.success && autocallables.data) {
    autocallables.data.forEach(metadata => {
      console.log(`  - ${metadata.symbol}: ${metadata.name}`);
    });
  }
}

// ============================================================================
// EXAMPLE 4: Get Metadata for Deployed Token
// ============================================================================

export async function getDeployedTokenMetadata(
  tokenId: string
): Promise<TokenMetadataRecord | null> {
  
  const result = await TokenMetadataService.getMetadataByTokenId(tokenId);
  
  if (result.success && result.data) {
    console.log('\n🔍 Token Metadata:');
    console.log('  Name:', result.data.name);
    console.log('  Symbol:', result.data.symbol);
    console.log('  Asset Class:', result.data.asset_class);
    console.log('  Instrument Type:', result.data.instrument_type);
    console.log('  Metadata URI:', result.data.metadata_uri);
    console.log('  Prospectus:', result.data.prospectus_uri);
    console.log('  Term Sheet:', result.data.termsheet_uri);
    console.log('\n  Full Metadata JSON:');
    console.log(JSON.stringify(result.data.metadata_json, null, 2));
    
    return result.data;
  }
  
  console.log('❌ Metadata not found for token:', tokenId);
  return null;
}

// ============================================================================
// EXAMPLE 5: Manual Linking (Recovery Scenario)
// ============================================================================

export async function manuallyLinkMetadataToToken(
  metadataId: string,
  tokenId: string
): Promise<void> {
  
  console.log(`\n🔗 Linking metadata ${metadataId} to token ${tokenId}...`);
  
  const result = await TokenMetadataService.linkToDeployedToken(
    metadataId,
    tokenId
  );
  
  if (result.success) {
    console.log('✅ Successfully linked metadata to token');
    console.log('  Metadata ID:', metadataId);
    console.log('  Token ID:', tokenId);
  } else {
    console.error('❌ Failed to link:', result.error);
  }
}

// ============================================================================
// EXAMPLE 6: Complete Flow with Error Handling
// ============================================================================

export async function completeDeploymentFlow(
  universalData: any,
  projectId: string,
  userId: string,
  walletPrivateKey: string
): Promise<{
  success: boolean;
  metadataId?: string;
  tokenId?: string;
  tokenAddress?: string;
  error?: string;
}> {
  
  try {
    // Step 1: Save metadata
    console.log('Step 1: Saving metadata...');
    const metadataInput = TokenMetadataService.createMetadataFromUniversal(
      universalData,
      projectId
    );
    
    const metadataResult = await TokenMetadataService.saveMetadata(metadataInput);
    
    if (!metadataResult.success) {
      return {
        success: false,
        error: `Metadata save failed: ${metadataResult.error}`
      };
    }
    
    const metadataId = metadataResult.data!.id;
    console.log('✅ Metadata saved:', metadataId);
    
    // Step 2: Configure deployment
    console.log('Step 2: Configuring deployment...');
    const token2022Config: Token2022Config = {
      name: universalData.name,
      symbol: universalData.symbol,
      uri: universalData.uri,
      decimals: universalData.decimals || 6,
      initialSupply: 1000000,
      enableMetadata: true,
      metadata: {
        name: universalData.name,
        symbol: universalData.symbol,
        uri: universalData.uri
      }
    };
    
    const deploymentOptions: Token2022DeploymentOptions = {
      network: 'devnet',
      projectId,
      userId,
      walletPrivateKey
    };
    
    // Step 3: Deploy
    console.log('Step 3: Deploying to Solana...');
    const deployResult = await token2022DeploymentService.deployToken2022WithMetadata(
      token2022Config,
      deploymentOptions,
      metadataId
    );
    
    if (!deployResult.success) {
      return {
        success: false,
        metadataId,
        error: `Deployment failed: ${deployResult.errors?.join(', ')}`
      };
    }
    
    console.log('✅ Deployment successful!');
    
    // Step 4: Verify link
    console.log('Step 4: Verifying metadata link...');
    const linkedMetadata = await TokenMetadataService.getMetadataByTokenId(
      deployResult.tokenId!
    );
    
    if (!linkedMetadata.success) {
      console.warn('⚠️ Warning: Could not verify metadata link');
    } else {
      console.log('✅ Metadata properly linked');
    }
    
    return {
      success: true,
      metadataId,
      tokenId: deployResult.tokenId,
      tokenAddress: deployResult.tokenAddress
    };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ============================================================================
// USAGE IN REACT COMPONENT
// ============================================================================

/**
 * Example React component usage
 * 
 * ```tsx
 * import { deployAutocallableWithUniversalMetadata } from './IntegrationExamples';
 * 
 * function DeployTokenButton() {
 *   const [loading, setLoading] = useState(false);
 *   const [result, setResult] = useState<any>(null);
 *   
 *   const handleDeploy = async () => {
 *     setLoading(true);
 *     try {
 *       const deployResult = await deployAutocallableWithUniversalMetadata(
 *         projectId,
 *         userId,
 *         walletPrivateKey
 *       );
 *       setResult(deployResult);
 *     } catch (error) {
 *       console.error('Deployment failed:', error);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *   
 *   return (
 *     <button onClick={handleDeploy} disabled={loading}>
 *       {loading ? 'Deploying...' : 'Deploy Token'}
 *     </button>
 *   );
 * }
 * ```
 */
