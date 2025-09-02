/**
 * Index file for product types
 * Exports all product-related types
 */

export * from './productTypes';
export * from './enhancedProducts';
// Re-export BaseProduct from baseProducts but avoid duplicate with productTypes
export { } from './baseProducts';

// Simplified types for ProjectCompatibilityBridge
export interface SimplifiedProject {
  id: string;
  name: string;
  description?: string;
  projectType: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithProducts extends SimplifiedProject {
  products: ProductUnion[];
}

export interface DigitalTokenisedFund {
  id: string;
  projectId: string;
  assetName?: string;
  assetSymbol?: string;
  blockchainNetwork?: string;
  smartContractAddress?: string;
  nav?: number;
  managementFee?: number;
}

// Union type for all product types
export type ProductUnion = any;
