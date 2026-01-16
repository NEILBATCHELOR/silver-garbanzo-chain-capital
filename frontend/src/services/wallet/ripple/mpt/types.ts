/**
 * XRPL MPT (Multi-Purpose Token) Types
 * XLS-33 and XLS-89 compliant type definitions
 */

/**
 * MPT Metadata structure (XLS-89 standard)
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
