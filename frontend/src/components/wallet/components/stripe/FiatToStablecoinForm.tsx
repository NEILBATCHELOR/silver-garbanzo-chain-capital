// FIAT to Stablecoin Form Component
// Phase 3: Frontend Components

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, ArrowRight, Info, ExternalLink } from 'lucide-react';
import { 
  conversionService, 
  getSupportedStablecoins, 
  getSupportedNetworks, 
  getSupportedFiatCurrencies,
  formatCurrencyAmount,
  calculateStripeFees,
  estimateNetworkFees,
  getTransactionLimits
} from '@/services/wallet/stripe';
import type { FiatToStablecoinParams, FiatToStablecoinResponse } from '@/services/wallet/stripe/types';

// Form validation schema
const fiatToStablecoinSchema = z.object({
  fiatAmount: z.number().min(10, 'Minimum amount is $10').max(10000, 'Maximum amount is $10,000'),
  fiatCurrency: z.enum(['USD', 'EUR', 'GBP']),
  targetStablecoin: z.enum(['USDC', 'USDB']),
  targetNetwork: z.enum(['ethereum', 'solana', 'polygon']),
  walletAddress: z.string().min(1, 'Wallet address is required')
});

type FiatToStablecoinFormData = z.infer<typeof fiatToStablecoinSchema>;

