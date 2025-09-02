import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  ArrowUpDown, 
  BarChart3, 
  Users,
  Repeat,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { 
  moonPayServices,
  OnRampCurrency as MoonpayCurrency,
  PaymentMethod as MoonpayPaymentMethod,
  OnRampLimits as MoonpayLimits
} from "@/services/wallet/moonpay";
import type { 
  MoonpayQuote, 
  MoonpayTransaction
} from "@/services/wallet/moonpay/types";
import { 
  getQuoteDisplayAmount as getDisplayAmount,
  normalizeTransaction as normalizeTransactionData
} from "@/services/wallet/moonpay/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWallet } from "@/services/wallet/WalletContext";

// Import the new enhanced components
import SwapInterface from "./SwapInterface";
import AnalyticsDashboard from "./AnalyticsDashboard";
import CustomerManagement from "./CustomerManagement";

interface MoonpayIntegrationProps {
  onTransactionComplete?: (transaction: MoonpayTransaction) => void;
}

type TransactionType = 'buy' | 'sell';
type IntegrationStep = 'form' | 'quote' | 'payment' | 'processing' | 'success' | 'error';
type ActiveTab = 'trade' | 'swap' | 'analytics' | 'customers';

const POPULAR_CRYPTO_CURRENCIES = [
  { code: 'btc', name: 'Bitcoin', symbol: 'BTC' },
  { code: 'eth', name: 'Ethereum', symbol: 'ETH' },
  { code: 'usdc', name: 'USD Coin', symbol: 'USDC' },
  { code: 'usdt', name: 'Tether', symbol: 'USDT' },
  { code: 'ada', name: 'Cardano', symbol: 'ADA' },
  { code: 'dot', name: 'Polkadot', symbol: 'DOT' },
  { code: 'matic', name: 'Polygon', symbol: 'MATIC' },
  { code: 'sol', name: 'Solana', symbol: 'SOL' }
];

const FIAT_CURRENCIES = [
  { code: 'usd', name: 'US Dollar', symbol: '$' },
  { code: 'eur', name: 'Euro', symbol: '€' },
  { code: 'gbp', name: 'British Pound', symbol: '£' },
  { code: 'cad', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'aud', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'jpy', name: 'Japanese Yen', symbol: '¥' }
];

