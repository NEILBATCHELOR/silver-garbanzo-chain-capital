/**
 * DeployStataTokenModal Component
 * Admin interface for deploying new StataTokens
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { isAddress } from 'viem';
import { useAccount } from 'wagmi';
import { useDeployStataToken } from '@/hooks/trade-finance';
import { toast } from 'sonner';

interface DeployStataTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (stataTokenAddress: string) => void;
}

const COMMODITY_TYPES = [
  'GOLD',
  'SILVER',
  'PLATINUM',
  'PALLADIUM',
  'CRUDE_OIL',
  'NATURAL_GAS',
  'WHEAT',
  'CORN',
  'SOYBEANS',
  'COFFEE',
  'COPPER',
  'ALUMINUM',
  'CARBON_CREDITS',
] as const;

export function DeployStataTokenModal({
  isOpen,
  onClose,
  onSuccess,
}: DeployStataTokenModalProps) {
  const [formData, setFormData] = useState({
    ctokenAddress: '',
    underlyingAddress: '',
    commodityType: '',
    name: '',
    symbol: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deploymentStep, setDeploymentStep] = useState<
    'idle' | 'deploying' | 'registering' | 'success'
  >('idle');

  const { address } = useAccount();
  const deployMutation = useDeployStataToken();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.ctokenAddress || !isAddress(formData.ctokenAddress)) {
      newErrors.ctokenAddress = 'Valid cToken address required';
    }

    if (!formData.underlyingAddress || !isAddress(formData.underlyingAddress)) {
      newErrors.underlyingAddress = 'Valid underlying address required';
    }

    if (!formData.commodityType) {
      newErrors.commodityType = 'Commodity type required';
    }

    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }

    if (!formData.symbol || formData.symbol.length < 2) {
      newErrors.symbol = 'Symbol must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDeploy = async () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    if (!address) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      setDeploymentStep('deploying');
      toast.info('Deploying StataToken contract...');

      // Call the deploy mutation which will:
      // 1. Deploy the contract via smart contract call
      // 2. Register in the database
      const result = await deployMutation.mutateAsync({
        stataTokenAddress: '0x0000000000000000000000000000000000000000', // Placeholder, will be updated by backend
        ctokenAddress: formData.ctokenAddress,
        underlyingAddress: formData.underlyingAddress,
        commodityType: formData.commodityType,
        name: formData.name,
        symbol: formData.symbol,
        deployerAddress: address,
      });

      setDeploymentStep('success');
      toast.success('StataToken deployed successfully!');

      if (onSuccess && result.stataTokenAddress) {
        onSuccess(result.stataTokenAddress);
      }

      // Close after short delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Deployment failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Deployment failed'
      );
      setDeploymentStep('idle');
    }
  };

  const handleClose = () => {
    setFormData({
      ctokenAddress: '',
      underlyingAddress: '',
      commodityType: '',
      name: '',
      symbol: '',
    });
    setErrors({});
    setDeploymentStep('idle');
    onClose();
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const isDeploying = deploymentStep !== 'idle' && deploymentStep !== 'success';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Deploy New StataToken</DialogTitle>
          <DialogDescription>
            Deploy an ERC4626 wrapped token for auto-compounding cToken yields
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Deployment Status */}
          {deploymentStep !== 'idle' && (
            <Alert variant={deploymentStep === 'success' ? 'default' : 'default'}>
              {deploymentStep === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <AlertDescription>
                {deploymentStep === 'deploying' && 'Deploying contract...'}
                {deploymentStep === 'registering' && 'Registering in database...'}
                {deploymentStep === 'success' && 'Deployment successful!'}
              </AlertDescription>
            </Alert>
          )}

          {/* cToken Address */}
          <div className="space-y-2">
            <Label htmlFor="ctokenAddress">
              cToken Address *
            </Label>
            <Input
              id="ctokenAddress"
              placeholder="0x..."
              value={formData.ctokenAddress}
              onChange={(e) => updateField('ctokenAddress', e.target.value)}
              disabled={isDeploying}
              className={errors.ctokenAddress ? 'border-destructive' : ''}
            />
            {errors.ctokenAddress && (
              <p className="text-sm text-destructive">{errors.ctokenAddress}</p>
            )}
          </div>

          {/* Underlying Address */}
          <div className="space-y-2">
            <Label htmlFor="underlyingAddress">
              Underlying Asset Address *
            </Label>
            <Input
              id="underlyingAddress"
              placeholder="0x..."
              value={formData.underlyingAddress}
              onChange={(e) => updateField('underlyingAddress', e.target.value)}
              disabled={isDeploying}
              className={errors.underlyingAddress ? 'border-destructive' : ''}
            />
            {errors.underlyingAddress && (
              <p className="text-sm text-destructive">
                {errors.underlyingAddress}
              </p>
            )}
          </div>

          {/* Commodity Type */}
          <div className="space-y-2">
            <Label htmlFor="commodityType">Commodity Type *</Label>
            <Select
              value={formData.commodityType}
              onValueChange={(value) => updateField('commodityType', value)}
              disabled={isDeploying}
            >
              <SelectTrigger
                className={errors.commodityType ? 'border-destructive' : ''}
              >
                <SelectValue placeholder="Select commodity type" />
              </SelectTrigger>
              <SelectContent>
                {COMMODITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.commodityType && (
              <p className="text-sm text-destructive">{errors.commodityType}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Token Name *</Label>
            <Input
              id="name"
              placeholder="Stata Gold cToken"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              disabled={isDeploying}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Symbol */}
          <div className="space-y-2">
            <Label htmlFor="symbol">Token Symbol *</Label>
            <Input
              id="symbol"
              placeholder="stGoldC"
              value={formData.symbol}
              onChange={(e) => updateField('symbol', e.target.value.toUpperCase())}
              disabled={isDeploying}
              className={errors.symbol ? 'border-destructive' : ''}
            />
            {errors.symbol && (
              <p className="text-sm text-destructive">{errors.symbol}</p>
            )}
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This will deploy a new StataToken contract and register it in the
              system. Ensure all addresses are correct before proceeding.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeploying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={isDeploying || deploymentStep === 'success'}
          >
            {isDeploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deploymentStep === 'success' ? 'Deployed!' : 'Deploy StataToken'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
