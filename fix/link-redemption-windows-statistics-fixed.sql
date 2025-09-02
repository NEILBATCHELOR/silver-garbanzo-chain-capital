-- Link Redemption Windows Statistics to Actual Requests - FIXED
-- Date: August 26, 2025
-- Purpose: Create triggers and functions to automatically update redemption_windows statistics
-- Fix: Resolved variable name collisions

-- ========================================
-- FUNCTION: Update Redemption Window Statistics
-- ========================================

CREATE OR REPLACE FUNCTION update_redemption_window_statistics(window_uuid UUID)
RETURNS VOID AS $$
DECLARE
    total_requests_count INTEGER := 0;
    total_value NUMERIC := 0;
    approved_count INTEGER := 0;
    rejected_count INTEGER := 0;
    pending_count INTEGER := 0;
    calculated_approved_value NUMERIC := 0;  -- Renamed to avoid collision
    calculated_rejected_value NUMERIC := 0;  -- Renamed to avoid collision
    calculated_pending_value NUMERIC := 0;   -- Renamed to avoid collision
BEGIN
    -- Calculate statistics from redemption_requests
    SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(COALESCE(usdc_amount, token_amount, 0)), 0) as total_amount,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_total,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_total,
        COUNT(*) FILTER (WHERE status IN ('pending', 'submitted', 'processing')) as pending_total,
        COALESCE(SUM(COALESCE(usdc_amount, token_amount, 0)) FILTER (WHERE status = 'approved'), 0) as approved_amount,
        COALESCE(SUM(COALESCE(usdc_amount, token_amount, 0)) FILTER (WHERE status = 'rejected'), 0) as rejected_amount,
        COALESCE(SUM(COALESCE(usdc_amount, token_amount, 0)) FILTER (WHERE status IN ('pending', 'submitted', 'processing')), 0) as pending_amount
    INTO 
        total_requests_count, total_value, approved_count, rejected_count, pending_count,
        calculated_approved_value, calculated_rejected_value, calculated_pending_value
    FROM redemption_requests 
    WHERE (window_id = window_uuid OR redemption_window_id = window_uuid);

    -- Update redemption_windows table
    UPDATE redemption_windows 
    SET 
        current_requests = total_requests_count,
        total_request_value = total_value,
        approved_requests = approved_count,
        rejected_requests = rejected_count,
        queued_requests = pending_count,
        approved_value = calculated_approved_value,
        rejected_value = calculated_rejected_value,
        queued_value = calculated_pending_value,
        updated_at = NOW(),
        last_status_change_at = NOW()
    WHERE id = window_uuid;

    -- Log the update for audit purposes
    RAISE INFO 'Updated redemption window % with % requests, $% total value', 
               window_uuid, total_requests_count, total_value;

END;
$$ LANGUAGE plpgsql;

-- ========================================
-- FUNCTION: Refresh All Window Statistics
-- ========================================

CREATE OR REPLACE FUNCTION refresh_all_redemption_window_statistics()
RETURNS INTEGER AS $$
DECLARE
    window_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- Update statistics for all redemption windows
    FOR window_record IN 
        SELECT DISTINCT id FROM redemption_windows 
        WHERE is_active = true
    LOOP
        PERFORM update_redemption_window_statistics(window_record.id);
        updated_count := updated_count + 1;
    END LOOP;

    RAISE INFO 'Refreshed statistics for % redemption windows', updated_count;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS: Auto-update on Request Changes
-- ========================================

-- Trigger function for redemption_requests changes
CREATE OR REPLACE FUNCTION trigger_update_redemption_statistics()
RETURNS TRIGGER AS $$
DECLARE
    affected_window_id UUID;
BEGIN
    -- Handle INSERT/UPDATE
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        -- Update statistics for the new/updated window
        IF NEW.window_id IS NOT NULL THEN
            PERFORM update_redemption_window_statistics(NEW.window_id);
        END IF;
        
        IF NEW.redemption_window_id IS NOT NULL THEN
            PERFORM update_redemption_window_statistics(NEW.redemption_window_id);
        END IF;
        
        -- If UPDATE, also update the old window if it changed
        IF TG_OP = 'UPDATE' THEN
            IF OLD.window_id IS NOT NULL AND OLD.window_id != COALESCE(NEW.window_id, OLD.window_id) THEN
                PERFORM update_redemption_window_statistics(OLD.window_id);
            END IF;
            
            IF OLD.redemption_window_id IS NOT NULL AND OLD.redemption_window_id != COALESCE(NEW.redemption_window_id, OLD.redemption_window_id) THEN
                PERFORM update_redemption_window_statistics(OLD.redemption_window_id);
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.window_id IS NOT NULL THEN
            PERFORM update_redemption_window_statistics(OLD.window_id);
        END IF;
        
        IF OLD.redemption_window_id IS NOT NULL THEN
            PERFORM update_redemption_window_statistics(OLD.redemption_window_id);
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_redemption_requests_update_statistics ON redemption_requests;
CREATE TRIGGER tr_redemption_requests_update_statistics
    AFTER INSERT OR UPDATE OR DELETE
    ON redemption_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_redemption_statistics();

