/**
 * Advanced Organization Assignment Filters Component
 * Provides advanced filtering and sorting for organization assignments
 */

import React, { useState } from 'react';
import { Filter, X, Search, SortAsc, SortDesc, Calendar, Building, Users } from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { DateRange } from 'react-day-picker';
import { Checkbox } from '@/components/ui/checkbox';

export interface AdvancedFilterOptions {
  // Text Search
  searchQuery?: string;
  searchFields?: ('userName' | 'userEmail' | 'organizationName' | 'roleName')[];
  
  // User Filters
  userIds?: string[];
  userStatuses?: string[];
  
  // Organization Filters
  organizationIds?: string[];
  organizationStatuses?: string[];
  organizationTypes?: string[];
  
  // Role Filters
  roleIds?: string[];
  roleNames?: string[];
  
  // Assignment Filters
  assignmentMode?: 'all' | 'multiple' | 'single' | 'none';
  hasAssignments?: boolean;
  assignmentCount?: {
    min?: number;
    max?: number;
  };
  
  // Date Filters
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  createdDateRange?: {
    from?: Date;
    to?: Date;
  };
  updatedDateRange?: {
    from?: Date;
    to?: Date;
  };
  
  // Sorting
  sortBy?: 'userName' | 'userEmail' | 'organizationName' | 'roleName' | 'assignmentCount' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  limit?: number;
}

interface AdvancedOrganizationFiltersProps {
  filters: AdvancedFilterOptions;
  onFiltersChange: (filters: AdvancedFilterOptions) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  availableUsers?: { id: string; name: string; email: string }[];
  availableOrganizations?: { id: string; name: string; status?: string; businessType?: string }[];
  availableRoles?: { id: string; name: string }[];
  loading?: boolean;
}

