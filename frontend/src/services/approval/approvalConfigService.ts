/**
 * Enhanced Approval Configuration Service
 * Handles approval configurations with multiple config support, change history, and proper data retrieval
 */

import { supabase } from '@/infrastructure/supabaseClient';

export interface ApprovalConfigApprover {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  approverType: 'user' | 'role';
  isRequired: boolean;
  orderPriority: number;
}

export interface ApprovalConfig {
  id: string;
  permissionId: string;
  configName: string;
  configDescription: string;
  approvalMode: 'user_specific' | 'role_based' | 'mixed';
  requiredApprovals: number;
  requiresAllApprovers: boolean;
  consensusType: 'all' | 'majority' | 'any';
  eligibleRoles: string[];
  autoApprovalConditions: any;
  autoApproveThreshold: number;
  escalationConfig: any;
  notificationConfig: any;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
  approvers: ApprovalConfigApprover[];
  approverCount: number;
}

export interface ApprovalConfigHistory {
  id: string;
  approvalConfigId: string;
  changeType: 'created' | 'updated' | 'deleted' | 'approvers_changed';
  oldData: any;
  newData: any;
  changedBy: string;
  changeReason?: string;
  createdAt: string;
}

export class ApprovalConfigService {
  private static readonly REDEMPTION_CONFIG_TYPE = 'redemption_approval';
  private static readonly POLICY_CONFIG_TYPE = 'policy_approval';

