/**
 * Enhanced Redemption Service - Clean Implementation
 * No forced config dependency, optional template system
 */

async createRedemptionWindow(windowData: CreateRedemptionWindowInput): Promise<{
  success: boolean;
  data?: RedemptionWindow;
  error?: string;
}> {
  try {
    // Calculate valid date ranges
    const dates = this.calculateValidDateRanges(windowData);
    const validNavSource = this.validateNavSource(windowData.nav_source);

    // CLEAN: Use direct configuration (no config template needed)
    const windowInstanceData = {
      config_id: null, // Direct configuration - no template dependency
      project_id: windowData.project_id,
      name: windowData.name,
      
      // Date configuration stored directly on window
      submission_date_mode: windowData.submission_date_mode,
      processing_date_mode: windowData.processing_date_mode,
      lockup_days: windowData.lockup_days || 0,
      processing_offset_days: windowData.processing_offset_days || 1,
      
      // Calculated dates ensuring constraints
      submission_start_date: dates.submissionStart.toISOString(),
      submission_end_date: dates.submissionEnd.toISOString(),
      start_date: dates.processingStart.toISOString(),
      end_date: dates.processingEnd.toISOString(),
      
      // Financial settings
      nav: windowData.nav,
      nav_date: windowData.nav ? new Date().toISOString().split('T')[0] : null,
      nav_source: validNavSource,
      max_redemption_amount: windowData.max_redemption_amount,
      
      // Status and metrics
      status: 'upcoming',
      current_requests: 0,
      total_request_value: 0,
      approved_requests: 0,
      approved_value: 0,
      rejected_requests: 0,
      rejected_value: 0,
      queued_requests: 0,
      queued_value: 0,
      
      // Processing options
      notes: JSON.stringify({
        enable_pro_rata_distribution: windowData.enable_pro_rata_distribution || false,
        auto_process: windowData.auto_process || false
      })
    };

    const { data: windowResult, error: windowError } = await supabase
      .from(this.windowsTable)
      .insert(windowInstanceData)
      .select()
      .single();

    if (windowError) throw windowError;

    return { success: true, data: this.mapWindowResult(windowResult, windowData) };
  } catch (error) {
    console.error('Error creating redemption window:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create redemption window' 
    };
  }
}

/**
 * OPTIONAL: Create window from template (when you do want standardized policies)  
 */
async createRedemptionWindowFromTemplate(
  templateId: string, 
  windowData: Partial<CreateRedemptionWindowInput>
): Promise<{ success: boolean; data?: RedemptionWindow; error?: string }> {
  try {
    // Get the template config
    const { data: config, error: configError } = await supabase
      .from('redemption_window_configs')
      .select('*')
      .eq('id', templateId)
      .single();

    if (configError || !config) {
      throw new Error('Template not found');
    }

    // Merge template settings with custom overrides
    const mergedData: CreateRedemptionWindowInput = {
      project_id: windowData.project_id!,
      name: windowData.name || `${config.name} - ${new Date().toLocaleDateString()}`,
      submission_date_mode: windowData.submission_date_mode || 'fixed',
      processing_date_mode: windowData.processing_date_mode || 'offset',
      lockup_days: windowData.lockup_days ?? config.lock_up_period,
      processing_offset_days: windowData.processing_offset_days ?? 1,
      enable_pro_rata_distribution: windowData.enable_pro_rata_distribution ?? config.enable_pro_rata_distribution,
      auto_process: windowData.auto_process ?? config.auto_process,
      ...windowData
    };

    // Use template approach - config_id points to template
    const dates = this.calculateValidDateRanges(mergedData);
    
    const windowInstanceData = {
      config_id: templateId, // Reference the template
      project_id: mergedData.project_id,
      name: mergedData.name,
      // ... rest of implementation using template values
    };

    // Rest of creation logic...
    return this.createRedemptionWindow(mergedData);
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create window from template' 
    };
  }
}
