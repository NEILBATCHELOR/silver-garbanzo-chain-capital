/**
 * XRPL MPT (Multi-Purpose Token) Types
 * XLS-33 and XLS-89 compliant type definitions
 */

/**
 * MPT Metadata structure (XLS-89 standard) - Internal format with full keys
 * This is used internally in the application
 */
export interface MPTMetadata {
  ticker: string;        // Short symbol (e.g., "USDC")
  name: string;         // Full name
  desc: string;         // Description
  icon?: string;        // Icon URL
  asset_class?: string; // e.g., "rwa", "currency"
  asset_subclass?: string; // e.g., "treasury", "real-estate"
  issuer_name?: string; // Issuer's legal name
  uris?: Array<{
    uri: string;
    category: string;   // "website", "docs", "whitepaper"
    title: string;
  }>;
  additional_info?: Record<string, unknown>;
}

/**
 * MPT Metadata - XLS-89 Compressed JSON Format
 * This is the format that gets encoded to hex and stored on the blockchain
 * 
 * Compressed keys are used to fit within the 1024-byte metadata limit:
 * - t: ticker
 * - n: name  
 * - d: desc
 * - i: icon
 * - ac: asset_class
 * - as: asset_subclass
 * - in: issuer_name
 * - us: uris (array of {u: uri, c: category, t: title})
 * - ai: additional_info
 */
export interface MPTMetadataCompressed {
  t: string;             // ticker
  n: string;             // name
  d: string;             // desc
  i?: string;            // icon
  ac?: string;           // asset_class
  as?: string;           // asset_subclass
  in?: string;           // issuer_name
  us?: Array<{
    u: string;           // uri
    c: string;           // category
    t: string;           // title
  }>;
  ai?: Record<string, unknown>; // additional_info
}

/**
 * Convert internal MPTMetadata to XLS-89 compressed format
 */
export function compressMetadata(metadata: MPTMetadata): MPTMetadataCompressed {
  const compressed: MPTMetadataCompressed = {
    t: metadata.ticker,
    n: metadata.name,
    d: metadata.desc
  }

  if (metadata.icon) {
    compressed.i = metadata.icon
  }

  if (metadata.asset_class) {
    compressed.ac = metadata.asset_class
  }

  if (metadata.asset_subclass) {
    compressed.as = metadata.asset_subclass
  }

  if (metadata.issuer_name) {
    compressed.in = metadata.issuer_name
  }

  if (metadata.uris && metadata.uris.length > 0) {
    compressed.us = metadata.uris.map(uri => ({
      u: uri.uri,
      c: uri.category,
      t: uri.title
    }))
  }

  if (metadata.additional_info) {
    compressed.ai = metadata.additional_info
  }

  return compressed
}

/**
 * Convert XLS-89 compressed format back to internal MPTMetadata
 */
export function decompressMetadata(compressed: MPTMetadataCompressed): MPTMetadata {
  const metadata: MPTMetadata = {
    ticker: compressed.t,
    name: compressed.n,
    desc: compressed.d
  }

  if (compressed.i) {
    metadata.icon = compressed.i
  }

  if (compressed.ac) {
    metadata.asset_class = compressed.ac
  }

  if (compressed.as) {
    metadata.asset_subclass = compressed.as
  }

  if (compressed.in) {
    metadata.issuer_name = compressed.in
  }

  if (compressed.us && compressed.us.length > 0) {
    metadata.uris = compressed.us.map(uri => ({
      uri: uri.u,
      category: uri.c,
      title: uri.t
    }))
  }

  if (compressed.ai) {
    metadata.additional_info = compressed.ai
  }

  return metadata
}

/**
 * MPT Holder information
 */
export interface MPTHolder {
  address: string;
  balance: string;
  authorized: boolean;
}

/**
 * MPT Issuance details
 */
export interface MPTIssuanceDetails {
  issuer: string;
  assetScale: number;
  maximumAmount?: string;
  outstandingAmount: string;
  metadata: MPTMetadata;
  flags: number;
}