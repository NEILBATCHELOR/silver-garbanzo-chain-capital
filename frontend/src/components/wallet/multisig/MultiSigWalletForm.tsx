import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlusIcon, MinusIcon, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { MultiSigTransactionService } from '@/services/wallet/multiSig/MultiSigTransactionService';
import { getAllChains } from '@/config/chains';

interface MultiSigWalletFormProps {
  projectId?: string;
  onSuccess?: (address: string, txHash: string) => void;
  onCancel?: () => void;
}

export function MultiSigWalletForm({ projectId, onSuccess, onCancel }: MultiSigWalletFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [owners, setOwners] = useState<string[]>(['', '', '']);
  const [threshold, setThreshold] = useState(2);
  const [blockchain, setBlockchain] = useState('ethereum');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<{
    address: string;
    transactionHash: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const multiSigService = MultiSigTransactionService.getInstance();
  const allChains = getAllChains();

  const addOwner = useCallback(() => {
    setOwners([...owners, '']);
  }, [owners]);

  const removeOwner = useCallback((index: number) => {
    if (owners.length > 2) {
      setOwners(owners.filter((_, i) => i !== index));
      if (threshold > owners.length - 1) {
        setThreshold(owners.length - 1);
      }
    }
  }, [owners, threshold]);

  const updateOwner = useCallback((index: number, value: string) => {
    const newOwners = [...owners];
    newOwners[index] = value;
    setOwners(newOwners);
  }, [owners]);

  const validateForm = useCallback(() => {
    // Validate name
    if (!name.trim()) {
      setError('Please enter a wallet name');
      return false;
    }

    // Validate owners
    const validOwners = owners.filter(o => o.trim() !== '');
    if (validOwners.length < 2) {
      setError('At least 2 owners are required');
      return false;
    }

    // Check for valid Ethereum addresses
    const addressPattern = /^0x[a-fA-F0-9]{40}$/;
    const invalidOwners = validOwners.filter(o => !addressPattern.test(o));
    if (invalidOwners.length > 0) {
      setError('All owner addresses must be valid Ethereum addresses (0x...)');
      return false;
    }

    // Check for duplicate owners
    const uniqueOwners = new Set(validOwners.map(o => o.toLowerCase()));
    if (uniqueOwners.size !== validOwners.length) {
      setError('Owner addresses must be unique');
      return false;
    }

    // Validate threshold
    if (threshold < 1 || threshold > validOwners.length) {
      setError('Threshold must be between 1 and the number of owners');
      return false;
    }

    return true;
  }, [name, owners, threshold]);

  const handleDeploy = async () => {
    try {
      setError(null);
      setDeploymentResult(null);

      if (!validateForm()) {
        return;
      }

      setIsDeploying(true);

      const validOwners = owners.filter(o => o.trim() !== '');

      // Deploy multi-sig wallet
      const result = await multiSigService.deployMultiSigWallet(
        name,
        validOwners,
        threshold,
        blockchain
      );

      setDeploymentResult(result);

      toast({
        title: 'Success!',
        description: `Multi-sig wallet deployed successfully`,
      });

      // Notify parent
      if (onSuccess) {
        onSuccess(result.address, result.transactionHash);
      }

    } catch (err: any) {
      console.error('Deployment error:', err);
      setError(err.message || 'Failed to deploy multi-sig wallet');
      toast({
        title: 'Error',
        description: err.message || 'Failed to deploy multi-sig wallet',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleReset = () => {
    setName('');
    setOwners(['', '', '']);
    setThreshold(2);
    setBlockchain('ethereum');
    setDeploymentResult(null);
    setError(null);
  };

  // Show success screen if deployed
  if (deploymentResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            Multi-Sig Wallet Deployed
          </CardTitle>
          <CardDescription>
            Your multi-signature wallet has been successfully deployed on {blockchain}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Address */}
          <div className="space-y-2">
            <Label>Wallet Address</Label>
            <div className="flex items-center gap-2">
              <Input
                value={deploymentResult.address}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(deploymentResult.address);
                  toast({ title: 'Copied', description: 'Address copied to clipboard' });
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* Transaction Hash */}
          <div className="space-y-2">
            <Label>Transaction Hash</Label>
            <div className="flex items-center gap-2">
              <Input
                value={deploymentResult.transactionHash}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(deploymentResult.transactionHash);
                  toast({ title: 'Copied', description: 'Transaction hash copied to clipboard' });
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* Success Info */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your multi-sig wallet is now deployed and ready to use. You can now:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Grant roles to this wallet address</li>
                <li>Create transaction proposals</li>
                <li>Manage on-chain multi-signature operations</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleReset}
            >
              Create Another
            </Button>
            <Button
              onClick={onCancel}
            >
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          Create Multi-Sig Wallet
        </CardTitle>
        <CardDescription>
          Deploy a new multi-signature wallet with custom owners and threshold
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Wallet Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Treasury Wallet"
            disabled={isDeploying}
          />
          <p className="text-xs text-muted-foreground">
            A descriptive name to identify this wallet
          </p>
        </div>

        {/* Blockchain */}
        <div className="space-y-2">
          <Label htmlFor="blockchain">Blockchain *</Label>
          <Select
            value={blockchain}
            onValueChange={setBlockchain}
            disabled={isDeploying}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select blockchain" />
            </SelectTrigger>
            <SelectContent>
              {allChains
                .filter(chain => ['ethereum', 'holesky', 'polygon', 'arbitrum'].includes(chain.name))
                .map(chain => (
                  <SelectItem key={chain.name} value={chain.name}>
                    <span className="flex items-center gap-2">
                      <span>{chain.icon}</span>
                      <span>{chain.label}</span>
                    </span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Network where the wallet will be deployed
          </p>
        </div>

        {/* Owners */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Owners ({owners.filter(o => o).length}) *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOwner}
              disabled={isDeploying || owners.length >= 10}
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Owner
            </Button>
          </div>
          <div className="space-y-2">
            {owners.map((owner, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={owner}
                  onChange={(e) => updateOwner(index, e.target.value)}
                  placeholder="0x..."
                  className="flex-1 font-mono text-sm"
                  disabled={isDeploying}
                />
                {owners.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOwner(index)}
                    disabled={isDeploying}
                  >
                    <MinusIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Ethereum addresses that can sign transactions (minimum 2 owners)
          </p>
        </div>

        {/* Threshold */}
        <div className="space-y-2">
          <Label htmlFor="threshold">
            Required Signatures ({threshold} of {owners.filter(o => o).length}) *
          </Label>
          <div className="flex items-center gap-4">
            <Input
              id="threshold"
              type="number"
              min="1"
              max={owners.filter(o => o).length}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
              className="w-24"
              disabled={isDeploying}
            />
            <div className="flex-1">
              <div className="flex gap-1">
                {Array.from({ length: owners.filter(o => o).length }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded ${
                      i < threshold ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Number of signatures required to execute transactions
          </p>
        </div>

        {/* Threshold Warning */}
        {threshold === owners.filter(o => o).length && owners.filter(o => o).length > 2 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Requiring all owners to sign may make the wallet difficult to use if any owner becomes unavailable.
              Consider using a lower threshold (e.g., {Math.ceil(owners.filter(o => o).length * 0.6)} of {owners.filter(o => o).length}).
            </AlertDescription>
          </Alert>
        )}

        {/* Summary */}
        <div className="rounded-md border p-4 space-y-2">
          <h4 className="font-semibold text-sm">Deployment Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network:</span>
              <Badge variant="outline">{blockchain}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Owners:</span>
              <span className="font-medium">{owners.filter(o => o).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required Signatures:</span>
              <span className="font-medium">{threshold}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Gas:</span>
              <span className="text-muted-foreground">~0.01 ETH</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isDeploying}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleDeploy}
            disabled={isDeploying}
          >
            {isDeploying ? 'Deploying...' : 'Deploy Multi-Sig Wallet'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MultiSigWalletForm;
