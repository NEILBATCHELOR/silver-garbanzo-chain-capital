/**
 * XRPL Multi-Sig Signer Manager
 * View and manage signers for XRPL multi-sig account
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, UserCheck } from 'lucide-react';
import { XRPLMultiSigSignerManagerProps, SignerDisplay } from './types';
import { xrplMultiSigService } from '@/services/wallet/ripple/security';

export function XRPLMultiSigSignerManager({
  projectId,
  walletAddress,
  onSignersUpdate
}: XRPLMultiSigSignerManagerProps) {
  const [signers, setSigners] = useState<SignerDisplay[]>([]);
  const [signerQuorum, setSignerQuorum] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSigners = async () => {
      setIsLoading(true);
      try {
        const { signerQuorum: quorum, signers: signerList } = 
          await xrplMultiSigService.getSignerList(walletAddress);

        setSignerQuorum(quorum);
        setSigners(signerList.map(s => ({ ...s, hasAddress: true })));
        onSignersUpdate?.(signerList);
      } catch (error) {
        console.error('[XRPLMultiSigSignerManager] Load error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSigners();
  }, [projectId, walletAddress]);

  const totalWeight = signers.reduce((sum, s) => sum + s.weight, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="mr-2 h-5 w-5" />
          Authorized Signers
        </CardTitle>
        <CardDescription>
          Manage signers and their weights for this multi-sig account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Signers</p>
                <p className="text-2xl font-bold">{signers.length}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Weight</p>
                <p className="text-2xl font-bold">{totalWeight}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Required Weight</p>
                <p className="text-2xl font-bold">{signerQuorum}</p>
              </div>
            </div>

            {/* Signers List */}
            {signers.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No signers configured for this account.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {signers.map((signer, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-primary flex-shrink-0" />
                          <h4 className="font-medium text-sm">Signer {index + 1}</h4>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {signer.account}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-4">
                        Weight: {signer.weight}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Info Alert */}
            <Alert>
              <AlertDescription>
                To execute a transaction, signatures must have a combined weight of at least{' '}
                <strong>{signerQuorum}</strong>. Current configuration requires{' '}
                {Math.ceil(signerQuorum / (totalWeight / signers.length))} signer(s) if weights are equal.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
