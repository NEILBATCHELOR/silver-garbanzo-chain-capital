/**
 * Enhanced Token Detection and Mapping Utility
 * 
 * Fixes the NCIRF token mapping issue by providing intelligent
 * standard detection for hybrid tokens and proper field mapping
 * to ensure ERC-20 tokens map to token_erc20_properties table.
 */

import { TokenStandard } from '@/types/core/centralModels';
import { TokenFormData } from '../types';

export interface TokenDetectionResult {
  detectedStandard: TokenStandard;
  confidence: number;
  reasons: string[];
  isHybrid: boolean;
  hybridStandards?: TokenStandard[];
  mappedData: Partial<TokenFormData>;
}

/**
 * Enhanced token standard detection for hybrid tokens
 * Specifically handles cases like NCIRF that are ERC-20 with references to other standards
 */
export class EnhancedTokenDetector {
  
  /**
   * Core ERC-20 field patterns - if these exist, it's primarily ERC-20
   */
  private static readonly ERC20_CORE_PATTERNS = [
    'initialSupply', 'totalSupply', 'decimals', 'symbol', 'name',
    'isMintable', 'isBurnable', 'allowance', 'approve', 'transfer',
    'cap', 'maxSupply', 'hasPermit', 'hasSnapshot'
  ];

  /**
   * Hybrid token indicators - suggest the token references other standards but is primarily ERC-20
   */
  private static readonly HYBRID_INDICATORS = [
    'wrappedTokens', 'underlyingToken', 'underlyingStandard',
    'dexIntegration', 'defiFeatures', 'oracle', 'liquidity',
    'bridging', 'yieldStrategies', 'enhanced', 'wrapper'
  ];

  /**
   * Description patterns that indicate ERC-20 primary standard despite references
   */
  private static readonly ERC20_DESCRIPTION_PATTERNS = [
    'enhanced liquid erc-20', 'erc-20 representation', 'erc20 token',
    'fungible token', 'liquid token', 'enhanced erc20', 'erc-20 wrapper'
  ];

  /**
   * Detect token standard with enhanced logic for hybrid tokens
   */
  static detectTokenStandard(jsonData: any): TokenDetectionResult {
    const reasons: string[] = [];
    let confidence = 0;
    let detectedStandard = TokenStandard.ERC20; // Default to ERC-20
    let isHybrid = false;
    const hybridStandards: TokenStandard[] = [];

    // Step 1: Check for explicit ERC-20 indicators in description
    if (jsonData.description) {
      const description = jsonData.description.toLowerCase();
      
      for (const pattern of this.ERC20_DESCRIPTION_PATTERNS) {
        if (description.includes(pattern)) {
          confidence += 40;
          reasons.push(`Description contains "${pattern}" - strong ERC-20 indicator`);
          detectedStandard = TokenStandard.ERC20;
          break;
        }
      }

      // Check for hybrid indicators in description
      if (description.includes('combining') || description.includes('with') || 
          description.includes('erc-1400') || description.includes('erc-3525')) {
        isHybrid = true;
        reasons.push('Description suggests hybrid token combining multiple standards');
        
        if (description.includes('erc-1400')) hybridStandards.push(TokenStandard.ERC1400);
        if (description.includes('erc-3525')) hybridStandards.push(TokenStandard.ERC3525);
      }
    }

    // Step 2: Check for core ERC-20 field patterns
    const erc20FieldsFound = this.ERC20_CORE_PATTERNS.filter(pattern => 
      jsonData[pattern] !== undefined
    );

    if (erc20FieldsFound.length >= 3) {
      confidence += 30;
      reasons.push(`Found ${erc20FieldsFound.length} core ERC-20 fields: ${erc20FieldsFound.join(', ')}`);
      detectedStandard = TokenStandard.ERC20;
    }

    // Step 3: Check for hybrid structure indicators
    const hybridIndicatorsFound = this.HYBRID_INDICATORS.filter(pattern => 
      jsonData[pattern] !== undefined
    );

    if (hybridIndicatorsFound.length > 0) {
      isHybrid = true;
      confidence += 10;
      reasons.push(`Found hybrid indicators: ${hybridIndicatorsFound.join(', ')}`);
    }

    // Step 4: Check wrappedTokens structure for underlying standards
    if (jsonData.wrappedTokens) {
      isHybrid = true;
      reasons.push('Found wrappedTokens structure - confirms hybrid token');
      
      if (jsonData.wrappedTokens.primaryToken?.underlyingStandard) {
        const underlying = jsonData.wrappedTokens.primaryToken.underlyingStandard.toUpperCase().replace('-', '');
        if (underlying === 'ERC1400') hybridStandards.push(TokenStandard.ERC1400);
        if (underlying === 'ERC3525') hybridStandards.push(TokenStandard.ERC3525);
      }
      
      if (jsonData.wrappedTokens.fractionalToken?.underlyingStandard) {
        const underlying = jsonData.wrappedTokens.fractionalToken.underlyingStandard.toUpperCase().replace('-', '');
        if (underlying === 'ERC1400') hybridStandards.push(TokenStandard.ERC1400);
        if (underlying === 'ERC3525') hybridStandards.push(TokenStandard.ERC3525);
      }
    }

    // Step 5: Final confidence adjustment
    if (isHybrid && detectedStandard === TokenStandard.ERC20) {
      confidence += 20;
      reasons.push('Hybrid token with ERC-20 as primary standard');
    }

    // Ensure minimum confidence for ERC-20 tokens with core fields
    if (erc20FieldsFound.length >= 4) {
      confidence = Math.max(confidence, 80);
    }

    const mappedData = this.mapToERC20Properties(jsonData);

    return {
      detectedStandard,
      confidence,
      reasons,
      isHybrid,
      hybridStandards: hybridStandards.length > 0 ? hybridStandards : undefined,
      mappedData
    };
  }

