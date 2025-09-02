// Stablecoin to FIAT Form Component
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
import { Loader2, Banknote, ArrowRight, Info, Clock } from 'lucide-react';
import { 
  conversionService,
  stablecoinAccountService,
  getSupportedStablecoins, 
  getSupportedFiatCurrencies,
  formatCurrencyAmount,
  calculateStripeFees,
  estimateNetworkFees
} from '@/services/wallet/stripe';
import type { 
  StablecoinToFiatParams, 
  StablecoinToFiatResponse,
  StablecoinAccount 
} from '@/services/wallet/stripe/types';

// Form validation schema
const stablecoinToFiatSchema = z.object({
  stablecoinAmount: z.number().min(1, 'Minimum amount is 1'),
  stablecoin: z.enum(['USDC', 'USDB']),
  sourceNetwork: z.string().min(1, 'Source network is required'),
  targetFiatCurrency: z.enum(['USD', 'EUR', 'GBP']),
  targetBankAccount: z.string().min(1, 'Bank account is required')
});

type StablecoinToFiatFormData = z.infer<typeof stablecoinToFiatSchema>;

interface StablecoinToFiatFormProps {
  userId: string;
  onSuccess?: (response: StablecoinToFiatResponse) => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * StablecoinToFiatForm - Form for converting stablecoins to FIAT currency
 * Integrates with Stripe financial accounts for bank transfers
 */
export const StablecoinToFiatForm: React.FC<StablecoinToFiatFormProps> = ({
  userId,
  onSuccess,
  onError,
  className
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [stablecoinAccount, setStablecoinAccount] = useState<StablecoinAccount | null>(null);
  const [estimatedAmount, setEstimatedAmount] = useState<number>(0);
  const [fees, setFees] = useState({ stripeFee: 0, networkFee: 0, totalFees: 0 });
  const [exchangeRate, setExchangeRate] = useState<number>(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<StablecoinToFiatFormData>({
    resolver: zodResolver(stablecoinToFiatSchema),
    defaultValues: {
      stablecoin: 'USDC',
      targetFiatCurrency: 'USD'
    },
    mode: 'onChange'
  });

  const watchedValues = watch();

  // Load user's stablecoin account balance
  useEffect(() => {
    const loadBalance = async () => {
      setLoadingBalance(true);
      try {
        const response = await stablecoinAccountService.getAccountByUserId(userId);
        if (response.success && response.data) {
          setStablecoinAccount(response.data);
        }
      } catch (error) {
        console.error('Failed to load balance:', error);
      } finally {
        setLoadingBalance(false);
      }
    };

    if (userId) {
      loadBalance();
    }
  }, [userId]);

  // Calculate fees and estimated amount when values change
  useEffect(() => {
    if (watchedValues.stablecoinAmount && watchedValues.stablecoin && watchedValues.targetFiatCurrency) {
      const stripeFee = calculateStripeFees(watchedValues.stablecoinAmount, 'crypto_to_fiat');
      const networkFee = estimateNetworkFees('ethereum', watchedValues.stablecoin); // Default to ethereum for fees
      const totalFees = stripeFee + networkFee;
      const estimated = (watchedValues.stablecoinAmount * exchangeRate) - totalFees;

      setFees({ stripeFee, networkFee, totalFees });
      setEstimatedAmount(Math.max(0, estimated));
    }
  }, [watchedValues.stablecoinAmount, watchedValues.stablecoin, watchedValues.targetFiatCurrency, exchangeRate]);

  const getAvailableBalance = (): number => {
    if (!stablecoinAccount) return 0;
    return watchedValues.stablecoin === 'USDC' 
      ? stablecoinAccount.balanceUsdc 
      : stablecoinAccount.balanceUsdb;
  };

  const setMaxAmount = () => {
    const balance = getAvailableBalance();
    setValue('stablecoinAmount', balance, { shouldValidate: true });
  };

  const onSubmit = async (data: StablecoinToFiatFormData) => {
    if (!isValid || isLoading) return;

    const availableBalance = getAvailableBalance();
    if (data.stablecoinAmount > availableBalance) {
      onError?.('Insufficient balance');
      return;
    }

    setIsLoading(true);

    try {
      const params: StablecoinToFiatParams = {
        userId,
        stablecoinAmount: data.stablecoinAmount,
        stablecoin: data.stablecoin,
        sourceNetwork: data.sourceNetwork,
        targetFiatCurrency: data.targetFiatCurrency,
        targetBankAccount: data.targetBankAccount,
        metadata: {
          source: 'wallet_interface',
          timestamp: new Date().toISOString()
        }
      };

      const response = await conversionService.createStablecoinToFiatConversion(params);

      if (response.success && response.data) {
        onSuccess?.(response.data);
      } else {
        throw new Error(response.error || 'Failed to create conversion');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const availableBalance = getAvailableBalance();
  const hasInsufficientBalance = watchedValues.stablecoinAmount > availableBalance;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          Convert Stablecoins to FIAT
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Balance Display */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-3">Available Balances</h4>
            {loadingBalance ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading balances...</span>
              </div>
            ) : stablecoinAccount ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrencyAmount(stablecoinAccount.balanceUsdc, 'USDC')}
                  </div>
                  <div className="text-sm text-muted-foreground">USDC</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrencyAmount(stablecoinAccount.balanceUsdb, 'USDB')}
                  </div>
                  <div className="text-sm text-muted-foreground">USDB</div>
                </div>
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No stablecoin account found. You'll need to set up a Stripe financial account first.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Stablecoin Selection */}
          <div className="space-y-2">
            <Label htmlFor="stablecoin">Stablecoin to Convert</Label>
            <Select value={watchedValues.stablecoin} onValueChange={(value) => setValue('stablecoin', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select stablecoin" />
              </SelectTrigger>
              <SelectContent>
                {getSupportedStablecoins().map((coin) => (
                  <SelectItem key={coin} value={coin}>
                    <div className="flex items-center justify-between w-full">
                      <span>{coin}</span>
                      <span className="text-sm text-muted-foreground">
                        Balance: {coin === 'USDC' ? stablecoinAccount?.balanceUsdc || 0 : stablecoinAccount?.balanceUsdb || 0}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="stablecoinAmount">Amount to Convert</Label>
            <div className="relative">
              <Input
                id="stablecoinAmount"
                type="number"
                step="0.000001"
                min={0}
                max={availableBalance}
                {...register('stablecoinAmount', { valueAsNumber: true })}
                placeholder="Enter amount"
                className={hasInsufficientBalance ? 'border-red-500' : ''}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 text-xs"
                onClick={setMaxAmount}
                disabled={availableBalance === 0}
              >
                Max
              </Button>
            </div>
            {errors.stablecoinAmount && (
              <p className="text-sm text-red-600">{errors.stablecoinAmount.message}</p>
            )}
            {hasInsufficientBalance && (
              <p className="text-sm text-red-600">
                Insufficient balance. Available: {formatCurrencyAmount(availableBalance, watchedValues.stablecoin)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Available: {formatCurrencyAmount(availableBalance, watchedValues.stablecoin || 'USDC')}
            </p>
          </div>

          {/* Source Network */}
          <div className="space-y-2">
            <Label htmlFor="sourceNetwork">Source Network</Label>
            <Select value={watchedValues.sourceNetwork} onValueChange={(value) => setValue('sourceNetwork', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select source network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ethereum">
                  <div className="flex items-center justify-between w-full">
                    <span>Ethereum</span>
                    <Badge variant="outline">High Fees</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="solana">
                  <div className="flex items-center justify-between w-full">
                    <span>Solana</span>
                    <Badge variant="outline">Low Fees</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="polygon">
                  <div className="flex items-center justify-between w-full">
                    <span>Polygon</span>
                    <Badge variant="outline">Low Fees</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target FIAT Currency */}
          <div className="space-y-2">
            <Label htmlFor="targetFiatCurrency">Target Currency</Label>
            <Select value={watchedValues.targetFiatCurrency} onValueChange={(value) => setValue('targetFiatCurrency', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
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

          {/* Bank Account */}
          <div className="space-y-2">
            <Label htmlFor="targetBankAccount">Bank Account</Label>
            <Input
              id="targetBankAccount"
              {...register('targetBankAccount')}
              placeholder="Select or add bank account..."
              // In production, this would be a dropdown of saved bank accounts
            />
            {errors.targetBankAccount && (
              <p className="text-sm text-red-600">{errors.targetBankAccount.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Bank accounts are managed securely by Stripe
            </p>
          </div>

          {/* Conversion Preview */}
          {watchedValues.stablecoinAmount && estimatedAmount > 0 && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Info className="w-4 h-4" />
                Conversion Preview
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>{formatCurrencyAmount(watchedValues.stablecoinAmount, watchedValues.stablecoin)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stripe Fee (1.0%):</span>
                  <span>-{formatCurrencyAmount(fees.stripeFee, watchedValues.targetFiatCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Fee:</span>
                  <span>-{formatCurrencyAmount(fees.networkFee, watchedValues.targetFiatCurrency)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>You'll receive:</span>
                  <span className="text-green-600">
                    {formatCurrencyAmount(estimatedAmount, watchedValues.targetFiatCurrency)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowRight className="w-3 h-3" />
                <span>Exchange rate: 1 {watchedValues.stablecoin} = {exchangeRate} {watchedValues.targetFiatCurrency}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Estimated arrival: 1-3 business days</span>
              </div>
            </div>
          )}

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your stablecoins will be converted to {watchedValues.targetFiatCurrency || 'FIAT'} and transferred 
              to your bank account via Stripe. This process typically takes 1-3 business days.
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={!isValid || isLoading || estimatedAmount <= 0 || hasInsufficientBalance || !stablecoinAccount}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Conversion...
              </>
            ) : (
              <>
                <Banknote className="w-4 h-4 mr-2" />
                Convert to {watchedValues.targetFiatCurrency || 'FIAT'}
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

export default StablecoinToFiatForm;
