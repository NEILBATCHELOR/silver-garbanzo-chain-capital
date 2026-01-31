/**
 * XLS-89 MPT Metadata Standard - Complete Type Definitions
 * 
 * This file implements the full XLS-89 metadata specification with:
 * - Compressed JSON keys (t, n, d, i, ac, as, in, us, ai)
 * - URI array support
 * - Additional info field support
 * - Proper validation
 * 
 * @see https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0089-multi-purpose-token-metadata-schema
 * @see /docs/XRPL Implementation Documentation
 */

import { AssetClass, AssetSubclass } from './asset-taxonomy';

// ============================================================================
// XLS-89 COMPRESSED METADATA TYPES (On-Chain Format)
// ============================================================================

/**
 * URI Category types per XLS-89
 */
export type URICategory = 'website' | 'social' | 'docs' | 'other';

/**
 * Single URI entry with compressed keys
 */
export interface MPTMetadataURI {
  u: string;       // uri - hostname/path or full URI
  c: URICategory;  // category
  t: string;       // title - human-readable label
}

/**
 * XLS-89 Compliant Metadata with COMPRESSED keys
 * This is the format that gets hex-encoded and stored on-chain
 */
export interface MPTMetadataCompressed {
  t: string;                              // ticker (required)
  n: string;                              // name (required)
  d?: string;                             // desc (optional)
  i: string;                              // icon URI (required)
  ac: AssetClass;                         // asset_class (required)
  as?: AssetSubclass;                     // asset_subclass (optional, required if ac='rwa')
  in: string;                             // issuer_name (required)
  us?: MPTMetadataURI[];                  // uris (optional)
  ai?: Record<string, any> | string;      // additional_info (optional)
}

// ============================================================================
// EXPANDED METADATA TYPES (Application Format)
// ============================================================================

/**
 * Single URI entry with expanded keys for application use
 */
export interface MPTMetadataURIExpanded {
  uri: string;
  category: URICategory;
  title: string;
}

/**
 * Expanded metadata format for application use
 * This format is used in forms, displays, and database storage
 */
export interface MPTMetadataExpanded {
  ticker: string;
  name: string;
  desc?: string;
  icon: string;
  asset_class: AssetClass;
  asset_subclass?: AssetSubclass;
  issuer_name: string;
  uris?: MPTMetadataURIExpanded[];
  additional_info?: Record<string, any> | string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface MPTMetadataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  byteSize?: number;
}