// Cross-Field Validation System for Comprehensive Token Forms
// Implements real-time validation across all token fields and tables

import { TokenStandard } from '@/types/core/centralModels';
import { ComprehensiveFormState, ValidationError, ValidationRule } from '../types';

interface CrossFieldValidationRule {
  id: string;
  name: string;
  description: string;
  standard: TokenStandard | 'ALL';
  fields: string[];
  validator: (formData: any, allData: ComprehensiveFormState) => ValidationError[];
  severity: 'error' | 'warning' | 'info';
  category: 'business' | 'technical' | 'regulatory' | 'security';
}

export class CrossFieldValidator {
  private rules: Map<string, CrossFieldValidationRule> = new Map();
  private validationCache: Map<string, ValidationError[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Add a custom validation rule
   */
  addRule(rule: CrossFieldValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a validation rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.validationCache.delete(ruleId);
  }

  /**
   * Validate all applicable rules for the current form state
   */
  validateAll(formState: ComprehensiveFormState): ValidationError[] {
    const errors: ValidationError[] = [];
    
    for (const rule of this.rules.values()) {
      // Check if rule applies to current standard
      if (rule.standard !== 'ALL' && rule.standard !== formState.standard) {
        continue;
      }

      try {
        const ruleErrors = rule.validator(formState.tabs, formState);
        errors.push(...ruleErrors.map(error => ({
          ...error,
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity
        })));
      } catch (error) {
        console.error(`Validation rule ${rule.id} failed:`, error);
      }
    }

    return errors;
  }

  /**
   * Validate specific fields that might be affected by a change
   */
  validateFields(formState: ComprehensiveFormState, changedFields: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    for (const rule of this.rules.values()) {
      // Check if rule is affected by the changed fields
      if (!rule.fields.some(field => changedFields.includes(field))) {
        continue;
      }

      // Check if rule applies to current standard
      if (rule.standard !== 'ALL' && rule.standard !== formState.standard) {
        continue;
      }

      try {
        const ruleErrors = rule.validator(formState.tabs, formState);
        errors.push(...ruleErrors.map(error => ({
          ...error,
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity
        })));
      } catch (error) {
        console.error(`Validation rule ${rule.id} failed:`, error);
      }
    }

    return errors;
  }

  /**
   * Initialize default cross-field validation rules
   */
  private initializeDefaultRules(): void {
    // ERC-20 Cross-field validations
    this.addRule({
      id: 'erc20-supply-cap-consistency',
      name: 'Supply and Cap Consistency',
      description: 'Initial supply cannot exceed maximum cap',
      standard: TokenStandard.ERC20,
      fields: ['initialSupply', 'cap', 'hasCap'],
      validator: (formData, formState) => {
        const properties = formData.token_erc20_properties;
        if (!properties) return [];

        const errors: ValidationError[] = [];
        
        if (properties.hasCap && properties.cap && properties.initialSupply) {
          const cap = parseFloat(properties.cap);
          const initialSupply = parseFloat(properties.initialSupply);
          
          if (initialSupply > cap) {
            errors.push({
              field: 'initialSupply',
              message: `Initial supply (${initialSupply}) cannot exceed cap (${cap})`,
              type: 'cross_field'
            });
          }
        }
        
        return errors;
      },
      severity: 'error',
      category: 'business'
    });

    // ERC-721 Cross-field validations
    this.addRule({
      id: 'erc721-supply-consistency',
      name: 'NFT Supply Consistency',
      description: 'Max supply must be consistent with minting phases',
      standard: TokenStandard.ERC721,
      fields: ['maxSupply', 'mintPhases'],
      validator: (formData, formState) => {
        const properties = formData.token_erc721_properties;
        const mintPhases = formData.token_erc721_mint_phases;
        if (!properties || !mintPhases) return [];

        const errors: ValidationError[] = [];
        
        if (properties.maxSupply && Array.isArray(mintPhases)) {
          const maxSupply = parseInt(properties.maxSupply);
          const totalMintPhaseSupply = mintPhases.reduce((total, phase) => {
            return total + (parseInt(phase.maxTokens) || 0);
          }, 0);
          
          if (totalMintPhaseSupply > maxSupply) {
            errors.push({
              field: 'maxSupply',
              message: `Total mint phase supply (${totalMintPhaseSupply}) exceeds max supply (${maxSupply})`,
              type: 'cross_field'
            });
          }
        }
        
        return errors;
      },
      severity: 'error',
      category: 'business'
    });

    // ERC-1400 Cross-field validations
    this.addRule({
      id: 'erc1400-kyc-restrictions',
      name: 'KYC and Transfer Restrictions',
      description: 'Transfer restrictions must be enabled if KYC is required',
      standard: TokenStandard.ERC1400,
      fields: ['requireKyc', 'transferRestrictions', 'hasTransferRestrictions'],
      validator: (formData, formState) => {
        const properties = formData.token_erc1400_properties;
        if (!properties) return [];

        const errors: ValidationError[] = [];
        
        if (properties.requireKyc && !properties.hasTransferRestrictions) {
          errors.push({
            field: 'hasTransferRestrictions',
            message: 'Transfer restrictions must be enabled when KYC is required',
            type: 'cross_field'
          });
        }
        
        return errors;
      },
      severity: 'warning',
      category: 'regulatory'
    });

    // ERC-4626 Cross-field validations
    this.addRule({
      id: 'erc4626-fee-consistency',
      name: 'Fee Structure Consistency',
      description: 'Fee percentages must not exceed 100%',
      standard: TokenStandard.ERC4626,
      fields: ['depositFee', 'withdrawalFee', 'performanceFee', 'managementFee'],
      validator: (formData, formState) => {
        const properties = formData.token_erc4626_properties;
        if (!properties) return [];

        const errors: ValidationError[] = [];
        
        const fees = [
          { name: 'depositFee', value: properties.depositFee },
          { name: 'withdrawalFee', value: properties.withdrawalFee },
          { name: 'performanceFee', value: properties.performanceFee },
          { name: 'managementFee', value: properties.managementFee }
        ];
        
        fees.forEach(fee => {
          if (fee.value) {
            const feePercent = parseFloat(fee.value);
            if (feePercent > 100) {
              errors.push({
                field: fee.name,
                message: `${fee.name} cannot exceed 100%`,
                type: 'cross_field'
              });
            }
          }
        });
        
        return errors;
      },
      severity: 'error',
      category: 'business'
    });

    // General token validations
    this.addRule({
      id: 'token-basic-required-fields',
      name: 'Required Basic Fields',
      description: 'All tokens must have name, symbol, and decimals',
      standard: 'ALL',
      fields: ['name', 'symbol', 'decimals'],
      validator: (formData, formState) => {
        const basicToken = formData.tokens;
        if (!basicToken) return [];

        const errors: ValidationError[] = [];
        
        if (!basicToken.name?.trim()) {
          errors.push({
            field: 'name',
            message: 'Token name is required',
            type: 'required'
          });
        }
        
        if (!basicToken.symbol?.trim()) {
          errors.push({
            field: 'symbol',
            message: 'Token symbol is required',
            type: 'required'
          });
        }
        
        if (basicToken.decimals === undefined || basicToken.decimals === null) {
          errors.push({
            field: 'decimals',
            message: 'Token decimals is required',
            type: 'required'
          });
        }
        
        return errors;
      },
      severity: 'error',
      category: 'technical'
    });
  }

  /**
   * Get all available validation rules
   */
  getRules(): CrossFieldValidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: string): CrossFieldValidationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.category === category);
  }

  /**
   * Get rules by standard
   */
  getRulesByStandard(standard: TokenStandard): CrossFieldValidationRule[] {
    return Array.from(this.rules.values()).filter(rule => 
      rule.standard === standard || rule.standard === 'ALL'
    );
  }
}

// Export singleton instance
export const crossFieldValidator = new CrossFieldValidator();
