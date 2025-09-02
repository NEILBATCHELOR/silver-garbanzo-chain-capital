/**
 * Simplified Redemption Configuration Dashboard
 * Focused on Business Rules Configuration only
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/utils';
import { 
  Calendar,
  DollarSign,
  Edit,
  Plus,
  Save,
  Settings,
  Shield,
  Trash2,
  Info,
  Building,
  Target,
  PieChart,
  TrendingUp,
  ArrowLeft,

  CheckCircle,
  Clock,
  Layers
} from 'lucide-react';

// Import services
import { supabase } from '@/infrastructure/supabaseClient';
import { 
  ApprovalConfigService,
  type ApprovalConfig 
} from '@/services/approval/approvalConfigService';

// Import approver components
import RedemptionApprovalConfigModal from '../components/RedemptionApprovalConfigModal';

// Import types
import type { RedemptionWindow } from '../types/redemption';

interface EnhancedRedemptionRule {
  // Basic rule info
  id: string;
  project_id: string;
  redemption_type: string;
  is_redemption_open: boolean;
  open_after_date?: string;
  allow_continuous_redemption: boolean;
  max_redemption_percentage?: number;
  lock_up_period?: number;
  require_multi_sig_approval: boolean;
  required_approvers: number;
  created_at: string;
  updated_at: string;
  
  // Approval configuration linking
  approval_config_id?: string;
  approval_config?: ApprovalConfig;
  
  // Enhanced project information
  project_name?: string;
  project_type?: string;
  organization_id?: string;
  
  // Enhanced product information
  product_type?: string;
  product_id?: string;
  product_name?: string;
  product_status?: string;
  product_currency?: string;
  product_details?: any;
  
  // Target raise and capacity information
  target_raise_amount?: number;
  effective_target_raise?: number;
  total_redeemed_amount?: number;
  available_capacity?: number;
  capacity_percentage?: number;
  capacity_status?: string;
  
  // Interval fund specific
  redemption_window_id?: string;
  selected_window_id?: string;
}

interface Props {
  projectId: string;
  onRuleChange?: (rules: EnhancedRedemptionRule[]) => void;
}

// Utility function to format dates for datetime-local input
const formatDateForInput = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Format as YYYY-MM-DDTHH:mm (required by datetime-local input)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.warn('Error formatting date:', error);
    return '';
  }
};

export const EnhancedRedemptionConfigurationDashboard: React.FC<Props> = ({
  projectId,
  onRuleChange
}) => {
  const [rules, setRules] = useState<EnhancedRedemptionRule[]>([]);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<EnhancedRedemptionRule | null>(null);
  const [availableWindows, setAvailableWindows] = useState<RedemptionWindow[]>([]);
  const [approverConfigModalOpen, setApproverConfigModalOpen] = useState(false);
  const [approvalConfigs, setApprovalConfigs] = useState<ApprovalConfig[]>([]);
  const [defaultConfigId, setDefaultConfigId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load data on mount and when projectId changes
  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load only the data needed for business rules
      await Promise.all([
        loadProjectInfo(),
        loadEnhancedRedemptionRules(),
        loadRedemptionWindows(),
        loadApprovalConfigurations()
      ]);
    } catch (error) {
      console.error('Error loading configuration data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load redemption configuration data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProjectInfo(data);
    } catch (error) {
      console.error('Error loading project info:', error);
    }
  };

  const loadEnhancedRedemptionRules = async () => {
    try {
      // First try basic query to avoid database function errors
      let { data, error } = await supabase
        .from('redemption_rules')
        .select(`
          *,
          projects!inner(name, project_type, target_raise)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback to even more basic query if joins fail
        const { data: basicData, error: basicError } = await supabase
          .from('redemption_rules')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (basicError) throw basicError;
        data = basicData;
      }

      // Map database fields to component interface  
      const mappedRules: EnhancedRedemptionRule[] = (data || []).map(row => ({
        // Basic rule info
        id: row.id,
        project_id: row.project_id,
        redemption_type: row.redemption_type,
        is_redemption_open: row.is_redemption_open ?? false,
        open_after_date: row.open_after_date,
        allow_continuous_redemption: row.allow_continuous_redemption ?? false,
        max_redemption_percentage: row.max_redemption_percentage ? Number(row.max_redemption_percentage) : undefined,
        lock_up_period: row.lock_up_period,
        require_multi_sig_approval: row.require_multi_sig_approval ?? false,
        required_approvers: row.required_approvers || 2,
        created_at: row.created_at,
        updated_at: row.updated_at,
        
        // Approval configuration linking
        approval_config_id: row.approval_config_id,
        approval_config: row.approval_config_id ? 
          approvalConfigs.find(config => config.id === row.approval_config_id) : 
          undefined,
        
        // Enhanced project information (from joined projects table or defaults)
        project_name: row.projects?.name || 'Unknown Project',
        project_type: row.projects?.project_type || row.product_type,
        organization_id: row.organization_id,
        
        // Enhanced product information 
        product_type: row.product_type,
        product_id: row.product_id,
        product_name: row.product_name || 'Product',
        product_status: row.product_status || 'Active',
        product_currency: row.product_currency || 'USD',
        product_details: row.product_details,
        
        // Target raise and capacity information (basic without view)
        target_raise_amount: row.target_raise_amount ? Number(row.target_raise_amount) : undefined,
        effective_target_raise: row.target_raise_amount ? Number(row.target_raise_amount) : undefined,
        total_redeemed_amount: 0, // Will be calculated separately if needed
        available_capacity: row.target_raise_amount && row.max_redemption_percentage ? 
          Number(row.target_raise_amount) * (Number(row.max_redemption_percentage) / 100) : 
          row.target_raise_amount ? Number(row.target_raise_amount) : undefined,
        capacity_percentage: 0, // Will be calculated separately if needed  
        capacity_status: 'AVAILABLE',
        
        // Interval fund specific - map redemption_window_id from database
        redemption_window_id: row.redemption_window_id,
        selected_window_id: row.redemption_window_id
      }));

      setRules(mappedRules);
      onRuleChange?.(mappedRules);
    } catch (error) {
      console.error('Error loading enhanced redemption rules:', error);
      // More specific error message about database function issue
      toast({
        title: "Database Configuration Issue",
        description: "Some advanced features may not work until database migration is applied. Basic rule management is available.",
        variant: "destructive",
      });
    }
  };

  const loadRedemptionWindows = async () => {
    try {
      const { enhancedRedemptionService } = await import('../services/enhancedRedemptionService');
      
      const result = await enhancedRedemptionService.getRedemptionWindows({
        projectId: projectId
      });
      
      if (result.success && result.data) {
        setAvailableWindows(result.data);
      } else {
        console.warn('Failed to load redemption windows:', result.error);
        setAvailableWindows([]);
      }
    } catch (error) {
      console.error('Error loading redemption windows:', error);
      setAvailableWindows([]);
    }
  };

  const loadApprovalConfigurations = async () => {
    try {
      const configs = await ApprovalConfigService.getApprovalConfigs('redemption_approval');
      setApprovalConfigs(configs);
      
      // Find default configuration (assuming it's marked by name or first active one)
      const defaultConfig = configs.find(config => 
        config.configName.toLowerCase().includes('default') && config.active
      ) || configs.find(config => config.active);
      
      if (defaultConfig) {
        setDefaultConfigId(defaultConfig.id);
      }
    } catch (error) {
      console.error('Error loading approval configurations:', error);
      toast({
        title: "Error Loading Approvals",
        description: "Failed to load approval configurations. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSetDefaultConfig = async (configId: string) => {
    try {
      // In a real implementation, you might have a dedicated endpoint or field for this
      // For now, we'll just update the local state
      setDefaultConfigId(configId);
      
      toast({
        title: "Success",
        description: "Default approval configuration updated successfully.",
      });
    } catch (error) {
      console.error('Error setting default config:', error);
      toast({
        title: "Error",
        description: "Failed to set default configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApprovalConfig = async (config: ApprovalConfig) => {
    if (!confirm(`Are you sure you want to delete "${config.configName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Get current user ID from Supabase auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting current user:', userError);
        toast({
          title: "Error",
          description: "Unable to verify user credentials. Please try again.",
          variant: "destructive",
        });
        return;
      }

      await ApprovalConfigService.deleteApprovalConfig(
        config.id,
        user.id, // Use actual current user ID instead of 'system'
        `Deleted approval configuration: ${config.configName}`
      );

      toast({
        title: "Success",
        description: `Approval configuration "${config.configName}" has been deleted.`,
      });

      // Reload configurations
      await loadApprovalConfigurations();
    } catch (error) {
      console.error('Error deleting approval config:', error);
      toast({
        title: "Error",
        description: "Failed to delete approval configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/redemption')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Redemption Dashboard
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/redemption/calendar${projectId ? `?project=${projectId}` : ''}`)}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          Calendar View
        </Button>
      </div>

      {/* Project Overview */}
      {projectInfo && (
        <ProjectOverviewCard projectInfo={projectInfo} rules={rules} />
      )}

      {/* Business Rules Configuration */}
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-semibold">Redemption Configuration</h2>
          <p className="text-gray-600 mt-1">Configure business rules for token redemption</p>
        </div>
        
        <BusinessRulesConfiguration 
          projectId={projectId}
          projectInfo={projectInfo}
          rules={rules}
          onRuleUpdate={setRules}
          editingRule={editingRule}
          onEditRule={setEditingRule}
          availableWindows={availableWindows}
        />
      </div>

      {/* Approver Configuration Section */}
      <div className="space-y-6">
        <div className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Approver Configuration</h2>
              <p className="text-gray-600 mt-1">Configure approval workflow for redemption requests</p>
            </div>
            <Button 
              onClick={() => setApproverConfigModalOpen(true)}
              className="bg-[#0f172b] hover:bg-[#0f172b]/90"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Approvers
            </Button>
          </div>
        </div>

        {/* Approval Configurations Table */}
        <ApprovalConfigurationsTable
          configs={approvalConfigs}
          defaultConfigId={defaultConfigId}
          onSetDefault={handleSetDefaultConfig}
          onEdit={() => setApproverConfigModalOpen(true)}
          onDelete={handleDeleteApprovalConfig}
          onRefresh={loadApprovalConfigurations}
        />
      </div>

      {/* Approver Configuration Modal */}
      <RedemptionApprovalConfigModal
        open={approverConfigModalOpen}
        onOpenChange={setApproverConfigModalOpen}
        onSuccess={() => {
          toast({
            title: "Success",
            description: "Approver configuration has been updated successfully.",
          });
          // Refresh the approval configurations after changes
          loadApprovalConfigurations();
        }}
      />
    </div>
  );
};

