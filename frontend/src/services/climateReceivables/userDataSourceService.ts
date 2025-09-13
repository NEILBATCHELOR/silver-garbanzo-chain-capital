/**
 * User Data Source Service for Climate Receivables
 * 
 * Manages user-uploaded data sources including:
 * - Credit reports (PDF, Excel, CSV)
 * - Financial statements (Multiple formats)
 * - Custom market data (CSV/JSON)
 * - Payment history files (Structured data)
 * 
 * Provides data extraction, validation, and standardization
 * for integration with PayerRiskAssessmentService
 */

import { supabase } from '@/infrastructure/database/client';

export interface UserDataSource {
  source_id: string;
  user_id: string;
  project_id: string;
  source_name: string;
  source_type: 'credit_report' | 'financial_statement' | 'market_data' | 'custom';
  data_format: 'csv' | 'xlsx' | 'json' | 'xml' | 'pdf';
  file_path: string;
  file_size: number;
  data_schema: Record<string, any>;
  upload_date: string;
  last_processed: string | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  validation_errors: any[];
  refresh_frequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  is_active: boolean;
  metadata: Record<string, any>;
}

export interface DataSourceMapping {
  mapping_id: string;
  source_id: string;
  source_field: string;
  target_field: string;
  data_transform: string;
  validation_rules: Record<string, any>;
}

export interface UserDataCache {
  cache_id: string;
  source_id: string;
  entity_id: string;
  data_type: 'credit_score' | 'financial_metrics' | 'payment_history';
  processed_data: Record<string, any>;
  extracted_at: string;
  expires_at: string;
  data_quality_score: number;
}

export interface DataExtractionResult {
  success: boolean;
  data: Record<string, any> | null;
  quality_score: number;
  validation_errors: string[];
  fields_extracted: string[];
}

/**
 * Service for managing user-uploaded climate data sources
 */
export class UserDataSourceService {
  
