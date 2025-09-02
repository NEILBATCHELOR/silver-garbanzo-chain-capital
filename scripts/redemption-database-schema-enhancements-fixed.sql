-- Redemption Database Schema Enhancements - FIXED
-- Date: August 26, 2025
-- Purpose: Add missing columns to support enhanced redemption window functionality
-- FIXED: PostgreSQL constraint syntax compatibility

-- ===============================================
-- REDEMPTION WINDOWS TABLE ENHANCEMENTS
-- ===============================================

-- Add missing boolean columns for better data structure
ALTER TABLE public.redemption_windows 
ADD COLUMN IF NOT EXISTS enable_pro_rata_distribution BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_process BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

-- Add missing financial and operational columns
ALTER TABLE public.redemption_windows 
ADD COLUMN IF NOT EXISTS min_redemption_amount NUMERIC(78, 18) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pro_rata_factor NUMERIC(5, 4) DEFAULT 1.0000,
ADD COLUMN IF NOT EXISTS processing_fee_percentage NUMERIC(5, 4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS early_redemption_penalty NUMERIC(5, 4) DEFAULT 0.0000;

-- Add enhanced status tracking
ALTER TABLE public.redemption_windows 
ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';

-- Add check constraints for status tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_redemption_windows_submission_status'
    ) THEN
        ALTER TABLE public.redemption_windows 
        ADD CONSTRAINT chk_redemption_windows_submission_status 
        CHECK (submission_status IN ('not_started', 'open', 'closed', 'extended', 'cancelled'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_redemption_windows_processing_status'
    ) THEN
        ALTER TABLE public.redemption_windows 
        ADD CONSTRAINT chk_redemption_windows_processing_status 
        CHECK (processing_status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled'));
    END IF;
END $$;

-- Add audit trail columns
ALTER TABLE public.redemption_windows 
ADD COLUMN IF NOT EXISTS last_modified_by UUID,
ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add foreign key relationships for audit trail (conditional)
DO $$
BEGIN
    -- Add last_modified_by foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_redemption_windows_last_modified_by'
    ) THEN
        ALTER TABLE public.redemption_windows 
        ADD CONSTRAINT fk_redemption_windows_last_modified_by 
        FOREIGN KEY (last_modified_by) REFERENCES auth.users (id);
    END IF;
    
    -- Add approved_by foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_redemption_windows_approved_by'
    ) THEN
        ALTER TABLE public.redemption_windows 
        ADD CONSTRAINT fk_redemption_windows_approved_by 
        FOREIGN KEY (approved_by) REFERENCES auth.users (id);
    END IF;
END $$;

-- ===============================================
-- REDEMPTION REQUESTS TABLE ENHANCEMENTS
-- ===============================================

-- Add missing relationship columns
ALTER TABLE public.redemption_requests 
ADD COLUMN IF NOT EXISTS redemption_window_id UUID,
ADD COLUMN IF NOT EXISTS requested_by UUID,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS processed_by UUID;

-- Add enhanced status and workflow columns
ALTER TABLE public.redemption_requests 
ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS estimated_processing_time INTERVAL,
ADD COLUMN IF NOT EXISTS actual_processing_time INTERVAL,
ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'pending';

-- Add check constraints for redemption requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_redemption_requests_priority_level'
    ) THEN
        ALTER TABLE public.redemption_requests 
        ADD CONSTRAINT chk_redemption_requests_priority_level 
        CHECK (priority_level BETWEEN 1 AND 5);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_redemption_requests_compliance_status'
    ) THEN
        ALTER TABLE public.redemption_requests 
        ADD CONSTRAINT chk_redemption_requests_compliance_status 
        CHECK (compliance_status IN ('pending', 'approved', 'rejected', 'requires_review'));
    END IF;
END $$;

