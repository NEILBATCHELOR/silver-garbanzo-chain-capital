// =====================================================
// SIDEBAR ADMIN CONFIGURATION COMPONENT
// Super Admin interface for managing dynamic sidebar configurations
// Updated: August 28, 2025 - Using UUID role IDs and profile type enums
// =====================================================

import React, { useState, useEffect } from 'react';
import { Plus, Settings, Eye, EyeOff, Edit, Trash2, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/shared/use-toast';
import { useSidebarConfigurations, useSidebarAdminMetadata } from '@/hooks/sidebar';
import { SidebarConfigurationEditor } from './SidebarConfigurationEditor';
import type { 
  AdminSidebarConfiguration, 
  SidebarConfigurationFilter,
  ProfileTypeEnum
} from '@/types/sidebar';

interface SidebarAdminDashboardProps {
  organizationId?: string;
}

export function SidebarAdminDashboard({ organizationId }: SidebarAdminDashboardProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<SidebarConfigurationFilter>({
    organizationId,
    isActive: undefined
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AdminSidebarConfiguration | null>(null);
  
  const {
    configurations,
    total,
    page,
    pageSize,
    loading,
    error,
    hasNextPage,
    hasPreviousPage,
    loadPage,
    nextPage,
    previousPage,
    refresh,
    setFilter: updateFilter
  } = useSidebarConfigurations({
    filter,
    pageSize: 10,
    autoRefresh: false
  });

  // Load role and profile metadata for display
  const { metadata, loading: metadataLoading } = useSidebarAdminMetadata();
  const [roleMap, setRoleMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (metadata?.roles) {
      const map = new Map(metadata.roles.map(role => [role.id, role.name]));
      setRoleMap(map);
    }
  }, [metadata]);

  // Helper function to get role name from ID
  const getRoleName = (roleId: string): string => {
    return roleMap.get(roleId) || roleId;
  };

  // Helper function to format profile type for display
  const formatProfileType = (profileType: ProfileTypeEnum): string => {
    return profileType.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Filter configurations based on search term
  const filteredConfigurations = configurations.filter(config => {
    const searchLower = searchTerm.toLowerCase();
    return (
      config.name.toLowerCase().includes(searchLower) ||
      config.description?.toLowerCase().includes(searchLower) ||
      config.targetRoleIds.some(roleId => getRoleName(roleId).toLowerCase().includes(searchLower)) ||
      config.targetProfileTypeEnums.some(type => formatProfileType(type).toLowerCase().includes(searchLower))
    );
  });

  const handleFilterChange = (newFilter: Partial<SidebarConfigurationFilter>) => {
    const updatedFilter = { ...filter, ...newFilter };
    setFilter(updatedFilter);
    updateFilter(updatedFilter);
  };

  const handleSelectConfig = (configId: string, checked: boolean) => {
    if (checked) {
      setSelectedConfigs(prev => [...prev, configId]);
    } else {
      setSelectedConfigs(prev => prev.filter(id => id !== configId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedConfigs(filteredConfigurations.map(config => config.id));
    } else {
      setSelectedConfigs([]);
    }
  };

  const handleDeleteConfig = async (configId: string, configName: string) => {
    try {
      const { sidebarAdminService } = await import('@/services/sidebar');
      await sidebarAdminService.deleteSidebarConfiguration(configId);
      toast({
        title: 'Configuration Deleted',
        description: `"${configName}" has been deleted successfully`,
        variant: 'default'
      });
      refresh();
      // Remove from selected if it was selected
      setSelectedConfigs(prev => prev.filter(id => id !== configId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete configuration';
      toast({
        title: 'Delete Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedConfigs.length === 0) return;
    
    try {
      const { sidebarAdminService } = await import('@/services/sidebar');
      
      // Delete all selected configurations
      const deletePromises = selectedConfigs.map(configId => 
        sidebarAdminService.deleteSidebarConfiguration(configId)
      );
      
      await Promise.all(deletePromises);
      
      toast({
        title: 'Configurations Deleted',
        description: `${selectedConfigs.length} configuration(s) deleted successfully`,
        variant: 'default'
      });
      
      setSelectedConfigs([]);
      refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete configurations';
      toast({
        title: 'Bulk Delete Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };



  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p className="font-semibold">Error loading sidebar configurations</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
              <Button onClick={refresh} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sidebar Configuration</h1>
          <p className="text-gray-500 mt-1">
            Manage dynamic sidebar layouts for different roles and profile types
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Configuration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Sidebar Configuration</DialogTitle>
                <DialogDescription>
                  Create a new sidebar configuration for specific roles and profile types
                </DialogDescription>
              </DialogHeader>
              <SidebarConfigurationEditor
                onSave={() => {
                  setShowCreateDialog(false);
                  refresh();
                }}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>



      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search configurations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <Select
                value={filter.isActive?.toString() || 'all'}
                onValueChange={(value) => handleFilterChange({
                  isActive: value === 'all' ? undefined : value === 'true'
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="true">Active Only</SelectItem>
                  <SelectItem value="false">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={filter.isDefault?.toString() || 'all'}
                onValueChange={(value) => handleFilterChange({
                  isDefault: value === 'all' ? undefined : value === 'true'
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Configurations</SelectItem>
                  <SelectItem value="true">Default Only</SelectItem>
                  <SelectItem value="false">Non-Default Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                setFilter({ organizationId, isActive: undefined });
                setSearchTerm('');
                updateFilter({ organizationId, isActive: undefined });
              }}>
                Clear Filters
              </Button>
              <Button variant="outline" size="sm" onClick={refresh}>
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedConfigs.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedConfigs.length} configuration(s) selected
              </span>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Configurations</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedConfigs.length} configuration(s)? 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sidebar Configurations</CardTitle>
          {total > 0 && (
            <CardDescription>
              {total} configuration{total !== 1 ? 's' : ''}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedConfigs.length === filteredConfigurations.length && filteredConfigurations.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Target Roles</TableHead>
                <TableHead>Profile Types</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3">Loading configurations...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredConfigurations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-gray-500">
                      <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No configurations found</p>
                      <p className="text-sm">Create your first sidebar configuration to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredConfigurations.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedConfigs.includes(config.id)}
                        onCheckedChange={(checked) => handleSelectConfig(config.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{config.name}</div>
                        {config.description && (
                          <div className="text-sm text-gray-500">{config.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {config.targetRoleIds.slice(0, 2).map((roleId) => (
                          <Badge key={roleId} variant="secondary" className="text-xs">
                            {getRoleName(roleId)}
                          </Badge>
                        ))}
                        {config.targetRoleIds.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{config.targetRoleIds.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {config.targetProfileTypeEnums.map((type) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {formatProfileType(type)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {config.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <Eye className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {config.isDefault && (
                        <Badge variant="default" className="bg-blue-100 text-blue-800">
                          Default
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(config.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingConfig(config)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{config.name}"? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDeleteConfig(config.id, config.name)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousPage}
                  disabled={!hasPreviousPage || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={!hasNextPage || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingConfig && (
        <Dialog open={true} onOpenChange={() => setEditingConfig(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Sidebar Configuration</DialogTitle>
              <DialogDescription>
                Modify the sidebar configuration for {editingConfig.name}
              </DialogDescription>
            </DialogHeader>
            <SidebarConfigurationEditor
              configuration={editingConfig}
              onSave={() => {
                setEditingConfig(null);
                refresh();
              }}
              onCancel={() => setEditingConfig(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