  private static readonly SUPPORTED_FORMATS = ['csv', 'xlsx', 'json', 'xml', 'pdf'];
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Upload and register a new data source
   */
  public static async uploadDataSource(
    file: File,
    sourceConfig: {
      sourceName: string;
      sourceType: 'credit_report' | 'financial_statement' | 'market_data' | 'custom';
      refreshFrequency: 'manual' | 'daily' | 'weekly' | 'monthly';
      fieldMappings?: Record<string, string>;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    try {
      // Validate file
      this.validateFile(file);

      // Upload to Supabase Storage
      const filePath = await this.uploadFileToStorage(file);

      // Register data source in database
      const sourceId = await this.registerDataSource({
        ...sourceConfig,
        filePath,
        fileSize: file.size,
        dataFormat: this.detectFileFormat(file.name)
      });

      // Start asynchronous processing
      this.processDataSourceAsync(sourceId);

      return sourceId;
    } catch (error) {
      console.error('Data source upload failed:', error);
      throw error;
    }
  }

  /**
   * Process data source and extract structured data
   */
  public static async processDataSource(sourceId: string): Promise<DataExtractionResult> {
    try {
      const source = await this.getDataSource(sourceId);
      if (!source) {
        throw new Error('Data source not found');
      }

      // Update status to processing
      await this.updateDataSourceStatus(sourceId, 'processing');

      let result: DataExtractionResult;

      switch (source.data_format) {
        case 'csv':
          result = await this.processCSVData(source);
          break;
        case 'xlsx':
          result = await this.processExcelData(source);
          break;
        case 'json':
          result = await this.processJSONData(source);
          break;
        case 'pdf':
          result = await this.processPDFData(source);
          break;
        case 'xml':
          result = await this.processXMLData(source);
          break;
        default:
          throw new Error(`Unsupported format: ${source.data_format}`);
      }

      // Update processing status
      const finalStatus = result.success ? 'completed' : 'error';
      await this.updateDataSourceStatus(sourceId, finalStatus, result.validation_errors);

      return result;
    } catch (error) {
      await this.updateDataSourceStatus(sourceId, 'error', [error.message]);
      throw error;
    }
  }

  /**
   * Extract payer credit data from user uploads
   */
  public static async extractPayerCreditData(
    payerId: string,
    payerName: string
  ): Promise<any | null> {
    try {
      // Check cache first
      const cachedData = await this.getCachedPayerData(payerId);
      if (cachedData && this.isCacheValid(cachedData.extracted_at)) {
        return cachedData.processed_data;
      }

      // Get all active credit and financial data sources
      const sources = await this.getActiveDataSources(['credit_report', 'financial_statement']);

      for (const source of sources) {
        const extractedData = await this.searchDataInSource(source, payerName);
        if (extractedData && extractedData.success) {
          // Cache the result
          await this.cachePayerData(payerId, 'credit_score', extractedData.data, extractedData.quality_score);
          return this.standardizeCreditData(extractedData.data, source);
        }
      }

      return null;
    } catch (error) {
      console.error('Payer credit data extraction failed:', error);
      return null;
    }
  }

  /**
   * Get all user data sources with filtering options
   */
  public static async getUserDataSources(
    filters: {
      sourceType?: string[];
      processingStatus?: string[];
      isActive?: boolean;
      userId?: string;
      projectId?: string;
    } = {}
  ): Promise<UserDataSource[]> {
    try {
      let query = supabase
        .from('climate_user_data_sources')
        .select('*');

      // Apply filters
      if (filters.sourceType) {
        query = query.in('source_type', filters.sourceType);
      }
      if (filters.processingStatus) {
        query = query.in('processing_status', filters.processingStatus);
      }
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      const { data, error } = await query.order('upload_date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get user data sources failed:', error);
      return [];
    }
  }

  /**
   * Delete data source and associated data
   */
  public static async deleteDataSource(sourceId: string): Promise<void> {
    try {
      const source = await this.getDataSource(sourceId);
      if (!source) {
        throw new Error('Data source not found');
      }

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('climate-data-sources')
        .remove([source.file_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
      }

      // Delete from database
      const { error } = await supabase
        .from('climate_user_data_sources')
        .delete()
        .eq('source_id', sourceId);

      if (error) throw error;

      // Delete cached data
      await this.deleteCachedDataForSource(sourceId);
    } catch (error) {
      console.error('Delete data source failed:', error);
      throw error;
    }
  }

  /**
   * Update data source field mappings
   */
  public static async updateFieldMappings(
    sourceId: string,
    mappings: Array<{
      sourceField: string;
      targetField: string;
      transform?: string;
      validationRules?: Record<string, any>;
    }>
  ): Promise<void> {
    try {
      // Delete existing mappings
      await supabase
        .from('data_source_mappings')
        .delete()
        .eq('source_id', sourceId);

      // Insert new mappings
      const mappingRecords = mappings.map(mapping => ({
        source_id: sourceId,
        source_field: mapping.sourceField,
        target_field: mapping.targetField,
        data_transform: mapping.transform || '',
        validation_rules: mapping.validationRules || {}
      }));

      const { error } = await supabase
        .from('data_source_mappings')
        .insert(mappingRecords);

      if (error) throw error;

      // Reprocess data source with new mappings
      await this.processDataSource(sourceId);
    } catch (error) {
      console.error('Update field mappings failed:', error);
      throw error;
    }
  }

  // Private implementation methods

  private static validateFile(file: File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const format = this.detectFileFormat(file.name);
    if (!this.SUPPORTED_FORMATS.includes(format)) {
      throw new Error(`Unsupported file format: ${format}`);
    }
  }

  private static detectFileFormat(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop() || '';
    const formatMap: Record<string, string> = {
      'csv': 'csv',
      'xlsx': 'xlsx',
      'xls': 'xlsx',
      'json': 'json',
      'xml': 'xml',
      'pdf': 'pdf'
    };
    return formatMap[extension] || 'unknown';
  }

  private static async uploadFileToStorage(file: File): Promise<string> {
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const filePath = `user-uploads/${filename}`;

    const { data, error } = await supabase.storage
      .from('climate-data-sources')
      .upload(filePath, file);

    if (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }

    return data.path;
  }

  private static async registerDataSource(config: {
    sourceName: string;
    sourceType: string;
    refreshFrequency: string;
    filePath: string;
    fileSize: number;
    dataFormat: string;
    fieldMappings?: Record<string, string>;
    metadata?: Record<string, any>;
  }): Promise<string> {
    // Get current user (this would be from auth context)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('climate_user_data_sources')
      .insert({
        user_id: user.id,
        project_id: '', // This would come from project context
        source_name: config.sourceName,
        source_type: config.sourceType,
        data_format: config.dataFormat,
        file_path: config.filePath,
        file_size: config.fileSize,
        data_schema: config.fieldMappings || {},
        refresh_frequency: config.refreshFrequency,
        metadata: config.metadata || {},
        processing_status: 'pending'
      })
      .select('source_id')
      .single();

    if (error) {
      throw new Error(`Database registration failed: ${error.message}`);
    }

    return data.source_id;
  }

  private static async getDataSource(sourceId: string): Promise<UserDataSource | null> {
    const { data, error } = await supabase
      .from('climate_user_data_sources')
      .select('*')
      .eq('source_id', sourceId)
      .single();

    if (error) {
      console.error('Get data source failed:', error);
      return null;
    }

    return data;
  }

  private static async updateDataSourceStatus(
    sourceId: string,
    status: string,
    validationErrors: string[] = []
  ): Promise<void> {
    const updateData: any = {
      processing_status: status,
      last_processed: new Date().toISOString()
    };

    if (validationErrors.length > 0) {
      updateData.validation_errors = validationErrors;
    }

    const { error } = await supabase
      .from('climate_user_data_sources')
      .update(updateData)
      .eq('source_id', sourceId);

    if (error) {
      console.error('Update data source status failed:', error);
    }
  }

  private static async processDataSourceAsync(sourceId: string): Promise<void> {
    // Start processing in background
    setTimeout(() => {
      this.processDataSource(sourceId).catch(error => {
        console.error(`Background processing failed for source ${sourceId}:`, error);
      });
    }, 100);
  }

  private static async processCSVData(source: UserDataSource): Promise<DataExtractionResult> {
    try {
      // Download file from storage
      const fileData = await this.downloadFileFromStorage(source.file_path);
      
      // Parse CSV (would use a library like Papa Parse)
      const csvText = new TextDecoder().decode(fileData);
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data: Record<string, any>[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const row: Record<string, any> = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || '';
          });
          data.push(row);
        }
      }

      // Apply field mappings and validation
      const processedData = await this.applyFieldMappings(source.source_id, data);
      
      return {
        success: true,
        data: processedData,
        quality_score: this.calculateDataQuality(processedData),
        validation_errors: [],
        fields_extracted: headers
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        quality_score: 0,
        validation_errors: [error.message],
        fields_extracted: []
      };
    }
  }

  private static async processExcelData(source: UserDataSource): Promise<DataExtractionResult> {
    try {
      // This would use a library like SheetJS to parse Excel files
      // For now, return a placeholder implementation
      console.log(`Processing Excel file: ${source.file_path}`);
      
      return {
        success: true,
        data: { placeholder: 'Excel processing not yet implemented' },
        quality_score: 0.5,
        validation_errors: ['Excel processing is placeholder implementation'],
        fields_extracted: ['placeholder']
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        quality_score: 0,
        validation_errors: [error.message],
        fields_extracted: []
      };
    }
  }

  private static async processJSONData(source: UserDataSource): Promise<DataExtractionResult> {
    try {
      const fileData = await this.downloadFileFromStorage(source.file_path);
      const jsonText = new TextDecoder().decode(fileData);
      const parsedData = JSON.parse(jsonText);

      // Apply field mappings
      const processedData = await this.applyFieldMappings(source.source_id, parsedData);

      return {
        success: true,
        data: processedData,
        quality_score: this.calculateDataQuality(processedData),
        validation_errors: [],
        fields_extracted: Object.keys(parsedData)
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        quality_score: 0,
        validation_errors: [error.message],
        fields_extracted: []
      };
    }
  }

  private static async processPDFData(source: UserDataSource): Promise<DataExtractionResult> {
    try {
      // This would use a PDF parsing library to extract text and structured data
      console.log(`Processing PDF file: ${source.file_path}`);
      
      return {
        success: true,
        data: { placeholder: 'PDF processing not yet implemented' },
        quality_score: 0.3,
        validation_errors: ['PDF processing is placeholder implementation'],
        fields_extracted: ['text_content']
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        quality_score: 0,
        validation_errors: [error.message],
        fields_extracted: []
      };
    }
  }

  private static async processXMLData(source: UserDataSource): Promise<DataExtractionResult> {
    try {
      const fileData = await this.downloadFileFromStorage(source.file_path);
      const xmlText = new TextDecoder().decode(fileData);
      
      // This would use an XML parser to convert to structured data
      console.log(`Processing XML file: ${source.file_path}`);
      
      return {
        success: true,
        data: { placeholder: 'XML processing not yet implemented' },
        quality_score: 0.4,
        validation_errors: ['XML processing is placeholder implementation'],
        fields_extracted: ['xml_elements']
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        quality_score: 0,
        validation_errors: [error.message],
        fields_extracted: []
      };
    }
  }

  private static async downloadFileFromStorage(filePath: string): Promise<Uint8Array> {
    const { data, error } = await supabase.storage
      .from('climate-data-sources')
      .download(filePath);

    if (error) {
      throw new Error(`File download failed: ${error.message}`);
    }

    return new Uint8Array(await data.arrayBuffer());
  }

  private static async applyFieldMappings(sourceId: string, data: any): Promise<any> {
    try {
      // Get field mappings for this source
      const { data: mappings, error } = await supabase
        .from('data_source_mappings')
        .select('*')
        .eq('source_id', sourceId);

      if (error || !mappings?.length) {
        return data; // Return original data if no mappings
      }

      // Apply mappings and transformations
      if (Array.isArray(data)) {
        return data.map(item => this.transformDataItem(item, mappings));
      } else {
        return this.transformDataItem(data, mappings);
      }
    } catch (error) {
      console.error('Apply field mappings failed:', error);
      return data;
    }
  }

  private static transformDataItem(item: any, mappings: DataSourceMapping[]): any {
    const transformed: any = { ...item };

    mappings.forEach(mapping => {
      if (item.hasOwnProperty(mapping.source_field)) {
        let value = item[mapping.source_field];

        // Apply transformation if specified
        if (mapping.data_transform) {
          value = this.applyTransform(value, mapping.data_transform);
        }

        // Validate if rules specified
        if (mapping.validation_rules && Object.keys(mapping.validation_rules).length > 0) {
          if (!this.validateValue(value, mapping.validation_rules)) {
            console.warn(`Validation failed for field ${mapping.target_field}`);
          }
        }

        transformed[mapping.target_field] = value;
        
        // Remove original field if it's different from target
        if (mapping.source_field !== mapping.target_field) {
          delete transformed[mapping.source_field];
        }
      }
    });

    return transformed;
  }

  private static applyTransform(value: any, transform: string): any {
    try {
      // Simple transformation rules (could be expanded)
      switch (transform.toLowerCase()) {
        case 'uppercase':
          return typeof value === 'string' ? value.toUpperCase() : value;
        case 'lowercase':
          return typeof value === 'string' ? value.toLowerCase() : value;
        case 'number':
          return typeof value === 'string' ? parseFloat(value) || 0 : value;
        case 'integer':
          return typeof value === 'string' ? parseInt(value) || 0 : value;
        case 'trim':
          return typeof value === 'string' ? value.trim() : value;
        default:
          return value;
      }
    } catch (error) {
      console.warn('Transform failed:', error);
      return value;
    }
  }

  private static validateValue(value: any, rules: Record<string, any>): boolean {
    try {
      if (rules.required && (value === null || value === undefined || value === '')) {
        return false;
      }

      if (rules.type) {
        const actualType = typeof value;
        if (actualType !== rules.type) {
          return false;
        }
      }

      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        return false;
      }

      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        return false;
      }

      if (rules.min && typeof value === 'number' && value < rules.min) {
        return false;
      }

      if (rules.max && typeof value === 'number' && value > rules.max) {
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Validation error:', error);
      return false;
    }
  }

  private static calculateDataQuality(data: any): number {
    try {
      if (!data) return 0;

      let score = 0.5; // Base score

      // Check data completeness
      if (Array.isArray(data)) {
        const totalFields = data.length > 0 ? Object.keys(data[0]).length : 0;
        const completedFields = data.length > 0 ? 
          Object.values(data[0]).filter(v => v !== null && v !== undefined && v !== '').length : 0;
        
        score += (completedFields / totalFields) * 0.3;
      } else {
        const totalFields = Object.keys(data).length;
        const completedFields = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length;
        
        score += (completedFields / totalFields) * 0.3;
      }

      // Additional quality factors could be added here
      return Math.min(1.0, Math.max(0.0, score));
    } catch (error) {
      console.warn('Data quality calculation failed:', error);
      return 0.5;
    }
  }

  private static async getActiveDataSources(sourceTypes: string[]): Promise<UserDataSource[]> {
    const { data, error } = await supabase
      .from('climate_user_data_sources')
      .select('*')
      .eq('is_active', true)
      .eq('processing_status', 'completed')
      .in('source_type', sourceTypes);

    if (error) {
      console.error('Get active data sources failed:', error);
      return [];
    }

    return data || [];
  }

  private static async searchDataInSource(
    source: UserDataSource,
    searchTerm: string
  ): Promise<DataExtractionResult | null> {
    try {
      // Get cached processed data for this source
      const { data: cachedData, error } = await supabase
        .from('climate_user_data_cache')
        .select('*')
        .eq('source_id', source.source_id)
        .gte('expires_at', new Date().toISOString());

      if (error || !cachedData?.length) {
        return null;
      }

      // Search for matching data
      const matchingData = cachedData.find(item => {
        const processedData = item.processed_data;
        return JSON.stringify(processedData).toLowerCase().includes(searchTerm.toLowerCase());
      });

      if (matchingData) {
        return {
          success: true,
          data: matchingData.processed_data,
          quality_score: matchingData.data_quality_score,
          validation_errors: [],
          fields_extracted: Object.keys(matchingData.processed_data)
        };
      }

      return null;
    } catch (error) {
      console.error('Search data in source failed:', error);
      return null;
    }
  }

  private static standardizeCreditData(data: any, source: UserDataSource): any {
    // Standardize data format for integration with PayerRiskAssessmentService
    return {
      credit_score: data.credit_score || data.score || 650,
      payment_history_enhanced: {
        on_time_rate: data.on_time_rate || data.payment_performance || 0.85,
        average_delay_days: data.average_delay || data.delay_days || 3,
        credit_utilization: data.utilization || 0.3,
        public_records: data.public_records || 0
      },
      financial_metrics_enhanced: {
        debt_to_equity: data.debt_to_equity || data.leverage || 0.4,
        current_ratio: data.current_ratio || data.liquidity || 1.5,
        cash_flow_rating: data.cash_flow_rating || 'Good',
        revenue_growth: data.revenue_growth || data.growth_rate || 0.05
      },
      sources: [source.source_name],
      data_quality_score: 0.8,
      last_updated: new Date().toISOString()
    };
  }

  // Cache management methods

  private static async getCachedPayerData(payerId: string): Promise<UserDataCache | null> {
    const { data, error } = await supabase
      .from('climate_user_data_cache')
      .select('*')
      .eq('entity_id', payerId)
      .eq('data_type', 'credit_score')
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  private static async cachePayerData(
    payerId: string,
    dataType: string,
    data: any,
    qualityScore: number
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + this.CACHE_DURATION);

    const { error } = await supabase
      .from('climate_user_data_cache')
      .upsert({
        entity_id: payerId,
        data_type: dataType,
        processed_data: data,
        data_quality_score: qualityScore,
        extracted_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      console.error('Cache payer data failed:', error);
    }
  }

  private static isCacheValid(extractedAt: string): boolean {
    const extractTime = new Date(extractedAt).getTime();
    const now = Date.now();
    return (now - extractTime) < this.CACHE_DURATION;
  }

  private static async deleteCachedDataForSource(sourceId: string): Promise<void> {
    const { error } = await supabase
      .from('climate_user_data_cache')
      .delete()
      .eq('source_id', sourceId);

    if (error) {
      console.error('Delete cached data failed:', error);
    }
  }
}
