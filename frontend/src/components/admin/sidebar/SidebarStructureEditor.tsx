// =====================================================
// SIDEBAR STRUCTURE EDITOR COMPONENT
// Visual editor for configuring sidebar sections and items
// Created: August 28, 2025 - Comprehensive structure management
// =====================================================

import React, { useState, useCallback } from 'react';
import { 
  Plus, 
  GripVertical, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp,
  Settings,
  Library,
  Layout,
  Shield,
  Users,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  AdminSidebarData,
  AdminSidebarSection,
  AdminSidebarItem,
  SidebarAdminMetadata,
  ProfileTypeEnum
} from '@/types/sidebar';
import { SIDEBAR_CONFIGURATION } from '@/services/sidebar/sidebarMappings';
import { ADDITIONAL_SIDEBAR_SECTIONS } from '@/services/sidebar/additionalSidebarMappings';
import { SectionCard } from './SectionCard';
import { SectionPropertiesPanel, ItemPropertiesPanel } from './SidebarPropertiesPanels';
import { TemplateLibraryDialog, SidebarPreview } from './SidebarSupportingComponents';

interface SidebarStructureEditorProps {
  configurationData: AdminSidebarData;
  onChange: (configData: AdminSidebarData) => void;
  metadata?: SidebarAdminMetadata;
}