const AdvancedOrganizationFilters: React.FC<AdvancedOrganizationFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  availableUsers = [],
  availableOrganizations = [],
  availableRoles = [],
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['search']));

  const updateFilters = (updates: Partial<AdvancedFilterOptions>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.userIds?.length) count++;
    if (filters.organizationIds?.length) count++;
    if (filters.roleIds?.length) count++;
    if (filters.assignmentMode) count++;
    if (filters.dateRange?.from || filters.dateRange?.to) count++;
    if (filters.sortBy) count++;
    return count;
  };

  const clearFilters = () => {
    onClearFilters();
    setIsOpen(false);
  };

  const applyFilters = () => {
    onApplyFilters();
    setIsOpen(false);
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount} active
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Filter and sort organization assignments with advanced criteria
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                  {/* Search Section */}
                  <Collapsible 
                    open={expandedSections.has('search')} 
                    onOpenChange={() => toggleSection('search')}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        <span className="font-medium">Search</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Input
                          placeholder="Search users, organizations, roles..."
                          value={filters.searchQuery || ''}
                          onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Search in:</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { key: 'userName', label: 'User Name' },
                            { key: 'userEmail', label: 'User Email' },
                            { key: 'organizationName', label: 'Organization' },
                            { key: 'roleName', label: 'Role' }
                          ].map(field => (
                            <label key={field.key} className="flex items-center space-x-2 text-sm">
                              <Checkbox
                                checked={filters.searchFields?.includes(field.key as any) ?? true}
                                onCheckedChange={(checked) => {
                                  const current = filters.searchFields || ['userName', 'userEmail', 'organizationName', 'roleName'];
                                  if (checked) {
                                    updateFilters({ 
                                      searchFields: [...new Set([...current, field.key as any])] 
                                    });
                                  } else {
                                    updateFilters({ 
                                      searchFields: current.filter(f => f !== field.key) 
                                    });
                                  }
                                }}
                              />
                              <span>{field.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Users Section */}
                  <Collapsible 
                    open={expandedSections.has('users')} 
                    onOpenChange={() => toggleSection('users')}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Users</span>
                        {filters.userIds?.length && (
                          <Badge variant="secondary" className="text-xs">
                            {filters.userIds.length}
                          </Badge>
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Select Users:</Label>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {availableUsers.map(user => (
                            <label key={user.id} className="flex items-center space-x-2 text-sm">
                              <Checkbox
                                checked={filters.userIds?.includes(user.id) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = filters.userIds || [];
                                  if (checked) {
                                    updateFilters({ userIds: [...current, user.id] });
                                  } else {
                                    updateFilters({ userIds: current.filter(id => id !== user.id) });
                                  }
                                }}
                              />
                              <span>{user.name}</span>
                              <span className="text-xs text-muted-foreground">({user.email})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Organizations Section */}
                  <Collapsible 
                    open={expandedSections.has('organizations')} 
                    onOpenChange={() => toggleSection('organizations')}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">Organizations</span>
                        {filters.organizationIds?.length && (
                          <Badge variant="secondary" className="text-xs">
                            {filters.organizationIds.length}
                          </Badge>
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Organization Status:</Label>
                        <Select 
                          value={filters.organizationStatuses?.[0] || ''} 
                          onValueChange={(value) => updateFilters({ organizationStatuses: value ? [value] : [] })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Any status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any-status">Any status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Select Organizations:</Label>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {availableOrganizations.map(org => (
                            <label key={org.id} className="flex items-center space-x-2 text-sm">
                              <Checkbox
                                checked={filters.organizationIds?.includes(org.id) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = filters.organizationIds || [];
                                  if (checked) {
                                    updateFilters({ organizationIds: [...current, org.id] });
                                  } else {
                                    updateFilters({ organizationIds: current.filter(id => id !== org.id) });
                                  }
                                }}
                              />
                              <span>{org.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Assignment Filters Section */}
                  <Collapsible 
                    open={expandedSections.has('assignments')} 
                    onOpenChange={() => toggleSection('assignments')}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <span className="font-medium">Assignments</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Assignment Mode:</Label>
                        <Select 
                          value={filters.assignmentMode || ''} 
                          onValueChange={(value) => updateFilters({ assignmentMode: value as any || undefined })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Any mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any-mode">Any mode</SelectItem>
                            <SelectItem value="all">All Organizations</SelectItem>
                            <SelectItem value="multiple">Multiple Organizations</SelectItem>
                            <SelectItem value="single">Single Organization</SelectItem>
                            <SelectItem value="none">No Assignments</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Assignment Count:</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Min"
                            type="number"
                            value={filters.assignmentCount?.min || ''}
                            onChange={(e) => updateFilters({ 
                              assignmentCount: { 
                                ...filters.assignmentCount, 
                                min: e.target.value ? parseInt(e.target.value) : undefined 
                              } 
                            })}
                            className="h-8"
                          />
                          <Input
                            placeholder="Max"
                            type="number"
                            value={filters.assignmentCount?.max || ''}
                            onChange={(e) => updateFilters({ 
                              assignmentCount: { 
                                ...filters.assignmentCount, 
                                max: e.target.value ? parseInt(e.target.value) : undefined 
                              } 
                            })}
                            className="h-8"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Date Filters Section */}
                  <Collapsible 
                    open={expandedSections.has('dates')} 
                    onOpenChange={() => toggleSection('dates')}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">Date Range</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Created Date:</Label>
                        <DatePickerWithRange 
                          dateRange={filters.createdDateRange as DateRange | undefined}
                          setDateRange={(range) => updateFilters({ createdDateRange: range })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Updated Date:</Label>
                        <DatePickerWithRange 
                          dateRange={filters.updatedDateRange as DateRange | undefined}
                          setDateRange={(range) => updateFilters({ updatedDateRange: range })}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Sorting Section */}
                  <Collapsible 
                    open={expandedSections.has('sorting')} 
                    onOpenChange={() => toggleSection('sorting')}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-muted rounded">
                      <div className="flex items-center gap-2">
                        {filters.sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
                        <span className="font-medium">Sorting</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Sort By:</Label>
                        <Select 
                          value={filters.sortBy || ''} 
                          onValueChange={(value) => updateFilters({ sortBy: value as any || undefined })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Default order" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="userName">User Name</SelectItem>
                            <SelectItem value="userEmail">User Email</SelectItem>
                            <SelectItem value="organizationName">Organization Name</SelectItem>
                            <SelectItem value="roleName">Role Name</SelectItem>
                            <SelectItem value="assignmentCount">Assignment Count</SelectItem>
                            <SelectItem value="createdAt">Created Date</SelectItem>
                            <SelectItem value="updatedAt">Updated Date</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Sort Order:</Label>
                        <Select 
                          value={filters.sortOrder || 'asc'} 
                          onValueChange={(value) => updateFilters({ sortOrder: value as any })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">Ascending</SelectItem>
                            <SelectItem value="desc">Descending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <div className="border-t p-4 flex gap-2">
                  <Button className="flex-1" onClick={applyFilters} disabled={loading}>
                    Apply Filters
                  </Button>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>

      {/* Quick Filter Bar */}
      {(filters.searchQuery || activeFilterCount > 0) && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {filters.searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Search className="h-3 w-3" />
                Search: {filters.searchQuery}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => updateFilters({ searchQuery: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.assignmentMode && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Mode: {filters.assignmentMode}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => updateFilters({ assignmentMode: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.sortBy && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Sort: {filters.sortBy} ({filters.sortOrder})
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => updateFilters({ sortBy: undefined, sortOrder: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AdvancedOrganizationFilters;