interface FiatToStablecoinFormProps {
  userId: string;
  onSuccess?: (response: FiatToStablecoinResponse) => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * FiatToStablecoinForm - Form for converting FIAT currency to stablecoins
 * Integrates with Stripe Checkout for payment processing
 */
export const FiatToStablecoinForm: React.FC<FiatToStablecoinFormProps> = ({
  userId,
  onSuccess,
  onError,
  className
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedAmount, setEstimatedAmount] = useState<number>(0);
  const [fees, setFees] = useState({ stripeFee: 0, networkFee: 0, totalFees: 0 });
  const [exchangeRate, setExchangeRate] = useState<number>(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<FiatToStablecoinFormData>({
    resolver: zodResolver(fiatToStablecoinSchema),
    defaultValues: {
      fiatCurrency: 'USD',
      targetStablecoin: 'USDC',
      targetNetwork: 'ethereum'
    },
    mode: 'onChange'
  });

  const watchedValues = watch();
  const limits = getTransactionLimits();

  // Calculate fees and estimated amount when values change
  useEffect(() => {
    if (watchedValues.fiatAmount && watchedValues.targetNetwork && watchedValues.targetStablecoin) {
      const stripeFee = calculateStripeFees(watchedValues.fiatAmount, 'fiat_to_crypto');
      const networkFee = estimateNetworkFees(watchedValues.targetNetwork, watchedValues.targetStablecoin);
      const totalFees = stripeFee + networkFee;
      const estimated = (watchedValues.fiatAmount - totalFees) * exchangeRate;

      setFees({ stripeFee, networkFee, totalFees });
      setEstimatedAmount(Math.max(0, estimated));
    }
  }, [watchedValues.fiatAmount, watchedValues.targetNetwork, watchedValues.targetStablecoin, exchangeRate]);

  const onSubmit = async (data: FiatToStablecoinFormData) => {
    if (!isValid || isLoading) return;

    setIsLoading(true);

    try {
      const params: FiatToStablecoinParams = {
        userId,
        fiatAmount: data.fiatAmount,
        fiatCurrency: data.fiatCurrency,
        targetStablecoin: data.targetStablecoin,
        targetNetwork: data.targetNetwork,
        walletAddress: data.walletAddress,
        metadata: {
          source: 'wallet_interface',
          timestamp: new Date().toISOString()
        }
      };

      const response = await conversionService.createFiatToStablecoinSession(params);

      if (response.success && response.data) {
        onSuccess?.(response.data);
        
        // Redirect to Stripe Checkout
        if (response.data.sessionId) {
          const { loadStripe } = await import('@stripe/stripe-js');
          const stripeInstance = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
          
          if (stripeInstance) {
            const { error } = await stripeInstance.redirectToCheckout({
              sessionId: response.data.sessionId
            });
            
            if (error) {
              throw new Error(error.message);
            }
          }
        }
      } else {
        throw new Error(response.error || 'Failed to create conversion session');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Buy Stablecoins with FIAT
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="fiatAmount">Amount to Convert</Label>
            <div className="relative">
              <Input
                id="fiatAmount"
                type="number"
                step="0.01"
                min={limits.minConversionAmount}
                max={limits.maxConversionAmount}
                {...register('fiatAmount', { valueAsNumber: true })}
                placeholder="Enter amount"
                className="pr-16"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Select value={watchedValues.fiatCurrency} onValueChange={(value) => setValue('fiatCurrency', value as any)}>
                  <SelectTrigger className="w-20 h-8 border-0 bg-transparent p-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getSupportedFiatCurrencies().map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {errors.fiatAmount && (
              <p className="text-sm text-red-600">{errors.fiatAmount.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Min: {formatCurrencyAmount(limits.minConversionAmount, watchedValues.fiatCurrency || 'USD')} • 
              Max: {formatCurrencyAmount(limits.maxConversionAmount, watchedValues.fiatCurrency || 'USD')}
            </p>
          </div>

          {/* Target Stablecoin */}
          <div className="space-y-2">
            <Label htmlFor="targetStablecoin">Stablecoin</Label>
            <Select value={watchedValues.targetStablecoin} onValueChange={(value) => setValue('targetStablecoin', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select stablecoin" />
              </SelectTrigger>
              <SelectContent>
                {getSupportedStablecoins().map((coin) => (
                  <SelectItem key={coin} value={coin}>
                    <div className="flex items-center gap-2">
                      <span>{coin}</span>
                      {coin === 'USDC' && <Badge variant="secondary">Most Popular</Badge>}
                      {coin === 'USDB' && <Badge variant="outline">Bridge Protocol</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Network */}
          <div className="space-y-2">
            <Label htmlFor="targetNetwork">Blockchain Network</Label>
            <Select value={watchedValues.targetNetwork} onValueChange={(value) => setValue('targetNetwork', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                {getSupportedNetworks().map((network) => (
                  <SelectItem key={network} value={network}>
                    <div className="flex items-center justify-between w-full">
                      <span className="capitalize">{network}</span>
                      <Badge variant="outline" className="text-xs">
                        {network === 'ethereum' && 'High Fees'}
                        {network === 'solana' && 'Low Fees'}
                        {network === 'polygon' && 'Low Fees'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <Label htmlFor="walletAddress">
              Receiving Wallet Address ({watchedValues.targetNetwork || 'Select network'})
            </Label>
            <Input
              id="walletAddress"
              {...register('walletAddress')}
              placeholder={
                watchedValues.targetNetwork === 'solana' 
                  ? 'Enter Solana wallet address...'
                  : 'Enter wallet address (0x...)...'
              }
            />
            {errors.walletAddress && (
              <p className="text-sm text-red-600">{errors.walletAddress.message}</p>
            )}
          </div>

          {/* Conversion Preview */}
          {watchedValues.fiatAmount && estimatedAmount > 0 && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Info className="w-4 h-4" />
                Conversion Preview
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>{formatCurrencyAmount(watchedValues.fiatAmount, watchedValues.fiatCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stripe Fee (1.5%):</span>
                  <span>-{formatCurrencyAmount(fees.stripeFee, watchedValues.fiatCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Fee:</span>
                  <span>-{formatCurrencyAmount(fees.networkFee, watchedValues.fiatCurrency)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>You'll receive:</span>
                  <span className="text-green-600">
                    {formatCurrencyAmount(estimatedAmount, watchedValues.targetStablecoin)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowRight className="w-3 h-3" />
                <span>Exchange rate: 1 {watchedValues.fiatCurrency} = {exchangeRate} {watchedValues.targetStablecoin}</span>
              </div>
            </div>
          )}

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your payment will be processed securely by Stripe. After successful payment, 
              {watchedValues.targetStablecoin || 'stablecoins'} will be transferred to your wallet 
              on the {watchedValues.targetNetwork || 'selected'} network.
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={!isValid || isLoading || estimatedAmount <= 0}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Session...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Proceed to Payment
                <ExternalLink className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          {/* Powered by Stripe */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Powered by{' '}
              <a 
                href="https://stripe.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                Stripe
              </a>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FiatToStablecoinForm;
