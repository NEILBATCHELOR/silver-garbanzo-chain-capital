/**
 * Deployment Verification Modal
 * 
 * Comprehensive UI for displaying token deployment verification results
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import {
  ComprehensiveVerificationResult,
  OverallVerificationStatus,
  VerificationStatus,
  VerificationCheck
} from '@/services/verification/types';
import { verificationService } from '@/services/verification/verificationService';
import { getExplorerUrl } from '@/utils/shared/explorerUtils';
import { SourceVerificationPanel } from './SourceVerificationPanel';

interface VerificationModalProps {
  tokenId: string;
  network: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentVerificationModal: React.FC<VerificationModalProps> = ({
  tokenId,
  network,
  isOpen,
  onClose
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<ComprehensiveVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start verification when modal opens
  useEffect(() => {
    if (isOpen && !result && !isVerifying) {
      performVerification();
    }
  }, [isOpen]);

  const performVerification = async () => {
    // ✅ FIX: Reset result state to allow re-verification
    setResult(null);
    setIsVerifying(true);
    setError(null);
    
    try {
      // Store provider globally for verifiers to access
      (globalThis as any).__verificationProvider = null; // Will be initialized by service
      
      const verificationResult = await verificationService.verifyDeployment(tokenId, {
        verifyToken: true,
        verifyModules: true,
        verifyExtensions: true,
        verifyTransactionSequence: true,
        deepCheck: true,
        compareWithExpected: true,
        checkModuleLinkage: true
      });
      
      setResult(verificationResult);
    } catch (err: any) {
      console.error('Verification failed:', err);
      setError(err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.SUCCESS:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case VerificationStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case VerificationStatus.WARNING:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case VerificationStatus.CHECKING:
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case VerificationStatus.SKIPPED:
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    const variants = {
      [VerificationStatus.SUCCESS]: 'default',
      [VerificationStatus.FAILED]: 'destructive',
      [VerificationStatus.WARNING]: 'outline',
      [VerificationStatus.CHECKING]: 'outline',
      [VerificationStatus.SKIPPED]: 'secondary',
      [VerificationStatus.PENDING]: 'secondary'
    };

    return (
      <Badge variant={variants[status] as any} className="ml-2">
        {status}
      </Badge>
    );
  };

  const renderCheckItem = (check: VerificationCheck, index: number) => (
    <div key={index} className="flex items-start space-x-3 py-2 border-b last:border-0">
      <div className="pt-0.5">{getStatusIcon(check.status)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{check.name}</h4>
          {getStatusBadge(check.status)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{check.description}</p>
        
        {check.expected && (
          <div className="text-xs mt-2">
            <span className="text-muted-foreground">Expected: </span>
            <span className="font-mono">{JSON.stringify(check.expected)}</span>
          </div>
        )}
        
        {check.actual && (
          <div className="text-xs mt-1">
            <span className="text-muted-foreground">Actual: </span>
            <span className="font-mono">{JSON.stringify(check.actual)}</span>
          </div>
        )}
        
        {check.error && (
          <div className="text-xs text-red-500 mt-1">
            Error: {check.error}
          </div>
        )}
        
        {check.transactionHash && (
          <div className="text-xs mt-1">
            <a
              href={getExplorerUrl(network, check.transactionHash, 'transaction')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline inline-flex items-center"
            >
              View Transaction
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Deployment Verification</DialogTitle>
          <DialogDescription>
            Comprehensive verification of token deployment and modules
          </DialogDescription>
        </DialogHeader>

        {isVerifying && !result && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">Verifying deployment...</p>
            <p className="text-xs text-muted-foreground">
              Checking on-chain state and module configurations
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start space-x-2">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Verification Failed</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={performVerification}
                  className="mt-3"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-5 gap-2">
              <div className="bg-green-50 border border-green-200 rounded-md p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{result.passedChecks}</div>
                <div className="text-xs text-green-600">Passed</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-center">
                <div className="text-2xl font-bold text-red-700">{result.failedChecks}</div>
                <div className="text-xs text-red-600">Failed</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-center">
                <div className="text-2xl font-bold text-yellow-700">{result.warningChecks}</div>
                <div className="text-xs text-yellow-600">Warnings</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-center">
                <div className="text-2xl font-bold text-gray-700">{result.skippedChecks}</div>
                <div className="text-xs text-gray-600">Skipped</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">{result.totalChecks}</div>
                <div className="text-xs text-blue-600">Total</div>
              </div>
            </div>

            {/* Overall Status */}
            <div className={`rounded-md p-4 ${
              result.overallStatus === OverallVerificationStatus.SUCCESS
                ? 'bg-green-50 border border-green-200'
                : result.overallStatus === OverallVerificationStatus.PARTIAL_SUCCESS
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {result.overallStatus === OverallVerificationStatus.SUCCESS && (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  )}
                  {result.overallStatus === OverallVerificationStatus.PARTIAL_SUCCESS && (
                    <AlertTriangle className="h-6 w-6 text-yellow-500" />
                  )}
                  {result.overallStatus === OverallVerificationStatus.FAILED && (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                  <div>
                    <h3 className="font-semibold">
                      {result.overallStatus === OverallVerificationStatus.SUCCESS && 'Verification Successful'}
                      {result.overallStatus === OverallVerificationStatus.PARTIAL_SUCCESS && 'Partial Success'}
                      {result.overallStatus === OverallVerificationStatus.FAILED && 'Verification Failed'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Completed in {(result.verificationDuration / 1000).toFixed(2)}s
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={performVerification}>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Re-verify
                </Button>
              </div>
            </div>

            {/* Detailed Results */}
            <ScrollArea className="flex-1">
              <Tabs defaultValue="token" className="w-full">
                <TabsList>
                  <TabsTrigger value="token">
                    Token ({result.tokenChecks.length})
                  </TabsTrigger>
                  <TabsTrigger value="modules">
                    Modules ({result.moduleResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="transactions">
                    Transactions ({result.transactionChecks.length})
                  </TabsTrigger>
                  <TabsTrigger value="source">
                    Source Code
                  </TabsTrigger>
                  {result.issues.length > 0 && (
                    <TabsTrigger value="issues">
                      Issues ({result.issues.length})
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="token" className="space-y-2 mt-4">
                  {result.tokenChecks.map((check, idx) => renderCheckItem(check, idx))}
                </TabsContent>

                <TabsContent value="modules" className="space-y-2 mt-4">
                  {result.moduleResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No modules to verify
                    </p>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {result.moduleResults.map((moduleResult, idx) => (
                        <AccordionItem key={idx} value={`module-${idx}`}>
                          <AccordionTrigger>
                            <div className="flex items-center justify-between w-full pr-4">
                              <span className="font-medium">
                                {moduleResult.moduleType} Module
                              </span>
                              <div className="flex items-center space-x-2">
                                {moduleResult.deploymentVerified && 
                                 moduleResult.linkageVerified && 
                                 moduleResult.configurationVerified ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-1 pt-2">
                              {moduleResult.checks.map((check, checkIdx) => 
                                renderCheckItem(check, checkIdx)
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </TabsContent>

                <TabsContent value="transactions" className="space-y-2 mt-4">
                  {result.transactionChecks.map((check, idx) => renderCheckItem(check, idx))}
                </TabsContent>

                <TabsContent value="source" className="mt-4">
                  <SourceVerificationPanel
                    tokenId={tokenId}
                    contractAddress={result.tokenAddress}
                    network={network}
                    modules={result.moduleResults.map(m => ({
                      moduleType: m.moduleType,
                      moduleAddress: m.moduleAddress,
                      configuration: m.checks.find(c => c.type.toString().includes('CONFIGURATION'))?.actual
                    }))}
                  />
                </TabsContent>

                {result.issues.length > 0 && (
                  <TabsContent value="issues" className="space-y-2 mt-4">
                    {result.issues.map((issue, idx) => (
                      <div key={idx} className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{issue}</p>
                      </div>
                    ))}
                  </TabsContent>
                )}
              </Tabs>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
