// Bulk Operations Service for Comprehensive Token Forms
// Handles import/export, batch operations, and data migration

import { TokenStandard } from '@/types/core/centralModels';
import { ComprehensiveFormState, TokenTableData, TokensTableData } from '../types';
import { tokenCRUDService } from '../services/tokenCRUDService';

export interface BulkImportOptions {
  format: 'json' | 'csv' | 'excel';
  overwrite: boolean;
  validateBeforeImport: boolean;
  skipErrors: boolean;
}

export interface BulkExportOptions {
  format: 'json' | 'csv' | 'excel';
  includeEmptyFields: boolean;
  includeSensitiveData: boolean;
  compressOutput: boolean;
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  errors: number;
  warnings: number;
  skipped: number;
  details: {
    succeeded: any[];
    failed: any[];
    warnings: any[];
  };
}

class BulkOperationsService {
  /**
   * Export token data in specified format
   */
  async exportTokenData(
    tokenIds: string[],
    standard: TokenStandard,
    options: BulkExportOptions
  ): Promise<Blob> {
    const allTokenData: any[] = [];

    for (const tokenId of tokenIds) {
      try {
        const tokenData = await tokenCRUDService.loadAllTokenData(tokenId, standard);
        
        // Clean data based on options
        if (!options.includeEmptyFields) {
          this.removeEmptyFields(tokenData);
        }
        
        if (!options.includeSensitiveData) {
          this.removeSensitiveFields(tokenData);
        }
        
        allTokenData.push(tokenData);
      } catch (error) {
        console.error(`Failed to export token ${tokenId}:`, error);
      }
    }

    switch (options.format) {
      case 'json':
        return this.exportAsJSON(allTokenData, options.compressOutput);
      case 'csv':
        return this.exportAsCSV(allTokenData);
      case 'excel':
        return this.exportAsExcel(allTokenData);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Import token data from file
   */
  async importTokenData(
    file: File,
    standard: TokenStandard,
    options: BulkImportOptions
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: true,
      processed: 0,
      errors: 0,
      warnings: 0,
      skipped: 0,
      details: {
        succeeded: [],
        failed: [],
        warnings: []
      }
    };

    try {
      let data: any[];
      
      switch (options.format) {
        case 'json':
          data = await this.parseJSON(file);
          break;
        case 'csv':
          data = await this.parseCSV(file);
          break;
        case 'excel':
          data = await this.parseExcel(file);
          break;
        default:
          throw new Error(`Unsupported import format: ${options.format}`);
      }

      for (const tokenData of data) {
        try {
          result.processed++;
          
          // Validate data if required
          if (options.validateBeforeImport) {
            const validationErrors = this.validateTokenData(tokenData, standard);
            if (validationErrors.length > 0) {
              if (options.skipErrors) {
                result.skipped++;
                result.details.warnings.push({
                  data: tokenData,
                  errors: validationErrors
                });
                continue;
              } else {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
              }
            }
          }

          // Import the token
          await this.importSingleToken(tokenData, standard, options.overwrite);
          result.details.succeeded.push(tokenData);
          
        } catch (error) {
          result.errors++;
          result.details.failed.push({
            data: tokenData,
            error: error instanceof Error ? error.message : String(error)
          });
          
          if (!options.skipErrors) {
            result.success = false;
            break;
          }
        }
      }
      
    } catch (error) {
      result.success = false;
      result.details.failed.push({
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return result;
  }

  /**
   * Batch update multiple tokens
   */
  async batchUpdateTokens(
    updates: { tokenId: string; changes: Partial<TokenTableData> }[],
    standard: TokenStandard
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: true,
      processed: 0,
      errors: 0,
      warnings: 0,
      skipped: 0,
      details: {
        succeeded: [],
        failed: [],
        warnings: []
      }
    };

    for (const update of updates) {
      try {
        result.processed++;
        
        // Apply updates to each table in the changes
        for (const [tableName, tableData] of Object.entries(update.changes)) {
          if (tableData) {
            await tokenCRUDService.updateTableData(tableName, update.tokenId, tableData);
          }
        }
        
        result.details.succeeded.push(update);
        
      } catch (error) {
        result.errors++;
        result.details.failed.push({
          data: update,
          error: error instanceof Error ? error.message : String(error)
        });
        
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Clone token with modifications
   */
  async cloneToken(
    sourceTokenId: string,
    modifications: Partial<TokenTableData>,
    newName: string,
    newSymbol: string
  ): Promise<string> {
    // Load source token data
    // Get source token data first to determine standard
    const sourceToken = await tokenCRUDService.getTokenData(sourceTokenId);
    
    const sourceData = await tokenCRUDService.loadAllTokenData(
      sourceTokenId, 
      sourceToken.standard as TokenStandard || TokenStandard.ERC20
    );

    // Apply modifications to the source data
    const clonedData = { ...sourceData };
    
    // Update basic token info
    if (clonedData.tokens) {
      clonedData.tokens = { ...clonedData.tokens, ...modifications };
      clonedData.tokens.name = newName;
      clonedData.tokens.symbol = newSymbol;
      delete clonedData.tokens.id; // Remove ID so new one is generated
    }

    // Create new token using the tokens table data
    const newToken = await tokenCRUDService.createNewToken(clonedData.tokens as TokensTableData);
    
    return newToken.id;
  }

  /**
   * Export data as JSON
   */
  private exportAsJSON(data: any[], compress: boolean): Blob {
    const jsonString = JSON.stringify(data, null, compress ? 0 : 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Export data as CSV
   */
  private exportAsCSV(data: any[]): Blob {
    if (data.length === 0) {
      return new Blob([''], { type: 'text/csv' });
    }

    // Flatten nested objects for CSV
    const flattenedData = data.map(token => this.flattenObject(token));
    
    // Get all unique headers
    const headers = Array.from(
      new Set(flattenedData.flatMap(obj => Object.keys(obj)))
    ).sort();

    // Create CSV content
    const csvContent = [
      headers.join(','), // Header row
      ...flattenedData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv' });
  }

  /**
   * Export data as Excel (simplified - would need xlsx library for full functionality)
   */
  private exportAsExcel(data: any[]): Blob {
    // For now, export as CSV with Excel-compatible format
    // In a full implementation, would use xlsx library
    return this.exportAsCSV(data);
  }

  /**
   * Parse JSON file
   */
  private async parseJSON(file: File): Promise<any[]> {
    const text = await file.text();
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [data];
  }

  /**
   * Parse CSV file
   */
  private async parseCSV(file: File): Promise<any[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: any = {};
      
      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          row[header] = values[index];
        }
      });
      
      // Unflatten the object to restore nested structure
      data.push(this.unflattenObject(row));
    }

    return data;
  }

  /**
   * Parse Excel file (placeholder - would need xlsx library)
   */
  private async parseExcel(file: File): Promise<any[]> {
    throw new Error('Excel import not yet implemented - use JSON or CSV format');
  }

  /**
   * Parse a CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Remove empty fields from data
   */
  private removeEmptyFields(data: any): void {
    for (const key in data) {
      if (data[key] === null || data[key] === undefined || data[key] === '') {
        delete data[key];
      } else if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
        this.removeEmptyFields(data[key]);
        if (Object.keys(data[key]).length === 0) {
          delete data[key];
        }
      }
    }
  }

  /**
   * Remove sensitive fields from data
   */
  private removeSensitiveFields(data: any): void {
    const sensitiveFields = [
      'private_key', 'secret', 'password', 'api_key', 
      'wallet_private_key', 'deployment_private_key'
    ];
    
    for (const key in data) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        delete data[key];
      } else if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
        this.removeSensitiveFields(data[key]);
      }
    }
  }

  /**
   * Flatten nested object for CSV export
   */
  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};
    
