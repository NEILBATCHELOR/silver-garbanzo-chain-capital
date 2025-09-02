// Template Management System for Comprehensive Token Forms
// Handles creation, management, and application of reusable token configurations

import { TokenStandard } from '@/types/core/centralModels';
import { ComprehensiveFormState, TokenTableData, FormTabState } from '../types';
import { tokenCRUDService } from '../services/tokenCRUDService';

export interface TokenTemplate {
  id: string;
  name: string;
  description: string;
  standard: TokenStandard;
  category: 'defi' | 'nft' | 'security' | 'gaming' | 'utility' | 'custom';
  tags: string[];
  configuration: TokenTableData;
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    version: string;
    isPublic: boolean;
    usageCount: number;
  };
  validationRules?: string[];
  previewData?: {
    icon?: string;
    color?: string;
    summary?: string;
  };
}

export interface TemplateLibrary {
  templates: TokenTemplate[];
  categories: string[];
  standards: TokenStandard[];
  totalCount: number;
}

export interface TemplateApplyOptions {
  overwriteExisting: boolean;
  mergeWithCurrent: boolean;
  excludeFields: string[];
  includeOnlyFields: string[];
}

class TemplateService {
  private templates: Map<string, TokenTemplate> = new Map();
  private categories: Set<string> = new Set();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Create a new template from current form state
   */
  async createTemplate(
    name: string,
    description: string,
    formState: ComprehensiveFormState,
    category: TokenTemplate['category'] = 'custom',
    tags: string[] = [],
    isPublic = false
  ): Promise<TokenTemplate> {
    const template: TokenTemplate = {
      id: this.generateTemplateId(),
      name,
      description,
      standard: formState.standard,
      category,
      tags,
      configuration: formState.tabs,
      metadata: {
        createdBy: 'current-user', // TODO: Get from auth context
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        isPublic,
        usageCount: 0
      }
    };

    this.templates.set(template.id, template);
    this.categories.add(category);

    // Save to database if needed
    await this.saveTemplateToDatabase(template);

    return template;
  }

  /**
   * Apply template to current form state
   */
  applyTemplate(
    templateId: string,
    currentState: ComprehensiveFormState,
    options: TemplateApplyOptions = {
      overwriteExisting: true,
      mergeWithCurrent: false,
      excludeFields: [],
      includeOnlyFields: []
    }
  ): ComprehensiveFormState {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Update usage count
    template.metadata.usageCount++;
    template.metadata.updatedAt = new Date();

    let newState = { ...currentState };

    if (options.mergeWithCurrent) {
      // Merge template with current state
      newState.tabs = this.mergeConfigurations(
        currentState.tabs,
        template.configuration,
        options
      );
    } else if (options.overwriteExisting) {
      // Replace current state with template
      newState.tabs = this.filterConfiguration(template.configuration, options);
    }

    return newState;
  }

  /**
   * Get all templates
   */
  getAllTemplates(): TokenTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by standard
   */
  getTemplatesByStandard(standard: TokenStandard): TokenTemplate[] {
    return Array.from(this.templates.values()).filter(
      template => template.standard === standard
    );
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): TokenTemplate[] {
    return Array.from(this.templates.values()).filter(
      template => template.category === category
    );
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): TokenTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get template library overview
   */
  getTemplateLibrary(): TemplateLibrary {
    const templates = this.getAllTemplates();
    return {
      templates,
      categories: Array.from(this.categories),
      standards: Array.from(new Set(templates.map(t => t.standard))),
      totalCount: templates.length
    };
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<TokenTemplate>
  ): Promise<TokenTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      metadata: {
        ...template.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    };

    this.templates.set(templateId, updatedTemplate);
    await this.saveTemplateToDatabase(updatedTemplate);