  /**
   * Get all approval configurations for a specific context (redemption or policy)
   */
  static async getApprovalConfigs(configType: string = this.REDEMPTION_CONFIG_TYPE): Promise<ApprovalConfig[]> {
    try {
      // Simplified approach: Just get all active approval configs
      const { data, error } = await supabase
        .from('approval_configs')
        .select(`
          *,
          approval_config_approvers (
            *,
            approver_user:users!approval_config_approvers_approver_user_id_fkey(id, name, email),
            approver_role:roles!approval_config_approvers_approver_role_id_fkey(id, name)
          )
        `)
        .eq('active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Database query error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Transform the data
      const transformedConfigs = data.map(config => {
        const approvers = config.approval_config_approvers?.map((approver: any) => ({
          id: approver.approver_user_id || approver.approver_role_id || '',
          name: approver.approver_user?.name || approver.approver_role?.name || 'Unknown',
          email: approver.approver_user?.email || '',
          role: approver.approver_user ? 
            (approver.approver_user as any).role || 'User' : 
            approver.approver_role?.name || 'Role',
          approverType: approver.approver_type,
          isRequired: approver.is_required,
          orderPriority: approver.order_priority
        })) || [];

        return {
          ...config,
          configured_approvers: JSON.stringify(approvers),
          approver_count: approvers.length
        };
      });

      const finalConfigs = transformedConfigs.map(this.mapDatabaseToConfig);
      return finalConfigs;
    } catch (error) {
      console.error('ApprovalConfigService error:', error);
      throw error;
    }
  }

  /**
   * Get a specific approval configuration with its approvers
   */
  static async getApprovalConfig(configId: string): Promise<ApprovalConfig | null> {
    try {
      // Get the main config
      const { data: configData, error: configError } = await supabase
        .from('approval_configs')
        .select('*')
        .eq('id', configId)
        .single();

      if (configError) throw configError;
      if (!configData) return null;

      // Get the approvers for this config
      const { data: approversData, error: approversError } = await supabase
        .from('approval_config_approvers')
        .select(`
          *,
          approver_user:users!approval_config_approvers_approver_user_id_fkey(id, name, email),
          approver_role:roles!approval_config_approvers_approver_role_id_fkey(id, name)
        `)
        .eq('approval_config_id', configId)
        .order('order_priority');

      if (approversError) throw approversError;

      // Map approvers to the expected format
      const approvers: ApprovalConfigApprover[] = approversData?.map(approver => ({
        id: approver.approver_user_id || approver.approver_role_id || '',
        name: approver.approver_user?.name || approver.approver_role?.name || 'Unknown',
        email: approver.approver_user?.email || '',
        role: approver.approver_user ? 
          (approver.approver_user as any).role || 'User' : 
          approver.approver_role?.name || 'Role',
        avatarUrl: approver.approver_user?.name ? 
          `https://api.dicebear.com/7.x/initials/svg?seed=${approver.approver_user.name.substring(0, 2)}&backgroundColor=4F46E5` : 
          undefined,
        approverType: approver.approver_type as 'user' | 'role',
        isRequired: approver.is_required,
        orderPriority: approver.order_priority
      })) || [];

      return {
        id: configData.id,
        permissionId: configData.permission_id,
        configName: configData.config_name,
        configDescription: configData.config_description,
        approvalMode: configData.approval_mode,
        requiredApprovals: configData.required_approvals,
        requiresAllApprovers: configData.requires_all_approvers,
        consensusType: configData.consensus_type,
        eligibleRoles: configData.eligible_roles || [],
        autoApprovalConditions: configData.auto_approval_conditions || {},
        autoApproveThreshold: configData.auto_approve_threshold || 0,
        escalationConfig: configData.escalation_config,
        notificationConfig: configData.notification_config,
        active: configData.active,
        createdAt: configData.created_at,
        updatedAt: configData.updated_at,
        createdBy: configData.created_by,
        lastModifiedBy: configData.last_modified_by,
        approvers,
        approverCount: approvers.length
      };
    } catch (error) {
      console.error('Error getting approval config:', error);
      throw error;
    }
  }

  /**
   * Create a new approval configuration
   */
  static async createApprovalConfig(
    config: Partial<ApprovalConfig>,
    approvers: ApprovalConfigApprover[],
    userId: string,
    changeReason?: string
  ): Promise<ApprovalConfig> {
    try {
      const configId = crypto.randomUUID();

      // Create the main config
      const { data: configData, error: configError } = await supabase
        .from('approval_configs')
        .insert({
          id: configId,
          permission_id: config.permissionId || configId,
          config_name: config.configName,
          config_description: config.configDescription,
          approval_mode: config.approvalMode || 'user_specific',
          required_approvals: config.requiredApprovals || 1,
          requires_all_approvers: config.requiresAllApprovers || false,
          consensus_type: config.consensusType || 'any',
          eligible_roles: config.eligibleRoles || [],
          auto_approval_conditions: config.autoApprovalConditions || {},
          auto_approve_threshold: config.autoApproveThreshold || 0,
          escalation_config: config.escalationConfig,
          notification_config: config.notificationConfig,
          active: config.active !== false,
          created_by: userId,
          last_modified_by: userId
        })
        .select()
        .single();

      if (configError) throw configError;

      // Create approver assignments
      if (approvers.length > 0) {
        const approverInserts = approvers.map((approver, index) => ({
          approval_config_id: configId,
          approver_type: approver.approverType,
          approver_user_id: approver.approverType === 'user' ? approver.id : null,
          approver_role_id: approver.approverType === 'role' ? approver.id : null,
          is_required: approver.isRequired,
          order_priority: index,
          created_by: userId
        }));

        const { error: approverError } = await supabase
          .from('approval_config_approvers')
          .insert(approverInserts);

        if (approverError) throw approverError;
      }

      // Log the creation in history
      await this.logConfigChange(
        configId,
        'created',
        null,
        configData,
        userId,
        changeReason || 'Created new approval configuration'
      );

      // Return the created config
      return (await this.getApprovalConfig(configId))!;
    } catch (error) {
      console.error('Error creating approval config:', error);
      throw error;
    }
  }

  /**
   * Update an existing approval configuration
   */
  static async updateApprovalConfig(
    configId: string,
    updates: Partial<ApprovalConfig>,
    approvers: ApprovalConfigApprover[],
    userId: string,
    changeReason?: string
  ): Promise<ApprovalConfig> {
    try {
      // Get the old config for history
      const oldConfig = await this.getApprovalConfig(configId);

      // Update the main config
      const { error: configError } = await supabase
        .from('approval_configs')
        .update({
          config_name: updates.configName,
          config_description: updates.configDescription,
          approval_mode: updates.approvalMode,
          required_approvals: updates.requiredApprovals,
          requires_all_approvers: updates.requiresAllApprovers,
          consensus_type: updates.consensusType,
          eligible_roles: updates.eligibleRoles,
          auto_approval_conditions: updates.autoApprovalConditions,
          auto_approve_threshold: updates.autoApproveThreshold,
          escalation_config: updates.escalationConfig,
          notification_config: updates.notificationConfig,
          active: updates.active,
          last_modified_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId);

      if (configError) throw configError;

      // Clear existing approver assignments
      const { error: deleteError } = await supabase
        .from('approval_config_approvers')
        .delete()
        .eq('approval_config_id', configId);

      if (deleteError) throw deleteError;

      // Insert new approver assignments
      if (approvers.length > 0) {
        const approverInserts = approvers.map((approver, index) => ({
          approval_config_id: configId,
          approver_type: approver.approverType,
          approver_user_id: approver.approverType === 'user' ? approver.id : null,
          approver_role_id: approver.approverType === 'role' ? approver.id : null,
          is_required: approver.isRequired,
          order_priority: index,
          created_by: userId
        }));

        const { error: approverError } = await supabase
          .from('approval_config_approvers')
          .insert(approverInserts);

        if (approverError) throw approverError;
      }

      // Get the updated config for history
      const newConfig = await this.getApprovalConfig(configId);

      // Log the update in history
      await this.logConfigChange(
        configId,
        'updated',
        oldConfig,
        newConfig,
        userId,
        changeReason || 'Updated approval configuration'
      );

      return newConfig!;
    } catch (error) {
      console.error('Error updating approval config:', error);
      throw error;
    }
  }

  /**
   * Delete an approval configuration
   */
  static async deleteApprovalConfig(configId: string, userId: string, reason?: string): Promise<void> {
    try {
      // Get the config for history before deleting
      const oldConfig = await this.getApprovalConfig(configId);

      // Soft delete by marking as inactive
      const { error: configError } = await supabase
        .from('approval_configs')
        .update({
          active: false,
          last_modified_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId);

      if (configError) throw configError;

      // Log the deletion in history
      await this.logConfigChange(
        configId,
        'deleted',
        oldConfig,
        null,
        userId,
        reason || 'Deleted approval configuration'
      );
    } catch (error) {
      console.error('Error deleting approval config:', error);
      throw error;
    }
  }

  /**
   * Get change history for a configuration
   */
  static async getConfigHistory(configId: string): Promise<ApprovalConfigHistory[]> {
    try {
      const { data, error } = await supabase
        .from('approval_config_history')
        .select(`
          *,
          changed_by_user:users!approval_config_history_changed_by_fkey(name, email)
        `)
        .eq('approval_config_id', configId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(history => ({
        id: history.id,
        approvalConfigId: history.approval_config_id,
        changeType: history.change_type,
        oldData: history.old_data,
        newData: history.new_data,
        changedBy: history.changed_by,
        changeReason: history.change_reason,
        createdAt: history.created_at
      })) || [];
    } catch (error) {
      console.error('Error getting config history:', error);
      throw error;
    }
  }

  /**
   * Get eligible approvers (users with appropriate permissions)
   * Includes super admin exemption logic
   */
  static async getEligibleApprovers(currentUserId?: string, includeSelf?: boolean): Promise<ApprovalConfigApprover[]> {
    try {
      // Get all users with their roles
      const { data: usersData, error: usersError } = await supabase
        .from('user_permissions_view')
        .select('user_id, user_name, email, role_name')
        .order('user_name');

      if (usersError) throw usersError;

      if (!usersData) return [];

      // Map to approver format
      const approvers = usersData
        .filter((user, index, self) => 
          // Remove duplicates by user_id
          index === self.findIndex(u => u.user_id === user.user_id)
        )
        .map(user => ({
          id: user.user_id,
          name: user.user_name || 'Unknown',
          email: user.email || '',
          role: user.role_name || 'User',
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${(user.user_name || 'XX').substring(0, 2)}&backgroundColor=4F46E5`,
          approverType: 'user' as const,
          isRequired: true,
          orderPriority: 0
        }));

      console.log('Eligible approvers before filtering:', {
        totalApprovers: approvers.length,
        currentUserId,
        includeSelf,
        approverIds: approvers.map(a => ({ id: a.id, name: a.name, role: a.role }))
      });

      // Handle super admin exemption
      if (!includeSelf && currentUserId) {
        // If includeSelf is false, exclude the current user from approvers
        const filteredApprovers = approvers.filter(approver => approver.id !== currentUserId);
        console.log('Filtered out current user:', {
          originalCount: approvers.length,
          filteredCount: filteredApprovers.length,
          excludedUserId: currentUserId
        });
        return filteredApprovers;
      }

      console.log('Returning all approvers (includeSelf=true or no currentUserId):', {
        count: approvers.length,
        currentUserId,
        includeSelf
      });

      return approvers;
    } catch (error) {
      console.error('Error getting eligible approvers:', error);
      throw error;
    }
  }

  /**
   * Log configuration changes for audit trail
   */
  private static async logConfigChange(
    configId: string,
    changeType: ApprovalConfigHistory['changeType'],
    oldData: any,
    newData: any,
    changedBy: string,
    reason?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('approval_config_history')
        .insert({
          approval_config_id: configId,
          change_type: changeType,
          old_data: oldData,
          new_data: newData,
          changed_by: changedBy,
          change_reason: reason
        });

      if (error) {
        console.error('Error logging config change:', error);
        // Don't throw error for logging failures
      }
    } catch (error) {
      console.error('Error logging config change:', error);
    }
  }

  /**
   * Map database result to ApprovalConfig
   */
  private static mapDatabaseToConfig(data: any): ApprovalConfig {
    return {
      id: data.id,
      permissionId: data.permission_id,
      configName: data.config_name,
      configDescription: data.config_description,
      approvalMode: data.approval_mode,
      requiredApprovals: data.required_approvals,
      requiresAllApprovers: data.requires_all_approvers,
      consensusType: data.consensus_type,
      eligibleRoles: data.eligible_roles || [],
      autoApprovalConditions: data.auto_approval_conditions || {},
      autoApproveThreshold: data.auto_approve_threshold || 0,
      escalationConfig: data.escalation_config,
      notificationConfig: data.notification_config,
      active: data.active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      lastModifiedBy: data.last_modified_by,
      approvers: JSON.parse(data.configured_approvers || '[]'),
      approverCount: data.approver_count || 0
    };
  }
}
