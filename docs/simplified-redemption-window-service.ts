  /**
   * Create redemption window with optional config approach
   */
  async createRedemptionWindow(windowData: CreateRedemptionWindowInput): Promise<{
    success: boolean;
    data?: RedemptionWindow;
    error?: string;
  }> {
    try {
      // Calculate valid date ranges
      const dates = this.calculateValidDateRanges(windowData);

      // Validate and fix nav_source
      const validNavSource = this.validateNavSource(windowData.nav_source);

      // Create window WITHOUT forced config dependency
      const windowInstanceData = {
        config_id: null, // Let it be null - no forced dependency
        project_id: windowData.project_id,
        name: windowData.name,
        
        // Date configuration (stored directly on window)
        submission_date_mode: windowData.submission_date_mode,
        processing_date_mode: windowData.processing_date_mode,
        lockup_days: windowData.lockup_days || 0,
        processing_offset_days: windowData.processing_offset_days || 1,
        
        // Calculated dates (ensuring constraints are met)
        submission_start_date: dates.submissionStart.toISOString(),
        submission_end_date: dates.submissionEnd.toISOString(),
        start_date: dates.processingStart.toISOString(),
        end_date: dates.processingEnd.toISOString(),
        
        // Financial settings (stored directly)
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
        
        // Processing options stored directly in notes (temporary until schema updated)
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

      if (windowError) {
        throw windowError;
      }

      // Success! No config dependency needed
      return { success: true, data: this.mapWindowResult(windowResult, windowData) };
    } catch (error) {
      console.error('Error creating redemption window:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create redemption window' 
      };
    }
  }