    return updatedTemplate;
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    this.templates.delete(templateId);
    await this.deleteTemplateFromDatabase(templateId);
  }

  /**
   * Clone template
   */
  async cloneTemplate(
    templateId: string,
    newName: string,
    modifications: Partial<TokenTableData> = {}
  ): Promise<TokenTemplate> {
    const originalTemplate = this.templates.get(templateId);
    if (!originalTemplate) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    const clonedTemplate: TokenTemplate = {
      ...originalTemplate,
      id: this.generateTemplateId(),
      name: newName,
      configuration: { ...originalTemplate.configuration, ...modifications },
      metadata: {
        ...originalTemplate.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        usageCount: 0
      }
    };

    this.templates.set(clonedTemplate.id, clonedTemplate);
    await this.saveTemplateToDatabase(clonedTemplate);

    return clonedTemplate;
  }

  /**
   * Export template
   */
  exportTemplate(templateId: string): Blob {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    const exportData = {
      template,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
  }

  /**
   * Import template
   */
  async importTemplate(file: File): Promise<TokenTemplate> {
    const text = await file.text();
    const importData = JSON.parse(text);

    if (!importData.template) {
      throw new Error('Invalid template file format');
    }

    const template = importData.template as TokenTemplate;
    template.id = this.generateTemplateId(); // Generate new ID
    template.metadata.createdAt = new Date();
    template.metadata.updatedAt = new Date();

    this.templates.set(template.id, template);
    this.categories.add(template.category);

    await this.saveTemplateToDatabase(template);

    return template;
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    // ERC-20 Basic Token Template
    this.createDefaultTemplate({
      name: 'Basic ERC-20 Token',
      description: 'A simple ERC-20 token with basic functionality',
      standard: TokenStandard.ERC20,
      category: 'utility',
      configuration: {
        tokens: {
          name: 'My Token',
          symbol: 'MTK',
          decimals: 18
        },
        token_erc20_properties: {
          initialSupply: '1000000',
          hasCap: false,
          isMintable: false,
          isBurnable: false,
          isPausable: false
        }
      }
    });

    // ERC-721 NFT Collection Template
    this.createDefaultTemplate({
      name: 'NFT Collection',
      description: 'Standard NFT collection with metadata support',
      standard: TokenStandard.ERC721,
      category: 'nft',
      configuration: {
        tokens: {
          name: 'My NFT Collection',
          symbol: 'MYNFT',
          decimals: 0
        },
        token_erc721_properties: {
          maxSupply: '10000',
          baseUri: 'https://api.example.com/metadata/',
          hasRoyalty: true,
          royaltyPercentage: '250' // 2.5%
        }
      }
    });

    // ERC-1400 Security Token Template
    this.createDefaultTemplate({
      name: 'Security Token',
      description: 'Compliant security token with KYC and transfer restrictions',
      standard: TokenStandard.ERC1400,
      category: 'security',
      configuration: {
        tokens: {
          name: 'Security Token',
          symbol: 'SEC',
          decimals: 18
        },
        token_erc1400_properties: {
          requireKyc: true,
          hasTransferRestrictions: true,
          isSecurityToken: true,
          regulatoryCompliance: true
        }
      }
    });

    // ERC-4626 Vault Token Template
    this.createDefaultTemplate({
      name: 'Vault Token',
      description: 'Yield-bearing vault token for DeFi applications',
      standard: TokenStandard.ERC4626,
      category: 'defi',
      configuration: {
        tokens: {
          name: 'Vault Token',
          symbol: 'VAULT',
          decimals: 18
        },
        token_erc4626_properties: {
          vaultType: 'yield_vault',
          depositFee: '0.1',
          withdrawalFee: '0.1',
          performanceFee: '10'
        }
      }
    });
  }

  /**
   * Create a default template
   */
  private createDefaultTemplate(config: {
    name: string;
    description: string;
    standard: TokenStandard;
    category: TokenTemplate['category'];
    configuration: TokenTableData;
  }): void {
    const template: TokenTemplate = {
      id: this.generateTemplateId(),
      ...config,
      tags: ['default', config.standard.toLowerCase()],
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        isPublic: true,
        usageCount: 0
      }
    };

    this.templates.set(template.id, template);
    this.categories.add(config.category);
  }

  /**
   * Generate unique template ID
   */
  private generateTemplateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Merge two configurations
   */
  private mergeConfigurations(
    current: Record<string, FormTabState>,
    template: Record<string, any>,
    options: TemplateApplyOptions
  ): Record<string, FormTabState> {
    const merged = { ...current };

    for (const [tableName, tableData] of Object.entries(template)) {
      if (options.excludeFields.includes(tableName)) {
        continue;
      }

      if (options.includeOnlyFields.length > 0 && !options.includeOnlyFields.includes(tableName)) {
        continue;
      }

      if (merged[tableName]) {
        merged[tableName] = { 
          ...merged[tableName], 
          data: { ...merged[tableName].data, ...tableData },
          isModified: true
        };
      } else {
        merged[tableName] = {
          isModified: true,
          hasErrors: false,
          data: tableData,
          validationErrors: {}
        };
      }
    }

    return merged;
  }

  /**
   * Filter configuration based on options
   */
  private filterConfiguration(
    configuration: Record<string, any>,
    options: TemplateApplyOptions
  ): Record<string, FormTabState> {
    const filtered: Record<string, FormTabState> = {};

    for (const [tableName, tableData] of Object.entries(configuration)) {
      if (options.excludeFields.includes(tableName)) {
        continue;
      }

      if (options.includeOnlyFields.length > 0 && !options.includeOnlyFields.includes(tableName)) {
        continue;
      }

      filtered[tableName] = {
        isModified: true,
        hasErrors: false,
        data: tableData,
        validationErrors: {}
      };
    }

    return filtered;
  }

  /**
   * Save template to database (placeholder)
   */
  private async saveTemplateToDatabase(template: TokenTemplate): Promise<void> {
    // TODO: Implement database storage using tokenCRUDService
    // For now, we'll store in local storage as a fallback
    localStorage.setItem(`template_${template.id}`, JSON.stringify(template));
  }

  /**
   * Delete template from database (placeholder)
   */
  private async deleteTemplateFromDatabase(templateId: string): Promise<void> {
    // TODO: Implement database deletion
    localStorage.removeItem(`template_${templateId}`);
  }

  /**
   * Load templates from database (placeholder)
   */
  async loadTemplatesFromDatabase(): Promise<void> {
    // TODO: Implement database loading
    // For now, load from local storage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('template_')) {
        try {
          const template = JSON.parse(localStorage.getItem(key) || '');
          this.templates.set(template.id, template);
          this.categories.add(template.category);
        } catch (error) {
          console.error(`Failed to load template from ${key}:`, error);
        }
      }
    }
  }
}

// Export singleton instance
export const templateService = new TemplateService();

// Initialize templates on startup
templateService.loadTemplatesFromDatabase();