-- Add fee and calculation columns
ALTER TABLE public.redemption_requests 
ADD COLUMN IF NOT EXISTS redemption_fee NUMERIC(78, 18) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_redemption_amount NUMERIC(78, 18),
ADD COLUMN IF NOT EXISTS pro_rata_adjustment NUMERIC(78, 18) DEFAULT 0;

-- Add foreign key relationships for redemption requests (conditional)
DO $$
BEGIN
    -- Add redemption_window_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_redemption_requests_window'
    ) THEN
        ALTER TABLE public.redemption_requests 
        ADD CONSTRAINT fk_redemption_requests_window 
        FOREIGN KEY (redemption_window_id) REFERENCES redemption_windows (id) ON DELETE CASCADE;
    END IF;
    
    -- Add requested_by foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_redemption_requests_requested_by'
    ) THEN
        ALTER TABLE public.redemption_requests 
        ADD CONSTRAINT fk_redemption_requests_requested_by 
        FOREIGN KEY (requested_by) REFERENCES auth.users (id);
    END IF;
    
    -- Add approved_by foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_redemption_requests_approved_by'
    ) THEN
        ALTER TABLE public.redemption_requests 
        ADD CONSTRAINT fk_redemption_requests_approved_by 
        FOREIGN KEY (approved_by) REFERENCES auth.users (id);
    END IF;
    
    -- Add processed_by foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_redemption_requests_processed_by'
    ) THEN
        ALTER TABLE public.redemption_requests 
        ADD CONSTRAINT fk_redemption_requests_processed_by 
        FOREIGN KEY (processed_by) REFERENCES auth.users (id);
    END IF;
END $$;

-- ===============================================
-- NEW TABLE: REDEMPTION_WINDOW_TEMPLATES
-- ===============================================

CREATE TABLE IF NOT EXISTS public.redemption_window_templates (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Template configuration
    submission_date_mode TEXT NOT NULL DEFAULT 'fixed',
    processing_date_mode TEXT NOT NULL DEFAULT 'fixed',
    lockup_days INTEGER DEFAULT 0,
    processing_offset_days INTEGER NOT NULL DEFAULT 1,
    
    -- Default financial settings
    default_nav_source TEXT DEFAULT 'manual',
    default_enable_pro_rata_distribution BOOLEAN DEFAULT true,
    default_auto_process BOOLEAN DEFAULT false,
    
    -- Template metadata
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    project_id UUID,
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add constraints for templates table (conditional)
DO $$
BEGIN
    -- Add template creation constraints
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_templates_lockup_days_non_negative'
    ) THEN
        ALTER TABLE public.redemption_window_templates 
        ADD CONSTRAINT chk_templates_lockup_days_non_negative 
        CHECK (lockup_days >= 0);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_templates_processing_offset_non_negative'
    ) THEN
        ALTER TABLE public.redemption_window_templates 
        ADD CONSTRAINT chk_templates_processing_offset_non_negative 
        CHECK (processing_offset_days >= 0);
    END IF;
    
    -- Add foreign key constraints
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_templates_created_by'
    ) THEN
        ALTER TABLE public.redemption_window_templates 
        ADD CONSTRAINT fk_templates_created_by 
        FOREIGN KEY (created_by) REFERENCES auth.users (id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_templates_project'
    ) THEN
        ALTER TABLE public.redemption_window_templates 
        ADD CONSTRAINT fk_templates_project 
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE;
    END IF;
END $$;

-- ===============================================
-- NEW TABLE: REDEMPTION_NOTIFICATIONS
-- ===============================================

