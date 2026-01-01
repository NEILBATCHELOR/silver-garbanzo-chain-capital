/**
 * Deployment Audit Service
 * 
 * Logs all deployment activities to database for security and compliance
 */

import { getSupabaseClient } from '../../infrastructure/database/supabase';

// ============================================
// Types
// ============================================

export interface DeploymentAuditLog {
  user_id: string | null;
  network: string;
  action: 'deployment' | 'verification' | 'command_execution' | 'deploy_and_verify';
  command: string;
  success: boolean;
  exit_code: number;
  duration_ms: number;
  output?: string;
  error?: string;
  metadata?: Record<string, any>;
}

// ============================================
// Audit Logging
// ============================================

/**
 * Log deployment activity to database
 */
export async function logDeploymentActivity(log: DeploymentAuditLog): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    // Sanitize command (remove private keys)
    const sanitizedCommand = sanitizeCommand(log.command);

    const { error } = await supabase
      .from('deployment_audit_logs')
      .insert({
        user_id: log.user_id,
        network: log.network,
        action: log.action,
        command: sanitizedCommand,
        success: log.success,
        exit_code: log.exit_code,
        duration_ms: log.duration_ms,
        output: log.output ? truncateOutput(log.output) : null,
        error: log.error,
        metadata: log.metadata || {},
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log deployment activity:', error);
    }
  } catch (error) {
    console.error('Error logging deployment activity:', error);
  }
}

/**
 * Get deployment history for a user
 */
export async function getDeploymentHistory(params: {
  userId?: string;
  network?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('deployment_audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (params.userId) {
    query = query.eq('user_id', params.userId);
  }

  if (params.network) {
    query = query.eq('network', params.network);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch deployment history: ${error.message}`);
  }

  return data || [];
}

/**
 * Get deployment statistics
 */
export async function getDeploymentStats(params: {
  userId?: string;
  network?: string;
  startDate?: string;
  endDate?: string;
}) {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('deployment_audit_logs')
    .select('action, success, network, created_at');

  if (params.userId) {
    query = query.eq('user_id', params.userId);
  }

  if (params.network) {
    query = query.eq('network', params.network);
  }

  if (params.startDate) {
    query = query.gte('created_at', params.startDate);
  }

  if (params.endDate) {
    query = query.lte('created_at', params.endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch deployment stats: ${error.message}`);
  }

  // Calculate statistics
  const logs = data || [];
  const stats = {
    total: logs.length,
    successful: logs.filter(l => l.success).length,
    failed: logs.filter(l => !l.success).length,
    byAction: {} as Record<string, number>,
    byNetwork: {} as Record<string, number>,
    successRate: 0
  };

  // Group by action
  for (const log of logs) {
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    stats.byNetwork[log.network] = (stats.byNetwork[log.network] || 0) + 1;
  }

  // Calculate success rate
  if (stats.total > 0) {
    stats.successRate = (stats.successful / stats.total) * 100;
  }

  return stats;
}

// ============================================
// Helpers
// ============================================

/**
 * Sanitize command to remove sensitive data
 */
function sanitizeCommand(command: string): string {
  // Remove private keys
  return command.replace(/--private-key\s+0x[a-fA-F0-9]{64}/g, '--private-key [REDACTED]');
}

/**
 * Truncate output to prevent excessive database storage
 */
function truncateOutput(output: string, maxLength: number = 10000): string {
  if (output.length <= maxLength) {
    return output;
  }
  
  return output.substring(0, maxLength) + '\n\n... [Output truncated]';
}

// ============================================
// Database Schema (for reference)
// ============================================

/*
CREATE TABLE deployment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id), -- Nullable for system operations
  network TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('deployment', 'verification', 'command_execution', 'deploy_and_verify')),
  command TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  exit_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  output TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_deployment_audit_logs_user_id ON deployment_audit_logs(user_id);
CREATE INDEX idx_deployment_audit_logs_network ON deployment_audit_logs(network);
CREATE INDEX idx_deployment_audit_logs_created_at ON deployment_audit_logs(created_at DESC);
CREATE INDEX idx_deployment_audit_logs_action ON deployment_audit_logs(action);

-- RLS policies (admin only)
ALTER TABLE deployment_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view all deployment logs"
  ON deployment_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE role_name = 'admin'
      )
    )
  );

CREATE POLICY "System can insert deployment logs"
  ON deployment_audit_logs
  FOR INSERT
  WITH CHECK (true);
*/

// ============================================
// Export
// ============================================

export const DeploymentAuditService = {
  logDeploymentActivity,
  getDeploymentHistory,
  getDeploymentStats
};

export default DeploymentAuditService;
