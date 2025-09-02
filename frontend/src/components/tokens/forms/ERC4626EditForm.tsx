// ERC-4626 Edit Form Bridge Component
// Routes to ComprehensiveTokenEditForm for enhanced functionality

import React from 'react';
import { TokenStandard } from '@/types/core/centralModels';
import { ComprehensiveTokenEditForm } from '../forms-comprehensive';

interface ERC4626EditFormProps {
  tokenId?: string;
  onSave?: (data: any) => Promise<void>;
  onCancel?: () => void;
  // Additional props for backward compatibility
  [key: string]: any;
}

const ERC4626EditForm: React.FC<ERC4626EditFormProps> = ({
  tokenId,
  onSave,
  onCancel,
  ...props
}) => {
  return (
    <ComprehensiveTokenEditForm
      tokenId={tokenId}
      standard={TokenStandard.ERC4626}
      configMode="max" // Use advanced mode for full features
      enableDebug={false}
      onSave={onSave}
      onCancel={onCancel}
      {...props}
    />
  );
};

export default ERC4626EditForm;
