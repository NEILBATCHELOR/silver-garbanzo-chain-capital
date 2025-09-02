// =====================================================
// ENHANCED SECTION ITEM CARD COMPONENT
// Individual navigation item management with icon picker integration
// Created: August 28, 2025
// Updated: Enhanced with IconPicker and IconDisplay integration
// =====================================================

import React, { useState } from 'react';
import { 
  GripVertical, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Shield,
  Users,
  Layout,
  Settings,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IconPicker, IconDisplay } from '@/components/ui/icon-picker';
import type {
  AdminSidebarItem,
  SidebarAdminMetadata
} from '@/types/sidebar';

interface SectionItemCardProps {
  item: AdminSidebarItem;
  index: number;
  isSelected: boolean;
  metadata?: SidebarAdminMetadata;
  onSelect: () => void;
  onUpdate: (item: AdminSidebarItem) => void;
  onDelete: () => void;
  onDuplicate?: (item: AdminSidebarItem) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export function SectionItemCard({
  item,
  index,
  isSelected,
  metadata,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onReorder
}: SectionItemCardProps) {
  const [showIconPicker, setShowIconPicker] = useState(false);

  const handleToggleVisible = () => {
    onUpdate({ ...item, isVisible: !item.isVisible });
  };

  const handleToggleActive = () => {
    onUpdate({ ...item, isActive: !item.isActive });
  };

  const handleIconChange = (iconName: string) => {
    // Update both fields to ensure consistency
    onUpdate({ 
      ...item, 
      iconName: iconName || undefined,
      icon: iconName || undefined
    });
    setShowIconPicker(false);
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      const duplicatedItem: AdminSidebarItem = {
        ...item,
        id: `item-${Date.now()}-copy`,
        itemId: `${item.itemId}-copy`,
        label: `${item.label} (Copy)`
      };
      onDuplicate(duplicatedItem);
    }
  };

  // Get status badge color and text
  const getStatusInfo = () => {
    if (!item.isActive) return { variant: 'secondary' as const, text: 'Inactive' };
    if (!item.isVisible) return { variant: 'outline' as const, text: 'Hidden' };
    return null;
  };

  const statusInfo = getStatusInfo();

  return (
    <Card 
      className={`transition-all border-l-4 cursor-pointer hover:shadow-md ${
        isSelected 
          ? 'border-l-blue-500 bg-blue-50 ring-1 ring-blue-200 shadow-sm' 
          : item.isActive 
            ? 'border-l-green-500 hover:bg-gray-50' 
            : 'border-l-gray-300 bg-gray-50 hover:bg-gray-100'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <button 
            className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
            onMouseDown={(e) => {
              // Drag and drop implementation would go here
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            title="Drag to reorder"
          >
            <GripVertical className="w-3 h-3" />
          </button>

          {/* Item Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1">
                {/* Icon with Picker */}
                <Popover open={showIconPicker} onOpenChange={setShowIconPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 mt-0.5 hover:bg-blue-100 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowIconPicker(true);
                      }}
                      title={`Change icon${item.iconName ? ` (${item.iconName})` : ''}`}
                    >
                      <IconDisplay 
                        iconName={item.iconName || 'Layout'} 
                        className="w-4 h-4 text-gray-600" 
                        fallback={<Layout className="w-4 h-4 text-gray-600" />}
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0" 
                    align="start"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-3">
                      <IconPicker
                        value={item.iconName || ''}
                        onChange={handleIconChange}
                        placeholder="Choose Icon"
                      >
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Choose Icon
                        </Button>
                      </IconPicker>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium text-sm text-gray-900 truncate">
                      {item.label}
                    </h5>
                    
                    {statusInfo && (
                      <Badge variant={statusInfo.variant} className="text-xs flex-shrink-0">
                        {statusInfo.text}
                      </Badge>
                    )}
                  </div>

                  {/* URL */}
                  <div className="flex items-center gap-1 mb-2">
                    <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-600 font-mono truncate">
                      {item.href}
                    </span>
                  </div>

                  {/* Permissions and Roles */}
                  {(item.requiredPermissions?.length > 0 || item.requiredRoleIds?.length > 0 || item.minRolePriority) && (
                    <div className="flex flex-wrap gap-1">
                      {/* Permissions */}
                      {item.requiredPermissions?.slice(0, 2).map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          <Shield className="w-2 h-2 mr-1" />
                          {permission}
                        </Badge>
                      ))}
                      {item.requiredPermissions && item.requiredPermissions.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.requiredPermissions.length - 2} more
                        </Badge>
                      )}
                      
                      {/* Roles */}
                      {item.requiredRoleIds?.slice(0, 1).map((roleId) => {
                        const role = metadata?.roles?.find(r => r.id === roleId);
                        return (
                          <Badge key={roleId} variant="outline" className="text-xs">
                            <Users className="w-2 h-2 mr-1" />
                            {role?.name || roleId}
                          </Badge>
                        );
                      })}
                      {item.requiredRoleIds && item.requiredRoleIds.length > 1 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.requiredRoleIds.length - 1} roles
                        </Badge>
                      )}

                      {/* Min Role Priority */}
                      {item.minRolePriority && (
                        <Badge variant="outline" className="text-xs">
                          Priority {item.minRolePriority}+
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* Visibility Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleVisible();
                  }}
                  className={`h-7 w-7 p-0 ${item.isVisible ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
                  title={item.isVisible ? 'Hide item' : 'Show item'}
                >
                  {item.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>

                {/* Active Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive();
                  }}
                  className={`h-7 w-7 p-0 ${item.isActive ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                  title={item.isActive ? 'Deactivate item' : 'Activate item'}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>

                {/* Duplicate */}
                {onDuplicate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate();
                    }}
                    className="h-7 w-7 p-0 text-gray-600 hover:text-gray-800"
                    title="Duplicate item"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                )}

                {/* Delete */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                      onClick={(e) => e.stopPropagation()}
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Item</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{item.label}"? 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-red-600 hover:bg-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced Section Item Card with additional features
interface EnhancedSectionItemCardProps extends SectionItemCardProps {
  showAdvancedInfo?: boolean;
  allowInlineEdit?: boolean;
}

export function EnhancedSectionItemCard({
  showAdvancedInfo = false,
  allowInlineEdit = false,
  ...props
}: EnhancedSectionItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  // This could be expanded to include inline editing capabilities
  return (
    <SectionItemCard {...props} />
  );
}
