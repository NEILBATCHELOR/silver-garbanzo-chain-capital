/**
 * XLS-89 MPT Metadata Utilities
 * 
 * Utilities for:
 * - Converting between compressed and expanded metadata formats
 * - Hex encoding/decoding metadata
 * - Validating metadata against XLS-89 standard
 * - Calculating metadata byte size
 * 
 * @see https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0089-multi-purpose-token-metadata-schema
 */

import {
  MPTMetadataCompressed,
  MPTMetadataExpanded,
  MPTMetadataURI,
  MPTMetadataURIExpanded,
  MPTMetadataValidationResult,
  URICategory
} from '@/types/xrpl/mpt-metadata';
import {
  AssetClass,
  AssetSubclass,
  validateAssetClassification,
  ASSET_CLASSES,
  ASSET_SUBCLASSES
} from '@/types/xrpl/asset-taxonomy';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_METADATA_BYTES = 1024;
const MAX_TICKER_LENGTH = 6; // Recommended maximum
const VALID_URI_CATEGORIES: URICategory[] = ['website', 'social', 'docs', 'other'];

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert expanded metadata to compressed format (for blockchain storage)
 */
export function compressMetadata(
  expanded: MPTMetadataExpanded
): MPTMetadataCompressed {
  const compressed: MPTMetadataCompressed = {
    t: expanded.ticker,
    n: expanded.name,
    i: expanded.icon,
    ac: expanded.asset_class,
    in: expanded.issuer_name
  };

  // Optional fields
  if (expanded.desc) {
    compressed.d = expanded.desc;
  }

  if (expanded.asset_subclass) {
    compressed.as = expanded.asset_subclass;
  }

  if (expanded.uris && expanded.uris.length > 0) {
    compressed.us = expanded.uris.map(uri => ({
      u: uri.uri,
      c: uri.category,
      t: uri.title
    }));
  }

  if (expanded.additional_info) {
    compressed.ai = expanded.additional_info;
  }

  return compressed;
}
/**
 * Convert compressed metadata to expanded format (for application use)
 */
export function expandMetadata(
  compressed: MPTMetadataCompressed
): MPTMetadataExpanded {
  const expanded: MPTMetadataExpanded = {
    ticker: compressed.t,
    name: compressed.n,
    icon: compressed.i,
    asset_class: compressed.ac,
    issuer_name: compressed.in
  };

  // Optional fields
  if (compressed.d) {
    expanded.desc = compressed.d;
  }

  if (compressed.as) {
    expanded.asset_subclass = compressed.as;
  }

  if (compressed.us && compressed.us.length > 0) {
    expanded.uris = compressed.us.map(uri => ({
      uri: uri.u,
      category: uri.c,
      title: uri.t
    }));
  }

  if (compressed.ai) {
    expanded.additional_info = compressed.ai;
  }

  return expanded;
}

// ============================================================================
// HEX ENCODING/DECODING
// ============================================================================

/**
 * Encode metadata object to hex string (for blockchain storage)
 * Minimizes whitespace to save space
 */
export function encodeMetadataToHex(
  metadata: MPTMetadataCompressed
): string {
  // Convert to JSON with minimal whitespace
  const jsonString = JSON.stringify(metadata);
  
  // Convert to hex
  const hexString = Buffer.from(jsonString, 'utf8').toString('hex').toUpperCase();
  
  return hexString;
}

/**
 * Decode hex string to metadata object
 */
export function decodeMetadataFromHex(
  hexString: string
): MPTMetadataCompressed | null {
  try {
    // Convert from hex to UTF-8
    const jsonString = Buffer.from(hexString, 'hex').toString('utf8');
    
    // Parse JSON
    const metadata = JSON.parse(jsonString) as MPTMetadataCompressed;
    
    return metadata;
  } catch (error) {
    console.error('Error decoding metadata from hex:', error);
    return null;
  }
}

/**
 * Get byte size of encoded metadata
 */