    for (const key in obj) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] === null || obj[key] === undefined) {
        flattened[newKey] = '';
      } else if (Array.isArray(obj[key])) {
        flattened[newKey] = JSON.stringify(obj[key]);
      } else if (typeof obj[key] === 'object') {
        Object.assign(flattened, this.flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
    
    return flattened;
  }

  /**
   * Unflatten object from CSV import
   */
  private unflattenObject(flattened: any): any {
    const result: any = {};
    
    for (const key in flattened) {
      const keys = key.split('.');
      let current = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      const lastKey = keys[keys.length - 1];
      let value = flattened[key];
      
      // Try to parse JSON arrays/objects
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string if not valid JSON
        }
      }
      
      current[lastKey] = value;
    }
    
    return result;
  }

  /**
   * Validate token data structure
   */
  private validateTokenData(data: any, standard: TokenStandard): string[] {
    const errors: string[] = [];
    
    // Check basic token data
    if (!data.tokens) {
      errors.push('Missing basic token data');
    } else {
      if (!data.tokens.name) errors.push('Missing token name');
      if (!data.tokens.symbol) errors.push('Missing token symbol');
      if (data.tokens.decimals === undefined) errors.push('Missing token decimals');
    }
    
    // Check standard-specific properties
    const standardTableMap = {
      [TokenStandard.ERC20]: 'token_erc20_properties',
      [TokenStandard.ERC721]: 'token_erc721_properties',
      [TokenStandard.ERC1155]: 'token_erc1155_properties',
      [TokenStandard.ERC1400]: 'token_erc1400_properties',
      [TokenStandard.ERC3525]: 'token_erc3525_properties',
      [TokenStandard.ERC4626]: 'token_erc4626_properties'
    };
    
    const expectedTable = standardTableMap[standard];
    if (expectedTable && !data[expectedTable]) {
      errors.push(`Missing ${standard} properties data`);
    }
    
    return errors;
  }

  /**
   * Import a single token
   */
  private async importSingleToken(
    data: any, 
    standard: TokenStandard, 
    overwrite: boolean
  ): Promise<void> {
    // Check if token already exists
    const existingTokenId = data.tokens?.id;
    
    if (existingTokenId && overwrite) {
      // Update existing token
      for (const [tableName, tableData] of Object.entries(data)) {
        if (tableData && tableName !== 'tokens') {
          await tokenCRUDService.updateTableData(tableName, existingTokenId, tableData as TokenTableData[]);
        }
      }
      
      // Update basic token data last
      if (data.tokens) {
        await tokenCRUDService.updateTableData('tokens', existingTokenId, data.tokens);
      }
    } else {
      // Create new token
      if (data.tokens) {
        delete data.tokens.id; // Remove ID to create new
        await tokenCRUDService.createNewToken(data.tokens as Partial<TokensTableData>);
      }
    }
  }
}

// Export singleton instance
export const bulkOperationsService = new BulkOperationsService();
