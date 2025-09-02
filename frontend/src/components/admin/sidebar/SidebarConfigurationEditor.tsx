// =====================================================
// SIDEBAR CONFIGURATION EDITOR COMPONENT
// Form component for creating/editing sidebar configurations
// Updated: August 28, 2025 - Using UUID role IDs and profile type enums
// =====================================================

import React, { useState, useEffect } from 'react';
import { Plus, Minus, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/shared/use-toast';
import { useSidebarConfiguration, useConfigurationValidation } from '@/hooks/sidebar';
import type {
  AdminSidebarConfiguration,
  AdminSidebarData,
  AdminSidebarSection,
  AdminSidebarItem,
  SidebarConfigurationCreateRequest,
  SidebarConfigurationUpdateRequest,
  ProfileTypeEnum
} from '@/types/sidebar';
import { SIDEBAR_PROFILE_TYPES } from '@/types/sidebar';

interface SidebarConfigurationEditorProps {
  configuration?: AdminSidebarConfiguration;
  onSave: () => void;
  onCancel: () => void;
}

export function SidebarConfigurationEditor({
  configuration,
  onSave,
  onCancel
}: SidebarConfigurationEditorProps) {
  const { toast } = useToast();
  const isEditing = Boolean(configuration);
  
  const {
    metadata,
    loading: metadataLoading,
    create,
    update,
    validate: validateConfig
  } = useSidebarConfiguration(configuration?.id);

  const { validation, validating, validate, clearValidation } = useConfigurationValidation({
    validateOnChange: false
  });

  // Form state with updated field names
  const [formData, setFormData] = useState({
    name: configuration?.name || '',
    description: configuration?.description || '',
    targetRoleIds: configuration?.targetRoleIds || [],
    targetProfileTypeEnums: configuration?.targetProfileTypeEnums || [],
    minRolePriority: configuration?.minRolePriority || undefined,
    isDefault: configuration?.isDefault || false,
    isActive: configuration?.isActive ?? true,
    configurationData: configuration?.configurationData || {
      sections: []
    } as AdminSidebarData
  });

  const [saving, setSaving] = useState(false);

  // Update form data when configuration changes
  useEffect(() => {
    if (configuration) {
      setFormData({
        name: configuration.name,
        description: configuration.description || '',
        targetRoleIds: configuration.targetRoleIds,
        targetProfileTypeEnums: configuration.targetProfileTypeEnums,
        minRolePriority: configuration.minRolePriority,
        isDefault: configuration.isDefault,
        isActive: configuration.isActive,
        configurationData: configuration.configurationData
      });
    }
  }, [configuration]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    clearValidation();
  };

  const handleConfigDataChange = (configData: AdminSidebarData) => {
    setFormData(prev => ({
      ...prev,
      configurationData: configData
    }));
    clearValidation();
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const updatedRoleIds = checked
      ? [...formData.targetRoleIds, roleId]
      : formData.targetRoleIds.filter(id => id !== roleId);
    
    handleInputChange('targetRoleIds', updatedRoleIds);
  };

  const handleProfileTypeChange = (profileType: ProfileTypeEnum) => {
    handleInputChange('targetProfileTypeEnums', [profileType]);
  };

  const handleValidate = async () => {
    const configToValidate = isEditing
      ? formData as SidebarConfigurationUpdateRequest
      : formData as SidebarConfigurationCreateRequest;
    
    await validate(configToValidate);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate first
      const configToValidate = isEditing
        ? formData as SidebarConfigurationUpdateRequest
        : formData as SidebarConfigurationCreateRequest;
      
      const validationResult = await validate(configToValidate);
      
      if (!validationResult.isValid) {
        toast({
          title: 'Validation Failed',
          description: validationResult.errors[0]?.message || 'Please check the configuration',
          variant: 'destructive'
        });
        return;
      }

      if (isEditing) {
        await update(formData as SidebarConfigurationUpdateRequest);
        toast({
          title: 'Configuration Updated',
          description: `${formData.name} has been updated successfully`,
          variant: 'default'
        });
      } else {
        await create(formData as SidebarConfigurationCreateRequest);
        toast({
          title: 'Configuration Created',
          description: `${formData.name} has been created successfully`,
          variant: 'default'
        });
      }

      onSave();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
      toast({
        title: 'Save Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (metadataLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading configuration editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Validation Alerts */}
      {validation && !validation.isValid && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <div key={index}>• {error.message}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validation && validation.warnings.length > 0 && (
        <Alert>
          <AlertDescription>
            <div className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <div key={index}>⚠ {warning.message}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Configure the basic properties of the sidebar configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Configuration Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Admin Default Configuration"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minRolePriority">Minimum Role Priority</Label>
              <Input
                id="minRolePriority"
                type="number"
                min="10"
                max="100"
                value={formData.minRolePriority || ''}
                onChange={(e) => handleInputChange('minRolePriority', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g., 70"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe this sidebar configuration..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => handleInputChange('isDefault', checked)}
              />
              <Label htmlFor="isDefault">Set as Default</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Target Roles</CardTitle>
          <CardDescription>
            Select which roles this configuration applies to
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metadata?.roles.map((role) => (
              <div key={role.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={formData.targetRoleIds.includes(role.id)}
                  onCheckedChange={(checked) => handleRoleToggle(role.id, checked as boolean)}
                />
                <Label htmlFor={`role-${role.id}`} className="flex-1">
                  <div>
                    <div className="font-medium">{role.name}</div>
                    <div className="text-xs text-gray-500">Priority: {role.priority}</div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
          
          {formData.targetRoleIds.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Selected roles:</p>
              <div className="flex flex-wrap gap-2">
                {formData.targetRoleIds.map((roleId) => {
                  const role = metadata?.roles.find(r => r.id === roleId);
                  return (
                    <Badge key={roleId} variant="secondary">
                      {role?.name || roleId}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Profile Types */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Type</CardTitle>
          <CardDescription>
            Select the profile type this configuration applies to
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="profileType">Profile Type *</Label>
              <Select
                value={formData.targetProfileTypeEnums[0] || ''}
                onValueChange={(value) => handleProfileTypeChange(value as ProfileTypeEnum)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a profile type" />
                </SelectTrigger>
                <SelectContent>
                  {SIDEBAR_PROFILE_TYPES.map((profileType) => (
                    <SelectItem key={profileType.value} value={profileType.value}>
                      <div className="flex flex-col">
                        <div className="font-medium">{profileType.label}</div>
                        <div className="text-xs text-gray-500">{profileType.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {formData.targetProfileTypeEnums.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Selected profile type:</p>
                <Badge variant="outline">
                  {SIDEBAR_PROFILE_TYPES.find(pt => pt.value === formData.targetProfileTypeEnums[0])?.label || formData.targetProfileTypeEnums[0]}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sidebar Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Sidebar Sections & Items</CardTitle>
          <CardDescription>
            Configure the sidebar navigation structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SidebarStructureEditor
            configurationData={formData.configurationData}
            onChange={handleConfigDataChange}
            metadata={metadata}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleValidate}
          disabled={validating}
          title="Check configuration for errors: validates permissions, role mappings, URL structure, and data integrity"
        >
          {validating ? 'Validating...' : '🔍 Validate Configuration'}
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Update Configuration' : 'Create Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { SidebarStructureEditor } from './SidebarStructureEditor';
