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
import { AlertCircle, Shield, Activity, Lock, Unlock, Users, PlugZap, TrendingUp } from "lucide-react";
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
import { PolicyAwarePauseOperation } from "./PolicyAwarePauseOperation";

// 🆕 Advanced Management Operations
import { PolicyAwareRoleManagementOperation } from "./PolicyAwareRoleManagementOperation";
import { ModuleManagementPanel } from "./ModuleManagementPanel";
import { UpdateMaxSupplyOperation } from "./UpdateMaxSupplyOperation";

// 🆕 Module-Specific Operations
import {
  VestingModuleOperations,
  TimelockModuleOperations,
  ComplianceModuleOperations,
  DocumentModuleOperations
} from './modules';

import type { SupportedChain } from "@/infrastructure/web3/adapters/IBlockchainAdapter";
import { useSupabaseClient as useSupabase } from "@/hooks/shared/supabase/useSupabaseClient";

interface PolicyAwareOperationsPanelProps {
  tokenId: string;
  projectId: string; // 🆕 For role management
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  environment?: 'mainnet' | 'testnet'; // 🆕 For module operations
  isDeployed: boolean;
  isPaused?: boolean;
  hasPauseFeature?: boolean;
  hasLockFeature?: boolean;
  hasBlockFeature?: boolean;
  currentMaxSupply?: string; // 🆕 For max supply operation
  currentTotalSupply?: string; // 🆕 For max supply operation
  decimals?: number; // 🆕 For max supply operation
  moduleAddresses?: Record<string, string>; // 🆕 For module operations
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
  projectId,
  tokenAddress,
  tokenStandard,
  tokenName,
  tokenSymbol,
  chain,
  environment = 'testnet', // 🆕 Default to testnet
  isDeployed,
  isPaused = false,
  hasPauseFeature = false,
  hasLockFeature = true,
  hasBlockFeature = false,
  currentMaxSupply = '0',
  currentTotalSupply = '0',
  decimals = 18,
  moduleAddresses = {}, // 🆕 Module addresses
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
  const supabase = useSupabase(); // ✅ Fixed: Direct return, not destructured

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
    unblock: hasBlockFeature && ["ERC-20", "ERC-1400"].includes(tokenStandard),
    // 🆕 Advanced operations
    roles: true, // Always available
    modules: true, // Always available
    maxSupply: ["ERC-20", "ERC-1400"].includes(tokenStandard), // Only for tokens with max supply
    // 🆕 Module-specific operations
    vesting: !!moduleAddresses?.vesting,
    timelock: !!moduleAddresses?.timelock,
    compliance: !!moduleAddresses?.compliance,
    document: !!moduleAddresses?.document
  };

  // Count available operations for grid layout
  const operationCount = Object.values(operations).filter(Boolean).length;
  const gridCols = operationCount <= 4 ? `grid-cols-${operationCount}` : 
                   operationCount <= 8 ? 'grid-cols-4' : 'grid-cols-6';

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
              <TabsList className={`grid w-full ${gridCols} grid-cols-8 padding-y-4 h-12"mb-6`}>
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
                {/* 🆕 Advanced Operations */}
                {operations.roles && (
                  <TabsTrigger value="roles">
                    <Users className="h-4 w-4 mr-2" />
                    Roles
                  </TabsTrigger>
                )}
                {operations.modules && (
                  <TabsTrigger value="modules">
                    <PlugZap className="h-4 w-4 mr-2" />
                    Modules
                  </TabsTrigger>
                )}
                {operations.maxSupply && (
                  <TabsTrigger value="maxSupply">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Max Supply
                  </TabsTrigger>
                )}
                {/* 🆕 Module-Specific Operations */}
                {operations.vesting && <TabsTrigger value="vesting">Vesting</TabsTrigger>}
                {operations.timelock && <TabsTrigger value="timelock">Timelock</TabsTrigger>}
                {operations.compliance && <TabsTrigger value="compliance">Compliance</TabsTrigger>}
                {operations.document && <TabsTrigger value="document">Documents</TabsTrigger>}
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
                    <PolicyAwarePauseOperation
                      tokenId={tokenId}
                      tokenAddress={tokenAddress}
                      tokenStandard={tokenStandard}
                      tokenName={tokenName}
                      tokenSymbol={tokenSymbol}
                      chain={chain}
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

                {/* 🆕 Advanced Operations */}
                {operations.roles && (
                  <TabsContent value="roles">
                    <PolicyAwareRoleManagementOperation
                      tokenId={tokenId}
                      projectId={projectId}
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

                {operations.modules && (
                  <TabsContent value="modules">
                    <ModuleManagementPanel
                      tokenId={tokenId}
                      tokenAddress={tokenAddress}
                      tokenStandard={tokenStandard}
                      chain={chain}
                      isDeployed={isDeployed}
                      onSuccess={handleOperationSuccess}
                    />
                  </TabsContent>
                )}

                {operations.maxSupply && (
                  <TabsContent value="maxSupply">
                    <UpdateMaxSupplyOperation
                      tokenId={tokenId}
                      tokenAddress={tokenAddress}
                      tokenStandard={tokenStandard}
                      tokenName={tokenName}
                      tokenSymbol={tokenSymbol}
                      chain={chain}
                      isDeployed={isDeployed}
                      currentMaxSupply={currentMaxSupply}
                      currentTotalSupply={currentTotalSupply}
                      decimals={decimals}
                      onSuccess={handleOperationSuccess}
                    />
                  </TabsContent>
                )}

                {/* 🆕 Module-Specific Operations */}
                {operations.vesting && moduleAddresses.vesting && (
                  <TabsContent value="vesting">
                    <VestingModuleOperations
                      moduleAddress={moduleAddresses.vesting}
                      tokenAddress={tokenAddress}
                      chain={chain}
                      environment={environment === 'testnet' ? 'testnet' : 'mainnet'}
                    />
                  </TabsContent>
                )}

                {operations.timelock && moduleAddresses.timelock && (
                  <TabsContent value="timelock">
                    <TimelockModuleOperations
                      moduleAddress={moduleAddresses.timelock}
                      tokenAddress={tokenAddress}
                      chain={chain}
                      environment={environment === 'testnet' ? 'testnet' : 'mainnet'}
                    />
                  </TabsContent>
                )}

                {operations.compliance && moduleAddresses.compliance && (
                  <TabsContent value="compliance">
                    <ComplianceModuleOperations
                      moduleAddress={moduleAddresses.compliance}
                      tokenAddress={tokenAddress}
                      chain={chain}
                      environment={environment === 'testnet' ? 'testnet' : 'mainnet'}
                    />
                  </TabsContent>
                )}

                {operations.document && moduleAddresses.document && (
                  <TabsContent value="document">
                    <DocumentModuleOperations
                      moduleAddress={moduleAddresses.document}
                      tokenAddress={tokenAddress}
                      chain={chain}
                      environment={environment === 'testnet' ? 'testnet' : 'mainnet'}
                    />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PolicyAwareOperationsPanel;
