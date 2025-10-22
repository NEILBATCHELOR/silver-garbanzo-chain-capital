/**
 * Multi-Sig Transfer Form Component
 * Allows users to create transfer proposals for multi-sig wallets
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { multiSigApprovalService } from '@/services/wallet/multiSig/MultiSigApprovalService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ============================================================================
// INTERFACES
// ============================================================================

interface MultiSigTransferFormProps {
  wallets: Array<{
    id: string;
    name: string;
    address: string;
    blockchain: string;
    threshold: number;
  }>;
  onSuccess?: (proposalId: string) => void;
  onCancel?: () => void;
}

interface FormData {
  walletId: string;
  title: string;
  description: string;
  toAddress: string;
  amount: string;
  tokenAddress: string;
  tokenSymbol: string;
}

interface FormErrors {
  walletId?: string;
  title?: string;
  toAddress?: string;
  amount?: string;
  tokenAddress?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const MultiSigTransferForm: React.FC<MultiSigTransferFormProps> = ({
  wallets,
  onSuccess,
  onCancel
}) => {
  // State
  const [formData, setFormData] = useState<FormData>({
    walletId: '',
    title: '',
    description: '',
    toAddress: '',
    amount: '',
    tokenAddress: '',
    tokenSymbol: 'ETH'
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Selected wallet details
  const selectedWallet = wallets.find(w => w.id === formData.walletId);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.walletId) {
      newErrors.walletId = 'Please select a wallet';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.toAddress.trim()) {
      newErrors.toAddress = 'Destination address is required';
    } else if (!ethers.isAddress(formData.toAddress)) {
      newErrors.toAddress = 'Invalid Ethereum address';
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      try {
        const value = parseFloat(formData.amount);
        if (isNaN(value) || value <= 0) {
          newErrors.amount = 'Amount must be greater than 0';
        }
      } catch {
        newErrors.amount = 'Invalid amount';
      }
    }

    if (formData.tokenAddress && !ethers.isAddress(formData.tokenAddress)) {
      newErrors.tokenAddress = 'Invalid token address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleInputChange = (
    field: keyof FormData,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous states
    setSubmitError(null);
    setSubmitSuccess(null);

    // Validate
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create proposal
      const proposal = await multiSigApprovalService.createTransferProposal({
        walletId: formData.walletId,
        title: formData.title,
        description: formData.description,
        toAddress: formData.toAddress,
        amount: formData.amount,
        tokenAddress: formData.tokenAddress || undefined,
        tokenSymbol: formData.tokenSymbol
      });

      setSubmitSuccess(
        `Proposal created successfully! ID: ${proposal.id}`
      );

      // Reset form
      setFormData({
        walletId: '',
        title: '',
        description: '',
        toAddress: '',
        amount: '',
        tokenAddress: '',
        tokenSymbol: 'ETH'
      });

      // Notify parent
      if (onSuccess) {
        onSuccess(proposal.id);
      }
    } catch (error: any) {
      console.error('Failed to create proposal:', error);
      setSubmitError(error.message || 'Failed to create proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      walletId: '',
      title: '',
      description: '',
      toAddress: '',
      amount: '',
      tokenAddress: '',
      tokenSymbol: 'ETH'
    });
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Transfer Proposal</CardTitle>
        <CardDescription>
          Initiate a transfer from a multi-sig wallet. This will create a proposal
          that requires approval from {selectedWallet?.threshold || 'the required number of'} owner(s).
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Wallet Selection */}
          <div className="space-y-2">
            <Label htmlFor="wallet">Multi-Sig Wallet *</Label>
            <Select
              value={formData.walletId}
              onValueChange={(value) => handleInputChange('walletId', value)}
            >
              <SelectTrigger id="wallet" className={errors.walletId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select wallet..." />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.name} ({wallet.address.slice(0, 6)}...{wallet.address.slice(-4)})
                    - Threshold: {wallet.threshold}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.walletId && (
              <p className="text-sm text-red-500">{errors.walletId}</p>
            )}
          </div>

          {/* Wallet Info Display */}
          {selectedWallet && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Blockchain:</span>
                  <span className="ml-2 font-medium">{selectedWallet.blockchain}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Signatures Required:</span>
                  <span className="ml-2 font-medium">{selectedWallet.threshold}</span>
                </div>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Proposal Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Monthly Payment to Vendor"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide additional context for this transfer..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Destination Address */}
          <div className="space-y-2">
            <Label htmlFor="toAddress">Destination Address *</Label>
            <Input
              id="toAddress"
              placeholder="0x..."
              value={formData.toAddress}
              onChange={(e) => handleInputChange('toAddress', e.target.value)}
              className={errors.toAddress ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.toAddress && (
              <p className="text-sm text-red-500">{errors.toAddress}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.000001"
                placeholder="0.0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                className={errors.amount ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              <Input
                placeholder="Symbol"
                value={formData.tokenSymbol}
                onChange={(e) => handleInputChange('tokenSymbol', e.target.value)}
                className="w-24"
                disabled={isSubmitting}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* Token Address (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="tokenAddress">Token Address (Optional)</Label>
            <Input
              id="tokenAddress"
              placeholder="0x... (leave empty for native token)"
              value={formData.tokenAddress}
              onChange={(e) => handleInputChange('tokenAddress', e.target.value)}
              className={errors.tokenAddress ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.tokenAddress && (
              <p className="text-sm text-red-500">{errors.tokenAddress}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty to transfer native tokens (ETH, MATIC, etc.)
            </p>
          </div>

          {/* Error Alert */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {submitSuccess && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                {submitSuccess}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel || handleReset}
              disabled={isSubmitting}
            >
              {onCancel ? 'Cancel' : 'Reset'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.walletId}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Proposal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
