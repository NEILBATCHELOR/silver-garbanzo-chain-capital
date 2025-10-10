// =====================================================
// ITEM CREATE DIALOG COMPONENT
// Dialog for creating new navigation items
// Created: August 28, 2025
// =====================================================

import React, { useState } from 'react';
import { Plus, Search, Layout, ExternalLink, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  AdminSidebarItem,
  SidebarAdminMetadata
} from '@/types/sidebar';

interface ItemCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemAdd: (item: AdminSidebarItem) => void;
  sectionId: string;
  metadata?: SidebarAdminMetadata;
  availableTemplates: any[];
}

export function ItemCreateDialog({
  open,
  onOpenChange,
  onItemAdd,
  sectionId,
  metadata,
  availableTemplates
}: ItemCreateDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<AdminSidebarItem>>({
    sectionId,
    label: '',
    href: '',
    icon: 'Layout',
    description: '',
    displayOrder: 0,
    requiredPermissions: [],
    requiredRoleIds: [],
    isVisible: true,
    isActive: true
  });

  // Get all available template items
  const templateItems = availableTemplates.flatMap(section => 
    section.items.map((item: any) => ({
      ...item,
      sectionTitle: section.title,
      sectionId: section.id
    }))
  );

  // Filter template items by search term
  const filteredTemplateItems = templateItems.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.href.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sectionTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const createCustomItem = () => {
    if (!formData.label || !formData.href) return;

    const newItem: AdminSidebarItem = {
      id: `item-${Date.now()}`,
      itemId: `custom-${Date.now()}`,
      sectionId,
      label: formData.label,
      href: formData.href,
      icon: formData.icon || 'Layout',
      description: formData.description || '',
      displayOrder: formData.displayOrder || 0,
      requiredPermissions: formData.requiredPermissions || [],
      requiredRoleIds: formData.requiredRoleIds || [],
      minRolePriority: formData.minRolePriority,
      isVisible: formData.isVisible ?? true,
      isActive: formData.isActive ?? true
    };

    onItemAdd(newItem);
    onOpenChange(false);
    resetForm();
  };

  const createFromTemplate = (templateItem: any) => {
    const newItem: AdminSidebarItem = {
      id: `item-${Date.now()}`,
      itemId: templateItem.id,
      sectionId,
      label: templateItem.label,
      href: templateItem.href,
      icon: templateItem.icon?.name || 'Layout',
      description: `${templateItem.label} from template`,
      displayOrder: 0,
      requiredPermissions: templateItem.permissions || [],
      requiredRoleIds: [],
      minRolePriority: templateItem.minRolePriority,
      isVisible: true,
      isActive: true
    };

    onItemAdd(newItem);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      sectionId,
      label: '',
      href: '',
      icon: 'Layout',
      description: '',
      displayOrder: 0,
      requiredPermissions: [],
      requiredRoleIds: [],
      isVisible: true,
      isActive: true
    });
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Navigation Item</DialogTitle>
          <DialogDescription>
            Create a custom item or choose from available templates
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="templates" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Template Library</TabsTrigger>
            <TabsTrigger value="custom">Custom Item</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search template items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Template Items */}
              <ScrollArea className="h-96">
                <div className="space-y-2 pr-4">
                  {filteredTemplateItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Layout className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No template items found</p>
                    </div>
                  ) : (
                    filteredTemplateItems.map((item, index) => (
                      <Card key={`${item.sectionId}-${item.id}-${index}`} className="hover:bg-gray-50 cursor-pointer">
                        <CardContent className="p-4" onClick={() => createFromTemplate(item)}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <Layout className="w-5 h-5 text-gray-600 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm">{item.label}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {item.sectionTitle}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center gap-1 mb-2">
                                  <ExternalLink className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-600 font-mono">
                                    {item.href}
                                  </span>
                                </div>

                                {item.permissions?.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.permissions.slice(0, 3).map((permission: string) => (
                                      <Badge key={permission} variant="secondary" className="text-xs">
                                        <Shield className="w-2 h-2 mr-1" />
                                        {permission}
                                      </Badge>
                                    ))}
                                    {item.permissions.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{item.permissions.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <Button size="sm" className="ml-2">
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-4 pr-4">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Description of this navigation item"
                    rows={2}
                  />
                </div>

                <Separator />

                {/* Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium">Item Settings</h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isVisible"
                        checked={formData.isVisible}
                        onCheckedChange={(checked) => handleInputChange('isVisible', checked)}
                      />
                      <Label htmlFor="isVisible">Visible by Default</Label>
                    </div>
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

                {/* Permissions */}
                {metadata?.permissions && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Required Permissions</h4>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {metadata.permissions.map((permission) => (
                        <div key={permission.name} className="flex items-center space-x-2">
                          <Checkbox
                            id={`perm-${permission.name}`}
                            checked={formData.requiredPermissions?.includes(permission.name)}
                            onCheckedChange={(checked) => handlePermissionToggle(permission.name, checked as boolean)}
                          />
                          <Label htmlFor={`perm-${permission.name}`} className="text-xs">
                            {permission.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={createCustomItem}
                    disabled={!formData.label || !formData.href}
                  >
                    Create Item
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
