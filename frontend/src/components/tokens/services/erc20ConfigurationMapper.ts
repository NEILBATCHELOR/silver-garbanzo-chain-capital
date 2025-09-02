/**
 * ERC20 Configuration Mapper
 * 
 * Transforms max configuration UI data into enhanced ERC-20 deployment format
 * Handles all complex features and validates configuration integrity
 */

import { TokenFormData } from '@/components/tokens/types';
import { EnhancedERC20Config } from './enhancedERC20DeploymentService';
import { ethers } from 'ethers';

export interface ConfigurationMappingResult {
  success: boolean;
  config?: EnhancedERC20Config;
  errors: string[];
  warnings: string[];
  complexity: {
    level: 'low' | 'medium' | 'high' | 'extreme';
    score: number;
    chunksRequired: number;
  };
}

export class ERC20ConfigurationMapper {
  /**
   * Map token form data to enhanced ERC-20 configuration
   */
  mapTokenFormToEnhancedConfig(tokenForm: TokenFormData): ConfigurationMappingResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Extract base configuration
      const baseConfig = this.extractBaseConfig(tokenForm, errors);
      if (errors.length > 0) {
        return { success: false, errors, warnings, complexity: { level: 'low', score: 0, chunksRequired: 0 } };
      }

      // Extract advanced configurations
      const config: EnhancedERC20Config = {
        baseConfig,
        antiWhaleConfig: this.extractAntiWhaleConfig(tokenForm, warnings),
        feeConfig: this.extractFeeConfig(tokenForm, warnings),
        tokenomicsConfig: this.extractTokenomicsConfig(tokenForm, warnings),
        tradingConfig: this.extractTradingConfig(tokenForm, warnings),
        presaleConfig: this.extractPresaleConfig(tokenForm, warnings),
        vestingSchedules: this.extractVestingSchedules(tokenForm, warnings),
        governanceConfig: this.extractGovernanceConfig(tokenForm, warnings),
        stakingConfig: this.extractStakingConfig(tokenForm, warnings),
        complianceConfig: this.extractComplianceConfig(tokenForm, warnings),
        roleAssignments: this.extractRoleAssignments(tokenForm, warnings)
      };

      // Calculate complexity
      const complexity = this.calculateComplexity(config);

      // Add complexity-based warnings
      if (complexity.level === 'extreme') {
        warnings.push('Extremely complex configuration - deployment may take 10+ minutes');
        warnings.push('Consider reducing features for initial deployment');
      } else if (complexity.level === 'high') {
        warnings.push('High complexity configuration - chunked deployment recommended');
      }

