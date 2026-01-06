/**
 * Source Verification Panel
 * 
 * UI component for verifying source code on block explorers (Etherscan/Blockscout)
 * Integrates with sourceVerificationService to verify token and module contracts
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Clock,
  AlertTriangle,
  FileCode
} from 'lucide-react';
import { sourceVerificationService } from '@/services/verification/source-verification/sourceVerificationService';
import { getExplorerUrl } from '@/utils/shared/explorerUtils';
import type { PhaseVerificationResults, SourceVerificationResult, ContractVerificationResult } from '@/services/verification/source-verification/types';

interface SourceVerificationPanelProps {
  tokenId: string;
  contractAddress: string;
  network: string;
  modules?: Array<{
    moduleType: string;
    moduleAddress: string;
    configuration?: any;
  }>;
}

export const SourceVerificationPanel: React.FC<SourceVerificationPanelProps> = ({
  tokenId,
  contractAddress,
  network,
  modules = []
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<{
    phases: PhaseVerificationResults[];
    summary: {
      total: number;
      verified: number;
      failed: number;
      skipped: number;
      successRate: number;
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Check if already verified on mount
  useEffect(() => {
    checkVerificationStatus();
  }, [tokenId]);

  const checkVerificationStatus = async () => {
    // TODO: Query database for existing source_verified status
    // For now, we'll just check the results state
  };

  const handleVerifyAll = async () => {
    setIsVerifying(true);
    setError(null);
    setProgress(0);
    
    try {
      // Simulate progress updates (in production, would track actual verification progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const verificationResults = await sourceVerificationService.verifyCompleteDeployment(tokenId);
      
      clearInterval(progressInterval);
      setProgress(100);
      setResults(verificationResults);
      
    } catch (err: any) {
      console.error('Source verification failed:', err);
      setError(err.message || 'Source verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = (result: SourceVerificationResult) => {
    if (!result) return <Clock className="h-4 w-4 text-gray-400" />;
    
    switch (result.status) {
      case 'verified':
      case 'already_verified':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (result: SourceVerificationResult) => {
    if (!result) return null;
    
    const badges = {
      'verified': { label: 'Verified', variant: 'default' as const },
      'already_verified': { label: 'Already Verified', variant: 'secondary' as const },
      'failed': { label: 'Failed', variant: 'destructive' as const },
      'pending': { label: 'Pending', variant: 'outline' as const },
      'not_verified': { label: 'Not Verified', variant: 'secondary' as const }
    };
    
    const badge = badges[result.status];
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  const renderContractCard = (
    contractResult?: ContractVerificationResult
  ) => {
    if (!contractResult) return null;
    
    const { name, address, result } = contractResult;
    
    return (
    <Card key={address}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(result)}
            <CardTitle className="text-base">{name}</CardTitle>
          </div>
          {result && getStatusBadge(result)}
        </div>
        <CardDescription className="font-mono text-xs">
          {address}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {result?.message && (
          <p className="text-sm text-muted-foreground">{result.message}</p>
        )}
        
        {result?.explorerUrl && (
          <div className="flex items-center space-x-2">
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline inline-flex items-center"
            >
              <FileCode className="h-3 w-3 mr-1" />
              View Source on Explorer
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        )}
        
        {!result && (
          <p className="text-sm text-muted-foreground">
            Click "Verify All Contracts" to verify source code
          </p>
        )}
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle>Source Code Verification</CardTitle>
          <CardDescription>
            Verify contracts on block explorer (Etherscan/Blockscout) to make source code publicly visible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!results && !isVerifying && (
            <Button onClick={handleVerifyAll} className="w-full">
              <FileCode className="h-4 w-4 mr-2" />
              Verify All Contracts
            </Button>
          )}

          {isVerifying && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm">Verifying source code on block explorer...</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                This may take 30-60 seconds per contract
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800">Verification Failed</h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyAll}
                    className="mt-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-3">
              {/* Summary Statistics */}
              <div className="grid grid-cols-5 gap-2">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-center">
                  <div className="text-xl font-bold text-blue-700">{results.summary.total}</div>
                  <div className="text-xs text-blue-600">Total</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-md p-2 text-center">
                  <div className="text-xl font-bold text-green-700">{results.summary.verified}</div>
                  <div className="text-xs text-green-600">Verified</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-md p-2 text-center">
                  <div className="text-xl font-bold text-red-700">{results.summary.failed}</div>
                  <div className="text-xs text-red-600">Failed</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-2 text-center">
                  <div className="text-xl font-bold text-gray-700">{results.summary.skipped}</div>
                  <div className="text-xs text-gray-600">Skipped</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-md p-2 text-center">
                  <div className="text-xl font-bold text-purple-700">{results.summary.successRate}%</div>
                  <div className="text-xs text-purple-600">Success</div>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={handleVerifyAll} className="w-full">
                <RefreshCw className="h-3 w-3 mr-2" />
                Re-verify All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase Results */}
      {results?.phases.map((phase, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center space-x-2">
              <span>{phase.phase}</span>
              <Badge variant="outline">
                {phase.verified}/{phase.total}
              </Badge>
            </h3>
          </div>

          {phase.contracts.map((contractResult, cIdx) => 
            renderContractCard(contractResult)
          )}
        </div>
      ))}

      {/* Help Text */}
      {!results && !isVerifying && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">What is source verification?</p>
                <p>
                  Source verification uploads your contract's Solidity code to the block explorer,
                  allowing anyone to view and verify that the deployed bytecode matches the source.
                  This builds trust and transparency.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