export function getMetadataByteSize(metadata: MPTMetadataCompressed): number {
  const jsonString = JSON.stringify(metadata);
  return Buffer.from(jsonString, 'utf8').length;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate metadata against XLS-89 standard
 */
export function validateMetadata(
  metadata: MPTMetadataExpanded
): MPTMetadataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!metadata.ticker || metadata.ticker.trim().length === 0) {
    errors.push('Ticker is required');
  } else {
    // Ticker validation
    if (!/^[A-Z0-9]+$/.test(metadata.ticker)) {
      errors.push('Ticker must contain only uppercase letters (A-Z) and digits (0-9)');
    }
    if (metadata.ticker.length > MAX_TICKER_LENGTH) {
      warnings.push(`Ticker exceeds recommended maximum of ${MAX_TICKER_LENGTH} characters`);
    }
  }

  if (!metadata.name || metadata.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!metadata.icon || metadata.icon.trim().length === 0) {
    errors.push('Icon URI is required');
  }

  if (!metadata.asset_class) {
    errors.push('Asset class is required');
  } else {
    // Validate asset class
    const assetValidation = validateAssetClassification(
      metadata.asset_class,
      metadata.asset_subclass || null
    );
    if (!assetValidation.valid && assetValidation.error) {
      errors.push(assetValidation.error);
    }
  }

  if (!metadata.issuer_name || metadata.issuer_name.trim().length === 0) {
    errors.push('Issuer name is required');
  }

  // Validate URIs if present
  if (metadata.uris && metadata.uris.length > 0) {
    metadata.uris.forEach((uri, index) => {
      if (!uri.uri || uri.uri.trim().length === 0) {
        errors.push(`URI ${index + 1}: URI path is required`);
      }
      if (!uri.category) {
        errors.push(`URI ${index + 1}: Category is required`);
      } else if (!VALID_URI_CATEGORIES.includes(uri.category)) {
        errors.push(`URI ${index + 1}: Invalid category. Must be one of: ${VALID_URI_CATEGORIES.join(', ')}`);
      }
      if (!uri.title || uri.title.trim().length === 0) {
        errors.push(`URI ${index + 1}: Title is required`);
      }
    });
  }

  // Check byte size
  const compressed = compressMetadata(metadata);
  const byteSize = getMetadataByteSize(compressed);
  
  if (byteSize > MAX_METADATA_BYTES) {
    errors.push(`Metadata exceeds maximum size of ${MAX_METADATA_BYTES} bytes (current: ${byteSize} bytes)`);
  } else if (byteSize > MAX_METADATA_BYTES * 0.9) {
    warnings.push(`Metadata is close to maximum size limit (${byteSize}/${MAX_METADATA_BYTES} bytes)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    byteSize
  };
}

/**
 * Validate compressed metadata (already in XLS-89 format)
 */
export function validateCompressedMetadata(
  metadata: MPTMetadataCompressed
): MPTMetadataValidationResult {
  // Convert to expanded format and validate
  const expanded = expandMetadata(metadata);
  return validateMetadata(expanded);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create empty metadata template
 */
export function createEmptyMetadata(): MPTMetadataExpanded {
  return {
    ticker: '',
    name: '',
    icon: '',
    asset_class: 'other',
    issuer_name: '',
    uris: [],
    additional_info: {}
  };
}

/**
 * Parse metadata from various formats
 * Handles both compressed and expanded formats
 */
export function parseMetadata(
  input: MPTMetadataCompressed | MPTMetadataExpanded | string
): MPTMetadataExpanded | null {
  try {
    // If string, assume it's hex-encoded
    if (typeof input === 'string') {
      const compressed = decodeMetadataFromHex(input);
      return compressed ? expandMetadata(compressed) : null;
    }

    // Check if compressed (has short keys)
    if ('t' in input && 'n' in input) {
      return expandMetadata(input as MPTMetadataCompressed);
    }

    // Already expanded
    if ('ticker' in input && 'name' in input) {
      return input as MPTMetadataExpanded;
    }

    return null;
  } catch (error) {
    console.error('Error parsing metadata:', error);
    return null;
  }
}

/**
 * Format metadata for display
 */
export function formatMetadataForDisplay(metadata: MPTMetadataExpanded): {
  basic: Record<string, string>;
  classification: Record<string, string>;
  uris: MPTMetadataURIExpanded[];
  additional: Record<string, any> | string | undefined;
} {
  return {
    basic: {
      Ticker: metadata.ticker,
      Name: metadata.name,
      Description: metadata.desc || 'N/A',
      Icon: metadata.icon,
      'Issuer Name': metadata.issuer_name
    },
    classification: {
      'Asset Class': metadata.asset_class,
      ...(metadata.asset_subclass && { 'Asset Subclass': metadata.asset_subclass })
    },
    uris: metadata.uris || [],
    additional: metadata.additional_info
  };
}