      return {
        success: true,
        config,
        errors,
        warnings,
        complexity
      };

    } catch (error) {
      errors.push(`Configuration mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        errors,
        warnings,
        complexity: { level: 'low', score: 0, chunksRequired: 0 }
      };
    }
  }

  /**
   * Extract base configuration (required fields)
   */
  private extractBaseConfig(tokenForm: TokenFormData, errors: string[]): EnhancedERC20Config['baseConfig'] {
    // Validate required fields
    if (!tokenForm.name?.trim()) errors.push('Token name is required');
    if (!tokenForm.symbol?.trim()) errors.push('Token symbol is required');
    if (tokenForm.decimals === undefined || tokenForm.decimals < 0 || tokenForm.decimals > 18) {
      errors.push('Decimals must be between 0 and 18');
    }

    // Get from form data or properties
    const props = tokenForm.erc20Properties || {};
    
    return {
      name: tokenForm.name || '',
      symbol: tokenForm.symbol || '',
      decimals: tokenForm.decimals || 18,
      initialSupply: props.initialSupply || tokenForm.initialSupply || '0',
      maxSupply: props.cap || tokenForm.cap || '0',
      initialOwner: tokenForm.initialOwner || ethers.ZeroAddress,
      mintingEnabled: props.isMintable ?? tokenForm.isMintable ?? false,
      burningEnabled: props.isBurnable ?? tokenForm.isBurnable ?? false,
      pausable: props.isPausable ?? tokenForm.isPausable ?? false,
      votingEnabled: tokenForm.governanceFeatures?.enabled ?? false,
      permitEnabled: props.permit ?? tokenForm.permit ?? false
    };
  }

  /**
   * Extract anti-whale configuration
   */
  private extractAntiWhaleConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC20Config['antiWhaleConfig'] {
    const props = tokenForm.erc20Properties || {};
    
    // Check if anti-whale is enabled through any of these properties
    const antiWhaleEnabled = props.transferConfig?.maxTransferAmount || 
                           props.transferConfig?.restrictions?.maxWalletPercentage;
    
    if (!antiWhaleEnabled) return undefined;

    const config = {
      enabled: true,
      maxWalletAmount: props.transferConfig?.maxTransferAmount || '0',
      cooldownPeriod: props.transferConfig?.cooldownPeriod || 0
    };

    if (config.maxWalletAmount === '0') {
      warnings.push('Anti-whale enabled but no max wallet amount set');
    }

    return config;
  }

  /**
   * Extract fee configuration
   */
  private extractFeeConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC20Config['feeConfig'] {
    const props = tokenForm.erc20Properties || {};
    
    // Check for fee configuration in feeOnTransfer
    const feeOnTransfer = props.feeOnTransfer;
    if (!feeOnTransfer) return undefined;
    
    const buyFeeEnabled = Boolean(feeOnTransfer);
    const sellFeeEnabled = Boolean(feeOnTransfer);
    
    if (!buyFeeEnabled && !sellFeeEnabled) return undefined;

    // Use default values since we don't have specific fee percentages in the schema
    const liquidityFee = 0;
    const marketingFee = 0;
    const charityFee = 0;

    const totalFees = liquidityFee + marketingFee + charityFee;
    if (totalFees > 25) {
      warnings.push(`Total fees (${totalFees}%) exceed recommended maximum of 25%`);
    }

    return {
      buyFeeEnabled,
      sellFeeEnabled,
      liquidityFeePercentage: liquidityFee,
      marketingFeePercentage: marketingFee,
      charityFeePercentage: charityFee,
      autoLiquidityEnabled: false,
      liquidityWallet: ethers.ZeroAddress,
      marketingWallet: ethers.ZeroAddress,
      charityWallet: ethers.ZeroAddress
    };
  }

  /**
   * Extract tokenomics configuration
   */
  private extractTokenomicsConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC20Config['tokenomicsConfig'] {
    const props = tokenForm.erc20Properties || {};
    
    // Check for rebasing or other tokenomics features
    const reflectionEnabled = Boolean(props.rebasing);
    const deflationEnabled = false; // Not available in current schema
    const burnOnTransfer = false; // Not available in current schema

    if (!reflectionEnabled && !deflationEnabled && !burnOnTransfer) return undefined;

    const config = {
      reflectionEnabled,
      reflectionPercentage: 0, // Default value
      deflationEnabled,
      deflationRate: 0, // Default value
      burnOnTransfer,
      burnPercentage: 0 // Default value
    };

    if (reflectionEnabled && config.reflectionPercentage === 0) {
      warnings.push('Reflection enabled but no percentage set');
    }

    if (deflationEnabled && config.deflationRate === 0) {
      warnings.push('Deflation enabled but no rate set');
    }

    return config;
  }

  /**
   * Extract trading configuration
   */
  private extractTradingConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC20Config['tradingConfig'] {
    const props = tokenForm.erc20Properties || {};
    
    return {
      blacklistEnabled: Boolean(props.whitelistConfig),
      tradingStartTime: 0, // Default to immediate trading
      whitelistEnabled: Boolean(props.whitelistConfig),
      geographicRestrictionsEnabled: Boolean(props.complianceConfig)
    };
  }

  /**
   * Extract presale configuration
   */
  private extractPresaleConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC20Config['presaleConfig'] {
    const props = tokenForm.erc20Properties || {};
    
    // No presale configuration in current schema
    return undefined;
  }

  /**
   * Extract vesting schedules
   */
  private extractVestingSchedules(tokenForm: TokenFormData, warnings: string[]): EnhancedERC20Config['vestingSchedules'] {
    const props = tokenForm.erc20Properties || {};
    
    // No vesting configuration in current schema
    return undefined;
  }

  /**
   * Extract governance configuration
   */
  private extractGovernanceConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC20Config['governanceConfig'] {
    const props = tokenForm.erc20Properties || {};
    
    // Check if governance features are enabled
    const governanceEnabled = props.governanceFeatures?.enabled || tokenForm.governanceFeatures?.enabled;
    
    if (!governanceEnabled) return undefined;

    return {
      enabled: true,
      quorumPercentage: 0, // Default value
      proposalThreshold: '0',
      votingDelay: 1,
      votingPeriod: 7,
      timelockDelay: 2
    };
  }

  /**
   * Extract staking configuration
   */
  private extractStakingConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC20Config['stakingConfig'] {
    const props = tokenForm.erc20Properties || {};
    
    // No staking configuration in current schema
    return undefined;
  }

  /**
   * Extract compliance configuration
   */
  private extractComplianceConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC20Config['complianceConfig'] {
    const props = tokenForm.erc20Properties || {};
    
    // Extract from available config objects
    const whitelistAddresses = props.whitelistConfig?.addresses || [];
    const blacklistAddresses: string[] = [];
    const restrictedCountries: string[] = [];
    const investorCountryCodes = {};

    if (whitelistAddresses.length === 0 && 
        blacklistAddresses.length === 0 && 
        restrictedCountries.length === 0 && 
        Object.keys(investorCountryCodes).length === 0) {
      return undefined;
    }

    // Validate addresses
    const invalidWhitelist = whitelistAddresses.filter(addr => !ethers.isAddress(addr));
    const invalidBlacklist = blacklistAddresses.filter(addr => !ethers.isAddress(addr));
    
    if (invalidWhitelist.length > 0) {
      warnings.push(`Invalid whitelist addresses: ${invalidWhitelist.join(', ')}`);
    }
    
    if (invalidBlacklist.length > 0) {
      warnings.push(`Invalid blacklist addresses: ${invalidBlacklist.join(', ')}`);
    }

    return {
      whitelistAddresses: whitelistAddresses.filter(addr => ethers.isAddress(addr)),
      blacklistAddresses: blacklistAddresses.filter(addr => ethers.isAddress(addr)),
      restrictedCountries,
      investorCountryCodes
    };
  }

  /**
   * Extract role assignments
   */
  private extractRoleAssignments(tokenForm: TokenFormData, warnings: string[]): EnhancedERC20Config['roleAssignments'] {
    const props = tokenForm.erc20Properties || {};
    
    // No role assignment configuration in current schema
    const minters: string[] = [];
    const burners: string[] = [];
    const pausers: string[] = [];
    const operators: string[] = [];
    const complianceOfficers: string[] = [];

    if (minters.length === 0 && burners.length === 0 && pausers.length === 0 && 
        operators.length === 0 && complianceOfficers.length === 0) {
      return undefined;
    }

    // Validate addresses
    const allAddresses = [...minters, ...burners, ...pausers, ...operators, ...complianceOfficers];
    const invalidAddresses = allAddresses.filter(addr => !ethers.isAddress(addr));
    
    if (invalidAddresses.length > 0) {
      warnings.push(`Invalid role addresses: ${invalidAddresses.join(', ')}`);
    }

    return {
      minters: minters.filter(addr => ethers.isAddress(addr)),
      burners: burners.filter(addr => ethers.isAddress(addr)),
      pausers: pausers.filter(addr => ethers.isAddress(addr)),
      operators: operators.filter(addr => ethers.isAddress(addr)),
      complianceOfficers: complianceOfficers.filter(addr => ethers.isAddress(addr))
    };
  }

  /**
   * Calculate configuration complexity
   */
  private calculateComplexity(config: EnhancedERC20Config) {
    let score = 10; // Base complexity
    let chunksRequired = 1; // Base deployment

    // Anti-whale
    if (config.antiWhaleConfig?.enabled) {
      score += 5;
      chunksRequired++;
    }

    // Fee system
    if (config.feeConfig) {
      score += 8;
      if (config.feeConfig.autoLiquidityEnabled) score += 3;
      chunksRequired++;
    }

    // Tokenomics
    if (config.tokenomicsConfig) {
      if (config.tokenomicsConfig.reflectionEnabled) score += 7;
      if (config.tokenomicsConfig.deflationEnabled) score += 5;
      if (config.tokenomicsConfig.burnOnTransfer) score += 4;
      chunksRequired++;
    }

    // Trading controls
    if (config.tradingConfig) {
      score += 6;
      chunksRequired++;
    }

    // Presale
    if (config.presaleConfig?.enabled) {
      score += 10;
      chunksRequired++;
    }

    // Vesting
    if (config.vestingSchedules && config.vestingSchedules.length > 0) {
      score += 5 + (config.vestingSchedules.length * 2);
      chunksRequired++;
    }

    // Governance
    if (config.governanceConfig?.enabled) {
      score += 12;
      chunksRequired++;
    }

    // Staking
    if (config.stakingConfig?.enabled) {
      score += 8;
      chunksRequired++;
    }

    // Compliance
    if (config.complianceConfig) {
      const addresses = (config.complianceConfig.whitelistAddresses?.length || 0) + 
                       (config.complianceConfig.blacklistAddresses?.length || 0);
      score += 3 + Math.min(addresses * 0.5, 15);
      chunksRequired++;
    }

    // Roles
    if (config.roleAssignments) {
      const totalRoles = Object.values(config.roleAssignments).reduce((sum, roles) => sum + roles.length, 0);
      score += Math.min(totalRoles * 0.5, 8);
      chunksRequired++;
    }

    let level: 'low' | 'medium' | 'high' | 'extreme';
    if (score < 30) level = 'low';
    else if (score < 60) level = 'medium';
    else if (score < 100) level = 'high';
    else level = 'extreme';

    return { level, score, chunksRequired };
  }

  /**
   * Utility functions
   */
  private parsePercentage(value: string | number | undefined): number {
    if (!value) return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return Math.max(0, Math.min(10000, num * 100)); // Convert to basis points, cap at 100%
  }

  private convertReleaseFrequency(frequency: string): number {
    switch (frequency) {
      case 'daily': return 24 * 60 * 60;
      case 'weekly': return 7 * 24 * 60 * 60;
      case 'monthly': return 30 * 24 * 60 * 60;
      case 'quarterly': return 90 * 24 * 60 * 60;
      default: return 30 * 24 * 60 * 60; // Default to monthly
    }
  }

  private extractAddressesFromString(addressString: string | string[] | undefined): string[] {
    if (!addressString) return [];
    
    if (Array.isArray(addressString)) {
      return addressString;
    }
    
    // Split by common delimiters and clean up
    return addressString
      .split(/[,;\n\r]+/)
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);
  }

  /**
   * Validate configuration before deployment
   */
  validateConfiguration(config: EnhancedERC20Config): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Base configuration validation
    if (!config.baseConfig.name) errors.push('Token name is required');
    if (!config.baseConfig.symbol) errors.push('Token symbol is required');
    if (config.baseConfig.decimals < 0 || config.baseConfig.decimals > 18) {
      errors.push('Decimals must be between 0 and 18');
    }

    // Fee validation
    if (config.feeConfig) {
      const totalFees = config.feeConfig.liquidityFeePercentage + 
                       config.feeConfig.marketingFeePercentage + 
                       config.feeConfig.charityFeePercentage;
      if (totalFees > 2500) { // 25% in basis points
        errors.push('Total fees cannot exceed 25%');
      }
    }

    // Presale validation
    if (config.presaleConfig?.enabled) {
      if (config.presaleConfig.startTime >= config.presaleConfig.endTime && config.presaleConfig.endTime > 0) {
        errors.push('Presale end time must be after start time');
      }
    }

    // Vesting validation
    if (config.vestingSchedules) {
      config.vestingSchedules.forEach((schedule, index) => {
        if (schedule.cliffPeriod >= schedule.totalPeriod) {
          errors.push(`Vesting schedule ${index + 1}: cliff period must be less than total period`);
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }
}

// Export singleton instance
export const erc20ConfigurationMapper = new ERC20ConfigurationMapper();
