-- Universal Database Audit Schema Enhancement
-- Adds function to get all table schemas for audit tracking

-- Create function to get all table schemas
CREATE OR REPLACE FUNCTION get_all_table_schemas()
RETURNS TABLE (
  table_name TEXT,
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT,
  column_default TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::TEXT,
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT,
    c.column_default::TEXT
  FROM information_schema.tables t
  JOIN information_schema.columns c 
    ON t.table_name = c.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name, c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_table_schemas() TO authenticated;

-- Create enhanced audit logging function for all tables
CREATE OR REPLACE FUNCTION log_database_operation(
  p_table_name TEXT,
  p_operation TEXT,
  p_record_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
  user_name TEXT;
BEGIN
  -- Generate audit ID
  audit_id := gen_random_uuid();
  
  -- Get username if user_id provided
  IF p_user_id IS NOT NULL THEN
    SELECT COALESCE(name, email, 'Unknown User') INTO user_name
    FROM auth.users 
    WHERE id = p_user_id;
  ELSE
    user_name := 'System';
  END IF;
  
  -- Insert audit log
  INSERT INTO audit_logs (
    id,
    timestamp,
    action,
    entity_type,
    entity_id,
    user_id,
    username,
    details,
    category,
    severity,
    status,
    metadata,
    old_data,
    new_data,
    is_automated,
    created_at
  ) VALUES (
    audit_id,
    NOW(),
    LOWER(p_operation),
    p_table_name,
    p_record_id,
    p_user_id,
    user_name,
    CASE 
      WHEN p_operation = 'CREATE' THEN 'Created new record in ' || p_table_name
      WHEN p_operation = 'UPDATE' THEN 'Updated record ' || p_record_id || ' in ' || p_table_name
      WHEN p_operation = 'DELETE' THEN 'Deleted record ' || p_record_id || ' from ' || p_table_name
      WHEN p_operation = 'READ' THEN 'Accessed record ' || p_record_id || ' in ' || p_table_name
      ELSE 'Performed ' || p_operation || ' on ' || p_table_name
    END,
    'system',
    CASE 
      WHEN p_operation = 'DELETE' THEN 'high'
      WHEN p_operation = 'UPDATE' THEN 'medium'
      ELSE 'low'
    END,
    'success',
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'table_name', p_table_name,
      'operation_type', p_operation,
      'automated', (p_user_id IS NULL),
      'tracked_by', 'UniversalDatabaseAuditService'
    ),
    p_old_data,
    p_new_data,
    (p_user_id IS NULL),
    NOW()
  );
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_database_operation(TEXT, TEXT, TEXT, UUID, JSONB, JSONB, JSONB) TO authenticated;

-- Create function to get audit statistics
CREATE OR REPLACE FUNCTION get_audit_statistics(
  p_hours_back INTEGER DEFAULT 24
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  since_time TIMESTAMP;
BEGIN
  since_time := NOW() - (p_hours_back || ' hours')::INTERVAL;
  
  WITH stats AS (
    SELECT 
      COUNT(*) as total_events,
      COUNT(DISTINCT entity_type) as tables_affected,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(CASE WHEN action LIKE '%create%' OR action LIKE '%insert%' THEN 1 END) as creates,
      COUNT(CASE WHEN action LIKE '%read%' OR action LIKE '%select%' THEN 1 END) as reads,
      COUNT(CASE WHEN action LIKE '%update%' OR action LIKE '%modify%' THEN 1 END) as updates,
      COUNT(CASE WHEN action LIKE '%delete%' OR action LIKE '%remove%' THEN 1 END) as deletes,
      COUNT(CASE WHEN is_automated = true THEN 1 END) as automated_operations,
      COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity,
      COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_severity,
      COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_severity
    FROM audit_logs 
    WHERE timestamp >= since_time
  ),
  top_tables AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'table', entity_type,
        'count', cnt
      ) ORDER BY cnt DESC
    ) as top_tables
    FROM (
      SELECT entity_type, COUNT(*) as cnt
      FROM audit_logs 
      WHERE timestamp >= since_time
        AND entity_type IS NOT NULL
      GROUP BY entity_type
      ORDER BY cnt DESC
      LIMIT 10
    ) t
  ),
  top_users AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'user', username,
        'count', cnt
      ) ORDER BY cnt DESC
    ) as top_users
    FROM (
      SELECT username, COUNT(*) as cnt
      FROM audit_logs 
      WHERE timestamp >= since_time
        AND username IS NOT NULL
        AND is_automated = false
      GROUP BY username
      ORDER BY cnt DESC
      LIMIT 10
    ) u
  )
  SELECT jsonb_build_object(
    'period_hours', p_hours_back,
    'total_events', COALESCE(s.total_events, 0),
    'tables_affected', COALESCE(s.tables_affected, 0),
    'unique_users', COALESCE(s.unique_users, 0),
    'operations', jsonb_build_object(
      'creates', COALESCE(s.creates, 0),
      'reads', COALESCE(s.reads, 0),
      'updates', COALESCE(s.updates, 0),
      'deletes', COALESCE(s.deletes, 0)
    ),
    'automation', jsonb_build_object(
      'automated_operations', COALESCE(s.automated_operations, 0),
      'manual_operations', COALESCE(s.total_events - s.automated_operations, 0)
    ),
    'severity_distribution', jsonb_build_object(
      'high', COALESCE(s.high_severity, 0),
      'medium', COALESCE(s.medium_severity, 0),
      'low', COALESCE(s.low_severity, 0)
    ),
    'top_tables', COALESCE(tt.top_tables, '[]'::jsonb),
    'top_users', COALESCE(tu.top_users, '[]'::jsonb),
    'generated_at', NOW()
  ) INTO result
  FROM stats s
  CROSS JOIN top_tables tt
  CROSS JOIN top_users tu;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_audit_statistics(INTEGER) TO authenticated;

-- Create view for database audit coverage
CREATE OR REPLACE VIEW database_audit_coverage AS
WITH all_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
),
audited_tables AS (
  SELECT DISTINCT entity_type as table_name
  FROM audit_logs
  WHERE timestamp >= NOW() - INTERVAL '7 days'
    AND entity_type IS NOT NULL
)
SELECT 
  at.table_name,
  CASE WHEN aud.table_name IS NOT NULL THEN true ELSE false END as has_recent_audit,
  COALESCE(al.event_count, 0) as recent_event_count,
  COALESCE(al.last_event, NULL) as last_audit_event
FROM all_tables at
LEFT JOIN audited_tables aud ON at.table_name = aud.table_name
LEFT JOIN (
  SELECT 
    entity_type,
    COUNT(*) as event_count,
    MAX(timestamp) as last_event
  FROM audit_logs 
  WHERE timestamp >= NOW() - INTERVAL '7 days'
  GROUP BY entity_type
) al ON at.table_name = al.entity_type
ORDER BY recent_event_count DESC, at.table_name;

-- Grant select permission on the view
GRANT SELECT ON database_audit_coverage TO authenticated;

-- Add comment explaining the enhancement
COMMENT ON FUNCTION get_all_table_schemas() IS 'Returns schema information for all tables to enable universal database auditing';
COMMENT ON FUNCTION log_database_operation(TEXT, TEXT, TEXT, UUID, JSONB, JSONB, JSONB) IS 'Logs database operations for audit tracking without triggers';
COMMENT ON FUNCTION get_audit_statistics(INTEGER) IS 'Returns comprehensive audit statistics for the specified time period';
COMMENT ON VIEW database_audit_coverage IS 'Shows audit coverage across all database tables';