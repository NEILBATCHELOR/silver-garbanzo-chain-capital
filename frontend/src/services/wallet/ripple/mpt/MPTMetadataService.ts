import type { MPTMetadata } from './types';

/**
 * Metadata validation result
 */
export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * MPT Metadata Service
 * 
 * Handles MPT metadata validation, encoding, and management
 * according to XLS-89 standard.
 */
export class MPTMetadataService {
  private static readonly MAX_METADATA_SIZE = 1024; // bytes
  private static readonly MAX_TICKER_LENGTH = 10;
  private static readonly MAX_NAME_LENGTH = 100;
  private static readonly MAX_DESC_LENGTH = 500;
  private static readonly MAX_URI_COUNT = 10;

  /**
   * Validate MPT metadata
   */
  static validateMetadata(metadata: MPTMetadata): MetadataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!metadata.ticker || metadata.ticker.trim().length === 0) {
      errors.push('Ticker is required');
    } else if (metadata.ticker.length > this.MAX_TICKER_LENGTH) {
      errors.push(`Ticker must be ${this.MAX_TICKER_LENGTH} characters or less`);
    }

    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (metadata.name.length > this.MAX_NAME_LENGTH) {
      errors.push(`Name must be ${this.MAX_NAME_LENGTH} characters or less`);
    }

    if (!metadata.desc || metadata.desc.trim().length === 0) {
      errors.push('Description is required');
    } else if (metadata.desc.length > this.MAX_DESC_LENGTH) {
      errors.push(`Description must be ${this.MAX_DESC_LENGTH} characters or less`);
    }

    // Optional fields validation
    if (metadata.icon && !this.isValidUrl(metadata.icon)) {
      errors.push('Icon must be a valid URL');
    }

    if (metadata.uris) {
      if (metadata.uris.length > this.MAX_URI_COUNT) {
        errors.push(`Maximum ${this.MAX_URI_COUNT} URIs allowed`);
      }

      metadata.uris.forEach((uri, index) => {
        if (!uri.uri || !this.isValidUrl(uri.uri)) {
          errors.push(`URI at index ${index} must be a valid URL`);
        }
        if (!uri.category || uri.category.trim().length === 0) {
          errors.push(`URI at index ${index} must have a category`);
        }
        if (!uri.title || uri.title.trim().length === 0) {
          errors.push(`URI at index ${index} must have a title`);
        }
      });
    }

    // Check total metadata size
    const metadataJson = JSON.stringify(metadata);
    const metadataSize = Buffer.from(metadataJson).length;
    
    if (metadataSize > this.MAX_METADATA_SIZE) {
      errors.push(
        `Metadata size (${metadataSize} bytes) exceeds maximum (${this.MAX_METADATA_SIZE} bytes)`
      );
    } else if (metadataSize > this.MAX_METADATA_SIZE * 0.9) {
      warnings.push(
        `Metadata size (${metadataSize} bytes) is close to maximum (${this.MAX_METADATA_SIZE} bytes)`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create basic metadata template
   */
  static createBasicMetadata(
    ticker: string,
    name: string,
    description: string
  ): MPTMetadata {
    return {
      ticker: ticker.trim().toUpperCase(),
      name: name.trim(),
      desc: description.trim()
    };
  }

  /**
   * Create RWA (Real World Asset) metadata template
   */
  static createRWAMetadata(params: {
    ticker: string;
    name: string;
    description: string;
    assetSubclass: string;
    issuerName: string;
    websiteUrl?: string;
    docsUrl?: string;
  }): MPTMetadata {
    const metadata: MPTMetadata = {
      ticker: params.ticker.trim().toUpperCase(),
      name: params.name.trim(),
      desc: params.description.trim(),
      asset_class: 'rwa',
      asset_subclass: params.assetSubclass,
      issuer_name: params.issuerName,
      uris: []
    };

    if (params.websiteUrl) {
      metadata.uris!.push({
        uri: params.websiteUrl,
        category: 'website',
        title: 'Official Website'
      });
    }

    if (params.docsUrl) {
      metadata.uris!.push({
        uri: params.docsUrl,
        category: 'docs',
        title: 'Documentation'
      });
    }

    return metadata;
  }

  /**
   * Create stablecoin metadata template
   */
  static createStablecoinMetadata(params: {
    ticker: string;
    name: string;
    description: string;
    issuerName: string;
    reserveUrl?: string;
    auditUrl?: string;
  }): MPTMetadata {
    const metadata: MPTMetadata = {
      ticker: params.ticker.trim().toUpperCase(),
      name: params.name.trim(),
      desc: params.description.trim(),
      asset_class: 'currency',
      asset_subclass: 'stablecoin',
      issuer_name: params.issuerName,
      uris: []
    };

    if (params.reserveUrl) {
      metadata.uris!.push({
        uri: params.reserveUrl,
        category: 'docs',
        title: 'Reserve Attestation'
      });
    }

    if (params.auditUrl) {
      metadata.uris!.push({
        uri: params.auditUrl,
        category: 'docs',
        title: 'Audit Report'
      });
    }

    return metadata;
  }

  /**
   * Add URI to metadata
   */
  static addURI(
    metadata: MPTMetadata,
    uri: string,
    category: string,
    title: string
  ): MPTMetadata {
    if (!metadata.uris) {
      metadata.uris = [];
    }

    if (metadata.uris.length >= this.MAX_URI_COUNT) {
      throw new Error(`Maximum ${this.MAX_URI_COUNT} URIs allowed`);
    }

    if (!this.isValidUrl(uri)) {
      throw new Error('Invalid URI format');
    }

    metadata.uris.push({ uri, category, title });
    return metadata;
  }

  /**
   * Remove URI from metadata
   */
  static removeURI(metadata: MPTMetadata, index: number): MPTMetadata {
    if (!metadata.uris || index < 0 || index >= metadata.uris.length) {
      throw new Error('Invalid URI index');
    }

    metadata.uris.splice(index, 1);
    return metadata;
  }

  /**
   * Update metadata field
   */
  static updateField<K extends keyof MPTMetadata>(
    metadata: MPTMetadata,
    field: K,
    value: MPTMetadata[K]
  ): MPTMetadata {
    metadata[field] = value;
    return metadata;
  }

  /**
   * Get metadata size in bytes
   */
  static getMetadataSize(metadata: MPTMetadata): number {
    const metadataJson = JSON.stringify(metadata);
    return Buffer.from(metadataJson).length;
  }

  /**
   * Check if metadata size is within limits
   */
  static isWithinSizeLimit(metadata: MPTMetadata): boolean {
    return this.getMetadataSize(metadata) <= this.MAX_METADATA_SIZE;
  }

  /**
   * Optimize metadata to fit size limits
   */
  static optimizeMetadata(metadata: MPTMetadata): MPTMetadata {
    const optimized = { ...metadata };

    // Remove additional_info if size exceeds limit
    if (!this.isWithinSizeLimit(optimized) && optimized.additional_info) {
      delete optimized.additional_info;
    }

    // Trim URIs if still too large
    if (!this.isWithinSizeLimit(optimized) && optimized.uris && optimized.uris.length > 3) {
      optimized.uris = optimized.uris.slice(0, 3);
    }

    // Truncate description if still too large
    if (!this.isWithinSizeLimit(optimized) && optimized.desc.length > 200) {
      optimized.desc = optimized.desc.substring(0, 197) + '...';
    }

    return optimized;
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Get recommended asset classes
   */
  static getAssetClasses(): string[] {
    return [
      'currency',
      'commodity',
      'rwa',
      'security',
      'utility',
      'governance'
    ];
  }

  /**
   * Get recommended asset subclasses for a given class
   */
  static getAssetSubclasses(assetClass: string): string[] {
    const subclasses: Record<string, string[]> = {
      currency: ['stablecoin', 'cbdc', 'fiat-backed'],
      commodity: ['gold', 'silver', 'oil', 'agricultural'],
      rwa: ['real-estate', 'treasury', 'invoice', 'art', 'collectible'],
      security: ['equity', 'debt', 'derivative', 'fund'],
      utility: ['access', 'service', 'reward'],
      governance: ['voting', 'treasury']
    };

    return subclasses[assetClass] || [];
  }

  /**
   * Get recommended URI categories
   */
  static getURICategories(): string[] {
    return [
      'website',
      'docs',
      'whitepaper',
      'audit',
      'reserve',
      'legal',
      'social',
      'support'
    ];
  }
}
