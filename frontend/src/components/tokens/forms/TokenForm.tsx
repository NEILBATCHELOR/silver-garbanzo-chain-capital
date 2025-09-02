// Bridge component for TokenForm to maintain backward compatibility
// Routes to ComprehensiveTokenEditForm for enhanced functionality

import React from 'react';
import { TokenStandard } from '@/types/core/centralModels';
import { ComprehensiveTokenEditForm } from '../forms-comprehensive';

interface TokenFormProps {
  tokenId?: string;
  standard?: TokenStandard | string;
  configMode?: 'min' | 'max' | 'basic' | 'advanced';
  enableDebug?: boolean;
  onSave?: (data: any) => Promise<void>;
  onCancel?: () => void;
  // Additional props for backward compatibility
  [key: string]: any;
}

const TokenForm: React.FC<TokenFormProps> = ({
  tokenId,
  standard,
  configMode = 'max',
  enableDebug = false,
  onSave,
  onCancel,
  ...props
}) => {
  // Convert string standard to TokenStandard enum if needed
  const standardEnum = typeof standard === 'string' ? standard as TokenStandard : standard;

  // Handle legacy configuration modes
  const normalizedConfigMode = configMode === 'basic' ? 'min' : 
                              configMode === 'advanced' ? 'max' : 
                              configMode;

  return (
    <ComprehensiveTokenEditForm
      tokenId={tokenId}
      standard={standardEnum || TokenStandard.ERC20}
      configMode={normalizedConfigMode as 'min' | 'max' | 'basic' | 'advanced'}
      enableDebug={enableDebug}
      onSave={onSave}
      onCancel={onCancel}
      {...props}
    />
  );
};

export default TokenForm;