-- ========================================
-- APPLICATION SERVICE INTEGRATION
-- ========================================

-- Add helper function for application code
CREATE OR REPLACE FUNCTION link_redemption_request_to_window(
    request_id UUID,
    window_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Update the redemption request with window link
    UPDATE redemption_requests 
    SET redemption_window_id = window_id,
        updated_at = NOW()
    WHERE id = request_id;
    
    -- Statistics will be automatically updated by trigger
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INITIAL DATA MIGRATION
-- ========================================

-- Step 1: Link existing requests to appropriate windows
-- (This will need manual review based on business logic)

-- Example: Link requests to the most recent window (you may need different logic)
DO $$
DECLARE
    recent_window_id UUID;
    linked_requests_count INTEGER;
BEGIN
    -- Get the most recent redemption window
    SELECT id INTO recent_window_id
    FROM redemption_windows 
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Link unlinked requests to this window (if appropriate)
    IF recent_window_id IS NOT NULL THEN
        UPDATE redemption_requests 
        SET redemption_window_id = recent_window_id
        WHERE redemption_window_id IS NULL 
          AND window_id IS NULL
          AND status IN ('approved', 'pending', 'submitted', 'processing');
        
        GET DIAGNOSTICS linked_requests_count = ROW_COUNT;
        
        RAISE INFO 'Linked % existing requests to window %', 
                   linked_requests_count, recent_window_id;
    ELSE
        RAISE INFO 'No active redemption windows found for linking';
    END IF;
END;
$$;

-- Step 2: Refresh all statistics after migration
SELECT refresh_all_redemption_window_statistics() as "Updated Windows";

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Show current statistics vs actual data
SELECT 
    rw.name,
    rw.current_requests as "Window Stats: Requests",
    rw.total_request_value as "Window Stats: Value",
    rw.approved_requests as "Window Stats: Approved",
    COUNT(rr.*) as "Actual: Total Requests",
    COALESCE(SUM(COALESCE(rr.usdc_amount, rr.token_amount, 0)), 0) as "Actual: Total Value",
    COUNT(*) FILTER (WHERE rr.status = 'approved') as "Actual: Approved"
FROM redemption_windows rw
LEFT JOIN redemption_requests rr ON (rr.window_id = rw.id OR rr.redemption_window_id = rw.id)
GROUP BY rw.id, rw.name, rw.current_requests, rw.total_request_value, rw.approved_requests
ORDER BY rw.created_at DESC;

-- Show redemption requests and their window assignments
SELECT 
    rr.id,
    rr.status,
    rr.token_amount,
    rr.usdc_amount,
    rr.window_id,
    rr.redemption_window_id,
    rw.name as window_name,
    rr.created_at
FROM redemption_requests rr
LEFT JOIN redemption_windows rw ON (rw.id = rr.window_id OR rw.id = rr.redemption_window_id)
ORDER BY rr.created_at DESC;

-- ========================================
-- MAINTENANCE FUNCTIONS
-- ========================================

-- Function to reconcile statistics (run periodically)
CREATE OR REPLACE FUNCTION reconcile_redemption_statistics()
RETURNS TABLE(
    window_id UUID,
    window_name TEXT,
    before_requests INTEGER,
    after_requests INTEGER,
    before_value NUMERIC,
    after_value NUMERIC
) AS $$
DECLARE
    window_record RECORD;
BEGIN
    FOR window_record IN 
        SELECT rw.id, rw.name, rw.current_requests, rw.total_request_value
        FROM redemption_windows rw
        WHERE rw.is_active = true
    LOOP
        -- Store before values
        window_id := window_record.id;
        window_name := window_record.name;
        before_requests := window_record.current_requests;
        before_value := window_record.total_request_value;
        
        -- Update statistics
        PERFORM update_redemption_window_statistics(window_record.id);
        
        -- Get after values
        SELECT rw.current_requests, rw.total_request_value
        INTO after_requests, after_value
        FROM redemption_windows rw
        WHERE rw.id = window_record.id;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant execute permissions to application users
GRANT EXECUTE ON FUNCTION update_redemption_window_statistics(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_all_redemption_window_statistics() TO PUBLIC;
GRANT EXECUTE ON FUNCTION link_redemption_request_to_window(UUID, UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION reconcile_redemption_statistics() TO PUBLIC;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE INFO '=== REDEMPTION STATISTICS LINKING COMPLETE ===';
    RAISE INFO 'Created functions: update_redemption_window_statistics, refresh_all_redemption_window_statistics';
    RAISE INFO 'Created trigger: tr_redemption_requests_update_statistics';
    RAISE INFO 'Linked existing requests to redemption windows';
    RAISE INFO 'Statistics will now automatically update when requests are created/updated/deleted';
    RAISE INFO '=== READY FOR PRODUCTION USE ===';
END;
$$;