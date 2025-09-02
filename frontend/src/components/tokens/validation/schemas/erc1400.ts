/**
 * ERC-1400 Token Validation Schemas
 * 
 * Validation schemas for ERC-1400 security tokens
 */

import { z } from 'zod';
import { tokenBaseSchema, decimalsSchema, supplySchema, booleanFlagsSchema, ethereumAddressSchema } from './base';
import { ValidationResult } from '../types';
import { TokenFormData } from '../../types';

// Partition schema
const partitionSchema = z.object({
  name: z.string().min(1, 'Partition name is required'),
  amount: z.string().refine(
    (val) => val === '' || /^\d+$/.test(val),
    'Amount must be a number'
  ),
  transferable: z.boolean().default(true),
  partitionType: z.enum(['equity', 'debt', 'preferred', 'common']).optional(),
  partitionId: z.string().optional() // Allow partitionId field
});

// Document schema
const documentSchema = z.object({
  name: z.string().min(1, 'Document name is required'),
  uri: z.string().url('Invalid document URI'),
  hash: z.string().optional(),
  documentType: z.string().optional()
});

// Base ERC-1400 properties
const erc1400PropertiesBaseSchema = z.object({
  initialSupply: supplySchema,
  cap: z.string().regex(/^\d+$/, 'Cap must be a number').optional(),
  tokenDetails: z.string().optional(),
  issuingJurisdiction: z.string().optional(),
  issuingEntityName: z.string().optional(),
  issuingEntityLei: z.string().optional(),
  regulationType: z.enum(['reg-d', 'reg-a-plus', 'reg-s', 'reg-cf', 'public', 'other']).optional(),
  isIssuable: z.boolean().default(true),
  isMultiClass: z.boolean().default(false),
  transferRestrictions: z.boolean().default(true),
  enforceKYC: z.boolean().default(false),
  forcedTransfersEnabled: z.boolean().default(false),
  isPausable: z.boolean().default(false)
});

// ERC-1400 Min Schema Core (without refine for extensibility)
const erc1400MinSchemaCore = tokenBaseSchema.extend({
  decimals: decimalsSchema.default(18),
  erc1400Properties: erc1400PropertiesBaseSchema.partial().optional(),
  partitions: z.array(partitionSchema).optional(), // Optional - only required when isMultiClass is true
  controllers: z.array(ethereumAddressSchema).optional(),
  
  // Backward compatibility
  initialSupply: supplySchema.optional(),
  isIssuable: z.boolean().default(true),
  isMultiClass: z.boolean().default(false),
  transferRestrictions: z.boolean().default(true)
});

// ERC-1400 Min Schema with validation
export const erc1400MinSchema = erc1400MinSchemaCore.refine(
  (data) => {
    // If multi-class is enabled, partitions are required
    if (data.isMultiClass && (!data.partitions || data.partitions.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "At least one partition is required when multi-class is enabled",
    path: ["partitions"]
  }
);

// ERC-1400 Max Schema (extending the core schema, not the refined one)
export const erc1400MaxSchema = erc1400MinSchemaCore.extend({
  erc1400Properties: erc1400PropertiesBaseSchema.optional(),
  erc1400Partitions: z.array(partitionSchema).optional(), // Additional partitions for max mode
  erc1400Controllers: z.array(z.object({ address: ethereumAddressSchema })).optional(),
  erc1400Documents: z.array(documentSchema).optional(),
  forcedRedemptionEnabled: z.boolean().default(false),
  autoCompliance: z.boolean().default(false),
  granularControl: z.boolean().default(false),
  dividendDistribution: z.boolean().default(false),
  corporateActions: z.boolean().default(false)
});

export function validateERC1400Token(data: TokenFormData, configMode: 'min' | 'max' = 'min'): ValidationResult {
  try {
    const schema = configMode === 'max' ? erc1400MaxSchema : erc1400MinSchema;
    const result = schema.safeParse(data);
    
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      result.error.errors.forEach(error => {
        const path = error.path.join('.');
        if (!errors[path]) errors[path] = [];
        errors[path].push(error.message);
      });
      return { isValid: false, errors, warnings: {} };
    }
    
    return { isValid: true, errors: {}, warnings: {}, data: result.data };
  } catch (error) {
    return {
      isValid: false,
      errors: { general: [error instanceof Error ? error.message : 'Validation failed'] },
      warnings: {}
    };
  }
}
