// =====================================================
// SIDEBAR PROPERTIES PANELS
// Property editing panels for sections and items
// Updated: August 28, 2025 - Added icon picker support
// =====================================================

import React, { useState } from 'react';
import { Save, X, Shield, Users, Layout, ExternalLink, Settings, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconPicker, IconDisplay } from '@/components/ui/icon-picker';
import type {
  AdminSidebarSection,
  AdminSidebarItem,
  SidebarAdminMetadata
} from '@/types/sidebar';

// Section Properties Panel
interface SectionPropertiesPanelProps {
  section: AdminSidebarSection;
  metadata?: SidebarAdminMetadata;
  onUpdate: (section: AdminSidebarSection) => void;
}

export function SectionPropertiesPanel({
  section,
  metadata,
  onUpdate
}: SectionPropertiesPanelProps) {
  // Provide default values to prevent undefined errors
  const defaultSection: AdminSidebarSection = {
    id: '',
    sectionId: '',
    title: '',
    description: '',
    displayOrder: 0,
    isActive: true,
    items: [],
    requiredPermissions: [],
    requiredRoleIds: []
  };

  const [formData, setFormData] = useState(section || defaultSection);

  // Update form data when section prop changes
  React.useEffect(() => {
    if (section) {
      setFormData(section);
    }
  }, [section]);

  // Early return if no valid section
  if (!section) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        <p>No section selected</p>
      </div>
    );
  }

  const handleInputChange = (field: keyof AdminSidebarSection, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionToggle = (permission: string, checked: boolean) => {
    const permissions = formData.requiredPermissions || [];
    const updated = checked
      ? [...permissions, permission]
      : permissions.filter(p => p !== permission);
    handleInputChange('requiredPermissions', updated);
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const roles = formData.requiredRoleIds || [];
    const updated = checked
      ? [...roles, roleId]
      : roles.filter(r => r !== roleId);
    handleInputChange('requiredRoleIds', updated);
  };

  const handleSave = () => {
    onUpdate(formData);
  };

  const handleReset = () => {
    setFormData(section);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(section);

  return (
    <ScrollArea className="h-96">
      <div className="space-y-4 pr-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Layout className="w-4 h-4" />
          <h4 className="font-medium">Section Properties</h4>
        </div>

        {/* Basic Information */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="title">Section Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., DASHBOARD"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Section description..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayOrder">Order</Label>
            <Input
              id="displayOrder"
              type="number"
              min="0"
              value={formData.displayOrder}
              onChange={(e) => handleInputChange('displayOrder', parseInt(e.target.value) || 0)}
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

        <Separator />

        {/* Settings */}
        <div className="space-y-3">
          <Label>Section Settings</Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </div>

        <Separator />

        {/* Permissions */}
        {metadata?.permissions && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <Label>Required Permissions</Label>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {metadata.permissions.slice(0, 15).map((permission) => (
                <div key={permission.name} className="flex items-center space-x-2">
                  <Checkbox
                    id={`section-perm-${permission.name}`}
                    checked={formData.requiredPermissions?.includes(permission.name)}
                    onCheckedChange={(checked) => handlePermissionToggle(permission.name, checked as boolean)}
                  />
                  <Label htmlFor={`section-perm-${permission.name}`} className="text-xs flex-1">
                    {permission.name}
                  </Label>
                </div>
              ))}
            </div>
            
            {formData.requiredPermissions && formData.requiredPermissions.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {formData.requiredPermissions.map((permission) => (
                  <Badge key={permission} variant="secondary" className="text-xs">
                    {permission}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Roles */}
        {metadata?.roles && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <Label>Required Roles</Label>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {metadata.roles.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`section-role-${role.id}`}
                    checked={formData.requiredRoleIds?.includes(role.id)}
                    onCheckedChange={(checked) => handleRoleToggle(role.id, checked as boolean)}
                  />
                  <Label htmlFor={`section-role-${role.id}`} className="text-xs flex-1">
                    {role.name} (Priority: {role.priority})
                  </Label>
                </div>
              ))}
            </div>
            
            {formData.requiredRoleIds && formData.requiredRoleIds.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {formData.requiredRoleIds.map((roleId) => {
                  const role = metadata.roles.find(r => r.id === roleId);
                  return (
                    <Badge key={roleId} variant="outline" className="text-xs">
                      {role?.name || roleId}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <X className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
          <p><strong>Items:</strong> {section.items?.length || 0}</p>
          <p><strong>Active Items:</strong> {section.items?.filter(i => i.isActive).length || 0}</p>
          <p><strong>Visible Items:</strong> {section.items?.filter(i => i.isVisible).length || 0}</p>
        </div>
      </div>
    </ScrollArea>
  );
}

// Item Properties Panel
interface ItemPropertiesPanelProps {
  item: AdminSidebarItem;
  sectionId: string;
  metadata?: SidebarAdminMetadata;
  onUpdate: (item: AdminSidebarItem) => void;
}

export function ItemPropertiesPanel({
  item,
  sectionId,
  metadata,
  onUpdate
}: ItemPropertiesPanelProps) {
  // Provide default values to prevent undefined errors
  const defaultItem: AdminSidebarItem = {
    id: '',
    itemId: '',
    sectionId: sectionId || '',
    label: '',
    href: '',
    icon: 'Layout', // Default icon
    description: '',
    displayOrder: 0,
    isVisible: true,
    isActive: true,
    requiredPermissions: [],
    requiredRoleIds: []
  };

  const [formData, setFormData] = useState(item || defaultItem);

  // Update form data when item prop changes
  React.useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  // Early return if no valid item
  if (!item) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        <p>No item selected</p>
      </div>
    );
  }

  const handleInputChange = (field: keyof AdminSidebarItem, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionToggle = (permission: string, checked: boolean) => {
    const permissions = formData.requiredPermissions || [];
    const updated = checked
      ? [...permissions, permission]
      : permissions.filter(p => p !== permission);
    handleInputChange('requiredPermissions', updated);
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const roles = formData.requiredRoleIds || [];
    const updated = checked
      ? [...roles, roleId]
      : roles.filter(r => r !== roleId);
    handleInputChange('requiredRoleIds', updated);
  };

  const handleSave = () => {
    onUpdate(formData);
  };

  const handleReset = () => {
    setFormData(item);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(item);

  return (
    <ScrollArea className="h-96">
      <div className="space-y-4 pr-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <ExternalLink className="w-4 h-4" />
          <h4 className="font-medium">Item Properties</h4>
        </div>

        {/* Basic Information */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="label">Label *</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              placeholder="e.g., Dashboard"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="href">URL *</Label>
            <Input
              id="href"
              value={formData.href}
              onChange={(e) => handleInputChange('href', e.target.value)}
              placeholder="e.g., /dashboard"
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex items-center gap-2">
              <IconDisplay 
                iconName={formData.iconName || formData.icon || 'Layout'} 
                className="w-5 h-5" 
              />
              <IconPicker
                value={formData.iconName || formData.icon || 'Layout'}
                onChange={(iconName) => {
                  // Update both fields to ensure consistency
                  handleInputChange('iconName', iconName);
                  handleInputChange('icon', iconName);
                }}
                className="flex-1"
              >
                <Button variant="outline" className="w-full justify-start">
                  <Image className="w-4 h-4 mr-2" />
                  {formData.iconName || formData.icon || 'Select Icon'}
                </Button>
              </IconPicker>
            </div>
            <p className="text-xs text-gray-500">
              Choose from 1000+ Lucide React icons. Defaults to icons from the original sidebar.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Item description..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Order</Label>
              <Input
                id="displayOrder"
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={(e) => handleInputChange('displayOrder', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minRolePriority">Min Priority</Label>
              <Input
                id="minRolePriority"
                type="number"
                min="10"
                max="100"
                value={formData.minRolePriority || ''}
                onChange={(e) => handleInputChange('minRolePriority', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="70"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Settings */}
        <div className="space-y-3">
          <Label>Item Settings</Label>
          <div className="space-y-2">
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
                id="isVisible"
                checked={formData.isVisible}
                onCheckedChange={(checked) => handleInputChange('isVisible', checked)}
              />
              <Label htmlFor="isVisible">Visible</Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Permissions */}
        {metadata?.permissions && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <Label>Required Permissions</Label>
            </div>
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {metadata.permissions.slice(0, 10).map((permission) => (
                <div key={permission.name} className="flex items-center space-x-2">
                  <Checkbox
                    id={`item-perm-${permission.name}`}
                    checked={formData.requiredPermissions?.includes(permission.name)}
                    onCheckedChange={(checked) => handlePermissionToggle(permission.name, checked as boolean)}
                  />
                  <Label htmlFor={`item-perm-${permission.name}`} className="text-xs flex-1">
                    {permission.name}
                  </Label>
                </div>
              ))}
            </div>
            
            {formData.requiredPermissions && formData.requiredPermissions.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {formData.requiredPermissions.slice(0, 3).map((permission) => (
                  <Badge key={permission} variant="secondary" className="text-xs">
                    {permission}
                  </Badge>
                ))}
                {formData.requiredPermissions.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{formData.requiredPermissions.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <X className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>

        {/* Item Preview */}
        <div className="bg-gray-50 p-3 rounded space-y-3">
          <Label className="text-xs font-medium">Preview</Label>
          <div className="flex items-center gap-3 p-2 rounded bg-white border">
            <IconDisplay iconName={formData.iconName || formData.icon || 'Layout'} className="w-4 h-4" />
            <span className="text-sm">{formData.label || 'Item Label'}</span>
          </div>
          <div className="text-xs space-y-1">
            <p><strong>Status:</strong> {formData.isActive ? 'Active' : 'Inactive'}</p>
            <p><strong>Visibility:</strong> {formData.isVisible ? 'Visible' : 'Hidden'}</p>
            <p><strong>Permissions:</strong> {formData.requiredPermissions?.length || 0}</p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