export function SidebarStructureEditor({
  configurationData,
  onChange,
  metadata
}: SidebarStructureEditorProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Combine all available sidebar templates
  const availableTemplates = [...SIDEBAR_CONFIGURATION, ...ADDITIONAL_SIDEBAR_SECTIONS];

  const handleSectionUpdate = useCallback((sectionId: string, updatedSection: AdminSidebarSection) => {
    const updatedSections = configurationData.sections.map(section =>
      section.id === sectionId ? updatedSection : section
    );
    
    // Auto-sort sections by displayOrder (priority) - 100 at top, 0 at bottom
    const sortedSections = updatedSections.sort((a, b) => b.displayOrder - a.displayOrder);
    
    onChange({ ...configurationData, sections: sortedSections });
  }, [configurationData, onChange]);

  const handleSectionAdd = useCallback((newSection: AdminSidebarSection) => {
    const updatedSections = [...configurationData.sections, newSection];
    
    // Auto-sort sections by displayOrder (priority) - 100 at top, 0 at bottom
    const sortedSections = updatedSections.sort((a, b) => b.displayOrder - a.displayOrder);
    
    onChange({ ...configurationData, sections: sortedSections });
  }, [configurationData, onChange]);

  const handleSectionDelete = useCallback((sectionId: string) => {
    const updatedSections = configurationData.sections.filter(section => section.id !== sectionId);
    onChange({ ...configurationData, sections: updatedSections });
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
  }, [configurationData, onChange, selectedSectionId]);

  const handleSectionReorder = useCallback((fromIndex: number, toIndex: number) => {
    const sections = [...configurationData.sections];
    const [moved] = sections.splice(fromIndex, 1);
    sections.splice(toIndex, 0, moved);
    
    // Update display order
    const updatedSections = sections.map((section, index) => ({
      ...section,
      displayOrder: index
    }));
    
    onChange({ ...configurationData, sections: updatedSections });
  }, [configurationData, onChange]);

  const handleItemUpdate = useCallback((sectionId: string, itemId: string, updatedItem: AdminSidebarItem) => {
    const updatedSections = configurationData.sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.map(item => item.id === itemId ? updatedItem : item)
        };
      }
      return section;
    });
    onChange({ ...configurationData, sections: updatedSections });
  }, [configurationData, onChange]);

  const handleItemAdd = useCallback((sectionId: string, newItem: AdminSidebarItem) => {
    const updatedSections = configurationData.sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: [...section.items, newItem]
        };
      }
      return section;
    });
    onChange({ ...configurationData, sections: updatedSections });
  }, [configurationData, onChange]);

  const handleItemDelete = useCallback((sectionId: string, itemId: string) => {
    const updatedSections = configurationData.sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.filter(item => item.id !== itemId)
        };
      }
      return section;
    });
    onChange({ ...configurationData, sections: updatedSections });
    if (selectedItemId === itemId) {
      setSelectedItemId(null);
    }
  }, [configurationData, onChange, selectedItemId]);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layout className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Sidebar Structure</h3>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLibrary(!showLibrary)}
          >
            <Library className="w-4 h-4 mr-2" />
            Template Library
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Structure Editor - Full Width */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sidebar Sections</CardTitle>
            <CardDescription>
              Sections are automatically ordered As added. 0 = top 100 = bottom of the sidebar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {configurationData.sections.length === 0 ? (
              <div className="text-center py-8">
                <Layout className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-4">No sections configured</p>
                <SectionCreateButton
                  onSectionAdd={handleSectionAdd}
                  metadata={metadata}
                  availableTemplates={availableTemplates}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Sorted by priority: 100 = top, 0 = bottom */}
                {configurationData.sections
                  .sort((a, b) => b.displayOrder - a.displayOrder)
                  .map((section, index) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    index={index}
                    isSelected={selectedSectionId === section.id}
                    metadata={metadata}
                    onSelect={() => setSelectedSectionId(section.id)}
                    onUpdate={(updatedSection) => handleSectionUpdate(section.id, updatedSection)}
                    onDelete={() => handleSectionDelete(section.id)}
                    onReorder={handleSectionReorder}
                    onItemUpdate={handleItemUpdate}
                    onItemAdd={handleItemAdd}
                    onItemDelete={handleItemDelete}
                    selectedItemId={selectedItemId}
                    onItemSelect={setSelectedItemId}
                    availableTemplates={availableTemplates}
                  />
                ))}
              </div>
            )}
            
            {configurationData.sections.length > 0 && (
              <div className="pt-4 border-t">
                <SectionCreateButton
                  onSectionAdd={handleSectionAdd}
                  metadata={metadata}
                  availableTemplates={availableTemplates}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Properties Panel - Full Width Below */}
        {(selectedSectionId || selectedItemId) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Properties</CardTitle>
              <CardDescription>
                {selectedSectionId ? 'Edit section properties' : 'Edit item properties'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedSectionId ? (
                <SectionPropertiesPanel
                  section={configurationData.sections.find(s => s.id === selectedSectionId)}
                  metadata={metadata}
                  onUpdate={(updatedSection) => handleSectionUpdate(selectedSectionId, updatedSection)}
                />
              ) : selectedItemId ? (() => {
                const foundItem = configurationData.sections
                  .flatMap(s => s.items)
                  .find(i => i.id === selectedItemId);
                const foundSectionId = configurationData.sections
                  .find(s => s.items.some(i => i.id === selectedItemId))?.id;
                
                return foundItem && foundSectionId ? (
                  <ItemPropertiesPanel
                    item={foundItem}
                    sectionId={foundSectionId}
                    metadata={metadata}
                    onUpdate={(updatedItem) => {
                      handleItemUpdate(foundSectionId, selectedItemId, updatedItem);
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    <p>Selected item not found</p>
                  </div>
                );
              })() : null}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Template Library Dialog */}
      {showLibrary && (
        <TemplateLibraryDialog
          availableTemplates={availableTemplates}
          onSectionAdd={handleSectionAdd}
          onClose={() => setShowLibrary(false)}
        />
      )}

      {/* Preview Panel */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sidebar Preview</CardTitle>
            <CardDescription>
              Preview of how the configured sidebar will appear
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SidebarPreview configurationData={configurationData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Supporting Components
interface SectionCreateButtonProps {
  onSectionAdd: (section: AdminSidebarSection) => void;
  metadata?: SidebarAdminMetadata;
  availableTemplates: any[];
}

function SectionCreateButton({ onSectionAdd, metadata, availableTemplates }: SectionCreateButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  
  const createEmptySection = () => {
    const newSection: AdminSidebarSection = {
      id: `section-${Date.now()}`,
      sectionId: `section-${Date.now()}`,
      title: 'New Section',
      description: '',
      displayOrder: 0,
      requiredPermissions: [],
      requiredRoleIds: [],
      isActive: true,
      items: []
    };
    onSectionAdd(newSection);
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Section
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Create an empty section or choose from templates
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Button onClick={() => { createEmptySection(); setShowDialog(false); }} className="w-full">
              Create Empty Section
            </Button>
            
            <div className="text-center text-sm text-gray-500">or choose from template</div>
            
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {availableTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    onClick={() => {
                      const templateSection: AdminSidebarSection = {
                        id: `section-${Date.now()}-${template.id}`,
                        sectionId: template.id,
                        title: template.title,
                        description: template.title + ' section from template',
                        displayOrder: 0,
                        requiredPermissions: template.permissions || [],
                        requiredRoleIds: [],
                        minRolePriority: template.minRolePriority,
                        isActive: true,
                        items: template.items.map((item: any, index: number) => {
                          // Extract icon name from React component if it exists
                          const iconName = item.icon?.displayName || item.icon?.name || (typeof item.icon === 'function' ? item.icon.name : null) || 'Layout';
                          return {
                            id: `item-${Date.now()}-${item.id}`,
                            itemId: item.id,
                            sectionId: template.id,
                            label: item.label,
                            href: item.href,
                            icon: iconName,
                            iconName: iconName,
                            description: `${item.label} navigation item`,
                            displayOrder: index,
                            requiredPermissions: item.permissions || [],
                            requiredRoleIds: [],
                            minRolePriority: item.minRolePriority,
                            isVisible: true,
                            isActive: true
                          };
                        })
                      };
                      onSectionAdd(templateSection);
                      setShowDialog(false);
                    }}
                    className="w-full justify-start"
                  >
                    {template.title}
                    <Badge variant="outline" className="ml-auto">
                      {template.items?.length || 0} items
                    </Badge>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SidebarStructureEditor;
