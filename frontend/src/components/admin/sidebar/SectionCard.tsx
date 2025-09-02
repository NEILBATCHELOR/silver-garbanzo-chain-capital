// =====================================================
// SECTION CARD COMPONENT
// Individual section management component with drag-and-drop
// Created: August 28, 2025
// =====================================================

import React, { useState } from 'react';
import { 
  GripVertical, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp,
  Plus,
  Settings,
  Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type {
  AdminSidebarSection,
  AdminSidebarItem,
  SidebarAdminMetadata
} from '@/types/sidebar';
import { SectionItemCard } from './SectionItemCard';
import { ItemCreateDialog } from './ItemCreateDialog';

interface SectionCardProps {
  section: AdminSidebarSection;
  index: number;
  isSelected: boolean;
  metadata?: SidebarAdminMetadata;
  onSelect: () => void;
  onUpdate: (section: AdminSidebarSection) => void;
  onDelete: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onItemUpdate: (sectionId: string, itemId: string, item: AdminSidebarItem) => void;
  onItemAdd: (sectionId: string, item: AdminSidebarItem) => void;
  onItemDelete: (sectionId: string, itemId: string) => void;
  selectedItemId: string | null;
  onItemSelect: (itemId: string | null) => void;
  availableTemplates: any[];
}

export function SectionCard({
  section,
  index,
  isSelected,
  metadata,
  onSelect,
  onUpdate,
  onDelete,
  onReorder,
  onItemUpdate,
  onItemAdd,
  onItemDelete,
  selectedItemId,
  onItemSelect,
  availableTemplates
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [priorityValue, setPriorityValue] = useState(section.displayOrder.toString());

  const handleToggleActive = () => {
    onUpdate({ ...section, isActive: !section.isActive });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string for editing, but validate on blur
    setPriorityValue(value);
  };

  const handlePriorityBlur = () => {
    const numValue = parseInt(priorityValue);
    const validPriority = isNaN(numValue) ? section.displayOrder : Math.max(0, Math.min(100, numValue));
    
    setPriorityValue(validPriority.toString());
    setEditingPriority(false);
    
    // Update the section with new priority
    if (validPriority !== section.displayOrder) {
      onUpdate({ ...section, displayOrder: validPriority });
    }
  };

  const handlePriorityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.currentTarget as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setPriorityValue(section.displayOrder.toString());
      setEditingPriority(false);
    }
  };

  const handleDuplicate = () => {
    const duplicatedSection: AdminSidebarSection = {
      ...section,
      id: `section-${Date.now()}-copy`,
      sectionId: `${section.sectionId}-copy`,
      title: `${section.title} (Copy)`,
      items: section.items.map((item, index) => ({
        ...item,
        id: `item-${Date.now()}-${index}`,
        itemId: `${item.itemId}-copy`
      }))
    };
    // This would need to be passed as a prop if we want duplication functionality
    // onDuplicate(duplicatedSection);
  };

  const handleItemReorder = (fromIndex: number, toIndex: number) => {
    const items = [...section.items];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    
    const updatedItems = items.map((item, index) => ({
      ...item,
      displayOrder: index
    }));
    
    onUpdate({ ...section, items: updatedItems });
  };

  return (
    <Card 
      className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <button 
            className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
              // Drag and drop implementation would go here
              e.preventDefault();
            }}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Section Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h4 className="font-medium text-gray-900">{section.title}</h4>
                
                {/* Inline Priority Editor */}
                <div className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                  <Hash className="w-3 h-3 text-gray-500" />
                  {editingPriority ? (
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={priorityValue}
                      onChange={handlePriorityChange}
                      onBlur={handlePriorityBlur}
                      onKeyDown={handlePriorityKeyDown}
                      className="w-12 h-6 text-xs border-0 bg-white p-1 text-center"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPriority(true);
                      }}
                      className="text-xs font-mono hover:bg-white rounded px-1 py-0.5 min-w-8 text-center"
                      title="Click to edit priority (100 = top, 0 = bottom)"
                    >
                      {section.displayOrder}
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {!section.isActive && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}

                  <Badge variant="outline" className="text-xs">
                    {section.items?.length || 0} items
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                >
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive();
                  }}
                  className={section.isActive ? 'text-green-600' : 'text-gray-400'}
                >
                  {section.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowItemDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Section</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{section.title}"? 
                        This will also delete all {section.items.length} items in this section.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-red-600 hover:bg-red-700"
                        onClick={onDelete}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {section.description && (
              <p className="text-sm text-gray-600 mb-3">{section.description}</p>
            )}

            {/* Permissions and Roles */}
            {(section.requiredPermissions?.length > 0 || section.requiredRoleIds?.length > 0) && (
              <div className="flex flex-wrap gap-1 mb-3">
                {section.requiredPermissions?.map((permission) => (
                  <Badge key={permission} variant="secondary" className="text-xs">
                    {permission}
                  </Badge>
                ))}
                {section.requiredRoleIds?.map((roleId) => {
                  const role = metadata?.roles?.find(r => r.id === roleId);
                  return (
                    <Badge key={roleId} variant="outline" className="text-xs">
                      {role?.name || roleId}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Section Items */}
            {expanded && (
              <div className="space-y-2 mt-3 pl-4 border-l-2 border-gray-200">
                {(section.items?.length || 0) === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No items in this section</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowItemDialog(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Item
                    </Button>
                  </div>
                ) : (
                  (section.items || [])
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((item, itemIndex) => (
                      <SectionItemCard
                        key={item.id}
                        item={item}
                        index={itemIndex}
                        isSelected={selectedItemId === item.id}
                        metadata={metadata}
                        onSelect={() => onItemSelect(item.id)}
                        onUpdate={(updatedItem) => onItemUpdate(section.id, item.id, updatedItem)}
                        onDelete={() => onItemDelete(section.id, item.id)}
                        onReorder={handleItemReorder}
                      />
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Add Item Dialog */}
      <ItemCreateDialog
        open={showItemDialog}
        onOpenChange={setShowItemDialog}
        onItemAdd={(item) => onItemAdd(section.id, item)}
        sectionId={section.id}
        metadata={metadata}
        availableTemplates={availableTemplates}
      />
    </Card>
  );
}
