/**
 * Organization Picker Component
 * Simplified organization selection component for use in modals and forms
 */

import React, { useState, useEffect } from 'react';
import { Search, Building, Check, ChevronsUpDown } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/utils/utils';

// Services and Types
import OrganizationAssignmentService from './organizationAssignmentService';
import type { Organization } from './types';

interface OrganizationPickerProps {
  selectedOrganizationIds: string[];
  onSelectionChange: (organizationIds: string[]) => void;
  mode: 'single' | 'multiple';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const OrganizationPicker: React.FC<OrganizationPickerProps> = ({
  selectedOrganizationIds,
  onSelectionChange,
  mode = 'single',
  placeholder = 'Select organization...',
  className,
  disabled = false
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await OrganizationAssignmentService.getOrganizations();
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (organizationId: string) => {
    if (mode === 'single') {
      onSelectionChange([organizationId]);
      setOpen(false);
    } else {
      const isSelected = selectedOrganizationIds.includes(organizationId);
      if (isSelected) {
        onSelectionChange(selectedOrganizationIds.filter(id => id !== organizationId));
      } else {
        onSelectionChange([...selectedOrganizationIds, organizationId]);
      }
    }
  };

  const getSelectedOrganizations = () => {
    return organizations.filter(org => selectedOrganizationIds.includes(org.id));
  };

  const getDisplayText = () => {
    const selected = getSelectedOrganizations();
    
    if (selected.length === 0) {
      return placeholder;
    }
    
    if (mode === 'single') {
      return selected[0]?.name || placeholder;
    }
    
    if (selected.length === 1) {
      return selected[0].name;
    }
    
    if (selected.length === organizations.length) {
      return 'All organizations';
    }
    
    return `${selected.length} organizations selected`;
  };

  const formatBusinessType = (type: string | null | undefined) => {
    if (!type) return '';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="truncate">{getDisplayText()}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search organizations..." />
            <CommandEmpty>No organizations found.</CommandEmpty>
            <CommandList className="max-h-60">
              <CommandGroup>
                {organizations.map((org) => {
                  const isSelected = selectedOrganizationIds.includes(org.id);
                  
                  return (
                    <CommandItem
                      key={org.id}
                      value={org.name}
                      onSelect={() => handleSelect(org.id)}
                      className="flex items-center gap-2 p-3"
                    >
                      {mode === 'multiple' ? (
                        <Checkbox
                          checked={isSelected}
                          onChange={() => {}} // Handled by onSelect
                          className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                      ) : (
                        <Check
                          className={cn(
                            "h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{org.name}</div>
                        {org.legalName && org.legalName !== org.name && (
                          <div className="text-sm text-muted-foreground truncate">
                            {org.legalName}
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          {org.businessType && (
                            <Badge variant="secondary" className="text-xs h-5">
                              {formatBusinessType(org.businessType)}
                            </Badge>
                          )}
                          {org.status && (
                            <Badge 
                              variant={org.status === 'active' ? 'default' : 'secondary'} 
                              className="text-xs h-5"
                            >
                              {org.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Selected Organizations Display for Multiple Mode */}
      {mode === 'multiple' && selectedOrganizationIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {getSelectedOrganizations().slice(0, 3).map((org) => (
            <Badge key={org.id} variant="outline" className="text-xs">
              {org.name}
              <button
                type="button"
                className="ml-1 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(org.id);
                }}
              >
                ×
              </button>
            </Badge>
          ))}
          {selectedOrganizationIds.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{selectedOrganizationIds.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationPicker;