CREATE TABLE IF NOT EXISTS public.redemption_notifications (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    redemption_window_id UUID NOT NULL,
    user_id UUID NOT NULL,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- Add constraints for notifications table (conditional)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_notifications_type'
    ) THEN
        ALTER TABLE public.redemption_notifications 
        ADD CONSTRAINT chk_notifications_type 
        CHECK (notification_type IN ('window_opening', 'window_closing', 'request_approved', 
                                     'request_rejected', 'processing_complete', 'settlement_ready'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_notifications_window'
    ) THEN
        ALTER TABLE public.redemption_notifications 
        ADD CONSTRAINT fk_notifications_window 
        FOREIGN KEY (redemption_window_id) REFERENCES redemption_windows (id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_notifications_user'
    ) THEN
        ALTER TABLE public.redemption_notifications 
        ADD CONSTRAINT fk_notifications_user 
        FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
    END IF;
END $$;

-- ===============================================
-- NEW TABLE: REDEMPTION_ANALYTICS
-- ===============================================

CREATE TABLE IF NOT EXISTS public.redemption_analytics (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    redemption_window_id UUID NOT NULL,
    
    -- Analytics metrics
    total_eligible_tokens NUMERIC(78, 18) DEFAULT 0,
    total_requested_tokens NUMERIC(78, 18) DEFAULT 0,
    total_approved_tokens NUMERIC(78, 18) DEFAULT 0,
    total_processed_tokens NUMERIC(78, 18) DEFAULT 0,
    
    -- Participation metrics
    eligible_investors INTEGER DEFAULT 0,
    participating_investors INTEGER DEFAULT 0,
    average_request_size NUMERIC(78, 18) DEFAULT 0,
    median_request_size NUMERIC(78, 18) DEFAULT 0,
    
    -- Processing metrics
    average_processing_time INTERVAL,
    pro_rata_factor_applied NUMERIC(5, 4) DEFAULT 1.0000,
    total_fees_collected NUMERIC(78, 18) DEFAULT 0,
    
    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT now()
);

-- Add constraints for analytics table (conditional)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_analytics_window'
    ) THEN
        ALTER TABLE public.redemption_analytics 
        ADD CONSTRAINT fk_analytics_window 
        FOREIGN KEY (redemption_window_id) REFERENCES redemption_windows (id) ON DELETE CASCADE;
    END IF;
END $$;

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Redemption windows indexes
CREATE INDEX IF NOT EXISTS idx_redemption_windows_enable_pro_rata ON public.redemption_windows (enable_pro_rata_distribution);
CREATE INDEX IF NOT EXISTS idx_redemption_windows_auto_process ON public.redemption_windows (auto_process);
CREATE INDEX IF NOT EXISTS idx_redemption_windows_submission_status ON public.redemption_windows (submission_status);
CREATE INDEX IF NOT EXISTS idx_redemption_windows_processing_status ON public.redemption_windows (processing_status);
CREATE INDEX IF NOT EXISTS idx_redemption_windows_is_active ON public.redemption_windows (is_active);

-- Redemption requests indexes
CREATE INDEX IF NOT EXISTS idx_redemption_requests_window_id ON public.redemption_requests (redemption_window_id);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_requested_by ON public.redemption_requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_priority ON public.redemption_requests (priority_level);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_compliance_status ON public.redemption_requests (compliance_status);

-- Template indexes
CREATE INDEX IF NOT EXISTS idx_redemption_templates_project_id ON public.redemption_window_templates (project_id);
CREATE INDEX IF NOT EXISTS idx_redemption_templates_is_active ON public.redemption_window_templates (is_active);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_redemption_notifications_user_id ON public.redemption_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_notifications_is_read ON public.redemption_notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_redemption_notifications_type ON public.redemption_notifications (notification_type);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_redemption_analytics_window_id ON public.redemption_analytics (redemption_window_id);

-- ===============================================
-- DATA MIGRATION: EXTRACT JSON FROM NOTES
-- ===============================================

-- Update existing records to use new boolean columns
DO $$
BEGIN
    -- Only update if columns exist and notes field has JSON data
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'redemption_windows' 
        AND column_name = 'enable_pro_rata_distribution'
    ) THEN
        UPDATE public.redemption_windows 
        SET 
            enable_pro_rata_distribution = COALESCE(
                (notes::jsonb->>'enable_pro_rata_distribution')::boolean, 
                true
            ),
            auto_process = COALESCE(
                (notes::jsonb->>'auto_process')::boolean, 
                false
            )
        WHERE notes IS NOT NULL AND notes != '' AND notes != '{}';
    END IF;
