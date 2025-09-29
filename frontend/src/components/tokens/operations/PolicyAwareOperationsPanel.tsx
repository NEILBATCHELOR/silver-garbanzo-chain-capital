/**
 * Policy-Aware Operations Panel
 * Main hub for all policy-validated token operations
 * 
 * This panel integrates with the Policy Engine and Cryptographic Operation Gateway
 * to provide automated compliance checking and risk assessment for all operations.
 */

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Shield, Info, Activity, Lock, Unlock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// Policy-Aware Operation Components
import { PolicyAwareMintOperation } from "./PolicyAwareMintOperation";
import { PolicyAwareBurnOperation } from "./PolicyAwareBurnOperation";
import { PolicyAwareTransferOperation } from "./PolicyAwareTransferOperation";
import { PolicyAwareLockOperation } from "./PolicyAwareLockOperation";
import { PolicyAwareUnlockOperation } from "./PolicyAwareUnlockOperation";
import { PolicyAwareBlockOperation } from "./PolicyAwareBlockOperation";
import { PolicyAwareUnblockOperation } from "./PolicyAwareUnblockOperation";

// Keep PauseOperation as no PolicyAware version exists
import PauseOperation from "./PauseOperation";

import type { SupportedChain } from "@/infrastructure/web3/adapters/IBlockchainAdapter";
import { useSupabaseClient as useSupabase } from "@/hooks/shared/supabase/useSupabaseClient";

interface PolicyAwareOperationsPanelProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
  isPaused?: boolean;
  hasPauseFeature?: boolean;
  hasLockFeature?: boolean;
  hasBlockFeature?: boolean;
  refreshTokenData?: () => void;
}

interface PolicyStatus {
  policiesActive: number;
  complianceScore: number;
  lastViolation: string | null;
  pendingApprovals: number;
}

/**
 * PolicyAwareOperationsPanel - Enhanced operations panel with policy integration
 * Provides a unified interface for all token operations with real-time policy validation
 */
