-- Migration: 20250817_prevent_duplicate_lifecycle_events.sql
-- Description: Add unique constraint to prevent duplicate lifecycle events

-- Create a function that will be used in a trigger to prevent duplicates
CREATE OR REPLACE FUNCTION prevent_duplicate_lifecycle_events()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a similar event was created in the last 5 seconds
  IF EXISTS (
    SELECT 1 FROM product_lifecycle_events
    WHERE product_id = NEW.product_id
      AND event_type = NEW.event_type
      AND created_at > (NEW.created_at - INTERVAL '5 seconds')
      AND created_at < NEW.created_at
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Duplicate event detected: A similar event was created within the last 5 seconds';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_prevent_duplicate_lifecycle_events ON product_lifecycle_events;
CREATE TRIGGER tr_prevent_duplicate_lifecycle_events
BEFORE INSERT ON product_lifecycle_events
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_lifecycle_events();

-- Add function to purge existing duplicates
CREATE OR REPLACE FUNCTION purge_duplicate_lifecycle_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  duplicate_record RECORD;
BEGIN
  -- Find duplicates
  FOR duplicate_record IN (
    SELECT 
      id,
      product_id,
      event_type,
      created_at,
      ROW_NUMBER() OVER (
        PARTITION BY product_id, event_type, 
        FLOOR(EXTRACT(EPOCH FROM created_at) / 5)  -- 5-second window
        ORDER BY created_at
      ) AS row_num
    FROM product_lifecycle_events
  )
  LOOP
    -- Delete all rows except the first one in each group
    IF duplicate_record.row_num > 1 THEN
      DELETE FROM product_lifecycle_events WHERE id = duplicate_record.id;
      deleted_count := deleted_count + 1;
    END IF;
  END LOOP;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Execute the purge function to clean up existing duplicates
SELECT purge_duplicate_lifecycle_events();