  /**
   * Map JSON data to ERC-20 properties with comprehensive field mapping
   */
  private static mapToERC20Properties(jsonData: any): Partial<TokenFormData> {
    const mappedData: Partial<TokenFormData> = {};

    // Core ERC-20 fields mapping
    const fieldMappings = {
      name: ['name', 'tokenName'],
      symbol: ['symbol', 'tokenSymbol'],
      decimals: ['decimals', 'decimal'],
      initialSupply: ['initialSupply', 'initial_supply', 'totalSupply'],
      cap: ['cap', 'maxSupply', 'max_supply'],
      isMintable: ['isMintable', 'is_mintable', 'mintable'],
      isBurnable: ['isBurnable', 'is_burnable', 'burnable'],
      isPausable: ['isPausable', 'is_pausable', 'pausable'],
      isUpgradeable: ['isUpgradeable', 'is_upgradeable', 'upgradeable'],
      hasPermit: ['hasPermit', 'has_permit', 'permit'],
      hasSnapshot: ['hasSnapshot', 'has_snapshot', 'snapshot'],
      hasVotes: ['hasVotes', 'has_votes', 'votes'],
      hasFlashMint: ['hasFlashMint', 'has_flash_mint', 'flashMint'],
      burnFrom: ['burnFrom', 'burn_from'],
      permitAllowance: ['permitAllowance', 'permit_allowance'],
      recoverable: ['recoverable'],
      isBlacklisted: ['isBlacklisted', 'is_blacklisted', 'blacklisted'],
      taxOnTransfer: ['taxOnTransfer', 'tax_on_transfer'],
      deflationary: ['deflationary'],
      hasReflection: ['hasReflection', 'has_reflection', 'reflection'],
      hasLiquidity: ['hasLiquidity', 'has_liquidity', 'liquidity']
    };

    // Map basic fields
    Object.entries(fieldMappings).forEach(([targetField, sourceFields]) => {
      for (const sourceField of sourceFields) {
        if (jsonData[sourceField] !== undefined) {
          (mappedData as any)[targetField] = jsonData[sourceField];
          break;
        }
      }
    });

    // Map complex objects to erc20Properties
    const erc20Properties: any = {};

    // Copy all direct fields
    Object.entries(fieldMappings).forEach(([targetField, sourceFields]) => {
      for (const sourceField of sourceFields) {
        if (jsonData[sourceField] !== undefined) {
          erc20Properties[targetField] = jsonData[sourceField];
          break;
        }
      }
    });

    // Map complex objects to existing ERC-20 JSONB fields where appropriate
    const erc20JsonbMappings = {
      compliance_config: 'compliance',
      governance_features: 'governance',
      fee_on_transfer: 'fees'
    };

    Object.entries(erc20JsonbMappings).forEach(([targetField, sourceField]) => {
      if (jsonData[sourceField] && typeof jsonData[sourceField] === 'object') {
        erc20Properties[targetField] = jsonData[sourceField];
      }
    });

    // Store all complex objects in the tokens.blocks field (main configuration storage)
    const blocksConfig: any = {};
    const complexObjectsForBlocks = [
      'wrappedTokens', 'dexIntegration', 'defiFeatures', 'oracle', 
      'liquidity', 'bridging', 'yieldStrategies', 'metadata', 
      'security', 'supply', 'analytics'
    ];

    complexObjectsForBlocks.forEach(field => {
      if (jsonData[field] && typeof jsonData[field] === 'object') {
        blocksConfig[field] = jsonData[field];
      }
    });

    // Set blocks configuration if we have complex objects
    if (Object.keys(blocksConfig).length > 0) {
      mappedData.blocks = blocksConfig;
    }

    // Set the erc20Properties object
    mappedData.erc20Properties = erc20Properties;

    // Set standard
    mappedData.standard = TokenStandard.ERC20;

    // Set description
    if (jsonData.description) {
      mappedData.description = jsonData.description;
    }

    // Auto-detect max config mode for complex tokens
    const complexFieldCount = complexObjectsForBlocks.filter(field => 
      jsonData[field] && typeof jsonData[field] === 'object'
    ).length;

    if (complexFieldCount >= 3) {
      mappedData.configMode = 'max';
    }

    return mappedData;
  }

  /**
   * Validate that the token should be stored as ERC-20
   */
  static shouldStoreAsERC20(jsonData: any): boolean {
    const detection = this.detectTokenStandard(jsonData);
    return detection.detectedStandard === TokenStandard.ERC20 && detection.confidence >= 60;
  }

  /**
   * Get hybrid token information for display/logging
   */
  static getHybridTokenInfo(jsonData: any): { isHybrid: boolean; underlyingStandards: string[] } {
    const detection = this.detectTokenStandard(jsonData);
    return {
      isHybrid: detection.isHybrid,
      underlyingStandards: detection.hybridStandards?.map(s => s.toString()) || []
    };
  }
}

/**
 * Quick utility functions for token upload components
 */
export const detectTokenStandardFromJSON = (jsonData: any): TokenStandard => {
  return EnhancedTokenDetector.detectTokenStandard(jsonData).detectedStandard;
};

export const mapJSONToTokenFormData = (jsonData: any): Partial<TokenFormData> => {
  return EnhancedTokenDetector.detectTokenStandard(jsonData).mappedData;
};

export const isHybridToken = (jsonData: any): boolean => {
  return EnhancedTokenDetector.detectTokenStandard(jsonData).isHybrid;
};
