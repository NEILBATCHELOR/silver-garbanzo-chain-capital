import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Globe, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Info,
  MapPin,
  CreditCard,
  Send,
  Building2,
  RefreshCw,
  Activity
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { 
  RipplePaymentsService,
  RipplePaymentParams,
  RippleQuote,
  RipplePaymentResult
} from "@/services/wallet/ripple/RipplePaymentsService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RipplePaymentsProps {
  onPaymentComplete?: (result: RipplePaymentResult) => void;
}

type PaymentType = 'domestic' | 'cross-border' | 'crypto';
type PaymentStep = 'form' | 'quote' | 'confirm' | 'processing' | 'success' | 'error';

const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'XRP', name: 'XRP', symbol: 'XRP' },
  { code: 'BTC', name: 'Bitcoin', symbol: 'BTC' },
  { code: 'ETH', name: 'Ethereum', symbol: 'ETH' }
];

const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'MX', name: 'Mexico' },
  { code: 'PH', name: 'Philippines' },
  { code: 'IN', name: 'India' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' }
];

export const RipplePayments: React.FC<RipplePaymentsProps> = ({ onPaymentComplete }) => {
  const [paymentService, setPaymentService] = useState<RipplePaymentsService | null>(null);
  const [step, setStep] = useState<PaymentStep>('form');
  const [paymentType, setPaymentType] = useState<PaymentType>('cross-border');
  
  // Form state
  const [fromAccount, setFromAccount] = useState<string>('');
  const [toAccount, setToAccount] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('MXN');
  const [fromCountry, setFromCountry] = useState<string>('US');
  const [toCountry, setToCountry] = useState<string>('MX');
  const [destinationTag, setDestinationTag] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  
  // Quote and result state
  const [quote, setQuote] = useState<RippleQuote | null>(null);
  const [result, setResult] = useState<RipplePaymentResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Recipient details for cross-border payments
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [routingCode, setRoutingCode] = useState<string>('');

  useEffect(() => {
    // Initialize Ripple service safely
    const initializeService = async () => {
      try {
        const service = new RipplePaymentsService();
        await service.initialize();
        setPaymentService(service);
      } catch (error) {
        console.error('Failed to initialize Ripple service:', error);
        setError('Failed to initialize Ripple service. Please try again.');
      }
    };

    if (!paymentService) {
      initializeService();
    }
  }, [paymentService]);

  const handleGetQuote = async () => {
    if (!paymentService) {
      setError('Payment service not initialized. Please wait.');
      return;
    }

    if (!amount || !fromCurrency || !toCurrency) {
      setError('Please fill all required fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const quoteResult = await paymentService.getPaymentQuote(
        fromCurrency,
        toCurrency,
        amount,
        paymentType === 'cross-border' ? fromCountry : undefined,
        paymentType === 'cross-border' ? toCountry : undefined
      );
      
      setQuote(quoteResult);
      setStep('quote');
    } catch (err) {
      setError(err.message);
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecutePayment = async () => {
    if (!paymentService) {
      setError('Payment service not initialized. Please wait.');
      return;
    }

    setIsLoading(true);
    setStep('processing');

    try {
      let paymentResult;

      if (paymentType === 'cross-border') {
        // Use Ripple Payments Direct API for cross-border
        const { paymentId } = await paymentService.createCrossBorderPayment(
          fromCountry,
          toCountry,
          fromCurrency,
          toCurrency,
          amount,
          {
            name: recipientName,
            address: recipientAddress,
            accountNumber: accountNumber || undefined,
            routingCode: routingCode || undefined
          }
        );

        paymentResult = {
          hash: paymentId,
          ledgerVersion: 0,
          status: 'pending' as const,
          fee: quote?.fee || '0',
          sequence: 0
        };
      } else {
        // Direct XRP ledger payment
        const paymentParams: RipplePaymentParams = {
          fromAccount,
          toAccount,
          amount,
          currency: fromCurrency,
          destinationTag: destinationTag || undefined,
          memo: memo || undefined
        };

        paymentResult = await paymentService.executePayment(paymentParams);
      }

      setResult(paymentResult);
      setStep('success');
      
      if (onPaymentComplete) {
        onPaymentComplete(paymentResult);
      }
    } catch (err) {
      setError(err.message);
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('form');
    setAmount('');
    setFromAccount('');
    setToAccount('');
    setDestinationTag('');
    setMemo('');
    setRecipientName('');
    setRecipientAddress('');
    setAccountNumber('');
    setRoutingCode('');
    setQuote(null);
    setResult(null);
    setError('');
  };

  const renderPaymentTypeSelector = () => (
    <div className="space-y-3 mb-6">
      <Label>Payment Type</Label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card 
          className={`cursor-pointer transition-colors ${
            paymentType === 'cross-border' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => setPaymentType('cross-border')}
        >
          <CardContent className="p-3 text-center">
            <Globe className="w-5 h-5 mx-auto mb-2" />
            <h3 className="font-medium text-sm">Cross-Border</h3>
            <p className="text-xs text-muted-foreground mt-1">International payments</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors ${
            paymentType === 'domestic' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => setPaymentType('domestic')}
        >
          <CardContent className="p-3 text-center">
            <Building2 className="w-5 h-5 mx-auto mb-2" />
            <h3 className="font-medium text-sm">Domestic</h3>
            <p className="text-xs text-muted-foreground mt-1">Local payments</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors ${
            paymentType === 'crypto' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => setPaymentType('crypto')}
        >
          <CardContent className="p-3 text-center">
            <Activity className="w-5 h-5 mx-auto mb-2" />
            <h3 className="font-medium text-sm">Crypto</h3>
            <p className="text-xs text-muted-foreground mt-1">XRP ledger</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCurrencySelector = (
    value: string,
    onChange: (value: string) => void,
    label: string
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue>
            <span>{value} - {SUPPORTED_CURRENCIES.find(c => c.code === value)?.name}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_CURRENCIES.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.code} - {currency.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderCountrySelector = (
    value: string,
    onChange: (value: string) => void,
    label: string
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{SUPPORTED_COUNTRIES.find(c => c.code === value)?.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_COUNTRIES.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{country.name}</span>
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
          <Send className="w-5 h-5" />
          Ripple Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {renderPaymentTypeSelector()}

        <div className="space-y-2">
          <Label htmlFor="amount">Payment Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderCurrencySelector(fromCurrency, setFromCurrency, "From Currency")}
          {renderCurrencySelector(toCurrency, setToCurrency, "To Currency")}
        </div>

        {paymentType === 'cross-border' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderCountrySelector(fromCountry, setFromCountry, "From Country")}
            {renderCountrySelector(toCountry, setToCountry, "To Country")}
          </div>
        )}

        {paymentType === 'crypto' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromAccount">From Account</Label>
              <Input
                id="fromAccount"
                placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toAccount">To Account</Label>
              <Input
                id="toAccount"
                placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinationTag" className="flex items-center gap-2">
                Destination Tag (Optional)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Required by some exchanges to identify your account</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="destinationTag"
                placeholder="123456789"
                value={destinationTag}
                onChange={(e) => setDestinationTag(e.target.value)}
              />
            </div>
          </div>
        )}

        {paymentType === 'cross-border' && (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Recipient Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    placeholder="John Doe"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="1234567890"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <Label htmlFor="recipientAddress">Recipient Address</Label>
                <Textarea
                  id="recipientAddress"
                  placeholder="123 Main St, City, State, Country"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="routingCode">Routing Code</Label>
                <Input
                  id="routingCode"
                  placeholder="SWIFT/ABA/IBAN"
                  value={routingCode}
                  onChange={(e) => setRoutingCode(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="memo">Payment Memo (Optional)</Label>
          <Input
            id="memo"
            placeholder="Payment description or reference..."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        <Button 
          onClick={handleGetQuote} 
          disabled={isLoading || !paymentService}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting Quote...
            </>
          ) : !paymentService ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Initializing Ripple...
            </>
          ) : (
            <>
              Get Payment Quote
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderQuoteStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Payment Quote
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Quote Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Send Amount</div>
                <div className="font-semibold">{quote?.sendAmount} {fromCurrency}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Receive Amount</div>
                <div className="font-semibold">{quote?.deliverAmount} {toCurrency}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exchange Rate:</span>
                <span>{quote?.exchangeRate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee:</span>
                <span>{quote?.fee} {fromCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slippage:</span>
                <span>{quote?.slippage}%</span>
              </div>
              {quote?.path && quote.path.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Path:</span>
                  <span className="font-mono text-xs">{quote.path.join(' → ')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This quote uses Ripple's On-Demand Liquidity for optimal exchange rates and fast settlement.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
            Back
          </Button>
          <Button onClick={handleExecutePayment} className="flex-1">
            <Send className="mr-2 h-4 w-4" />
            Confirm Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderProcessingStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Processing Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="h-12 w-12 animate-spin" />
          <div className="text-center">
            <div className="font-medium">Processing your payment...</div>
            <div className="text-sm text-muted-foreground mt-1">
              Using Ripple's On-Demand Liquidity
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
          Payment Successful
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4 py-6">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <div className="text-center">
            <div className="font-medium">Payment submitted successfully!</div>
            <div className="text-sm text-muted-foreground mt-1">
              Your payment is being processed via Ripple's network
            </div>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div>
            <div className="text-sm text-muted-foreground">Payment ID</div>
            <div className="font-mono text-sm break-all">{result?.hash}</div>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline">{result?.status}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Network Fee</span>
            <span>{result?.fee} XRP</span>
          </div>
        </div>

        <Button onClick={resetForm} className="w-full">
          <Send className="mr-2 h-4 w-4" />
          Send Another Payment
        </Button>
      </CardContent>
    </Card>
  );

  const renderErrorStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          Payment Failed
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
      {step === 'form' && renderFormStep()}
      {step === 'quote' && renderQuoteStep()}
      {step === 'processing' && renderProcessingStep()}
      {step === 'success' && renderSuccessStep()}
      {step === 'error' && renderErrorStep()}
    </div>
  );
};

export default RipplePayments;