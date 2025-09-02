// =====================================================
// SIDEBAR SUPPORTING COMPONENTS
// Template library and preview components
// Created: August 28, 2025
// =====================================================

import React, { useState } from 'react';
import { 
  Search, 
  Eye, 
  Plus, 
  Library, 
  Layout, 
  ExternalLink, 
  Shield,
  ChevronDown,
  ChevronRight,
  Home,
  Users,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type {
  AdminSidebarData,
  AdminSidebarSection
} from '@/types/sidebar';

// Template Library Dialog
interface TemplateLibraryDialogProps {
  availableTemplates: any[];
  onSectionAdd: (section: AdminSidebarSection) => void;
  onClose: () => void;
}

export function TemplateLibraryDialog({
  availableTemplates,
  onSectionAdd,
  onClose
}: TemplateLibraryDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [addedTemplates, setAddedTemplates] = useState<Set<string>>(new Set());
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

  const filteredTemplates = availableTemplates.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.items.some((item: any) => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleAddTemplate = (template: any) => {
    const templateSection: AdminSidebarSection = {
      id: `section-${Date.now()}-${template.id}`,
      sectionId: template.id,
      title: template.title,
      description: `${template.title} section from template`,
      displayOrder: 0,
      requiredPermissions: template.permissions || [],
      requiredRoleIds: [],
      minRolePriority: template.minRolePriority,
      isActive: true,
      items: template.items.map((item: any, index: number) => ({
      id: `item-${Date.now()}-${item.id}`,
      itemId: item.id,
      sectionId: template.id,
      label: item.label,
      href: item.href,
      icon: item.icon?.name || 'Layout',
      description: `${item.label} navigation item`,
      displayOrder: index,
      requiredPermissions: item.permissions || [],
      requiredRoleIds: [],
      minRolePriority: item.minRolePriority,
      isVisible: true,
      isActive: true
      }))
    };
    
    onSectionAdd(templateSection);
    
    // Track added templates and show feedback
    setAddedTemplates(prev => new Set([...prev, template.id]));
    setRecentlyAdded(template.id);
    
    // Clear recent feedback after 2 seconds
    setTimeout(() => setRecentlyAdded(null), 2000);
  };

  const handleClose = () => {
    setAddedTemplates(new Set());
    setRecentlyAdded(null);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="w-5 h-5" />
            Template Library
            {addedTemplates.size > 0 && (
              <Badge variant="secondary" className="ml-2">
                {addedTemplates.size} added
              </Badge>  
            )}
          </DialogTitle>
          <DialogDescription>
            Choose from predefined sidebar sections. You can add multiple sections before closing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Templates */}
          <ScrollArea className="h-96">
            <div className="space-y-3 pr-4">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Library className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No templates found</p>
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:bg-gray-50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{template.title}</CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-1">
                            <span>{template.items.length} items</span>
                            {template.minRolePriority && (
                              <Badge variant="outline" className="text-xs">
                                Min Priority: {template.minRolePriority}
                              </Badge>
                            )}
                          </CardDescription>
                        </div>
                        
                        <Button 
                          onClick={() => handleAddTemplate(template)}
                          size="sm"
                          disabled={addedTemplates.has(template.id)}
                          variant={addedTemplates.has(template.id) ? "secondary" : "default"}
                          className={recentlyAdded === template.id ? "animate-pulse bg-green-600 hover:bg-green-700" : ""}
                        >
                          {addedTemplates.has(template.id) ? (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Add Section
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {/* Permissions */}
                      {template.permissions?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-600 mb-1">Required Permissions:</p>
                          <div className="flex flex-wrap gap-1">
                            {template.permissions.slice(0, 3).map((permission: string) => (
                              <Badge key={permission} variant="secondary" className="text-xs">
                                <Shield className="w-2 h-2 mr-1" />
                                {permission}
                              </Badge>
                            ))}
                            {template.permissions.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.permissions.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Items Preview */}
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600 mb-2">Navigation Items:</p>
                        {template.items.slice(0, 4).map((item: any) => (
                          <div key={item.id} className="flex items-center gap-2 text-xs text-gray-700">
                            <Layout className="w-3 h-3" />
                            <span>{item.label}</span>
                            <span className="text-gray-400 font-mono">{item.href}</span>
                          </div>
                        ))}
                        {template.items.length > 4 && (
                          <div className="text-xs text-gray-500 pl-5">
                            +{template.items.length - 4} more items
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
          
          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {addedTemplates.size > 0 ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{addedTemplates.size} section{addedTemplates.size !== 1 ? 's' : ''} added to configuration</span>
                </>
              ) : (
                <>
                  <Library className="w-4 h-4" />
                  <span>Select templates to add sections</span>
                </>
              )}
            </div>
            
            <Button onClick={handleClose} variant="outline">
              Done ({addedTemplates.size} added)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Sidebar Preview Component
interface SidebarPreviewProps {
  configurationData: AdminSidebarData;
}

export function SidebarPreview({ configurationData }: SidebarPreviewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  if (!configurationData.sections || configurationData.sections.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Layout className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No sections configured</p>
        <p className="text-sm">Add sections to see the preview</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg max-w-64 mx-auto">
      {/* Preview Header */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">Chain Capital</p>
            <p className="text-xs text-gray-600">Sidebar Preview</p>
          </div>
        </div>
      </div>

      {/* Sidebar Sections */}
      <div className="p-2">
        {configurationData.sections
          .filter(section => section.isActive)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((section) => (
            <div key={section.id} className="mb-4">
              {/* Section Header */}
              <div className="flex items-center justify-between px-2 py-1">
                <h3 className="text-xs font-semibold text-gray-600 tracking-wide">
                  {section.title}
                </h3>
                {section.items.length > 0 && (
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              {/* Section Items */}
              {(expandedSections.has(section.id) || expandedSections.size === 0) && (
                <div className="space-y-0.5 mt-1">
                  {section.items
                    .filter(item => item.isActive && item.isVisible)
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer group"
                      >
                        <Layout className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  
                  {section.items.filter(item => item.isActive && item.isVisible).length === 0 && (
                    <div className="px-2 py-1 text-xs text-gray-500">
                      No visible items
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Preview Footer */}
      <div className="p-2 border-t bg-gray-50">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <Eye className="w-3 h-3" />
          <span>Preview Mode</span>
        </div>
      </div>
    </div>
  );
}
