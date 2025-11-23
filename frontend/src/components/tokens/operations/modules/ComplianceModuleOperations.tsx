/**
 * Compliance Module Operations
 * Provides UI for managing KYC/AML compliance settings
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { providerManager, NetworkEnvironment } from '@/infrastructure/web3/ProviderManager';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

interface ComplianceModuleOperationsProps {
  moduleAddress: string;
  tokenAddress: string;
  chain: SupportedChain;
  environment?: 'mainnet' | 'testnet';
}

const COMPLIANCE_MODULE_ABI = [
  'function isKYCRequired() external view returns (bool)',
  'function setKYCRequired(bool required) external',
  'function isAddressCompliant(address account) external view returns (bool)'
];

export const ComplianceModuleOperations: React.FC<ComplianceModuleOperationsProps> = ({
  moduleAddress,
  tokenAddress,
  chain,
  environment = 'testnet'
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [kycRequired, setKycRequired] = useState(false);
  const [userCompliant, setUserCompliant] = useState(false);

  useEffect(() => {
    loadComplianceStatus();
  }, [moduleAddress, chain]);

  const loadComplianceStatus = async () => {
    try {
      setLoadingStatus(true);

      const env = environment === 'mainnet' ? NetworkEnvironment.MAINNET : NetworkEnvironment.TESTNET;
      const provider = providerManager.getProviderForEnvironment(chain, env);
      
      if (!provider) throw new Error('Provider not available');

      const accounts = await provider.send('eth_requestAccounts', []);
      const userAddress = accounts[0];

      const complianceContract = new ethers.Contract(moduleAddress, COMPLIANCE_MODULE_ABI, provider);

      const required = await complianceContract.isKYCRequired();
      const compliant = await complianceContract.isAddressCompliant(userAddress);

      setKycRequired(required);
      setUserCompliant(compliant);
    } catch (error) {
      console.error('Error loading compliance status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleToggleKYC = async () => {
    try {
      setLoading(true);

      const env = environment === 'mainnet' ? NetworkEnvironment.MAINNET : NetworkEnvironment.TESTNET;
      const provider = providerManager.getProviderForEnvironment(chain, env);
      
      if (!provider) throw new Error('Provider not available');

      const signer = await provider.getSigner();
      const complianceContract = new ethers.Contract(moduleAddress, COMPLIANCE_MODULE_ABI, signer);

      const tx = await complianceContract.setKYCRequired(!kycRequired);
      toast({ title: 'Updating compliance settings...', description: 'Waiting for confirmation' });
      await tx.wait();

      toast({
        title: 'Compliance Updated',
        description: `KYC requirement ${!kycRequired ? 'enabled' : 'disabled'}`,
        variant: 'default'
      });

      await loadComplianceStatus();
    } catch (error) {
      console.error('Error updating compliance:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compliance Settings
          </CardTitle>
          <CardDescription>
            Manage KYC/AML compliance requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingStatus ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>KYC Required</Label>
                  <p className="text-sm text-muted-foreground">
                    Require users to complete KYC before transfers
                  </p>
                </div>
                <Switch
                  checked={kycRequired}
                  onCheckedChange={handleToggleKYC}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Your Compliance Status</p>
                  <p className="text-sm text-muted-foreground">
                    {userCompliant ? 'You are compliant' : 'Compliance verification needed'}
                  </p>
                </div>
                {userCompliant ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Compliant
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Compliant
                  </Badge>
                )}
              </div>

              {kycRequired && !userCompliant && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    You must complete KYC verification to interact with this token.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