// Project Overview Component with enhanced card styling
const ProjectOverviewCard: React.FC<{
  projectInfo: any;
  rules: EnhancedRedemptionRule[];
}> = ({ projectInfo, rules }) => {
  const totalTargetRaise = rules.reduce((sum, rule) => sum + (rule.effective_target_raise || 0), 0);
  const totalRedeemed = rules.reduce((sum, rule) => sum + (rule.total_redeemed_amount || 0), 0);
  const totalAvailableCapacity = rules.reduce((sum, rule) => sum + (rule.available_capacity || 0), 0);
  const openRules = rules.filter(r => r.is_redemption_open).length;

  return (
    <div className="space-y-6">
      {/* Project Header - Enhanced Styling */}
      <Card className="cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg border-border hover:border-primary/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 hover:from-blue-50 hover:to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
              <Building className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold text-gray-900">{projectInfo.name}</div>
              <div className="text-sm text-muted-foreground font-medium">
                {projectInfo.project_type?.replace(/_/g, ' ').toUpperCase()} • {rules.length} Redemption Rule{rules.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={openRules > 0 ? "default" : "secondary"} className="px-3 py-1">
                {openRules > 0 ? `${openRules} Active` : 'No Active Rules'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Overview Metrics Cards - Enhanced Styling */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg border-border hover:border-blue-200 bg-gradient-to-br from-blue-50/30 to-blue-100/30 hover:from-blue-50 hover:to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <Target className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900">${totalTargetRaise.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground font-medium">Total Target Raise</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg border-border hover:border-green-200 bg-gradient-to-br from-green-50/30 to-green-100/30 hover:from-green-50 hover:to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900">${totalRedeemed.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground font-medium">Total Redeemed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg border-border hover:border-purple-200 bg-gradient-to-br from-purple-50/30 to-purple-100/30 hover:from-purple-50 hover:to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                <PieChart className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900">${totalAvailableCapacity.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground font-medium">Available Capacity</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg border-border hover:border-orange-200 bg-gradient-to-br from-orange-50/30 to-orange-100/30 hover:from-orange-50 hover:to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900">{openRules}</div>
                <p className="text-sm text-muted-foreground font-medium">Open Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};





// Business Rules Configuration Component
const BusinessRulesConfiguration: React.FC<{
  projectId: string;
  projectInfo: any;
  rules: EnhancedRedemptionRule[];
  onRuleUpdate: (rules: EnhancedRedemptionRule[]) => void;
  editingRule: EnhancedRedemptionRule | null;
  onEditRule: (rule: EnhancedRedemptionRule | null) => void;
  availableWindows: RedemptionWindow[];
}> = ({ projectId, projectInfo, rules, onRuleUpdate, editingRule, onEditRule, availableWindows }) => {
  const [formData, setFormData] = useState({
    redemption_type: 'standard',
    is_redemption_open: false,
    open_after_date: '',
    allow_continuous_redemption: false,
    max_redemption_percentage: 100,
    lock_up_period: 90,
    require_multi_sig_approval: true,
    required_approvers: 2,
    selected_window_id: '',
    approval_config_id: ''
  });
  
  const { toast } = useToast();

  // Get approval configurations from parent component
  const [approvalConfigs, setApprovalConfigs] = useState<ApprovalConfig[]>([]);
  const [defaultConfigId, setDefaultConfigId] = useState<string | null>(null);

  // Load approval configurations for rule creation
  useEffect(() => {
    const loadApprovalConfigsForForm = async () => {
      try {
        const configs = await ApprovalConfigService.getApprovalConfigs('redemption_approval');
        setApprovalConfigs(configs);
        
        // Find default configuration
        const defaultConfig = configs.find(config => 
          config.configName.toLowerCase().includes('default') && config.active
        ) || configs.find(config => config.active);
        
        if (defaultConfig) {
          setDefaultConfigId(defaultConfig.id);
          // Set default config in form if not editing
          if (!editingRule) {
            setFormData(prev => ({ ...prev, approval_config_id: defaultConfig.id }));
          }
        }
      } catch (error) {
        console.error('Error loading approval configurations for form:', error);
      }
    };
    
    loadApprovalConfigsForForm();
  }, [editingRule]);

  // Update form data when editing rule changes
  useEffect(() => {
    if (editingRule) {
      setFormData({
        redemption_type: editingRule.redemption_type,
        is_redemption_open: editingRule.is_redemption_open,
        open_after_date: formatDateForInput(editingRule.open_after_date),
        allow_continuous_redemption: editingRule.allow_continuous_redemption,
        max_redemption_percentage: editingRule.max_redemption_percentage || 100,
        lock_up_period: editingRule.lock_up_period || 90,
        require_multi_sig_approval: editingRule.require_multi_sig_approval,
        required_approvers: editingRule.required_approvers,
        selected_window_id: editingRule.redemption_window_id || '',
        approval_config_id: editingRule.approval_config_id || defaultConfigId || ''
      });
    }
  }, [editingRule, defaultConfigId]);

  /**
   * Handles saving redemption rules with smart logic:
   * - Standard redemptions: Only one rule per project (uses UPSERT)
   * - Interval redemptions: Multiple rules allowed (uses INSERT)
   * - Editing: Always uses UPDATE regardless of type
   */
  const handleSaveRule = async () => {
    try {
      // Prepare data for database
      const ruleData = {
        project_id: projectId,
        redemption_type: formData.redemption_type,
        is_redemption_open: formData.is_redemption_open,
        open_after_date: formData.open_after_date ? new Date(formData.open_after_date).toISOString() : null,
        allow_continuous_redemption: formData.allow_continuous_redemption,
        max_redemption_percentage: formData.max_redemption_percentage,
        lock_up_period: formData.lock_up_period,
        require_multi_sig_approval: formData.require_multi_sig_approval,
        required_approvers: formData.required_approvers,
        // Include redemption window ID for interval redemptions
        redemption_window_id: formData.redemption_type === 'interval' && formData.selected_window_id ? 
          formData.selected_window_id : null,
        // Include approval configuration ID to link rule to approval configuration
        approval_config_id: formData.approval_config_id || null,
        updated_at: new Date().toISOString()
      };

      let result;
      if (editingRule) {
        // Update existing rule
        const { data, error } = await supabase
          .from('redemption_rules')
          .update(ruleData)
          .eq('id', editingRule.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Smart creation logic based on redemption type
        if (formData.redemption_type === 'standard') {
          // For standard redemptions: Check if rule exists, then UPDATE or INSERT
          const existingStandardRule = rules.find(r => r.redemption_type === 'standard');
          
          if (existingStandardRule) {
            // Update existing standard rule
            const { data, error } = await supabase
              .from('redemption_rules')
              .update(ruleData)
              .eq('id', existingStandardRule.id)
              .select()
              .single();

            if (error) throw error;
            result = data;
          } else {
            // Insert new standard rule
            const { data, error } = await supabase
              .from('redemption_rules')
              .insert(ruleData)
              .select()
              .single();

            if (error) throw error;
            result = data;
          }
        } else {
          // For interval redemptions: Always allow new rule creation (INSERT)
          const { data, error } = await supabase
            .from('redemption_rules')
            .insert(ruleData)
            .select()
            .single();

          if (error) throw error;
          result = data;
        }
      }

      // Reload the enhanced rules to get updated information
      await loadEnhancedRedemptionRules();

      // Reset form and editing state
      onEditRule(null);
      setFormData({
        redemption_type: 'standard',
        is_redemption_open: false,
        open_after_date: '',
        allow_continuous_redemption: false,
        max_redemption_percentage: 100,
        lock_up_period: 90,
        require_multi_sig_approval: true,
        required_approvers: 2,
        selected_window_id: '',
        approval_config_id: defaultConfigId || ''
      });

      const getSuccessMessage = () => {
        if (editingRule) return 'updated';
        if (formData.redemption_type === 'standard') {
          const existingStandardRule = rules.find(r => r.redemption_type === 'standard');
          return existingStandardRule ? 'updated' : 'created';
        }
        return 'created'; // Interval rules are always created
      };

      toast({
        title: "Success",
        description: `Redemption rule ${getSuccessMessage()} successfully.`,
      });

    } catch (error) {
      console.error('Error saving rule:', error);
      toast({
        title: "Error",
        description: "Failed to save redemption rule. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadEnhancedRedemptionRules = async () => {
    try {
      let { data, error } = await supabase
        .from('redemption_rules')
        .select(`
          *,
          projects!inner(name, project_type, target_raise)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        const { data: basicData, error: basicError } = await supabase
          .from('redemption_rules')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (basicError) throw basicError;
        data = basicData;
      }

      const mappedRules: EnhancedRedemptionRule[] = (data || []).map(row => ({
        id: row.id,
        project_id: row.project_id,
        redemption_type: row.redemption_type,
        is_redemption_open: row.is_redemption_open ?? false,
        open_after_date: row.open_after_date,
        allow_continuous_redemption: row.allow_continuous_redemption ?? false,
        max_redemption_percentage: row.max_redemption_percentage ? Number(row.max_redemption_percentage) : undefined,
        lock_up_period: row.lock_up_period,
        require_multi_sig_approval: row.require_multi_sig_approval ?? false,
        required_approvers: row.required_approvers || 2,
        created_at: row.created_at,
        updated_at: row.updated_at,
        
        // Approval configuration linking
        approval_config_id: row.approval_config_id,
        approval_config: row.approval_config_id ? 
          approvalConfigs.find(config => config.id === row.approval_config_id) : 
          undefined,
        
        project_name: row.projects?.name || 'Unknown Project',
        project_type: row.projects?.project_type || row.product_type,
        organization_id: row.organization_id,
        
        product_type: row.product_type,
        product_id: row.product_id,
        product_name: row.product_name || 'Product',
        product_status: row.product_status || 'Active',
        product_currency: row.product_currency || 'USD',
        product_details: row.product_details,
        
        target_raise_amount: row.target_raise_amount ? Number(row.target_raise_amount) : undefined,
        effective_target_raise: row.target_raise_amount ? Number(row.target_raise_amount) : undefined,
        total_redeemed_amount: 0,
        available_capacity: row.target_raise_amount && row.max_redemption_percentage ? 
          Number(row.target_raise_amount) * (Number(row.max_redemption_percentage) / 100) : 
          row.target_raise_amount ? Number(row.target_raise_amount) : undefined,
        capacity_percentage: 0,
        capacity_status: 'AVAILABLE',
        
        // Interval fund specific - map redemption_window_id from database
        redemption_window_id: row.redemption_window_id,
        selected_window_id: row.redemption_window_id
      }));

      onRuleUpdate(mappedRules);
    } catch (error) {
      console.error('Error reloading enhanced redemption rules:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('redemption_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      const updatedRules = rules.filter(rule => rule.id !== ruleId);
      onRuleUpdate(updatedRules);

      toast({
        title: "Success",
        description: "Redemption rule deleted successfully.",
      });

    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete redemption rule. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Rule Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {editingRule ? 'Edit Redemption Rule' : 'Create New Rule'}
          </CardTitle>
          {projectInfo && (
            <div className="text-sm text-gray-600">
              For {projectInfo.name} ({projectInfo.project_type?.replace(/_/g, ' ')})
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Redemption Type */}
          <div className="space-y-2">
            <Label>Redemption Type</Label>
            <select
              value={formData.redemption_type}
              onChange={(e) => {
                const newType = e.target.value;
                setFormData({...formData, redemption_type: newType});
                
                // For standard redemptions: Check if a rule already exists and auto-load it for editing
                // For interval redemptions: Allow multiple rules, so don't auto-populate
                if (newType === 'standard') {
                  const existingRule = rules.find(rule => rule.redemption_type === newType);
                  if (existingRule && !editingRule) {
                    // Auto-populate form with existing standard rule data
                    setFormData({
                      redemption_type: existingRule.redemption_type,
                      is_redemption_open: existingRule.is_redemption_open,
                      open_after_date: formatDateForInput(existingRule.open_after_date),
                      allow_continuous_redemption: existingRule.allow_continuous_redemption,
                      max_redemption_percentage: existingRule.max_redemption_percentage || 100,
                      lock_up_period: existingRule.lock_up_period || 90,
                      require_multi_sig_approval: existingRule.require_multi_sig_approval,
                      required_approvers: existingRule.required_approvers,
                      selected_window_id: existingRule.redemption_window_id || '',
                      approval_config_id: existingRule.approval_config_id || defaultConfigId || ''
                    });
                    // Set editing mode for standard rule
                    onEditRule(existingRule);
                  }
                } else if (newType === 'interval') {
                  // For interval redemptions, reset form for new rule creation
                  // Don't auto-populate since multiple interval rules are allowed
                  if (!editingRule) {
                    setFormData(prev => ({
                      ...prev,
                      redemption_type: newType,
                      selected_window_id: '',
                      // Keep other settings for user convenience
                    }));
                  }
                }
              }}
              className="w-full p-2 border rounded-md"
            >
              <option value="standard">Standard Redemption</option>
              <option value="interval">Interval Fund</option>
            </select>
            
            {/* Show indicator for standard redemptions if rule exists */}
            {!editingRule && formData.redemption_type === 'standard' && rules.find(rule => rule.redemption_type === 'standard') && (
              <Alert className="mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  A standard redemption rule already exists for this project. 
                  Your changes will update the existing rule.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Show info for interval redemptions */}
            {!editingRule && formData.redemption_type === 'interval' && (
              <Alert className="mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You can create multiple interval redemption rules for different windows or conditions.
                  {rules.filter(rule => rule.redemption_type === 'interval').length > 0 && (
                    <span className="ml-1">
                      ({rules.filter(rule => rule.redemption_type === 'interval').length} existing interval rules)
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Interval Fund Window Selection */}
          {formData.redemption_type === 'interval' && (
            <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <Label className="font-medium">Redemption Window Selection</Label>
              </div>
              
              {availableWindows.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <Label>Available Windows</Label>
                    <Select 
                      value={formData.selected_window_id} 
                      onValueChange={(value) => setFormData({...formData, selected_window_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a redemption window" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableWindows.map((window) => (
                          <SelectItem key={window.id} value={window.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{window.name}</span>
                              <Badge variant={
                                window.status === 'upcoming' ? 'secondary' :
                                window.status === 'submission_open' ? 'default' :
                                window.status === 'completed' ? 'outline' : 'secondary'
                              } className="ml-2">
                                {window.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {formData.selected_window_id && (
                    <div className="bg-white/50 p-3 rounded border">
                      {(() => {
                        const selectedWindow = availableWindows.find(w => w.id === formData.selected_window_id);
                        if (!selectedWindow) return null;
                        
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-sm">Window Details</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-gray-500">Submission:</span>
                                <div className="font-medium">
                                  {selectedWindow.submission_start_date.toLocaleDateString()} - {selectedWindow.submission_end_date.toLocaleDateString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Processing:</span>
                                <div className="font-medium">
                                  {selectedWindow.start_date.toLocaleDateString()} - {selectedWindow.end_date.toLocaleDateString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Status:</span>
                                <div className="font-medium capitalize">{selectedWindow.status.replace('_', ' ')}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Requests:</span>
                                <div className="font-medium">{selectedWindow.total_requests}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No redemption windows available for this project. Create a redemption window first to enable interval fund redemptions.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Core Principle 1: Redemption Open */}
          <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <Label className="font-medium">Principle 1: Redemption Availability</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_redemption_open}
                onCheckedChange={(checked) => setFormData({...formData, is_redemption_open: checked})}
              />
              <Label>Allow Redemptions</Label>
            </div>
          </div>

          {/* Core Principle 2: Opening Mechanisms */}
          <div className="space-y-3 p-4 border rounded-lg bg-green-50">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <Label className="font-medium">Principle 2: Opening Mechanisms</Label>
            </div>
            
            <div className="space-y-2">
              <Label>Open After Date (Optional)</Label>
              <Input
                type="datetime-local"
                value={formData.open_after_date}
                onChange={(e) => setFormData({...formData, open_after_date: e.target.value})}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.allow_continuous_redemption}
                onCheckedChange={(checked) => setFormData({...formData, allow_continuous_redemption: checked})}
              />
              <Label>Allow Continuous Redemption</Label>
            </div>

          </div>

          {/* Core Principle 3: Distribution Limits */}
          <div className="space-y-3 p-4 border rounded-lg bg-orange-50">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <Label className="font-medium">Principle 3: Distribution Limits</Label>
            </div>
            
            <div className="space-y-2">
              <Label>Maximum Redemption Percentage (%)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.max_redemption_percentage}
                onChange={(e) => setFormData({...formData, max_redemption_percentage: Number(e.target.value)})}
              />
            </div>
          </div>

          {/* Additional Settings */}
          <Separator />
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lock-up Period (Days)</Label>
              <Input
                type="number"
                min="0"
                value={formData.lock_up_period}
                onChange={(e) => setFormData({...formData, lock_up_period: Number(e.target.value)})}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.require_multi_sig_approval}
                onCheckedChange={(checked) => setFormData({...formData, require_multi_sig_approval: checked})}
              />
              <Label>Require Multi-Signature Approval</Label>
            </div>

            {formData.require_multi_sig_approval && (
              <div className="space-y-2">
                <Label>Required Approvers</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.required_approvers}
                  onChange={(e) => setFormData({...formData, required_approvers: Number(e.target.value)})}
                />
              </div>
            )}

            {/* Approval Configuration Selection */}
            <div className="space-y-3 p-4 border rounded-lg bg-purple-50">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <Label className="font-medium">Approval Configuration</Label>
              </div>
              
              {approvalConfigs.length > 0 ? (
                <div className="space-y-2">
                  <Label>Select Approval Configuration</Label>
                  <Select 
                    value={formData.approval_config_id} 
                    onValueChange={(value) => setFormData({...formData, approval_config_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an approval configuration" />
                    </SelectTrigger>
                    <SelectContent>
                      {approvalConfigs.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <span>{config.configName}</span>
                              {defaultConfigId === config.id && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <span>{config.requiredApprovals}/{config.approverCount}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {formData.approval_config_id && (
                    <div className="bg-white/70 p-3 rounded border">
                      {(() => {
                        const selectedConfig = approvalConfigs.find(c => c.id === formData.approval_config_id);
                        if (!selectedConfig) return null;
                        
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-sm">Configuration Details</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-gray-500">Approvers:</span>
                                <div className="font-medium">{selectedConfig.approverCount}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Required:</span>
                                <div className="font-medium">{selectedConfig.requiredApprovals}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Consensus:</span>
                                <div className="font-medium capitalize">{selectedConfig.consensusType}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Status:</span>
                                <div className="font-medium">{selectedConfig.active ? 'Active' : 'Inactive'}</div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 mt-2">
                              <span className="text-gray-500">Description:</span> {selectedConfig.configDescription}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No approval configurations available. Create an approval configuration first to enable this feature.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            {editingRule && (
              <Button variant="outline" onClick={() => onEditRule(null)}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSaveRule}>
              <Save className="h-4 w-4 mr-2" />
              Save Rule
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Redemption Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map((rule) => (
              <RuleCard 
                key={rule.id} 
                rule={rule} 
                onEdit={() => onEditRule(rule)}
                onDelete={() => handleDeleteRule(rule.id)}
              />
            ))}
            {rules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No redemption rules configured yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Rule Card Component
const RuleCard: React.FC<{
  rule: EnhancedRedemptionRule;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ rule, onEdit, onDelete }) => {
  const [windowDetails, setWindowDetails] = React.useState<RedemptionWindow | null>(null);

  // Load window details if this is an interval redemption with a window ID
  React.useEffect(() => {
    const loadWindowDetails = async () => {
      if (rule.redemption_type === 'interval' && rule.redemption_window_id) {
        try {
          const { enhancedRedemptionService } = await import('../services/enhancedRedemptionService');
          const result = await enhancedRedemptionService.getRedemptionWindowById(rule.redemption_window_id);
          if (result.success && result.data) {
            setWindowDetails(result.data);
          }
        } catch (error) {
          console.error('Error loading window details:', error);
        }
      }
    };
    loadWindowDetails();
  }, [rule.redemption_window_id, rule.redemption_type]);

  const getCapacityStatusColor = (status?: string) => {
    switch (status) {
      case 'NO_LIMIT': return 'bg-blue-100 text-blue-800';
      case 'LOW_USAGE': return 'bg-green-100 text-green-800';
      case 'MODERATE_USAGE': return 'bg-yellow-100 text-yellow-800';
      case 'NEAR_CAPACITY': return 'bg-orange-100 text-orange-800';
      case 'FULLY_REDEEMED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-3 bg-white hover:shadow-sm transition-shadow">
      {/* Rule Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-medium">{rule.redemption_type.replace(/_/g, ' ').toUpperCase()}</div>
          <div className="flex gap-2">
            {rule.is_redemption_open ? (
              <Badge variant="default">Open</Badge>
            ) : (
              <Badge variant="secondary">Closed</Badge>
            )}
            {rule.allow_continuous_redemption && (
              <Badge variant="outline">Continuous</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Product Information */}
      {rule.product_name && (
        <div className="bg-gray-50 p-3 rounded border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <Building className="h-4 w-4 text-blue-600" />
            <div className="font-medium text-sm">Product Details</div>
          </div>
          <div className="text-sm space-y-1">
            <div><span className="font-medium">Name:</span> {rule.product_name}</div>
            {rule.product_status && (
              <div><span className="font-medium">Status:</span> {rule.product_status}</div>
            )}
            {rule.product_currency && (
              <div><span className="font-medium">Currency:</span> {rule.product_currency}</div>
            )}
            {rule.product_type && (
              <div><span className="font-medium">Type:</span> {rule.product_type.replace(/_/g, ' ')}</div>
            )}
          </div>
        </div>
      )}

      {/* Interval Fund Window Information */}
      {rule.redemption_type === 'interval' && (
        <div className="bg-indigo-50 p-3 rounded border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <div className="font-medium text-sm">Redemption Window</div>
          </div>
          {windowDetails ? (
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{windowDetails.name}</span>
                <Badge variant={
                  windowDetails.status === 'upcoming' ? 'secondary' :
                  windowDetails.status === 'submission_open' ? 'default' :
                  windowDetails.status === 'processing' ? 'default' :
                  windowDetails.status === 'completed' ? 'outline' : 'secondary'
                }>
                  {windowDetails.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Submission Period:</span>
                  <div className="font-medium">
                    {windowDetails.submission_start_date.toLocaleDateString()} - {windowDetails.submission_end_date.toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Processing Period:</span>
                  <div className="font-medium">
                    {windowDetails.start_date.toLocaleDateString()} - {windowDetails.end_date.toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Total Requests:</span>
                  <div className="font-medium">{windowDetails.total_requests}</div>
                </div>
                <div>
                  <span className="text-gray-500">Total Value:</span>
                  <div className="font-medium">${(windowDetails.total_request_value || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
          ) : rule.redemption_window_id ? (
            <div className="text-sm text-gray-600">
              <div>Window ID: {rule.redemption_window_id}</div>
              <div className="text-xs text-gray-500">Loading window details...</div>
            </div>
          ) : (
            <div className="text-sm text-amber-600">
              <div className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span>No redemption window selected</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                This interval fund rule needs a redemption window to function properly.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Target Raise & Capacity Information */}
      {rule.effective_target_raise && (
        <div className="bg-green-50 p-3 rounded border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-green-600" />
            <div className="font-medium text-sm">Redemption Capacity</div>
            {rule.capacity_status && (
              <Badge className={getCapacityStatusColor(rule.capacity_status)}>
                {rule.capacity_status.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-green-700">Target Raise</div>
              <div className="text-lg font-bold">${rule.effective_target_raise.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-medium text-orange-700">Available</div>
              <div className="text-lg font-bold">${(rule.available_capacity || 0).toLocaleString()}</div>
            </div>
          </div>
          {rule.capacity_percentage !== undefined && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Capacity Used</span>
                <span>{rule.capacity_percentage.toFixed(1)}%</span>
              </div>
              <Progress value={rule.capacity_percentage} className="h-2" />
            </div>
          )}
        </div>
      )}

      {/* Rule Settings */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {rule.max_redemption_percentage && (
          <div>
            <span className="font-medium">Max Redemption:</span>
            <Badge variant="outline" className="ml-2">
              {rule.max_redemption_percentage}%
            </Badge>
          </div>
        )}
        {rule.lock_up_period && (
          <div>
            <span className="font-medium">Lock-up:</span>
            <Badge variant="outline" className="ml-2">
              {rule.lock_up_period} days
            </Badge>
          </div>
        )}
        {rule.require_multi_sig_approval && (
          <div>
            <span className="font-medium">Multi-sig:</span>
            <Badge variant="outline" className="ml-2">
              {rule.required_approvers} approvers
            </Badge>
          </div>
        )}
        {rule.open_after_date && (
          <div>
            <span className="font-medium">Opens:</span>
            <div className="text-xs text-gray-600">
              {new Date(rule.open_after_date).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* Approval Configuration Information */}
      {rule.approval_config && (
        <div className="bg-purple-50 p-3 rounded border-l-4 border-l-purple-500">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <div className="font-medium text-sm">Approval Configuration</div>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{rule.approval_config.configName}</span>
              <Badge variant={rule.approval_config.active ? "default" : "secondary"}>
                {rule.approval_config.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="text-xs text-gray-600 mb-2">
              {rule.approval_config.configDescription}
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Total Approvers:</span>
                <div className="font-medium">{rule.approval_config.approverCount}</div>
              </div>
              <div>
                <span className="text-gray-500">Required:</span>
                <div className="font-medium">{rule.approval_config.requiredApprovals}</div>
              </div>
              <div>
                <span className="text-gray-500">Consensus:</span>
                <div className="font-medium capitalize">{rule.approval_config.consensusType}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Configuration ID Only (if no full config loaded) */}
      {rule.approval_config_id && !rule.approval_config && (
        <div className="bg-purple-50 p-3 rounded border-l-4 border-l-purple-500">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-purple-600" />
            <div className="font-medium text-sm">Approval Configuration</div>
          </div>
          <div className="text-sm text-gray-600">
            <div>Config ID: {rule.approval_config_id}</div>
            <div className="text-xs text-gray-500">Loading configuration details...</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Approval Configurations Table Component
interface ApprovalConfigurationsTableProps {
  configs: ApprovalConfig[];
  defaultConfigId: string | null;
  onSetDefault: (configId: string) => void;
  onEdit: () => void;
  onDelete: (config: ApprovalConfig) => void;
  onRefresh: () => void;
}

const ApprovalConfigurationsTable: React.FC<ApprovalConfigurationsTableProps> = ({
  configs,
  defaultConfigId,
  onSetDefault,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const { toast } = useToast();

  const handleSetAsDefault = async (config: ApprovalConfig) => {
    try {
      await onSetDefault(config.id);
      toast({
        title: "Success",
        description: `"${config.configName}" is now the default approval configuration.`,
      });
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  if (configs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-gray-500">
          <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h4 className="text-lg font-medium mb-2">No approval configurations</h4>
          <p className="text-sm mb-4">Create your first approval configuration to manage redemption approvals.</p>
          <Button onClick={onEdit} className="bg-[#0f172b] hover:bg-[#0f172b]/90">
            <Plus className="h-4 w-4 mr-2" />
            Create Configuration
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Approval Configurations</h3>
          <p className="text-sm text-gray-500">
            Manage approval workflows and set defaults for redemption requests
          </p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <Shield className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Configuration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approvers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consensus
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {configs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {config.configName}
                          </span>
                          {defaultConfigId === config.id && (
                            <Badge variant="default" className="bg-blue-100 text-blue-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate max-w-xs">
                          {config.configDescription}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {config.approverCount} approver{config.approverCount !== 1 ? 's' : ''}
                        </Badge>
                        <div className="text-sm text-gray-600">
                          {config.requiredApprovals} required
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="capitalize">
                        {config.consensusType}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={config.active ? "default" : "secondary"}>
                          {config.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="h-3 w-3" />
                        {new Date(config.updatedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {defaultConfigId !== config.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetAsDefault(config)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span className="sr-only">Set as default</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onEdit}
                          className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(config)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">{configs.length}</div>
                <p className="text-sm text-blue-700">Total Configurations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-900">
                  {configs.filter(c => c.active).length}
                </div>
                <p className="text-sm text-green-700">Active Configurations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Settings className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-900">
                  {Math.round(configs.reduce((sum, c) => sum + c.approverCount, 0) / Math.max(configs.length, 1))}
                </div>
                <p className="text-sm text-orange-700">Avg. Approvers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};



export default EnhancedRedemptionConfigurationDashboard;
