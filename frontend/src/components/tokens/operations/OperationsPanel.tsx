/**
 * Legacy OperationsPanel - Now redirects to PolicyAwareOperationsPanel
 * 
 * This file is kept for backward compatibility but now uses the
 * PolicyAware version which includes policy validation, compliance
 * tracking, and gateway integration.
 * 
 * @deprecated Use PolicyAwareOperationsPanel directly for new implementations
 */

import React from "react";
import PolicyAwareOperationsPanel from "./PolicyAwareOperationsPanel";
import type { SupportedChain } from "@/infrastructure/web3/adapters/IBlockchainAdapter";

interface OperationsPanelProps {
  tokenId: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  isDeployed: boolean;
  isPaused?: boolean;
  hasPauseFeature?: boolean;
  refreshTokenData?: () => void;
  // Optional new props for PolicyAware version
  tokenAddress?: string;
  chain?: SupportedChain;
  hasLockFeature?: boolean;
  hasBlockFeature?: boolean;
}

/**
 * OperationsPanel - Legacy wrapper for PolicyAwareOperationsPanel
 * 
 * This component maintains backward compatibility while redirecting
 * to the new PolicyAware version with enhanced features.
 */
const OperationsPanel: React.FC<OperationsPanelProps> = ({
  tokenId,
  tokenStandard,
  tokenName,
  tokenSymbol,
  isDeployed,
  isPaused = false,
  hasPauseFeature = false,
  refreshTokenData,
  tokenAddress = '',
  chain = 'ethereum' as SupportedChain,
  hasLockFeature = true,
  hasBlockFeature = false
}) => {
  // Redirect to PolicyAware version with default values for missing props
  return (
    <PolicyAwareOperationsPanel
      tokenId={tokenId}
      tokenAddress={tokenAddress}
      tokenStandard={tokenStandard}
      tokenName={tokenName}
      tokenSymbol={tokenSymbol}
      chain={chain}
      isDeployed={isDeployed}
      isPaused={isPaused}
      hasPauseFeature={hasPauseFeature}
      hasLockFeature={hasLockFeature}
      hasBlockFeature={hasBlockFeature}
      refreshTokenData={refreshTokenData}
    />
  );
};

export default OperationsPanel;