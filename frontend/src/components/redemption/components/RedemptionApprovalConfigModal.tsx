import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle, Plus, Edit, Trash2, History, Eye, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { toast } from "../../ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { useAuth } from "@/hooks/auth";
import RedemptionApproverSelection from "./RedemptionApproverSelection";
import {
  ApprovalConfigService,
  type ApprovalConfig,
  type ApprovalConfigApprover,
  type ApprovalConfigHistory
} from "@/services/approval/approvalConfigService";

interface RedemptionApprover {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface RedemptionApprovalConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ViewMode = 'list' | 'create' | 'edit' | 'history';

const RedemptionApprovalConfigModal: React.FC<RedemptionApprovalConfigModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [existingConfigs, setExistingConfigs] = useState<ApprovalConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ApprovalConfig | null>(null);
  const [historyData, setHistoryData] = useState<ApprovalConfigHistory[]>([]);

  // Form state
  const [configName, setConfigName] = useState("New Redemption Approval Config");
  const [configDescription, setConfigDescription] = useState("Approval configuration for redemption requests");
  const [consensusType, setConsensusType] = useState("any");
  const [requiredApprovals, setRequiredApprovals] = useState(1);
  const [approvers, setApprovers] = useState<ApprovalConfigApprover[]>([]);
  
  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      loadExistingConfigs();
    } else {
      // Reset state when modal closes
      setViewMode('list');
      setSelectedConfig(null);
      resetForm();
    }
  }, [open]);

  const loadExistingConfigs = async () => {
    try {
      setLoading(true);
      const configs = await ApprovalConfigService.getApprovalConfigs('redemption_approval');
      setExistingConfigs(configs);

      // If no configs exist, go directly to create mode
      if (configs.length === 0) {
        setViewMode('create');
      }
    } catch (error) {
      console.error("Error loading approval configs:", error);
      toast({
        title: "Error",
        description: "Failed to load approval configurations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConfigHistory = async (configId: string) => {
    try {
      setLoading(true);
      const history = await ApprovalConfigService.getConfigHistory(configId);
      setHistoryData(history);
      setViewMode('history');
    } catch (error) {
      console.error("Error loading config history:", error);
      toast({
        title: "Error",
        description: "Failed to load configuration history.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setConfigName("New Redemption Approval Config");
    setConfigDescription("Approval configuration for redemption requests");
    setConsensusType("any");
    setRequiredApprovals(1);
    setApprovers([]);
    setErrors({});
  };

  const loadConfigForEdit = (config: ApprovalConfig) => {
    setSelectedConfig(config);
    setConfigName(config.configName);
    setConfigDescription(config.configDescription);
    setConsensusType(config.consensusType);
    setRequiredApprovals(config.requiredApprovals);
    setApprovers(config.approvers);
    setViewMode('edit');
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'configName') {
      setConfigName(value);
    } else if (name === 'configDescription') {
      setConfigDescription(value);
    }

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (field: string, value: string) => {
    if (field === 'consensusType') {
      setConsensusType(value);
    }

    // Clear error when user selects
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleApproversChange = (selectedApprovers: RedemptionApprover[]) => {
    const mappedApprovers: ApprovalConfigApprover[] = selectedApprovers.map((approver, index) => ({
      id: approver.id,
      name: approver.name,
      email: approver.email,
      role: approver.role,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${approver.name.substring(0, 2)}&backgroundColor=4F46E5`,
      approverType: 'user',
      isRequired: true,
      orderPriority: index
    }));
    
    setApprovers(mappedApprovers);

    // Clear error when approvers change
    if (errors.approvers) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.approvers;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!configName.trim()) {
      newErrors.configName = "Configuration name is required";
    }

    if (approvers.length === 0) {
      newErrors.approvers = "At least one approver must be selected";
    }

    if (requiredApprovals > approvers.length) {
      newErrors.requiredApprovals = "Required approvals cannot exceed the number of selected approvers";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !user?.id) {
      return;
    }

    setSubmitting(true);

    try {
      const configData: Partial<ApprovalConfig> = {
        configName,
        configDescription,
        approvalMode: 'user_specific',
        requiredApprovals,
        requiresAllApprovers: consensusType === 'all',
        consensusType: consensusType as 'all' | 'majority' | 'any',
        eligibleRoles: [],
        autoApprovalConditions: {},
        autoApproveThreshold: 0,
        active: true,
      };

      if (viewMode === 'create') {
        // Create new config
        await ApprovalConfigService.createApprovalConfig(
          configData,
          approvers,
          user.id,
          `Created new redemption approval configuration: ${configName}`
        );

        toast({
          title: "Success",
          description: `Redemption approval configuration "${configName}" has been created with ${approvers.length} approvers.`,
          duration: 5000,
        });
      } else if (viewMode === 'edit' && selectedConfig) {
        // Update existing config
        await ApprovalConfigService.updateApprovalConfig(
          selectedConfig.id,
          configData,
          approvers,
          user.id,
          `Updated redemption approval configuration: ${configName}`
        );

        toast({
          title: "Success",
          description: `Redemption approval configuration "${configName}" has been updated with ${approvers.length} approvers.`,
          duration: 5000,
        });
      }

      await loadExistingConfigs();
      setViewMode('list');
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving redemption approval config:", error);
      toast({
        title: "Error",
        description: "Failed to save redemption approval configuration.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (config: ApprovalConfig) => {
    if (!user?.id) return;

    if (!confirm(`Are you sure you want to delete "${config.configName}"?`)) {
      return;
    }

    try {
      await ApprovalConfigService.deleteApprovalConfig(
        config.id,
        user.id,
        `Deleted redemption approval configuration: ${config.configName}`
      );

      toast({
        title: "Success",
        description: `Configuration "${config.configName}" has been deleted.`,
      });

      await loadExistingConfigs();
    } catch (error) {
      console.error("Error deleting config:", error);
      toast({
        title: "Error",
        description: "Failed to delete configuration.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    resetForm();
  };

  const renderConfigurationList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Approval Configurations</h3>
          <p className="text-sm text-gray-500">Manage multiple approval workflows for redemption requests</p>
        </div>
        <Button onClick={() => setViewMode('create')} className="bg-[#0f172b] hover:bg-[#0f172b]/90">
          <Plus className="h-4 w-4 mr-2" />
          New Configuration
        </Button>
      </div>

      {existingConfigs.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h4 className="text-lg font-medium mb-2">No approval configurations</h4>
            <p className="text-sm">Create your first approval configuration to get started.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {existingConfigs.map((config) => (
            <Card key={config.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{config.configName}</h4>
                      <Badge variant={config.active ? "default" : "secondary"}>
                        {config.active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">
                        {config.approverCount} approver{config.approverCount !== 1 ? 's' : ''}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {config.consensusType} consensus
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{config.configDescription}</p>
                    <div className="text-xs text-gray-500">
                      Requires {config.requiredApprovals} approval{config.requiredApprovals !== 1 ? 's' : ''} • 
                      Updated {new Date(config.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadConfigHistory(config.id)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadConfigForEdit(config)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(config)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderConfigurationForm = () => (
    <div className="space-y-6 py-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {viewMode === 'create' ? 'Create New Configuration' : 'Edit Configuration'}
        </h3>
      </div>

      {/* Basic Configuration */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="configName" className="font-medium">Configuration Name</Label>
          <Input
            id="configName"
            name="configName"
            value={configName}
            onChange={handleInputChange}
            placeholder="Enter configuration name"
            className={errors.configName ? "border-red-500" : ""}
          />
          {errors.configName && (
            <p className="text-sm text-red-500">{errors.configName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="configDescription" className="font-medium">Description</Label>
          <Textarea
            id="configDescription"
            name="configDescription"
            value={configDescription}
            onChange={handleInputChange}
            placeholder="Describe this approval configuration"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="consensusType" className="font-medium">Consensus Type</Label>
            <Select value={consensusType} onValueChange={(value) => handleSelectChange('consensusType', value)}>
              <SelectTrigger className={errors.consensusType ? "border-red-500" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All approvers (unanimous)</SelectItem>
                <SelectItem value="majority">Majority of approvers</SelectItem>
                <SelectItem value="any">Any approver (first approval)</SelectItem>
              </SelectContent>
            </Select>
            {errors.consensusType && (
              <p className="text-sm text-red-500">{errors.consensusType}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="requiredApprovals" className="font-medium">Required Approvals</Label>
            <Input
              id="requiredApprovals"
              type="number"
              min="1"
              max={approvers.length || 1}
              value={requiredApprovals}
              onChange={(e) => setRequiredApprovals(parseInt(e.target.value) || 1)}
              className={errors.requiredApprovals ? "border-red-500" : ""}
            />
            {errors.requiredApprovals && (
              <p className="text-sm text-red-500">{errors.requiredApprovals}</p>
            )}
          </div>
        </div>
      </div>

      {/* Approver Selection */}
      <RedemptionApproverSelection
        selectedApprovers={approvers.map(a => ({
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role
        }))}
        onApproversChange={handleApproversChange}
        minApprovers={1}
        maxApprovers={10}
      />

      {errors.approvers && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{errors.approvers}</p>
        </div>
      )}
    </div>
  );

  const renderConfigurationHistory = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setViewMode('list')}>
          <X className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Configuration History</h3>
      </div>

      {historyData.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h4 className="text-lg font-medium mb-2">No history available</h4>
            <p className="text-sm">No changes have been recorded for this configuration.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {historyData.map((history) => (
            <Card key={history.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="capitalize">
                        {history.changeType.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(history.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {history.changeReason && (
                      <p className="text-sm text-gray-700 mb-2">{history.changeReason}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Changed by: {history.changedBy}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading configurations...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Configure Redemption Approvers
          </DialogTitle>
          <DialogDescription>
            Manage approval workflows for all redemption requests
          </DialogDescription>
        </DialogHeader>

        {viewMode === 'list' && renderConfigurationList()}
        {(viewMode === 'create' || viewMode === 'edit') && renderConfigurationForm()}
        {viewMode === 'history' && renderConfigurationHistory()}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <DialogFooter className="flex items-center justify-between">
            <Button variant="outline" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-[#0f172b] hover:bg-[#0f172b]/90"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {viewMode === 'create' ? 'Create Configuration' : 'Update Configuration'}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RedemptionApprovalConfigModal;