export const MoonpayIntegration: React.FC<MoonpayIntegrationProps> = ({ onTransactionComplete }) => {
  const { wallets } = useWallet();
  
  // State management
  const [activeTab, setActiveTab] = useState<ActiveTab>('trade');
  const [step, setStep] = useState<IntegrationStep>('form');
  const [transactionType, setTransactionType] = useState<TransactionType>('buy');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [cryptoCurrency, setCryptoCurrency] = useState<string>('btc');
  const [fiatCurrency, setFiatCurrency] = useState<string>('usd');
  const [amount, setAmount] = useState<string>('');
  const [amountType, setAmountType] = useState<'fiat' | 'crypto'>('fiat');
  const [walletAddress, setWalletAddress] = useState<string>('');

  // Data state
  const [supportedCurrencies, setSupportedCurrencies] = useState<MoonpayCurrency[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<MoonpayPaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [quote, setQuote] = useState<MoonpayQuote | null>(null);
  const [limits, setLimits] = useState<MoonpayLimits | null>(null);
  const [transaction, setTransaction] = useState<MoonpayTransaction | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (amount && cryptoCurrency && fiatCurrency) {
      debouncedGetQuote();
    }
  }, [amount, cryptoCurrency, fiatCurrency, transactionType, amountType]);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Check if MoonPay is properly configured
      const apiKey = import.meta.env.VITE_MOONPAY_API_KEY;
      const secretKey = import.meta.env.VITE_MOONPAY_SECRET_KEY;
      
      if (!apiKey || !secretKey) {
        setError('MoonPay integration not configured. Please set VITE_MOONPAY_API_KEY and VITE_MOONPAY_SECRET_KEY environment variables.');
        setSupportedCurrencies([]);
        setPaymentMethods([]);
        return;
      }

      const [currencies, methods] = await Promise.all([
        moonPayServices.onRamp.getSupportedCurrencies(),
        moonPayServices.onRamp.getPaymentMethods(fiatCurrency, cryptoCurrency)
      ]);
      
      setSupportedCurrencies(currencies);
      setPaymentMethods(methods);
      
      if (methods.length > 0) {
        setSelectedPaymentMethod(methods[0].id);
      }
    } catch (err) {
      console.error('Error loading MoonPay data:', err);
      setError('MoonPay service temporarily unavailable. Please try again later.');
      setSupportedCurrencies([]);
      setPaymentMethods([]);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedGetQuote = debounce(getQuote, 1000);

  async function getQuote() {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsLoading(true);
    setError('');

    try {
      let quoteResult: MoonpayQuote;
      
      if (transactionType === 'buy') {
        if (amountType === 'fiat') {
          quoteResult = await moonPayServices.onRamp.getBuyQuote(fiatCurrency, cryptoCurrency, parseFloat(amount));
        } else {
          quoteResult = await moonPayServices.onRamp.getBuyQuote(fiatCurrency, cryptoCurrency, undefined, parseFloat(amount));
        }
      } else {
        if (amountType === 'crypto') {
          quoteResult = await moonPayServices.offRamp.getSellQuote(cryptoCurrency, fiatCurrency, parseFloat(amount));
        } else {
          quoteResult = await moonPayServices.offRamp.getSellQuote(cryptoCurrency, fiatCurrency, undefined, parseFloat(amount));
        }
      }
      
      setQuote(quoteResult);
      
      // Get limits for the selected currency pair
      const limitsResult = await moonPayServices.onRamp.getCustomerLimits(
        transactionType === 'buy' ? fiatCurrency : cryptoCurrency,
        transactionType === 'buy' ? cryptoCurrency : fiatCurrency,
        selectedPaymentMethod
      );
      setLimits(limitsResult);
      
    } catch (err) {
      setError(err.message);
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  }

  const handleProceedToPayment = async () => {
    if (!walletAddress) {
      setError('Please enter a wallet address');
      return;
    }
    
    // Import validators to check wallet address
    const { validateWalletAddress } = await import('@/services/wallet/moonpay/utils/validators');
    if (!validateWalletAddress(walletAddress, cryptoCurrency)) {
      setError('Invalid wallet address for selected cryptocurrency');
      return;
    }

    setStep('payment');
  };

  const handleExecuteTransaction = async () => {
    if (!quote || !walletAddress) return;

    setIsLoading(true);
    setStep('processing');

    try {
      let result: MoonpayTransaction;
      
      if (transactionType === 'buy') {
        result = await moonPayServices.onRamp.createBuyTransaction(
          cryptoCurrency,
          fiatCurrency,
          quote.baseAmount,
          walletAddress,
          window.location.origin + '/wallet?tab=moonpay&status=complete'
        );
      } else {
        result = await moonPayServices.offRamp.createSellTransaction(
          fiatCurrency,
          cryptoCurrency,
          quote.baseAmount,
          walletAddress,
          window.location.origin + '/wallet?tab=moonpay&status=complete'
        );
      }

      setTransaction(result);
      setStep('success');
      
      if (onTransactionComplete) {
        onTransactionComplete(result);
      }
    } catch (err) {
      setError(err.message);
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenWidget = () => {
    if (!walletAddress) {
      setError('Please enter a wallet address');
      return;
    }

    const widgetUrl = moonPayServices.onRamp.generateWidgetUrl(
      cryptoCurrency,
      walletAddress,
      quote?.baseAmount,
      fiatCurrency,
      '#6366f1', // Indigo color
      'en',
      window.location.origin + '/wallet?tab=moonpay&status=complete'
    );

    window.open(widgetUrl, '_blank', 'width=800,height=600');
  };

  const resetForm = () => {
    setStep('form');
    setAmount('');
    setWalletAddress('');
    setQuote(null);
    setTransaction(null);
    setError('');
  };

  const getCryptoInfo = (code: string) => {
    return POPULAR_CRYPTO_CURRENCIES.find(c => c.code === code) || 
           { code, name: code.toUpperCase(), symbol: code.toUpperCase() };
  };

  const getFiatInfo = (code: string) => {
    return FIAT_CURRENCIES.find(f => f.code === code) || 
           { code, name: code.toUpperCase(), symbol: code.toUpperCase() };
  };

  const renderTransactionTypeSelector = () => (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <Card 
        className={`cursor-pointer transition-colors ${
          transactionType === 'buy' 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        }`}
        onClick={() => setTransactionType('buy')}
      >
        <CardContent className="p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2" />
          <h3 className="font-medium">Buy Crypto</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Purchase cryptocurrency
          </p>
        </CardContent>
      </Card>
      
      <Card 
        className={`cursor-pointer transition-colors ${
          transactionType === 'sell' 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        }`}
        onClick={() => setTransactionType('sell')}
      >
        <CardContent className="p-4 text-center">
          <TrendingDown className="w-6 h-6 mx-auto mb-2" />
          <h3 className="font-medium">Sell Crypto</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Convert to fiat currency
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderCurrencySelector = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div className="space-y-2">
        <Label>Cryptocurrency</Label>
        <Select value={cryptoCurrency} onValueChange={setCryptoCurrency}>
          <SelectTrigger>
            <SelectValue>
              <span>{getCryptoInfo(cryptoCurrency).symbol} - {getCryptoInfo(cryptoCurrency).name}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {POPULAR_CRYPTO_CURRENCIES.map((crypto) => (
              <SelectItem key={crypto.code} value={crypto.code}>
                {crypto.symbol} - {crypto.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Fiat Currency</Label>
        <Select value={fiatCurrency} onValueChange={setFiatCurrency}>
          <SelectTrigger>
            <SelectValue>
              <span>{getFiatInfo(fiatCurrency).symbol} - {getFiatInfo(fiatCurrency).name}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FIAT_CURRENCIES.map((fiat) => (
              <SelectItem key={fiat.code} value={fiat.code}>
                {fiat.symbol} - {fiat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderAmountInput = () => (
    <div className="space-y-4 mb-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Amount
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Enter amount in {amountType === 'fiat' ? 'fiat' : 'crypto'} currency</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1"
          />
          <Select value={amountType} onValueChange={(value: 'fiat' | 'crypto') => setAmountType(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fiat">{getFiatInfo(fiatCurrency).symbol}</SelectItem>
              <SelectItem value="crypto">{getCryptoInfo(cryptoCurrency).symbol}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {limits && (
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Daily: {getFiatInfo(fiatCurrency).symbol}{limits.daily.min} - {getFiatInfo(fiatCurrency).symbol}{limits.daily.max}</div>
          <div>Monthly: {getFiatInfo(fiatCurrency).symbol}{limits.monthly.min} - {getFiatInfo(fiatCurrency).symbol}{limits.monthly.max}</div>
        </div>
      )}
    </div>
  );

  const renderWalletInput = () => (
    <div className="space-y-4 mb-4">
      <div className="space-y-2">
        <Label>Wallet Address</Label>
        <Input
          placeholder={`Enter your ${getCryptoInfo(cryptoCurrency).name} address`}
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          className="font-mono text-sm"
        />
        
        {wallets.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Or select from your wallets:</Label>
            <div className="space-y-1">
              {wallets.slice(0, 3).map((wallet) => (
                <Button
                  key={wallet.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setWalletAddress(wallet.address)}
                  className="w-full justify-start"
                >
                  <span className="font-medium">{wallet.name}</span>
                  <span className="text-muted-foreground font-mono text-xs ml-2">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPaymentMethodSelector = () => (
    <div className="space-y-2 mb-4">
      <Label>Payment Method</Label>
      <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {paymentMethods.map((method) => (
            <SelectItem key={method.id} value={method.id}>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>{method.name}</span>
                {method.limits && (
                  <Badge variant="outline" className="text-xs ml-2">
                    ${method.limits.daily.min}-${method.limits.daily.max}/day
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderFormStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          MoonPay Trading
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderTransactionTypeSelector()}
        {renderCurrencySelector()}
        {renderAmountInput()}
        {renderWalletInput()}
        {transactionType === 'buy' && renderPaymentMethodSelector()}

        {quote && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(() => {
                const display = getDisplayAmount(quote, transactionType);
                return (
                  <>
                    <div className="flex justify-between">
                      <span>You {transactionType === 'buy' ? 'pay' : 'sell'}</span>
                      <span className="font-medium">
                        {display.youPay.amount} {display.youPay.currency.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>You receive</span>
                      <span className="font-medium">
                        {display.youReceive.amount} {display.youReceive.currency.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Network fee</span>
                      <span>{getFiatInfo(fiatCurrency).symbol}{quote.fees.network}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>MoonPay fee</span>
                      <span>{getFiatInfo(fiatCurrency).symbol}{quote.fees.moonpay}</span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={handleProceedToPayment}
            disabled={!quote || !walletAddress || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={handleOpenWidget}
            disabled={!walletAddress}
            size="icon"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPaymentStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Payment Confirmation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span>Transaction Type</span>
            <Badge variant={transactionType === 'buy' ? 'default' : 'secondary'}>
              {transactionType === 'buy' ? 'Buy' : 'Sell'} {getCryptoInfo(cryptoCurrency).symbol}
            </Badge>
          </div>
          {quote && (() => {
            const display = getDisplayAmount(quote, transactionType);
            return (
              <>
                <div className="flex justify-between">
                  <span>Amount</span>
                  <span className="font-medium">
                    {display.youReceive.amount} {display.youReceive.currency.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cost</span>
                  <span className="font-medium">
                    {display.total.amount !== undefined 
                      ? `${display.total.amount} ${display.total.currency.toUpperCase()}`
                      : `${display.youPay.amount} ${display.youPay.currency.toUpperCase()}`
                    }
                  </span>
                </div>
              </>
            );
          })()}
          <div className="flex justify-between">
            <span>Wallet</span>
            <span className="font-mono text-sm">
              {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
            </span>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You will be redirected to MoonPay to complete the payment securely.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
            Back
          </Button>
          <Button onClick={handleExecuteTransaction} className="flex-1">
            <CreditCard className="mr-2 h-4 w-4" />
            Complete Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderProcessingStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Processing Transaction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="h-12 w-12 animate-spin" />
          <div className="text-center">
            <div className="font-medium">Creating transaction...</div>
            <div className="text-sm text-muted-foreground mt-1">
              Please wait while we set up your transaction
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSuccessStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Transaction Created
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4 py-6">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <div className="text-center">
            <div className="font-medium">Transaction successfully created!</div>
            <div className="text-sm text-muted-foreground mt-1">
              Complete your payment on MoonPay
            </div>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span>Transaction ID</span>
          </div>
          <div className="font-mono text-sm break-all">
            {transaction?.id}
          </div>
          {transaction && (() => {
            const normalizedTx = normalizeTransactionData(transaction);
            return (
              <>
                <div className="flex justify-between">
                  <span>Status</span>
                  <Badge variant="outline">{normalizedTx.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Type</span>
                  <Badge variant={transactionType === 'buy' ? 'default' : 'secondary'}>
                    {transactionType}
                  </Badge>
                </div>
              </>
            );
          })()}
        </div>

        {transaction && (() => {
          const normalizedTx = normalizeTransactionData(transaction);
          return normalizedTx.redirectUrl ? (
            <Button asChild className="w-full">
              <a href={normalizedTx.redirectUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Complete Payment
              </a>
            </Button>
          ) : null;
        })()}

        <Button variant="outline" onClick={resetForm} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Start New Transaction
        </Button>
      </CardContent>
    </Card>
  );

  const renderErrorStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          Transaction Failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Start Over
          </Button>
          <Button onClick={() => setStep('form')} className="flex-1">
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full space-y-6">
      <Tabs value={activeTab} onValueChange={(value: ActiveTab) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trade" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Trade
          </TabsTrigger>
          <TabsTrigger value="swap" className="flex items-center gap-2">
            <Repeat className="w-4 h-4" />
            Swap
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Customers
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="trade" className="mt-6">
          {step === 'form' && renderFormStep()}
          {step === 'payment' && renderPaymentStep()}
          {step === 'processing' && renderProcessingStep()}
          {step === 'success' && renderSuccessStep()}
          {step === 'error' && renderErrorStep()}
        </TabsContent>
        
        <TabsContent value="swap" className="mt-6">
          <SwapInterface 
            onSwapCompleted={(swapTransaction) => {
              console.log('Swap completed:', swapTransaction);
            }}
          />
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <AnalyticsDashboard />
        </TabsContent>
        
        <TabsContent value="customers" className="mt-6">
          <CustomerManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export default MoonpayIntegration;