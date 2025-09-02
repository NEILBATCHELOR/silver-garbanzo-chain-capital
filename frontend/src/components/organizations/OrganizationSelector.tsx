import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Loader2 } from 'lucide-react';
import { useOrganizationContext } from './OrganizationContext';

interface OrganizationSelectorProps {
  className?: string;
  placeholder?: string;
  showIcon?: boolean;
  compact?: boolean;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  className = '',
  placeholder = 'Select organization',
  showIcon = true,
  compact = false,
}) => {
  const {
    selectedOrganization,
    setSelectedOrganization,
    userOrganizations,
    isLoading,
    shouldShowSelector,
  } = useOrganizationContext();

  // Don't render if user has ≤1 organization
  if (!shouldShowSelector) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-sm' : ''} ${className}`}>
        <Loader2 className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} animate-spin`} />
        <span className="text-muted-foreground">Loading organizations...</span>
      </div>
    );
  }

  const handleOrganizationChange = (organizationId: string) => {
    const org = userOrganizations.find(o => o.id === organizationId);
    if (org) {
      setSelectedOrganization(org);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && (
        <Building2 className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
      )}
      <Select
        value={selectedOrganization?.id || ''}
        onValueChange={handleOrganizationChange}
      >
        <SelectTrigger className={`${compact ? 'h-8 text-sm' : 'h-9'} w-[400px]`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {userOrganizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default OrganizationSelector;