END $$;

-- ===============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===============================================

-- Enable RLS on new tables
ALTER TABLE public.redemption_window_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'redemption_window_templates' 
        AND policyname = 'Templates are viewable by authenticated users'
    ) THEN
        CREATE POLICY "Templates are viewable by authenticated users" ON public.redemption_window_templates
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'redemption_window_templates' 
        AND policyname = 'Templates are manageable by creators and admins'
    ) THEN
        CREATE POLICY "Templates are manageable by creators and admins" ON public.redemption_window_templates
            FOR ALL USING (
                auth.uid() = created_by OR 
                EXISTS (
                    SELECT 1 FROM public.user_permissions_view 
                    WHERE user_id = auth.uid() AND permission = 'system.configure'
                )
            );
    END IF;
END $$;

-- RLS policies for notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'redemption_notifications' 
        AND policyname = 'Users can view their own notifications'
    ) THEN
        CREATE POLICY "Users can view their own notifications" ON public.redemption_notifications
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'redemption_notifications' 
        AND policyname = 'Users can update their own notification read status'
    ) THEN
        CREATE POLICY "Users can update their own notification read status" ON public.redemption_notifications
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- RLS policies for analytics
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'redemption_analytics' 
        AND policyname = 'Analytics are viewable by authenticated users'
    ) THEN
        CREATE POLICY "Analytics are viewable by authenticated users" ON public.redemption_analytics
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- ===============================================
-- TRIGGERS FOR AUTOMATED UPDATES
-- ===============================================

-- Function to update redemption window timestamps
CREATE OR REPLACE FUNCTION update_redemption_window_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    
    -- Track status changes
    IF OLD.status IS DISTINCT FROM NEW.status OR 
       OLD.submission_status IS DISTINCT FROM NEW.submission_status OR 
       OLD.processing_status IS DISTINCT FROM NEW.processing_status THEN
        NEW.last_status_change_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger
DROP TRIGGER IF EXISTS tr_redemption_windows_updated_at ON public.redemption_windows;
CREATE TRIGGER tr_redemption_windows_updated_at
    BEFORE UPDATE ON public.redemption_windows
    FOR EACH ROW EXECUTE FUNCTION update_redemption_window_timestamp();

-- ===============================================
-- COMMENTS FOR DOCUMENTATION
-- ===============================================

COMMENT ON TABLE public.redemption_window_templates IS 'Templates for creating standardized redemption windows with predefined configurations';
COMMENT ON TABLE public.redemption_notifications IS 'User notifications related to redemption windows and request status changes';
COMMENT ON TABLE public.redemption_analytics IS 'Real-time analytics and metrics for redemption window performance tracking';

COMMENT ON COLUMN public.redemption_windows.enable_pro_rata_distribution IS 'Enable proportional distribution when redemption demand exceeds capacity';
COMMENT ON COLUMN public.redemption_windows.auto_process IS 'Automatically process approved redemption requests without manual intervention';
COMMENT ON COLUMN public.redemption_windows.submission_status IS 'Current status of the submission period (not_started, open, closed, extended, cancelled)';
COMMENT ON COLUMN public.redemption_windows.processing_status IS 'Current status of the processing phase (pending, in_progress, completed, failed, cancelled)';

-- ===============================================
-- COMPLETION MESSAGE
-- ===============================================

DO $$
BEGIN
    RAISE NOTICE 'Redemption database schema enhancements completed successfully!';
    RAISE NOTICE 'Added: 15+ new columns, 3 new tables, 15+ indexes, RLS policies, and automated triggers';
    RAISE NOTICE 'Enhanced: Window management, request tracking, templates, notifications, and analytics';
    RAISE NOTICE 'Fixed: PostgreSQL constraint syntax compatibility issues resolved';
END $$;
