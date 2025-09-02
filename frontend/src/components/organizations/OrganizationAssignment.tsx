/**
 * Organization Assignment Component
 * Provides UI for assigning organizations to users in three modes:
 * 1. All organizations (select all)
 * 2. Multiple organizations (multi-select with search)
 * 3. Single organization (dropdown selection)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Building, CheckCircle, Users, Filter } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';

// Services and Types
import OrganizationAssignmentService from './organizationAssignmentService';
import type { Organization, OrganizationAssignmentRequest } from './types';

interface OrganizationAssignmentProps {
  userId: string;
  roleId: string;
  roleName?: string;
  userName?: string;
  onAssignmentChange?: (summary: {
    mode: 'all' | 'multiple' | 'single' | 'none';
    organizationIds: string[];
    organizationCount: number;
  }) => void;
  compact?: boolean;
}

const OrganizationAssignment: React.FC<OrganizationAssignmentProps> = ({
  userId,
  roleId,
  roleName = 'Role',
  userName = 'User',
  onAssignmentChange,
  compact = false
}) => {
  const { toast } = useToast();

  // State management
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedMode, setSelectedMode] = useState<'all' | 'multiple' | 'single'>('single');
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOrganizations, setFilteredOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<{
    mode: 'all' | 'multiple' | 'single' | 'none';
    organizationIds: string[];
    organizationCount: number;
    totalOrganizations: number;
  } | null>(null);

  // Load organizations and current assignments on mount
  useEffect(() => {
    loadOrganizations();
    loadCurrentAssignments();
  }, [userId, roleId]);

  // Filter organizations based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredOrganizations(organizations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = organizations.filter(org => 
        org.name.toLowerCase().includes(query) ||
        org.legalName?.toLowerCase().includes(query) ||
        org.businessType?.toLowerCase().includes(query)
      );
      setFilteredOrganizations(filtered);
    }
  }, [organizations, searchQuery]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await OrganizationAssignmentService.getOrganizations();
      setOrganizations(data);
      setFilteredOrganizations(data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organizations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentAssignments = async () => {
    try {
      const summary = await OrganizationAssignmentService.getOrganizationAssignmentSummary(userId, roleId);
      setCurrentSummary(summary);
      setSelectedMode(summary.mode === 'none' ? 'single' : summary.mode);
      setSelectedOrganizationIds(summary.organizationIds);
      
      onAssignmentChange?.({
        mode: summary.mode,
        organizationIds: summary.organizationIds,
        organizationCount: summary.organizationCount
      });
    } catch (error) {
      console.error('Failed to load current assignments:', error);
    }
  };

  const handleModeChange = (mode: 'all' | 'multiple' | 'single') => {
    setSelectedMode(mode);
    
    if (mode === 'all') {
      // Select all organizations
      setSelectedOrganizationIds(organizations.map(org => org.id));
    } else if (mode === 'single') {
      // Keep only first selected organization
      setSelectedOrganizationIds(selectedOrganizationIds.slice(0, 1));
    }
    // For multiple, keep current selection
  };

  const handleOrganizationToggle = (organizationId: string, checked: boolean) => {
    if (selectedMode === 'single') {
      setSelectedOrganizationIds(checked ? [organizationId] : []);
    } else {
      setSelectedOrganizationIds(prev => 
        checked 
          ? [...prev, organizationId]
          : prev.filter(id => id !== organizationId)
      );
    }
  };

  const handleSelectAllToggle = (checked: boolean) => {
    if (checked) {
      setSelectedOrganizationIds(organizations.map(org => org.id));
    } else {
      setSelectedOrganizationIds([]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const request: OrganizationAssignmentRequest = {
        userId,
        roleId,
        mode: selectedMode,
        organizationIds: selectedOrganizationIds
      };

      await OrganizationAssignmentService.assignOrganizationsToUser(request);

      // Reload current assignments to reflect changes
      await loadCurrentAssignments();

      toast({
        title: 'Success',
        description: `Organization assignments updated for ${userName}`,
      });
    } catch (error) {
      console.error('Failed to save organization assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to save organization assignments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getSelectedOrganizations = () => {
    return organizations.filter(org => selectedOrganizationIds.includes(org.id));
  };

  const formatBusinessType = (type: string | null | undefined) => {
    if (!type) return '';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <Card className={compact ? "w-full" : ""}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Building className="h-6 w-6 animate-pulse mr-2" />
            <span>Loading organizations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? "w-full" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Organization Assignment
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Assign organizations to <strong>{userName}</strong> for the <strong>{roleName}</strong> role
        </div>
        {currentSummary && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">
              Current: {currentSummary.mode === 'none' ? 'No assignments' : 
                       currentSummary.mode === 'all' ? 'All organizations' :
                       `${currentSummary.organizationCount} organization${currentSummary.organizationCount !== 1 ? 's' : ''}`}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assignment Mode Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Assignment Mode</Label>
          <RadioGroup
            value={selectedMode}
            onValueChange={(value) => handleModeChange(value as 'all' | 'multiple' | 'single')}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="mode-all" />
              <Label htmlFor="mode-all" className="cursor-pointer">
                All Organizations
                <span className="text-sm text-muted-foreground ml-2">
                  ({organizations.length} total)
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="multiple" id="mode-multiple" />
              <Label htmlFor="mode-multiple" className="cursor-pointer">
                Multiple Organizations
                <span className="text-sm text-muted-foreground ml-2">
                  (select specific organizations)
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="mode-single" />
              <Label htmlFor="mode-single" className="cursor-pointer">
                Single Organization
                <span className="text-sm text-muted-foreground ml-2">
                  (select one organization)
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Organization Selection */}
        {selectedMode !== 'all' && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Select Organizations</Label>
                {selectedMode === 'multiple' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAllToggle(selectedOrganizationIds.length !== organizations.length)}
                  >
                    {selectedOrganizationIds.length === organizations.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Organization List */}
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {filteredOrganizations.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    {searchQuery ? 'No organizations match your search' : 'No organizations available'}
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredOrganizations.map((org) => (
                      <div
                        key={org.id}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`org-${org.id}`}
                          checked={selectedOrganizationIds.includes(org.id)}
                          onCheckedChange={(checked) => 
                            handleOrganizationToggle(org.id, checked as boolean)
                          }
                          disabled={selectedMode === 'single' && selectedOrganizationIds.length > 0 && !selectedOrganizationIds.includes(org.id)}
                        />
                        <Label
                          htmlFor={`org-${org.id}`}
                          className="flex-1 cursor-pointer space-y-1"
                        >
                          <div className="font-medium">{org.name}</div>
                          {org.legalName && org.legalName !== org.name && (
                            <div className="text-sm text-muted-foreground">{org.legalName}</div>
                          )}
                          <div className="flex items-center gap-2">
                            {org.businessType && (
                              <Badge variant="secondary" className="text-xs">
                                {formatBusinessType(org.businessType)}
                              </Badge>
                            )}
                            {org.status && (
                              <Badge variant={org.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {org.status}
                              </Badge>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Selected Organizations Summary */}
        {selectedOrganizationIds.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-base font-medium">Selected Organizations</Label>
              <div className="text-sm text-muted-foreground">
                {selectedMode === 'all' 
                  ? `All ${organizations.length} organizations will be assigned`
                  : `${selectedOrganizationIds.length} organization${selectedOrganizationIds.length !== 1 ? 's' : ''} selected`
                }
              </div>
              {selectedMode !== 'all' && selectedOrganizationIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {getSelectedOrganizations().map((org) => (
                    <Badge key={org.id} variant="outline" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {org.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={loadCurrentAssignments}
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (selectedMode !== 'all' && selectedOrganizationIds.length === 0)}
          >
            {saving ? 'Saving...' : 'Save Assignment'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrganizationAssignment;
