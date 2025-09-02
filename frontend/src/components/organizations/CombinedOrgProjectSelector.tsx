import React from 'react';
import OrganizationSelector from './OrganizationSelector';
import EnhancedProjectSelector from './EnhancedProjectSelector';
import { useOrganizationContext } from './OrganizationContext';

interface CombinedOrgProjectSelectorProps {
  currentProjectId?: string;
  onProjectChange?: (projectId: string) => void;
  layout?: 'horizontal' | 'vertical';
  compact?: boolean;
  className?: string;
}

const CombinedOrgProjectSelector: React.FC<CombinedOrgProjectSelectorProps> = ({
  currentProjectId,
  onProjectChange,
  layout = 'horizontal',
  compact = false,
  className = '',
}) => {
  const { shouldShowSelector } = useOrganizationContext();

  const containerClass = layout === 'horizontal' 
    ? 'flex items-center gap-4' 
    : 'flex flex-col gap-2';

  return (
    <div className={`${containerClass} ${className}`}>
      {/* Organization Selector - only shows if user has multiple organizations */}
      <OrganizationSelector 
        compact={compact}
        showIcon={!compact}
        className={shouldShowSelector ? '' : 'hidden'}
      />
      
      {/* Project Selector - enhanced with organization filtering */}
      <EnhancedProjectSelector
        currentProjectId={currentProjectId}
        onProjectChange={onProjectChange}
      />
    </div>
  );
};

export default CombinedOrgProjectSelector;
