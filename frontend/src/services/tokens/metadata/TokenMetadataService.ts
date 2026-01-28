/**
 * Token Metadata Database Service
 * 
 * Manages token metadata storage in the database BEFORE blockchain deployment.
 * Supports both enumeration-based and universal framework approaches.
 * 
 * Flow:
 * 1. Form collects metadata
 * 2. Service saves to database (token_metadata table)
 * 3. Returns database record with ID
 * 4. Blockchain deployment happens (optional)
 * 5. Update record with token_id after deployment
 * 
 * INTEGRATION FLOW WITH TOKEN DEPLOYMENT:
 * ----------------------------------------
 * 1. Pre-Deployment: saveMetadata() → Returns metadata_id
 * 2. Deployment: Token2022DeploymentService.deployToken2022()
 * 3. Post-Deployment: linkToDeployedToken() → Updates metadata record with token_id
 */

import { supabase } from '@/infrastructure/database/client';

// ============================================================================
// TYPES
// ============================================================================

export interface TokenMetadataRecord {
  id: string;
  token_id: string | null;
  project_id: string | null;
  metadata_uri: string;
  prospectus_uri: string | null;
  termsheet_uri: string | null;
  asset_class: string;
  instrument_type: string;
  name: string;
  symbol: string;
  description: string | null;
  metadata_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateMetadataInput {
  // Basic Info
  name: string;
  symbol: string;
  description?: string;
  
  // Classification
  asset_class: string;
  instrument_type: string;
  
  // URIs
  metadata_uri: string;
  prospectus_uri?: string;
  termsheet_uri?: string;
  
  // Full Metadata
  metadata_json: Record<string, any>;
  
  // Optional Project Link
  project_id?: string;
}

export interface UpdateMetadataInput {
  token_id?: string;
  metadata_uri?: string;
  prospectus_uri?: string;
  termsheet_uri?: string;
  description?: string;
  metadata_json?: Record<string, any>;
}

export interface SaveMetadataResult {
  success: boolean;
  data?: TokenMetadataRecord;
  error?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class TokenMetadataService {
  
  /**
   * Save metadata to database BEFORE blockchain deployment
   * This creates a database record that can be referenced during deployment
   * 
   * USAGE WITH DEPLOYMENT:
   * ```typescript
   * // Step 1: Save metadata
   * const metadataResult = await TokenMetadataService.saveMetadata(input);
   * const metadataId = metadataResult.data!.id;
   * 
   * // Step 2: Deploy with metadata reference
   * const deployResult = await token2022DeploymentService.deployToken2022WithMetadata(
   *   config, 
   *   options, 
   *   metadataId
   * );
   * ```
   */
  static async saveMetadata(
    input: CreateMetadataInput
  ): Promise<SaveMetadataResult> {
    try {
      // Validate required fields
      if (!input.name || !input.symbol) {
        return {
          success: false,
          error: 'Name and symbol are required'
        };
      }

      if (!input.asset_class || !input.instrument_type) {
        return {
          success: false,
          error: 'Asset class and instrument type are required'
        };
      }

      if (!input.metadata_json) {
        return {
          success: false,
          error: 'Metadata JSON is required'
        };
      }

      // Insert into database
      const { data, error } = await supabase
        .from('token_metadata')
        .insert({
          name: input.name,
          symbol: input.symbol,
          description: input.description || null,
          asset_class: input.asset_class,
          instrument_type: input.instrument_type,
          metadata_uri: input.metadata_uri,
          prospectus_uri: input.prospectus_uri || null,
          termsheet_uri: input.termsheet_uri || null,
          metadata_json: input.metadata_json,
          project_id: input.project_id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving metadata:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as TokenMetadataRecord
      };
    } catch (err) {
      console.error('Exception saving metadata:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * Link metadata record to deployed token
   * Call this AFTER successful token deployment
   * 
   * @param metadataId - The token_metadata.id from pre-deployment save
   * @param tokenId - The tokens.id from deployment
   */
  static async linkToDeployedToken(
    metadataId: string,
    tokenId: string
  ): Promise<SaveMetadataResult> {
    try {
      const { data, error } = await supabase
        .from('token_metadata')
        .update({
          token_id: tokenId,
          updated_at: new Date().toISOString()
        })
        .eq('id', metadataId)
        .select()
        .single();

      if (error) {
        console.error('Error linking metadata to token:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as TokenMetadataRecord
      };
    } catch (err) {
      console.error('Exception linking metadata to token:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * Update metadata record (typically after blockchain deployment to add token_id)
   * 
   * DEPRECATED: Use linkToDeployedToken() for linking to deployed tokens
   * This method is kept for backward compatibility and general updates
   */
  static async updateMetadata(
    metadataId: string,
    updates: UpdateMetadataInput
  ): Promise<SaveMetadataResult> {
    try {
      const { data, error } = await supabase
        .from('token_metadata')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', metadataId)
        .select()
        .single();

      if (error) {
        console.error('Error updating metadata:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as TokenMetadataRecord
      };
    } catch (err) {
      console.error('Exception updating metadata:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * Get metadata by ID
   */
  static async getMetadata(
    metadataId: string
  ): Promise<SaveMetadataResult> {
    try {
      const { data, error } = await supabase
        .from('token_metadata')
        .select('*')
        .eq('id', metadataId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as TokenMetadataRecord
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * Get metadata by token_id (after deployment)
   */
  static async getMetadataByTokenId(
    tokenId: string
  ): Promise<SaveMetadataResult> {
    try {
      const { data, error } = await supabase
        .from('token_metadata')
        .select('*')
        .eq('token_id', tokenId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as TokenMetadataRecord
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * List metadata by asset class
   */
  static async listByAssetClass(
    assetClass: string,
    limit: number = 50
  ): Promise<{ success: boolean; data?: TokenMetadataRecord[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('token_metadata')
        .select('*')
        .eq('asset_class', assetClass)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as TokenMetadataRecord[]
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * List metadata by instrument type
   */
  static async listByInstrumentType(
    instrumentType: string,
    limit: number = 50
  ): Promise<{ success: boolean; data?: TokenMetadataRecord[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('token_metadata')
        .select('*')
        .eq('instrument_type', instrumentType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as TokenMetadataRecord[]
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * List metadata by project
   */
  static async listByProject(
    projectId: string,
    limit: number = 50
  ): Promise<{ success: boolean; data?: TokenMetadataRecord[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('token_metadata')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as TokenMetadataRecord[]
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete metadata record
   */
  static async deleteMetadata(
    metadataId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('token_metadata')
        .delete()
        .eq('id', metadataId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  // ==========================================================================
  // HELPER METHODS: Convert form data to CreateMetadataInput
  // ==========================================================================

  /**
   * Helper: Create metadata from enumeration-based form data
   * Converts form data to database format
   * 
   * @example
   * ```typescript
   * const input = TokenMetadataService.createMetadataFromEnumeration(
   *   formData,
   *   'structured_product',
   *   'autocallable'
   * );
   * const result = await TokenMetadataService.saveMetadata(input);
   * ```
   */
  static createMetadataFromEnumeration(
    formData: any,
    assetClass: string,
    instrumentType: string,
    projectId?: string
  ): CreateMetadataInput {
    return {
      name: formData.name || '',
      symbol: formData.symbol || '',
      description: formData.description,
      asset_class: assetClass,
      instrument_type: instrumentType,
      metadata_uri: formData.metadata_uri || formData.uri || '',
      prospectus_uri: formData.prospectus_uri || formData.prospectusUri,
      termsheet_uri: formData.termsheet_uri || formData.termSheetUri,
      metadata_json: formData,
      project_id: projectId
    };
  }

  /**
   * Helper: Create metadata from universal framework data
   * Converts universal format to database format
   * 
   * @example
   * ```typescript
   * const input = TokenMetadataService.createMetadataFromUniversal(
   *   universalData
   * );
   * const result = await TokenMetadataService.saveMetadata(input);
   * ```
   */
  static createMetadataFromUniversal(
    universalData: any,
    projectId?: string
  ): CreateMetadataInput {
    return {
      name: universalData.name || '',
      symbol: universalData.symbol || '',
      description: universalData.description,
      asset_class: universalData.assetClass || 'structured_product',
      instrument_type: universalData.productCategory || universalData.instrumentType || '',
      metadata_uri: universalData.uri || '',
      prospectus_uri: universalData.prospectusUri,
      termsheet_uri: universalData.termSheetUri || universalData.termsheet_uri,
      metadata_json: universalData,
      project_id: projectId
    };
  }
}
