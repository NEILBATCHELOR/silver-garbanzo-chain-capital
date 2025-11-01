import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle, CheckCircle, Loader2, Calculator } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { MultiSigTransactionService } from '@/services/wallet/multiSig/MultiSigTransactionService';
import { ChainType } from '@/services/wallet/AddressUtils';
import { supabase } from '@/infrastructure/database/client';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { buildEip1559Fees, getHoleskyGas, getSepoliaGas, type GasOracle } from '@/services/GasOracleService';

interface TransactionProposalProps {
  walletId: string;
  walletAddress: string;
  blockchain?: string;
  onSuccess?: (proposalId: string) => void;
  onCancel?: () => void;
}

export function MultiSigTransactionProposal({ 
  walletId, 
  walletAddress,
  blockchain = 'ethereum',
  onSuccess,
  onCancel 
}: TransactionProposalProps) {
  const { toast } = useToast();
  const [to, setTo] = useState('');
  const [addressInputMode, setAddressInputMode] = useState<'select' | 'manual'>('manual');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [availableAddresses, setAvailableAddresses] = useState<Array<{
    address: string;
    name: string;
    id: string;
  }>>([]);
  const [value, setValue] = useState('0');
  const [data, setData] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [isCreating, setIsCreating] = useState(false);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<{
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    estimatedCost: string;
  } | null>(null);
  const [proposalResult, setProposalResult] = useState<{
    proposalId: string;
    onChainTxId: number;
    transactionHash: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const multiSigService = MultiSigTransactionService.getInstance();

  // Load available multi-sig wallet addresses (excluding current wallet)
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const { data, error } = await supabase
          .from('multi_sig_wallets')
          .select('id, name, address')
          .neq('address', walletAddress)
          .order('name');

        if (error) throw error;

        setAvailableAddresses(data || []);
      } catch (err) {
        console.error('Error loading addresses:', err);
      }
    };

    loadAddresses();
  }, [walletAddress]);

  // Estimate gas using EIP-1559 for Ethereum mainnet/testnets
  const estimateGas = useCallback(async () => {
    if (!to || !value) {
      toast({
        title: 'Missing Information',
        description: 'Please enter destination address and value to estimate gas',
        variant: 'default',
      });
      return;
    }

    setIsEstimatingGas(true);
    setGasEstimate(null);
    
    try {
      let gasOracle: GasOracle;
      
      // Determine which network to use for gas estimation
      const normalizedBlockchain = blockchain.toLowerCase();
      
      if (normalizedBlockchain.includes('sepolia')) {
        gasOracle = await getSepoliaGas();
      } else if (normalizedBlockchain.includes('holesky') || normalizedBlockchain.includes('hoodi')) {
        gasOracle = await getHoleskyGas();
      } else {
        // For Ethereum mainnet and other Ethereum testnets, use Holesky as substitute
        gasOracle = await getHoleskyGas();
      }

      const fees = buildEip1559Fees(gasOracle, 'medium');
      
      // Estimate gas limit (basic estimation for transfers/calls)
      const isContractCall = data && data !== '0x' && data.length > 2;
      const baseGasLimit = isContractCall ? 150000n : 21000n;
      
      // Calculate estimated cost
      const estimatedCost = (baseGasLimit * fees.maxFeePerGas) / BigInt(1e18);
      
      setGasEstimate({
        maxFeePerGas: (Number(fees.maxFeePerGas) / 1e9).toFixed(2) + ' Gwei',
        maxPriorityFeePerGas: (Number(fees.maxPriorityFeePerGas) / 1e9).toFixed(2) + ' Gwei',
        estimatedCost: estimatedCost.toString() + ' ETH',
      });

      toast({
        title: 'Gas Estimated',
        description: `Estimated cost: ${estimatedCost.toString()} ETH`,
      });
    } catch (err: any) {
      console.error('Gas estimation error:', err);
      toast({
        title: 'Gas Estimation Failed',
        description: err.message || 'Failed to estimate gas',
        variant: 'destructive',
      });
    } finally {
      setIsEstimatingGas(false);
    }
  }, [to, value, data, blockchain, toast]);

  const validateForm = useCallback(() => {
    // Validate destination address
    if (!to.trim()) {
      setError('Please enter a destination address');
      return false;
    }

    const addressPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!addressPattern.test(to)) {
      setError('Invalid destination address format (must be 0x...)');
      return false;
    }

    // Validate value
    const valueNum = parseFloat(value);
    if (isNaN(valueNum) || valueNum < 0) {
      setError('Value must be a positive number or zero');
      return false;
    }

    // Validate data (if provided)
    if (data && !data.startsWith('0x')) {
      setError('Data must start with 0x (or leave empty)');
      return false;
    }

    // Validate expiry
    if (expiryHours < 1 || expiryHours > 168) {
      setError('Expiry must be between 1 and 168 hours (7 days)');
      return false;
    }

    return true;
  }, [to, value, data, expiryHours]);

  const handleCreate = async () => {
    try {
      setError(null);
      setProposalResult(null);

      if (!validateForm()) {
        return;
      }

      setIsCreating(true);

      // Step 1: Create proposal in database
      const proposal = await multiSigService.createProposal(
        walletId,
        {
          to,
          value: value || '0',
          data: data || '0x'
        },
        blockchain as ChainType,
        expiryHours
      );

      // Step 2: Submit to on-chain contract
      const onChainResult = await multiSigService.submitToContract(proposal.id);

      setProposalResult({
        proposalId: proposal.id,
        onChainTxId: onChainResult.onChainTxId,
        transactionHash: onChainResult.transactionHash
      });

      toast({
        title: 'Success!',
        description: `Transaction proposal created successfully`,
      });

      // Notify parent
      if (onSuccess) {
        onSuccess(proposal.id);
      }

    } catch (err: any) {
      console.error('Proposal creation error:', err);
      setError(err.message || 'Failed to create proposal');
      toast({
        title: 'Error',
        description: err.message || 'Failed to create proposal',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setTo('');
    setValue('0');
    setData('');
    setExpiryHours(24);
    setProposalResult(null);
    setError(null);
  };

  // Show success screen if proposal created
  if (proposalResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            Transaction Proposal Created
          </CardTitle>
          <CardDescription>
            Your transaction has been submitted to the multi-sig wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Proposal ID */}
          <div className="space-y-2">
            <Label>Proposal ID</Label>
            <div className="flex items-center gap-2">
              <Input
                value={proposalResult.proposalId}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(proposalResult.proposalId);
                  toast({ title: 'Copied', description: 'Proposal ID copied to clipboard' });
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* On-Chain TX ID */}
          <div className="space-y-2">
            <Label>On-Chain Transaction ID</Label>
            <Badge variant="outline" className="font-mono text-sm">
              #{proposalResult.onChainTxId}
            </Badge>
          </div>

          {/* Transaction Hash */}
          <div className="space-y-2">
            <Label>Submission Transaction Hash</Label>
            <div className="flex items-center gap-2">
              <Input
                value={proposalResult.transactionHash}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(proposalResult.transactionHash);
                  toast({ title: 'Copied', description: 'Transaction hash copied to clipboard' });
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* Success Info */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Your transaction proposal has been created and submitted to the blockchain. 
              Other wallet owners can now sign this transaction. Once the required threshold 
              is met, the transaction will be automatically executed.
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
          <FileText className="mr-2 h-5 w-5" />
          Create Transaction Proposal
        </CardTitle>
        <CardDescription>
          Propose a new transaction for multi-sig approval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Info */}
        <div className="rounded-md border p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Multi-Sig Wallet:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Network:</span>
            <Badge variant="outline" className="text-xs capitalize">
              {blockchain}
            </Badge>
          </div>
        </div>

        {/* To Address */}
        <div className="space-y-2">
          <Label htmlFor="to">To Address *</Label>
          
          {/* Mode Selector */}
          <div className="flex gap-2 mb-2">
            <Button
              type="button"
              variant={addressInputMode === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setAddressInputMode('select');
                setTo(''); // Clear manual input
              }}
              disabled={isCreating}
            >
              Select Wallet
            </Button>
            <Button
              type="button"
              variant={addressInputMode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setAddressInputMode('manual');
                setSelectedWalletId(''); // Clear selection
                setTo(''); // Clear manual input
              }}
              disabled={isCreating}
            >
              Bespoke Address
            </Button>
          </div>

          {addressInputMode === 'select' ? (
            <Select
              value={selectedWalletId}
              onValueChange={(value) => {
                setSelectedWalletId(value);
                const wallet = availableAddresses.find(w => w.id === value);
                if (wallet) {
                  setTo(wallet.address);
                }
              }}
              disabled={isCreating || availableAddresses.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a multi-sig wallet" />
              </SelectTrigger>
              <SelectContent>
                {availableAddresses.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.name} ({wallet.address.slice(0, 10)}...{wallet.address.slice(-8)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="0x..."
              className="font-mono"
              disabled={isCreating}
            />
          )}
          
          <p className="text-xs text-muted-foreground">
            {addressInputMode === 'select' 
              ? 'Select another multi-sig wallet from your organization'
              : 'Enter any destination address for the transaction'
            }
          </p>
        </div>

        {/* Value */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="value">Value (ETH) *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={estimateGas}
              disabled={isEstimatingGas || isCreating || !to || !value}
            >
              {isEstimatingGas ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Estimating...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-3 w-3" />
                  Estimate Gas
                </>
              )}
            </Button>
          </div>
          <Input
            id="value"
            type="number"
            step="0.001"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            disabled={isCreating}
          />
          <p className="text-xs text-muted-foreground">
            Amount of ETH to send (0 for contract calls)
          </p>
          
          {/* Gas Estimate Display */}
          {gasEstimate && (
            <div className="rounded-md border p-3 space-y-1 text-sm bg-muted/50">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Fee Per Gas:</span>
                <span className="font-mono">{gasEstimate.maxFeePerGas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Priority Fee:</span>
                <span className="font-mono">{gasEstimate.maxPriorityFeePerGas}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Estimated Cost:</span>
                <span className="font-mono">{gasEstimate.estimatedCost}</span>
              </div>
            </div>
          )}
        </div>

        {/* Data */}
        <div className="space-y-2">
          <Label htmlFor="data">Data (Optional)</Label>
          <Textarea
            id="data"
            value={data}
            onChange={(e) => setData(e.target.value)}
            placeholder="0x..."
            rows={4}
            className="font-mono text-sm"
            disabled={isCreating}
          />
          <p className="text-xs text-muted-foreground">
            Encoded function call data for smart contract interaction (leave empty for simple transfers)
          </p>
        </div>

        {/* Expiry */}
        <div className="space-y-2">
          <Label htmlFor="expiry">Expiry (Hours) *</Label>
          <Input
            id="expiry"
            type="number"
            min="1"
            max="168"
            value={expiryHours}
            onChange={(e) => setExpiryHours(parseInt(e.target.value) || 24)}
            disabled={isCreating}
          />
          <p className="text-xs text-muted-foreground">
            Time window for collecting signatures (1-168 hours, default: 24)
          </p>
        </div>

        {/* Warning for high-value transactions */}
        {parseFloat(value) > 1 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are proposing to send {value} ETH. Please verify the destination address carefully.
            </AlertDescription>
          </Alert>
        )}

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
              disabled={isCreating}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Proposal'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MultiSigTransactionProposal;