const PolicyAwareOperationsPanel: React.FC<PolicyAwareOperationsPanelProps> = ({
  tokenId,
  tokenAddress,
  tokenStandard,
  tokenName,
  tokenSymbol,
  chain,
  isDeployed,
  isPaused = false,
  hasPauseFeature = false,
  hasLockFeature = true,
  hasBlockFeature = false,
  refreshTokenData
}) => {
  const [activeTab, setActiveTab] = useState("mint");
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus>({
    policiesActive: 0,
    complianceScore: 100,
    lastViolation: null,
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);
  const { supabase } = useSupabase();

  // Load policy status for the token
  useEffect(() => {
    loadPolicyStatus();
  }, [tokenAddress, chain]);

  const loadPolicyStatus = async () => {
    try {
      // Load policy mappings from database
      const { data: mappings } = await supabase
        .from('policy_operation_mappings')
        .select('*')
        .eq('chain', chain)
        .eq('token_address', tokenAddress);

      // Load compliance metrics
      const { data: metrics } = await supabase
        .from('compliance_metrics')
        .select('compliance_score')
        .eq('token_address', tokenAddress)
        .order('calculated_at', { ascending: false })
        .limit(1);

      // Load recent violations
      const { data: violations } = await supabase
        .from('compliance_violations')
        .select('created_at')
        .eq('token_address', tokenAddress)
        .order('created_at', { ascending: false })
        .limit(1);

      setPolicyStatus({
        policiesActive: mappings?.length || 0,
        complianceScore: metrics?.[0]?.compliance_score || 100,
        lastViolation: violations?.[0]?.created_at || null,
        pendingApprovals: 0 // Would come from approval queue
      });
    } catch (error) {
      console.error('Failed to load policy status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle successful operations
  const handleOperationSuccess = () => {
    if (refreshTokenData) {
      refreshTokenData();
    }
    loadPolicyStatus(); // Refresh policy status
  };

  // Determine available operations based on token standard
  const operations = {
    mint: true, // Always available
    burn: ["ERC-20", "ERC-721", "ERC-1155", "ERC-1400", "ERC-3525", "ERC-4626"].includes(tokenStandard),
    transfer: ["ERC-20", "ERC-721", "ERC-1155", "ERC-1400", "ERC-3525"].includes(tokenStandard),
    pause: hasPauseFeature,
    lock: hasLockFeature && ["ERC-20", "ERC-1400", "ERC-3525"].includes(tokenStandard),
    unlock: hasLockFeature && ["ERC-20", "ERC-1400", "ERC-3525"].includes(tokenStandard),
    block: hasBlockFeature && ["ERC-20", "ERC-1400"].includes(tokenStandard),
    unblock: hasBlockFeature && ["ERC-20", "ERC-1400"].includes(tokenStandard)
  };

  // Count available operations for grid layout
  const operationCount = Object.values(operations).filter(Boolean).length;
  const gridCols = operationCount <= 4 ? `grid-cols-${operationCount}` : 
                   operationCount <= 6 ? 'grid-cols-6' : 'grid-cols-4';

  return (
    <div className="space-y-6">
      {/* Policy Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Policy-Protected Operations</CardTitle>
            </div>
            <Badge variant={policyStatus.complianceScore >= 80 ? "default" : "destructive"}>
              Compliance: {policyStatus.complianceScore}%
            </Badge>
          </div>
          <CardDescription>
            All operations are validated against active policies before execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Active Policies</p>
              <p className="text-2xl font-bold">{policyStatus.policiesActive}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Compliance Score</p>
              <Progress value={policyStatus.complianceScore} className="mt-2" />
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Last Violation</p>
              <p className="text-sm font-medium">
                {policyStatus.lastViolation ? 
                  new Date(policyStatus.lastViolation).toLocaleDateString() : 
                  'None'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Pending Approvals</p>
              <p className="text-2xl font-bold">{policyStatus.pendingApprovals}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operations Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Token Operations</CardTitle>
          <CardDescription>
            Execute operations with automated policy validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isDeployed ? (
            <div>
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Token Not Deployed</AlertTitle>
                <AlertDescription>
                  Operations are only available for deployed tokens. Please deploy this token first.
                </AlertDescription>
              </Alert>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => window.location.href = `/tokens/${tokenId}/deploy`}
              >
                Go to Deployment
              </Button>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid w-full ${gridCols}`}>
                {operations.mint && <TabsTrigger value="mint">Mint</TabsTrigger>}
                {operations.burn && <TabsTrigger value="burn">Burn</TabsTrigger>}
                {operations.transfer && <TabsTrigger value="transfer">Transfer</TabsTrigger>}
                {operations.pause && <TabsTrigger value="pause">
                  {isPaused ? "Unpause" : "Pause"}
                </TabsTrigger>}
                {operations.lock && <TabsTrigger value="lock">Lock</TabsTrigger>}
                {operations.unlock && <TabsTrigger value="unlock">Unlock</TabsTrigger>}
                {operations.block && <TabsTrigger value="block">Block</TabsTrigger>}
                {operations.unblock && <TabsTrigger value="unblock">Unblock</TabsTrigger>}
              </TabsList>
              
              <div className="mt-6">
                {operations.mint && (
                  <TabsContent value="mint">
                    <PolicyAwareMintOperation
                      tokenId={tokenId}
                      tokenAddress={tokenAddress}
                      tokenStandard={tokenStandard}
                      tokenName={tokenName}
                      tokenSymbol={tokenSymbol}
                      chain={chain}
                      isDeployed={isDeployed}
                      onSuccess={handleOperationSuccess}
                    />
                  </TabsContent>
                )}
                
                {operations.burn && (
                  <TabsContent value="burn">
                    <PolicyAwareBurnOperation
                      tokenId={tokenId}
                      tokenAddress={tokenAddress}
                      tokenStandard={tokenStandard}
                      tokenName={tokenName}
                      tokenSymbol={tokenSymbol}
                      chain={chain}
                      isDeployed={isDeployed}
                      onSuccess={handleOperationSuccess}
                    />
                  </TabsContent>
                )}
                
                {operations.transfer && (
                  <TabsContent value="transfer">
                    <PolicyAwareTransferOperation
                      tokenId={tokenId}
                      tokenAddress={tokenAddress}
                      tokenStandard={tokenStandard}
                      tokenName={tokenName}
                      tokenSymbol={tokenSymbol}
                      chain={chain}
                      isDeployed={isDeployed}
                      onSuccess={handleOperationSuccess}
                    />
                  </TabsContent>
                )}
                
                {operations.pause && (
                  <TabsContent value="pause">
                    <Alert className="mb-4">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Note</AlertTitle>
                      <AlertDescription>
                        Pause operations are not yet integrated with the Policy Engine.
                      </AlertDescription>
                    </Alert>
                    <PauseOperation
                      tokenId={tokenId}
                      tokenStandard={tokenStandard}
                      tokenName={tokenName}
                      tokenSymbol={tokenSymbol}
                      isDeployed={isDeployed}
                      isPaused={isPaused}
                      hasPauseFeature={hasPauseFeature}
                      onSuccess={handleOperationSuccess}
                    />
                  </TabsContent>
                )}
                
                {operations.lock && (
                  <TabsContent value="lock">
                    <PolicyAwareLockOperation
                      tokenId={tokenId}
                      tokenAddress={tokenAddress}
                      tokenStandard={tokenStandard}
                      tokenName={tokenName}
                      tokenSymbol={tokenSymbol}
                      chain={chain}
                      isDeployed={isDeployed}
                      onSuccess={handleOperationSuccess}
                    />
                  </TabsContent>
                )}
                
                {operations.unlock && (
                  <TabsContent value="unlock">
                    <PolicyAwareUnlockOperation
                      tokenId={tokenId}
                      tokenAddress={tokenAddress}
                      tokenStandard={tokenStandard}
                      tokenName={tokenName}
                      tokenSymbol={tokenSymbol}
                      chain={chain}
                      isDeployed={isDeployed}
                      onSuccess={handleOperationSuccess}
                    />
                  </TabsContent>
                )}
                
                {operations.block && (
                  <TabsContent value="block">
                    <PolicyAwareBlockOperation
                      tokenId={tokenId}
                      tokenAddress={tokenAddress}
                      tokenStandard={tokenStandard}
                      tokenName={tokenName}
                      tokenSymbol={tokenSymbol}
                      chain={chain}
                      isDeployed={isDeployed}
                      onSuccess={handleOperationSuccess}
                    />
                  </TabsContent>
                )}
                
                {operations.unblock && (
                  <TabsContent value="unblock">
                    <PolicyAwareUnblockOperation
                      tokenId={tokenId}
                      tokenAddress={tokenAddress}
                      tokenStandard={tokenStandard}
                      tokenName={tokenName}
                      tokenSymbol={tokenSymbol}
                      chain={chain}
                      isDeployed={isDeployed}
                      onSuccess={handleOperationSuccess}
                    />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Policy Info Footer */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Policy Protection Active</AlertTitle>
        <AlertDescription>
          All operations are automatically validated against {policyStatus.policiesActive} active policies. 
          Operations that violate policies will be blocked before execution, protecting your assets and ensuring compliance.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PolicyAwareOperationsPanel;