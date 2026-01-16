/**
 * XRPL Multi-Sig Setup Form
 * Configure signer list for XRPL account
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, MinusIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { XRPLMultiSigSetupFormProps } from './types';
import { Signer } from '@/services/wallet/ripple/security/types';
import { 
  xrplMultiSigService, 
  xrplMultiSigDatabaseService,
  xrplWalletService 
} from '@/services/wallet/ripple/security';
import { useAuth } from '@/hooks/auth/useAuth';
import { Wallet } from 'xrpl';

export function XRPLMultiSigSetupForm({
  projectId,
  walletAddress,
  onSuccess,
  onCancel
}: XRPLMultiSigSetupFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [signerQuorum, setSignerQuorum] = useState(2);
  const [signers, setSigners] = useState<Signer[]>([
    { account: '', weight: 1 },
    { account: '', weight: 1 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addSigner = () => {
    setSigners([...signers, { account: '', weight: 1 }]);
  };

  const removeSigner = (index: number) => {
    if (signers.length > 1) {
      setSigners(signers.filter((_, i) => i !== index));
    }
  };

  const updateSigner = (index: number, field: keyof Signer, value: string | number) => {
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: value };
    setSigners(updated);
  };

  const totalWeight = signers.reduce((sum, s) => sum + (s.weight || 0), 0);
  const isValid = 
    signers.every(s => s.account && s.weight > 0) && 
    signerQuorum > 0 && 
    signerQuorum <= totalWeight;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      toast({
        title: 'Invalid Configuration',
        description: 'Please ensure all signers have addresses and weights, and quorum is valid.',
        variant: 'destructive'
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to configure multi-sig accounts',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get wallet for the account being configured
      // Uses comprehensive lookup: user_addresses > key_vault_keys > project_wallets
      const wallet = await xrplWalletService.getSignerWallet(
        walletAddress,
        user.id
      );

      // Set signer list on XRPL
      const setupResult = await xrplMultiSigService.setSignerList({
        wallet,
        signerQuorum,
        signers
      });

      // Save to database
      const account = await xrplMultiSigDatabaseService.saveMultiSigAccount(
        projectId,
        walletAddress,
        signerQuorum,
        setupResult
      );

      await xrplMultiSigDatabaseService.saveSigners(
        account.id,
        signers
      );

      toast({
        title: 'Multi-Sig Setup Complete',
        description: `Signer list configured with quorum of ${signerQuorum}`,
      });

      onSuccess?.(signerQuorum, signers);
    } catch (error) {
      console.error('[XRPLMultiSigSetupForm] Setup failed:', error);
      toast({
        title: 'Setup Failed',
        description: error instanceof Error ? error.message : 'Failed to configure multi-sig account',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quorum Configuration */}
      <div className="space-y-2">
        <Label htmlFor="quorum">Signer Quorum</Label>
        <Input
          id="quorum"
          type="number"
          min={1}
          max={totalWeight}
          value={signerQuorum}
          onChange={(e) => setSignerQuorum(parseInt(e.target.value) || 1)}
          placeholder="Required total weight"
        />
        <p className="text-xs text-muted-foreground">
          Total signer weight required to execute transactions (max: {totalWeight})
        </p>
      </div>

      {/* Signers List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Signers</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSigner}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Signer
          </Button>
        </div>

        {signers.map((signer, index) => (
          <Card key={index} className="p-4">
            <div className="grid grid-cols-[1fr,auto,auto] gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor={`signer-${index}`}>
                  Signer {index + 1} Address
                </Label>
                <Input
                  id={`signer-${index}`}
                  value={signer.account}
                  onChange={(e) => updateSigner(index, 'account', e.target.value)}
                  placeholder="r..."
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2 w-24">
                <Label htmlFor={`weight-${index}`}>Weight</Label>
                <Input
                  id={`weight-${index}`}
                  type="number"
                  min={1}
                  value={signer.weight}
                  onChange={(e) => updateSigner(index, 'weight', parseInt(e.target.value) || 1)}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSigner(index)}
                disabled={signers.length === 1}
              >
                <MinusIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Validation Summary */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={totalWeight > 0 ? "default" : "secondary"}>
            Total Weight: {totalWeight}
          </Badge>
          <Badge variant={isValid ? "default" : "secondary"}>
            Quorum: {signerQuorum}
          </Badge>
        </div>

        {!isValid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {signerQuorum > totalWeight && 'Quorum cannot exceed total weight. '}
              {signers.some(s => !s.account) && 'All signers must have addresses. '}
              {signers.some(s => s.weight <= 0) && 'All weights must be positive. '}
            </AlertDescription>
          </Alert>
        )}

        {isValid && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Configuration is valid. Transactions will require signatures with total
              weight of at least {signerQuorum}.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Setting Up...' : 'Set Up Multi-Sig'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
