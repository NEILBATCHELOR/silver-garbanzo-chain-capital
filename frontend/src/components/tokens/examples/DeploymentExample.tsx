/**
 * Example: How to use the Unified Token Deployment Service in your UI
 * 
 * This shows how to integrate the unified service into your existing token deployment components
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { unifiedTokenDeploymentService } from '@/components/tokens/services/unifiedTokenDeploymentService';
import { DeploymentStatus } from '@/types/deployment/TokenDeploymentTypes';

interface DeploymentExampleProps {
  tokenId: string;
  userId: string;
  projectId: string;
}

export const DeploymentExample: React.FC<DeploymentExampleProps> = ({
  tokenId,
  userId,
  projectId
}) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);

  // Get deployment recommendation first
  const getRecommendation = async () => {
    try {
      const rec = await unifiedTokenDeploymentService.getDeploymentRecommendation(tokenId);
      setRecommendation(rec);
    } catch (error) {
      console.error('Failed to get recommendation:', error);
    }
  };

  // Deploy with automatic optimization
  const deployWithOptimization = async () => {
    setIsDeploying(true);
    try {
      const result = await unifiedTokenDeploymentService.deployToken(
        tokenId,
        userId,
        projectId,
        {
          useOptimization: true,    // Enable automatic optimization
          forceStrategy: 'auto',    // Let the service choose the best strategy
          enableAnalytics: true     // Track deployment analytics
        }
      );
      
      setDeploymentResult(result);
    } catch (error) {
      console.error('Deployment failed:', error);
      setDeploymentResult({
        status: DeploymentStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsDeploying(false);
    }
  };

  // Deploy with forced strategy (for testing)
  const deployWithStrategy = async (strategy: 'direct' | 'chunked' | 'batched') => {
    setIsDeploying(true);
    try {
      const result = await unifiedTokenDeploymentService.deployToken(
        tokenId,
        userId,
        projectId,
        {
          useOptimization: true,
          forceStrategy: strategy,  // Force specific strategy
          enableAnalytics: true
        }
      );
      
      setDeploymentResult(result);
    } catch (error) {
      console.error('Deployment failed:', error);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Deployment Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {!recommendation ? (
            <Button onClick={getRecommendation} variant="outline">
              Analyze Deployment Strategy
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">Recommended Strategy:</span>
                <Badge variant={
                  recommendation.recommendedStrategy === 'chunked' ? 'destructive' :
                  recommendation.recommendedStrategy === 'batched' ? 'default' : 'secondary'
                }>
                  {recommendation.recommendedStrategy.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {recommendation.reasoning}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span>Complexity Score: <strong>{recommendation.complexityScore}</strong></span>
                {recommendation.estimatedGasSavings > 0 && (
                  <span>Est. Gas Savings: <strong>{recommendation.estimatedGasSavings.toLocaleString()}</strong></span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployment Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Deploy Token</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main deployment button */}
            <Button 
              onClick={deployWithOptimization}
              disabled={isDeploying}
              className="w-full"
              size="lg"
            >
              {isDeploying ? 'Deploying...' : 'Deploy with Automatic Optimization'}
            </Button>

            {/* Advanced options */}
            {recommendation && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Advanced Options:</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deployWithStrategy('direct')}
                    disabled={isDeploying}
                  >
                    Force Direct
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deployWithStrategy('batched')}
                    disabled={isDeploying}
                  >
                    Force Batched
                  </Button>
                  {recommendation.recommendedStrategy === 'chunked' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deployWithStrategy('chunked')}
                      disabled={isDeploying}
                    >
                      Force Chunked
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deployment Result */}
      {deploymentResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Deployment Result
              <Badge variant={
                deploymentResult.status === DeploymentStatus.SUCCESS ? 'default' : 'destructive'
              }>
                {deploymentResult.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deploymentResult.status === DeploymentStatus.SUCCESS ? (
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Contract Address:</span>
                  <p className="font-mono text-sm break-all bg-muted p-2 rounded">
                    {deploymentResult.tokenAddress}
                  </p>
                </div>
                
                <div>
                  <span className="font-medium">Transaction Hash:</span>
                  <p className="font-mono text-sm break-all bg-muted p-2 rounded">
                    {deploymentResult.transactionHash}
                  </p>
                </div>

                {deploymentResult.optimizationUsed && (
                  <div className="border-t pt-3">
                    <h4 className="font-medium mb-2">Optimization Details:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span>Strategy Used:</span>
                        <Badge variant="outline">{deploymentResult.strategy?.toUpperCase()}</Badge>
                      </div>
                      {deploymentResult.gasOptimization && (
                        <>
                          <p>
                            <span className="font-medium">Gas Savings:</span> {deploymentResult.gasOptimization.estimatedSavings.toLocaleString()}
                          </p>
                          <p>
                            <span className="font-medium">Reliability:</span> {deploymentResult.gasOptimization.reliabilityImprovement}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-600">
                <span className="font-medium">Error:</span> {deploymentResult.error}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeploymentExample;
