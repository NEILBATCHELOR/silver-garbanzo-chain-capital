/**
 * Enhanced Redemption Request Form
 * Implements real-time validation based on three core redemption principles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Info,
  Shield,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { enhancedEligibilityService, ValidationResult } from '../services/enhancedEligibilityService';
import { redemptionService } from '../services/redemptionService';
import { CreateRedemptionRequestInput } from '../types/redemption';

interface Props {
  projectId: string;
  investorId: string;
  productType?: string;
  productId?: string;
  onSuccess?: (requestId: string) => void;
  onCancel?: () => void;
}

interface FormData {
  amount: number;
  tokenType: string;
  redemptionType: string;
  sourceWalletAddress: string;
  destinationWalletAddress: string;
  notes: string;
}

interface EligibilityStatus {
  eligible: boolean;
  reasons: string[];
  maxAmount: number;
  windowInfo?: {
    id: string;
    endsAt: string;
    type: 'continuous' | 'window';
  };
  distributionSummary: {
    totalDistributed: number;
    totalRemaining: number;
    totalRedeemable: number;
    distributionCount: number;
  };
}

export const EnhancedRedemptionRequestForm: React.FC<Props> = ({
  projectId,
  investorId,
  productType,
  productId,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState<FormData>({
    amount: 0,
    tokenType: '',
    redemptionType: 'standard',
    sourceWalletAddress: '',
    destinationWalletAddress: '',
    notes: ''
  });

  const [eligibilityStatus, setEligibilityStatus] = useState<EligibilityStatus | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time eligibility checking
  const checkEligibility = useCallback(async () => {
    if (!projectId || !investorId) return;

    try {
      setIsLoading(true);
      const status = await enhancedEligibilityService.getRealtimeEligibilityStatus(
        investorId,
        projectId,
        productType,
        productId
      );
      setEligibilityStatus(status);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setError('Failed to check redemption eligibility');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, investorId, productType, productId]);

  // Validate specific redemption request
  const validateRequest = useCallback(async () => {
    if (!formData.amount || formData.amount <= 0) {
      setValidation(null);
      return;
    }

    try {
      const result = await enhancedEligibilityService.validateRedemptionRequest({
        investor_id: investorId,
        project_id: projectId,
        token_amount: formData.amount,
        product_type: productType,
        product_id: productId
      });
      setValidation(result);
    } catch (error) {
      console.error('Error validating request:', error);
      setValidation({
        valid: false,
        errors: ['Failed to validate redemption request']
      });
    }
  }, [formData.amount, investorId, projectId, productType, productId]);

  // Initial load and real-time updates
  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  // Validate when amount changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateRequest();
    }, 500); // Debounce validation

    return () => clearTimeout(timeoutId);
  }, [validateRequest]);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation?.valid) {
      setError('Please resolve validation errors before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const requestData: CreateRedemptionRequestInput = {
        tokenAmount: formData.amount,
        tokenType: formData.tokenType,
        redemptionType: formData.redemptionType as 'standard' | 'interval',
        sourceWallet: formData.sourceWalletAddress,
        destinationWallet: formData.destinationWalletAddress,
        sourceWalletAddress: formData.sourceWalletAddress, // Keep for backward compatibility
        destinationWalletAddress: formData.destinationWalletAddress, // Keep for backward compatibility
        conversionRate: 1, // This would be calculated based on current rates
        usdcAmount: formData.amount * 1, // Calculate USDC amount based on token amount and conversion rate
        investorName: '', // This would be fetched from investor data
        investorId: investorId,
        projectId: projectId,
        notes: formData.notes
      };

      const response = await redemptionService.createRedemptionRequest(requestData);
      if (response.success && response.data?.id) {
        onSuccess?.(response.data.id);
      } else {
        throw new Error(response.error || 'Failed to create redemption request');
      }
    } catch (error) {
      console.error('Error creating redemption request:', error);
      setError(error instanceof Error ? error.message : 'Failed to create redemption request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEligibilityIcon = () => {
    if (isLoading) return <Clock className="h-4 w-4 animate-spin" />;
    if (eligibilityStatus?.eligible) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getEligibilityVariant = (): "default" | "destructive" => {
    if (!eligibilityStatus) return "default";
    return eligibilityStatus.eligible ? "default" : "destructive";
  };

  return (
    <div className="space-y-6">
      {/* Eligibility Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getEligibilityIcon()}
            Redemption Eligibility Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Clock className="h-6 w-6 animate-spin mr-2" />
              Checking eligibility...
            </div>
          ) : eligibilityStatus ? (
            <div className="space-y-4">
              <Alert variant={getEligibilityVariant()}>
                <AlertTitle>
                  {eligibilityStatus.eligible ? "✅ Eligible for Redemption" : "❌ Not Eligible"}
                </AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1">
                    {eligibilityStatus.reasons.map((reason, idx) => (
                      <li key={idx}>• {reason}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Distribution Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {eligibilityStatus.distributionSummary.distributionCount}
                  </div>
                  <div className="text-sm text-gray-500">Distributions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${eligibilityStatus.distributionSummary.totalDistributed.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Total Distributed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    ${eligibilityStatus.distributionSummary.totalRemaining.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Remaining</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    ${eligibilityStatus.maxAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Max Redeemable</div>
                </div>
              </div>

              {/* Window Information */}
              {eligibilityStatus.windowInfo && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">
                      {eligibilityStatus.windowInfo.type === 'continuous' 
                        ? 'Continuous Redemption Active' 
                        : 'Redemption Window Open'}
                    </span>
                  </div>
                  {eligibilityStatus.windowInfo.type === 'window' && eligibilityStatus.windowInfo.endsAt && (
                    <Badge variant="outline">
                      Ends: {new Date(eligibilityStatus.windowInfo.endsAt).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Failed to load eligibility status</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Redemption Request Form */}
      <Card>
        <CardHeader>
          <CardTitle>Request Redemption</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input with Real-time Validation */}
            <div className="space-y-2">
              <Label htmlFor="amount">Redemption Amount ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={eligibilityStatus?.maxAmount || undefined}
                  value={formData.amount || ''}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount to redeem"
                  className="pl-10"
                  disabled={!eligibilityStatus?.eligible}
                />
              </div>
              {eligibilityStatus?.maxAmount && (
                <div className="text-sm text-gray-500">
                  Maximum: ${eligibilityStatus.maxAmount.toLocaleString()}
                </div>
              )}
              
              {/* Amount Validation */}
              {validation && formData.amount > 0 && (
                <Alert variant={validation.valid ? "default" : "destructive"}>
                  <AlertTitle className="text-sm">
                    {validation.valid ? "✅ Amount Valid" : "❌ Amount Invalid"}
                  </AlertTitle>
                  {!validation.valid && validation.errors.length > 0 && (
                    <AlertDescription className="text-sm">
                      <ul>
                        {validation.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  )}
                </Alert>
              )}
            </div>

            <Separator />

            {/* Token Type */}
            <div className="space-y-2">
              <Label htmlFor="tokenType">Token Type</Label>
              <Input
                id="tokenType"
                value={formData.tokenType}
                onChange={(e) => handleInputChange('tokenType', e.target.value)}
                placeholder="e.g., FUND-TOKEN, EQUITY-TOKEN"
                disabled={!eligibilityStatus?.eligible}
              />
            </div>

            {/* Redemption Type */}
            <div className="space-y-2">
              <Label htmlFor="redemptionType">Redemption Type</Label>
              <select
                id="redemptionType"
                value={formData.redemptionType}
                onChange={(e) => handleInputChange('redemptionType', e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={!eligibilityStatus?.eligible}
              >
                <option value="standard">Standard Redemption</option>
                <option value="interval">Interval Fund Repurchase</option>
              </select>
            </div>

            {/* Wallet Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceWallet">Source Wallet Address</Label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="sourceWallet"
                    value={formData.sourceWalletAddress}
                    onChange={(e) => handleInputChange('sourceWalletAddress', e.target.value)}
                    placeholder="0x..."
                    className="pl-10"
                    disabled={!eligibilityStatus?.eligible}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationWallet">Destination Wallet Address</Label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="destinationWallet"
                    value={formData.destinationWalletAddress}
                    onChange={(e) => handleInputChange('destinationWalletAddress', e.target.value)}
                    placeholder="0x..."
                    className="pl-10"
                    disabled={!eligibilityStatus?.eligible}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Add any additional information about this redemption request..."
                className="w-full p-2 border rounded-md min-h-[80px] resize-y"
                disabled={!eligibilityStatus?.eligible}
              />
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
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
              <Button
                type="submit"
                disabled={
                  !eligibilityStatus?.eligible ||
                  !validation?.valid ||
                  isSubmitting ||
                  !formData.tokenType ||
                  !formData.sourceWalletAddress ||
                  !formData.destinationWalletAddress
                }
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Redemption Process:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Your request will be validated against all business rules</li>
                <li>Multi-signature approval may be required</li>
                <li>Settlement processing will begin after approval</li>
                <li>You'll receive notifications at each step</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedRedemptionRequestForm;
